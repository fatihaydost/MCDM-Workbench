import type { Problem, Step, WeightingMethod, WeightingResult } from '../types'
import { assertValid, validateProblem } from '../validate'

export type RocFormula = 'roc' | 'rs' | 'rr'

export interface RocParams {
  /** Rank-order conversion formula: Rank Order Centroid ('roc', default), Rank Sum ('rs'), or Rank Reciprocal ('rr'). */
  formula?: RocFormula | undefined
  /**
   * Optional criterion importance ranks (1 = most important, n = least important).
   * Defaults to table column order [1, 2, ..., n]. Tied ranks receive the average of the tied position weights.
   */
  ranks?: readonly number[] | undefined
}

/**
 * Strict-rank weights w(1), ..., w(n) for 1-based positions k = 1..n under ROC, RS, or RR.
 * Source: Barron & Barrett (1996), Stillwell, Seaver & Edwards (1981), Roszkowska (2013) Eqs. (6), (8), (9).
 */
export function strictRankWeights(n: number, formula: RocFormula = 'roc'): number[] {
  if (n <= 0) return []
  if (n === 1) return [1]
  if (formula === 'rs') {
    const denom = n * (n + 1)
    return Array.from({ length: n }, (_, idx) => (2 * (n - idx)) / denom)
  }
  if (formula === 'rr') {
    let harmonic = 0
    for (let k = 1; k <= n; k++) harmonic += 1 / k
    return Array.from({ length: n }, (_, idx) => 1 / (idx + 1) / harmonic)
  }
  // 'roc' (default): w(r) = (1 / n) * sum_{k=r..n} (1 / k)
  const out = new Array<number>(n)
  let tailSum = 0
  for (let k = n; k >= 1; k--) {
    tailSum += 1 / k
    out[k - 1] = tailSum / n
  }
  return out
}

/**
 * Rank-order criteria weighting: Rank Order Centroid (ROC), Rank Sum (RS), and Rank Reciprocal (RR).
 * Source: Barron & Barrett (1996); Stillwell, Seaver & Edwards (1981); Roszkowska (2013), Sections 4.2, 4.4, 4.5.
 * Reference: docs/research/methods/roc.md
 */
export const roc: WeightingMethod<RocParams> = {
  id: 'roc',
  kind: 'weighting',
  params: [{ key: 'formula', kind: 'choice', options: ['roc', 'rs', 'rr'], default: 'roc' }],

  compute(problem: Problem, params: RocParams = {}): WeightingResult {
    assertValid(validateProblem(problem))

    const n = problem.criteria.length
    const formula: RocFormula = params.formula === 'rs' || params.formula === 'rr' ? params.formula : 'roc'
    const strict = strictRankWeights(n, formula)

    const hasCustomRanks =
      Array.isArray(params.ranks) &&
      params.ranks.length === n &&
      params.ranks.every((r) => typeof r === 'number' && Number.isFinite(r))

    const rawRanks: readonly number[] = hasCustomRanks
      ? params.ranks!
      : Array.from({ length: n }, (_, j) => j + 1)

    // Sort criterion indices by input rank ascending; tied criteria share the average of their occupied positions.
    const order = Array.from({ length: n }, (_, j) => j).sort((a, b) => rawRanks[a]! - rawRanks[b]!)
    const ranks = new Array<number>(n)
    const weights = new Array<number>(n)

    let start = 0
    while (start < n) {
      const rVal = rawRanks[order[start]!]!
      let end = start + 1
      while (end < n && rawRanks[order[end]!] === rVal) end++
      const count = end - start
      const midRank = (start + 1 + end) / 2
      let wSum = 0
      for (let pos = start; pos < end; pos++) wSum += strict[pos]!
      const wAvg = wSum / count
      for (let pos = start; pos < end; pos++) {
        const col = order[pos]!
        ranks[col] = midRank
        weights[col] = wAvg
      }
      start = end
    }

    const steps: Step[] = [
      { key: 'roc.ranks', vector: ranks, axes: 'criteria' },
      { key: 'roc.weights', vector: weights, axes: 'criteria' },
    ]

    return { weights, steps, warnings: [] }
  },
}
