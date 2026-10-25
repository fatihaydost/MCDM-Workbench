import { column, isConstant, linearMaxNormalize, maxOf, minOf, sum } from '../math'
import { rankScores } from '../rank'
import type { Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, hasErrors, validateProblem, validateRequirements, validateWeights } from '../validate'

/**
 * MARCOS, measurement of alternatives and ranking according to compromise solution (Stević, Pamučar, Puška &
 * Chatterjee 2020), formulas from the authors' open restatement (Stević & Brković 2020, Logistics 4(1):4, Eqs. 1-12).
 * Ideal AI and anti-ideal AAI rows from the data (Eqs. 2-3); normalization benefit x / AI, cost AI / x (Eqs. 4-5),
 * which is `linearMaxNormalize`; S_i = Σ_j w_j n_ij, S_ai = Σ w, S_aai = Σ_j w_j min_j / max_j;
 * K-_i = S_i / S_aai, K+_i = S_i / S_ai, f(K-) = K+ / (K+ + K-), f(K+) = K- / (K+ + K-) (one number for all rows),
 * f(K_i) = (K+ + K-) / (1 + (1 - f(K+)) / f(K+) + (1 - f(K-)) / f(K-)); a higher f(K) ranks higher.
 * f(K_i) = c S_i with c = (a + b) / (a² + ab + b²), a = S_aai, b = S_ai: the order of SAW 'linearMax'.
 * No user-defined AI/AAI. Every value must be above 0 (`requires.positiveValues`, 'non-positive-value'; no shift).
 * No parameters. See docs/research/methods/marcos.md.
 */
export const marcos: RankingMethod = {
  id: 'marcos',
  kind: 'ranking',
  requires: { positiveValues: true },
  compute(problem: Problem, weights: number[]): RankingResult {
    const n = problem.criteria.length
    const issues = validateProblem(problem)
    // The cell check reads every row, so it runs on a well-formed matrix only (a malformed one is already an error).
    const cells = hasErrors(issues) ? [] : validateRequirements(problem, marcos)
    assertValid([...issues, ...cells, ...validateWeights(weights, n)])
    const { matrix } = problem

    // 1-3. Normalize against the ideal row (Eqs. 4-5); the ideal row becomes all 1, the anti-ideal row min / max.
    const r = linearMaxNormalize(problem)
    const aaiRow = problem.criteria.map((_, j) => {
      const col = column(matrix, j)
      if (isConstant(col)) return 1
      return minOf(col) / maxOf(col)
    })

    // 4. Weighted matrix and row sums (Eqs. 6, 9), for the two reference rows as well.
    const v = r.map((row) => row.map((x, j) => x * weights[j]!))
    const s = v.map((row) => sum(row))
    const sAi = sum(weights)
    const sAai = sum(aaiRow.map((x, j) => x * weights[j]!))

    // 5-6. Utility degrees and functions (Eqs. 7-8, 11-12, 10), literally as printed.
    const kMinus = s.map((x) => x / sAai)
    const kPlus = s.map((x) => x / sAi)
    const fKMinus = kPlus[0]! / (kPlus[0]! + kMinus[0]!)
    const fKPlus = kMinus[0]! / (kPlus[0]! + kMinus[0]!)
    const scores = s.map((_, i) => (kPlus[i]! + kMinus[i]!) / (1 + (1 - fKPlus) / fKPlus + (1 - fKMinus) / fKMinus))
    const c = (sAai + sAi) / (sAai * sAai + sAai * sAi + sAi * sAi)

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps: [
        { key: 'marcos.normalized', matrix: r, axes: ['alternatives', 'criteria'] },
        { key: 'marcos.weighted', matrix: v, axes: ['alternatives', 'criteria'] },
        { key: 'marcos.sAai', scalar: sAai },
        { key: 'marcos.sAi', scalar: sAi },
        { key: 'marcos.s', vector: s, axes: 'alternatives' },
        { key: 'marcos.kMinus', vector: kMinus, axes: 'alternatives' },
        { key: 'marcos.kPlus', vector: kPlus, axes: 'alternatives' },
        { key: 'marcos.fKMinus', scalar: fKMinus },
        { key: 'marcos.fKPlus', scalar: fKPlus },
        { key: 'marcos.utility', vector: scores, axes: 'alternatives' },
      ],
      diagnostics: { sAai, sAaai: sAai, sAi, c },
      warnings: [],
    }
  },
}
