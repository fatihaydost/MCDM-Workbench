import { describe, expect, it } from 'vitest'
import { merec, ProblemValidationError, type CriterionType, type WeightingResult } from '../src/core'
import ill from './fixtures/merec-keshavarz2021-illustrative.json'
import comp from './fixtures/merec-keshavarz2021-comparative.json'
import dua2 from './fixtures/merec-dua2024-case2.json'
import dua3 from './fixtures/merec-dua2024-case3.json'
import { expectClose, makeProblem, step } from './helpers'

const codes = (r: WeightingResult) => (r.warnings ?? []).map((w) => w.code)
const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const run = (matrix: number[][], types: CriterionType[]) => merec.compute(makeProblem(matrix, types), {})
const illTypes = ill.types as CriterionType[]
const tol = ill.expected.tolerance

describe('MEREC: Keshavarz-Ghorabaee et al. 2021 illustrative example (Symmetry 13:525, Sec. 4.1, Tables 2-4)', () => {
  const res = run(ill.matrix, illTypes)

  it('matches the published weights (Step 6) to 5e-5', () => expectClose(res.weights, ill.expected.weights, tol.weights))
  it('normalized matrix (Table 3): benefit min/x, cost x/max, so the best value is the smallest', () => {
    expectClose(step(res.steps, 'merec.normalized').matrix!, ill.expected.normalized, tol.normalized)
  })
  it('S (Step 3), S\' (Table 4) and E (Step 5) within the 2-d.p. printing tolerance', () => {
    expectClose(step(res.steps, 'merec.performance').vector!, ill.expected.S, tol.S)
    expectClose(step(res.steps, 'merec.performanceRemoved').matrix!, ill.expected.S_removed, tol.S_removed)
    expectClose(step(res.steps, 'merec.removalEffect').vector!, ill.expected.E_printed, tol.E)
    expectClose(step(res.steps, 'merec.removalEffect').vector!, ill.expected.E_full_precision_recomputed, 1e-5)
  })
  it('E equals the plain sum of S - S\' (the log1p form only removes cancellation)', () => {
    const s = step(res.steps, 'merec.performance').vector!
    const sr = step(res.steps, 'merec.performanceRemoved').matrix!
    const naive = ill.criteria.map((_, j) => sumOf(s.map((si, i) => si - sr[i]![j]!)))
    expectClose(step(res.steps, 'merec.removalEffect').vector!, naive, 1e-12)
  })
  it('C1 takes 0.575 > 0.5: dominant-weight warning on C1', () => {
    expect(res.warnings).toEqual([{ code: 'merec.dominant-weight', col: 0 }])
  })
  it('WASPAS-style normalization (x/max for benefit) is not used: it would give w1 = 0.463', () => {
    expect(Math.abs(res.weights[0]! - 0.463)).toBeGreaterThan(0.1)
    expect(step(res.steps, 'merec.normalized').matrix![0]![0]).toBeCloseTo(5 / 450, 12)
  })
})

describe('MEREC: published weights from three more tables', () => {
  for (const f of [comp, dua2, dua3]) {
    it(`${f.id} (${f.source.split(',')[0]})`, () => {
      const t = f.expected.tolerance
      expectClose(run(f.matrix, f.types as CriterionType[]).weights, f.expected.weights, t)
    })
  }
})

describe('MEREC: properties and edge cases', () => {
  const base = run(ill.matrix, illTypes).weights

  it('x = 0 and x < 0 are blocked cell by cell with non-positive-value', () => {
    for (const bad of [0, -3]) {
      const matrix = ill.matrix.map((row) => [...row])
      matrix[1]![2] = bad
      matrix[4]![0] = bad
      try {
        run(matrix, illTypes)
        expect.unreachable()
      } catch (e) {
        expect(e).toBeInstanceOf(ProblemValidationError)
        const issues = (e as ProblemValidationError).issues.filter((x) => x.code === 'non-positive-value')
        expect(issues.map((x) => [x.row, x.col, x.value])).toEqual([[1, 2, bad], [4, 0, bad]])
      }
    }
  })
  it('a constant column gets weight 0 exactly and a warning (card: [[1,5,3],[2,5,1],[4,5,2]])', () => {
    const res = run([[1, 5, 3], [2, 5, 1], [4, 5, 2]], ['benefit', 'benefit', 'benefit'])
    expect(res.weights[1]).toBe(0)
    expect(step(res.steps, 'merec.removalEffect').vector![1]).toBe(0)
    expect(res.warnings).toContainEqual({ code: 'merec.constant-column', col: 1 })
    expect(res.diagnostics?.constantColumns).toBe(1)
  })
  it('every column constant: equal weights 1/n and a warning', () => {
    const res = run([[1, 2], [1, 2]], ['benefit', 'cost'])
    expect(res.weights).toEqual([0.5, 0.5])
    expect(codes(res)).toContain('merec.all-constant-equal-weights')
    expect(res.diagnostics?.allConstant).toBe(1)
  })
  it('0.3 vs 0.1 + 0.2 counts as the same value (shared isConstant tolerance): all constant, 1/n', () => {
    // The card's exact-equality rule would see a one-ulp column here; owner decision 5 uses isConstant instead.
    const res = run([[0.3, 1], [0.1 + 0.2, 1]], ['benefit', 'benefit'])
    expect(res.weights).toEqual([0.5, 0.5])
    expect(codes(res)).toContain('merec.all-constant-equal-weights')
  })
  it('a near-but-not-constant column gives finite weights summing to 1, without the all-constant warning', () => {
    const res = run([[0.3, 1, 2], [0.3 * (1 + 5e-10), 1, 2]], ['benefit', 'cost', 'benefit'])
    expect(res.weights.every(Number.isFinite)).toBe(true)
    expect(Math.abs(sumOf(res.weights) - 1)).toBeLessThan(1e-15)
    expect(res.weights).toEqual([1, 0, 0])
    expect(codes(res)).not.toContain('merec.all-constant-equal-weights')
    expect(res.warnings).toContainEqual({ code: 'merec.near-constant-column', col: 0 })
  })
  it('multiplying a column by 1000 leaves the weights unchanged', () => {
    expectClose(run(ill.matrix.map((row) => row.map((x, j) => (j === 1 ? x * 1000 : x))), illTypes).weights, base, 1e-12)
  })
  it('adding a constant changes the weights (ratio scale only): C1 + 100 moves w1 from 0.575 to 0.283', () => {
    const shifted = run(ill.matrix.map((row) => row.map((x, j) => (j === 0 ? x + 100 : x))), illTypes).weights
    expectClose([shifted[0]!, shifted[2]!], [0.283, 0.677], 5e-4)
  })
  it('weights sum to 1', () => expect(Math.abs(sumOf(base) - 1)).toBeLessThan(1e-15))
  it('invalid input throws ProblemValidationError', () => {
    expect(() => run([[1, Number.NaN], [2, 3]], ['benefit', 'benefit'])).toThrow(ProblemValidationError)
  })
})
