import { column, linearMaxNormalize, sum, zeros } from '../math'
import { rankScores } from '../rank'
import type { Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, hasErrors, validateProblem, validateRequirements, validateWeights } from '../validate'

/** 'linearMax': benefit x / max, cost min / x (the best value gets 1). 'sum': shares of the column total. */
export type SawNormalization = 'linearMax' | 'sum'
export type SawParams = { normalization?: SawNormalization }

/**
 * Sum normalization of a decision matrix (values must be > 0):
 *   benefit: r_ij = x_ij / Σ_i x_ij
 *   cost:    r_ij = (1 / x_ij) / Σ_i (1 / x_ij)
 * Each column of the returned m × n matrix sums to 1.
 */
export function sawSumNormalize(problem: Problem): number[][] {
  const { matrix, criteria } = problem
  const m = matrix.length
  const n = criteria.length
  const r = zeros(m, n)
  for (let j = 0; j < n; j++) {
    const col = column(matrix, j)
    // Cost: min / x first (Podvezko Eq. 2); the constant min cancels in the share, so 1 / x gives the same r.
    const base = criteria[j]!.type === 'cost' ? col.map((x) => 1 / x) : col
    const total = sum(base)
    for (let i = 0; i < m; i++) r[i]![j] = base[i]! / total
  }
  return r
}

/**
 * SAW / weighted sum model (Churchman & Ackoff 1954; Hwang & Yoon 1981), formulas as in Podvezko (2011).
 * Every value must be above 0 (`requires.positiveValues`, reported as 'non-positive-value' with the cell; no shift).
 * - normalization 'linearMax' (default, Podvezko Eqs. 2-3): benefit r = x / max_i x, cost r = min_i x / x.
 * - normalization 'sum' (Podvezko Eq. 6, cost converted by Eq. 2 first): benefit r = x / Σ_i x,
 *   cost r = (min / x) / Σ_i (min / x), which equals (1 / x) / Σ_i (1 / x).
 * Weighted values v_ij = w_j r_ij (each criterion's contribution), score S_i = Σ_j v_ij, a higher S ranks higher.
 * See docs/research/methods/saw.md.
 */
export const saw: RankingMethod<SawParams> = {
  id: 'saw',
  kind: 'ranking',
  requires: { positiveValues: true },
  params: [{ key: 'normalization', kind: 'choice', options: ['linearMax', 'sum'], default: 'linearMax' }],
  compute(problem: Problem, weights: number[], params: SawParams = {}): RankingResult {
    const variant = params.normalization ?? 'linearMax'
    if (variant !== 'linearMax' && variant !== 'sum') throw new RangeError(`unknown SAW normalization ${String(variant)}`)
    const n = problem.criteria.length
    const issues = validateProblem(problem)
    // The cell check reads every row, so it runs on a well-formed matrix only (a malformed one is already an error).
    const cells = hasErrors(issues) ? [] : validateRequirements(problem, saw)
    assertValid([...issues, ...cells, ...validateWeights(weights, n)])

    // 1. Normalize; every x > 0, so no division below can be by 0.
    const r = variant === 'linearMax' ? linearMaxNormalize(problem) : sawSumNormalize(problem)

    // 2. Contributions v_ij = w_j r_ij and their sum per alternative.
    const v = r.map((row) => row.map((x, j) => x * weights[j]!))
    const scores = v.map((row) => sum(row))

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps: [
        { key: variant === 'linearMax' ? 'saw.normalizedLinearMax' : 'saw.normalizedSum', matrix: r, axes: ['alternatives', 'criteria'] },
        { key: 'saw.weighted', matrix: v, axes: ['alternatives', 'criteria'] },
        { key: 'saw.scores', vector: scores, axes: 'alternatives' },
      ],
      warnings: [],
    }
  },
}
