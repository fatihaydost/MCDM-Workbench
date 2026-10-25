import { column, isConstant } from '../math'
import type { MethodWarning, Problem, WeightingMethod, WeightingResult } from '../types'

/**
 * Equal weights: w_j = 1 / n. Needs only the number of criteria, so the matrix is not validated.
 * See docs/research/methods/equal.md.
 */
export const equal: WeightingMethod = {
  id: 'equal',
  kind: 'weighting',
  compute(problem: Problem): WeightingResult {
    const n = problem.criteria.length
    if (n < 1) throw new RangeError('Equal weights need at least one criterion')
    const weights = new Array<number>(n).fill(1 / n)
    const warnings: MethodWarning[] = []
    if (
      Array.isArray(problem.matrix) &&
      problem.matrix.length >= 2 &&
      problem.matrix.every((row) => Array.isArray(row) && row.length >= n)
    ) {
      for (let j = 0; j < n; j++) {
        const col = column(problem.matrix, j)
        if (col.every((v) => typeof v === 'number' && Number.isFinite(v)) && isConstant(col)) {
          warnings.push({ code: 'equal.constant-column', col: j })
        }
      }
    }
    return {
      weights,
      steps: [{ key: 'equal.weights', vector: weights, axes: 'criteria' }],
      warnings,
    }
  },
}
