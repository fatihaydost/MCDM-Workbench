import { column, minMaxNormalize, pearson, sampleStd, sum, zeros } from '../math'
import { tied } from '../rank'
import type { MethodWarning, Problem, WeightingMethod, WeightingResult } from '../types'
import { assertValid, validateProblem } from '../validate'

/** Below this many alternatives the correlations are unstable (m = 2 gives only ±1). */
export const CRITIC_SMALL_M = 4

/**
 * CRITIC (Diakoulaki, Mavrotas & Papayannakis 1995), origin variant:
 * min-max normalization, sample SD, Pearson correlation without absolute value,
 * C_j = σ_j Σ_k (1 - ρ_jk), w_j = C_j / Σ C.
 * A constant column (spread within rounding) carries no information: weight 0, and it is left out of every conflict
 * sum, so adding one leaves the other weights exactly as they were without it. Its correlations are undefined (NaN in
 * the correlation step, shown as n/a) and its own conflict is 0, so every displayed row adds up as shown.
 * See docs/research/methods/critic.md.
 */
export const critic: WeightingMethod = {
  id: 'critic',
  kind: 'weighting',
  compute(problem: Problem): WeightingResult {
    const issues = assertValid(validateProblem(problem))
    const m = problem.matrix.length
    const n = problem.criteria.length
    const warnings: MethodWarning[] = issues
      .filter((x) => x.code === 'constant-column')
      .map((x) => ({ code: 'critic.constant-column', ...(x.col !== undefined && { col: x.col }) }))
    if (m < CRITIC_SMALL_M) warnings.push({ code: 'critic.few-alternatives' })

    // 1. Min-max normalization; a constant column becomes all zeros (sigma 0 -> weight 0).
    const { r, constant, nearConstant } = minMaxNormalize(problem)
    nearConstant.forEach((near, j) => near && warnings.push({ code: 'critic.near-constant-column', col: j }))

    // 2. Contrast: sample standard deviation per column.
    const sigma = Array.from({ length: n }, (_, j) => sampleStd(column(r, j)))

    // 3. Pearson correlation between normalized columns; undefined (NaN) for a pair with a constant column.
    const rho = zeros(n, n)
    for (let j = 0; j < n; j++) {
      rho[j]![j] = 1
      for (let k = j + 1; k < n; k++) {
        const v = constant[j] || constant[k] ? Number.NaN : pearson(column(r, j), column(r, k))
        rho[j]![k] = v
        rho[k]![j] = v
      }
    }

    // 4. Conflict Σ_k (1 - ρ_jk) over the columns that are not constant, and information C_j = σ_j · conflict_j.
    //    Taking a constant column's ρ as 0 would add 1 to every other column's conflict and shift their weights,
    //    although the column carries no information; leaving it out gives the weights of the problem without it.
    //    A constant column is left out of its own sum too: conflict 0.
    const conflict = rho.map((row, j) => (constant[j] ? 0 : sum(row.map((v, k) => (constant[k] ? 0 : 1 - v)))))
    const information = sigma.map((s, j) => s * conflict[j]!)

    // 5. Weights. With no information at all: every column constant -> equal weights; otherwise the columns that vary
    //    have no conflict with each other (only one varies, or they are perfectly correlated) -> they share equally.
    const total = sum(information)
    const allConstant = constant.every(Boolean)
    const varying = constant.filter((c) => !c).length
    let weights: number[]
    if (allConstant) {
      warnings.push({ code: 'critic.all-constant-equal-weights' })
      weights = new Array<number>(n).fill(1 / n)
    } else if (tied(total, 0)) {
      // Exactly 0 in practice (min-max makes affinely related columns identical, so ρ = 1); the tolerance guards a
      // future normalization that leaves ρ a rounding error below 1.
      warnings.push({ code: 'critic.no-conflict-equal-weights' })
      weights = constant.map((c) => (c ? 0 : 1 / varying))
    } else {
      weights = information.map((c) => c / total)
    }

    return {
      weights,
      steps: [
        { key: 'critic.normalized', matrix: r },
        { key: 'critic.sigma', vector: sigma },
        { key: 'critic.correlation', matrix: rho },
        { key: 'critic.conflict', vector: conflict },
        { key: 'critic.information', vector: information },
        { key: 'critic.informationTotal', scalar: total },
        { key: 'critic.weights', vector: weights },
      ],
      diagnostics: {
        constantColumns: constant.filter(Boolean).length,
        allConstant: allConstant ? 1 : 0,
      },
      warnings,
    }
  },
}
