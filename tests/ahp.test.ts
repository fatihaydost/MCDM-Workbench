import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ahp,
  ahpEigenvector,
  ahpGeometricMean,
  ahpIncompleteLlsm,
  ahpProgress,
  emptyJudgements,
  judgementsFromUpper,
  ProblemValidationError,
  RI_SAATY,
  setPair,
  type Problem,
} from '../src/core'
import { getJudgementExample } from '../src/data/judgementExamples'

const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

const saaty = load('ahp-saaty2008-job.json')
const doguc = load('ahp-doguc2022-recruitment.json')
const bozoki = load('ahp-bozoki2010-incomplete.json')

const prob = (n: number): Problem => ({
  alternatives: ['A1', 'A2'],
  criteria: Array.from({ length: n }, (_, k) => ({ name: `C${k + 1}`, type: 'benefit' as const })),
  matrix: [new Array<number>(n).fill(1), new Array<number>(n).fill(2)],
})

describe('AHP — Saaty (2008)', () => {
  for (const c of saaty.cases) {
    it(c.name, () => {
      const n = c.criteria.length
      const j = judgementsFromUpper(n, c.upper)
      const ev = ahp.compute(prob(n), { aggregation: 'eigenvector' }, j)
      const gm = ahp.compute(prob(n), { aggregation: 'geometric' }, j)

      c.expected.weights_eigenvector.forEach((w: number, k: number) => expect(ev.weights[k]).toBeCloseTo(w, 6))
      c.expected.weights_geometric.forEach((w: number, k: number) => expect(gm.weights[k]).toBeCloseTo(w, 6))
      c.published.weights.forEach((w: number, k: number) =>
        expect(Math.abs(ev.weights[k]! - w)).toBeLessThanOrEqual(saaty.tolerance_vs_published),
      )
      expect(ev.diagnostics?.lambdaMax).toBeCloseTo(c.expected.lambda_max, 6)
      expect(ev.diagnostics?.ci).toBeCloseTo(c.expected.ci, 6)
      expect(ev.diagnostics?.cr).toBeCloseTo(c.expected.cr, 6)
      if (c.published.cr !== undefined) {
        expect(Math.abs((ev.diagnostics?.cr ?? 0) - c.published.cr)).toBeLessThanOrEqual(saaty.tolerance_vs_published)
      }
      expect(ev.warnings ?? []).toEqual([])

      const p = ahpProgress(prob(n), j, { aggregation: 'eigenvector' })
      expect(p.answered).toBe((n * (n - 1)) / 2)
      expect(p.total).toBe((n * (n - 1)) / 2)
      expect(p.provisional).toBe(false)
      expect(p.inconsistent).toBe(false)
      expect([p.worstPair?.i, p.worstPair?.k]).toEqual(c.expected.worst_pair)
      expect(p.worstPair?.epsilon).toBeCloseTo(c.expected.epsilon_max, 5)
      expect(p.worstPair?.suggested).toBeCloseTo(c.expected.suggested, 9)
    })
  }

  it('the method page example is Saaty (2008) Table 3 from the fixture', () => {
    const ex = getJudgementExample('saaty-2008-job')!
    const r = ahp.compute(prob(5), {}, ex.judgements)
    saaty.expected.weights_eigenvector.forEach((w: number, k: number) => expect(r.weights[k]).toBeCloseTo(w, 6))
  })

  it('for n = 3, eigenvector and geometric mean weights coincide', () => {
    const c3 = saaty.cases.find((x: { name: string }) => x.name === 'saaty_2008_flexibility_3x3')!
    const j = judgementsFromUpper(3, c3.upper)
    const ev = ahp.compute(prob(3), { aggregation: 'eigenvector' }, j)
    const gm = ahp.compute(prob(3), { aggregation: 'geometric' }, j)
    ev.weights.forEach((w, k) => expect(w).toBeCloseTo(gm.weights[k]!, 12))
  })
})

describe('AHP — Doğuç (2022) recruitment', () => {
  it('computes eigenvector and geometric weights, Perron CR and worstPair [0, 2]', () => {
    const n = doguc.criteria.length
    const j = judgementsFromUpper(n, doguc.upper)
    const ev = ahp.compute(prob(n), { aggregation: 'eigenvector' }, j)
    const gm = ahp.compute(prob(n), { aggregation: 'geometric' }, j)

    doguc.expected.weights_eigenvector.forEach((w: number, k: number) => expect(ev.weights[k]).toBeCloseTo(w, 6))
    doguc.expected.weights_geometric.forEach((w: number, k: number) => expect(gm.weights[k]).toBeCloseTo(w, 6))
    expect(ev.diagnostics?.lambdaMax).toBeCloseTo(doguc.expected.lambda_max, 6)
    expect(ev.diagnostics?.ci).toBeCloseTo(doguc.expected.ci, 6)
    expect(ev.diagnostics?.cr).toBeCloseTo(doguc.expected.cr, 6)

    const p = ahpProgress(prob(n), j)
    expect(p.inconsistent).toBe(false)
    expect([p.worstPair?.i, p.worstPair?.k]).toEqual(doguc.expected.worst_pair)
    expect(p.worstPair?.epsilon).toBeCloseTo(doguc.expected.epsilon_max, 5)
    expect(p.worstPair?.suggested).toBeCloseTo(doguc.expected.suggested, 9)
  })
})

describe('AHP — Bozóki et al. (2010) incomplete LLSM', () => {
  it('reproduces the published incomplete LLSM weights from 16 of 28 pairs (8x8)', () => {
    const n = bozoki.criteria.length
    const j = judgementsFromUpper(n, bozoki.upper)
    const w = ahpIncompleteLlsm(n, j.pairs)!
    bozoki.expected.weights_llsm.forEach((exp: number, k: number) => expect(w[k]).toBeCloseTo(exp, 6))
    bozoki.published.weights_llsm.forEach((pub: number, k: number) =>
      expect(Math.abs(w[k]! - pub)).toBeLessThanOrEqual(bozoki.tolerance_vs_published),
    )

    const p = ahpProgress(prob(n), j)
    expect(p.answered).toBe(bozoki.expected.known_pairs)
    expect(p.total).toBe(bozoki.expected.total_pairs)
    expect(p.provisional).toBe(true)
    bozoki.expected.weights_llsm.forEach((exp: number, k: number) => expect(p.weights![k]).toBeCloseTo(exp, 6))
  })
})

describe('AHP — edge cases, warnings and steps', () => {
  it('has the 15 Saaty Random Index entries', () => {
    expect(RI_SAATY.slice(1, 16)).toEqual([0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51, 1.48, 1.56, 1.57, 1.59])
  })

  it('n = 2: CI = 0, CR = 0, no inconsistency warning, exact ratio weights', () => {
    const j = judgementsFromUpper(2, [4])
    const r = ahp.compute(prob(2), {}, j)
    expect(r.weights[0]).toBeCloseTo(0.8, 12)
    expect(r.weights[1]).toBeCloseTo(0.2, 12)
    expect(r.diagnostics).toEqual({ lambdaMax: 2, ci: 0, cr: 0 })
    expect(r.warnings).toBeUndefined()
    const p = ahpProgress(prob(2), j)
    expect(p.threshold).toBeNull()
    expect(p.inconsistent).toBe(false)
    expect(p.worstPair).toBeNull()
  })

  it('all equal judgements give equal weights, CR = 0 and no worstPair', () => {
    const j = judgementsFromUpper(4, [1, 1, 1, 1, 1, 1])
    const r = ahp.compute(prob(4), {}, j)
    r.weights.forEach((w) => expect(w).toBeCloseTo(0.25, 12))
    expect(r.diagnostics?.lambdaMax).toBeCloseTo(4, 12)
    expect(r.diagnostics?.ci).toBeCloseTo(0, 12)
    expect(r.diagnostics?.cr).toBeCloseTo(0, 12)
    expect(ahpProgress(prob(4), j).worstPair).toBeNull()
  })

  it('emits ahp.inconsistent when CR >= 0.10 and identifies the planted wrong pair', () => {
    // Saaty's house triad [3, 3, 3]: A > B by 3, B > C by 3, but A > C by 3 instead of 9 -> CR ~ 0.117 >= 0.10.
    const j = judgementsFromUpper(3, [3, 3, 3])
    const r = ahp.compute(prob(3), {}, j)
    expect(r.diagnostics?.cr).toBeGreaterThanOrEqual(0.1)
    expect(r.warnings).toEqual([{ code: 'ahp.inconsistent' }])
    const p = ahpProgress(prob(3), j)
    expect(p.inconsistent).toBe(true)
    expect(p.worstPair).not.toBeNull()
  })

  it('emits ahp.many-criteria when n >= 8 and not when n = 7', () => {
    const j7 = judgementsFromUpper(7, new Array<number>(21).fill(1))
    expect(ahp.compute(prob(7), {}, j7).warnings).toBeUndefined()
    const j8 = judgementsFromUpper(8, new Array<number>(28).fill(1))
    expect(ahp.compute(prob(8), {}, j8).warnings).toEqual([{ code: 'ahp.many-criteria' }])
  })

  it('returns the five expected steps in order', () => {
    const j = judgementsFromUpper(3, [2, 4, 2])
    const r = ahp.compute(prob(3), {}, j)
    expect(r.steps.map((s) => s.key)).toEqual([
      'ahp.pairwiseMatrix',
      'ahp.lambdaMax',
      'ahp.consistencyIndex',
      'ahp.consistencyRatio',
      'ahp.weights',
    ])
  })

  it('ahpProgress leaves unanswered criteria as NaN until they have at least one comparison', () => {
    let j = emptyJudgements(4)
    expect(ahpProgress(prob(4), j).weights).toBeNull()
    j = setPair(j, 0, 1, 3)
    const p1 = ahpProgress(j, 4)
    expect(p1.answered).toBe(1)
    expect(p1.provisional).toBe(true)
    expect(p1.weights![0]).toBeCloseTo(0.75, 12)
    expect(p1.weights![1]).toBeCloseTo(0.25, 12)
    expect(Number.isNaN(p1.weights![2]!)).toBe(true)
    expect(Number.isNaN(p1.weights![3]!)).toBe(true)
  })

  it('throws ProblemValidationError on too few criteria or incomplete judgements', () => {
    expect(() => ahp.compute(prob(1), {}, emptyJudgements(1))).toThrowError(ProblemValidationError)
    let j = emptyJudgements(3)
    j = setPair(j, 0, 1, 2)
    j = setPair(j, 1, 2, 3)
    try {
      ahp.compute(prob(3), {}, j)
      expect.fail('expected ProblemValidationError')
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemValidationError)
      expect((err as ProblemValidationError).issues).toEqual([{ code: 'judgements-incomplete', severity: 'error', value: 2 }])
    }
  })

  it('ahpEigenvector and ahpGeometricMean agree on a consistent 4x4 matrix', () => {
    const wTrue = [0.5, 0.25, 0.15, 0.1]
    const A = wTrue.map((wi) => wTrue.map((wk) => wi / wk))
    const ev = ahpEigenvector(A)
    const gm = ahpGeometricMean(A)
    wTrue.forEach((w, i) => {
      expect(ev.weights[i]).toBeCloseTo(w, 12)
      expect(gm.weights[i]).toBeCloseTo(w, 12)
    })
    expect(ev.lambdaMax).toBeCloseTo(4, 12)
    expect(gm.lambdaMax).toBeCloseTo(4, 12)
  })

  it('ahpWorstPair avoids suggested === actual lock-up on inconsistent triads like [9, 9, 9]', () => {
    const j = judgementsFromUpper(3, [9, 9, 9])
    const p = ahpProgress(prob(3), j)
    expect(p.inconsistent).toBe(true)
    expect(p.worstPair).not.toBeNull()
    expect(p.worstPair!.suggested).not.toBeCloseTo(p.worstPair!.actual, 6)
  })
})
