import { describe, expect, it } from 'vitest'
import {
  equal,
  getMethod,
  getWeightingMethod,
  rankScores,
  type Criterion,
  type CriterionType,
  type Problem,
} from '../src/core'
import rosz from './fixtures/roc-roszkowska2013.json'
import { expectClose, makeProblem, step } from './helpers'

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

describe('Equal weights: Roszkowska (2013) Table 4 & Table 6', () => {
  it('is registered in the core method registry', () => {
    expect(getMethod('equal')).toBe(equal)
    expect(getWeightingMethod('equal')).toBe(equal)
    expect(equal.id).toBe('equal')
    expect(equal.kind).toBe('weighting')
  })

  it('reproduces Roszkowska (2013) Table 4 EW column for n = 2..7 (including n = 4 -> 0.25 and n = 6 -> 1/6)', () => {
    for (const row of rosz.table4) {
      const p = makeProblem(
        [new Array<number>(row.n).fill(1), new Array<number>(row.n).fill(2)],
        new Array<CriterionType>(row.n).fill('benefit'),
      )
      const res = equal.compute(p, {})
      expectClose(res.weights, row.exact.ew, 1e-15)
      expectClose(res.weights, row.printed.ew, 1e-12)
      expectClose(step(res.steps, 'equal.weights').vector!, row.exact.ew, 1e-15)
      expect(res.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 15)
    }

    const p4 = makeProblem([[1, 2, 3, 4], [5, 6, 7, 8]], ['benefit', 'benefit', 'benefit', 'benefit'])
    expect(equal.compute(p4, {}).weights).toEqual([0.25, 0.25, 0.25, 0.25])

    const p6 = makeProblem(
      [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12]],
      ['benefit', 'cost', 'benefit', 'cost', 'benefit', 'cost'],
    )
    expectClose(equal.compute(p6, {}).weights, new Array<number>(6).fill(1 / 6), 1e-15)
  })

  it('reproduces Roszkowska (2013) Table 6 EW min-max SAW scores and ranking on the 5x5 example', () => {
    const problem = makeProblem(rosz.matrix, rosz.types as CriterionType[], rosz.alternatives)
    const res = equal.compute(problem, {})
    expectClose(res.weights, rosz.published.weights_n5_table4.ew, 1e-15)

    const norm = minMax(problem.matrix, problem.criteria)
    const scores = norm.map((row) => row.reduce((acc, r, j) => acc + res.weights[j]! * r, 0))
    expectClose(scores, rosz.published.table6_saw.ew.scores, 0.001)
    expect(rankScores(scores, 'desc')).toEqual(rosz.published.table6_saw.ew.ranking)
  })

  it('is invariant under criterion permutation, column scaling, and matrix values (including unvalidated matrices)', () => {
    const base = makeProblem(
      [
        [10, 200, 0.5, 40],
        [50, 100, 1.5, 80],
        [30, 300, 2.5, 20],
      ],
      ['benefit', 'cost', 'benefit', 'cost'],
    )
    const scaled = makeProblem(
      base.matrix.map((row) => row.map((v, j) => v * (j + 1) * 1e4 - 500)),
      ['cost', 'benefit', 'cost', 'benefit'],
    )
    const permuted: Problem = {
      alternatives: base.alternatives,
      criteria: [base.criteria[2]!, base.criteria[0]!, base.criteria[3]!, base.criteria[1]!],
      matrix: base.matrix.map((r) => [r[2]!, r[0]!, r[3]!, r[1]!]),
    }
    const incompleteMatrix: Problem = {
      alternatives: ['OnlyOne'],
      criteria: base.criteria,
      matrix: [[Number.NaN, 0, -999, Number.POSITIVE_INFINITY]],
    }

    const wBase = equal.compute(base, {}).weights
    expect(equal.compute(scaled, {}).weights).toEqual(wBase)
    expect(equal.compute(permuted, {}).weights).toEqual(wBase)
    expect(equal.compute(incompleteMatrix, {}).weights).toEqual(wBase)
  })

  it('supports n = 1 and throws RangeError when n < 1', () => {
    const p1: Problem = {
      alternatives: ['A1'],
      criteria: [{ name: 'C1', type: 'benefit' }],
      matrix: [[1]],
    }
    expect(equal.compute(p1, {}).weights).toEqual([1])

    const p0: Problem = {
      alternatives: [],
      criteria: [],
      matrix: [],
    }
    expect(() => equal.compute(p0, {})).toThrow(RangeError)
  })

  it('emits equal.constant-column warning for constant columns', () => {
    const p = makeProblem(
      [
        [5, 10, 7],
        [5, 20, 7 + 1e-13],
        [5, 30, 7],
      ],
      ['benefit', 'cost', 'benefit'],
    )
    const res = equal.compute(p, {})
    expect(res.weights).toEqual([1 / 3, 1 / 3, 1 / 3])
    expect(res.warnings).toEqual([
      { code: 'equal.constant-column', col: 0 },
      { code: 'equal.constant-column', col: 2 },
    ])
  })
})
