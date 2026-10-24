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
import en from '../src/i18n/compare.en.json'
import tr from '../src/i18n/compare.tr.json'
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
  it('reference example: fourteen rankings, MARCOS echoes SAW and is counted once in Borda, W and first place; CoCoSo, MABAC, MOORA, ARAS, CODAS, PROMETHEE II and ELECTRE III count', () => {
    const c = compareRankings(problem(), ex.weights!, allRuns)
    const all = c.runs.map((r) => r.result!.ranking)
    expect(all[6]).toEqual(all[1]) // MARCOS = SAW (Linear)
    expect(c.echoes).toEqual([{ methodId: 'marcos', of: 'saw' }])
    expect(c.ranked).toHaveLength(14)
    const rankings = [...all.slice(0, 6), all[7]!, all[8]!, all[9]!, all[10]!, all[11]!, all[12]!, all[13]!]
    expect(c.comparable).toBe(true)
    expect(rankings).toEqual([
      [1, 4, 6, 10, 7, 8, 2, 3, 5, 9],
      [1, 3, 6, 9, 7, 8, 2, 4, 5, 10],
      [2, 5, 7, 9, 6, 8, 1, 3, 4, 10],
      [1, 4, 6, 10, 7, 8, 2, 3, 5, 9],
      [1, 3, 6, 10, 7, 8, 2, 4, 5, 9],
      [1, 3, 6, 10, 7, 8, 2, 4, 5, 9],
      [1, 5, 7, 10, 6, 8, 2, 3, 4, 9],
      [1, 5, 7, 10, 6, 8, 2, 3, 4, 9], // MABAC = min-max weighted sum, here CoCoSo's order too
      [1, 4, 6, 10, 7, 8, 2, 3, 5, 9], // MOORA
      [1, 2, 6, 10, 7, 8, 3, 4, 5, 9], // ARAS
      [1, 2, 6, 9, 7, 8, 3, 4, 5, 10], // CODAS
      [1, 5, 7, 10, 6, 8, 2, 3, 4, 9], // PROMETHEE II (default V-shape = min-max weighted sum, same order as MABAC)
      [1, 5, 7, 9, 6, 8, 1, 3, 4, 9], // ELECTRE III
    ])
    expect(c.borda!.points[0]).toBe(116)
    expect(c.borda!.points[6]).toBe(104)
    expect(c.borda!.ranking[0]).toBe(1)
    expect(c.borda!.ranking[6]).toBe(2)
    expect(c.firstPlace).toEqual({ alternative: 0, methods: 12, of: 13 })
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
    // SAW, WASPAS, COPRAS, MARCOS, ARAS and CODAS all need positive values; CoCoSo, MABAC, MOORA, PROMETHEE II and ELECTRE III rank the zero.
    expect(c.runs.find((r) => r.methodId === 'cocoso')!.result).not.toBeNull()
    expect(c.runs.find((r) => r.methodId === 'mabac')!.result).not.toBeNull()
    expect(c.runs.find((r) => r.methodId === 'moora')!.result).not.toBeNull()
    expect(c.runs.find((r) => r.methodId === 'promethee-ii')!.result).not.toBeNull()
    expect(c.runs.find((r) => r.methodId === 'electre-iii')!.result).not.toBeNull()
    expect(c.runs.find((r) => r.methodId === 'waspas')!.result).toBeNull()
    expect(c.runs.find((r) => r.methodId === 'copras')!.result).toBeNull()
    expect(c.runs.find((r) => r.methodId === 'marcos')!.result).toBeNull()
    expect(c.runs.find((r) => r.methodId === 'aras')!.result).toBeNull()
    expect(c.runs.find((r) => r.methodId === 'codas')!.result).toBeNull()
    expect(c.echoes).toEqual([])
    expect(c.ranked).toHaveLength(8)
    expect(c.firstPlace!.of).toBe(8)
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

describe('compareRankings with method options', () => {
  it('MARCOS counts as its own method when SAW runs with the sum option', () => {
    const runs = allRuns.map((r) => (r.methodId === 'saw' ? { ...r, params: { normalization: 'sum' } } : r))
    const c = compareRankings(problem(), ex.weights!, runs)
    expect(c.echoes).toEqual([])
    expect(c.firstPlace!.of).toBe(14)
    // MARCOS is an independent method in the pair facts too (it can disagree with SAW 'sum').
    const f = pairFacts(problem(), ex.weights!, c, 0, 1)
    expect(f.methods.map((m) => m.methodId)).toContain('marcos')
    expect(c.kendallW).toBe(kendallW(c.runs.map((r) => r.result!.ranking)))
  })
  it('SAW and MARCOS alone are one ranking: nothing to compare', () => {
    const c = compareRankings(problem(), ex.weights!, [{ methodId: 'saw', params: {} }, { methodId: 'marcos', params: {} }])
    expect(c.ranked).toEqual(['saw', 'marcos'])
    expect(c.comparable).toBe(false)
    // The stage shows its own "only one ranking" message for exactly this case (echo + one counted run).
    expect(c.echoes.length > 0 && c.ranked.length - c.echoes.length === 1).toBe(true)
  })
  it('has an EN and a TR message for the one-ranking case', () => {
    expect(en.onlyOneRanking).toMatch(/^Only one ranking: MARCOS/)
    expect(tr.onlyOneRanking).toMatch(/MARCOS/)
  })
  it('runs WASPAS with the λ it is given, not the default', () => {
    const w = (lambda: number) =>
      compareRankings(problem(), ex.weights!, [{ methodId: 'topsis', params: {} }, { methodId: 'waspas', params: { lambda } }]).runs[1]!.result!
    expect(w(0).scores).toEqual(rankingMethods.find((m) => m.id === 'waspas')!.compute(problem(), ex.weights!, { lambda: 0 }).scores)
    expect(w(0).scores).not.toEqual(w(0.5).scores)
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
      { methodId: 'waspas', higher: 'a' },
      { methodId: 'copras', higher: 'a' },
      { methodId: 'cocoso', higher: 'a' },
      { methodId: 'mabac', higher: 'a' },
      { methodId: 'moora', higher: 'a' },
      { methodId: 'aras', higher: 'a' },
      { methodId: 'codas', higher: 'a' },
      { methodId: 'promethee-ii', higher: 'a' },
      { methodId: 'electre-iii', higher: 'tie' },
    ])
    // MARCOS echoes SAW, so it is not a second voice in the pair's method list.
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
    expect(f.vikorRegret).toMatchObject({ a: 2, b: 2 })
    expect(f.vikorRegret!.ra).toBeCloseTo(0.0473, 4)
    expect(f.vikorRegret!.rb).toBeCloseTo(0.035, 4)
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
    echoes: [],
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
