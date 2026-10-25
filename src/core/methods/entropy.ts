import { column, isConstant, isNearConstant, minMaxNormalize, sum, zeros } from '../math'
import type { MethodWarning, Problem, Step, WeightingMethod, WeightingResult } from '../types'
import { assertValid, validateProblem, type ValidationIssue } from '../validate'

/** 'sum': shares of the raw values (types ignored). 'minmax': min-max normalization with cost inversion first. */
export type EntropyNormalization = 'sum' | 'minmax'
export type EntropyParams = { normalization?: EntropyNormalization }

/** A weight above this share gets a notice: one criterion decides most of the result. */
export const ENTROPY_DOMINANT_WEIGHT = 0.5
/** Below this total diversification every criterion counts as constant and the weights fall back to 1/n. */
export const ENTROPY_NO_INFORMATION = 1e-12

/**
 * Entropy weighting (Shannon information measure as an MCDM weighting; Zeleny 1982, Hwang & Yoon 1981).
 * p_ij = r_ij / Σ_i r_ij, e_j = -(1 / ln m) Σ_i p_ij ln p_ij with 0 ln 0 = 0, d_j = max(0, 1 - e_j), w_j = d_j / Σ d.
 * - normalization 'sum' (default): r = x on raw data, criterion types ignored (Zavadskas et al. 2017 Eqs. 1-4,
 *   Vujičić et al. 2017 Eqs. 15-19). Any x < 0 is a blocking 'negative-value' error.
 * - normalization 'minmax': benefit r = (x - min) / (max - min), cost r = (max - x) / (max - min)
 *   (Mukhametzyanov 2021 Eqs. 1-4); any sign is accepted.
 * A constant column (all-zero included, spread within rounding) gets p = 1/m, e = 1 and d = 0 without dividing (weight 0, notice).
 * See docs/research/methods/entropy.md.
 */
export const entropy: WeightingMethod<EntropyParams> = {
  id: 'entropy',
  kind: 'weighting',
  params: [{ key: 'normalization', kind: 'choice', options: ['sum', 'minmax'], default: 'sum' }],
  compute(problem: Problem, params: EntropyParams = {}): WeightingResult {
    const variant = params.normalization ?? 'sum'
    if (variant !== 'sum' && variant !== 'minmax') throw new RangeError(`unknown entropy normalization ${String(variant)}`)
    const own: ValidationIssue[] = []
    if (variant === 'sum') {
      problem.matrix.forEach((row, i) => {
        if (!Array.isArray(row)) return
        row.forEach((v, j) => {
          if (typeof v === 'number' && Number.isFinite(v) && v < 0) {
            own.push({ code: 'negative-value', severity: 'error', row: i, col: j, value: v })
          }
        })
      })
    }
    assertValid([...validateProblem(problem), ...own])

    const { matrix, criteria } = problem
    const m = matrix.length
    const n = criteria.length
    const k = 1 / Math.log(m)
    const warnings: MethodWarning[] = []
    // Constant up to rounding (0.3 and 0.1 + 0.2 are the same value), so min-max never stretches noise to [0, 1].
    const constant = Array.from({ length: n }, (_, j) => isConstant(column(matrix, j)))

    // 1. (minmax only) r in [0, 1], 1 = best; a constant column (max = min) stays 0 and is never divided.
    const isMinMax = variant === 'minmax'
    const norm = isMinMax ? minMaxNormalize(problem) : null
    const r = norm ? norm.r : undefined
    const base = r ?? matrix

    // 2-4. Proportions, entropy and diversification per column.
    const p = zeros(m, n)
    const e = new Array<number>(n).fill(1)
    const d = new Array<number>(n).fill(0)
    for (let j = 0; j < n; j++) {
      if (constant[j]) {
        // The limit of a column that cannot tell the alternatives apart: even shares, e = 1, d = 0.
        for (let i = 0; i < m; i++) p[i]![j] = 1 / m
        warnings.push({ code: 'entropy.constant-column', col: j })
        continue
      }
      const rawCol = column(matrix, j)
      if (isMinMax ? norm!.nearConstant[j] : isNearConstant(rawCol)) {
        warnings.push({ code: 'entropy.near-constant-column', col: j })
      }
      // Not constant, so the column total is above 0: (sum) values are >= 0 and not all equal, (minmax) the best is 1.
      const total = sum(column(base, j))
      let h = 0
      for (let i = 0; i < m; i++) {
        const pij = base[i]![j]! / total
        p[i]![j] = pij
        if (pij > 0) h += pij * Math.log(pij)
      }
      e[j] = -k * h
      d[j] = Math.max(0, 1 - e[j]!)
      if (variant === 'sum' && rawCol.some((v) => v === 0)) warnings.push({ code: 'entropy.zeros-in-column', col: j })
    }

    // 5. Weights; with no diversification at all there is nothing to weigh: equal weights across varying columns (or all if all constant).
    const totalD = sum(d)
    const allConstant = constant.every(Boolean) || totalD <= Number.MIN_VALUE
    if (allConstant) warnings.push({ code: 'entropy.all-constant-equal-weights' })
    const varying = constant.filter((c) => !c).length
    const weights = allConstant
      ? varying > 0
        ? constant.map((c) => (c ? 0 : 1 / varying))
        : new Array<number>(n).fill(1 / n)
      : d.map((x) => x / totalD)

    if (isMinMax && m === 2 && varying > 1) warnings.push({ code: 'entropy.two-alternatives-minmax' })
    const top = weights.reduce((best, w, j) => (w > weights[best]! ? j : best), 0)
    if (!allConstant && varying > 1 && weights[top]! > ENTROPY_DOMINANT_WEIGHT) {
      warnings.push({ code: 'entropy.dominant-weight', col: top })
    }

    return {
      weights,
      steps: [
        ...(r ? [{ key: 'entropy.normalized', matrix: r, axes: ['alternatives', 'criteria'] } satisfies Step] : []),
        { key: variant === 'sum' ? 'entropy.proportionsSum' : 'entropy.proportionsMinmax', matrix: p, axes: ['alternatives', 'criteria'] },
        { key: 'entropy.entropy', vector: e, axes: 'criteria' },
        { key: 'entropy.diversification', vector: d, axes: 'criteria' },
        { key: 'entropy.weights', vector: weights, axes: 'criteria' },
      ],
      diagnostics: {
        constantColumns: constant.filter(Boolean).length,
        allConstant: allConstant ? 1 : 0,
      },
      warnings,
    }
  },
}
