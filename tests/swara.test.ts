import { describe, expect, it } from 'vitest'
import {
  getMethod,
  getWeightingMethod,
  ProblemValidationError,
  swara,
  SWARA_STEP_RATIOS,
  swaraWeights,
  type Problem,
  type Step,
} from '../src/core'
import fixture from './fixtures/swara-kersuliene2010.json'

function fixtureProblem(): Problem {
  return {
    alternatives: fixture.alternatives,
    criteria: fixture.criteria.map((name, j) => ({
      name,
      type: fixture.types[j] as 'benefit' | 'cost',
    })),
    matrix: fixture.matrix,
  }
}

function vec(steps: readonly Step[], key: string): number[] {
  const found = steps.find((st) => st.key === key)
  if (!found || !('vector' in found) || !found.vector) throw new Error(`Missing vector step ${key}`)
  return found.vector
}

function expectCloseArray(actual: readonly number[], expected: readonly number[], tol: number) {
  expect(actual.length).toBe(expected.length)
  for (let i = 0; i < expected.length; i++) {
    expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThanOrEqual(tol)
  }
}

describe('SWARA weighting (Keršulienė, Zavadskas & Turskis 2010)', () => {
  it('is registered in the core method registry', () => {
    expect(getMethod('swara')).toBe(swara)
    expect(getWeightingMethod('swara')).toBe(swara)
    expect(swara.id).toBe('swara')
    expect(swara.kind).toBe('weighting')
  })

  it('reproduces Keršulienė et al. (2010) Table 1 exact and published values', () => {
    const res = swara.compute(fixtureProblem(), { s: fixture.s })

    expect(res.warnings).toEqual([])
    expect(res.steps.map((st) => st.key)).toEqual(['swara.s', 'swara.k', 'swara.q', 'swara.weights'])
    for (const st of res.steps) {
      expect('vector' in st && st.axes === 'criteria').toBe(true)
    }

    const sStep = vec(res.steps, 'swara.s')
    const kStep = vec(res.steps, 'swara.k')
    const qStep = vec(res.steps, 'swara.q')
    const wStep = vec(res.steps, 'swara.weights')

    expectCloseArray(sStep, fixture.expected.s, fixture.expected.tolerance)
    expectCloseArray(kStep, fixture.expected.k, fixture.expected.tolerance)
    expectCloseArray(qStep, fixture.expected.q, fixture.expected.tolerance)
    expectCloseArray(wStep, fixture.expected.weights, fixture.expected.tolerance)
    expectCloseArray(res.weights, fixture.expected.weights, fixture.expected.tolerance)

    // Compare against 2-decimal numbers printed in Table 1 (p. 252).
    expectCloseArray(qStep, fixture.published.q, fixture.expected.tolerance_vs_published)
    expectCloseArray(res.weights, fixture.published.weights, fixture.expected.tolerance_vs_published)
    expect(qStep.map((v) => Number(v.toFixed(2)))).toEqual(fixture.published.q)
    expect(res.weights.map((v) => Number(v.toFixed(2)))).toEqual(fixture.published.weights)

    const sum = res.weights.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 12)
  })

  it('reproduces Aytaç Adalı & Tuş Işık (2017) Table 4 with non-identity criterion order', () => {
    const adali = fixture.adali_2017_table4
    const res = swara.compute(fixtureProblem(), {
      s: adali.s,
      order: adali.order,
    })

    expectCloseArray(res.weights, adali.published_weights, adali.tolerance_vs_published)
    expect(res.weights.map((w) => Number(w.toFixed(3)))).toEqual(adali.published_weights)

    // Most important criterion is order[0] = 0 (C1), second is order[1] = 5 (C6).
    const sStep = vec(res.steps, 'swara.s')
    const qStep = vec(res.steps, 'swara.q')
    expect(sStep[0]).toBe(0)
    expect(sStep[5]).toBe(0.1)
    expect(qStep[0]).toBe(1)
    expect(qStep[5]).toBeCloseTo(1 / 1.1, 12)
  })

  it('supports gentle, moderate (default), and steep stepRatio presets', () => {
    const p = fixtureProblem()
    const def = swara.compute(p, {})
    const gentle = swara.compute(p, { stepRatio: 'gentle' })
    const moderate = swara.compute(p, { stepRatio: 'moderate' })
    const steep = swara.compute(p, { stepRatio: 'steep' })

    expectCloseArray(def.weights, moderate.weights, 1e-12)

    for (const r of [gentle, moderate, steep]) {
      expect(r.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
      for (let j = 1; j < r.weights.length; j++) {
        expect(r.weights[j - 1]!).toBeGreaterThan(r.weights[j]!)
      }
    }

    // Steeper step-down ratio concentrates more weight on the top-ranked criterion.
    expect(steep.weights[0]!).toBeGreaterThan(moderate.weights[0]!)
    expect(moderate.weights[0]!).toBeGreaterThan(gentle.weights[0]!)

    // Consecutive weight ratio w_{j-1} / w_j equals 1 + s.
    for (const [key, res] of [
      ['gentle', gentle],
      ['moderate', moderate],
      ['steep', steep],
    ] as const) {
      const ratio = 1 + SWARA_STEP_RATIOS[key]
      for (let j = 1; j < res.weights.length; j++) {
        expect(res.weights[j - 1]! / res.weights[j]!).toBeCloseTo(ratio, 12)
      }
    }
  })

  it('permutes weights according to custom order', () => {
    const order = [3, 1, 4, 0, 5, 2]
    const base = swaraWeights(6, [0, 0.15, 0.04, 0.29, 0.02, 0.04])
    const permuted = swaraWeights(6, [0, 0.15, 0.04, 0.29, 0.02, 0.04], order)

    for (let rankIdx = 0; rankIdx < 6; rankIdx++) {
      const c = order[rankIdx]!
      expect(permuted.s[c]).toBeCloseTo(base.s[rankIdx]!, 12)
      expect(permuted.k[c]).toBeCloseTo(base.k[rankIdx]!, 12)
      expect(permuted.q[c]).toBeCloseTo(base.q[rankIdx]!, 12)
      expect(permuted.weights[c]).toBeCloseTo(base.weights[rankIdx]!, 12)
    }
  })

  it('yields equal weights 1/n when all s_j = 0', () => {
    const n = 5
    const { s, k, q, weights } = swaraWeights(n, [0, 0, 0, 0, 0])
    expect(s).toEqual([0, 0, 0, 0, 0])
    expect(k).toEqual([1, 1, 1, 1, 1])
    expect(q).toEqual([1, 1, 1, 1, 1])
    expectCloseArray(weights, [0.2, 0.2, 0.2, 0.2, 0.2], 1e-12)
  })

  it('throws RangeError on negative s_j or invalid inputs', () => {
    const p = fixtureProblem()
    expect(() => swaraWeights(6, [0, -0.05, 0.1, 0.1, 0.1, 0.1])).toThrow(RangeError)
    expect(() => swaraWeights(6, [-0.1, 0.1, 0.1, 0.1, 0.1])).toThrow(RangeError)
    expect(() => swaraWeights(6, -0.15)).toThrow(RangeError)
    expect(() => swaraWeights(6, [0, Number.NaN, 0.1, 0.1, 0.1, 0.1])).toThrow(RangeError)
    expect(() => swaraWeights(0)).toThrow(RangeError)
    expect(() => swaraWeights(6, [0.1, 0.2])).toThrow(RangeError)
    expect(() => swaraWeights(4, 0.15, [0, 1, 1, 3])).toThrow(RangeError)
    expect(() => swara.compute(p, { s: [0, -0.1, 0.04, 0.29, 0.02, 0.04] })).toThrow(RangeError)
  })

  it('throws ProblemValidationError on an invalid problem', () => {
    const bad: Problem = {
      alternatives: ['OnlyOne'],
      criteria: [{ name: 'C1', type: 'benefit' }],
      matrix: [[1]],
    }
    expect(() => swara.compute(bad, {})).toThrow(ProblemValidationError)
  })
})
