import { column, linearMaxNormalize, minOf, zeros } from '../math'
import { rankScores } from '../rank'
import type { Problem, RankingMethod, RankingResult, Step } from '../types'
import { assertValid, hasErrors, validateProblem, validateRequirements, validateWeights } from '../validate'

export const CODAS_DEFAULT_TAU = 0.02

export type CodasParams = {
  /** Threshold parameter tau in [0.01, 0.1] for activating Taxicab distance (default 0.02). */
  tau?: number
}

/**
 * CODAS, Keshavarz Ghorabaee, Zavadskas, Turskis & Antucheviciene (2016),
 * Economic Computation and Economic Cybernetics Studies and Research 50(3):25-44, Eqs. (1)-(9).
 *
 * Every value must be above 0 (`requires.positiveValues`, 'non-positive-value' with the cell).
 * Step 1 (Eq. 2): Linear max/min normalization n_ij = x_ij / max_k x_kj (benefit) or min_k x_kj / x_ij (cost).
 * Step 2 (Eq. 3): Weighted normalized matrix r_ij = w_j * n_ij.
 * Step 3 (Eqs. 4-5): Negative-ideal solution ns_j = min_i r_ij.
 * Step 4 (Eq. 6): Euclidean (E_i) and Taxicab (T_i) distances from ns.
 * Step 5 (Eqs. 7-8): Relative assessment matrix h_ik = (E_i - E_k) + psi(E_i - E_k) * (T_i - T_k),
 *   where psi(x) = 1 if |x| >= tau else 0.
 * Step 6 (Eq. 9): Assessment score H_i = sum_k h_ik, ranked descending.
 * See docs/research/methods/codas.md.
 */
export const codas: RankingMethod<CodasParams> = {
  id: 'codas',
  kind: 'ranking',
  requires: { positiveValues: true },
  params: [
    {
      key: 'tau',
      kind: 'number',
      min: 0.01,
      max: 0.1,
      step: 0.01,
      default: CODAS_DEFAULT_TAU,
    },
  ],
  compute(problem: Problem, weights: number[], params: CodasParams = {}): RankingResult {
    const tau = params.tau ?? CODAS_DEFAULT_TAU
    if (typeof tau !== 'number' || !Number.isFinite(tau) || tau < 0.01 || tau > 0.1) {
      throw new RangeError(`CODAS tau must be in [0.01, 0.1] (got ${tau})`)
    }

    const m = problem.alternatives.length
    const n = problem.criteria.length
    const issues = validateProblem(problem)
    const cells = hasErrors(issues) ? [] : validateRequirements(problem, codas)
    assertValid([...issues, ...cells, ...validateWeights(weights, n)])

    // Step 1 (Eq. 2): Linear max/min normalization
    const normalized = linearMaxNormalize(problem)

    // Step 2 (Eq. 3): Weighted normalized matrix r_ij = w_j * n_ij
    const weighted = zeros(m, n)
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        weighted[i]![j] = weights[j]! * normalized[i]![j]!
      }
    }

    // Step 3 (Eqs. 4-5): Negative-ideal solution ns_j = min_i r_ij
    const negativeIdeal = new Array<number>(n).fill(0)
    for (let j = 0; j < n; j++) {
      negativeIdeal[j] = minOf(column(weighted, j))
    }

    // Step 4 (Eq. 6): Euclidean (E_i) and Taxicab (T_i) distances from ns
    const euclidean = new Array<number>(m).fill(0)
    const taxicab = new Array<number>(m).fill(0)
    for (let i = 0; i < m; i++) {
      let sumSq = 0
      let sumAbs = 0
      for (let j = 0; j < n; j++) {
        const diff = weighted[i]![j]! - negativeIdeal[j]!
        sumSq += diff * diff
        sumAbs += Math.abs(diff)
      }
      euclidean[i] = Math.sqrt(sumSq)
      taxicab[i] = sumAbs
    }

    // Step 5 (Eqs. 7-8): Relative assessment matrix h_ik = (E_i - E_k) + psi(E_i - E_k) * (T_i - T_k)
    const relativeAssessment = zeros(m, m)
    for (let i = 0; i < m; i++) {
      for (let k = 0; k < m; k++) {
        if (i === k) {
          relativeAssessment[i]![k] = 0
          continue
        }
        const dE = euclidean[i]! - euclidean[k]!
        const dT = taxicab[i]! - taxicab[k]!
        const psi = Math.abs(dE) >= tau ? 1 : 0
        relativeAssessment[i]![k] = dE + psi * dT + 0
      }
    }

    // Step 6 (Eq. 9): Assessment score H_i = sum_k h_ik
    const scores = new Array<number>(m).fill(0)
    for (let i = 0; i < m; i++) {
      let total = 0
      for (let k = 0; k < m; k++) {
        total += relativeAssessment[i]![k]!
      }
      scores[i] = total + 0
    }

    const steps: Step[] = [
      { key: 'codas.normalized', matrix: normalized, axes: ['alternatives', 'criteria'] },
      { key: 'codas.weighted', matrix: weighted, axes: ['alternatives', 'criteria'] },
      { key: 'codas.negativeIdeal', vector: negativeIdeal, axes: 'criteria' },
      { key: 'codas.euclidean', vector: euclidean, axes: 'alternatives' },
      { key: 'codas.taxicab', vector: taxicab, axes: 'alternatives' },
      { key: 'codas.relativeAssessment', matrix: relativeAssessment, axes: ['alternatives', 'alternatives'] },
      { key: 'codas.score', vector: scores, axes: 'alternatives' },
    ]

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps,
      warnings: [],
    }
  },
}
