// Small numeric helpers. Callers pass validated, rectangular, finite matrices.
import type { Problem } from './types'

export const column = (matrix: number[][], j: number): number[] => matrix.map((row) => row[j]!)

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)

export const mean = (xs: number[]): number => sum(xs) / xs.length

/** Largest value by a loop: Math.max(...xs) passes every value as an argument and overflows the stack past ~125k. */
export function maxOf(xs: readonly number[]): number {
  let hi = -Infinity
  for (const x of xs) if (x > hi || Number.isNaN(x)) hi = x
  return hi
}

/** Smallest value by a loop (see maxOf). */
export function minOf(xs: readonly number[]): number {
  let lo = Infinity
  for (const x of xs) if (x < lo || Number.isNaN(x)) lo = x
  return lo
}

/** A column whose spread is this small relative to its largest magnitude counts as constant (0.3 vs 0.1 + 0.2). */
export const CONSTANT_TOLERANCE = 1e-12

/**
 * Whether every value is the same up to rounding: max - min <= 1e-12 * max(|max|, |min|), with a zero-crossing /
 * zero-endpoint floor so residuals around 0 (e.g. [-1e-15, 1e-15, 0] or [0, 1e-100, 0]) also count as constant.
 */
export function isConstant(xs: readonly number[]): boolean {
  const hi = maxOf(xs)
  const lo = minOf(xs)
  const span = hi - lo
  const scale = Math.max(Math.abs(hi), Math.abs(lo))
  if (scale === 0) return true
  return (
    span <= CONSTANT_TOLERANCE * scale ||
    (lo < 0 && hi > 0 && span <= CONSTANT_TOLERANCE) ||
    ((lo === 0 || hi === 0) && scale <= Number.EPSILON)
  )
}

/**
 * Above the constant band but still this small relative to its magnitude, a spread is almost surely noise (a unit
 * conversion or rounding residue): min-max stretches it to [0, 1] and gives it a full weight, so methods warn.
 */
export const NEAR_CONSTANT_TOLERANCE = 1e-9

/** Not constant (isConstant), but max - min <= 1e-9 * max(|max|, |min|) (or <= 1e-9 across zero). */
export function isNearConstant(xs: readonly number[]): boolean {
  if (isConstant(xs)) return false
  const hi = maxOf(xs)
  const lo = minOf(xs)
  const span = hi - lo
  const scale = Math.max(Math.abs(hi), Math.abs(lo))
  return (
    span <= NEAR_CONSTANT_TOLERANCE * scale ||
    (lo < 0 && hi > 0 && span <= NEAR_CONSTANT_TOLERANCE)
  )
}

/**
 * Min-max normalization with cost inversion, r in [0, 1] and 1 = best: benefit (x - min) / (max - min), cost
 * (max - x) / (max - min). A constant column (isConstant) is never divided and stays all zeros.
 */
export function minMaxNormalize(problem: Problem): { r: number[][]; constant: boolean[]; nearConstant: boolean[] } {
  const { matrix, criteria } = problem
  const m = matrix.length
  const n = criteria.length
  const r = zeros(m, n)
  const constant = new Array<boolean>(n).fill(false)
  const nearConstant = new Array<boolean>(n).fill(false)
  for (let j = 0; j < n; j++) {
    const col = column(matrix, j)
    if (isConstant(col)) {
      constant[j] = true
      continue
    }
    nearConstant[j] = isNearConstant(col)
    const lo = minOf(col)
    const hi = maxOf(col)
    const range = hi - lo
    const isCost = criteria[j]!.type === 'cost'
    for (let i = 0; i < m; i++) {
      const x = col[i]!
      r[i]![j] = isCost ? (hi - x) / range : (x - lo) / range
    }
  }
  return { r, constant, nearConstant }
}

/**
 * Linear (max) normalization, the best value of each criterion 1: benefit x / max_i x, cost min_i x / x. Every value
 * must be above 0 (callers check `requires.positiveValues`). Shared by SAW 'linearMax' and WASPAS.
 */
export function linearMaxNormalize(problem: Problem): number[][] {
  const { matrix, criteria } = problem
  const m = matrix.length
  const n = criteria.length
  const r = zeros(m, n)
  for (let j = 0; j < n; j++) {
    const col = column(matrix, j)
    if (isConstant(col)) {
      for (let i = 0; i < m; i++) r[i]![j] = 1
      continue
    }
    const isCost = criteria[j]!.type === 'cost'
    const hi = maxOf(col)
    const lo = minOf(col)
    for (let i = 0; i < m; i++) r[i]![j] = isCost ? lo / col[i]! : col[i]! / hi
  }
  return r
}

/** Sample standard deviation (n - 1 denominator, Excel STDEV / STDEV.S). */
export function sampleStd(xs: number[]): number {
  if (xs.length < 2) return NaN
  const mu = mean(xs)
  return Math.sqrt(sum(xs.map((x) => (x - mu) ** 2)) / (xs.length - 1))
}

/** Pearson correlation; returns 0 when either series is constant (undefined correlation). */
export function pearson(xs: number[], ys: number[]): number {
  const mx = mean(xs)
  const my = mean(ys)
  let num = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i]! - mx
    const dy = ys[i]! - my
    num += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  const prod = sxx * syy
  const den = Number.isFinite(prod) ? Math.sqrt(prod) : Math.sqrt(sxx) * Math.sqrt(syy)
  if (den === 0) return 0
  const r = Math.max(-1, Math.min(1, num / den))
  if (Math.abs(1 - r) <= 1e-12) return 1
  if (Math.abs(1 + r) <= 1e-12) return -1
  return r
}

export const zeros = (m: number, n: number): number[][] => Array.from({ length: m }, () => new Array<number>(n).fill(0))

/**
 * Vector (Euclidean) column normalization: x*_ij = x_ij / sqrt(sum_i x_ij^2).
 * All-zero columns cannot be scaled: they remain 0 and their column indices are reported.
 */
export function vectorNormalize(matrix: number[][]): { normalized: number[][]; zeroCols: number[] } {
  const m = matrix.length
  const n = matrix[0]?.length ?? 0
  const normalized = zeros(m, n)
  const zeroCols: number[] = []

  for (let j = 0; j < n; j++) {
    const col = column(matrix, j)
    if (isConstant(col)) {
      const mu = mean(col)
      if (Math.abs(mu) <= CONSTANT_TOLERANCE) {
        zeroCols.push(j)
        continue
      }
      const flat = (mu < 0 ? -1 : 1) / Math.sqrt(m)
      for (let i = 0; i < m; i++) normalized[i]![j] = flat
      continue
    }
    let sumSq = 0
    for (let i = 0; i < m; i++) {
      const x = matrix[i]![j]!
      sumSq += x * x
    }
    const norm = Math.sqrt(sumSq)
    if (norm === 0) {
      zeroCols.push(j)
      continue
    }
    for (let i = 0; i < m; i++) {
      normalized[i]![j] = matrix[i]![j]! / norm
    }
  }

  return { normalized, zeroCols }
}

