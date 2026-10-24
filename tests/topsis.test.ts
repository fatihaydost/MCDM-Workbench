import { describe, expect, it } from 'vitest'
import { critic, ProblemValidationError, topsis, type CriterionType } from '../src/core'
import f from './fixtures/opricovic-tzeng-2004-f.json'
import phi from './fixtures/opricovic-tzeng-2004-phi.json'
import legacy from './fixtures/legacy-python-critic-topsis.json'
import { expectClose, makeProblem, step } from './helpers'

for (const fx of [f, phi]) {
  describe(`TOPSIS: ${fx.id} (Opricovic & Tzeng 2004, EJOR 156:445, Table 3)`, () => {
    const res = topsis.compute(makeProblem(fx.matrix, fx.types as CriterionType[], fx.alternatives), fx.weights, {})
    const tol = fx.expected.tolerance
    it('D+ matches', () => expectClose(step(res.steps, 'topsis.distanceBest').vector!, fx.expected.d_plus, tol))
    it('D- matches', () => expectClose(step(res.steps, 'topsis.distanceWorst').vector!, fx.expected.d_minus, tol))
    it('closeness matches', () => expectClose(res.scores, fx.expected.closeness, tol))
    it('ranking matches', () => {
      expect(res.order).toBe('desc')
      expect(res.ranking).toEqual(fx.expected.ranking)
    })
  })
}

describe('TOPSIS: published normalized matrix, problem f', () => {
  it('r = (0.183, 0.365, 0.913 | 0.456, 0.570, 0.684)', () => {
    const res = topsis.compute(makeProblem(f.matrix, f.types as CriterionType[]), f.weights, {})
    expectClose(step(res.steps, 'topsis.normalized').matrix!, [[0.183, 0.456], [0.365, 0.57], [0.913, 0.684]], 5e-4)
  })
})

describe('CRITIC -> TOPSIS: parity with the legacy Python modules (xlsx matrix)', () => {
  const p = makeProblem(legacy.matrix, legacy.types as CriterionType[])
  const w = critic.compute(p, {}).weights
  const res = topsis.compute(p, w, {})
  const e = legacy.expected
  const tol = e.tolerance
  it('weights', () => expectClose(w, e.weights, tol))
  it('normalized', () => expectClose(step(res.steps, 'topsis.normalized').matrix!, e.normalized, tol))
  it('weighted', () => expectClose(step(res.steps, 'topsis.weighted').matrix!, e.weighted, tol))
  it('A+ / A-', () => {
    expectClose(step(res.steps, 'topsis.idealBest').vector!, e.idealBest, tol)
    expectClose(step(res.steps, 'topsis.idealWorst').vector!, e.idealWorst, tol)
  })
  it('distances', () => {
    expectClose(step(res.steps, 'topsis.distanceBest').vector!, e.distanceBest, tol)
    expectClose(step(res.steps, 'topsis.distanceWorst').vector!, e.distanceWorst, tol)
  })
  it('closeness and ranking', () => {
    expectClose(res.scores, e.closeness, tol)
    expect(res.ranking).toEqual(e.ranking)
  })
})

describe('TOPSIS: edge cases', () => {
  it('cost criterion: the lowest value wins', () => {
    const res = topsis.compute(makeProblem([[10, 5], [20, 5], [30, 5]], ['cost', 'benefit']), [0.5, 0.5], {})
    expect(res.ranking).toEqual([1, 2, 3])
    const benefit = topsis.compute(makeProblem([[10, 5], [20, 5], [30, 5]], ['benefit', 'benefit']), [0.5, 0.5], {})
    expect(benefit.ranking).toEqual([3, 2, 1])
  })

  it('identical alternatives share a rank (competition ranking)', () => {
    const res = topsis.compute(makeProblem([[3, 4], [3, 4], [1, 9], [5, 1]], ['benefit', 'cost']), [0.6, 0.4], {})
    expect(res.ranking[0]).toBe(res.ranking[1])
    const ranks = [...res.ranking].sort((a, b) => a - b)
    // shared rank skips the next one: e.g. 1, 1, 3, 4 or 1, 2, 2, 4
    expect(new Set(ranks).size).toBe(3)
    expect(Math.max(...ranks)).toBe(4)
  })

  it('all alternatives identical: every closeness 0.5 and rank 1, not silently 0', () => {
    const res = topsis.compute(makeProblem([[2, 3], [2, 3], [2, 3]], ['benefit', 'cost']), [0.5, 0.5], {})
    expect(res.scores).toEqual([0.5, 0.5, 0.5])
    expect(res.ranking).toEqual([1, 1, 1])
    expect(res.warnings?.map((w) => w.code)).toContain('topsis.zero-distance')
  })

  it('constant column contributes nothing (fine) and all-zero column is guarded', () => {
    const res = topsis.compute(makeProblem([[0, 1, 4], [0, 2, 4], [0, 3, 4]], ['benefit', 'benefit', 'cost']), [0.2, 0.5, 0.3], {})
    expect(res.scores.every(Number.isFinite)).toBe(true)
    expect(res.ranking).toEqual([3, 2, 1])
    expect(res.warnings).toContainEqual({ code: 'topsis.zero-column', col: 0 })
    const nearAndNeg = topsis.compute(makeProblem([[-2, 1], [3, 1 + 1e-10], [4, 1]], ['benefit', 'benefit']), [0.5, 0.5], {})
    expect(nearAndNeg.warnings).toContainEqual({ code: 'topsis.negative-values', col: 0 })
    expect(nearAndNeg.warnings).toContainEqual({ code: 'topsis.near-constant-column', col: 1 })
  })

  it('single alternative is rejected', () => {
    expect(() => topsis.compute(makeProblem([[1, 2]], ['benefit', 'cost']), [0.5, 0.5], {})).toThrow(ProblemValidationError)
  })

  it('invalid weights are rejected', () => {
    const p = makeProblem([[1, 2], [3, 4]], ['benefit', 'cost'])
    expect(() => topsis.compute(p, [0.7, 0.7], {})).toThrow(ProblemValidationError)
    expect(() => topsis.compute(p, [1.5, -0.5], {})).toThrow(ProblemValidationError)
    expect(() => topsis.compute(p, [1], {})).toThrow(ProblemValidationError)
  })
})
