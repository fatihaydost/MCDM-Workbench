import { describe, expect, it } from 'vitest'
import { emptyJudgements, judgementsFromBwm, setPair, type Judgements } from '../../core'
import { ahpQuestions, answerOf, bwmQuestions, modeFor, nextUnanswered, progress } from './pairwiseQueue'

const ab = (qs: { a: number; b: number }[]) => qs.map((q) => [q.a, q.b])

describe('pairwiseQueue', () => {
  it('AHP order: spanning path first, then by distance', () => {
    expect(ab(ahpQuestions(4))).toEqual([[0, 1], [1, 2], [2, 3], [0, 2], [1, 3], [0, 3]])
    expect(ab(ahpQuestions(2))).toEqual([[0, 1]])
    expect(ahpQuestions(15)).toHaveLength(105)
  })

  it('BWM order: anchor, best to others, others to worst', () => {
    const qs = bwmQuestions(5, 1, 4)
    expect(ab(qs)).toEqual([[1, 4], [1, 0], [1, 2], [1, 3], [0, 4], [2, 4], [3, 4]])
    expect(qs.every((q) => q.fixed === 'a')).toBe(true)
    expect(ab(bwmQuestions(2, 1, 0))).toEqual([[1, 0]])
    expect(bwmQuestions(9, 0, 8)).toHaveLength(15)
  })

  it('BWM cap: an answer above a_BW is unanswered until a_BW is raised', () => {
    const q12 = { a: 1, b: 2, fixed: 'a' as const }
    const q10 = { a: 1, b: 0, fixed: 'a' as const }
    let j = setPair(judgementsFromBwm(5, 1, 4, [2, 1, 4, 3, 8], [4, 8, 2, 3, 1]), 1, 4, 3)
    expect(answerOf(q12, j.pairs, modeFor(q12, j))).toBeNull()
    expect(answerOf(q10, j.pairs, modeFor(q10, j))).toBe(2)
    j = setPair(j, 1, 4, 8)
    expect(answerOf(q12, j.pairs, modeFor(q12, j))).toBe(4)
  })

  it('BWM ignores answers in the other direction', () => {
    const j = { ...setPair(emptyJudgements(3), 1, 0, 0.5), best: 1, worst: 2 }
    const q = { a: 1, b: 0, fixed: 'a' as const }
    expect(answerOf(q, j.pairs, modeFor(q, j))).toBeNull()
    expect(answerOf(q, j.pairs, { kind: 'ahp' })).toBe(0.5)
  })

  it('nextUnanswered wraps and ends with null', () => {
    const qs = ahpQuestions(3)
    const ahp = () => ({ kind: 'ahp' as const })
    let j = setPair(setPair(emptyJudgements(3), 0, 1, 2), 1, 2, 3)
    expect(nextUnanswered(qs, j.pairs, ahp, 0)).toBe(2)
    expect(nextUnanswered(qs, j.pairs, ahp, 2)).toBe(2)
    j = setPair(j, 0, 2, 4)
    expect(nextUnanswered(qs, j.pairs, ahp, 0)).toBeNull()
  })

  it('progress counts answered over total', () => {
    const qs = bwmQuestions(5, 1, 4)
    let j: Judgements = { ...emptyJudgements(5), best: 1, worst: 4 }
    for (const [k, v] of [[4, 5], [0, 2], [2, 1], [3, 3]] as const) j = setPair(j, 1, k, v)
    expect(progress(qs, j.pairs, (q) => modeFor(q, j))).toEqual({ answered: 4, total: 7 })
  })
})
