import { maxOf, minMaxNormalize, minOf, sum } from '../math'
import { rankScores } from '../rank'
import type { MethodWarning, Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, validateProblem, validateWeights, type ValidationIssue } from '../validate'
import { WASPAS_DEFAULT_LAMBDA, WASPAS_LAMBDA_GRID } from './waspas'

/** λ: share of S in k_c (1 = S only, 0 = P only), in [0, 1], default 0.5, as WASPAS. */
export type CocosoParams = { lambda?: number }

/**
 * CoCoSo, Yazdani, Zaraté, Zavadskas & Turskis (2019), Management Decision 57(9):2501, Eqs. 2-9.
 * Min-max normalization (Eqs. 2-3, `minMaxNormalize`; a constant column stays zeros, the same as dropping it), so any
 * finite value is allowed (negatives and zeros too). S_i = Σ_j w_j r_ij (Eq. 4); P_i = Σ_j r_ij^w_j (Eq. 5, a sum of
 * powers) over the criteria with w_j > 0 only, since 0^0 = 1 would add 1 to every P (our choice, card Decision 4);
 * k_a = (S + P) / Σ(S + P), k_b = S / min S + P / min P, k_c = (λ S + (1 - λ) P) / (λ max S + (1 - λ) max P) (Eqs. 6-8);
 * k = (k_a k_b k_c)^(1/3) + (k_a + k_b + k_c) / 3 (Eq. 9), a higher k ranks higher.
 * An alternative that is the worst on every weighted criterion has S = P = 0, so k_b divides by 0: a blocking
 * 'all-worst-alternative' error naming it (card Decision 1; no +1 shift as in pyDecision).
 * See docs/research/methods/cocoso.md.
 */
export const cocoso: RankingMethod<CocosoParams> = {
  id: 'cocoso',
  kind: 'ranking',
  params: [{ key: 'lambda', kind: 'number', min: 0, max: 1, step: 0.1, default: WASPAS_DEFAULT_LAMBDA }],
  compute(problem: Problem, weights: number[], params: CocosoParams = {}): RankingResult {
    const lambda = params.lambda ?? WASPAS_DEFAULT_LAMBDA
    if (!Number.isFinite(lambda) || lambda < 0 || lambda > 1) throw new RangeError('CoCoSo lambda must be in [0, 1]')
    assertValid([...validateProblem(problem), ...validateWeights(weights, problem.criteria.length)])

    const { r, nearConstant } = minMaxNormalize(problem)
    const warnings: MethodWarning[] = []
    nearConstant.forEach((near, j) => near && warnings.push({ code: 'cocoso.near-constant-column', col: j }))

    const s = r.map((row) => row.reduce((a, x, j) => a + x * weights[j]!, 0))
    const p = r.map((row) => row.reduce((a, x, j) => a + (weights[j]! > 0 ? x ** weights[j]! : 0), 0))
    // S = 0 exactly when every weighted r is 0, and then P = 0 too.
    const own: ValidationIssue[] = s.flatMap((x, i) => (x === 0 ? [{ code: 'all-worst-alternative' as const, severity: 'error' as const, row: i }] : []))
    assertValid(own)

    const minS = minOf(s)
    const minP = minOf(p)
    const maxS = maxOf(s)
    const maxP = maxOf(p)
    const total = sum(s.map((x, i) => x + p[i]!))
    const ka = s.map((x, i) => (x + p[i]!) / total)
    const kb = s.map((x, i) => x / minS + p[i]! / minP)
    const kcAt = (l: number) => s.map((x, i) => (l * x + (1 - l) * p[i]!) / (l * maxS + (1 - l) * maxP))
    const final = (kc: number[]) => kc.map((c, i) => Math.cbrt(ka[i]! * kb[i]! * c) + (ka[i]! + kb[i]! + c) / 3)
    const kc = kcAt(lambda)
    const scores = final(kc)
    const sweep = WASPAS_LAMBDA_GRID.map((l) => final(kcAt(l)))

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps: [
        { key: 'cocoso.normalized', matrix: r, axes: ['alternatives', 'criteria'] },
        { key: 'cocoso.s', vector: s, axes: 'alternatives' },
        { key: 'cocoso.p', vector: p, axes: 'alternatives' },
        { key: 'cocoso.ka', vector: ka, axes: 'alternatives' },
        { key: 'cocoso.kb', vector: kb, axes: 'alternatives' },
        { key: 'cocoso.kc', vector: kc, axes: 'alternatives' },
        { key: 'cocoso.scores', vector: scores, axes: 'alternatives' },
        { key: 'cocoso.lambdaSweep', matrix: s.map((_, i) => sweep.map((k) => k[i]!)), axes: ['alternatives', 'lambda'] },
      ],
      diagnostics: { minS, minP, maxS, maxP },
      warnings,
    }
  },
}
