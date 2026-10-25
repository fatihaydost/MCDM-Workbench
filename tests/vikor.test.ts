import { describe, expect, it } from 'vitest'
import { ProblemValidationError, rankScores, vikor, vikorCompromise, type CriterionType, type Problem } from '../src/core'
import { monteCarlo, sweepWeight } from '../src/core/robustness'
import ot from './fixtures/vikor-opricovic-tzeng2004.json'
import kg from './fixtures/vikor-keshavarz2015.json'
import { expectClose, makeProblem, rankerOf, step } from './helpers'

const sumOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
const vec = (res: ReturnType<typeof vikor.compute>, key: string) => step(res.steps, key).vector!
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
const names = (p: Problem, set: number[]) => set.map((i) => p.alternatives[i]!)
const compromiseOf = (res: ReturnType<typeof vikor.compute>) =>
  vikorCompromise(vec(res, 'vikor.groupUtility'), vec(res, 'vikor.individualRegret'), res.scores)

/** Independent restatement of Opricovic and Tzeng (2004) Eqs. (1)-(3) (no shared code with the method). */
function recompute(matrix: number[][], types: CriterionType[], w: number[], v: number) {
  const n = types.length
  const best = types.map((t, j) => (t === 'cost' ? Math.min : Math.max)(...matrix.map((r) => r[j]!)))
  const worst = types.map((t, j) => (t === 'cost' ? Math.max : Math.min)(...matrix.map((r) => r[j]!)))
  const d = matrix.map((r) => Array.from({ length: n }, (_, j) => (best[j] === worst[j] ? 0 : (w[j]! * (best[j]! - r[j]!)) / (best[j]! - worst[j]!))))
  const S = d.map(sumOf)
  const R = d.map((r) => Math.max(...r))
  const [s0, s1, r0, r1] = [Math.min(...S), Math.max(...S), Math.min(...R), Math.max(...R)]
  const Q = S.map((s, i) => v * (s1 === s0 ? 0 : (s - s0) / (s1 - s0)) + (1 - v) * (r1 === r0 ? 0 : (R[i]! - r0) / (r1 - r0)))
  return { best, worst, d, S, R, Q }
}

const f = makeProblem(ot.matrix, ot.types as CriterionType[], ot.alternatives)
const phi = makeProblem(ot.matrix_phi, ot.types as CriterionType[], ot.alternatives)

describe('VIKOR: Opricovic and Tzeng 2004 (EJOR 156:445, Tables 1-3)', () => {
  const res = vikor.compute(f, ot.weights, ot.params)
  const e = ot.expected

  it('reproduces S, R and Q of Table 3 and ranks A2 first, A1 and A3 tied', () => {
    expectClose(vec(res, 'vikor.groupUtility'), e.S, e.tolerance)
    expectClose(vec(res, 'vikor.individualRegret'), e.R, e.tolerance)
    expectClose(res.scores, e.Q, e.tolerance)
    expect(res.order).toBe('asc')
    expect(res.ranking).toEqual(e.ranking)
  })
  it('meets C1 and C2, so the compromise is A2 alone (Section 5)', () => {
    const c = compromiseOf(res)
    expect([c.c1, c.c2]).toEqual([e.C1, e.C2])
    expect(c.dq).toBe(0.5)
    expect(c.advantage).toBe(1)
    expect(names(f, c.set)).toEqual(e.compromise)
    expect(res.diagnostics).toMatchObject({ c1: 1, c2: 1, dq: 0.5, compromiseSize: 1, v: 0.5 })
  })
  it('its weighted distances are w times the normalized distances printed in Table 3', () => {
    const d = step(res.steps, 'vikor.weightedDistance').matrix!
    for (let j = 0; j < 2; j++) expectClose(d.map((row) => row[j]! / ot.weights[j]!), e.d_by_criterion[j]!, 1e-12)
  })
  it('gives problem phi (phi1 = f1 + 5, phi2 = f2 / 1000 - 1) the same S, R, Q (unit-change invariance)', () => {
    const r2 = vikor.compute(phi, ot.weights, {})
    for (const key of ['vikor.groupUtility', 'vikor.individualRegret', 'vikor.q', 'vikor.weightedDistance']) {
      expectClose(step(r2.steps, key).vector ?? step(r2.steps, key).matrix!, step(res.steps, key).vector ?? step(res.steps, key).matrix!, 1e-12)
    }
    expect(r2.ranking).toEqual(res.ranking)
  })
  it('is unchanged by any increasing affine change of a column (a x + b, a > 0)', () => {
    const moved = f.matrix.map((row) => [3 * row[0]! - 7, 0.01 * row[1]! + 40])
    expectClose(vikor.compute({ ...f, matrix: moved }, ot.weights, {}).scores, res.scores, 1e-12)
  })
  it('emits f*, f-, d, S, R, Q and DQ, each equal to an independent recomputation', () => {
    expect(res.steps.map((s) => s.key)).toEqual([
      'vikor.best',
      'vikor.worst',
      'vikor.weightedDistance',
      'vikor.groupUtility',
      'vikor.individualRegret',
      'vikor.q',
      'vikor.threshold',
    ])
    const ref = recompute(ot.matrix, ot.types as CriterionType[], ot.weights, 0.5)
    expect(vec(res, 'vikor.best')).toEqual([1, 4500])
    expect(vec(res, 'vikor.worst')).toEqual([5, 3000])
    expectClose(step(res.steps, 'vikor.weightedDistance').matrix!, ref.d, 1e-15)
    expectClose(res.scores, ref.Q, 1e-15)
    expect(step(res.steps, 'vikor.threshold').scalar).toBe(0.5)
  })
  it('is the default: {} and { v: 0.5 } agree', () => {
    expect(vikor.compute(f, ot.weights, {}).scores).toEqual(res.scores)
    expect(vikor.params).toEqual([{ key: 'v', kind: 'number', min: 0, max: 1, step: 0.01, default: 0.5 }])
  })
})

describe('VIKOR: Keshavarz Ghorabaee et al. 2015 (Informatica 26:435, Tables 5-7)', () => {
  const p = makeProblem(kg.matrix, kg.types as CriterionType[], kg.alternatives)
  const unit = (w: number[]) => w.map((x) => x / sumOf(w))

  it('Q ranks equal the published VIKOR ranks in 7 of 7 weight sets (v = 0.5)', () => {
    kg.weight_sets.forEach((w, k) => expect(vikor.compute(p, unit(w), {}).ranking, `set ${k + 1}`).toEqual(kg.published_ranks[k]))
  })
  it('derived (not published): Q of set 1 to 4 decimals', () => {
    expectClose(vikor.compute(p, unit(kg.weight_sets[0]!), {}).scores, kg.derived.Q_set1, kg.derived.tolerance)
  })
  it('derived (not published): C1 fails in every set, C2 holds, and the compromise set is every alternative within DQ = 1/9', () => {
    kg.weight_sets.forEach((w, k) => {
      const res = vikor.compute(p, unit(w), {})
      const c = compromiseOf(res)
      expect(c.dq).toBeCloseTo(1 / 9, 15)
      expect([c.c1, c.c2], `set ${k + 1}`).toEqual([kg.derived.C1[k], kg.derived.C2[k]])
      expect(names(p, c.set), `set ${k + 1}`).toEqual(kg.derived.compromise[k])
      // The rule itself: in Q order, exactly those with Q - Q(a') < DQ.
      const lead = res.scores[c.first]!
      expect(c.set).toEqual(rankOrder(res.scores).filter((i) => res.scores[i]! - lead < c.dq))
    })
  })
  it('is unchanged by a common scale of the weights (the printed sets that sum to 1.001 or 0.999)', () => {
    const w = kg.weight_sets[1]!
    expect(Math.abs(sumOf(w) - 1)).toBeGreaterThan(5e-4)
    const scaled = recompute(kg.matrix, kg.types as CriterionType[], w, 0.5).Q
    expectClose(vikor.compute(p, unit(w), {}).scores, scaled, 1e-12)
  })
})

/** Alternatives in Q order, ties by index. */
function rankOrder(q: readonly number[]): number[] {
  return q.map((_, i) => i).sort((a, b) => q[a]! - q[b]! || a - b)
}

describe('VIKOR: the compromise rule, branch by branch (Opricovic and Tzeng 2004 §2 e)', () => {
  it('C1 and C2: a single solution, not the whole list (unlike pyDecision)', () => {
    const c = vikorCompromise([0.1, 0.5, 0.9], [0.1, 0.4, 0.6], [0, 0.6, 1])
    expect([c.c1, c.c2, c.set]).toEqual([true, true, [0]])
  })
  it('C1 only (a\' leads neither S nor R): a\' and a\'\'', () => {
    // m = 3, DQ = 0.5; a' = 0 has Q = 0 but S is lowest for 1 and R for 2.
    const c = vikorCompromise([0.3, 0.1, 0.9], [0.3, 0.6, 0.1], [0, 0.6, 1])
    expect([c.c1, c.c2, c.bestByS, c.bestByR]).toEqual([true, false, false, false])
    expect(c.set).toEqual([0, 1])
  })
  it('C1 fails (C2 holds or not): every alternative closer than DQ, in Q order', () => {
    // m = 5, DQ = 0.25; within 0.25 of Q = 0: indices 3 (0.1) and 0 (0.2); 4 (0.25) is not (strictly less).
    const c = vikorCompromise([0.4, 0.9, 0.8, 0.1, 0.5], [0.2, 0.9, 0.8, 0.3, 0.5], [0.2, 1, 0.7, 0, 0.25].map((x) => x))
    expect(c.first).toBe(3)
    expect([c.c1, c.c2]).toEqual([false, true])
    expect(c.set).toEqual([3, 0])
    const both = vikorCompromise([0.4, 0.9, 0.8, 0.5, 0.1], [0.2, 0.9, 0.8, 0.5, 0.1], [0.2, 1, 0.7, 0, 0.25])
    expect([both.c1, both.c2, both.set]).toEqual([false, false, [3, 0]])
  })
  it('a gap of exactly DQ is an acceptable advantage (>=), also after floating-point rounding', () => {
    expect(vikorCompromise([0, 1, 1], [0, 1, 1], [0, 0.5, 1]).c1).toBe(true)
    expect(vikorCompromise([0, 1, 1, 1], [0, 1, 1, 1], [0, 0.1 + 0.2 + 0.0333333333333333, 1, 1]).c1).toBe(true)
  })
  it('with two alternatives DQ = 1, and the better one always has Q = 0 against 1', () => {
    const res = vikor.compute(makeProblem([[1, 3], [2, 5]], ['benefit', 'benefit']), [0.5, 0.5], {})
    expect(res.scores).toEqual([1, 0])
    const c = compromiseOf(res)
    expect([c.dq, c.c1, c.c2, c.set]).toEqual([1, true, true, [1]])
  })
})

describe('VIKOR: v, guards and edge cases', () => {
  const types: CriterionType[] = ['benefit', 'cost']
  const w = [0.5, 0.5]

  it('v = 1 ranks by S alone, v = 0 by R alone, and Q is linear in v in between', () => {
    const p = makeProblem(kg.matrix, kg.types as CriterionType[])
    const ws = kg.weight_sets[0]!
    const r1 = vikor.compute(p, ws, { v: 1 })
    const r0 = vikor.compute(p, ws, { v: 0 })
    expect(r1.ranking).toEqual(rankScores(vec(r1, 'vikor.groupUtility'), 'asc'))
    expect(r0.ranking).toEqual(rankScores(vec(r0, 'vikor.individualRegret'), 'asc'))
    const r3 = vikor.compute(p, ws, { v: 0.3 })
    expectClose(r3.scores, r1.scores.map((q, i) => 0.3 * q + 0.7 * r0.scores[i]!), 1e-15)
    // S and R do not depend on v.
    expect(vec(r3, 'vikor.groupUtility')).toEqual(vec(r1, 'vikor.groupUtility'))
  })
  it('rejects v outside [0, 1] or not a number', () => {
    const p = makeProblem([[1, 2], [3, 1]], types)
    for (const v of [-0.1, 1.1, Number.NaN]) expect(() => vikor.compute(p, w, { v })).toThrow(RangeError)
    expect(() => vikor.compute(p, w, { v: '0.5' as never })).toThrow(RangeError)
  })
  it('a constant column gives d = 0 everywhere, a notice with its column, and no division by zero', () => {
    const p = makeProblem([[1, 2, 7], [3, 1, 7], [2, 4, 7]], ['benefit', 'cost', 'benefit'])
    const res = vikor.compute(p, [0.25, 0.25, 0.5], {})
    expect(step(res.steps, 'vikor.weightedDistance').matrix!.map((r) => r[2])).toEqual([0, 0, 0])
    expect(res.warnings).toContainEqual({ code: 'vikor.constant-column', col: 2 })
    // The other two columns alone, with their weights rescaled, give the same Q (Q is scale-free in w).
    const base = vikor.compute(makeProblem([[1, 2], [3, 1], [2, 4]], ['benefit', 'cost']), [0.5, 0.5], {})
    expectClose(res.scores, base.scores, 1e-15)
  })
  it('a near-constant column emits vikor.near-constant-column with its column index', () => {
    const p = makeProblem([[1, 2, 1], [3, 1, 1 + 1e-10], [2, 4, 1]], ['benefit', 'cost', 'benefit'])
    const res = vikor.compute(p, [0.25, 0.25, 0.5], {})
    expect(res.warnings).toContainEqual({ code: 'vikor.near-constant-column', col: 2 })
  })
  it('every S equal: the S term is 0, Q comes from R alone, with a notice when v > 0 (and no notice at v = 0)', () => {
    // d = [0, .5], [.5, 0], [.25, .25]: S = .5 for all, R = .5, .5, .25.
    const prob = makeProblem([[1, 0], [0, 1], [0.5, 0.5]], ['benefit', 'benefit'])
    const res = vikor.compute(prob, w, {})
    expect(new Set(vec(res, 'vikor.groupUtility')).size).toBe(1)
    expect(res.scores).toEqual([1, 1, 0])
    expect(res.warnings).toEqual([{ code: 'vikor.equal-group-utility' }])
    expect(vikor.compute(prob, w, { v: 0 }).warnings).toEqual([])
    const c = compromiseOf(res)
    expect([c.bestByS, c.bestByR, c.c2]).toEqual([false, true, true])
    // At v = 1 with sFlat && !rFlat, Q is all 0 (noSpread), and A1 (first = 0) has R = 0.5 > R(A3) = 0.25, so C2 must be false.
    const resV1 = vikor.compute(prob, w, { v: 1 })
    expect(resV1.scores).toEqual([0, 0, 0])
    expect(resV1.warnings).toContainEqual({ code: 'vikor.no-spread' })
    const cV1 = compromiseOf(resV1)
    expect([cV1.first, cV1.bestByS, cV1.bestByR, cV1.c2]).toEqual([0, false, false, false])
    expect(resV1.diagnostics?.c2).toBe(0)
  })
  it('every R equal: the R term is 0, Q comes from S alone, with a notice when v < 1 (and no equal-regret notice at v = 1)', () => {
    // d = [.5, 0], [.5, .5], [0, .5]: R = .5 for all, S = .5, 1, .5.
    const prob = makeProblem([[0, 1], [0, 0], [1, 0]], ['benefit', 'benefit'])
    const res = vikor.compute(prob, w, {})
    expect(res.scores).toEqual([0, 1, 0])
    expect(res.warnings).toContainEqual({ code: 'vikor.equal-regret' })
    expect(vikor.compute(prob, w, { v: 1 }).warnings).not.toContainEqual({ code: 'vikor.equal-regret' })
    // A1 and A3 tie for first: reported, both in the compromise set, A1 first by input order.
    expect(res.warnings).toContainEqual({ code: 'vikor.tie-for-first' })
    const c = compromiseOf(res)
    expect([c.first, c.second, c.tieAtTop, c.c1]).toEqual([0, 2, true, false])
    expect([c.bestByS, c.bestByR, c.c2]).toEqual([true, false, true])
    expect(c.set).toEqual([0, 2])
  })
  it('every S equal up to rounding (non-dyadic weights): still flat, not rounding noise stretched to [0, 1]', () => {
    // d = [.1, .2, 0, 0], [0, 0, .3, 0], [.05, .1, .15, 0]: S = .3 for all in exact arithmetic, but the sums come out
    // as 0.30000000000000004, 0.3, 0.30000000000000004. R = .2, .3, .15.
    const types: CriterionType[] = ['benefit', 'benefit', 'benefit', 'benefit']
    const ws = [0.1, 0.2, 0.3, 0.4]
    const res = vikor.compute(makeProblem([[0, 0, 1, 5], [1, 1, 0, 5], [0.5, 0.5, 0.5, 5]], types), ws, {})
    const S = vec(res, 'vikor.groupUtility')
    expect(new Set(S).size).toBeGreaterThan(1) // the noise is really there
    expectClose(res.scores, [0.05 / 0.15, 1, 0], 1e-12)
    expect(res.ranking).toEqual([2, 3, 1])
    expect(res.warnings).toContainEqual({ code: 'vikor.equal-group-utility' })
    // Two alternatives: A1 is better by R, not a tie.
    const two = vikor.compute(makeProblem([[0, 0, 1, 5], [1, 1, 0, 5]], types), ws, {})
    expectClose(two.scores, [0, 1], 1e-12)
    expect(two.ranking).toEqual([1, 2])
  })
  it('Q values that differ only by rounding are a tie for first, ordered by input index', () => {
    const c = vikorCompromise([0, 0, 1], [0, 0, 1], [5e-17, 0, 1])
    expect([c.first, c.second, c.tieAtTop, c.c1]).toEqual([0, 1, true, false])
    expect(c.order).toEqual([0, 1, 2])
    expect(c.set).toEqual([0, 1])
  })
  it('all S and all R equal: Q = 0 for every alternative, one notice, no NaN', () => {
    const res = vikor.compute(makeProblem([[2, 1], [1, 2]], ['benefit', 'benefit']), w, {})
    expect(res.scores).toEqual([0, 0])
    expect(res.ranking).toEqual([1, 1])
    expect(res.warnings).toEqual([{ code: 'vikor.no-spread' }])
  })
  it('a tie for first is ordered by input index whatever the input order, and C2 / bestByS / bestByR are permutation-invariant across tied leaders', () => {
    const m = [[3, 1], [1, 3], [1, 1]]
    const a = compromiseOf(vikor.compute(makeProblem(m, ['benefit', 'benefit']), w, {}))
    const b = compromiseOf(vikor.compute(makeProblem([m[1]!, m[0]!, m[2]!], ['benefit', 'benefit']), w, {}))
    expect([a.first, a.second]).toEqual([0, 1])
    expect([b.first, b.second]).toEqual([0, 1])
    // Only one of the two tied Q-leaders leads S, and the other leads R: both row orders agree on bestByS, bestByR, c2.
    const cOrder1 = vikorCompromise([0.5, 0.1, 0.9], [0.1, 0.5, 0.9], [0, 0, 1])
    const cOrder2 = vikorCompromise([0.1, 0.5, 0.9], [0.5, 0.1, 0.9], [0, 0, 1])
    expect([cOrder1.bestByS, cOrder1.bestByR, cOrder1.c2]).toEqual([true, true, true])
    expect([cOrder2.bestByS, cOrder2.bestByR, cOrder2.c2]).toEqual([true, true, true])
  })
  it('a cost criterion prefers the smaller value; flipping its type reverses its column', () => {
    const p = makeProblem([[10, 1], [20, 1.5]], ['cost', 'benefit'])
    expect(vikor.compute(p, [1, 0], {}).ranking).toEqual([1, 2])
    expect(vikor.compute({ ...p, criteria: [{ name: 'C1', type: 'benefit' }, p.criteria[1]!] }, [1, 0], {}).ranking).toEqual([2, 1])
  })
  it('accepts zeros and negative values (linear normalization needs no sign)', () => {
    const res = vikor.compute(makeProblem([[-2, 0], [0, -1], [3, 5]], types), w, {})
    expect(res.scores.every(Number.isFinite)).toBe(true)
    expect(vikor.requires).toBeUndefined()
  })
  it('rejects bad weights, too few alternatives and an empty cell', () => {
    expect(thrown(() => vikor.compute(makeProblem([[1, 2], [3, 1]], types), [0.5, 0.4], {})).map((x) => x.code)).toEqual(['weights-sum'])
    expect(thrown(() => vikor.compute(makeProblem([[1, 2]], types), w, {})).map((x) => x.code)).toEqual(['too-few-alternatives'])
    expect(thrown(() => vikor.compute(makeProblem([[1, Number.NaN], [3, 1]], types), w, {})).map((x) => x.code)).toEqual(['invalid-cell'])
  })
})

describe('VIKOR in the robustness tools (an ascending score)', () => {
  const p = makeProblem(kg.matrix, kg.types as CriterionType[], kg.alternatives)
  const w = kg.weight_sets[0]!
  it('the sweep evaluates VIKOR with its v and keeps lower Q ahead', () => {
    const sw = sweepWeight(p, w, rankerOf(vikor, { v: 0.3 }), 0, { steps: 10 })
    for (const pt of sw.points) {
      expect(pt.scores).toEqual(vikor.compute(p, pt.weights, { v: 0.3 }).scores)
      expect(pt.ranking).toEqual(rankScores(pt.scores, 'asc'))
    }
  })
  it('Monte Carlo counts first places by the lowest Q: with weights close to set 1, A7 or A1 leads (Q 0.027 and 0.029)', () => {
    const mc = monteCarlo(p, w, rankerOf(vikor), { concentration: 500, n: 200, seed: 1 })
    const first = mc.acceptability.map((row) => row[0]!)
    expect(first[6]! + first[0]!).toBeGreaterThan(0.95)
    expect(mc.meanRank[3]!).toBeGreaterThan(8)
  })
})
