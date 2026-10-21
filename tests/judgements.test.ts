import { describe, expect, it } from 'vitest'
import { emptyJudgements, judgementsFromBwm, remapJudgements, sanitizeJudgements, SCALE, setPair, toScale } from '../src/core'

describe('judgements', () => {
  it('has the 17 scale values', () => {
    expect(SCALE).toHaveLength(17)
    expect(SCALE[0]).toBeCloseTo(1 / 9, 15); expect(SCALE[8]).toBe(1); expect(SCALE[16]).toBe(9)
    expect(toScale(0.5000000001)).toBe(0.5); expect(toScale(10)).toBeNull(); expect(toScale(2.5)).toBeNull(); expect(toScale('3')).toBeNull()
  })
  it('setPair keeps reciprocity and the diagonal', () => {
    const j = setPair(emptyJudgements(3), 0, 2, 4)
    expect(j.pairs[0]![2]).toBe(4); expect(j.pairs[2]![0]).toBe(0.25); expect(j.pairs[1]![1]).toBe(1)
    expect(setPair(j, 0, 2, null).pairs[2]![0]).toBeNull()
  })
  it('remapJudgements permutes rows and columns, drops and adds', () => {
    const j = { ...judgementsFromBwm(3, 0, 2, [1, 2, 4], [4, 2, 1]) }
    const r = remapJudgements(j, [2, undefined, 0]) // new 0 = old 2, new 1 = new criterion, new 2 = old 0
    expect(r.pairs[2]![0]).toBe(4); expect(r.pairs[0]![2]).toBe(0.25); expect(r.pairs[1]![0]).toBeNull()
    expect(r.best).toBe(2); expect(r.worst).toBe(0)
    expect(remapJudgements(j, [1, 2]).best).toBeNull() // old best (0) is gone
  })
  it('sanitizeJudgements repairs hand-edited state', () => {
    const s = sanitizeJudgements({ pairs: [[1, 7, 11], [0.5, 1]], best: 1, worst: 1 }, 3)
    expect(s.pairs).toEqual([[1, 7, null], [1 / 7, 1, null], [null, null, 1]]) // upper wins, 11 off-scale, refit to 3
    expect(s.best).toBeNull(); expect(s.worst).toBeNull()
    expect(sanitizeJudgements(undefined, 2)).toEqual(emptyJudgements(2))
    expect(sanitizeJudgements({ pairs: [], best: 5, worst: 0 }, 3).best).toBeNull()
  })
})
