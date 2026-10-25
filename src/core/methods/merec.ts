import { column, isConstant, isNearConstant, maxOf, minOf, zeros } from '../math'
import type { MethodWarning, Problem, WeightingMethod, WeightingResult } from '../types'
import { assertValid, validateProblem, type ValidationIssue } from '../validate'

/** A weight above this share gets a notice: one criterion decides most of the result (as Entropy). */
export const MEREC_DOMINANT_WEIGHT = 0.5

/**
 * MEREC weighting (Keshavarz-Ghorabaee, Amiri, Zavadskas, Turskis & Antucheviciene 2021, Symmetry 13:525, Sec. 3,
 * Eqs. 1-6), origin form only, no parameters:
 * n_ij = min_k x_kj / x_ij (benefit) or x_ij / max_k x_kj (cost), so the best value gets the smallest n;
 * S_i = ln(1 + (1/n) Σ_j |ln n_ij|), S'_ij = the same sum without criterion j and the divisor still n (criteria);
 * E_j = Σ_i |S'_ij - S_i|, w_j = E_j / Σ E. Every x must be above 0 (blocking 'non-positive-value', no shift).
 * A constant column (isConstant) gets |ln n| = 0 exactly, so E = 0 and weight 0; with every column constant the
 * weights fall back to 1/n. See docs/research/methods/merec.md.
 */
export const merec: WeightingMethod = {
  id: 'merec',
  kind: 'weighting',
  compute(problem: Problem): WeightingResult {
    const own: ValidationIssue[] = []
    problem.matrix.forEach((row, i) => {
      if (!Array.isArray(row)) return
      row.forEach((v, j) => {
        if (typeof v === 'number' && Number.isFinite(v) && v <= 0) {
          own.push({ code: 'non-positive-value', severity: 'error', row: i, col: j, value: v })
        }
      })
    })
    assertValid([...validateProblem(problem), ...own])

    const { matrix, criteria } = problem
    const m = matrix.length
    const n = criteria.length
    const warnings: MethodWarning[] = []

    // 1. Normalization to "smaller is better" and L = |ln n| = -ln n (n <= 1). A constant column (up to rounding)
    //    is set to n = 1, L = 0 exactly, so its removal effect is exactly 0.
    const norm = zeros(m, n)
    const absLog = zeros(m, n)
    const constant = new Array<boolean>(n).fill(false)
    for (let j = 0; j < n; j++) {
      const col = column(matrix, j)
      if (isConstant(col)) {
        constant[j] = true
        for (let i = 0; i < m; i++) norm[i]![j] = 1
        warnings.push({ code: 'merec.constant-column', col: j })
        continue
      }
      if (isNearConstant(col)) warnings.push({ code: 'merec.near-constant-column', col: j })
      const lo = minOf(col)
      const hi = maxOf(col)
      const isCost = criteria[j]!.type === 'cost'
      for (let i = 0; i < m; i++) {
        const v = isCost ? col[i]! / hi : lo / col[i]!
        norm[i]![j] = v
        absLog[i]![j] = -Math.log(v)
      }
    }

    // 2. Overall performance S_i and performance with criterion j removed S'_ij (divisor n either way).
    const rowTotal = absLog.map((row) => row.reduce((a, b) => a + b, 0))
    const without = absLog.map((row) =>
      row.map((_, j) => {
        let s = 0
        for (let k = 0; k < n; k++) if (k !== j) s += row[k]!
        return s
      }),
    )
    const performance = rowTotal.map((r) => Math.log1p(r / n))
    const removed = without.map((row) => row.map((w) => Math.log1p(w / n)))

    // 3. Removal effect, cancellation-free: S_i - S'_ij = ln((n + R_i) / (n + withoutJ)) = log1p(L / (n + withoutJ)).
    const effect = Array.from({ length: n }, (_, j) => {
      let e = 0
      for (let i = 0; i < m; i++) {
        const l = absLog[i]![j]!
        const withoutJ = without[i]![j]!
        e += Math.log1p(l / (n + withoutJ))
      }
      return e
    })

    // 4. Weights; with nothing removed by any criterion (every column constant, or the 0/0 guard) use 1/n.
    const total = effect.reduce((a, b) => a + b, 0)
    // total === 0 is defensive only: isConstant already catches every column whose min/x rounds to 1.
    const allConstant = constant.every(Boolean) || total === 0
    const varying = constant.filter((c) => !c).length
    if (allConstant) warnings.push({ code: 'merec.all-constant-equal-weights' })
    const weights = allConstant ? new Array<number>(n).fill(1 / n) : effect.map((e) => e / total)

    const top = weights.reduce((best, w, j) => (w > weights[best]! ? j : best), 0)
    if (!allConstant && varying > 1 && weights[top]! > MEREC_DOMINANT_WEIGHT) {
      warnings.push({ code: 'merec.dominant-weight', col: top })
    }

    return {
      weights,
      steps: [
        { key: 'merec.normalized', matrix: norm, axes: ['alternatives', 'criteria'] },
        { key: 'merec.absLog', matrix: absLog, axes: ['alternatives', 'criteria'] },
        { key: 'merec.performance', vector: performance, axes: 'alternatives' },
        { key: 'merec.performanceRemoved', matrix: removed, axes: ['alternatives', 'criteria'] },
        { key: 'merec.removalEffect', vector: effect, axes: 'criteria' },
        { key: 'merec.weights', vector: weights, axes: 'criteria' },
      ],
      diagnostics: {
        constantColumns: constant.filter(Boolean).length,
        allConstant: allConstant ? 1 : 0,
      },
      warnings,
    }
  },
}
