import { linearMaxNormalize } from '../math'
import { rankScores } from '../rank'
import type { Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, hasErrors, validateProblem, validateRequirements, validateWeights } from '../validate'

/** λ: share of the weighted sum in Q (1 = sum only, 0 = product only), in [0, 1], default 0.5. */
export type WaspasParams = { lambda?: number }

export const WASPAS_DEFAULT_LAMBDA = 0.5

/** λ = 0, 0.1, ..., 1: the grid every published WASPAS example sweeps (and the slider's step). */
export const WASPAS_LAMBDA_GRID: readonly number[] = Array.from({ length: 11 }, (_, k) => k / 10)

/**
 * WASPAS, Zavadskas, Turskis, Antucheviciene & Zakarevicius (2012), Elektronika ir Elektrotechnika 122(6):3, Eqs. 1-6.
 * Every value must be above 0 (`requires.positiveValues`, 'non-positive-value' with the cell; no shift).
 * Linear (max) normalization, as SAW 'linearMax' (Eqs. 2-3); WSM Q1 = Σ_j w_j x̄_ij (Eq. 1); WPM Q2 = Π_j x̄_ij^w_j on
 * the same matrix (Eq. 4); Q = λ Q1 + (1 - λ) Q2 (Eq. 6), a higher Q ranks higher. With Σ w = 1, Q2 <= Q1 (weighted
 * AM-GM), so Q never falls as λ grows. The per-alternative optimal λ (Eqs. 7-19) is not implemented.
 * See docs/research/methods/waspas.md.
 */
export const waspas: RankingMethod<WaspasParams> = {
  id: 'waspas',
  kind: 'ranking',
  requires: { positiveValues: true },
  params: [{ key: 'lambda', kind: 'number', min: 0, max: 1, step: 0.1, default: WASPAS_DEFAULT_LAMBDA }],
  compute(problem: Problem, weights: number[], params: WaspasParams = {}): RankingResult {
    const lambda = params.lambda ?? WASPAS_DEFAULT_LAMBDA
    if (!Number.isFinite(lambda) || lambda < 0 || lambda > 1) throw new RangeError('WASPAS lambda must be in [0, 1]')
    const n = problem.criteria.length
    const issues = validateProblem(problem)
    // The cell check reads every row, so it runs on a well-formed matrix only (a malformed one is already an error).
    const cells = hasErrors(issues) ? [] : validateRequirements(problem, waspas)
    assertValid([...issues, ...cells, ...validateWeights(weights, n)])

    const r = linearMaxNormalize(problem)
    // Summed as in SAW (w_j r_ij, left to right), so λ = 1 gives SAW's scores bit for bit.
    const wsm = r.map((row) => row.reduce((a, x, j) => a + x * weights[j]!, 0))
    const wpm = r.map((row) => row.reduce((a, x, j) => a * Math.pow(x, weights[j]!), 1))
    const blend = (l: number) => wsm.map((q1, i) => l * q1 + (1 - l) * wpm[i]!)
    const scores = blend(lambda)
    const sweep = WASPAS_LAMBDA_GRID.map(blend)

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps: [
        { key: 'waspas.normalized', matrix: r, axes: ['alternatives', 'criteria'] },
        { key: 'waspas.wsm', vector: wsm, axes: 'alternatives' },
        { key: 'waspas.wpm', vector: wpm, axes: 'alternatives' },
        { key: 'waspas.scores', vector: scores, axes: 'alternatives' },
        { key: 'waspas.lambdaSweep', matrix: wsm.map((_, i) => sweep.map((q) => q[i]!)), axes: ['alternatives', 'lambda'] },
      ],
      warnings: [],
    }
  },
}
