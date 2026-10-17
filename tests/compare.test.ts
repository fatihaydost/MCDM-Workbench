import { describe, expect, it } from 'vitest'
import {
  bordaCount,
  compareRankings,
  defaultPair,
  identicalRankings,
  kendallW,
  pairFacts,
  rankingMethods,
  type Comparison,
  type Problem,
} from '../src/core'
import { getExample } from '../src/data/examples'

const ex = getExample('keshavarz-2015-ten-alternatives')!
const problem = (): Problem => ({
  alternatives: ex.alternatives,
  criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
  matrix: ex.matrix.map((r) => [...r]),
})
const allRuns = rankingMethods.map((m) => ({ methodId: m.id, params: {} }))

describe('bordaCount', () => {
  it('sums n - rank', () => {
    expect(bordaCount([[1, 2, 3], [2, 1, 3], [1, 3, 2]])).toEqual({ points: [5, 3, 1], ranking: [1, 2, 3] })
  })
  it('shares tied ranks', () => {
    expect(bordaCount([[1, 2], [2, 1]])).toEqual({ points: [1, 1], ranking: [1, 1] })
  })
})

describe('kendallW', () => {
  it('is 1 for identical and 0 for opposed rankings', () => {
    expect(kendallW([[1, 2, 3], [1, 2, 3]])).toBe(1)
    expect(kendallW([[1, 2, 3], [3, 2, 1]])).toBe(0)
  })
  it('matches the guide formula without ties', () => {
    const rs = [[1, 2, 3, 4], [1, 3, 2, 4], [2, 1, 3, 4]]
    const m = 3
    const n = 4
    const sums = [0, 1, 2, 3].map((i) => rs.reduce((s, r) => s + r[i]!, 0))
    const mean = sums.reduce((a, b) => a + b, 0) / n
    const S = sums.reduce((s, x) => s + (x - mean) ** 2, 0)
    expect(kendallW(rs)).toBeCloseTo((12 * S) / (m * m * (n ** 3 - n)), 12)
  })
  it('applies the tie correction', () => {
    // mid-ranks [1.5, 1.5, 3] and [1, 2, 3]: S = 6.5, T = 6, W = 78 / (4 * 24 - 2 * 6)
    expect(kendallW([[1, 1, 3], [1, 2, 3]])).toBeCloseTo(78 / 84, 12)
  })
})

describe('compareRankings', () => {
  it('reference example: four rankings, Borda, W, first place', () => {
    const c = compareRankings(problem(), ex.weights!, allRuns)
    const rankings = c.runs.map((r) => r.result!.ranking)
    expect(c.comparable).toBe(true)
    expect(rankings).toEqual([
      [1, 4, 6, 10, 7, 8, 2, 3, 5, 9],
      [1, 3, 6, 9, 7, 8, 2, 4, 5, 10],
      [2, 5, 7, 9, 6, 8, 1, 3, 4, 10],
      [1, 4, 6, 10, 7, 8, 2, 3, 5, 9],
    ])
    expect(c.borda!.points[0]).toBe(35)
    expect(c.borda!.points[6]).toBe(33)
    expect(c.borda!.ranking[0]).toBe(1)
    expect(c.borda!.ranking[6]).toBe(2)
    expect(c.firstPlace).toEqual({ alternative: 0, methods: 3, of: 4 })
    expect(c.kendallW).toBe(kendallW(rankings))
    expect(c.kendallW!).toBeGreaterThan(0.9)
    expect(c.kendallW!).toBeLessThanOrEqual(1)
  })
  it('leaves out a method that cannot rank', () => {
    const p = problem()
    p.matrix[0]![0] = 0
    const c = compareRankings(p, ex.weights!, allRuns)
    const saw = c.runs.find((r) => r.methodId === 'saw')!
    expect(saw.result).toBeNull()
    expect(saw.issues.some((i) => i.code === 'non-positive-value')).toBe(true)
    expect(c.ranked).toHaveLength(3)
    expect(c.firstPlace!.of).toBe(3)
  })
  it('is not comparable with fewer than two ranked methods', () => {
    const p = problem()
    p.matrix[0]![0] = 0
    const c = compareRankings(p, ex.weights!, [
      { methodId: 'saw', params: {} },
      { methodId: 'topsis', params: {} },
    ])
    expect(c.ranked).toEqual(['topsis'])
    expect(c.comparable).toBe(false)
    expect(c.borda).toBeNull()
    expect(c.kendallW).toBeNull()
  })
})

describe('pair facts', () => {
  const c = () => compareRankings(problem(), ex.weights!, allRuns)

  it('defaultPair is Borda rank 1 and the next', () => {
    expect(defaultPair(c())).toEqual([0, 6])
    const p = problem()
    p.matrix[0]![0] = 0
    expect(defaultPair(compareRankings(p, ex.weights!, [{ methodId: 'saw', params: {} }]))).toBeNull()
  })

  it('reference pair A1 vs A7: each method side, criteria, VIKOR regret', () => {
    const f = pairFacts(problem(), ex.weights!, c(), 0, 6)
    expect([f.a, f.b]).toEqual([0, 6])
    expect(f.methods).toEqual([
      { methodId: 'topsis', higher: 'a' },
      { methodId: 'saw', higher: 'a' },
      { methodId: 'vikor', higher: 'b' },
      { methodId: 'edas', higher: 'a' },
    ])
    expect(f.unanimous).toBe(false)
    expect(f.criteria.length).toBeGreaterThanOrEqual(1)
    expect(f.criteria.length).toBeLessThanOrEqual(3)
    const m = ex.matrix
    for (const { col, better } of f.criteria) {
      const diff = m[0]![col]! - m[6]![col]!
      const aWins = ex.criteria[col]!.type === 'benefit' ? diff > 0 : diff < 0
      expect(better).toBe(aWins ? 'a' : 'b')
    }
    // Row maxima of w_j (best_j - x_ij) / (best_j - worst_j), worked out by hand: A1 max 0.0473 at C3 (index 2),
    // A7 max 0.0350 at C3 (index 2); next largest: A1 C5 0.0282, A7 C1 0.0333.
    expect(f.vikorRegret).toEqual({ a: 2, b: 2 })
  })

  it('swaps so that a is the Borda-higher alternative', () => {
    const f = pairFacts(problem(), ex.weights!, c(), 6, 0)
    expect([f.a, f.b]).toEqual([0, 6])
  })

  it('orders criteria by weight times normalised difference', () => {
    // ranges: col0 10, col1 4, col2 0 (constant, never listed). A vs B: col0 0.2, col1 0.25
    const p: Problem = {
      alternatives: ['A', 'B', 'C'],
      criteria: [
        { name: 'x', type: 'benefit' },
        { name: 'y', type: 'cost' },
        { name: 'z', type: 'benefit' },
      ],
      matrix: [[10, 4, 5], [0, 2, 5], [5, 6, 5]],
    }
    const w = [0.2, 0.5, 0.3]
    const cmp = compareRankings(p, w, [{ methodId: 'topsis', params: {} }, { methodId: 'saw', params: {} }])
    const f = pairFacts(p, w, cmp, 0, 1)
    const aIsA = f.a === 0
    expect(f.criteria).toEqual([
      { col: 1, better: aIsA ? 'b' : 'a' },
      { col: 0, better: aIsA ? 'a' : 'b' },
    ])
  })

  const fake = (rankings: Record<string, number[]>): Comparison => ({
    runs: Object.entries(rankings).map(([methodId, ranking]) => ({
      methodId,
      result: { ranking } as never,
      issues: [],
    })),
    ranked: Object.keys(rankings),
    comparable: true,
    borda: bordaCount(Object.values(rankings)),
    kendallW: null,
    firstPlace: null,
  })
  const p3: Problem = {
    alternatives: ['A', 'B', 'C'],
    criteria: [{ name: 'x', type: 'benefit' }],
    matrix: [[3], [2], [1]],
  }

  it('reports a tie as tie and not unanimous when another method disagrees', () => {
    const f = pairFacts(p3, [1], fake({ x: [1, 1, 3], y: [1, 2, 3] }), 0, 1)
    expect(f.methods).toEqual([
      { methodId: 'x', higher: 'tie' },
      { methodId: 'y', higher: 'a' },
    ])
    expect(f.unanimous).toBe(false)
  })

  it('is unanimous when every method ties the pair', () => {
    const f = pairFacts(p3, [1], fake({ x: [1, 1, 3], y: [2, 2, 1] }), 0, 1)
    expect(f.unanimous).toBe(true)
  })

  it('identicalRankings', () => {
    const p: Problem = {
      alternatives: ['A', 'B', 'C'],
      criteria: [{ name: 'x', type: 'benefit' }, { name: 'y', type: 'benefit' }],
      matrix: [[3, 3], [2, 2], [1, 1]],
    }
    expect(identicalRankings(compareRankings(p, [0.5, 0.5], allRuns))).toBe(true)
    expect(identicalRankings(c())).toBe(false)
  })
})
