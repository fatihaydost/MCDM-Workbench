// Small numeric helpers. Callers pass validated, rectangular, finite matrices.

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
 * Whether every value is the same up to rounding: max - min <= 1e-12 * max(|max|, |min|). Relative, with no floor, so
 * the test does not depend on the unit the column is entered in; an all-zero column is constant.
 */
export function isConstant(xs: readonly number[]): boolean {
  const hi = maxOf(xs)
  const lo = minOf(xs)
  return hi - lo <= CONSTANT_TOLERANCE * Math.max(Math.abs(hi), Math.abs(lo))
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
  const den = Math.sqrt(sxx * syy)
  return den === 0 ? 0 : num / den
}

export const zeros = (m: number, n: number): number[][] => Array.from({ length: m }, () => new Array<number>(n).fill(0))
