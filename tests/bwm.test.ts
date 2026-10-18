import { describe, expect, it } from 'vitest'
import {
  bwm,
  bwmAnswers,
  bwmProgress,
  bwmSuggestion,
  emptyJudgements,
  judgementsFromBwm,
  liangThreshold,
  ProblemValidationError,
  setPair,
  type Judgements,
  type Problem,
} from '../src/core'
import f1 from './fixtures/bwm-rezaei2016-car.json'
import f2 from './fixtures/bwm-ratandhara-kumar.json'
import f3 from './fixtures/bwm-demir-bircan2020.json'
import f4 from './fixtures/bwm-arsu2021.json'
import oracle from './fixtures/bwm-lp-oracle.json'
import { getJudgementExample } from '../src/data/judgementExamples'
import { expectClose, step } from './helpers'

const problemOf = (n: number): Problem => ({
  alternatives: ['A1', 'A2'],
  criteria: Array.from({ length: n }, (_, j) => ({ name: `C${j + 1}`, type: 'benefit' as const })),
  matrix: [new Array<number>(n).fill(1), new Array<number>(n).fill(2)],
})
const run = (bo: number[], ow: number[], B: number, W: number) =>
  bwm.compute(problemOf(bo.length), {}, judgementsFromBwm(bo.length, B, W, bo, ow))
const xiOf = (r: ReturnType<typeof run>) => step(r.steps, 'bwm.xi').scalar!

describe('BWM: published fixtures', () => {
  it('F1 Rezaei 2016: all three cases vs expected (1e-6) and published (6e-5)', () => {
    for (const c of f1.cases) {
      const r = run(c.bestToOthers, c.othersToWorst, f1.best, f1.worst)
      const e = c.expected as { weights: number[]; xiL: number; crInput: number; mostInconsistent?: number; threshold?: number }
      expectClose(r.weights, e.weights, 1e-6, c.name)
      expectClose(xiOf(r), e.xiL, 1e-6, `${c.name} xi`)
      expectClose(r.diagnostics!.crInput!, e.crInput, 1e-6, `${c.name} crInput`)
      if (e.mostInconsistent !== undefined) expect(r.diagnostics!.mostInconsistent).toBe(e.mostInconsistent)
      expect(r.diagnostics!.crThreshold).toBe(0.2958)
      const p = c.published as { weights?: number[]; xiL?: number }
      if (p.weights) expectClose(r.weights, p.weights, f1.tolerance_vs_published, `${c.name} published`)
      if (p.xiL !== undefined) expectClose(xiOf(r), p.xiL, f1.tolerance_vs_published, `${c.name} published xi`)
    }
  })
  it('the method page example is Rezaei 2016 Ex3 from the fixture', () => {
    const ex3 = f1.cases.find((c) => c.name === 'ex3')!
    expect(bwmAnswers(getJudgementExample('rezaei-2016-car')!.judgements)).toEqual({
      best: f1.best,
      worst: f1.worst,
      bestToOthers: ex3.bestToOthers,
      othersToWorst: ex3.othersToWorst,
    })
  })
  it('F2 Ratandhara & Kumar: one case per closed-form branch', () => {
    f2.cases.forEach((c, k) => {
      const n = c.bestToOthers.length
      const r = run(c.bestToOthers, c.othersToWorst, 0, n - 1)
      expectClose(r.weights, c.expected.weights, 1e-6, c.name)
      expectClose(xiOf(r), c.expected.xiL, 1e-6, `${c.name} xi`)
      expectClose(xiOf(r), f2.published_xi[k]!, f2.tolerance_vs_published, `${c.name} published xi`)
    })
  })
  it('F3 Demir & Bircan 2020: weights match, CR^I 0.541667 over 0.3662 warns on K7', () => {
    const r = run(f3.bestToOthers, f3.othersToWorst, f3.best, f3.worst)
    expectClose(r.weights, f3.expected.weights, 1e-6)
    expectClose(r.weights, f3.published.weights, f3.tolerance_vs_published.weights)
    expectClose(xiOf(r), f3.expected.xiL, 1e-6)
    expectClose(xiOf(r), f3.published.xiL, f3.tolerance_vs_published.xiL)
    expectClose(r.diagnostics!.crInput!, f3.expected.crInput, 1e-6)
    expect(r.diagnostics!.crThreshold).toBe(f3.expected.threshold)
    expect(r.warnings).toContainEqual({ code: 'bwm.inconsistent', col: 6 })
  })
  it('F4 Arsu & Uğuz Arsu 2021: CR^I 0.333333 over 0.2819 warns on K1', () => {
    const r = run(f4.bestToOthers, f4.othersToWorst, f4.best, f4.worst)
    expectClose(r.weights, f4.expected.weights, 1e-6)
    expectClose(r.weights, f4.published.weights, f4.tolerance_vs_published)
    expectClose(xiOf(r), f4.expected.xiL, 1e-6)
    expectClose(r.diagnostics!.crInput!, f4.expected.crInput, 1e-6)
    expect(r.diagnostics!.crThreshold).toBe(f4.expected.threshold)
    expect(r.warnings).toContainEqual({ code: 'bwm.inconsistent', col: 0 })
  })
})

describe('BWM: closed form vs LP and properties', () => {
  it('matches the LP oracle on 50 random inputs to 1e-12', () => {
    expect(oracle.cases).toHaveLength(50)
    for (const c of oracle.cases) {
      const r = run(c.bestToOthers, c.othersToWorst, c.best, c.worst)
      expectClose(r.weights, c.weights, 1e-12)
      expectClose(xiOf(r), c.xi, 1e-12)
    }
  })
  it('properties on the oracle inputs: Σw = 1, w > 0, xi equals the largest deviation of w', () => {
    for (const { bestToOthers: bo, othersToWorst: ow, best: B, worst: W } of oracle.cases) {
      const r = run(bo, ow, B, W)
      const w = r.weights
      expect(Math.abs(w.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12)
      expect(w.every((x) => x > 0)).toBe(true)
      const dev = Math.max(...w.map((wj, j) => Math.max(Math.abs(w[B]! - bo[j]! * wj), Math.abs(wj - ow[j]! * w[W]!))))
      expectClose(xiOf(r), dev, 1e-12)
    }
  })
  it('consistent input: xi 0 and w ∝ othersToWorst', () => {
    const c = f1.cases[0]!
    const r = run(c.bestToOthers, c.othersToWorst, f1.best, f1.worst)
    expect(xiOf(r)).toBe(0)
    const s = c.othersToWorst.reduce((a, b) => a + b, 0)
    expectClose(r.weights, c.othersToWorst.map((x) => x / s), 1e-15)
  })
  it('permuting criteria permutes the weights', () => {
    const c = f1.cases[1]!
    const n = c.bestToOthers.length
    const rev = (v: number[]) => v.slice().reverse()
    const a = run(c.bestToOthers, c.othersToWorst, f1.best, f1.worst)
    const b = run(rev(c.bestToOthers), rev(c.othersToWorst), n - 1 - f1.best, n - 1 - f1.worst)
    expectClose(rev(b.weights), a.weights, 1e-15)
  })
  it('n = 2 gives (a_BW, 1) / (1 + a_BW)', () => {
    const r = run([1, 3], [3, 1], 0, 1)
    expectClose(r.weights, [0.75, 0.25], 1e-15)
    expect(xiOf(r)).toBe(0)
  })
  it('all ones: equal weights, xi 0, CR^I 0, no warning', () => {
    const r = run([1, 1, 1, 1], [1, 1, 1, 1], 0, 3)
    expectClose(r.weights, [0.25, 0.25, 0.25, 0.25], 1e-15)
    expect(xiOf(r)).toBe(0)
    expect(r.diagnostics!.crInput).toBe(0)
    expect(r.warnings).toEqual([])
  })
})

describe('BWM: thresholds, suggestion, answers, validation, progress', () => {
  it('liangThreshold', () => {
    expect(liangThreshold(8, 5)).toEqual({ value: 0.2958, approximate: false })
    expect(liangThreshold(9, 9)).toEqual({ value: 0.3662, approximate: false })
    expect(liangThreshold(7, 5)).toEqual({ value: 0.2819, approximate: false })
    expect(liangThreshold(2, 5)).toEqual({ value: 0, approximate: false })
    expect(liangThreshold(9, 12)).toEqual({ value: 0.3662, approximate: true })
    expect(liangThreshold(5, 2)).toBeNull()
  })
  it('n = 10 warns that the threshold is approximate', () => {
    const bo = [1, 2, 2, 2, 2, 2, 2, 2, 2, 4]
    const ow = [4, 2, 2, 2, 2, 2, 2, 2, 2, 1]
    expect(run(bo, ow, 0, 9).warnings).toContainEqual({ code: 'bwm.threshold-approximate' })
  })
  it('bwmSuggestion: a_BW 9, a_Bj 4, a_jW 4 → othersToWorst 2', () => {
    expect(bwmSuggestion([1, 4, 9], [9, 4, 1], 0, 2, 1)).toEqual({ side: 'othersToWorst', value: 2 })
  })
  it('bwmAnswers: an answer above a_BW or in AHP direction is unanswered; raising a_BW brings it back', () => {
    const c = f1.cases[1]!
    let j: Judgements = judgementsFromBwm(5, f1.best, f1.worst, c.bestToOthers, c.othersToWorst)
    j = setPair(j, 1, 4, 3)
    let a = bwmAnswers(j)!
    expect(a.bestToOthers[2]).toBeNull()
    expect(a.othersToWorst[0]).toBeNull()
    expect(a.bestToOthers[4]).toBe(3)
    a = bwmAnswers(setPair(j, 1, 4, 8))!
    expect(a.bestToOthers[2]).toBe(4)
    expect(a.othersToWorst[0]).toBe(4)
    // Price (B) over quality below 1: the AHP direction, not a BWM answer.
    expect(bwmAnswers(setPair(j, 1, 0, 0.5))!.bestToOthers[0]).toBeNull()
    expect(bwmAnswers({ ...j, best: null })).toBeNull()
    expect(bwmAnswers({ ...j, worst: j.best })).toBeNull()
  })
  it('throws anchors-missing and judgements-incomplete with the answered count', () => {
    const codeOf = (j: Judgements | undefined) => {
      try {
        bwm.compute(problemOf(5), {}, j)
      } catch (e) {
        expect(e).toBeInstanceOf(ProblemValidationError)
        return (e as ProblemValidationError).issues[0]
      }
      throw new Error('did not throw')
    }
    expect(codeOf(emptyJudgements(5))!.code).toBe('anchors-missing')
    expect(codeOf(undefined)!.code).toBe('anchors-missing')
    const j = setPair({ ...emptyJudgements(5), best: 1, worst: 4 }, 1, 4, 8)
    expect(codeOf(j)).toMatchObject({ code: 'judgements-incomplete', value: 1 })
    expect(() => bwm.compute(problemOf(1), {}, emptyJudgements(1))).toThrow(/too-few-criteria/)
  })
  it('bwmProgress: provisional bars after a_BW and best-to-others (F1 ex2)', () => {
    const c = f1.cases[1]!
    let j: Judgements = { ...emptyJudgements(5), best: f1.best, worst: f1.worst }
    c.bestToOthers.forEach((v, k) => k !== f1.best && (j = setPair(j, f1.best, k, v)))
    const p = bwmProgress(j, 5)
    expect(p).toMatchObject({ answered: 4, total: 7, provisional: true })
    expectClose(p.weights!, [0.226415, 0.45283, 0.113208, 0.150943, 0.056604], 1e-6)
    const full = bwmProgress(judgementsFromBwm(5, f1.best, f1.worst, c.bestToOthers, c.othersToWorst), 5)
    expect(full).toMatchObject({ answered: 7, provisional: false })
    expectClose(full.weights!, c.expected.weights, 1e-6)
    expect(bwmProgress(emptyJudgements(5), 5)).toMatchObject({ answered: 0, total: 7, weights: null })
  })
  it('bwmProgress: flags only over the threshold, with the suggestion', () => {
    const ex2 = f1.cases[1]!
    const ow = ex2.othersToWorst.slice()
    ow[2] = 8
    const p = bwmProgress(judgementsFromBwm(5, f1.best, f1.worst, ex2.bestToOthers, ow), 5)
    expectClose(p.crInput!, 0.428571, 1e-6)
    expect(p.threshold).toEqual({ value: 0.2958, approximate: false })
    expect(p.flagged).toBe(2)
    expect(p.suggestion).toEqual({ side: 'othersToWorst', value: 2 })
    const ex3 = f1.cases[2]!
    const q = bwmProgress(judgementsFromBwm(5, f1.best, f1.worst, ex3.bestToOthers, ex3.othersToWorst), 5)
    expectClose(q.crInput!, 0.142857, 1e-6)
    expect(q.flagged).toBeNull()
    expect(q.suggestion).toBeNull()
  })
})
