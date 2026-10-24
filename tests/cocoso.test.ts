import { describe, expect, it } from 'vitest'
import { cocoso, ProblemValidationError, rankerFor, WASPAS_LAMBDA_GRID, type CriterionType, type Problem } from '../src/core'
import { monteCarlo, perturbWeights, removeCriteria, sweepWeight } from '../src/core/robustness'
import type { RankerFor } from '../src/core/run'
import f1 from './fixtures/cocoso-yazdani2019-logistics.json'
import f2 from './fixtures/cocoso-yazdani2019-green-suppliers.json'
import f3 from './fixtures/cocoso-akgul2021-banks.json'
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

/** Random problems where no alternative is the worst on every criterion (those are blocked). */
function randomProblems(count: number, seed: number) {
  const rand = rng(seed)
  const out: { p: Problem; w: number[] }[] = []
  while (out.length < count) {
    const m = 3 + Math.floor(rand() * 6)
    const n = 2 + Math.floor(rand() * 6)
    const matrix = Array.from({ length: m }, () => Array.from({ length: n }, () => Math.round((1 + rand() * 9) * 10) / 10))
    const types = Array.from({ length: n }, () => (rand() < 0.3 ? 'cost' : 'benefit') as CriterionType)
    const raw = Array.from({ length: n }, () => 0.05 + rand())
    const w = raw.map((x) => x / raw.reduce((a, b) => a + b, 0))
    const p = makeProblem(matrix, types)
    if (thrown(() => cocoso.compute(p, w, {})).length === 0) out.push({ p, w })
  }
  return out
}

const fixtures = [
  ['Yazdani et al. 2019, example 1 (Tables I, III-VI)', f1],
  ['Yazdani et al. 2019, example 2 (Tables X-XI)', f2],
  ['Akgül 2021, CRITIC weights (Tables 4, 7, 10-12)', f3],
] as const

describe.each(fixtures)('CoCoSo: %s', (_, f) => {
  const p = makeProblem(f.matrix, f.types as CriterionType[], f.alternatives)
  const res = cocoso.compute(p, f.weights, {})
  const tol = (key: string) => {
    const t = f.expected.tolerance_vs_published
    return typeof t === 'number' ? t : t[key as keyof typeof t]
  }

  it('reproduces the printed values and ranks', () => {
    const pub = f.published as Record<string, number[]>
    for (const key of ['S', 'P', 'ka', 'kb', 'kc'] as const) {
      if (pub[key]) expectClose(vec(res.steps, `cocoso.${key.toLowerCase()}`), pub[key], tol(key))
    }
    expectClose(res.scores, f.published.k, tol('k'))
    expect(res.ranking).toEqual(f.published.ranking)
    expect(res.order).toBe('desc')
  })
  it('matches the recomputed values to 1e-6', () => {
    const e = f.expected
    expectClose(vec(res.steps, 'cocoso.s'), e.S, 1e-6)
    expectClose(vec(res.steps, 'cocoso.p'), e.P, 1e-6)
    expectClose(vec(res.steps, 'cocoso.ka'), e.ka, 1e-6)
    expectClose(vec(res.steps, 'cocoso.kb'), e.kb, 1e-6)
    expectClose(vec(res.steps, 'cocoso.kc'), e.kc, 1e-6)
    expectClose(res.scores, e.k, 1e-6)
    expect(res.ranking).toEqual(e.ranking)
  })
  it('at λ = 0.5, k_c is k_a times one constant; the weakest alternative has k_b = 2', () => {
    const ka = vec(res.steps, 'cocoso.ka')
    const kc = vec(res.steps, 'cocoso.kc')
    const c = kc[0]! / ka[0]!
    kc.forEach((x, i) => expect(Math.abs(x / ka[i]! - c)).toBeLessThan(1e-12))
    expect(Math.min(...vec(res.steps, 'cocoso.kb'))).toBeCloseTo(2, 12)
  })
  it('the λ sweep column at 0.5 is the score, and each column equals a run at that λ', () => {
    const sweep = step(res.steps, 'cocoso.lambdaSweep').matrix!
    expect(sweep[0]).toHaveLength(WASPAS_LAMBDA_GRID.length)
    expectClose(sweep.map((row) => row[5]!), res.scores, 1e-15)
    for (const k of [0, 3, 10]) {
      expectClose(sweep.map((row) => row[k]!), cocoso.compute(p, f.weights, { lambda: WASPAS_LAMBDA_GRID[k]! }).scores, 1e-12)
    }
  })
})

describe('CoCoSo: λ', () => {
  it('moves only k_c: the rank changes the card reports (F1 none, F2 at λ = 1, F3 at 0.9 and 1)', () => {
    const swaps = (f: typeof f1 | typeof f2 | typeof f3) => {
      const p = makeProblem(f.matrix, f.types as CriterionType[])
      const base = cocoso.compute(p, f.weights, {}).ranking
      return WASPAS_LAMBDA_GRID.filter((lambda) => cocoso.compute(p, f.weights, { lambda }).ranking.join() !== base.join())
    }
    expect(swaps(f1)).toEqual([])
    expect(swaps(f2)).toEqual([1])
    expect(swaps(f3)).toEqual([0.9, 1])
    const p = makeProblem(f2.matrix, f2.types as CriterionType[])
    expect(cocoso.compute(p, f2.weights, { lambda: 1 }).ranking).toEqual([5, 2, 3, 4, 10, 8, 1, 6, 9, 7])
    const a = cocoso.compute(p, f2.weights, { lambda: 0 })
    const b = cocoso.compute(p, f2.weights, { lambda: 1 })
    for (const key of ['cocoso.s', 'cocoso.p', 'cocoso.ka', 'cocoso.kb']) expect(vec(a.steps, key)).toEqual(vec(b.steps, key))
  })
  it('rejects λ outside [0, 1]', () => {
    const p = makeProblem(f1.matrix, f1.types as CriterionType[])
    expect(() => cocoso.compute(p, f1.weights, { lambda: 1.1 })).toThrow(RangeError)
    expect(() => cocoso.compute(p, f1.weights, { lambda: Number.NaN })).toThrow(RangeError)
  })
})

describe('CoCoSo: properties on 200 random problems', () => {
  const cases = randomProblems(200, 7)
  it('negative values are allowed: x -> a x + b per column leaves k unchanged', () => {
    const rand = rng(11)
    for (const { p, w } of cases) {
      const shifted = { ...p, matrix: p.matrix.map((row) => [...row]) }
      for (let j = 0; j < p.criteria.length; j++) {
        const a = 0.01 + rand() * 50
        const b = (rand() - 0.5) * 2000
        shifted.matrix.forEach((row) => (row[j] = a * row[j]! + b))
      }
      expectClose(cocoso.compute(shifted, w, {}).scores, cocoso.compute(p, w, {}).scores, 1e-9)
    }
  })
  it('a constant column adds nothing to S or P: the same as leaving it out with the other weights kept', () => {
    for (const { p, w } of cases.slice(0, 50)) {
      const withConst = { ...p, criteria: [...p.criteria, { name: 'K', type: 'benefit' as const }], matrix: p.matrix.map((row) => [...row, 5]) }
      const w2 = [...w.map((x) => x * 0.8), 0.2]
      const res = cocoso.compute(withConst, w2, {})
      const r = step(cocoso.compute(p, w, {}).steps, 'cocoso.normalized').matrix!
      expect(step(res.steps, 'cocoso.normalized').matrix!.map((row) => row.at(-1))).toEqual(r.map(() => 0))
      expectClose(vec(res.steps, 'cocoso.s'), r.map((row) => row.reduce((a, x, j) => a + x * w2[j]!, 0)), 1e-12)
      expectClose(vec(res.steps, 'cocoso.p'), r.map((row) => row.reduce((a, x, j) => a + x ** w2[j]!, 0)), 1e-12)
    }
  })
  it('a criterion with weight 0 changes nothing (it is left out of P: 0^0 would add 1 to every P)', () => {
    for (const { p, w } of cases) {
      const extra = { ...p, criteria: [...p.criteria, { name: 'Z', type: 'benefit' as const }], matrix: p.matrix.map((row, i) => [...row, (i * 7) % 5]) }
      expectClose(cocoso.compute(extra, [...w, 0], {}).scores, cocoso.compute(p, w, {}).scores, 1e-12)
    }
  })
})

describe('CoCoSo: edge cases', () => {
  const types: CriterionType[] = ['benefit', 'cost', 'benefit']
  it('an alternative worst on every criterion blocks, naming it', () => {
    const p = makeProblem([[1, 9, 2], [5, 3, 4], [4, 2, 6], [3, 5, 5]], types)
    expect(thrown(() => cocoso.compute(p, [0.3, 0.3, 0.4], {}))).toEqual([['all-worst-alternative', 0]])
  })
  it('worst on every weighted criterion is enough (a zero-weight criterion does not save it)', () => {
    const p = makeProblem([[1, 9, 9], [5, 3, 4], [4, 2, 6]], types)
    expect(thrown(() => cocoso.compute(p, [0.5, 0.5, 0], {}))).toEqual([['all-worst-alternative', 0]])
    expect(thrown(() => cocoso.compute(p, [0.4, 0.4, 0.2], {}))).toEqual([])
  })
  it('all active criteria constant: returns tied rank 1 with finite scores instead of throwing all-worst-alternative', () => {
    const p = makeProblem([[2, 2, 2], [2, 2, 2], [2, 2, 2]], types)
    const res = cocoso.compute(p, [0.3, 0.3, 0.4], {})
    expect(res.ranking).toEqual([1, 1, 1])
    expect(res.scores.every(Number.isFinite)).toBe(true)
    expectClose(vec(res.steps, 'cocoso.ka'), [1 / 3, 1 / 3, 1 / 3], 1e-15)
    expect(vec(res.steps, 'cocoso.kb')).toEqual([2, 2, 2])
    expect(vec(res.steps, 'cocoso.kc')).toEqual([1, 1, 1])
  })
  it('zeros and negative values compute; a single alternative is too few', () => {
    const p = makeProblem([[-1, 0, 2], [0, -3, 4], [4, 2, 0]], types)
    const res = cocoso.compute(p, [0.3, 0.3, 0.4], {})
    expect(res.scores.every(Number.isFinite)).toBe(true)
    expect(thrown(() => cocoso.compute(makeProblem([[1, 2, 3]], types), [0.3, 0.3, 0.4], {}))).toEqual([['too-few-alternatives', undefined]])
  })
  it('warns about a near-constant column', () => {
    const p = makeProblem([[1, 2, 1], [5, 3, 1 + 1e-12], [4, 9, 1]], types)
    expect(cocoso.compute(p, [0.3, 0.3, 0.4], {}).warnings).toEqual([{ code: 'cocoso.near-constant-column', col: 2 }])
  })
  it('emits its steps in order', () => {
    const res = cocoso.compute(makeProblem(f1.matrix, f1.types as CriterionType[]), f1.weights, {})
    expect(res.steps.map((s) => s.key)).toEqual([
      'cocoso.normalized',
      'cocoso.s',
      'cocoso.p',
      'cocoso.ka',
      'cocoso.kb',
      'cocoso.kc',
      'cocoso.scores',
      'cocoso.lambdaSweep',
    ])
    expect(res.warnings).toEqual([])
  })
})

describe('CoCoSo in the robustness checks', () => {
  const p = makeProblem(f1.matrix, f1.types as CriterionType[])
  const rf = rankerFor({ methodId: 'cocoso', params: {} })
  it('the weight sweep leaves out w_k = 1, where the provider worst on criterion k gets S = 0', () => {
    for (let k = 0; k < 5; k++) {
      const sw = sweepWeight(p, f1.weights, rf, k)
      expect(sw.points.at(-1)!.wk).toBe(0.99)
      expect(sw.rankingIntervals.at(-1)!.to).toBe(0.99)
      expect(sw.rankingIntervals[0]!.from).toBe(sw.points[0]!.wk)
      expect(sw.baseRankingInterval.ranking).toEqual(f1.expected.ranking)
    }
  })
  it('criterion removal and the nudges run; a removal it cannot rank is a blocked row naming the alternative', () => {
    const rows = removeCriteria(makeProblem([[1, 2, 3], [2, 3, 1], [3, 1, 2]], ['benefit', 'benefit', 'benefit']), [0.3, 0.3, 0.4], rf)
    expect(rows.map((r) => r.j)).toEqual([0, 1, 2])
    expect(rows.every((r) => r.blocked === undefined)).toBe(true)
    const blocked = removeCriteria(makeProblem([[1, 1, 3], [2, 3, 1], [3, 2, 2]], ['benefit', 'benefit', 'benefit']), [0.3, 0.3, 0.4], rf)
    // Without C3, A1 is the worst on C1 and C2.
    expect(blocked.map((r) => r.j)).toEqual([0, 1, 2])
    expect(blocked[2]!.blocked?.map((x) => [x.code, x.row])).toEqual([['all-worst-alternative', 0]])
    expect(blocked[2]!.ranking).toEqual([])
    expect(blocked[2]!.sameTop).toBe(false)
    expect(perturbWeights(p, f1.weights, rf)).toHaveLength(30)
  })
  it('a nudge that puts all the weight on one criterion is a blocked row, not a throw', () => {
    // +20 % on 0.9 clips to 1: C2 gets 0 and A1, the worst on C1, has S = 0.
    const q = makeProblem([[1, 3], [2, 1], [3, 2]], ['benefit', 'benefit'])
    const rows = perturbWeights(q, [0.9, 0.1], rf)
    expect(rows).toHaveLength(12)
    const blocked = rows.filter((r) => r.blocked)
    expect(blocked.map((r) => [r.k, r.delta])).toEqual([[0, 0.2]])
    expect(blocked[0]!.blocked?.map((x) => [x.code, x.row])).toEqual([['all-worst-alternative', 0]])
    expect(blocked[0]!.ranking).toEqual([])
    expect(rows.filter((r) => !r.blocked).every((r) => r.ranking.length === 3)).toBe(true)
  })
  it('Monte Carlo skips draws the method cannot rank and counts them', () => {
    const q = makeProblem([[1, 3], [2, 1], [3, 2]], ['benefit', 'benefit'])
    const inner = rankerFor({ methodId: 'saw', params: {} })
    const picky: RankerFor = (prob) => {
      const rank = inner(prob)
      return (w) => {
        if (w[0]! > 0.8) throw new ProblemValidationError([{ code: 'all-worst-alternative', severity: 'error', row: 0 }])
        return rank(w)
      }
    }
    const res = monteCarlo(q, [0.5, 0.5], picky, { concentration: 'uniform', n: 1000, seed: 3 })
    expect(res.blocked).toBeGreaterThan(100)
    expect(res.blocked).toBeLessThan(300)
    expect(res.n).toBe(1000)
    for (const row of res.acceptability) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    expect(monteCarlo(q, [0.5, 0.5], inner, { concentration: 'uniform', n: 200 }).blocked).toBe(0)
  })
})
