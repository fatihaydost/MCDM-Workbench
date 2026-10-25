import type { Problem, WeightingMethod, WeightingResult } from '../types'

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
    return {
      weights,
      steps: [{ key: 'equal.weights', vector: weights, axes: 'criteria' }],
    }
  },
}
