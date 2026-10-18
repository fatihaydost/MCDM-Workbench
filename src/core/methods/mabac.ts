import { column, minMaxNormalize, sum } from '../math'
import { rankScores } from '../rank'
import type { MethodWarning, Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, validateProblem, validateWeights } from '../validate'

/**
 * MABAC, Pamučar & Ćirović (2015), Expert Systems with Applications 42(6):3016, Eqs. 13-24.
 * Min-max normalization (Eqs. 15-16, `minMaxNormalize`), so any finite value is allowed (negatives and zeros too).
 * V = w (t + 1) (Eq. 17); the border G is the geometric mean of each column of V (Eq. 18), computed as exp(mean(log v))
 * because the literal product underflows to 0 from m ≈ 300 (card Decision 1); a zero-weight column has g = 0.
 * Q = V - G (Eq. 20), S = Σ_j q_ij (Eq. 24), a higher S ranks higher.
 * S = (min-max weighted sum) - B with B the same for every row, so the ranking is the min-max weighted sum's and G only
 * sets the sign (card Algorithm step 7). See docs/research/methods/mabac.md.
 */
export const mabac: RankingMethod = {
  id: 'mabac',
  kind: 'ranking',
  params: [],
  compute(problem: Problem, weights: number[]): RankingResult {
    assertValid([...validateProblem(problem), ...validateWeights(weights, problem.criteria.length)])

    const { r, nearConstant } = minMaxNormalize(problem)
    const warnings: MethodWarning[] = []
    nearConstant.forEach((near, j) => near && warnings.push({ code: 'mabac.near-constant-column', col: j }))

    const m = r.length
    const v = r.map((row) => row.map((t, j) => weights[j]! * (t + 1)))
    const g = weights.map((w, j) => (w > 0 ? Math.exp(sum(column(v, j).map(Math.log)) / m) : 0))
    const q = v.map((row) => row.map((x, j) => x - g[j]!))
    const scores = q.map(sum)
    // The constant S is shifted by from the min-max weighted sum.
    const border = sum(weights.map((w, j) => g[j]! - w))

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps: [
        { key: 'mabac.normalized', matrix: r, axes: ['alternatives', 'criteria'] },
        { key: 'mabac.weighted', matrix: v, axes: ['alternatives', 'criteria'] },
        { key: 'mabac.border', vector: g, axes: 'criteria' },
        { key: 'mabac.distance', matrix: q, axes: ['alternatives', 'criteria'] },
        { key: 'mabac.scores', vector: scores, axes: 'alternatives' },
      ],
      diagnostics: { border },
      warnings,
    }
  },
}
