import { describe, expect, it } from 'vitest'
import { critic, ProblemValidationError, sd, type CriterionType, type WeightingResult } from '../src/core'
import diak from './fixtures/sd-diakoulaki1995.json'
import muk from './fixtures/sd-mukhametzyanov2021.json'
import { expectClose, makeProblem, step } from './helpers'

const codes = (r: WeightingResult) => (r.warnings ?? []).map((w) => w.code)
const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const mukTypes = muk.types as CriterionType[]
const dm1 = muk.matrices['DM-1']
const dm2 = muk.matrices['DM-2']
const dms: Record<string, number[][]> = {
  'DM-1': dm1,
  'DM-2': dm2,
  'DM-3': [dm2[0]!, ...dm1.slice(1)],
  'DM-12': [...dm1, ...dm2],
}

describe('SD: Diakoulaki, Mavrotas & Papayannakis 1995 (Computers & OR 22:763, Table 1, Sec. 5, Table 3)', () => {
  const res = sd.compute(makeProblem(diak.matrix, diak.types as CriterionType[], diak.alternatives), {})

  it('matches the published weights (Table 3, row SD) to 5e-4', () => {
    expectClose(res.weights, diak.published.weights, diak.expected.tolerance_vs_published)
  })
  it('matches the recomputed weights to 1e-4', () => expectClose(res.weights, diak.expected.weights, 1e-4))
  it('shows the sample sigma; the paper prints the population value (1/m), which gives the same weights', () => {
    const sigma = step(res.steps, 'sd.sigma').vector!
    expectClose(sigma, diak.expected.sigma_sample, 1e-4)
    const m = diak.matrix.length
    expectClose(sigma.map((s) => s * Math.sqrt((m - 1) / m)), diak.published.sigma_population, 5e-4)
  })
  it('handles negative values (profitability -6.1, -34.6) and emits no warning', () => {
    expect(res.warnings).toEqual([])
    expect(step(res.steps, 'sd.sigmaTotal').scalar).toBeCloseTo(sumOf(step(res.steps, 'sd.sigma').vector!), 15)
  })
})

describe('SD: Mukhametzyanov 2021 (DMAME 4:76, Table 1, Table 2 SD rows, Table 4 Max-Min)', () => {
  for (const [id, matrix] of Object.entries(dms)) {
    it(`${id} weights to 5e-4`, () => {
      const expected = muk.expected[id as keyof typeof muk.expected] as { weights: number[] }
      expectClose(sd.compute(makeProblem(matrix, mukTypes), {}).weights, expected.weights, muk.expected.tolerance)
    })
  }
  it('DM-1 sample sigma (Table 4, Max-Min)', () => {
    const res = sd.compute(makeProblem(dm1, mukTypes), {})
    expectClose(step(res.steps, 'sd.sigma').vector!, muk.expected['DM-1'].sigma_sample, muk.expected.tolerance)
  })
  it('normalized matrix is in [0, 1] with 1 = best (cost C2: the lowest price is 1)', () => {
    const r = step(sd.compute(makeProblem(dm1, mukTypes), {}).steps, 'sd.normalized').matrix!
    expect(r.flat().every((x) => x >= 0 && x <= 1)).toBe(true)
    expect(r[3]![1]).toBe(1) // A4 price 4200 is the minimum
  })
})

describe('SD: properties', () => {
  const base = sd.compute(makeProblem(dm1, mukTypes), {}).weights

  it('criterion types do not change the weights', () => {
    const flipped = mukTypes.map((t) => (t === 'cost' ? 'benefit' : 'cost'))
    expectClose(sd.compute(makeProblem(dm1, flipped), {}).weights, base, 1e-15)
  })
  it('an affine transform per column (positive scale) leaves the weights unchanged', () => {
    const scaled = dm1.map((row) => row.map((x, j) => x * (1.5 + j) + 100 * (j - 2)))
    expectClose(sd.compute(makeProblem(scaled, mukTypes), {}).weights, base, 1e-14)
  })
  it('a constant column gets weight 0 and a warning', () => {
    const res = sd.compute(makeProblem(dm1.map((row) => [row[0]!, row[1]!, 150, row[3]!, row[4]!]), mukTypes), {})
    expect(res.weights[2]).toBe(0)
    // Card, Pitfalls, prints 3 d.p.; w4 = 0.2315 there reads 0.232, hence 1e-3.
    expectClose(res.weights, [0.265, 0.256, 0, 0.232, 0.247], 1e-3)
    expect(res.warnings).toContainEqual({ code: 'sd.constant-column', col: 2 })
    expect(res.diagnostics?.constantColumns).toBe(1)
  })
  it('every column constant: equal weights 1/n and a warning', () => {
    const res = sd.compute(makeProblem([[1, 2, 3], [1, 2, 3], [1, 2, 3]], ['benefit', 'cost', 'benefit']), {})
    expect(res.weights).toEqual([1 / 3, 1 / 3, 1 / 3])
    expect(codes(res)).toContain('sd.all-constant-equal-weights')
    expect(res.diagnostics?.allConstant).toBe(1)
  })
  it('m = 2: equal weights over the non-constant columns and a warning', () => {
    const two = [dm1[0]!, [dm1[1]![0]!, dm1[1]![1]!, dm1[0]![2]!, dm1[1]![3]!, dm1[1]![4]!]]
    const res = sd.compute(makeProblem(two, mukTypes), {})
    expectClose(res.weights, [0.25, 0.25, 0, 0.25, 0.25], 1e-15)
    expect(codes(res)).toContain('sd.two-alternatives')
    expectClose(sd.compute(makeProblem(dm1.slice(0, 2), mukTypes), {}).weights, [0.2, 0.2, 0.2, 0.2, 0.2], 1e-15)
  })
  it('weights sum to 1', () => expect(Math.abs(sumOf(base) - 1)).toBeLessThan(1e-15))
  it('invalid input throws ProblemValidationError', () => {
    expect(() => sd.compute(makeProblem([[1, Number.NaN], [2, 3]], ['benefit', 'benefit']), {})).toThrow(ProblemValidationError)
  })
})

describe('near-constant column (owner decision 6): warn, weight unchanged', () => {
  const noisy = dm1.map((row, i) => [row[0]!, row[1]!, 150 + i * 1e-9, row[3]!, row[4]!])

  it('SD: C3 = 150 + i * 1e-9 on DM-1 warns and keeps its full weight (card: 0.2024)', () => {
    const res = sd.compute(makeProblem(noisy, mukTypes), {})
    expect(res.warnings).toContainEqual({ code: 'sd.near-constant-column', col: 2 })
    expect(codes(res)).not.toContain('sd.constant-column')
    expectClose(res.weights, [0.2115, 0.2045, 0.2024, 0.1846, 0.197], 1e-4)
  })
  it('CRITIC: the same column warns too', () => {
    const res = critic.compute(makeProblem(noisy, mukTypes), {})
    expect(res.warnings).toContainEqual({ code: 'critic.near-constant-column', col: 2 })
    expect(res.weights[2]).toBeGreaterThan(0)
  })
  it('normal data and the published fixtures do not warn', () => {
    for (const matrix of Object.values(dms)) {
      expect(codes(sd.compute(makeProblem(matrix, mukTypes), {}))).not.toContain('sd.near-constant-column')
      expect(codes(critic.compute(makeProblem(matrix, mukTypes), {}))).not.toContain('critic.near-constant-column')
    }
    expect(codes(sd.compute(makeProblem(diak.matrix, diak.types as CriterionType[]), {}))).toEqual([])
  })
})
