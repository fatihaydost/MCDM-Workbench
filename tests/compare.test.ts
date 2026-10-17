import { describe, expect, it } from 'vitest'
import { bordaCount, compareRankings, kendallW, rankingMethods, type Problem } from '../src/core'
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
