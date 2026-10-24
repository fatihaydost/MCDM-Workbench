import { describe, expect, it } from 'vitest'
import {
  getMethod,
  mabac,
  prometheeII,
  prometheeIncomparablePairs,
  rankScores,
  type Problem,
  type PrometheeCriterionFunction,
} from '../src/core'
import { getExample } from '../src/data/examples'
import fixture from './fixtures/promethee-ii-brans1986.json'

const normWeights = (w: readonly number[]): number[] => {
  const s = w.reduce((a, b) => a + b, 0)
  return w.map((x) => x / s)
}

describe('PROMETHEE II — Brans, Vincke & Mareschal (1986) hydroelectric fixture', () => {
  const f1 = fixture.brans1986
  const problem: Problem = {
    alternatives: f1.alternatives,
    criteria: f1.criteria.map((c) => ({ name: c.name, type: c.type as 'benefit' | 'cost' })),
    matrix: f1.matrix,
  }
  const specs = f1.criteriaFunctions as PrometheeCriterionFunction[]
  const wEqual = normWeights(f1.weights)

  it('is registered in the method registry', () => {
    expect(getMethod('promethee-ii')).toBe(prometheeII)
    expect(prometheeII.kind).toBe('ranking')
  })

  it('reproduces Brans, Vincke & Mareschal (1986) flows, π matrix, ranking, and PROMETHEE I incomparabilities', () => {
    const res = prometheeII.compute(problem, wEqual, { criteriaFunctions: specs })
    const pi = res.steps.find((s) => s.key === 'promethee-ii.preferenceMatrix')!.matrix!
    const pos = res.steps.find((s) => s.key === 'promethee-ii.positiveFlow')!.vector!
    const neg = res.steps.find((s) => s.key === 'promethee-ii.negativeFlow')!.vector!
    const net = res.steps.find((s) => s.key === 'promethee-ii.netFlow')!.vector!

    for (let i = 0; i < 6; i++) {
      expect(pos[i]).toBeCloseTo(f1.positiveFlow[i]!, 4)
      expect(neg[i]).toBeCloseTo(f1.negativeFlow[i]!, 4)
      expect(net[i]).toBeCloseTo(f1.netFlow[i]!, 4)
      expect(Math.abs(net[i]! * 5 - f1.publishedSumNetFlow[i]!)).toBeLessThanOrEqual(0.002)
      for (let k = 0; k < 6; k++) {
        expect(Math.abs(pi[i]![k]! - f1.publishedPi3dp[i]![k]!)).toBeLessThanOrEqual(0.001)
      }
    }

    expect(res.scores).toEqual(net)
    expect(res.ranking).toEqual(f1.ranking)
    expect(prometheeIncomparablePairs(pos, neg)).toEqual(f1.incomparablePairs)
    expect(res.diagnostics?.incomparablePairs).toBe(f1.incomparablePairs.length)
  })

  it('reproduces Mareschal (2019) weight sensitivity exercises (w2=50 -> France 1st, w5=55 -> Belgium 1st)', () => {
    const resW2 = prometheeII.compute(problem, normWeights(f1.sensitivity.w2_50.weights), { criteriaFunctions: specs })
    f1.sensitivity.w2_50.netFlow.forEach((v, i) => expect(resW2.scores[i]).toBeCloseTo(v, 4))
    expect(resW2.ranking).toEqual(f1.sensitivity.w2_50.ranking)

    const resW5 = prometheeII.compute(problem, normWeights(f1.sensitivity.w5_55.weights), { criteriaFunctions: specs })
    f1.sensitivity.w5_55.netFlow.forEach((v, i) => expect(resW5.scores[i]).toBeCloseTo(v, 4))
    expect(resW5.ranking).toEqual(f1.sensitivity.w5_55.ranking)
  })

  it('reproduces Mareschal (2019) Exercise 4 (all Usual preference functions)', () => {
    const resUsual = prometheeII.compute(problem, wEqual, { preferenceFunction: 'usual' })
    const pos = resUsual.steps.find((s) => s.key === 'promethee-ii.positiveFlow')!.vector!
    const neg = resUsual.steps.find((s) => s.key === 'promethee-ii.negativeFlow')!.vector!
    f1.sensitivity.allUsual.positiveFlow.forEach((v, i) => expect(pos[i]).toBeCloseTo(v, 4))
    f1.sensitivity.allUsual.negativeFlow.forEach((v, i) => expect(neg[i]).toBeCloseTo(v, 4))
    f1.sensitivity.allUsual.netFlow.forEach((v, i) => expect(resUsual.scores[i]).toBeCloseTo(v, 4))
    expect(resUsual.ranking).toEqual(f1.sensitivity.allUsual.ranking)
  })
})

describe('PROMETHEE II — Goswami (2020) laptop selection (workbench reference example)', () => {
  const f2 = fixture.goswami2020
  const problem: Problem = {
    alternatives: f2.alternatives,
    criteria: f2.criteria.map((c) => ({ name: c.name, type: c.type as 'benefit' | 'cost' })),
    matrix: f2.matrix,
  }

  it('matches Tables 13, 15, 16, 17 and 18 within 0.00002 under default v-shape', () => {
    const res = prometheeII.compute(problem, f2.weights, {})
    const pi = res.steps.find((s) => s.key === 'promethee-ii.preferenceMatrix')!.matrix!
    const pos = res.steps.find((s) => s.key === 'promethee-ii.positiveFlow')!.vector!
    const neg = res.steps.find((s) => s.key === 'promethee-ii.negativeFlow')!.vector!

    for (let i = 0; i < 6; i++) {
      expect(Math.abs(pos[i]! - f2.positiveFlow[i]!)).toBeLessThanOrEqual(f2.tolerance)
      expect(Math.abs(neg[i]! - f2.negativeFlow[i]!)).toBeLessThanOrEqual(f2.tolerance)
      expect(Math.abs(res.scores[i]! - f2.netFlow[i]!)).toBeLessThanOrEqual(f2.tolerance)
      for (let k = 0; k < 6; k++) {
        expect(Math.abs(pi[i]![k]! - f2.publishedPi[i]![k]!)).toBeLessThanOrEqual(f2.tolerance)
      }
    }

    expect(res.ranking).toEqual(f2.ranking)
    expect(prometheeIncomparablePairs(pos, neg)).toEqual(f2.incomparablePairs)
  })

  it('matches the goswami-2020-laptops dataset in examples.ts', () => {
    const ex = getExample('goswami-2020-laptops')!
    expect(ex).toBeDefined()
    expect(ex.referenceFor).toContain('promethee-ii')
    const p: Problem = {
      alternatives: ex.alternatives,
      criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
      matrix: ex.matrix,
    }
    const res = prometheeII.compute(p, ex.weights!, {})
    for (const pub of ex.published!) {
      const vec = res.steps.find((s) => s.key === pub.label)!.vector!
      ;(pub.values as number[]).forEach((v, i) =>
        expect(Math.abs(vec[i]! - v)).toBeLessThanOrEqual(f2.tolerance),
      )
    }
  })
})

describe('PROMETHEE II — Abdullah, Chan & Afshari (2019) green suppliers', () => {
  const f3 = fixture.abdullah2019
  const problem: Problem = {
    alternatives: f3.alternatives,
    criteria: f3.criteria.map((c) => ({ name: c.name, type: c.type as 'benefit' | 'cost' })),
    matrix: f3.matrix,
  }
  const w3 = normWeights(f3.weights)

  it('reproduces Case 1 (Usual / Type I, Tables 8-11)', () => {
    const res = prometheeII.compute(problem, w3, { preferenceFunction: 'usual' })
    const pos = res.steps.find((s) => s.key === 'promethee-ii.positiveFlow')!.vector!
    const neg = res.steps.find((s) => s.key === 'promethee-ii.negativeFlow')!.vector!
    f3.case1Usual.positiveFlow.forEach((v, i) => expect(pos[i]).toBeCloseTo(v, 3))
    f3.case1Usual.negativeFlow.forEach((v, i) => expect(neg[i]).toBeCloseTo(v, 3))
    f3.case1Usual.netFlow.forEach((v, i) => expect(res.scores[i]).toBeCloseTo(v, 3))
    expect(res.ranking).toEqual(f3.case1Usual.ranking)
  })

  it('reproduces Case 2 (V-shape C1 + Level C2-C7, Tables 12-16)', () => {
    const specs = f3.case2LinearLevel.criteriaFunctions as PrometheeCriterionFunction[]
    const res = prometheeII.compute(problem, w3, { criteriaFunctions: specs })
    const pi = res.steps.find((s) => s.key === 'promethee-ii.preferenceMatrix')!.matrix!
    const pos = res.steps.find((s) => s.key === 'promethee-ii.positiveFlow')!.vector!
    const neg = res.steps.find((s) => s.key === 'promethee-ii.negativeFlow')!.vector!
    for (let i = 0; i < 4; i++) {
      expect(pos[i]).toBeCloseTo(f3.case2LinearLevel.positiveFlow[i]!, 4)
      expect(neg[i]).toBeCloseTo(f3.case2LinearLevel.negativeFlow[i]!, 4)
      expect(res.scores[i]).toBeCloseTo(f3.case2LinearLevel.netFlow[i]!, 4)
      for (let k = 0; k < 4; k++) {
        expect(pi[i]![k]).toBeCloseTo(f3.case2LinearLevel.publishedPi[i]![k]!, 3)
      }
    }
    expect(res.ranking).toEqual(f3.case2LinearLevel.ranking)
  })
})

describe('PROMETHEE II — Mareschal (2015) algebraic identities & invariants', () => {
  const ex = getExample('keshavarz-2015-ten-alternatives')!
  const p: Problem = {
    alternatives: ex.alternatives,
    criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
    matrix: ex.matrix,
  }

  it('default v-shape (p_j = R_j) is an exact affine transform of the min-max weighted sum and matches MABAC ranking', () => {
    const resV = prometheeII.compute(p, ex.weights!, { preferenceFunction: 'v-shape' })
    const resMabac = mabac.compute(p, ex.weights!, {})
    expect(resV.ranking).toEqual(resMabac.ranking)

    const m = p.alternatives.length
    const n = p.criteria.length
    const saw = new Array<number>(m).fill(0)
    for (let j = 0; j < n; j++) {
      const col = p.matrix.map((r) => r[j]!)
      const min = Math.min(...col)
      const max = Math.max(...col)
      const span = max - min
      for (let i = 0; i < m; i++) {
        const r = p.criteria[j]!.type === 'benefit' ? (col[i]! - min) / span : (max - col[i]!) / span
        saw[i]! += ex.weights![j]! * r
      }
    }
    const meanSaw = saw.reduce((a, b) => a + b, 0) / m
    for (let i = 0; i < m; i++) {
      expect(resV.scores[i]).toBeCloseTo((m / (m - 1)) * (saw[i]! - meanSaw), 12)
    }
  })

  it('usual (Type I) matches the weighted Borda midrank net flow', () => {
    const resU = prometheeII.compute(p, ex.weights!, { preferenceFunction: 'usual' })
    const m = p.alternatives.length
    const n = p.criteria.length
    const borda = new Array<number>(m).fill(0)
    for (let j = 0; j < n; j++) {
      const sign = p.criteria[j]!.type === 'benefit' ? 1 : -1
      const signedCol = p.matrix.map((r) => sign * r[j]!)
      for (let a = 0; a < m; a++) {
        const better = signedCol.filter((x) => x > signedCol[a]!).length
        const equal = signedCol.filter((x) => x === signedCol[a]!).length
        const midRank = better + (equal + 1) / 2
        borda[a]! += ex.weights![j]! * ((m + 1 - 2 * midRank) / (m - 1))
      }
    }
    for (let i = 0; i < m; i++) {
      expect(resU.scores[i]).toBeCloseTo(borda[i]!, 12)
    }
    expect(resU.ranking).toEqual(rankScores(borda, 'desc'))
  })

  it('satisfies zero-sum net flow and location-shift invariance across all 4 preference functions', () => {
    const shifted: Problem = {
      ...p,
      matrix: p.matrix.map((row) => row.map((v, j) => v + (j + 1) * 37.5 - 100)),
    }
    for (const fn of ['v-shape', 'usual', 'level', 'gaussian'] as const) {
      const r1 = prometheeII.compute(p, ex.weights!, { preferenceFunction: fn })
      const r2 = prometheeII.compute(shifted, ex.weights!, { preferenceFunction: fn })
      const sum = r1.scores.reduce((a, b) => a + b, 0)
      expect(Math.abs(sum)).toBeLessThan(1e-12)
      r1.scores.forEach((s, i) => expect(r2.scores[i]).toBeCloseTo(s, 11))
    }
  })

  it('handles negative values, zeros, and constant columns without error', () => {
    const negProblem: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'cost' },
        { name: 'C3 (constant)', type: 'benefit' },
      ],
      matrix: [
        [-10, 0, 5],
        [0, -20, 5],
        [15, 10, 5],
      ],
    }
    const res = prometheeII.compute(negProblem, [0.4, 0.4, 0.2], { preferenceFunction: 'gaussian' })
    expect(res.ranking).toHaveLength(3)
    expect(Math.abs(res.scores.reduce((a, b) => a + b, 0))).toBeLessThan(1e-12)
  })

  it('rejects invalid preferenceFunction or mismatched criteriaFunctions length', () => {
    expect(() =>
      prometheeII.compute(p, ex.weights!, { preferenceFunction: 'invalid' as never }),
    ).toThrow(/preferenceFunction/)
    expect(() =>
      prometheeII.compute(p, ex.weights!, { criteriaFunctions: [{ type: 'usual' }] }),
    ).toThrow(/criteriaFunctions length/)
  })
})
