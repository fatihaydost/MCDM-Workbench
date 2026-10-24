import { column, minMaxNormalize, sampleStd, sum } from '../math'
import { tied } from '../rank'
import type { MethodWarning, Problem, WeightingMethod, WeightingResult } from '../types'
import { assertValid, validateProblem } from '../validate'

/**
 * LOPCOW weighting (Ecer & Pamucar 2022, Omega 112:102690; verified on Keles 2023 Tables 6-8):
 * min-max normalization with cost inversion, root-mean-square RMS_j = sqrt(sum(r_ij^2) / m),
 * sample standard deviation sigma_j (divisor m - 1), logarithmic percentage value
 * PV_j = |ln(RMS_j / sigma_j) * 100|, and weights w_j = PV_j / sum(PV).
 * Since r_ij in [0, 1], RMS_j^2 - sigma_j^2 = (2 / (m * (m - 1))) * sum_{i < k} r_ij * r_kj >= 0,
 * with equality on a varying column iff a single alternative is at 1 and all others are at 0
 * (which always holds at m = 2, collapsing all PV_j to 0 and weights to 1/n).
 * See docs/research/methods/lopcow.md.
 */
export const lopcow: WeightingMethod = {
  id: 'lopcow',
  kind: 'weighting',
  compute(problem: Problem): WeightingResult {
    assertValid(validateProblem(problem))
    const m = problem.matrix.length
    const n = problem.criteria.length
    const warnings: MethodWarning[] = []

    // 1. Min-max normalization; a constant column stays all zeros (sigma 0 -> PV 0 -> weight 0).
    const { r, constant, nearConstant } = minMaxNormalize(problem)
    constant.forEach((c, j) => c && warnings.push({ code: 'lopcow.constant-column', col: j }))
    nearConstant.forEach((near, j) => near && warnings.push({ code: 'lopcow.near-constant-column', col: j }))
    // With two alternatives, every varying column is {0, 1}: RMS = sigma = 1/sqrt(2), so PV = 0 -> equal weights.
    if (m === 2) warnings.push({ code: 'lopcow.two-alternatives' })

    // 2. Root-mean-square, sample standard deviation (m - 1), and logarithmic percentage value per column.
    const rms = new Array<number>(n)
    const stdDev = new Array<number>(n)
    const pv = new Array<number>(n)
    for (let j = 0; j < n; j++) {
      const col = column(r, j)
      const sq = col.reduce((acc, v) => acc + v * v, 0)
      const q = Math.sqrt(sq / m)
      const sd = sampleStd(col)
      rms[j] = q
      stdDev[j] = sd
      pv[j] = constant[j] || sd === 0 || tied(q, sd) ? 0 : Math.abs(Math.log(q / sd) * 100)
    }

    // 3. Weights; when all columns are constant or every PV is 0 (e.g. m = 2), fall back to equal weights 1/n.
    const total = sum(pv)
    const allConstant = constant.every(Boolean)
    if (allConstant) warnings.push({ code: 'lopcow.all-constant-equal-weights' })
    const weights = allConstant || total === 0 ? new Array<number>(n).fill(1 / n) : pv.map((v) => v / total)

    return {
      weights,
      steps: [
        { key: 'lopcow.normalized', matrix: r, axes: ['alternatives', 'criteria'] },
        { key: 'lopcow.rms', vector: rms, axes: 'criteria' },
        { key: 'lopcow.stdDev', vector: stdDev, axes: 'criteria' },
        { key: 'lopcow.pv', vector: pv, axes: 'criteria' },
        { key: 'lopcow.weights', vector: weights, axes: 'criteria' },
      ],
      diagnostics: {
        constantColumns: constant.filter(Boolean).length,
        allConstant: allConstant ? 1 : 0,
      },
      warnings,
    }
  },
}
