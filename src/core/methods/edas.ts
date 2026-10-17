import { column, isConstant, maxOf, mean, sum, zeros } from '../math'
import { rankScores } from '../rank'
import type { MethodWarning, Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, hasErrors, validateProblem, validateWeights, type ValidationIssue } from '../validate'

/**
 * A column with negative values whose average is below this share of its largest magnitude gets a second notice:
 * the distances divide by an average close to 0, so they have no bound and a small weight can decide the ranking.
 * Our threshold (docs/research/methods/edas.md, Decisions 1), not a value from a paper.
 */
export const EDAS_SMALL_AVERAGE = 0.05

/**
 * EDAS, evaluation based on distance from average solution (Keshavarz Ghorabaee, Zavadskas, Olfat & Turskis 2015,
 * Informatica 26(3):435, Section 2, Eqs. 3-14).
 * AV_j = mean_i x_ij; d_ij = (x_ij - AV_j) / AV_j; benefit PDA = max(0, d), NDA = max(0, -d), cost the two swapped.
 * SP_i = Σ_j w_j PDA_ij, SN_i = Σ_j w_j NDA_ij, NSP = SP / max SP, NSN = 1 - SN / max SN, AS = (NSP + NSN) / 2,
 * a higher AS ranks higher. No parameters.
 * Data (owner decision 2026-10-13): zeros are allowed; a non-constant column whose average is 0 or below is a blocking
 * 'non-positive-average' error (no shift); negative values with an average above 0 compute with a notice, and a second
 * notice when that average is small next to the column's largest magnitude. A constant column (spread within rounding,
 * all-zero included) contributes exactly 0 and is never divided. If no alternative is away from the average
 * (max SP = 0), every AS is 0.5, with a notice.
 * See docs/research/methods/edas.md.
 */
export const edas: RankingMethod = {
  id: 'edas',
  kind: 'ranking',
  compute(problem: Problem, weights: number[]): RankingResult {
    const n = problem.criteria.length
    const issues = validateProblem(problem)
    // The averages read every row, so they are checked on a well-formed matrix only.
    const own: ValidationIssue[] = []
    if (!hasErrors(issues)) {
      for (let j = 0; j < n; j++) {
        const col = column(problem.matrix, j)
        if (isConstant(col)) continue
        const av = mean(col)
        if (av <= 0) own.push({ code: 'non-positive-average', severity: 'error', col: j, value: av })
      }
    }
    assertValid([...issues, ...own, ...validateWeights(weights, n)])
    const { matrix, criteria } = problem
    const m = matrix.length
    const warnings: MethodWarning[] = []

    // 1. Average solution (Eq. 3).
    const av = Array.from({ length: n }, (_, j) => mean(column(matrix, j)))

    // 2. Positive and negative distance from the average (Eqs. 6-9).
    const pda = zeros(m, n)
    const nda = zeros(m, n)
    for (let j = 0; j < n; j++) {
      const col = column(matrix, j)
      // The mean of [0.1, 0.1, 0.1] is 0.10000000000000002: a constant column would get -1.4e-16 everywhere.
      if (isConstant(col)) {
        warnings.push({ code: 'edas.constant-column', col: j })
        continue
      }
      if (col.some((x) => x < 0)) {
        warnings.push({ code: 'edas.negative-values', col: j })
        if (av[j]! < EDAS_SMALL_AVERAGE * maxOf(col.map(Math.abs))) warnings.push({ code: 'edas.small-average', col: j })
      }
      const isCost = criteria[j]!.type === 'cost'
      for (let i = 0; i < m; i++) {
        const d = (col[i]! - av[j]!) / av[j]!
        const above = Math.max(0, d)
        const below = Math.max(0, -d)
        pda[i]![j] = isCost ? below : above
        nda[i]![j] = isCost ? above : below
      }
    }

    // 3. Weighted sums (Eqs. 10-11).
    const wPda = pda.map((row) => row.map((x, j) => weights[j]! * x))
    const wNda = nda.map((row) => row.map((x, j) => weights[j]! * x))
    const sp = wPda.map((row) => sum(row))
    const sn = wNda.map((row) => sum(row))

    // 4-5. Normalize (Eqs. 12-13) and appraise (Eq. 14). Per column the PDA and NDA add up to the same total, so max SP
    //      and max SN are 0 together: then nobody is away from the average and everyone ties at 0.5.
    const maxSp = maxOf(sp)
    const maxSn = maxOf(sn)
    if (maxSp === 0 && maxSn === 0) warnings.push({ code: 'edas.no-spread' })
    const nsp = sp.map((x) => (maxSp > 0 ? x / maxSp : 0))
    const nsn = sn.map((x) => (maxSn > 0 ? 1 - x / maxSn : 1))
    const scores = nsp.map((x, i) => (x + nsn[i]!) / 2)

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps: [
        { key: 'edas.average', vector: av, axes: 'criteria' },
        { key: 'edas.pda', matrix: pda, axes: ['alternatives', 'criteria'] },
        { key: 'edas.nda', matrix: nda, axes: ['alternatives', 'criteria'] },
        { key: 'edas.weightedPda', matrix: wPda, axes: ['alternatives', 'criteria'] },
        { key: 'edas.weightedNda', matrix: wNda, axes: ['alternatives', 'criteria'] },
        { key: 'edas.sp', vector: sp, axes: 'alternatives' },
        { key: 'edas.sn', vector: sn, axes: 'alternatives' },
        { key: 'edas.nsp', vector: nsp, axes: 'alternatives' },
        { key: 'edas.nsn', vector: nsn, axes: 'alternatives' },
        { key: 'edas.scores', vector: scores, axes: 'alternatives' },
      ],
      warnings,
    }
  },
}
