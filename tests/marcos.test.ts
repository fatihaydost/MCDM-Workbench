import { describe, expect, it } from 'vitest'
import { marcos, ProblemValidationError, saw, type CriterionType } from '../src/core'
import f1 from './fixtures/marcos-stevic-brkovic2020.json'
import f2 from './fixtures/marcos-madenoglu2020.json'
import { expectClose, makeProblem, step } from './helpers'

const vec = (steps: Parameters<typeof step>[0], key: string) => step(steps, key).vector!
const scalar = (steps: Parameters<typeof step>[0], key: string) => step(steps, key).scalar!
function thrown(f: () => unknown) {
  try {
    f()
  } catch (e) {
    if (e instanceof ProblemValidationError) return e.issues.filter((x) => x.severity === 'error').map((x) => x.code)
    throw e
  }
  return []
}

/** A tiny seeded generator, so the random checks are repeatable. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('MARCOS: Stević and Brković 2020 (Logistics 4(1):4, Tables 2-5), the main example', () => {
  const p = makeProblem(f1.matrix, f1.types as CriterionType[])
  const res = marcos.compute(p, f1.weights, {})
  const e = f1.expected
  const tol = e.tolerance_vs_published

  it('reproduces the printed S, K-, f(K) and ranks of Table 5', () => {
    expectClose(vec(res.steps, 'marcos.s'), f1.published.S, tol.S)
    expectClose(vec(res.steps, 'marcos.kMinus'), f1.published.K_minus, tol.K_minus)
    expectClose(res.scores, f1.published.fK, tol.fK)
    expect(res.ranking).toEqual(f1.published.ranking)
    expect(res.order).toBe('desc')
  })
  it('matches the recomputed values to 1e-6', () => {
    expectClose(vec(res.steps, 'marcos.s'), e.S, 1e-6)
    expectClose(res.scores, e.fK, 1e-6)
    expectClose(scalar(res.steps, 'marcos.sAai'), e.S_aai, 1e-6)
    expectClose(scalar(res.steps, 'marcos.sAi'), e.S_ai, 1e-12)
    expectClose(scalar(res.steps, 'marcos.fKMinus'), e.fK_minus, 1e-6)
    expectClose(scalar(res.steps, 'marcos.fKPlus'), e.fK_plus, 1e-6)
    expectClose(res.diagnostics!.c!, e.c, 1e-6)
    expect(res.ranking).toEqual(e.ranking)
  })
  it('with the Figure 2 weights (C3 and C4 swapped), 9 of 23 ranks move: the paper used the Table 4 weights', () => {
    const fig2 = marcos.compute(p, f1.weights_figure2, {})
    expect(fig2.ranking).toEqual(f1.ranking_figure2)
    expect(fig2.ranking.filter((r, i) => r !== f1.published.ranking[i]).length).toBe(9)
  })
  it('emits its steps in order', () => {
    expect(res.steps.map((s) => s.key)).toEqual([
      'marcos.normalized',
      'marcos.weighted',
      'marcos.sAai',
      'marcos.sAi',
      'marcos.s',
      'marcos.kMinus',
      'marcos.kPlus',
      'marcos.fKMinus',
      'marcos.fKPlus',
      'marcos.utility',
    ])
    expect(res.warnings).toEqual([])
  })
})

describe('MARCOS: Madenoğlu 2020 (EBOR 2(2):99, Tables 3, 4, 7), 6 x 16 with three cost criteria', () => {
  const p = makeProblem(f2.matrix, f2.types as CriterionType[], f2.alternatives)
  const res = marcos.compute(p, f2.weights, {})
  const e = f2.expected

  it('reproduces Table 7 at 2 decimals and the recomputed values to 1e-6', () => {
    expectClose(res.scores, f2.published.fK, e.tolerance_vs_published)
    expectClose(vec(res.steps, 'marcos.s'), f2.published.S, e.tolerance_vs_published)
    expectClose(vec(res.steps, 'marcos.kMinus'), f2.published.K_minus, e.tolerance_vs_published)
    expectClose(res.scores, e.fK, 1e-6)
    expectClose(vec(res.steps, 'marcos.kMinus'), e.K_minus, 1e-6)
    expectClose(scalar(res.steps, 'marcos.sAai'), e.S_aai, 1e-6)
    expectClose(res.diagnostics!.c!, e.c, 1e-6)
    expect(res.ranking).toEqual(f2.published.ranking)
  })
})

describe('MARCOS: the same order as SAW (Linear)', () => {
  it('f(K) = c x SAW linearMax score and the same ranks on random problems', () => {
    const next = rng(20261018)
    for (let t = 0; t < 300; t++) {
      const m = 2 + Math.floor(next() * 7)
      const n = 2 + Math.floor(next() * 6)
      const matrix = Array.from({ length: m }, () => Array.from({ length: n }, () => 0.1 + next() * 10))
      const types = Array.from({ length: n }, () => (next() < 0.4 ? 'cost' : 'benefit') as CriterionType)
      const raw = Array.from({ length: n }, () => next() + 0.01)
      const total = raw.reduce((a, b) => a + b, 0)
      const w = raw.map((x) => x / total)
      const p = makeProblem(matrix, types)
      const res = marcos.compute(p, w, {})
      const ref = saw.compute(p, w, { normalization: 'linearMax' })
      const c = res.diagnostics!.c!
      expectClose(res.scores, ref.scores.map((s) => c * s), 1e-12)
      expectClose(vec(res.steps, 'marcos.s'), ref.scores, 0)
      expect(res.ranking).toEqual(ref.ranking)
      expect(scalar(res.steps, 'marcos.sAi')).toBeCloseTo(1, 12)
    }
  })
  it('normalizes exactly as SAW linearMax', () => {
    const p = makeProblem(f2.matrix, f2.types as CriterionType[])
    const ref = saw.compute(p, f2.weights, {})
    expect(step(marcos.compute(p, f2.weights, {}).steps, 'marcos.normalized').matrix).toEqual(step(ref.steps, 'saw.normalizedLinearMax').matrix)
  })
})

describe('MARCOS: edge cases', () => {
  it('all alternatives equal: f(K) = 2/3 for every row, all rank 1', () => {
    const res = marcos.compute(makeProblem([[3, 4], [3, 4], [3, 4]], ['benefit', 'cost']), [0.5, 0.5], {})
    expectClose(res.scores, [2 / 3, 2 / 3, 2 / 3], 1e-15)
    expect(res.ranking).toEqual([1, 1, 1])
  })
  it('a constant column keeps the ranking but changes c', () => {
    const base = [[3, 5], [4, 2], [6, 4]]
    const b = marcos.compute(makeProblem(base.map((r) => [...r, 7]), ['benefit', 'cost', 'benefit']), [0.4, 0.3, 0.3], {})
    const c = marcos.compute(makeProblem(base, ['benefit', 'cost']), [0.4 / 0.7, 0.3 / 0.7], {})
    expect(b.ranking).toEqual(c.ranking)
    expect(b.diagnostics!.c).not.toBeCloseTo(c.diagnostics!.c!, 6)
  })
  it('blocks zero and negative values and a single alternative', () => {
    expect(thrown(() => marcos.compute(makeProblem([[1, 0], [2, 3]], ['benefit', 'cost']), [0.5, 0.5], {}))).toEqual(['non-positive-value'])
    expect(thrown(() => marcos.compute(makeProblem([[-1, 2], [2, 3]], ['benefit', 'cost']), [0.5, 0.5], {}))).toEqual(['non-positive-value'])
    expect(thrown(() => marcos.compute(makeProblem([[1, 2]], ['benefit', 'cost']), [0.5, 0.5], {}))).toContain('too-few-alternatives')
  })
})
