import { column, isConstant, maxOf, minOf, sum, zeros } from '../math'
import { rankScores } from '../rank'
import type { MethodWarning, Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, validateProblem, validateWeights } from '../validate'

/**
 * TOPSIS (Hwang & Yoon 1981), vector normalization + Euclidean distance
 * as stated in Opricovic & Tzeng (2004) §3. See docs/research/methods/topsis.md.
 */
export const topsis: RankingMethod = {
  id: 'topsis',
  kind: 'ranking',
  compute(problem: Problem, weights: number[]): RankingResult {
    const n = problem.criteria.length
    assertValid([...validateProblem(problem), ...validateWeights(weights, n)])
    const { matrix, criteria } = problem
    const m = matrix.length
    const warnings: MethodWarning[] = []

    // 1. Vector normalization r_ij = x_ij / sqrt(Σ_i x_ij²); an all-zero column stays 0.
    const norms = Array.from({ length: n }, (_, j) => Math.sqrt(sum(column(matrix, j).map((x) => x * x))))
    const r = zeros(m, n)
    norms.forEach((norm, j) => {
      if (norm === 0) {
        warnings.push({ code: 'topsis.zero-column', col: j })
        return
      }
      for (let i = 0; i < m; i++) r[i]![j] = matrix[i]![j]! / norm
    })

    // 2. Weighted normalized matrix v_ij = w_j r_ij.
    const v = r.map((row) => row.map((x, j) => x * weights[j]!))

    // 3. Ideal (A+) and anti-ideal (A-) per criterion direction; a constant column (up to rounding) has A+ = A-.
    const best = new Array<number>(n)
    const worst = new Array<number>(n)
    for (let j = 0; j < n; j++) {
      const col = column(v, j)
      if (isConstant(column(matrix, j))) {
        best[j] = col[0]!
        worst[j] = col[0]!
        continue
      }
      const hi = maxOf(col)
      const lo = minOf(col)
      const isCost = criteria[j]!.type === 'cost'
      best[j] = isCost ? lo : hi
      worst[j] = isCost ? hi : lo
    }

    // 4. Euclidean distances to A+ and A-.
    const dist = (row: number[], ref: number[]) => Math.sqrt(sum(row.map((x, j) => (x - ref[j]!) ** 2)))
    const dBest = v.map((row) => dist(row, best))
    const dWorst = v.map((row) => dist(row, worst))

    // 5. Closeness C_i = D- / (D+ + D-); when both are 0 the alternative equals both ideals -> 0.5 (a tie, not "worst").
    let degenerate = 0
    const closeness = dBest.map((dp, i) => {
      const dm = dWorst[i]!
      const den = dp + dm
      if (den === 0) {
        degenerate++
        return 0.5
      }
      return dm / den
    })
    if (degenerate > 0) warnings.push({ code: 'topsis.zero-distance' })

    return {
      scores: closeness,
      order: 'desc',
      ranking: rankScores(closeness, 'desc'),
      steps: [
        { key: 'topsis.normalized', matrix: r, axes: ['alternatives', 'criteria'] },
        { key: 'topsis.weighted', matrix: v, axes: ['alternatives', 'criteria'] },
        { key: 'topsis.idealBest', vector: best, axes: 'criteria' },
        { key: 'topsis.idealWorst', vector: worst, axes: 'criteria' },
        { key: 'topsis.distanceBest', vector: dBest, axes: 'alternatives' },
        { key: 'topsis.distanceWorst', vector: dWorst, axes: 'alternatives' },
        { key: 'topsis.closeness', vector: closeness, axes: 'alternatives' },
      ],
      diagnostics: { zeroDistanceAlternatives: degenerate },
      warnings,
    }
  },
}
