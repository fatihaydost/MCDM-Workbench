import { describe, expect, it } from 'vitest'
import { copras, entropy, ProblemValidationError, saw, type CriterionType } from '../src/core'
import { sweepWeight } from '../src/core/robustness'
import ozcan from './fixtures/copras-ozcan-celik2021.json'
import podvezko from './fixtures/copras-podvezko2011.json'
import zavadskas from './fixtures/copras-zavadskas2007.json'
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

/** Eq. 5 of Zavadskas et al. (2007) as printed, with S-min, independent of the method's simplified form. */
function eq5(sPlus: number[], sMinus: number[]) {
  const min = Math.min(...sMinus)
  const total = sumOf(sMinus)
  const denom = sumOf(sMinus.map((s) => min / s))
  return sPlus.map((p, i) => p + (min * total) / (sMinus[i]! * denom))
}

const f6 = makeProblem(ozcan.matrix, ozcan.types as CriterionType[], ozcan.alternatives)
const f6Weights = ozcan.weights_printed_table2.map((w) => w / sumOf(ozcan.weights_printed_table2))

describe('COPRAS: Özcan and Çelik 2021 (IJPME 9(2):81, Tables 1, 2, 10, 11), the main example', () => {
  const res = copras.compute(f6, f6Weights, {})
  const e = ozcan.expected

  it('reproduces the printed Q of Table 11 and the recomputed S+, S-, Q and N', () => {
    expectClose(res.scores, ozcan.published.Q_table11, e.tolerance)
    expectClose(res.scores, e.Q, e.tolerance_recomputed)
    expectClose(vec(res.steps, 'copras.sPlus'), e.S_plus, e.tolerance_recomputed)
    expectClose(vec(res.steps, 'copras.sMinus'), e.S_minus, e.tolerance_recomputed)
    expectClose(vec(res.steps, 'copras.significance'), e.Q, e.tolerance_recomputed)
    expectClose(vec(res.steps, 'copras.utility'), e.N_percent, 1e-4)
    expect(res.order).toBe('desc')
  })
  it('reproduces the weighted normalized matrix D of Table 10 (with the printed weights, which sum to 0.9999)', () => {
    const shares = step(res.steps, 'copras.normalizedSum').matrix!
    const d = step(res.steps, 'copras.weighted').matrix!
    expectClose(shares.map((r) => r.map((x, j) => x * ozcan.weights_printed_table2[j]!)), ozcan.published.D_table10, e.tolerance_D)
    expectClose(d, shares.map((r) => r.map((x, j) => x * f6Weights[j]!)), 1e-16)
  })
  it('ranks by the printed Q, not by the printed rank row (a copy of the TOPSIS column)', () => {
    expect(res.ranking).toEqual(e.ranking)
    expect(res.ranking).not.toEqual(ozcan.published.ranking_table11_misprinted)
  })
  it('gives the same ranks with Entropy weights computed from the matrix (the paper chain)', () => {
    const w = entropy.compute(f6, {}).weights
    expectClose(w, ozcan.weights_printed_table2, 5e-5)
    const chain = copras.compute(f6, w, {})
    expectClose(chain.scores, ozcan.published.Q_table11, e.tolerance)
    expect(chain.ranking).toEqual(e.ranking)
  })
  it('emits its steps in order, with the sums and diagnostics', () => {
    expect(res.steps.map((s) => s.key)).toEqual([
      'copras.normalizedSum',
      'copras.weighted',
      'copras.sPlus',
      'copras.sMinus',
      'copras.significance',
      'copras.utility',
    ])
    expect(res.warnings).toEqual([])
    const shares = step(res.steps, 'copras.normalizedSum').matrix!
    for (let j = 0; j < 7; j++) expect(sumOf(shares.map((r) => r[j]!))).toBeCloseTo(1, 14)
    expect(res.diagnostics!.wCost).toBeCloseTo(sumOf(f6Weights.slice(3)), 15)
  })
})

describe('COPRAS: Podvezko 2011 (Engineering Economics 22(2):134, Tables 7-8)', () => {
  const p = makeProblem(podvezko.matrix, podvezko.types as CriterionType[])
  const res = copras.compute(p, podvezko.weights, {})

  it('Variant II: S+, S-, Q and ranks as published and as recomputed', () => {
    expectClose(vec(res.steps, 'copras.sPlus'), podvezko.published.S_plus, podvezko.expected.tolerance)
    expectClose(vec(res.steps, 'copras.sMinus'), podvezko.published.S_minus, podvezko.expected.tolerance)
    expectClose(res.scores, podvezko.published.Q, podvezko.expected.tolerance)
    expectClose(res.scores, podvezko.expected.Q, 1e-6)
    expectClose(vec(res.steps, 'copras.utility'), podvezko.expected.N_percent, 1e-4)
    expect(res.ranking).toEqual(podvezko.published.ranking)
  })
  it('Variant I (R4: A1 105, A2 215; our recomputed Q, the printed Variant I row repeats Variant II) ranks 1-3-2; the two cost changes to Variant II turn it into 3-2-1', () => {
    const v1 = copras.compute(makeProblem(podvezko.variant1.matrix, podvezko.types as CriterionType[]), podvezko.weights, {})
    expectClose(v1.scores, podvezko.variant1.expected.Q, 1e-6)
    expect(v1.ranking).toEqual(podvezko.variant1.expected.ranking)
    expect(res.ranking).toEqual([3, 2, 1])
  })
})

describe('COPRAS: Zavadskas et al. 2007 (BJRBE 2(4):195, Tables 1-2), steps only', () => {
  const p = makeProblem(zavadskas.matrix, zavadskas.types as CriterionType[], zavadskas.alternatives)
  for (const set of ['Wa', 'Wb'] as const) {
    it(`${set}: S+ and S- as printed; Q follows Eq. 5, not the printed Q = S+ + S-`, () => {
      const res = copras.compute(p, zavadskas.weights[set], {})
      const sPlus = vec(res.steps, 'copras.sPlus')
      const sMinus = vec(res.steps, 'copras.sMinus')
      expectClose(sPlus, zavadskas.published[set].S_plus, zavadskas.tolerance_steps)
      expectClose(sMinus, zavadskas.published[set].S_minus, zavadskas.tolerance_steps)
      expectClose(res.scores, zavadskas.expected_eq5[set].Q, zavadskas.tolerance_recomputed)
      expectClose(vec(res.steps, 'copras.utility'), zavadskas.expected_eq5[set].N_percent, 1e-4)
      expect(res.ranking).toEqual(zavadskas.expected_eq5[set].ranking)
      // Regression: the paper's Table 2 error is S+ + S-; ours is at least 0.009 away from it.
      const wrong = sPlus.map((x, i) => x + sMinus[i]!)
      expectClose(wrong, zavadskas.published[set].Q_wrong_equals_Splus_plus_Sminus, zavadskas.tolerance_steps)
      expect(Math.max(...res.scores.map((q, i) => Math.abs(q - wrong[i]!)))).toBeGreaterThan(0.009)
    })
  }
  it('Wb: the printed ranking (S+ + S-) is not ours', () => {
    expect(copras.compute(p, zavadskas.weights.Wb, {}).ranking).not.toEqual(zavadskas.published.Wb.ranking)
  })
  it('the simplified form equals Eq. 5 with S-min', () => {
    for (const set of ['Wa', 'Wb'] as const) {
      const res = copras.compute(p, zavadskas.weights[set], {})
      expectClose(res.scores, eq5(vec(res.steps, 'copras.sPlus'), vec(res.steps, 'copras.sMinus')), 1e-15)
    }
  })
})

describe('COPRAS: Keshavarz Ghorabaee et al. 2015 (Informatica 26(3):435), set 1', () => {
  it('Q to 4 decimals as derived in the research card (ranks 1, 3, 6, 10, 7, 8, 2, 4, 5, 9)', async () => {
    const { default: kg } = await import('./fixtures/edas-keshavarz2015.json')
    const t = kg.tenAlternatives
    const w = t.weight_sets_as_printed[0]!
    const res = copras.compute(makeProblem(t.matrix, t.types as CriterionType[]), w.map((x) => x / sumOf(w)), {})
    expectClose(res.scores, [0.1235, 0.1159, 0.0901, 0.0743, 0.0889, 0.0857, 0.1177, 0.1141, 0.1117, 0.0781], 5e-5)
    expect(res.ranking).toEqual([1, 3, 6, 10, 7, 8, 2, 4, 5, 9])
  })
})

describe('COPRAS properties', () => {
  const p2 = makeProblem(podvezko.matrix, podvezko.types as CriterionType[])

  it('Q adds up to the sum of the weights', () => {
    for (const [p, w] of [
      [f6, f6Weights],
      [p2, podvezko.weights],
    ] as const) {
      const res = copras.compute(p, [...w], {})
      expect(sumOf(res.scores)).toBeCloseTo(1, 12)
      expect(res.diagnostics!.sumQ).toBeCloseTo(1, 12)
    }
  })
  it('is scale invariant per column (a change of units)', () => {
    const base = copras.compute(f6, f6Weights, {})
    for (let j = 0; j < 7; j++) {
      const scaled = { ...f6, matrix: f6.matrix.map((r) => r.map((x, k) => (k === j ? x * 37.5 : x))) }
      expectClose(copras.compute(scaled, f6Weights, {}).scores, base.scores, 1e-15)
    }
  })
  it('with at most one cost criterion equals SAW with the sum option exactly', () => {
    const allBenefit = { ...f6, criteria: f6.criteria.map((c) => ({ ...c, type: 'benefit' as const })) }
    const oneCost = { ...f6, criteria: f6.criteria.map((c, j) => ({ ...c, type: j === 5 ? ('cost' as const) : ('benefit' as const) })) }
    for (const p of [allBenefit, oneCost]) {
      const c = copras.compute(p, f6Weights, {})
      const s = saw.compute(p, f6Weights, { normalization: 'sum' })
      expectClose(c.scores, s.scores, 1e-15)
      expect(c.ranking).toEqual(s.ranking)
    }
    expect(copras.compute(oneCost, f6Weights, {}).warnings).toContainEqual({ code: 'copras.single-cost-criterion' })
  })
  it('differs from SAW sum with two or more cost criteria (the main example has four)', () => {
    const c = copras.compute(f6, f6Weights, {})
    const s = saw.compute(f6, f6Weights, { normalization: 'sum' })
    expect(Math.max(...c.scores.map((q, i) => Math.abs(q - s.scores[i]!)))).toBeGreaterThan(1e-3)
  })
  it('no cost criteria: Q = S+ with the no-cost notice', () => {
    const p = { ...f6, criteria: f6.criteria.map((c) => ({ ...c, type: 'benefit' as const })) }
    const res = copras.compute(p, f6Weights, {})
    expect(res.scores).toEqual(vec(res.steps, 'copras.sPlus'))
    expect(vec(res.steps, 'copras.sMinus').every((x) => x === 0)).toBe(true)
    expect(res.warnings).toEqual([{ code: 'copras.no-cost-criteria' }])
  })
  it('cost criteria whose weights are all 0 (W_C = 0): Q = S+, no NaN, the same notice', () => {
    const res = copras.compute(p2, [0.6, 0.4, 0, 0], {})
    expect(res.scores).toEqual(vec(res.steps, 'copras.sPlus'))
    expect(res.scores.every(Number.isFinite)).toBe(true)
    expect(res.warnings).toEqual([{ code: 'copras.no-cost-criteria' }])
    expect(res.diagnostics!.wCost).toBe(0)
  })
  it('with two alternatives the cost part is the other alternative\'s S-', () => {
    const p = makeProblem([[3, 5, 2], [4, 2, 7]], ['benefit', 'cost', 'cost'])
    const res = copras.compute(p, [0.5, 0.3, 0.2], {})
    const sp = vec(res.steps, 'copras.sPlus')
    const sm = vec(res.steps, 'copras.sMinus')
    expectClose(res.scores, [sp[0]! + sm[1]!, sp[1]! + sm[0]!], 1e-15)
  })
  it('a constant cost column can change the ranking for m > 2 (emits constant-cost-criterion), but not for m = 2', () => {
    const before = copras.compute(makeProblem([[1, 1], [4, 6], [6, 4]], ['benefit', 'cost']), [0.5, 0.5], {})
    expectClose(before.scores, [0.3984, 0.2406, 0.361], 5e-5)
    expect(before.ranking).toEqual([1, 3, 2])
    const after = copras.compute(makeProblem([[1, 1, 1], [4, 6, 1], [6, 4, 1]], ['benefit', 'cost', 'cost']), [0.25, 0.25, 0.5], {})
    expectClose(after.scores, [0.3405, 0.2895, 0.37], 5e-5)
    expect(after.ranking).toEqual([2, 3, 1])
    expect(after.warnings).toContainEqual({ code: 'copras.constant-cost-criterion', col: 2 })

    const m2 = copras.compute(makeProblem([[1, 2, 5], [4, 6, 5]], ['benefit', 'cost', 'cost']), [0.4, 0.3, 0.3], {})
    expect(m2.warnings).toEqual([])
  })
  it('only cost criteria: S+ = 0, Q is the cost weight shared by 1 / S-, no notice', () => {
    const p = makeProblem(podvezko.matrix, ['cost', 'cost', 'cost', 'cost'])
    const res = copras.compute(p, podvezko.weights, {})
    const sm = vec(res.steps, 'copras.sMinus')
    expect(vec(res.steps, 'copras.sPlus').every((x) => x === 0)).toBe(true)
    const inv = sm.map((x) => 1 / x)
    expectClose(res.scores, inv.map((x) => x / sumOf(inv)), 1e-15)
    expect(sumOf(res.scores)).toBeCloseTo(1, 12)
    expect(res.warnings).toEqual([])
  })
  it('runs in the robustness sweep (Özcan and Çelik, weight of price from 0 to 1): finite scores everywhere', () => {
    const sw = sweepWeight(f6, f6Weights, rankerOf(copras), 5, { steps: 20 })
    expect(sw.points.every((pt) => pt.scores.every(Number.isFinite))).toBe(true)
  })
  it('ties share a rank', () => {
    const res = copras.compute(makeProblem([[2, 3], [2, 3], [1, 4]], ['benefit', 'cost']), [0.5, 0.5], {})
    expect(res.ranking).toEqual([1, 1, 3])
  })
  it('handles a tiny positive cost weight (1e-310) without 1 / sMinus overflow to NaN', () => {
    const p = makeProblem([[10, 20], [30, 10], [20, 40]], ['benefit', 'cost'])
    const res = copras.compute(p, [1, 1e-310], {})
    expect(res.scores.every(Number.isFinite)).toBe(true)
    expect(res.ranking).toEqual([3, 1, 2])
  })
})

describe('COPRAS validation', () => {
  const p = makeProblem(podvezko.matrix, podvezko.types as CriterionType[])
  it.each([0, -3])('blocks a value of %d with non-positive-value at its cell', (v) => {
    const bad = { ...p, matrix: p.matrix.map((r, i) => r.map((x, j) => (i === 1 && j === 2 ? v : x))) }
    expect(thrown(() => copras.compute(bad, podvezko.weights, {}))).toEqual([{ code: 'non-positive-value', severity: 'error', row: 1, col: 2, value: v }])
  })
  it('blocks a single alternative and weights that do not sum to 1', () => {
    expect(thrown(() => copras.compute({ ...p, alternatives: ['A1'], matrix: [p.matrix[0]!] }, podvezko.weights, {})).map((x) => x.code)).toContain('too-few-alternatives')
    expect(thrown(() => copras.compute(p, [0.3, 0.3, 0.3, 0.3], {})).map((x) => x.code)).toEqual(['weights-sum'])
  })
})
