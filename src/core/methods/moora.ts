import { vectorNormalize } from '../math'
import { rankScores } from '../rank'
import type { MethodWarning, Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, validateProblem, validateWeights } from '../validate'

/**
 * MOORA (Multi-Objective Optimization on the basis of Ratio Analysis, Ratio System,
 * Brauers & Zavadskas 2006; weighted form Brauers & Zavadskas 2009, 2010):
 *   1. Vector normalization:  x*_ij = x_ij / sqrt(sum_i x_ij^2)
 *   2. Weighted normalized:   v_ij  = w_j * x*_ij
 *   3. Benefit and cost sums: S+_i  = sum_{j in B} v_ij,   S-_i = sum_{j in C} v_ij
 *   4. Net assessment score:  y_i   = S+_i - S-_i   (higher is better)
 * See docs/research/methods/moora.md.
 */
export const moora: RankingMethod = {
  id: 'moora',
  kind: 'ranking',
  params: [],
  compute(problem: Problem, weights: number[]): RankingResult {
    const n = problem.criteria.length
    assertValid([...validateProblem(problem), ...validateWeights(weights, n)])

    const { matrix, criteria } = problem
    const m = matrix.length

    const { normalized, zeroCols } = vectorNormalize(matrix)
    const warnings: MethodWarning[] = zeroCols.map((col) => ({ code: 'moora.zero-column', col }))

    const weighted = normalized.map((row) => row.map((r, j) => r * weights[j]! + 0))

    const benefitSum = new Array<number>(m).fill(0)
    const costSum = new Array<number>(m).fill(0)
    for (let i = 0; i < m; i++) {
      let sp = 0
      let sm = 0
      for (let j = 0; j < n; j++) {
        if (criteria[j]!.type === 'cost') sm += weighted[i]![j]!
        else sp += weighted[i]![j]!
      }
      benefitSum[i] = sp + 0
      costSum[i] = sm + 0
    }

    const scores = benefitSum.map((sp, i) => sp - costSum[i]! + 0)

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps: [
        { key: 'moora.normalized', matrix: normalized, axes: ['alternatives', 'criteria'] },
        { key: 'moora.weighted', matrix: weighted, axes: ['alternatives', 'criteria'] },
        { key: 'moora.benefitSum', vector: benefitSum, axes: 'alternatives' },
        { key: 'moora.costSum', vector: costSum, axes: 'alternatives' },
        { key: 'moora.score', vector: scores, axes: 'alternatives' },
      ],
      warnings,
    }
  },
}
