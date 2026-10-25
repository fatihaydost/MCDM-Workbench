import { column, isConstant, maxOf, sum } from '../math'
import { rankScores } from '../rank'
import type { MethodWarning, Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, hasErrors, validateProblem, validateRequirements, validateWeights } from '../validate'

/**
 * COPRAS, complex proportional assessment (Zavadskas, Kaklauskas & Šarka 1994), formulas from the authors' restatement
 * (Zavadskas, Kaklauskas, Peldschus & Turskis 2007, Eqs. 1-6) in the simplified form of Podvezko (2011, Eq. 11).
 * d_ij = w_j x_ij / Σ_i x_ij (benefit and cost alike), S+_i = Σ_{benefit} d_ij, S-_i = Σ_{cost} d_ij,
 * Q_i = S+_i + W_C (1 / S-_i) / Σ_k (1 / S-_k) with W_C = Σ_{cost} w_j, N_i = 100 Q_i / max Q; a higher Q ranks higher.
 * With no cost criterion, or cost weights that are all 0, Q = S+ (SAW with the sum option), with a notice.
 * Not implemented: the Q = S+ + S- of the 2007 paper's Table 2 (a computation error there). Every value must be above 0
 * (`requires.positiveValues`, 'non-positive-value'; no shift). No parameters.
 * See docs/research/methods/copras.md.
 */
export const copras: RankingMethod = {
  id: 'copras',
  kind: 'ranking',
  requires: { positiveValues: true },
  compute(problem: Problem, weights: number[]): RankingResult {
    const n = problem.criteria.length
    const issues = validateProblem(problem)
    // The cell check reads every row, so it runs on a well-formed matrix only (a malformed one is already an error).
    const cells = hasErrors(issues) ? [] : validateRequirements(problem, copras)
    assertValid([...issues, ...cells, ...validateWeights(weights, n)])
    const { matrix, criteria } = problem
    const isCost = criteria.map((c) => c.type === 'cost')
    const warnings: MethodWarning[] = []

    // 1. Shares of the column total, then weighted (Eqs. 1-2); every x > 0, so no total is 0.
    const totals = criteria.map((_, j) => sum(column(matrix, j)))
    const shares = matrix.map((row) => row.map((x, j) => x / totals[j]!))
    const d = shares.map((row) => row.map((x, j) => weights[j]! * x))

    // 2. Benefit and cost sums per alternative (Eq. 3).
    const sPlus = d.map((row) => sum(row.filter((_, j) => !isCost[j])))
    const sMinus = d.map((row) => sum(row.filter((_, j) => isCost[j])))

    // 3. Relative significance (Eq. 5, simplified): the cost weight W_C handed out by the reciprocal of each S-.
    const m = matrix.length
    const activeCostCount = weights.filter((w, j) => isCost[j] && w > 0).length
    if (m > 2 && activeCostCount >= 2) {
      for (let j = 0; j < n; j++) {
        if (isCost[j] && weights[j]! > 0 && isConstant(column(matrix, j))) {
          warnings.push({ code: 'copras.constant-cost-criterion', col: j })
        }
      }
    }
    const wCost = sum(weights.filter((_, j) => isCost[j]))
    const wCostNorm = weights.map((w, j) => (isCost[j] && wCost > 0 ? w / wCost : 0))
    const sMinusNorm = shares.map((row) => sum(row.map((x, j) => wCostNorm[j]! * x)))
    const sMax = maxOf(sMinusNorm)
    let scores: number[]
    if (wCost > 0 && sMax > 0 && sMinusNorm.every((s) => s > 0)) {
      if (activeCostCount === 1) warnings.push({ code: 'copras.single-cost-criterion' })
      const inv = sMinusNorm.map((s) => sMax / s)
      const invTotal = sum(inv)
      scores = sPlus.map((sp, i) => sp + (wCost * inv[i]!) / invTotal)
    } else {
      scores = [...sPlus]
      warnings.push({ code: 'copras.no-cost-criteria' })
    }

    // 4. Utility degree (Eq. 6), the best alternative 100.
    const best = maxOf(scores)
    const utility = scores.map((q) => (100 * q) / best)

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps: [
        { key: 'copras.normalizedSum', matrix: shares, axes: ['alternatives', 'criteria'] },
        { key: 'copras.weighted', matrix: d, axes: ['alternatives', 'criteria'] },
        { key: 'copras.sPlus', vector: sPlus, axes: 'alternatives' },
        { key: 'copras.sMinus', vector: sMinus, axes: 'alternatives' },
        { key: 'copras.significance', vector: scores, axes: 'alternatives' },
        { key: 'copras.utility', vector: utility, axes: 'alternatives' },
      ],
      diagnostics: { sumQ: sum(scores), wCost },
      warnings,
    }
  },
}
