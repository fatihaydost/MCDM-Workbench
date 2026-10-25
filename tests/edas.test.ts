import { describe, expect, it } from 'vitest'
import { edas, ProblemValidationError, rankScores, type CriterionType, type Problem } from '../src/core'
import { monteCarlo, sweepWeight } from '../src/core/robustness'
import kg from './fixtures/edas-keshavarz2015.json'
import sec from './fixtures/edas-secondary.json'
import { expectClose, makeProblem, rankerOf, step } from './helpers'

const sumOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
const vec = (res: ReturnType<typeof edas.compute>, key: string) => step(res.steps, key).vector!
const mat = (res: ReturnType<typeof edas.compute>, key: string) => step(res.steps, key).matrix!
const codes = (res: ReturnType<typeof edas.compute>) => (res.warnings ?? []).map((w) => w.code)
/** The blocking issues a call throws with, or [] when it does not throw. */
function thrown(f: () => unknown) {
  try {
    f()
  } catch (e) {
    if (e instanceof ProblemValidationError) return e.issues.filter((x) => x.severity === 'error')
    throw e
  }
  return []
}
/** Round half up on the shortest decimal form of x (as Python's Decimal(repr(x)) does), for x >= 0. */
const roundHalfUp = (x: number, d: number) => Math.round(Number(`${x}e${d}`)) / 10 ** d
const renormalize = (w: readonly number[]) => w.map((x) => x / sumOf(w))

/** Independent restatement of Eqs. 3-14 in the paper's literal form (max(0, x - AV) / AV), no shared code. */
function recompute(matrix: number[][], types: CriterionType[], w: number[]) {
  const n = types.length
  const av = types.map((_, j) => sumOf(matrix.map((r) => r[j]!)) / matrix.length)
  const pda = matrix.map((r) => r.map((x, j) => Math.max(0, types[j] === 'cost' ? av[j]! - x : x - av[j]!) / av[j]!))
  const nda = matrix.map((r) => r.map((x, j) => Math.max(0, types[j] === 'cost' ? x - av[j]! : av[j]! - x) / av[j]!))
  const sp = pda.map((r) => sumOf(r.map((x, j) => w[j]! * x)))
  const sn = nda.map((r) => sumOf(r.map((x, j) => w[j]! * x)))
  const AS = sp.map((x, i) => (x / Math.max(...sp) + 1 - sn[i]! / Math.max(...sn)) / 2)
  return { av, pda, nda, sp, sn, AS, n }
}

describe('EDAS: Keshavarz Ghorabaee et al. 2015, Tables 1-3 (47 items, 3 benefit criteria, equal weights)', () => {
  const f = kg.inventory
  const p = makeProblem(f.matrix, f.types as CriterionType[], f.alternatives)
  const res = edas.compute(p, f.weights, {})
  const t2 = f.published.table2.rows

  it('reproduces the average solution of Table 1 and the appraisal scores to 6 decimals', () => {
    expectClose(vec(res, 'edas.average'), f.expected.AV, 1e-9)
    expectClose(vec(res, 'edas.average'), f.published.AV, 0.005)
    expectClose(res.scores, f.expected.AS, f.expected.tolerance)
    expectClose(res.scores, f.published.AS, f.published.tolerance)
    expect(res.order).toBe('desc')
    expect(res.scores[1]).toBe(1)
    expect(res.scores[40]).toBe(0)
  })
  it('reproduces every one of the 517 cells of Table 2 when rounded as the paper did (3, then 2 decimals)', () => {
    // SP and SN are printed as plain sums (w_j = 1); with w = 1/3 they are a third of that.
    const cols = [
      ...[0, 1, 2].map((j) => mat(res, 'edas.pda').map((r) => r[j]!)),
      ...[0, 1, 2].map((j) => mat(res, 'edas.nda').map((r) => r[j]!)),
      vec(res, 'edas.sp').map((x) => 3 * x),
      vec(res, 'edas.nsp'),
      vec(res, 'edas.sn').map((x) => 3 * x),
      vec(res, 'edas.nsn'),
      res.scores,
    ]
    let cells = 0
    t2.forEach((row, i) =>
      row.forEach((printed, k) => {
        expect(roundHalfUp(roundHalfUp(cols[k]![i]!, 3), 2), `item ${i + 1}, ${f.published.table2.columns[k]}`).toBe(printed)
        cells++
      }),
    )
    expect(cells).toBe(517)
  })
  it('puts the same ten items in class A and the next fourteen in class B as Table 3', () => {
    const items = (lo: number, hi: number) => res.ranking.flatMap((r, i) => (r > lo && r <= hi ? [i + 1] : []))
    expect(items(0, 10)).toEqual(f.expected.class_A_items_1based)
    expect(items(10, 24)).toEqual(f.expected.class_B_items_1based)
  })
  it('gives each column the same total distance above and below the average', () => {
    for (let j = 0; j < 3; j++) {
      expect(sumOf(mat(res, 'edas.pda').map((r) => r[j]!))).toBeCloseTo(sumOf(mat(res, 'edas.nda').map((r) => r[j]!)), 12)
    }
  })
  it('emits AV, PDA, NDA, the weighted distances, SP, SN, NSP, NSN and AS, each equal to an independent recomputation', () => {
    expect(res.steps.map((s) => s.key)).toEqual([
      'edas.average',
      'edas.pda',
      'edas.nda',
      'edas.weightedPda',
      'edas.weightedNda',
      'edas.sp',
      'edas.sn',
      'edas.nsp',
      'edas.nsn',
      'edas.scores',
    ])
    const r = recompute(f.matrix, f.types as CriterionType[], f.weights)
    expectClose(vec(res, 'edas.average'), r.av, 1e-12)
    expectClose(mat(res, 'edas.pda'), r.pda, 1e-12)
    expectClose(mat(res, 'edas.nda'), r.nda, 1e-12)
    expectClose(vec(res, 'edas.sp'), r.sp, 1e-12)
    expectClose(vec(res, 'edas.sn'), r.sn, 1e-12)
    expectClose(res.scores, r.AS, 1e-12)
    expectClose(mat(res, 'edas.weightedPda').map((row) => sumOf(row)), r.sp, 1e-12)
    expect(res.warnings).toEqual([])
  })
})

describe('EDAS: Keshavarz Ghorabaee et al. 2015, Tables 5-7 (10 x 7, seven weight sets)', () => {
  const f = kg.tenAlternatives
  const p = makeProblem(f.matrix, f.types as CriterionType[], f.alternatives)
  it('gives the published EDAS ranks of Table 7 for all seven weight sets (each renormalized to sum 1)', () => {
    f.weight_sets_as_printed.forEach((w, k) => {
      const res = edas.compute(p, renormalize(w), {})
      expect(res.ranking, `set ${k + 1}`).toEqual(f.published_ranks[k])
      expectClose(res.scores, f.derived_AS_renormalized_weights[k]!, f.tolerance)
    })
  })
  it('handles cost criteria by swapping the two distances', () => {
    const res = edas.compute(p, renormalize(f.weight_sets_as_printed[0]!), {})
    const r = recompute(f.matrix, f.types as CriterionType[], renormalize(f.weight_sets_as_printed[0]!))
    expectClose(mat(res, 'edas.pda'), r.pda, 1e-12)
    expectClose(mat(res, 'edas.nda'), r.nda, 1e-12)
    // A1 has the lowest cost on C4 (0.05 is below the average 0.101), so it gets a positive distance there.
    expect(mat(res, 'edas.pda')[0]![3]).toBeGreaterThan(0)
    expect(mat(res, 'edas.nda')[0]![3]).toBe(0)
  })
  it('is unchanged by a common scale of the weights and by a unit change (x times a > 0) of a column', () => {
    const w = renormalize(f.weight_sets_as_printed[2]!)
    const base = edas.compute(p, w, {})
    // A common scale cancels in NSP and NSN; the validator wants a sum of 1, so the method is called directly.
    expectClose(recompute(f.matrix, f.types as CriterionType[], w.map((x) => 7 * x)).AS, base.scores, 1e-12)
    const scaled = f.matrix.map((row) => row.map((x, j) => (j === 5 ? x * 0.001 : x)))
    expectClose(edas.compute({ ...p, matrix: scaled }, w, {}).scores, base.scores, 1e-12)
  })
  it('depends on where zero is: adding 1 to C4 changes the ranks of weight set 1 (card, Pitfalls)', () => {
    const w = renormalize(f.weight_sets_as_printed[0]!)
    const shifted = f.matrix.map((row) => row.map((x, j) => (j === 3 ? x + 1 : x)))
    expect(edas.compute({ ...p, matrix: shifted }, w, {}).ranking).toEqual([1, 5, 6, 9, 7, 8, 2, 3, 4, 10])
  })
  it('runs inside the robustness tools with a higher-is-better score', () => {
    const w = renormalize(f.weight_sets_as_printed[0]!)
    const sw = sweepWeight(p, w, rankerOf(edas), 0, { steps: 10 })
    for (const pt of sw.points) {
      expect(pt.scores).toEqual(edas.compute(p, pt.weights, {}).scores)
      expect(pt.ranking).toEqual(rankScores(pt.scores, 'desc'))
    }
    const mc = monteCarlo(p, w, rankerOf(edas), { concentration: 500, n: 200, seed: 1 })
    // A1 leads every weight set of the paper; near set 1 it stays first, and A4 stays last.
    expect(mc.acceptability[0]![0]!).toBeGreaterThan(0.95)
    expect(mc.meanRank[3]!).toBeGreaterThan(9.5)
  })
})

describe('EDAS: Aydın Ünal 2019, Tables 7 and 9-12 (7 insurers, 8 criteria, Entropy weights)', () => {
  const f = sec.aydinUnal2019
  it('gives the correct result for the types the paper labels (Table 3): same ranks as printed', () => {
    const p = makeProblem(f.matrix, f.types_labelled as CriterionType[], f.alternatives)
    const res = edas.compute(p, f.weights, {})
    const e = f.expected_labelled_types
    expectClose(vec(res, 'edas.average'), e.AV, 1e-6)
    expectClose(vec(res, 'edas.sp'), e.SP, e.tolerance)
    expectClose(vec(res, 'edas.sn'), e.SN, e.tolerance)
    expectClose(res.scores, e.AS, e.tolerance)
    expect(res.ranking).toEqual(e.ranking)
    expect(res.ranking).toEqual(f.published_table12.ranking)
  })
  it('reproduces Table 12 as printed only with the types the paper actually used (KK5 cost, KK6 benefit)', () => {
    const p = makeProblem(f.matrix, f.types_used_in_paper as CriterionType[], f.alternatives)
    const res = edas.compute(p, f.weights, {})
    const t = f.published_table12
    expectClose(vec(res, 'edas.sp'), t.SP, 3e-4)
    expectClose(vec(res, 'edas.sn'), t.SN, 3e-4)
    expectClose(vec(res, 'edas.nsp'), t.NSP, 3e-4)
    expectClose(vec(res, 'edas.nsn'), t.NSN, 3e-4)
    expectClose(res.scores, t.AS, 2e-4)
    expect(res.ranking).toEqual(t.ranking)
  })
})

describe('EDAS: Sarıhan and Aydın 2023, Tables 2, 5 and 9 (14 exporters, 3 benefit criteria)', () => {
  const f = sec.sarihanAydin2023
  const p = makeProblem(f.matrix, f.types as CriterionType[], f.alternatives)
  const res = edas.compute(p, f.weights, {})
  it("computes the average of Table 2 (the paper's Table 6 prints a wrong one) and the corrected scores", () => {
    expectClose(vec(res, 'edas.average'), f.expected.AV, 1e-6)
    expectClose(res.scores, f.expected.AS, f.expected.tolerance)
  })
  it('gives the printed rank column, including the near tie of C and L', () => {
    expect(res.ranking).toEqual(f.expected.ranking)
    expect(res.ranking).toEqual(f.published.ranking_printed)
    expect(res.scores[11]! - res.scores[2]!).toBeCloseTo(2.15e-4, 5)
  })
  it('reproduces the printed scores from the printed (wrong) average, which rank C above L', () => {
    // Recompute Eqs. 6-14 with Table 6's AV instead of the true mean.
    const av = f.published.AV_table6_wrong
    const pda = f.matrix.map((r) => r.map((x, j) => Math.max(0, x - av[j]!) / av[j]!))
    const nda = f.matrix.map((r) => r.map((x, j) => Math.max(0, av[j]! - x) / av[j]!))
    const sp = pda.map((r) => sumOf(r.map((x, j) => f.weights[j]! * x)))
    const sn = nda.map((r) => sumOf(r.map((x, j) => f.weights[j]! * x)))
    const AS = sp.map((x, i) => (x / Math.max(...sp) + 1 - sn[i]! / Math.max(...sn)) / 2)
    expectClose(AS, f.published.AS, 1.5e-3)
    expect(rankScores(AS, 'desc')).toEqual(f.published.ranking_implied_by_printed_AS)
  })
})

describe('EDAS: data rules and edge cases', () => {
  const two: CriterionType[] = ['benefit', 'cost']
  it('gives a constant column exactly 0 distance (no rounding noise) with a notice', () => {
    const res = edas.compute(makeProblem([[0.1, 3], [0.1, 5], [0.1, 4]], two), [0.5, 0.5], {})
    expect(mat(res, 'edas.pda').map((r) => r[0])).toEqual([0, 0, 0])
    expect(mat(res, 'edas.nda').map((r) => r[0])).toEqual([0, 0, 0])
    expect(codes(res)).toEqual(['edas.constant-column'])
    expect(res.warnings![0]!.col).toBe(0)
    expect(res.ranking).toEqual([1, 3, 2])
  })
  it('treats an all-zero column as constant, not as a zero average', () => {
    const res = edas.compute(makeProblem([[0, 3], [0, 5], [0, 4]], two), [0.5, 0.5], {})
    expect(codes(res)).toEqual(['edas.constant-column'])
  })
  it('accepts zeros in a column with a positive average', () => {
    const res = edas.compute(makeProblem([[0, 3], [2, 5], [4, 4]], two), [0.5, 0.5], {})
    expect(codes(res)).toEqual([])
    expect(mat(res, 'edas.nda')[0]![0]).toBe(1)
  })
  it('gives every alternative 0.5 with a notice when nobody is away from the average', () => {
    const res = edas.compute(makeProblem([[2, 3], [2, 3], [2, 3]], two), [0.5, 0.5], {})
    expect(res.scores).toEqual([0.5, 0.5, 0.5])
    expect(res.ranking).toEqual([1, 1, 1])
    expect(codes(res)).toEqual(['edas.constant-column', 'edas.constant-column', 'edas.no-spread'])
    // The same when the only varying criterion has weight 0.
    const zeroWeight = edas.compute(makeProblem([[1, 3], [2, 3], [3, 3]], two), [0, 1], {})
    expect(zeroWeight.scores).toEqual([0.5, 0.5, 0.5])
    expect(codes(zeroWeight)).toContain('edas.no-spread')
  })
  it('blocks a varying column whose average is 0 or below, at that column, without shifting', () => {
    for (const col of [[-4, 1, -3], [-1, 0, 1]]) {
      const issues = thrown(() => edas.compute(makeProblem(col.map((x) => [x, 1 + x * x]), two), [0.5, 0.5], {}))
      expect(issues.map((x) => [x.code, x.col])).toEqual([['non-positive-average', 0]])
      expect(issues[0]!.value).toBe(sumOf(col) / 3)
    }
    // A constant negative column contributes nothing and is not blocked.
    expect(thrown(() => edas.compute(makeProblem([[-2, 1], [-2, 2], [-2, 3]], two), [0.5, 0.5], {}))).toEqual([])
  })
  it('computes negative values while the average is above 0, with a notice, and a second one when the average is small', () => {
    const res = edas.compute(makeProblem([[-1, 3], [2, 5], [5, 4]], two), [0.5, 0.5], {})
    expect(codes(res)).toEqual(['edas.negative-values'])
    expect(res.warnings![0]!.col).toBe(0)
    // The card's example: a 1 % weight on a column whose average is 0.0033 flips the winner.
    const tiny = makeProblem([[-100, 5], [100.01, 6], [0, 7]], ['benefit', 'benefit'])
    const r = edas.compute(tiny, [0.01, 0.99], {})
    expect(codes(r)).toEqual(['edas.negative-values', 'edas.small-average'])
    expectClose(r.scores, [0, 1, 0.5003], 1e-4)
    expect(Math.max(...mat(r, 'edas.pda').map((row) => row[0]!))).toBeGreaterThan(30000)
    // When weight is 0 on that column, negative-values and small-average warnings are suppressed.
    const rZeroW = edas.compute(tiny, [0, 1], {})
    expect(codes(rZeroW)).toEqual([])
  })
  it('validates the problem and the weights like every method', () => {
    expect(thrown(() => edas.compute(makeProblem([[1, 2]], two), [0.5, 0.5], {})).map((x) => x.code)).toEqual(['too-few-alternatives'])
    expect(thrown(() => edas.compute(makeProblem([[1, 2], [NaN, 3]], two), [0.5, 0.5], {})).map((x) => x.code)).toEqual(['invalid-cell'])
    expect(thrown(() => edas.compute(makeProblem([[1, 2], [2, 3]], two), [0.5, 0.6], {})).map((x) => x.code)).toEqual(['weights-sum'])
  })
  it('gives tied alternatives the same rank', () => {
    const res = edas.compute(makeProblem([[1, 2], [1, 2], [3, 1]], two), [0.5, 0.5], {})
    expect(res.ranking).toEqual([2, 2, 1])
  })
  it('with two alternatives gives one an above-average distance and the other an equal below-average one', () => {
    const res = edas.compute(makeProblem([[1, 4], [3, 2]], two), [0.5, 0.5], {})
    expect(mat(res, 'edas.pda')[1]).toEqual(mat(res, 'edas.nda')[0])
    expect(res.scores).toEqual([0, 1])
  })
})

it('EDAS has no options and no positive-value requirement', () => {
  const m: { params?: unknown; requires?: unknown } = edas
  expect(m.params).toBeUndefined()
  expect(m.requires).toBeUndefined()
  const p: Problem = makeProblem([[0, 1], [1, 0], [2, 2]], ['benefit', 'benefit'])
  expect(edas.compute(p, [0.5, 0.5], {}).ranking).toEqual([2, 2, 1])
})
