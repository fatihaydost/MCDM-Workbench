import { describe, expect, it } from 'vitest'
import { critic, mabac, ProblemValidationError, rankerFor, type CriterionType, type Problem } from '../src/core'
import { minMaxNormalize } from '../src/core/math'
import { perturbWeights, removeCriteria, sweepWeight } from '../src/core/robustness'
import f1 from './fixtures/mabac-pamucar-cirovic2015-forklifts.json'
import f2 from './fixtures/mabac-biswas-das2018-hybrid-vehicles.json'
import f3 from './fixtures/mabac-celik2020-participation-banks.json'
import { expectClose, makeProblem, step } from './helpers'

const vec = (steps: Parameters<typeof step>[0], key: string) => step(steps, key).vector!
function thrown(f: () => unknown) {
  try {
    f()
  } catch (e) {
    if (e instanceof ProblemValidationError) return e.issues.filter((x) => x.severity === 'error').map((x) => [x.code, x.row])
    throw e
  }
  return []
}

/** A tiny seeded generator, so the random checks are repeatable. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomProblems(count: number, seed: number, mRange: [number, number] = [2, 8]) {
  const rand = rng(seed)
  return Array.from({ length: count }, () => {
    const m = mRange[0] + Math.floor(rand() * (mRange[1] - mRange[0] + 1))
    const n = 2 + Math.floor(rand() * 6)
    const matrix = Array.from({ length: m }, () => Array.from({ length: n }, () => Math.round((rand() - 0.3) * 1000) / 10))
    const types = Array.from({ length: n }, () => (rand() < 0.3 ? 'cost' : 'benefit') as CriterionType)
    const raw = Array.from({ length: n }, () => 0.05 + rand())
    const w = raw.map((x) => x / raw.reduce((a, b) => a + b, 0))
    return { p: makeProblem(matrix, types), w }
  })
}

const minMaxSum = (p: Problem, w: number[]) => minMaxNormalize(p).r.map((row) => row.reduce((a, x, j) => a + x * w[j]!, 0))

const fixtures = [
  ['Pamučar & Ćirović 2015, forklifts (Tables 5, 7-12)', f1],
  ['Biswas & Das 2018, hybrid vehicles (Tables 2-7)', f2],
  ['Çelik 2020, participation banks (Tables 3, 4, 7, 10-12)', f3],
] as const

describe.each(fixtures)('MABAC: %s', (_, f) => {
  const p = makeProblem(f.matrix, f.types as CriterionType[], f.alternatives)
  const res = mabac.compute(p, f.weights, {})
  const tol = (key: 'G' | 'S') => {
    const t = f.expected.tolerance_vs_published
    return typeof t === 'number' ? t : t[key]
  }

  it('reproduces the printed border, scores and ranks', () => {
    expectClose(vec(res.steps, 'mabac.border'), f.published.G, tol('G'))
    expectClose(res.scores, f.published.S, tol('S'))
    expect(res.ranking).toEqual(f.published.ranking)
    expect(res.order).toBe('desc')
  })
  it('matches the recomputed values to 1e-6', () => {
    expectClose(vec(res.steps, 'mabac.border'), f.expected.G, 1e-6)
    expectClose(res.scores, f.expected.S, 1e-6)
    expect(res.ranking).toEqual(f.expected.ranking)
  })
  it('Q is V minus G and S sums each row of Q', () => {
    const v = step(res.steps, 'mabac.weighted').matrix!
    const g = vec(res.steps, 'mabac.border')
    const q = step(res.steps, 'mabac.distance').matrix!
    expectClose(q, v.map((row) => row.map((x, j) => x - g[j]!)), 1e-15)
    expectClose(res.scores, q.map((row) => row.reduce((a, b) => a + b, 0)), 1e-15)
  })
})

describe('MABAC: Çelik 2020 end to end', () => {
  it('the project CRITIC (sample SD) gives the printed weights to 3 d.p., and MABAC on them the printed ranks', () => {
    const p = makeProblem(f3.matrix, f3.types as CriterionType[])
    const w = critic.compute(p, {}).weights
    expectClose(w, f3.weights, 5e-4)
    expect(mabac.compute(p, w, {}).ranking).toEqual(f3.published.ranking)
  })
})

describe('MABAC: properties on 300 random problems (negatives and zeros included)', () => {
  const cases = randomProblems(300, 5)
  it('S + B is the min-max weighted sum, with B the same for every alternative: the same ranking', () => {
    for (const { p, w } of cases) {
      const res = mabac.compute(p, w, {})
      const b = res.diagnostics!.border as number
      expectClose(res.scores.map((s) => s + b), minMaxSum(p, w), 1e-12)
      expect(b).toBeGreaterThanOrEqual(-1e-15)
    }
  })
  it('some alternative is above the border whenever a column varies', () => {
    for (const { p, w } of cases) {
      const res = mabac.compute(p, w, {})
      if (minMaxNormalize(p).constant.every(Boolean)) continue
      expect(Math.max(...res.scores)).toBeGreaterThan(0)
    }
  })
  it('x -> a x + b per column leaves S unchanged', () => {
    const rand = rng(11)
    for (const { p, w } of cases.slice(0, 100)) {
      const shifted = { ...p, matrix: p.matrix.map((row) => [...row]) }
      for (let j = 0; j < p.criteria.length; j++) {
        const a = 0.01 + rand() * 50
        const b = (rand() - 0.5) * 2000
        shifted.matrix.forEach((row) => (row[j] = a * row[j]! + b))
      }
      expectClose(mabac.compute(shifted, w, {}).scores, mabac.compute(p, w, {}).scores, 1e-9)
    }
  })
  it('a constant column or a zero-weight column is the same as leaving it out', () => {
    for (const { p, w } of cases.slice(0, 100)) {
      const add = (col: number[]) => ({ ...p, criteria: [...p.criteria, { name: 'K', type: 'benefit' as const }], matrix: p.matrix.map((row, i) => [...row, col[i]!]) })
      // S is linear in w column by column, so scaling every weight by 0.8 scales S by 0.8.
      const base = mabac.compute(p, w, {}).scores.map((x) => x * 0.8)
      expectClose(mabac.compute(add(p.matrix.map(() => 5)), [...w.map((x) => x * 0.8), 0.2], {}).scores, base, 1e-12)
      const zero = mabac.compute(add(p.matrix.map((_, i) => (i * 7) % 5)), [...w, 0], {})
      expectClose(zero.scores, mabac.compute(p, w, {}).scores, 1e-12)
      expect(vec(zero.steps, 'mabac.border').at(-1)).toBe(0)
    }
  })
})

describe('MABAC: edge cases', () => {
  const types: CriterionType[] = ['benefit', 'cost', 'benefit']
  it('G stays finite and positive for m = 500 (the literal product underflows to 0)', () => {
    const rand = rng(3)
    const m = 500
    const n = 10
    const p = makeProblem(Array.from({ length: m }, () => Array.from({ length: n }, () => rand() * 100)), new Array<CriterionType>(n).fill('benefit'))
    const w = new Array<number>(n).fill(0.1)
    const res = mabac.compute(p, w, {})
    const g = vec(res.steps, 'mabac.border')
    const v = step(res.steps, 'mabac.weighted').matrix!
    const literal = g.map((_, j) => v.reduce((a, row) => a * row[j]!, 1) ** (1 / m))
    expect(literal.some((x) => x === 0)).toBe(true)
    g.forEach((x) => {
      expect(x).toBeGreaterThan(0.1)
      expect(x).toBeLessThan(0.2)
    })
    expectClose(res.scores.map((s) => s + (res.diagnostics!.border as number)), minMaxSum(p, w), 1e-12)
  })
  it('all alternatives equal: every S is 0 and all tie at rank 1', () => {
    const res = mabac.compute(makeProblem([[2, 2, 2], [2, 2, 2], [2, 2, 2]], types), [0.3, 0.3, 0.4], {})
    expectClose(res.scores, [0, 0, 0], 1e-15)
    expect(res.ranking).toEqual([1, 1, 1])
  })
  it('two alternatives: the better one above the border, the other below', () => {
    const res = mabac.compute(makeProblem([[1, 9, 2], [5, 3, 4]], types), [0.3, 0.3, 0.4], {})
    expectClose(res.scores, [1 - Math.SQRT2, 2 - Math.SQRT2], 1e-12)
  })
  it('zeros and negative values compute; a single alternative is too few', () => {
    const res = mabac.compute(makeProblem([[-1, 0, 2], [0, -3, 4], [4, 2, 0]], types), [0.3, 0.3, 0.4], {})
    expect(res.scores.every(Number.isFinite)).toBe(true)
    expect(thrown(() => mabac.compute(makeProblem([[1, 2, 3]], types), [0.3, 0.3, 0.4], {}))).toEqual([['too-few-alternatives', undefined]])
  })
  it('warns about a near-constant column', () => {
    const p = makeProblem([[1, 2, 1], [5, 3, 1 + 1e-12], [4, 9, 1]], types)
    expect(mabac.compute(p, [0.3, 0.3, 0.4], {}).warnings).toEqual([{ code: 'mabac.near-constant-column', col: 2 }])
  })
  it('emits its steps in order', () => {
    const res = mabac.compute(makeProblem(f1.matrix, f1.types as CriterionType[]), f1.weights, {})
    expect(res.steps.map((s) => s.key)).toEqual(['mabac.normalized', 'mabac.weighted', 'mabac.border', 'mabac.distance', 'mabac.scores'])
    expect(res.warnings).toEqual([])
  })
})

describe('MABAC in the robustness checks', () => {
  const p = makeProblem(f1.matrix, f1.types as CriterionType[])
  const rf = rankerFor({ methodId: 'mabac', params: {} })
  it('the sweep, nudges and criterion removal run on every row', () => {
    const sw = sweepWeight(p, f1.weights, rf, 0)
    expect(sw.baseRankingInterval.ranking).toEqual(f1.expected.ranking)
    expect(perturbWeights(p, f1.weights, rf).every((r) => !r.blocked)).toBe(true)
    expect(removeCriteria(p, f1.weights, rf).every((r) => !r.blocked && r.ranking.length === 7)).toBe(true)
  })
})

describe('MABAC on constant columns', () => {
  it('all-equal alternatives with uneven weights give exactly 0 in every Q and S (no -0, no rounding dust)', () => {
    const p = makeProblem([[7, 3, 9], [7, 3, 9], [7, 3, 9], [7, 3, 9], [7, 3, 9]], ['benefit', 'cost', 'benefit'])
    const res = mabac.compute(p, [0.1, 0.3, 0.6], {})
    const q = step(res.steps, 'mabac.distance').matrix!.flat()
    for (const x of [...q, ...res.scores]) expect(Object.is(x, 0)).toBe(true)
    expect(q.filter((x) => x > 0)).toHaveLength(0)
  })
  it('a constant column next to a varying one contributes exactly 0 to Q', () => {
    const res = mabac.compute(makeProblem([[1, 5], [2, 5], [4, 5]], ['benefit', 'benefit']), [0.4, 0.6], {})
    for (const row of step(res.steps, 'mabac.distance').matrix!) expect(Object.is(row[1], 0)).toBe(true)
  })
})
