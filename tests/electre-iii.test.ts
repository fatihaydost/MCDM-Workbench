import { describe, expect, it } from 'vitest'
import {
  electreIII,
  electreIIIDistill,
  electreIIIIncomparablePairs,
  getMethod,
  getRankingMethod,
  ProblemValidationError,
  type CriterionType,
  type Problem,
  type ThresholdSpec,
} from '../src/core'
import { getExample } from '../src/data/examples'
import wang from './fixtures/electre-iii-wang2008.json'

function makeWangProblem(): Problem {
  return {
    alternatives: [...wang.alternatives],
    criteria: wang.criteria.map((c) => ({ name: c.name, type: c.type as CriterionType })),
    matrix: wang.matrix.map((row) => [...row]),
  }
}

describe('ELECTRE III — registry & metadata', () => {
  it('is registered as a ranking method with thresholdPreset parameter', () => {
    const m = getRankingMethod('electre-iii')
    expect(m).toBeDefined()
    expect(m?.id).toBe('electre-iii')
    expect(m?.kind).toBe('ranking')
    expect(getMethod('electre-iii')).toBe(m)
    expect(m?.params).toEqual([
      {
        key: 'thresholdPreset',
        kind: 'choice',
        options: ['standard', 'strict', 'veto'],
        default: 'standard',
      },
    ])
  })
})

describe('ELECTRE III — Wang & Triantaphyllou (2008) §3.2 full verification', () => {
  const problem = makeWangProblem()
  const q = wang.q as unknown as readonly ThresholdSpec[]
  const p = wang.p as unknown as readonly ThresholdSpec[]
  const res = electreIII.compute(problem, [...wang.weights], {
    q,
    p,
    alpha: wang.distillation.alpha,
    beta: wang.distillation.beta,
  })

  it('reproduces all 110 off-diagonal cells of Table 3 credibility matrix within ±0.005', () => {
    const credStep = res.steps.find((s) => s.key === 'electre-iii.credibility')
    const concStep = res.steps.find((s) => s.key === 'electre-iii.concordance')
    expect(credStep?.matrix).toBeDefined()
    expect(concStep?.matrix).toBeDefined()

    const cred = credStep!.matrix!
    const conc = concStep!.matrix!
    const m = problem.alternatives.length

    for (let a = 0; a < m; a++) {
      expect(cred[a]![a]).toBe(0)
      expect(conc[a]![a]).toBe(0)
      for (let b = 0; b < m; b++) {
        if (a === b) continue
        // Without veto thresholds, credibility equals global concordance
        expect(cred[a]![b]).toBeCloseTo(conc[a]![b]!, 12)
        const expected = wang.expected.credibility[a]![b]!
        expect(Math.abs(cred[a]![b]! - expected), `σ(A${a + 1}, A${b + 1})`).toBeLessThanOrEqual(wang.expected.tolerance)
      }
    }
  })

  it('reproduces the exact descending and ascending distillation classes and competition ranks', () => {
    const cred = res.steps.find((s) => s.key === 'electre-iii.credibility')!.matrix!
    const dist = electreIIIDistill(cred, wang.distillation.alpha, wang.distillation.beta)

    const descNames = dist.descendingClasses.map((cls) => cls.map((i) => problem.alternatives[i]!))
    const ascNames = dist.ascendingClasses.map((cls) => cls.map((i) => problem.alternatives[i]!))

    expect(descNames).toEqual(wang.expected.descendingClasses)
    expect(ascNames).toEqual(wang.expected.ascendingClasses)

    const descStep = res.steps.find((s) => s.key === 'electre-iii.descending')!
    const ascStep = res.steps.find((s) => s.key === 'electre-iii.ascending')!
    expect(descStep.vector).toEqual(wang.expected.descendingRanks)
    expect(ascStep.vector).toEqual(wang.expected.ascendingRanks)
  })

  it('identifies incomparable pairs including (A7, A9) and ranks A7 and A9 jointly at 1st place', () => {
    const desc = res.steps.find((s) => s.key === 'electre-iii.descending')!.vector!
    const asc = res.steps.find((s) => s.key === 'electre-iii.ascending')!.vector!
    const pairs = electreIIIIncomparablePairs(desc, asc)

    expect(pairs).toContainEqual([6, 8])
    expect(res.ranking[6]).toBe(1) // A7
    expect(res.ranking[8]).toBe(1) // A9
    expect(res.ranking).toEqual(wang.expected.ranking)
  })

  it('computes net credibility flows Φ(a) matching step 5 and summing to zero', () => {
    const netStep = res.steps.find((s) => s.key === 'electre-iii.netCredibility')!
    expect(netStep.vector).toEqual(res.scores)
    expect(res.order).toBe('desc')

    for (let i = 0; i < problem.alternatives.length; i++) {
      expect(res.scores[i]).toBeCloseTo(wang.expected.netCredibility[i]!, 5)
    }
    const totalNet = res.scores.reduce((acc, v) => acc + v, 0)
    expect(totalNet).toBeCloseTo(0, 12)
  })

  it('matches the wang-2008-waste-incineration example dataset in src/data/examples.ts', () => {
    const ex = getExample('wang-2008-waste-incineration')
    expect(ex).toBeDefined()
    expect(ex!.alternatives).toEqual(wang.alternatives)
    expect(ex!.matrix).toEqual(wang.matrix)
    expect(ex!.weights).toEqual(wang.weights)
  })
})

describe('ELECTRE III — Wang & Triantaphyllou (2008) §3.2 modified case (rank reversal)', () => {
  it('shifts A7 to sole 1st place above A9 when A1 is replaced by a modified worse alternative', () => {
    const problem = makeWangProblem()
    problem.matrix[wang.modifiedCase.replaceRow] = [...wang.modifiedCase.with]

    const q = wang.q as unknown as readonly ThresholdSpec[]
    const p = wang.p as unknown as readonly ThresholdSpec[]
    const res = electreIII.compute(problem, [...wang.weights], {
      q,
      p,
      alpha: wang.distillation.alpha,
      beta: wang.distillation.beta,
    })

    const cred = res.steps.find((s) => s.key === 'electre-iii.credibility')!.matrix!
    const dist = electreIIIDistill(cred, wang.distillation.alpha, wang.distillation.beta)

    const descNames = dist.descendingClasses.map((cls) => cls.map((i) => problem.alternatives[i]!))
    const ascNames = dist.ascendingClasses.map((cls) => cls.map((i) => problem.alternatives[i]!))

    expect(descNames).toEqual(wang.modifiedCase.descendingClasses)
    expect(ascNames).toEqual(wang.modifiedCase.ascendingClasses)
    expect(dist.descending).toEqual(wang.modifiedCase.descendingRanks)
    expect(dist.ascending).toEqual(wang.modifiedCase.ascendingRanks)

    // Rank reversal: A7 is now uniquely ranked 1st, while A9 drops to 2nd
    expect(res.ranking[6]).toBe(1)
    expect(res.ranking[8]).toBe(2)
    expect(res.ranking).toEqual(wang.modifiedCase.ranking)
  })
})

describe('ELECTRE III — Discordance and Veto unit verification', () => {
  const vCase = wang.vetoUnitCase
  const problem: Problem = {
    alternatives: [...vCase.alternatives],
    criteria: vCase.criteria.map((c) => ({ name: c.name, type: c.type as CriterionType })),
    matrix: vCase.matrix.map((row) => [...row]),
  }

  it('attenuates credibility σ(A1, A2) = 0.5 when partial discordance d_2 = 4/6 > C(A1, A2) = 0.6', () => {
    const res = electreIII.compute(problem, [...vCase.weights], {
      q: vCase.q,
      p: vCase.p,
      v: vCase.vPartial,
    })

    const conc = res.steps.find((s) => s.key === 'electre-iii.concordance')!.matrix!
    const cred = res.steps.find((s) => s.key === 'electre-iii.credibility')!.matrix!

    expect(conc[0]![1]).toBeCloseTo(vCase.expectedC01, 12)
    expect(cred[0]![1]).toBeCloseTo(vCase.expectedSigma01Partial, 12)
  })

  it('completely vetoes outranking σ(A1, A2) = 0 when Δ_2 >= v_2 (d_2 = 1)', () => {
    const res = electreIII.compute(problem, [...vCase.weights], {
      q: vCase.q,
      p: vCase.p,
      v: vCase.vFull,
    })

    const conc = res.steps.find((s) => s.key === 'electre-iii.concordance')!.matrix!
    const cred = res.steps.find((s) => s.key === 'electre-iii.credibility')!.matrix!

    expect(conc[0]![1]).toBeCloseTo(vCase.expectedC01, 12)
    expect(cred[0]![1]).toBe(vCase.expectedSigma01FullVeto)
  })

  it('handles crisp veto threshold (p_j = v_j) where Δ_j = p_j = v_j triggers full veto (d_j = 1)', () => {
    const crispProblem: Problem = {
      alternatives: ['A1', 'A2'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
      ],
      matrix: [
        [100, 10], // On C2, Δ_2(A1, A2) = 20 - 10 = 10 = p_2 = v_2
        [90, 20],
      ],
    }
    const res = electreIII.compute(crispProblem, [0.8, 0.2], {
      q: [0, 0],
      p: [5, 10],
      v: [null, 10],
    })
    const conc = res.steps.find((s) => s.key === 'electre-iii.concordance')!.matrix!
    const cred = res.steps.find((s) => s.key === 'electre-iii.credibility')!.matrix!
    expect(conc[0]![1]).toBeCloseTo(0.8, 12)
    expect(cred[0]![1]).toBe(0)
  })
})

describe('ELECTRE III — Threshold presets and parameter validation', () => {
  const problem = makeWangProblem()

  it('computes valid results for standard, strict, and veto presets', () => {
    const resStandard = electreIII.compute(problem, [...wang.weights], { thresholdPreset: 'standard' })
    const resStrict = electreIII.compute(problem, [...wang.weights], { thresholdPreset: 'strict' })
    const resVeto = electreIII.compute(problem, [...wang.weights], { thresholdPreset: 'veto' })

    for (const r of [resStandard, resStrict, resVeto]) {
      expect(r.scores).toHaveLength(11)
      expect(r.ranking).toHaveLength(11)
      expect(r.steps).toHaveLength(5)
      const totalPhi = r.scores.reduce((a, b) => a + b, 0)
      expect(totalPhi).toBeCloseTo(0, 12)
    }

    // Under veto preset, concordance equals standard concordance, but credibility is attenuated on vetoed pairs
    const concStd = resStandard.steps.find((s) => s.key === 'electre-iii.concordance')!.matrix!
    const concVeto = resVeto.steps.find((s) => s.key === 'electre-iii.concordance')!.matrix!
    const credVeto = resVeto.steps.find((s) => s.key === 'electre-iii.credibility')!.matrix!

    expect(concVeto).toEqual(concStd)
    let attenuatedCount = 0
    for (let a = 0; a < 11; a++) {
      for (let b = 0; b < 11; b++) {
        if (a !== b) {
          expect(credVeto[a]![b]!).toBeLessThanOrEqual(concVeto[a]![b]! + 1e-12)
          if (credVeto[a]![b]! < concVeto[a]![b]! - 1e-6) attenuatedCount++
        }
      }
    }
    expect(attenuatedCount).toBeGreaterThan(0)
  })

  it('supports inverse relative threshold reference mode', () => {
    const small: Problem = {
      alternatives: ['A1', 'A2'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'cost' },
      ],
      matrix: [
        [100, 50],
        [115, 60],
      ],
    }
    const directRes = electreIII.compute(small, [0.5, 0.5], {
      q: [{ rel: 0.1, ref: 'direct' }, { rel: 0.1, ref: 'direct' }],
      p: [{ rel: 0.2, ref: 'direct' }, { rel: 0.2, ref: 'direct' }],
    })
    const inverseRes = electreIII.compute(small, [0.5, 0.5], {
      q: [{ rel: 0.1, ref: 'inverse' }, { rel: 0.1, ref: 'inverse' }],
      p: [{ rel: 0.2, ref: 'inverse' }, { rel: 0.2, ref: 'inverse' }],
    })
    // Direct on C1 uses 100 (q=10, p=20 -> c_1(A1,A2) = (20-15)/10 = 0.5);
    // Inverse on C1 uses 115 (q=11.5, p=23 -> c_1(A1,A2) = (23-15)/11.5 = 8/11.5 ~ 0.6957)
    const cDir = directRes.steps.find((s) => s.key === 'electre-iii.concordance')!.matrix![0]![1]!
    const cInv = inverseRes.steps.find((s) => s.key === 'electre-iii.concordance')!.matrix![0]![1]!
    expect(cDir).toBeCloseTo(0.5 * 0.5 + 0.5 * 1.0, 12)
    expect(cInv).toBeGreaterThan(cDir)
  })

  it('throws RangeError on invalid threshold order (q > p or p > v) or mismatched lengths', () => {
    const small: Problem = {
      alternatives: ['A1', 'A2'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
      ],
      matrix: [
        [10, 20],
        [15, 25],
      ],
    }
    expect(() => electreIII.compute(small, [0.5, 0.5], { q: [5, 1], p: [3, 2] })).toThrow(RangeError)
    expect(() => electreIII.compute(small, [0.5, 0.5], { q: [1, 1], p: [5, 2], v: [4, 10] })).toThrow(RangeError)
    expect(() => electreIII.compute(small, [0.5, 0.5], { q: [1] })).toThrow(RangeError)
  })

  it('throws ProblemValidationError on invalid problem or weights', () => {
    const invalid: Problem = {
      alternatives: ['A1'],
      criteria: [{ name: 'C1', type: 'benefit' }],
      matrix: [[1]],
    }
    expect(() => electreIII.compute(invalid, [1], {})).toThrow(ProblemValidationError)
  })

  it('zeroes out large-scale rounding-noise constant columns via isConstant and preserves scale invariance down to 1e-50', () => {
    const noisyConst: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2 (noisy constant)', type: 'benefit' },
      ],
      matrix: [
        [10, 1e6],
        [20, 1e6 + 5e-7],
        [30, 1e6],
      ],
    }
    const rNoisy = electreIII.compute(noisyConst, [0.5, 0.5], { thresholdPreset: 'standard' })
    const rExact = electreIII.compute(
      { ...noisyConst, matrix: noisyConst.matrix.map((row) => [row[0]!, 1e6]) },
      [0.5, 0.5],
      { thresholdPreset: 'standard' },
    )
    expect(rNoisy.scores).toEqual(rExact.scores)
    expect(rNoisy.ranking).toEqual(rExact.ranking)

    const tiny: Problem = {
      ...problem,
      matrix: problem.matrix.map((row) => row.map((v) => v * 1e-50)),
    }
    const baseStd = electreIII.compute(problem, [...wang.weights], { thresholdPreset: 'standard' })
    const tinyStd = electreIII.compute(tiny, [...wang.weights], { thresholdPreset: 'standard' })
    expect(tinyStd.ranking).toEqual(baseStd.ranking)
    baseStd.scores.forEach((s, i) => expect(tinyStd.scores[i]).toBeCloseTo(s, 10))
  })
})
