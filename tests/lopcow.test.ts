import { describe, expect, it } from 'vitest'
import { lopcow, ProblemValidationError, type CriterionType } from '../src/core'
import fixture from './fixtures/lopcow-keles2023.json'
import { expectClose, makeProblem, step } from './helpers'

const types = fixture.types as CriterionType[]
const qliTypes = fixture.qli.types as CriterionType[]
const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const run = (matrix: number[][], cTypes: CriterionType[]) => lopcow.compute(makeProblem(matrix, cTypes), {})

describe('LOPCOW: Keles 2023 Table 6 (GPCI, 15 cities x 6 benefit criteria)', () => {
  const res = run(fixture.matrix, types)
  const tol = fixture.expected.tolerance

  it('matches the published weights to 5e-4 (half a unit of the printed 3rd decimal)', () => {
    expectClose(res.weights, fixture.published.weights, fixture.expected.tolerance_vs_published)
  })
  it('matches the full-precision recomputed RMS, sample SD, PV, and weights', () => {
    expectClose(step(res.steps, 'lopcow.rms').vector!, fixture.expected.rms, 1e-5)
    expectClose(step(res.steps, 'lopcow.stdDev').vector!, fixture.expected.stdDev, 1e-5)
    expectClose(step(res.steps, 'lopcow.pv').vector!, fixture.expected.pv, 1e-5)
    expectClose(res.weights, fixture.expected.weights, tol)
  })
  it('population SD (1/m) would miss Table 6 w1 = 0.241 by 0.0045 (giving 0.2365)', () => {
    expect(Math.abs(res.weights[0]! - 0.241)).toBeLessThan(5e-4)
    expect(Math.abs(res.weights[0]! - 0.2365)).toBeGreaterThan(3e-3)
  })
  it('emits normalized, rms, stdDev, pv, and weights steps in order', () => {
    expect(res.steps.map((s) => s.key)).toEqual([
      'lopcow.normalized',
      'lopcow.rms',
      'lopcow.stdDev',
      'lopcow.pv',
      'lopcow.weights',
    ])
  })
})

describe('LOPCOW: Keles 2023 Tables 7 and 8 (QLI 15x8 and combined 15x14)', () => {
  it('matches Table 7 (3 benefit + 5 cost criteria) published and full-precision weights', () => {
    const res = run(fixture.qli.matrix, qliTypes)
    expectClose(res.weights, fixture.qli.published.weights, fixture.qli.expected.tolerance)
    expectClose(step(res.steps, 'lopcow.rms').vector!, fixture.qli.expected.rms, 1e-5)
    expectClose(step(res.steps, 'lopcow.stdDev').vector!, fixture.qli.expected.stdDev, 1e-5)
    expectClose(step(res.steps, 'lopcow.pv').vector!, fixture.qli.expected.pv, 1e-5)
    expectClose(res.weights, fixture.qli.expected.weights, 1e-5)
  })

  it('matches Table 8 (combined 15x14 matrix) published and full-precision weights', () => {
    const combinedMatrix = fixture.matrix.map((row, i) => [...row, ...fixture.qli.matrix[i]!])
    const combinedTypes: CriterionType[] = [...types, ...qliTypes]
    const res = run(combinedMatrix, combinedTypes)
    expectClose(res.weights, fixture.combined.published.weights, fixture.combined.expected.tolerance)
    expectClose(res.weights, fixture.combined.expected.weights, 1e-5)
  })
})

describe('LOPCOW: properties and edge cases', () => {
  const base = run(fixture.matrix, types).weights

  it('weights are in [0, 1] and sum to 1', () => {
    for (const w of base) {
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
    }
    expect(Math.abs(sumOf(base) - 1)).toBeLessThan(1e-15)
  })

  it('accepts negative and zero raw values without validation errors', () => {
    const res = run(
      [
        [-25, 0, 10],
        [0, 5, 20],
        [15, 12, 35],
        [40, 30, 80],
      ],
      ['benefit', 'benefit', 'cost'],
    )
    expect(res.weights.every((w) => Number.isFinite(w) && w > 0)).toBe(true)
    expect(Math.abs(sumOf(res.weights) - 1)).toBeLessThan(1e-15)
  })

  it('is invariant under positive linear rescaling and translation per column', () => {
    const scaled = fixture.matrix.map((row) => row.map((x, j) => x * (j + 2) - 50 * (j + 1)))
    expectClose(run(scaled, types).weights, base, 1e-12)
  })

  it('unlike SD and CRITIC, flipping benefit/cost preserves sigma_j but changes the mean r_j, RMS_j, and the weights', () => {
    const flipped = types.map((t, j) => (j === 2 ? (t === 'benefit' ? 'cost' : 'benefit') : t))
    const baseRes = run(fixture.matrix, types)
    const res = run(fixture.matrix, flipped)
    expect(step(res.steps, 'lopcow.stdDev').vector![2]).toBeCloseTo(step(baseRes.steps, 'lopcow.stdDev').vector![2]!, 12)
    expect(Math.abs(step(res.steps, 'lopcow.rms').vector![2]! - step(baseRes.steps, 'lopcow.rms').vector![2]!)).toBeGreaterThan(0.2)
    expect(Math.abs(res.weights[2]! - base[2]!)).toBeGreaterThan(0.1)
  })

  it('gives a constant column PV = 0, weight = 0, and a constant-column warning', () => {
    const m = fixture.matrix.map((row) => [row[0]!, 42, row[2]!])
    const res = run(m, ['benefit', 'benefit', 'benefit'])
    expect(step(res.steps, 'lopcow.pv').vector![1]).toBe(0)
    expect(res.weights[1]).toBe(0)
    expect(Math.abs(sumOf(res.weights) - 1)).toBeLessThan(1e-15)
    expect(res.warnings).toContainEqual({ code: 'lopcow.constant-column', col: 1 })
    expect(res.diagnostics?.constantColumns).toBe(1)
  })

  it('returns equal weights 1/n and a warning when every column is constant', () => {
    const res = run(
      [
        [3, 7, -1],
        [3, 7, -1],
        [3, 7, -1],
      ],
      ['benefit', 'cost', 'benefit'],
    )
    expectClose(res.weights, [1 / 3, 1 / 3, 1 / 3], 1e-15)
    expect(res.warnings?.map((w) => w.code)).toContain('lopcow.all-constant-equal-weights')
    expect(res.diagnostics?.allConstant).toBe(1)
  })

  it('warns on a near-constant column (relative range < 1e-9)', () => {
    const res = run(
      [
        [1, 10],
        [1 + 1e-11, 20],
        [1 + 2e-11, 35],
      ],
      ['benefit', 'benefit'],
    )
    expect(res.warnings).toContainEqual({ code: 'lopcow.near-constant-column', col: 0 })
  })

  it('with 2 alternatives, RMS = sigma = 1/sqrt(2) on every varying column, so PV = 0 and varying columns share weight equally while constant columns keep 0', () => {
    const res = run(
      [
        [10, 5, 100],
        [20, 5, 300],
      ],
      ['benefit', 'benefit', 'cost'],
    )
    expectClose(step(res.steps, 'lopcow.pv').vector!, [0, 0, 0], 1e-15)
    expectClose(res.weights, [0.5, 0, 0.5], 1e-15)
    expect(res.warnings).toContainEqual({ code: 'lopcow.two-alternatives' })
    expect(res.warnings).toContainEqual({ code: 'lopcow.constant-column', col: 1 })

    const oneVarying = run(
      [
        [10, 5],
        [20, 5],
      ],
      ['benefit', 'benefit'],
    )
    expect(oneVarying.weights).toEqual([1, 0])
    expect(oneVarying.warnings?.map((w) => w.code)).not.toContain('lopcow.two-alternatives')
  })

  it('gives PV = 0, weight = 0, and lopcow.zero-pv-column warning to a single-best-alternative column [1, 0, ..., 0] where RMS = sigma = 1/sqrt(m)', () => {
    for (const m of [3, 5, 7]) {
      const rows = Array.from({ length: m }, (_, i) => [i === 0 ? 10 : 0, i + 1])
      const res = run(rows, ['benefit', 'benefit'])
      expect(step(res.steps, 'lopcow.pv').vector![0]).toBe(0)
      expect(res.weights).toEqual([0, 1])
      expect(res.warnings).toContainEqual({ code: 'lopcow.zero-pv-column', col: 0 })
    }

    // When all varying columns are single-winner (total PV === 0), they share weight equally (1 / varying) and emit zero-pv-column
    const allZeroPv = run(
      [
        [10, 0, 5],
        [0, 20, 5],
        [0, 0, 5],
      ],
      ['benefit', 'benefit', 'benefit'],
    )
    expect(allZeroPv.weights).toEqual([0.5, 0.5, 0])
    expect(allZeroPv.warnings).toContainEqual({ code: 'lopcow.zero-pv-column', col: 0 })
    expect(allZeroPv.warnings).toContainEqual({ code: 'lopcow.zero-pv-column', col: 1 })
  })

  it('invalid input throws ProblemValidationError', () => {
    expect(() => run([[1]], ['benefit'])).toThrow(ProblemValidationError)
  })
})
