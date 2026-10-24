import type { Problem, Step, WeightingMethod, WeightingResult } from '../types'
import { assertValid, validateProblem } from '../validate'

/**
 * Step-wise Weight Assessment Ratio Analysis (SWARA).
 *
 * Source: Keršulienė, V., Zavadskas, E.K. & Turskis, Z. (2010), "Selection of rational dispute
 * resolution method by applying new step-wise weight assessment ratio analysis (SWARA)",
 * Journal of Business Economics and Management 11(2):243-258, Fig. 2 & Table 1 (pp. 250-252).
 *
 * For criteria ordered by decreasing importance j = 1, ..., n:
 *   s_1 = 0,          s_j >= 0                   (j = 2, ..., n)
 *   k_1 = 1,          k_j = s_j + 1              (j = 2, ..., n)
 *   q_1 = 1,          q_j = q_{j-1} / k_j        (j = 2, ..., n)
 *   w_j = q_j / sum_{r=1}^n q_r
 */

export type SwaraStepRatio = 'moderate' | 'gentle' | 'steep'

export const SWARA_STEP_RATIOS: Readonly<Record<SwaraStepRatio, number>> = {
  gentle: 0.1,
  moderate: 0.15,
  steep: 0.25,
}

export interface SwaraParams {
  /** Uniform adjacent comparative importance ratio s_j (j >= 2) when `s` is not explicitly provided. Default: `'moderate'` (0.15). */
  stepRatio?: SwaraStepRatio | undefined
  /**
   * Optional comparative importance ratios in decreasing importance order:
   * either length `n` (`[0 | null, s_2, ..., s_n]`) or length `n - 1` (`[s_2, ..., s_n]`).
   */
  s?: readonly (number | null | undefined)[] | undefined
  /**
   * Optional permutation of criterion indices `0..n-1` from most important (`order[0]`) to least important (`order[n-1]`).
   * Defaults to column order `[0, 1, ..., n-1]`.
   */
  order?: readonly number[] | undefined
}

export interface SwaraSteps {
  s: number[]
  k: number[]
  q: number[]
  weights: number[]
}

function resolveStepVector(
  n: number,
  s?: number | SwaraStepRatio | readonly (number | null | undefined)[],
): number[] {
  if (s === undefined) {
    const ratio = SWARA_STEP_RATIOS.moderate
    return Array.from({ length: n }, (_, j) => (j === 0 ? 0 : ratio))
  }
  if (typeof s === 'string') {
    const ratio = SWARA_STEP_RATIOS[s]
    if (ratio === undefined) throw new RangeError(`swara: unknown stepRatio "${String(s)}"`)
    return Array.from({ length: n }, (_, j) => (j === 0 ? 0 : ratio))
  }
  if (typeof s === 'number') {
    if (!Number.isFinite(s) || s < 0) {
      throw new RangeError(`swara: comparative importance s_j must be a non-negative finite number, got ${s}`)
    }
    return Array.from({ length: n }, (_, j) => (j === 0 ? 0 : s))
  }
  if (s.length !== n && s.length !== n - 1) {
    throw new RangeError(`swara: expected s of length ${n} or ${n - 1}, got ${s.length}`)
  }
  const hasLeading = s.length === n
  if (hasLeading && s[0] !== null && s[0] !== undefined) {
    if (typeof s[0] !== 'number' || !Number.isFinite(s[0]) || s[0] < 0) {
      throw new RangeError(`swara: s[0] must be null, undefined, or a non-negative finite number, got ${String(s[0])}`)
    }
  }
  const out = new Array<number>(n).fill(0)
  for (let j = 1; j < n; j++) {
    const raw = hasLeading ? s[j] : s[j - 1]
    const val = raw ?? 0
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
      throw new RangeError(`swara: comparative importance s_${j + 1} must be a non-negative finite number, got ${String(raw)}`)
    }
    out[j] = val
  }
  return out
}

function resolveOrder(n: number, order?: readonly number[]): readonly number[] {
  if (order === undefined) return Array.from({ length: n }, (_, j) => j)
  const valid =
    order.length === n &&
    order.every((idx) => Number.isInteger(idx) && idx >= 0 && idx < n) &&
    new Set(order).size === n
  if (!valid) {
    throw new RangeError(`swara: order must be a permutation of 0..${n - 1}`)
  }
  return order
}

/**
 * Compute SWARA step vectors (`s`, `k`, `q`, `weights`) for `n` criteria and map them
 * back to original criterion indices according to `order`.
 */
export function swaraWeights(
  n: number,
  s?: number | SwaraStepRatio | readonly (number | null | undefined)[],
  order?: readonly number[],
): SwaraSteps {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`swaraWeights: n must be a positive integer, got ${n}`)
  }
  const sSorted = resolveStepVector(n, s)
  const perm = resolveOrder(n, order)

  const kSorted = new Array<number>(n)
  const qSorted = new Array<number>(n)
  kSorted[0] = 1
  qSorted[0] = 1
  let sumQ = 1
  for (let j = 1; j < n; j++) {
    const kj = sSorted[j]! + 1
    const qj = qSorted[j - 1]! / kj
    kSorted[j] = kj
    qSorted[j] = qj
    sumQ += qj
  }
  const wSorted = qSorted.map((qj) => qj / sumQ)

  const sOut = new Array<number>(n)
  const kOut = new Array<number>(n)
  const qOut = new Array<number>(n)
  const wOut = new Array<number>(n)
  for (let rankIdx = 0; rankIdx < n; rankIdx++) {
    const criterionIdx = perm[rankIdx]!
    sOut[criterionIdx] = sSorted[rankIdx]!
    kOut[criterionIdx] = kSorted[rankIdx]!
    qOut[criterionIdx] = qSorted[rankIdx]!
    wOut[criterionIdx] = wSorted[rankIdx]!
  }

  return { s: sOut, k: kOut, q: qOut, weights: wOut }
}

export const swara: WeightingMethod<SwaraParams> = {
  id: 'swara',
  kind: 'weighting',
  params: [
    {
      key: 'stepRatio',
      kind: 'choice',
      options: ['moderate', 'gentle', 'steep'],
      default: 'moderate',
    },
  ],

  compute(problem: Problem, params: SwaraParams = {}): WeightingResult {
    assertValid(validateProblem(problem))

    const n = problem.criteria.length
    const sInput =
      params.s !== undefined
        ? params.s
        : params.stepRatio === 'gentle' || params.stepRatio === 'steep'
          ? params.stepRatio
          : 'moderate'
    const { s, k, q, weights } = swaraWeights(n, sInput, params.order)

    const steps: Step[] = [
      { key: 'swara.s', vector: s, axes: 'criteria' },
      { key: 'swara.k', vector: k, axes: 'criteria' },
      { key: 'swara.q', vector: q, axes: 'criteria' },
      { key: 'swara.weights', vector: weights, axes: 'criteria' },
    ]

    return { weights, steps, warnings: [] }
  },
}
