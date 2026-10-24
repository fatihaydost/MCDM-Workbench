import { describe, expect, it } from 'vitest'
import {
  ProblemValidationError,
  rankScores,
  roc,
  strictRankWeights,
  type Criterion,
  type CriterionType,
} from '../src/core'
import rosz from './fixtures/roc-roszkowska2013.json'
import { expectClose, makeProblem, step } from './helpers'

const sumOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)

function minMax(matrix: readonly (readonly number[])[], criteria: readonly Criterion[]): number[][] {
  const m = matrix.length
  const n = criteria.length
  const out = Array.from({ length: m }, () => new Array<number>(n).fill(0))
  for (let j = 0; j < n; j++) {
    const col = matrix.map((r) => r[j]!)
    const lo = Math.min(...col)
    const hi = Math.max(...col)
    const range = hi - lo
    const benefit = criteria[j]!.type === 'benefit'
    for (let i = 0; i < m; i++) {
      out[i]![j] = range === 0 ? 1 : benefit ? (col[i]! - lo) / range : (hi - col[i]!) / range
    }
  }
  return out
}

describe('ROC: Roszkowska 2013 (Optimum. Studia Ekonomiczne 5(65):14-33, Table 4, n = 2..7)', () => {
  const n4Problem = makeProblem(
    [
      [10, 20, 30, 40],
      [15, 25, 35, 45],
    ],
    ['benefit', 'benefit', 'benefit', 'benefit'],
  )

  it('matches Table 4 published 2-decimal weights for n = 4 across ROC, RS and RR within 0.005', () => {
    const rocW = roc.compute(n4Problem, { formula: 'roc' }).weights
    const rsW = roc.compute(n4Problem, { formula: 'rs' }).weights
    const rrW = roc.compute(n4Problem, { formula: 'rr' }).weights
    expectClose(rocW, rosz.published.weights_n4.roc, rosz.expected.tolerance_vs_published)
    expectClose(rsW, rosz.published.weights_n4.rs, rosz.expected.tolerance_vs_published)
    expectClose(rrW, rosz.published.weights_n4.rr, rosz.expected.tolerance_vs_published)
    expectClose(rocW, rosz.expected.weights_n4_exact.roc, rosz.expected.tolerance_exact)
    expectClose(rsW, rosz.expected.weights_n4_exact.rs, rosz.expected.tolerance_exact)
    expectClose(rrW, rosz.expected.weights_n4_exact.rr, rosz.expected.tolerance_exact)
  })

  it('reproduces every n = 2..7 row of Table 4 in closed form', () => {
    for (const row of rosz.table4) {
      const exactRoc = strictRankWeights(row.n, 'roc')
      const exactRs = strictRankWeights(row.n, 'rs')
      const exactRr = strictRankWeights(row.n, 'rr')

      expect(Math.abs(sumOf(exactRoc) - 1)).toBeLessThan(1e-15)
      expect(Math.abs(sumOf(exactRs) - 1)).toBeLessThan(1e-15)
      expect(Math.abs(sumOf(exactRr) - 1)).toBeLessThan(1e-15)

      expectClose(exactRoc, row.exact.roc, 1e-12)
      expectClose(exactRs, row.exact.rs, 1e-12)
      expectClose(exactRr, row.exact.rr, 1e-12)

      expectClose(exactRoc, row.printed.roc, 0.01)
      expectClose(exactRs, row.printed.rs, row.n === 5 ? 0.014 : 0.006)
      expectClose(exactRr, row.printed.rr, 0.0065)
    }
  })
})

describe('ROC: Roszkowska 2013 Section 7 (Tables 5 and 6, 5x5 numerical example)', () => {
  const problem = makeProblem(
    rosz.matrix,
    rosz.types as CriterionType[],
    rosz.alternatives,
  )

  it('matches Table 4 / Section 7 n = 5 weights for ROC, RS and RR', () => {
    const rocRes = roc.compute(problem, { formula: 'roc' })
    const rsRes = roc.compute(problem, { formula: 'rs' })
    const rrRes = roc.compute(problem, { formula: 'rr' })

    expect(step(rocRes.steps, 'roc.ranks').vector).toEqual([1, 2, 3, 4, 5])
    expectClose(rocRes.weights, rosz.expected.weights_exact.roc, rosz.expected.tolerance_exact)
    expectClose(rsRes.weights, rosz.expected.weights_exact.rs, rosz.expected.tolerance_exact)
    expectClose(rrRes.weights, rosz.expected.weights_exact.rr, rosz.expected.tolerance_exact)
    expectClose(rocRes.weights, rosz.published.weights_n5_table4.roc, 0.007)
    expectClose(rsRes.weights, rosz.published.weights_n5_table4.rs, 0.014)
    expectClose(rrRes.weights, rosz.published.weights_n5_table4.rr, 0.006)
  })

  it('reproduces Table 6 min-max SAW scores and rankings for ROC, RS and RR', () => {
    const norm = minMax(problem.matrix, problem.criteria)
    const sawScores = (w: readonly number[]) =>
      norm.map((row: number[]) => row.reduce((acc: number, r: number, j: number) => acc + w[j]! * r, 0))

    const rocScores = sawScores(roc.compute(problem, { formula: 'roc' }).weights)
    const rsScores = sawScores(roc.compute(problem, { formula: 'rs' }).weights)
    const rrScores = sawScores(roc.compute(problem, { formula: 'rr' }).weights)

    // Exact closed-form weights stay within 0.008 of Table 6; Table 4 2-decimal weights match ROC to 0.001 and RR within 0.01 (A3 sums 0.15+0.11+0.09 = 0.35).
    expectClose(rocScores, rosz.published.table6_saw.roc.scores, 0.008)
    expectClose(rsScores, rosz.published.table6_saw.rs.scores, 0.008)
    expectClose(rrScores, rosz.published.table6_saw.rr.scores, 0.008)
    expectClose(sawScores(rosz.published.weights_n5_table4.roc), rosz.published.table6_saw.roc.scores, 0.001)
    expectClose(sawScores(rosz.published.weights_n5_table4.rr), rosz.published.table6_saw.rr.scores, 0.011)

    expect(rankScores(rocScores, 'desc')).toEqual(rosz.published.table6_saw.roc.ranking)
    expect(rankScores(rsScores, 'desc')).toEqual(rosz.published.table6_saw.rs.ranking)
    expect(rankScores(rrScores, 'desc')).toEqual(rosz.published.table6_saw.rr.ranking)
  })
})

describe('ROC: custom ranks, ties and pyDecision cross-validation', () => {
  const p4 = makeProblem(
    [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ],
    ['benefit', 'cost', 'benefit', 'cost'],
  )

  it("matches pyDecision roc_method and rsw_method on order ['C3', 'C1', 'C4', 'C2'] (ranks [2, 4, 1, 3])", () => {
    const ranks = [2, 4, 1, 3]
    const rocRes = roc.compute(p4, { formula: 'roc', ranks })
    const rsRes = roc.compute(p4, { formula: 'rs', ranks })
    const rrRes = roc.compute(p4, { formula: 'rr', ranks })

    expect(step(rocRes.steps, 'roc.ranks').vector).toEqual([2, 4, 1, 3])
    expectClose(rocRes.weights, [13 / 48, 3 / 48, 25 / 48, 7 / 48], 1e-15)
    expectClose(rsRes.weights, [0.3, 0.1, 0.4, 0.2], 1e-15)
    expectClose(rrRes.weights, [6 / 25, 3 / 25, 12 / 25, 4 / 25], 1e-15)
  })

  it('averages consecutive strict-rank weights across tied criteria and preserves sum = 1', () => {
    // Ranks [1, 2, 2, 4]: positions 2 and 3 are tied, so each gets (w_(2) + w_(3)) / 2
    const tied = roc.compute(p4, { formula: 'roc', ranks: [1, 2, 2, 4] })
    expectClose(tied.weights, [25 / 48, 10 / 48, 10 / 48, 3 / 48], 1e-15)
    expect(Math.abs(sumOf(tied.weights) - 1)).toBeLessThan(1e-15)

    // All criteria tied -> equal weights 1 / n under all three formulas
    for (const formula of ['roc', 'rs', 'rr'] as const) {
      const allTied = roc.compute(p4, { formula, ranks: [1, 1, 1, 1] })
      expectClose(allTied.weights, [0.25, 0.25, 0.25, 0.25], 1e-15)
    }
  })

  it('ignores matrix values, negative numbers, zeros, constant columns and criterion types', () => {
    const negConst = makeProblem(
      [
        [-100, 0, 7, 1e6],
        [-50, 0, 7, -1e6],
        [0, 0, 7, 42],
      ],
      ['cost', 'benefit', 'cost', 'benefit'],
    )
    const res = roc.compute(negConst, { formula: 'roc' })
    expectClose(res.weights, [25 / 48, 13 / 48, 7 / 48, 3 / 48], 1e-15)
    expect(res.warnings).toEqual([])
  })

  it('throws ProblemValidationError on structurally invalid problems', () => {
    expect(() =>
      roc.compute(makeProblem([[1, Number.NaN], [2, 3]], ['benefit', 'benefit']), {}),
    ).toThrow(ProblemValidationError)
  })

  it('throws RangeError when params.ranks is not an array of length n with finite numbers', () => {
    expect(() => roc.compute(p4, { ranks: [1, 2, 3] })).toThrow(RangeError)
    expect(() => roc.compute(p4, { ranks: [1, 2, 3, 4, 5] })).toThrow(RangeError)
    expect(() => roc.compute(p4, { ranks: [1, 2, Number.NaN, 4] })).toThrow(RangeError)
    expect(() => roc.compute(p4, { ranks: 'invalid' as unknown as number[] })).toThrow(RangeError)
  })
})
