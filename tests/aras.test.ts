import { describe, expect, it } from 'vitest'
import { aras, entropy, ProblemValidationError, saw, type CriterionType } from '../src/core'
import { sweepWeight } from '../src/core/robustness'
import bakir from './fixtures/aras-bakir-atalik2018.json'
import zavadskas from './fixtures/aras-zavadskas-turskis2010.json'
import { expectClose, makeProblem, rankerOf, step } from './helpers'

const sumOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
const vec = (steps: Parameters<typeof step>[0], key: string) => step(steps, key).vector!
/** The issues a call throws with, or [] when it does not throw. */
function thrown(f: () => unknown) {
  try {
    f()
  } catch (e) {
    if (e instanceof ProblemValidationError) return e.issues.filter((x) => x.severity === 'error')
    throw e
  }
  return []
}

const f2 = makeProblem(bakir.matrix, bakir.types as CriterionType[], bakir.alternatives)
const f1 = makeProblem(zavadskas.matrix, zavadskas.types as CriterionType[], zavadskas.alternatives)

describe('ARAS: Bakır and Atalık 2018 (İşletme Araştırmaları Dergisi 10(1):617, Tables 3, 7-11), the main example', () => {
  const res = aras.compute(f2, bakir.weights, {})
  const e = bakir.expected
  const tol = e.tolerance_vs_published

  it('reproduces S₀, S, K and all 11 ranks of Table 11 as published and as recomputed', () => {
    expectClose([step(res.steps, 'aras.optimalRow').vector!], [bakir.published.optimalRow], 1e-12)
    expect(step(res.steps, 'aras.optimalScore').scalar).toBeCloseTo(bakir.published.S0, 6)
    expect(step(res.steps, 'aras.optimalScore').scalar).toBeCloseTo(e.S0, 6)
    expectClose(vec(res.steps, 'aras.optimality'), bakir.published.S, tol.S)
    expectClose(vec(res.steps, 'aras.optimality'), e.S, 1e-6)
    expectClose(res.scores, bakir.published.K, tol.K)
    expectClose(res.scores, e.K, 1e-6)
    expectClose(vec(res.steps, 'aras.utilityDegree'), res.scores, 1e-16)
    expect(res.ranking).toEqual(bakir.published.ranking)
    expect(res.ranking).toEqual(e.ranking)
    expect(res.order).toBe('desc')
  })

  it('reproduces Tables 9 and 10 for rows 1-10, and computes THY (row 11) from its own values rather than reprinting A₀', () => {
    const norm = step(res.steps, 'aras.normalized').matrix!
    const weighted = step(res.steps, 'aras.weighted').matrix!
    expectClose(norm.slice(0, 10), bakir.published.normalized_rows_1_to_10, tol.normalized)
    expectClose(weighted.slice(0, 10), bakir.published.weighted_rows_1_to_10, tol.weighted)
    // THY's weighted row sums to Table 11's printed S₁₁ = 0.085888 (not S₀ = 0.099651).
    expect(sumOf(weighted[10]!)).toBeCloseTo(bakir.published.S[10]!, 6)
  })

  it('gives the same ranks with Entropy weights computed from the matrix (the paper chain)', () => {
    const w = entropy.compute(f2, {}).weights
    expectClose(w, bakir.weights, 2e-5)
    const chain = aras.compute(f2, w, {})
    expectClose(chain.scores, bakir.published.K, tol.K)
    expect(chain.ranking).toEqual(e.ranking)
  })

  it('emits its steps in order, with extended column sums equal to 1 and diagnostics', () => {
    expect(res.steps.map((s) => s.key)).toEqual([
      'aras.optimalRow',
      'aras.optimalNormalized',
      'aras.normalized',
      'aras.optimalWeighted',
      'aras.weighted',
      'aras.optimalScore',
      'aras.optimality',
      'aras.utilityDegree',
    ])
    expect(res.warnings).toEqual([])
    const a0 = vec(res.steps, 'aras.optimalRow')
    const norm = step(res.steps, 'aras.normalized').matrix!
    for (let j = 0; j < 7; j++) {
      const colTotal = bakir.matrix.reduce((s, r) => s + r[j]!, a0[j]!)
      const xBar0 = a0[j]! / colTotal
      expect(xBar0 + sumOf(norm.map((r) => r[j]!))).toBeCloseTo(1, 14)
    }
    expect(res.diagnostics!.optimalScore).toBeCloseTo(e.S0, 6)
    expect(sumOf(vec(res.steps, 'aras.optimality')) + step(res.steps, 'aras.optimalScore').scalar!).toBeCloseTo(1, 14)
  })
})

describe('ARAS: Zavadskas and Turskis 2010 (TEDE 16(2):159, Tables 1-3)', () => {
  it('Variant A (expert target norms A₀): matches recomputed S₀, S, K and ranks, and matches Table 3 apart from the room 8 illumination typo', () => {
    const res = aras.compute(f1, zavadskas.weights, { optimal: zavadskas.optimal_norms })
    const e = zavadskas.expected_norms
    expect(step(res.steps, 'aras.optimalScore').scalar).toBeCloseTo(e.S0, 6)
    expectClose(vec(res.steps, 'aras.optimality'), e.S, 1e-6)
    expectClose(res.scores, e.K, 1e-6)
    expect(res.ranking).toEqual(e.ranking)
    // Every room except room 8 (index 7) matches the paper's printed S within rounding of column 4.
    for (let i = 0; i < 14; i++) {
      if (i === 7) continue
      expect(vec(res.steps, 'aras.optimality')[i]!).toBeCloseTo(zavadskas.published_norms.S[i]!, 3)
    }
  })

  it('reproduces the paper Table 2 and Table 3 when room 8 illumination is entered as 390 instead of 400', () => {
    const typoMatrix = zavadskas.matrix.map((r, i) => r.map((x, j) => (i === 7 && j === 3 ? 390 : x)))
    const pTypo = makeProblem(typoMatrix, zavadskas.types as CriterionType[], zavadskas.alternatives)
    const res = aras.compute(pTypo, zavadskas.weights, { optimal: zavadskas.optimal_norms })
    const norm = step(res.steps, 'aras.normalized').matrix!
    // In Table 2, x̄₀,₄ = 400 / 4730 = 0.0846 and x̄₈,₄ = 390 / 4730 = 0.0825.
    expect(400 / 4730).toBeCloseTo(0.0846, 4)
    expect(norm[7]![3]!).toBeCloseTo(0.0825, 4)
    expectClose(vec(res.steps, 'aras.optimality'), zavadskas.published_norms.S, 1.5e-4)
    expectClose(res.scores, zavadskas.published_norms.K, 1.5e-3)
    expect(res.ranking).toEqual(zavadskas.published_norms.ranking)
  })

  it('Variant B (default column-best A₀): matches recomputed optimalRow, S₀, S, K and ranks', () => {
    const res = aras.compute(f1, zavadskas.weights, {})
    const e = zavadskas.expected_column_best
    expectClose(vec(res.steps, 'aras.optimalRow'), e.optimalRow, 1e-12)
    expect(step(res.steps, 'aras.optimalScore').scalar).toBeCloseTo(e.S0, 6)
    expectClose(vec(res.steps, 'aras.optimality'), e.S, 1e-6)
    expectClose(res.scores, e.K, 1e-6)
    expect(res.ranking).toEqual(e.ranking)
  })
})

describe('ARAS: Keshavarz Ghorabaee et al. 2015 (Informatica 26(3):435), set 1', () => {
  it('K to 4 decimals as derived in the research card (ranks 1, 2, 6, 10, 7, 8, 3, 4, 5, 9)', async () => {
    const { default: kg } = await import('./fixtures/edas-keshavarz2015.json')
    const t = kg.tenAlternatives
    const w = t.weight_sets_as_printed[0]!
    const res = aras.compute(makeProblem(t.matrix, t.types as CriterionType[]), w.map((x) => x / sumOf(w)), {})
    expectClose(res.scores, [0.9365, 0.8998, 0.6878, 0.5792, 0.6745, 0.6473, 0.8838, 0.8547, 0.8396, 0.5845], 5e-5)
    expect(res.ranking).toEqual([1, 2, 6, 10, 7, 8, 3, 4, 5, 9])
  })
})

describe('ARAS properties', () => {
  it('equals SAW (sum) with effective weights w_j / (1 + p_0j)', () => {
    for (const [p, w] of [
      [f2, bakir.weights],
      [f1, zavadskas.weights],
    ] as const) {
      const a = aras.compute(p, [...w], {})
      const s = saw.compute(p, [...w], { normalization: 'sum' })
      const pMat = step(s.steps, 'saw.normalizedSum').matrix!
      const p0 = p.criteria.map((_, j) => Math.max(...pMat.map((r) => r[j]!)))
      const sExpected = pMat.map((r) => sumOf(r.map((pij, j) => (w[j]! * pij) / (1 + p0[j]!))))
      expectClose(vec(a.steps, 'aras.optimality'), sExpected, 1e-15)
    }
  })

  it('can rank differently from SAW (sum) because 1 / (1 + p_0j) dampens concentrated criteria', () => {
    const p = makeProblem(
      [
        [10, 2],
        [4, 9],
        [1, 9],
      ],
      ['benefit', 'benefit'],
    )
    const s = saw.compute(p, [0.5, 0.5], { normalization: 'sum' })
    const a = aras.compute(p, [0.5, 0.5], {})
    expect(s.ranking).toEqual([1, 2, 3])
    expect(a.ranking).toEqual([2, 1, 3])
  })

  it('keeps K in (0, 1] with default column-best A₀, and gives K = 1 when all alternatives are identical', () => {
    const res = aras.compute(f1, zavadskas.weights, {})
    expect(res.scores.every((k) => k > 0 && k <= 1)).toBe(true)
    const eq = aras.compute(makeProblem([[4, 10], [4, 10], [4, 10]], ['benefit', 'cost']), [0.4, 0.6], {})
    expectClose(eq.scores, [1, 1, 1], 1e-15)
    expect(eq.ranking).toEqual([1, 1, 1])
  })

  it('is scale invariant per column (a change of units)', () => {
    const base = aras.compute(f1, zavadskas.weights, {})
    for (let j = 0; j < 6; j++) {
      const scaled = { ...f1, matrix: f1.matrix.map((r) => r.map((x, k) => (k === j ? x * 25.4 : x))) }
      expectClose(aras.compute(scaled, zavadskas.weights, {}).scores, base.scores, 1e-14)
    }
  })

  it('preserves ranking when a constant benefit or cost column is added, while shifting S by w_c / (m + 1)', () => {
    const base = aras.compute(makeProblem([[1, 1], [4, 6], [6, 4]], ['benefit', 'cost']), [0.5, 0.5], {})
    for (const dir of ['benefit', 'cost'] as const) {
      const ext = aras.compute(makeProblem([[1, 1, 5], [4, 6, 5], [6, 4, 5]], ['benefit', 'cost', dir]), [0.25, 0.25, 0.5], {})
      expect(ext.ranking).toEqual(base.ranking)
      const sBase = vec(base.steps, 'aras.optimality')
      const sExt = vec(ext.steps, 'aras.optimality')
      expectClose(
        sExt,
        sBase.map((s) => 0.5 * s + 0.5 / 4),
        1e-15,
      )
    }
  })

  it('runs in the robustness sweep (Bakır and Atalık, weight of criterion 1 from 0 to 1): finite scores everywhere', () => {
    const sw = sweepWeight(f2, bakir.weights, rankerOf(aras), 0, { steps: 20 })
    expect(sw.points.every((pt) => pt.scores.every(Number.isFinite))).toBe(true)
  })

  it('ties share a rank', () => {
    const res = aras.compute(makeProblem([[2, 3], [2, 3], [1, 4]], ['benefit', 'cost']), [0.5, 0.5], {})
    expect(res.ranking).toEqual([1, 1, 3])
  })
})

describe('ARAS validation', () => {
  it.each([0, -3])('blocks a value of %d with non-positive-value at its cell', (v) => {
    const bad = { ...f2, matrix: f2.matrix.map((r, i) => r.map((x, j) => (i === 1 && j === 2 ? v : x))) }
    expect(thrown(() => aras.compute(bad, bakir.weights, {}))).toEqual([
      { code: 'non-positive-value', severity: 'error', row: 1, col: 2, value: v },
    ])
  })

  it('blocks a non-positive or mis-sized custom optimal row without a negative row index', () => {
    const badCell = thrown(() => aras.compute(f1, zavadskas.weights, { optimal: [15, 50, 0, 400, 0.05, 5] }))[0]
    expect(badCell).toEqual({ code: 'non-positive-value', severity: 'error', col: 2, value: 0 })
    expect(badCell?.row).toBeUndefined()
    const badLen = thrown(() => aras.compute(f1, zavadskas.weights, { optimal: [15, 50] }))[0]
    expect(badLen).toEqual({ code: 'row-length-mismatch', severity: 'error', value: 2 })
    expect(badLen?.row).toBeUndefined()
  })

  it('blocks a single alternative and weights that do not sum to 1', () => {
    expect(thrown(() => aras.compute({ ...f2, alternatives: ['A1'], matrix: [f2.matrix[0]!] }, bakir.weights, {})).map((x) => x.code)).toContain(
      'too-few-alternatives',
    )
    expect(thrown(() => aras.compute(f2, [0.3, 0.3, 0.3, 0.3, 0.1, 0.1, 0.1], {})).map((x) => x.code)).toEqual(['weights-sum'])
  })
})
