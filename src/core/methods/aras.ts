import { column, maxOf, minOf, sum } from '../math'
import { rankScores } from '../rank'
import type { Problem, RankingMethod, RankingResult } from '../types'
import {
  assertValid,
  hasErrors,
  MAX_MAGNITUDE,
  MIN_MAGNITUDE,
  validateProblem,
  validateRequirements,
  validateWeights,
} from '../validate'

export type ArasParams = {
  /**
   * Optional benchmark row x_{0j} (length n, all > 0), such as regulatory or technical target norms
   * in Zavadskas & Turskis (2010) Table 1. When omitted, defaults to the column best:
   * max_i x_{ij} for benefit criteria and min_i x_{ij} for cost criteria.
   */
  optimal?: readonly number[]
}

/**
 * ARAS (Additive Ratio Assessment; Zavadskas & Turskis 2010, Eqs. 1-16; Bakir & Atalik 2018, Eqs. 6-11).
 *
 * Prepends an optimal benchmark row A_0 (x_{0j} = max_i x_{ij} for benefit, min_i x_{ij} for cost, or a supplied
 * positive target row), inverts cost criteria via x*_{ij} = 1 / x_{ij} across all m + 1 rows (0..m), normalizes
 * each column by its (m + 1)-row sum \sum_{k=0}^m x*_{kj}, weights by w_j, sums each row to S_i (i = 0..m), and
 * scores every alternative by its utility degree K_i = S_i / S_0 (higher is better).
 */
function compute(problem: Problem, weights: number[], params: ArasParams = {}): RankingResult {
  const issues = validateProblem(problem)
  if (!hasErrors(issues)) issues.push(...validateRequirements(problem, aras))
  const n = problem.criteria.length
  issues.push(...validateWeights(weights, n))

  if (params?.optimal !== undefined) {
    const opt = params.optimal
    if (!Array.isArray(opt) || opt.length !== n) {
      issues.push({ code: 'row-length-mismatch', severity: 'error', value: Array.isArray(opt) ? opt.length : 0 })
    } else {
      opt.forEach((v, j) => {
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          issues.push({ code: 'invalid-cell', severity: 'error', col: j })
        } else if (v <= 0) {
          issues.push({ code: 'non-positive-value', severity: 'error', col: j, value: v })
        } else if (Math.abs(v) > MAX_MAGNITUDE || Math.abs(v) < MIN_MAGNITUDE) {
          issues.push({ code: 'value-out-of-range', severity: 'error', col: j, value: v })
        }
      })
    }
  }
  assertValid(issues)

  const { criteria, matrix } = problem
  const m = matrix.length

  // Step 1: Optimal row x_{0j} (column best when params.optimal is not supplied).
  const optimalRow =
    params?.optimal !== undefined
      ? params.optimal.map(Number)
      : criteria.map((c, j) => {
          const col = column(matrix, j)
          return c.type === 'cost' ? minOf(col) : maxOf(col)
        })

  // Step 2: Extended sum normalization over rows 0..m (cost criteria inverted via 1 / x_{ij}).
  const r0 = new Array<number>(n)
  const normalized: number[][] = Array.from({ length: m }, () => new Array<number>(n))

  for (let j = 0; j < n; j++) {
    const isCost = criteria[j]!.type === 'cost'
    const optVal = optimalRow[j]!
    const x0Star = isCost ? 1 / optVal : optVal
    let colSum = x0Star
    const colStar = new Array<number>(m)
    for (let i = 0; i < m; i++) {
      const cell = matrix[i]![j]!
      const v = isCost ? 1 / cell : cell
      colStar[i] = v
      colSum += v
    }
    r0[j] = x0Star / colSum
    for (let i = 0; i < m; i++) {
      normalized[i]![j] = colStar[i]! / colSum
    }
  }

  // Step 3: Weighted normalized matrix \hat{x}_{ij} = w_j * \bar{x}_{ij} (i = 1..m) and S_0 = \sum_j w_j * \bar{x}_{0j}.
  let optimalScore = 0
  for (let j = 0; j < n; j++) {
    optimalScore += weights[j]! * r0[j]!
  }
  const weighted = normalized.map((row) => row.map((v, j) => v * weights[j]!))

  // Step 4 & 5: Optimality function S_i = \sum_j \hat{x}_{ij} and utility degree K_i = S_i / S_0.
  const optimality = weighted.map((row) => sum(row))
  const utilityDegree = optimality.map((s) => s / optimalScore)

  return {
    scores: utilityDegree,
    order: 'desc',
    ranking: rankScores(utilityDegree, 'desc'),
    steps: [
      { key: 'aras.optimalRow', vector: optimalRow, axes: 'criteria' },
      { key: 'aras.optimalNormalized', vector: r0, axes: 'criteria' },
      { key: 'aras.normalized', matrix: normalized, axes: ['alternatives', 'criteria'] },
      { key: 'aras.optimalWeighted', vector: r0.map((v, j) => v * (weights[j] ?? 0)), axes: 'criteria' },
      { key: 'aras.weighted', matrix: weighted, axes: ['alternatives', 'criteria'] },
      { key: 'aras.optimalScore', scalar: optimalScore },
      { key: 'aras.optimality', vector: optimality, axes: 'alternatives' },
      { key: 'aras.utilityDegree', vector: utilityDegree, axes: 'alternatives' },
    ],
    diagnostics: { optimalScore },
    warnings: [],
  }
}

export const aras: RankingMethod<ArasParams> = {
  id: 'aras',
  kind: 'ranking',
  requires: { positiveValues: true },
  compute,
}
