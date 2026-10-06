import { describe, expect, it } from 'vitest'
import { entropy, ProblemValidationError, saw, type CriterionType } from '../src/core'
import podvezko from './fixtures/saw-podvezko2011.json'
import secondary from './fixtures/saw-secondary.json'
import { expectClose, makeProblem, step } from './helpers'

const sumOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
/** Printed by-criterion tables (criteria in rows) to the code's by-alternative matrices. */
const transpose = (t: number[][]): number[][] => t[0]!.map((_, i) => t.map((row) => row[i]!))
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

/** Independent restatement of both normalizations (no shared code with the method). */
function recompute(matrix: number[][], types: CriterionType[], weights: number[], variant: 'linearMax' | 'sum') {
  const cols = types.map((t, j) => {
    const c = matrix.map((row) => row[j]!)
    if (variant === 'linearMax') return t === 'cost' ? c.map((x) => Math.min(...c) / x) : c.map((x) => x / Math.max(...c))
    const base = t === 'cost' ? c.map((x) => Math.min(...c) / x) : c
    return base.map((x) => x / sumOf(base))
  })
  const r = transpose(cols)
  return { r, S: r.map((row) => sumOf(row.map((x, j) => x * weights[j]!))) }
}

const problem = makeProblem(podvezko.matrix, podvezko.types as CriterionType[], podvezko.alternatives)

describe('SAW (linear max): Podvezko 2011 (Engineering Economics 22:134, Tables 1-3)', () => {
  const res = saw.compute(problem, podvezko.weights, {})
  const lm = podvezko.linearMax

  it('reproduces the scores recomputed from Table 1 and the published ranking', () => {
    expectClose(res.scores, lm.expected.S, lm.expected.tolerance)
    expect(res.ranking).toEqual(lm.expected.ranking)
    expect(res.ranking).toEqual(lm.published_table3.ranking)
    expect(res.order).toBe('desc')
  })
  it('gives Table 3 from the printed Table 2, whose Lithuania salary cell is misprinted (0.599 for 0.611)', () => {
    // The printed ratio as data: Lithuania's salary 0.599 * 501 instead of 306.
    const misprinted = podvezko.matrix.map((row, i) => row.map((x, j) => (i === 2 && j === 2 ? 0.599 * 501 : x)))
    const r = saw.compute({ ...problem, matrix: misprinted }, podvezko.weights, {})
    expectClose(r.scores, lm.published_table3.S, lm.published_table3.tolerance)
    expectClose(step(r.steps, 'saw.normalizedLinearMax').matrix!, transpose(lm.printed_table2_by_criterion), 5e-4)
    // ... and only the misprint separates the corrected scores from Table 3.
    expect(Math.abs(res.scores[2]! - lm.published_table3.S[2]!)).toBeGreaterThan(2e-3)
    expectClose([0, 1, 3].map((i) => res.scores[i]!), [0, 1, 3].map((i) => lm.published_table3.S[i]!), lm.published_table3.tolerance)
  })
  it('is the default: {} and { normalization: "linearMax" } agree', () => {
    expect(saw.compute(problem, podvezko.weights, { normalization: 'linearMax' }).scores).toEqual(res.scores)
  })
  it('emits r, v = w r and S, each equal to an independent recomputation; v sums to S', () => {
    expect(res.steps.map((s) => s.key)).toEqual(['saw.normalizedLinearMax', 'saw.weighted', 'saw.scores'])
    const ref = recompute(podvezko.matrix, podvezko.types as CriterionType[], podvezko.weights, 'linearMax')
    expectClose(step(res.steps, 'saw.normalizedLinearMax').matrix!, ref.r, 1e-12)
    expectClose(step(res.steps, 'saw.scores').vector!, ref.S, 1e-12)
    const v = step(res.steps, 'saw.weighted').matrix!
    v.forEach((row, i) => expect(sumOf(row)).toBeCloseTo(res.scores[i]!, 14))
  })
  it('gives the best value of every criterion r = 1, a cost criterion by min / x', () => {
    const r = step(res.steps, 'saw.normalizedLinearMax').matrix!
    for (let j = 0; j < 5; j++) expect(Math.max(...r.map((row) => row[j]!))).toBe(1)
    // Unemployment (cost): Estonia has the lowest rate, 9.3; Poland 19.3 gets 9.3 / 19.3.
    expect(r[0]![3]).toBe(1)
    expect(r[3]![3]).toBeCloseTo(9.3 / 19.3, 15)
  })
})

describe('SAW (sum): Podvezko 2011, Tables 5 and 6', () => {
  const res = saw.compute(problem, podvezko.weights, { normalization: 'sum' })
  const sm = podvezko.sum

  it('reproduces the normalized matrix of Table 5', () => {
    expect(res.steps.map((s) => s.key)).toEqual(['saw.normalizedSum', 'saw.weighted', 'saw.scores'])
    expectClose(step(res.steps, 'saw.normalizedSum').matrix!, transpose(sm.published_table5_by_criterion), 5e-4)
  })
  it('reproduces the scores and ranking of Table 6', () => {
    expectClose(res.scores, sm.published_table6.S, sm.expected.tolerance)
    expectClose(res.scores, sm.expected.S, 1e-6)
    expect(res.ranking).toEqual(sm.published_table6.ranking)
  })
  it('converts a cost criterion by min / x before the shares, the same as 1 / x (the minimum cancels)', () => {
    const ref = recompute(podvezko.matrix, podvezko.types as CriterionType[], podvezko.weights, 'sum')
    expectClose(step(res.steps, 'saw.normalizedSum').matrix!, ref.r, 1e-15)
    const c = podvezko.matrix.map((row) => 1 / row[3]!)
    expectClose(step(res.steps, 'saw.normalizedSum').matrix!.map((row) => row[3]!), c.map((x) => x / sumOf(c)), 1e-15)
  })
  it('every column sums to 1, so the scores sum to 1 (Podvezko Eq. 7)', () => {
    const r = step(res.steps, 'saw.normalizedSum').matrix!
    for (let j = 0; j < 5; j++) expect(sumOf(r.map((row) => row[j]!))).toBeCloseTo(1, 14)
    expect(sumOf(res.scores)).toBeCloseTo(1, 14)
  })
})

describe('SAW: secondary published checks', () => {
  const ed = secondary.edas2015
  it('Keshavarz Ghorabaee et al. 2015, Table 7: linear max gives the published SAW ranks in 7 of 7 weight sets', () => {
    const p = makeProblem(ed.matrix, ed.types as CriterionType[])
    ed.weight_sets.forEach((w, k) => {
      const unit = w.map((x) => x / sumOf(w))
      expect(saw.compute(p, unit, {}).ranking, `set ${k + 1}`).toEqual(ed.saw_ranks[k])
    })
  })
  it('Keshavarz Ghorabaee et al. 2015: sum normalization differs in sets 1, 4 and 5 (near ties), as the card says', () => {
    const p = makeProblem(ed.matrix, ed.types as CriterionType[])
    const differs = ed.weight_sets
      .map((w, k) => [k + 1, saw.compute(p, w.map((x) => x / sumOf(w)), { normalization: 'sum' }).ranking] as const)
      .filter(([k, r]) => JSON.stringify(r) !== JSON.stringify(ed.saw_ranks[k - 1]))
      .map(([k]) => k)
    expect(differs).toEqual([1, 4, 5])
  })

  const wp = secondary.waspas2012
  it('Zavadskas et al. 2012, Table 2, lambda = 1 (WSM), with the a1-x5 misprint corrected', () => {
    const fixed = wp.matrix_as_printed.map((row, i) => row.map((x, j) => (i === wp.typo.row && j === wp.typo.col ? wp.typo.corrected : x)))
    const p = makeProblem(fixed, fixed[0]!.map(() => 'benefit' as const))
    const total = sumOf(wp.weights_as_printed)
    // The printed weights sum to 1.0001; S is linear in w, so the printed-weight score is total * S(w / total).
    const res = saw.compute(p, wp.weights_as_printed.map((w) => w / total), {})
    expectClose(res.scores.map((s) => s * total), wp.wsm_lambda1, wp.tolerance)
    // As printed, a1 is off by 0.056.
    const asPrinted = saw.compute(makeProblem(wp.matrix_as_printed, p.criteria.map((c) => c.type)), wp.weights_as_printed.map((w) => w / total), {})
    expect(Math.abs(asPrinted.scores[0]! * total - wp.wsm_lambda1[0]!)).toBeGreaterThan(0.05)
  })

  const vj = secondary.vujicic2017
  it('Vujičić et al. 2017, Tables 8a-8b, Variant 4 (linear max): ranks with Entropy and with CRITIC weights', () => {
    const p = makeProblem(vj.matrix, vj.types as CriterionType[])
    const wE = entropy.compute(p, {}).weights
    expect(saw.compute(p, wE, {}).ranking).toEqual(vj.ranks_entropy)
    const wC = vj.critic_weights_as_printed.map((w) => w / sumOf(vj.critic_weights_as_printed))
    expect(saw.compute(p, wC, {}).ranking).toEqual(vj.ranks_critic)
  })
})

describe('SAW: data requirements and edge cases', () => {
  const types: CriterionType[] = ['benefit', 'cost']
  const w = [0.5, 0.5]

  it('a zero or a negative value is a non-positive-value error at its cell, in either normalization', () => {
    for (const normalization of ['linearMax', 'sum'] as const) {
      expect(thrown(() => saw.compute(makeProblem([[1, 2], [3, 0], [2, 4]], types), w, { normalization }))).toEqual([
        { code: 'non-positive-value', severity: 'error', row: 1, col: 1, value: 0 },
      ])
      expect(thrown(() => saw.compute(makeProblem([[1, 2], [-3, 1], [2, 4]], types), w, { normalization }))).toEqual([
        { code: 'non-positive-value', severity: 'error', row: 1, col: 0, value: -3 },
      ])
    }
    // A zero on a benefit criterion would compute (r = 0) but is blocked too, with no shift (docs/research/methods/saw.md).
    expect(thrown(() => saw.compute(makeProblem([[0, 2], [3, 1]], types), w, {})).map((x) => x.code)).toEqual(['non-positive-value'])
  })
  it('declares the requirement, so the workbench blocks the cell before computing', () => {
    expect(saw.requires).toEqual({ positiveValues: true })
  })
  it('rejects bad weights and too few alternatives', () => {
    expect(thrown(() => saw.compute(makeProblem([[1, 2], [3, 1]], types), [0.5, 0.4], {})).map((x) => x.code)).toEqual(['weights-sum'])
    expect(thrown(() => saw.compute(makeProblem([[1, 2]], types), w, {})).map((x) => x.code)).toEqual(['too-few-alternatives'])
  })
  it('rejects an unknown normalization', () => {
    expect(() => saw.compute(makeProblem([[1, 2], [3, 1]], types), w, { normalization: 'minmax' as never })).toThrow(RangeError)
  })
  it('a constant column adds the same amount to every score and cannot change the ranking', () => {
    const base = makeProblem([[1, 2], [3, 1], [2, 4]], types)
    const withConst = makeProblem([[1, 2, 7], [3, 1, 7], [2, 4, 7]], [...types, 'benefit'])
    for (const normalization of ['linearMax', 'sum'] as const) {
      // Weights must sum to 1: the constant column gets 0.5 and the others half of theirs.
      const b = saw.compute(withConst, [0.25, 0.25, 0.5], { normalization })
      // Its r is 1 (linear max) or 1/m (sum) for everyone.
      const added = normalization === 'linearMax' ? 0.5 : 0.5 / 3
      const ref = recompute(base.matrix, types, [0.25, 0.25], normalization).S
      expectClose(b.scores, ref.map((s) => s + added), 1e-15)
      expect(b.ranking).toEqual(saw.compute(base, w, { normalization }).ranking)
    }
  })
  it('equal scores share a rank (competition ranking)', () => {
    // A and B mirror each other on two equally weighted benefit criteria.
    const res = saw.compute(makeProblem([[2, 4], [4, 2], [1, 1]], ['benefit', 'benefit']), w, {})
    expect(res.scores[0]).toBe(res.scores[1])
    expect(res.ranking).toEqual([1, 1, 3])
  })
  it('a cost criterion prefers the smaller value; flipping its type reverses its column', () => {
    const p = makeProblem([[10, 1], [20, 1.5]], ['cost', 'benefit'])
    const r = saw.compute(p, [1, 0], {})
    expect(r.ranking).toEqual([1, 2])
    expectClose(step(r.steps, 'saw.normalizedLinearMax').matrix!.map((row) => row[0]!), [1, 0.5], 1e-15)
    const flipped = saw.compute({ ...p, criteria: [{ name: 'C1', type: 'benefit' }, p.criteria[1]!] }, [1, 0], {})
    expect(flipped.ranking).toEqual([2, 1])
  })
})
