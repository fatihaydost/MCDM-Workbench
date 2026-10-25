import { describe, expect, it } from 'vitest'
import { entropy, ProblemValidationError, type CriterionType, type Problem, type WeightingResult } from '../src/core'
import zavadskas from './fixtures/entropy-zavadskas2017.json'
import krishnan from './fixtures/entropy-krishnan2021-minmax.json'
import { expectClose, makeProblem, step } from './helpers'

const codes = (r: WeightingResult) => (r.warnings ?? []).map((w) => w.code)
const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Independent restatement of the formulas (no shared code with the method), used for the intermediate steps. */
function recompute(matrix: number[][], types: CriterionType[], variant: 'sum' | 'minmax') {
  const m = matrix.length
  const n = types.length
  const cols = Array.from({ length: n }, (_, j) => matrix.map((row) => row[j]!))
  const r = cols.map((c, j) => {
    if (variant === 'sum') return c
    const lo = Math.min(...c)
    const hi = Math.max(...c)
    return c.map((x) => (types[j] === 'cost' ? (hi - x) / (hi - lo) : (x - lo) / (hi - lo)))
  })
  const p = r.map((c) => c.map((x) => x / sumOf(c)))
  const e = p.map((c) => -sumOf(c.map((x) => (x > 0 ? x * Math.log(x) : 0))) / Math.log(m))
  const d = e.map((x) => 1 - x)
  const w = d.map((x) => x / sumOf(d))
  const byRow = (cs: number[][]) => Array.from({ length: m }, (_, i) => cs.map((c) => c[i]!))
  return { r: byRow(r), p: byRow(p), e, d, w }
}

describe('Entropy (sum): Zavadskas et al. 2017 (Sustainability 9:702, Table 4 economic block, Table 8)', () => {
  const problem = makeProblem(zavadskas.matrix, zavadskas.types as CriterionType[], zavadskas.alternatives)
  const res = entropy.compute(problem, {})
  const tol = zavadskas.expected.tolerance

  it('reproduces the published weights in data column order (Table 8 prints them on permuted rows)', () => {
    expectClose(res.weights, zavadskas.expected.weights, tol)
  })
  it('matches the printed rows once the paper\'s row permutation is undone', () => {
    const { perm, weights } = zavadskas.published_as_printed
    expectClose(perm.map((j) => res.weights[j]!), weights, tol)
  })
  it('is the default variant: {} and { normalization: "sum" } agree', () => {
    expect(entropy.compute(problem, { normalization: 'sum' }).weights).toEqual(res.weights)
  })
  it('emits the sum-variant steps, each equal to an independent recomputation', () => {
    expect(res.steps.map((s) => s.key)).toEqual(['entropy.proportionsSum', 'entropy.entropy', 'entropy.diversification', 'entropy.weights'])
    const ref = recompute(zavadskas.matrix, zavadskas.types as CriterionType[], 'sum')
    expectClose(step(res.steps, 'entropy.proportionsSum').matrix!, ref.p, 1e-12)
    expectClose(step(res.steps, 'entropy.entropy').vector!, ref.e, 1e-12)
    expectClose(step(res.steps, 'entropy.entropy').vector!, zavadskas.expected.entropy_recomputed, 5e-6)
    expectClose(step(res.steps, 'entropy.diversification').vector!, ref.d, 1e-12)
    expectClose(step(res.steps, 'entropy.weights').vector!, ref.w, 1e-12)
  })
  it('ignores the criterion types', () => {
    const flipped = makeProblem(zavadskas.matrix, (zavadskas.types as CriterionType[]).map((t) => (t === 'cost' ? 'benefit' : 'cost')))
    expect(entropy.compute(flipped, {}).weights).toEqual(res.weights)
  })
  it('has no notices on this data', () => {
    expect(res.warnings).toEqual([])
  })
})

describe('Entropy (min-max): Krishnan et al. 2021 (Symmetry 13:973, Tables 1, 2, 5)', () => {
  const problem = makeProblem(krishnan.matrix, krishnan.types as CriterionType[], krishnan.alternatives)
  const res = entropy.compute(problem, { normalization: 'minmax' })

  it('reproduces the published weights (Table 5, column Entropy)', () => {
    expectClose(res.weights, krishnan.expected.weights, krishnan.expected.tolerance)
  })
  it('normalized matrix equals the printed Table 2', () => {
    expectClose(step(res.steps, 'entropy.normalized').matrix!, krishnan.expected.normalized_table2, krishnan.expected.normalized_tolerance)
  })
  it('emits the min-max steps, each equal to an independent recomputation', () => {
    expect(res.steps.map((s) => s.key)).toEqual([
      'entropy.normalized',
      'entropy.proportionsMinmax',
      'entropy.entropy',
      'entropy.diversification',
      'entropy.weights',
    ])
    const ref = recompute(krishnan.matrix, krishnan.types as CriterionType[], 'minmax')
    expectClose(step(res.steps, 'entropy.normalized').matrix!, ref.r, 1e-12)
    expectClose(step(res.steps, 'entropy.proportionsMinmax').matrix!, ref.p, 1e-12)
    expectClose(step(res.steps, 'entropy.entropy').vector!, krishnan.expected.entropy_recomputed, 5e-6)
    expectClose(step(res.steps, 'entropy.diversification').vector!, ref.d, 1e-12)
  })
  it('differs from the sum variant on the same data (Table 5 is not variant a)', () => {
    const a = entropy.compute(problem, {}).weights
    expect(Math.max(...a.map((w, j) => Math.abs(w - krishnan.expected.weights[j]!)))).toBeGreaterThan(0.1)
  })
})

describe('Entropy: secondary published examples (3 decimals)', () => {
  it('Vujičić, Papić & Blagojević 2017 (Tehnika 72(3), Table 4, sum): homogeneous data', () => {
    const matrix = [
      [0.87356, 0.621764706, 520, 25000, 3.160588],
      [0.900285714, 0.789785714, 550, 27500, 4.082143],
      [0.911652, 0.577609, 550, 31500, 2.815217],
      [0.95144, 0.82989, 450, 28500, 3.855556],
      [0.808, 0.837652, 530, 26000, 4.617391],
      [0.947846, 0.636308, 600, 30500, 3.006154],
      [0.95008, 0.50583, 530, 24500, 2.369167],
      [0.9325, 0.788917, 530, 26450, 3.841667],
      [0.930615, 0.791615, 750, 35000, 3.863077],
    ]
    const res = entropy.compute(makeProblem(matrix, ['benefit', 'cost', 'benefit', 'cost', 'cost']), {})
    expectClose(step(res.steps, 'entropy.entropy').vector!, [0.999, 0.994, 0.996, 0.997, 0.991], 5e-4)
    expectClose(res.weights, [0.024, 0.282, 0.186, 0.129, 0.378], 5e-4)
  })

  it('Mukhametzyanov 2021 (DMAME 4(2), Table 2 DM-1, min-max)', () => {
    const matrix = [
      [71, 4500, 150, 1056, 478],
      [85, 5800, 145, 2680, 564],
      [76, 5600, 135, 1230, 620],
      [74, 4200, 160, 1480, 448],
      [82, 6200, 183, 1350, 615],
      [81, 6000, 178, 2065, 580],
      [80, 5900, 160, 1650, 610],
      [85, 6500, 140, 1650, 667],
    ]
    const res = entropy.compute(makeProblem(matrix, ['benefit', 'cost', 'benefit', 'benefit', 'cost']), { normalization: 'minmax' })
    expectClose(res.weights, [0.146, 0.228, 0.211, 0.223, 0.191], 5e-4)
  })
})

describe('Entropy: validation and edge cases', () => {
  it('sum: a negative value blocks with negative-value at its cell', () => {
    const p = makeProblem([[1, 2], [3, -4], [5, 6]], ['benefit', 'cost'])
    let err: unknown
    try {
      entropy.compute(p, {})
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(ProblemValidationError)
    expect((err as ProblemValidationError).issues).toContainEqual({ code: 'negative-value', severity: 'error', row: 1, col: 1, value: -4 })
  })

  it('min-max: negative values are accepted and give the same weights as the data shifted up', () => {
    const m = [[-3, 2], [1, -4], [5, 6], [0, 1]]
    const types: CriterionType[] = ['benefit', 'cost']
    const res = entropy.compute(makeProblem(m, types), { normalization: 'minmax' })
    expect(res.weights.every(Number.isFinite)).toBe(true)
    const shifted = entropy.compute(makeProblem(m.map((r) => r.map((x) => x + 100)), types), { normalization: 'minmax' })
    expectClose(res.weights, shifted.weights, 1e-12)
  })

  it('zero is not negative: sum accepts it and notes the column', () => {
    const res = entropy.compute(makeProblem([[0, 2], [1, 3], [2, 4]], ['benefit', 'benefit']), {})
    expect(res.warnings).toContainEqual({ code: 'entropy.zeros-in-column', col: 0 })
    expect(res.warnings?.filter((w) => w.code === 'entropy.zeros-in-column')).toHaveLength(1)
  })

  it('sum: a constant column gets e = 1, d = 0, weight 0 and a notice', () => {
    const res = entropy.compute(makeProblem([[1, 5, 3], [2, 5, 1], [3, 5, 2], [4, 5, 7]], ['benefit', 'benefit', 'cost']), {})
    expect(res.weights[1]).toBe(0)
    expect(step(res.steps, 'entropy.entropy').vector![1]).toBe(1)
    expect(step(res.steps, 'entropy.diversification').vector![1]).toBe(0)
    expect(step(res.steps, 'entropy.proportionsSum').matrix!.map((r) => r[1])).toEqual([0.25, 0.25, 0.25, 0.25])
    expect(sumOf(res.weights)).toBeCloseTo(1, 14)
    expect(res.warnings).toContainEqual({ code: 'entropy.constant-column', col: 1 })
  })

  it('sum: an all-zero column is a constant column, not 0/0', () => {
    const res = entropy.compute(makeProblem([[0, 1], [0, 2], [0, 4]], ['benefit', 'benefit']), {})
    expect(res.weights).toEqual([0, 1])
    expect(res.warnings).toContainEqual({ code: 'entropy.constant-column', col: 0 })
    expect(codes(res)).not.toContain('entropy.zeros-in-column')
    for (const s of res.steps) for (const v of (s.matrix ?? [s.vector ?? []]).flat()) expect(Number.isFinite(v), s.key).toBe(true)
  })

  it('min-max: a constant column (max = min) gets weight 0 without dividing', () => {
    const p = makeProblem([[1, 5, 3], [2, 5, 1], [3, 5, 2], [4, 5, 7]], ['benefit', 'cost', 'cost'])
    const res = entropy.compute(p, { normalization: 'minmax' })
    expect(res.weights[1]).toBe(0)
    expect(step(res.steps, 'entropy.normalized').matrix!.map((r) => r[1])).toEqual([0, 0, 0, 0])
    expect(res.warnings).toContainEqual({ code: 'entropy.constant-column', col: 1 })
    for (const s of res.steps) for (const v of (s.matrix ?? [s.vector ?? []]).flat()) expect(Number.isFinite(v), s.key).toBe(true)
  })

  it.each(['sum', 'minmax'] as const)('%s: every column constant falls back to equal weights with a notice', (normalization) => {
    const res = entropy.compute(makeProblem([[2, 7, 0], [2, 7, 0], [2, 7, 0]], ['benefit', 'cost', 'benefit']), { normalization })
    expect(res.weights).toEqual([1 / 3, 1 / 3, 1 / 3])
    expect(codes(res)).toContain('entropy.all-constant-equal-weights')
    expect(res.diagnostics?.allConstant).toBe(1)
  })

  it('min-max with m = 2: notice, and every non-constant criterion gets the same weight', () => {
    const res = entropy.compute(makeProblem([[1, 10, 4], [3, 2, 4.5]], ['benefit', 'cost', 'benefit']), { normalization: 'minmax' })
    expect(codes(res)).toContain('entropy.two-alternatives-minmax')
    expectClose(res.weights, [1 / 3, 1 / 3, 1 / 3], 1e-15)
    expect(codes(entropy.compute(makeProblem([[1, 10], [3, 2]], ['benefit', 'cost']), {}))).not.toContain('entropy.two-alternatives-minmax')
  })

  it('notes a weight above 0.5 on its criterion', () => {
    // One near-constant column with a single non-zero value takes most of the weight (Zhu et al. 2020).
    const p = makeProblem([[10, 11, 0.045], [12, 10, 0], [11, 12, 0], [13, 11, 0], [12, 12, 0]], ['benefit', 'benefit', 'cost'])
    const res = entropy.compute(p, {})
    expect(res.weights[2]).toBeGreaterThan(0.5)
    expect(res.warnings).toContainEqual({ code: 'entropy.dominant-weight', col: 2 })
    const even = entropy.compute(makeProblem([[1, 2], [2, 1], [3, 3]], ['benefit', 'benefit']), {})
    expect(codes(even)).not.toContain('entropy.dominant-weight')
  })

  it('sum is invariant to multiplying a column, not to adding to it; min-max is invariant to both', () => {
    const m = [[20, 3], [25, 9], [31, 4], [22, 6]]
    const types: CriterionType[] = ['benefit', 'cost']
    const scaled = m.map(([a, b]) => [a! * 1000, b! * 0.01])
    const added = m.map(([a, b]) => [a! + 273.15, b!])
    const a0 = entropy.compute(makeProblem(m, types), {}).weights
    expectClose(entropy.compute(makeProblem(scaled, types), {}).weights, a0, 1e-12)
    expect(Math.abs(entropy.compute(makeProblem(added, types), {}).weights[0]! - a0[0]!)).toBeGreaterThan(0.01)
    const b0 = entropy.compute(makeProblem(m, types), { normalization: 'minmax' }).weights
    expectClose(entropy.compute(makeProblem(added, types), { normalization: 'minmax' }).weights, b0, 1e-12)
    expectClose(entropy.compute(makeProblem(scaled, types), { normalization: 'minmax' }).weights, b0, 1e-12)
  })

  it('min-max uses the criterion type, sum does not', () => {
    const m = [[1, 2], [2, 9], [6, 4], [3, 3]]
    const ben = entropy.compute(makeProblem(m, ['benefit', 'benefit']), { normalization: 'minmax' })
    const cost = entropy.compute(makeProblem(m, ['cost', 'benefit']), { normalization: 'minmax' })
    expect(step(cost.steps, 'entropy.normalized').matrix![0]![0]).toBe(1)
    expect(Math.abs(ben.weights[0]! - cost.weights[0]!)).toBeGreaterThan(1e-3)
    const sumCost = entropy.compute(makeProblem(m, ['cost', 'benefit']), {}).weights
    expect(sumCost).toEqual(entropy.compute(makeProblem(m, ['benefit', 'benefit']), {}).weights)
  })

  it('a single alternative and an empty cell are rejected, not read as numbers', () => {
    expect(() => entropy.compute(makeProblem([[1, 2, 3]], ['benefit', 'benefit', 'cost']), {})).toThrow(ProblemValidationError)
    expect(() => entropy.compute(makeProblem([[1, 2], [NaN, 3], [4, 5]], ['benefit', 'cost']), {})).toThrow(ProblemValidationError)
    expect(() => entropy.compute(makeProblem([[1, 2], [NaN, 3], [4, 5]], ['benefit', 'cost']), { normalization: 'minmax' })).toThrow(
      ProblemValidationError,
    )
  })

  it('declares its option as data and rejects an unknown one', () => {
    expect(entropy.params).toEqual([{ key: 'normalization', kind: 'choice', options: ['sum', 'minmax'], default: 'sum' }])
    const p: Problem = makeProblem([[1, 2], [2, 3]], ['benefit', 'cost'])
    expect(() => entropy.compute(p, { normalization: 'zscore' as never })).toThrow(RangeError)
  })

  it('emits entropy.near-constant-column in both minmax and sum modes when a column varies within 1e-9', () => {
    const p = makeProblem(
      [
        [100, 10],
        [100 + 1e-8, 20],
        [100 + 2e-8, 30],
      ],
      ['benefit', 'benefit'],
    )
    const resMinmax = entropy.compute(p, { normalization: 'minmax' })
    expect(resMinmax.warnings).toContainEqual({ code: 'entropy.near-constant-column', col: 0 })
    const resSum = entropy.compute(p, { normalization: 'sum' })
    expect(resSum.warnings).toContainEqual({ code: 'entropy.near-constant-column', col: 0 })
  })

  it('preserves diversification ratio on homogeneous non-constant data above and below ENTROPY_NO_INFORMATION', () => {
    const p = makeProblem(
      [
        [1e5, 1e5],
        [1e5 + 0.5, 1e5 + 1],
        [1e5 + 1, 1e5 + 2],
      ],
      ['benefit', 'benefit'],
    )
    const res = entropy.compute(p, { normalization: 'sum' })
    expect(codes(res)).not.toContain('entropy.all-constant-equal-weights')
    expectClose(res.weights, [0.2, 0.8], 1e-3)

    // Relative spread ~1e-7 in (1e-9, 1e-6]: neither constant nor near-constant, d_j ~ 1e-15 < 1e-12
    const pSmallD = makeProblem(
      [
        [1e7, 1e7],
        [1e7 + 0.5, 1e7 + 1],
        [1e7 + 1, 1e7 + 2],
      ],
      ['benefit', 'benefit'],
    )
    const resSmallD = entropy.compute(pSmallD, { normalization: 'sum' })
    expect(codes(resSmallD)).not.toContain('entropy.all-constant-equal-weights')
    expectClose(resSmallD.weights, [0.2, 0.8], 5e-2)
  })
})
