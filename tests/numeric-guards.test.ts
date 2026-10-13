import { describe, expect, it } from 'vitest'
import { critic, entropy, ProblemValidationError, saw, topsis, validateProblem, vikor, type CriterionType } from '../src/core'
import { isConstant, maxOf, minOf } from '../src/core/math'
import { makeProblem } from './helpers'

const codes = (xs: { code: string }[] | undefined) => (xs ?? []).map((x) => x.code)
const w2 = [0.5, 0.5]
const bb: CriterionType[] = ['benefit', 'benefit']

describe('magnitudes the methods cannot compute with are a blocking error, not silent zeros', () => {
  // Each of these used to give a wrong result without a word: sum(x^2), a column total or 1 / x overflowed or underflowed.
  const cases: { name: string; run: () => unknown }[] = [
    { name: 'TOPSIS, x ~ 1e160 (sum of squares overflows)', run: () => topsis.compute(makeProblem([[1e160, 1], [2e160, 3], [3e160, 2]], bb), w2, {}) },
    { name: 'TOPSIS, x ~ 1e-200 (sum of squares underflows)', run: () => topsis.compute(makeProblem([[1e-200, 1], [2e-200, 3], [3e-200, 2]], bb), w2, {}) },
    { name: 'SAW sum, x ~ 1e308 (total overflows)', run: () => saw.compute(makeProblem([[1e308, 1], [1.5e308, 3]], bb), w2, { normalization: 'sum' }) },
    { name: 'SAW sum, subnormal cost (1 / x overflows)', run: () => saw.compute(makeProblem([[1e-310, 1], [2e-310, 3]], ['cost', 'benefit']), w2, { normalization: 'sum' }) },
    { name: 'Entropy sum, x ~ 1e308 (total overflows)', run: () => entropy.compute(makeProblem([[1e308, 1], [1e308, 2], [5e307, 3]], bb), {}) },
    { name: 'CRITIC, range overflows', run: () => critic.compute(makeProblem([[1.7e308, 1], [-1.7e308, 2], [0, 3], [1, 5]], bb), {}) },
  ]
  it.each(cases)('$name', ({ run }) => {
    expect(run).toThrow(ProblemValidationError)
    try {
      run()
    } catch (e) {
      expect(codes((e as ProblemValidationError).issues)).toContain('value-out-of-range')
    }
  })

  it('reports the cell; 0 and values inside [1e-100, 1e100] pass', () => {
    const issues = validateProblem(makeProblem([[1e101, 0], [-2, -1e-101], [1e100, 1e-100]], bb))
    expect(issues.filter((x) => x.code === 'value-out-of-range')).toEqual([
      { code: 'value-out-of-range', severity: 'error', row: 0, col: 0, value: 1e101 },
      { code: 'value-out-of-range', severity: 'error', row: 1, col: 1, value: -1e-101 },
    ])
  })

  it('TOPSIS stays scale-invariant inside the range (1e90 gives the result of 1)', () => {
    const at = (s: number) => topsis.compute(makeProblem([[s, 1], [2 * s, 3], [3 * s, 2]], bb), w2, {})
    const a = at(1)
    const b = at(1e90)
    expect(b.ranking).toEqual(a.ranking)
    b.scores.forEach((x, i) => expect(x).toBeCloseTo(a.scores[i]!, 12))
  })
})

describe('very long columns (no Math.max(...spread) stack overflow)', () => {
  const m = 200_000
  const matrix = Array.from({ length: m }, (_, i) => [1 + (i % 97), 1 + ((i * 7) % 89)])
  const p = makeProblem(matrix, ['benefit', 'cost'])

  it('maxOf and minOf handle 200,000 values', () => {
    const xs = matrix.map((r) => r[0]!)
    expect(maxOf(xs)).toBe(97)
    expect(minOf(xs)).toBe(1)
  })
  it.each([
    ['TOPSIS', () => topsis.compute(p, w2, {})],
    ['SAW', () => saw.compute(p, w2, {})],
    ['VIKOR', () => vikor.compute(p, w2, {})],
    ['CRITIC', () => critic.compute(p, {})],
    ['Entropy min-max', () => entropy.compute(p, { normalization: 'minmax' })],
  ] as const)('%s computes 200,000 alternatives', (_, run) => {
    expect(run).not.toThrow()
  })
})

describe('a column constant up to rounding counts as constant', () => {
  // The table shows 0.3 in every row; 0.1 + 0.2 = 0.30000000000000004 must not be stretched to [0, 1] by min-max.
  const noisy = [[1, 0.3], [4, 0.1 + 0.2], [2, 0.3], [8, 0.1 + 0.2], [3, 0.3]]
  const p = makeProblem(noisy, bb)

  it('isConstant is relative and has no floor', () => {
    expect(isConstant([0.3, 0.1 + 0.2])).toBe(true)
    expect(isConstant([0, 0, 0])).toBe(true)
    expect(isConstant([1e-13, 2e-13])).toBe(false)
    expect(isConstant([1, 1 + 1e-9])).toBe(false)
  })
  it('validateProblem warns about it', () => {
    expect(validateProblem(p)).toEqual([{ code: 'constant-column', severity: 'warning', col: 1 }])
  })
  it('Entropy min-max gives it weight 0 and a constant notice, not the largest weight', () => {
    const res = entropy.compute(p, { normalization: 'minmax' })
    expect(res.weights[1]).toBe(0)
    expect(res.warnings).toContainEqual({ code: 'entropy.constant-column', col: 1 })
    expect(res.warnings).not.toContainEqual({ code: 'entropy.dominant-weight', col: 1 })
  })
  it('VIKOR treats it as constant: d = 0 with the notice', () => {
    const res = vikor.compute(p, w2, {})
    expect(res.warnings).toContainEqual({ code: 'vikor.constant-column', col: 1 })
  })
})
