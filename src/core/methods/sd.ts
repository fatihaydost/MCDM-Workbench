import { column, minMaxNormalize, sampleStd, sum } from '../math'
import type { MethodWarning, Problem, WeightingMethod, WeightingResult } from '../types'
import { assertValid, validateProblem } from '../validate'

/**
 * SD weighting (Diakoulaki, Mavrotas & Papayannakis 1995, Sec. 4, Eqs. 2 and 7; Mukhametzyanov 2021 Eq. 11), origin
 * variant: min-max normalization with cost inversion, sample SD σ_j (1 / (m - 1); Diakoulaki prints the population
 * value, the weights are the same), w_j = σ_j / Σ σ. Criterion types flip r but never change σ, so not the weights.
 * A constant column gets σ = 0 and weight 0; with every column constant the weights fall back to 1/n.
 * See docs/research/methods/sd.md.
 */
export const sd: WeightingMethod = {
  id: 'sd',
  kind: 'weighting',
  compute(problem: Problem): WeightingResult {
    assertValid(validateProblem(problem))
    const m = problem.matrix.length
    const n = problem.criteria.length
    const warnings: MethodWarning[] = []

    // 1. Min-max normalization; a constant column stays all zeros (σ 0 -> weight 0).
    const { r, constant, nearConstant } = minMaxNormalize(problem)
    constant.forEach((c, j) => c && warnings.push({ code: 'sd.constant-column', col: j }))
    nearConstant.forEach((near, j) => near && warnings.push({ code: 'sd.near-constant-column', col: j }))
    // Every varying column becomes {0, 1} with the same σ: equal weights over them.
    if (m === 2 && constant.filter((c) => !c).length >= 2) warnings.push({ code: 'sd.two-alternatives' })

    // 2. Contrast: sample standard deviation per column.
    const sigma = Array.from({ length: n }, (_, j) => sampleStd(column(r, j)))

    // 3. Weights; with every column constant there is nothing to weigh: equal weights.
    const total = sum(sigma)
    const allConstant = constant.every(Boolean)
    if (allConstant) warnings.push({ code: 'sd.all-constant-equal-weights' })
    const weights = allConstant ? new Array<number>(n).fill(1 / n) : sigma.map((s) => s / total)

    return {
      weights,
      steps: [
        { key: 'sd.normalized', matrix: r, axes: ['alternatives', 'criteria'] },
        { key: 'sd.sigma', vector: sigma, axes: 'criteria' },
        { key: 'sd.sigmaTotal', scalar: total },
        { key: 'sd.weights', vector: weights, axes: 'criteria' },
      ],
      diagnostics: {
        constantColumns: constant.filter(Boolean).length,
        allConstant: allConstant ? 1 : 0,
      },
      warnings,
    }
  },
}
