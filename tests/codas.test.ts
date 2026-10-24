import { describe, expect, it } from 'vitest'
import { CODAS_DEFAULT_TAU, codas, getMethod, getRankingMethod, type Problem, type Step } from '../src/core'
import { getExample } from '../src/data/examples'
import fixture from './fixtures/codas-ghorabaee2016.json'

function makeProblem(
  matrix: number[][],
  types: readonly ('benefit' | 'cost')[],
  alternatives?: readonly string[],
  criteria?: readonly string[],
): Problem {
  return {
    alternatives: alternatives ? [...alternatives] : matrix.map((_, i) => `A${i + 1}`),
    criteria: types.map((type, j) => ({ name: criteria?.[j] ?? `C${j + 1}`, type })),
    matrix: matrix.map((row) => [...row]),
  }
}

function getMatrixStep(steps: Step[], key: string): number[][] {
  const s = steps.find((st) => st.key === key)
  expect(s, `missing step ${key}`).toBeDefined()
  expect(s?.matrix).toBeDefined()
  return s!.matrix!
}

function getVectorStep(steps: Step[], key: string): number[] {
  const s = steps.find((st) => st.key === key)
  expect(s, `missing step ${key}`).toBeDefined()
  expect(s?.vector).toBeDefined()
  return s!.vector!
}

describe('CODAS - registry and parameter descriptor', () => {
  it('is registered as a ranking method with tau in [0.01, 0.1] default 0.02 and positiveValues requirement', () => {
    expect(getMethod('codas')).toBe(codas)
    expect(getRankingMethod('codas')).toBe(codas)
    expect(codas.id).toBe('codas')
    expect(codas.kind).toBe('ranking')
    expect(codas.requires).toEqual({ positiveValues: true })
    expect(codas.params).toEqual([
      {
        key: 'tau',
        kind: 'number',
        min: 0.01,
        max: 0.1,
        step: 0.01,
        default: CODAS_DEFAULT_TAU,
      },
    ])
  })
})

describe('CODAS - Keshavarz Ghorabaee et al. (2016) Example 1 (7 industrial robots x 5 criteria, Tables 1-4)', () => {
  const f = fixture.robots
  const problem = makeProblem(f.matrix, f.types as ('benefit' | 'cost')[], f.alternatives, f.criteria)
  const res = codas.compute(problem, f.weights, { tau: f.tau })

  it('reproduces normalized matrix n_ij, weighted matrix r_ij, and negative-ideal ns_j (Tables 2-3)', () => {
    const n = getMatrixStep(res.steps, 'codas.normalized')
    const r = getMatrixStep(res.steps, 'codas.weighted')
    const ns = getVectorStep(res.steps, 'codas.negativeIdeal')

    for (let i = 0; i < f.matrix.length; i++) {
      for (let j = 0; j < f.types.length; j++) {
        expect(n[i]![j]!).toBeCloseTo(f.expected.n[i]![j]!, 12)
        expect(Math.abs(n[i]![j]! - f.published.n[i]![j]!)).toBeLessThanOrEqual(f.published.tolerance)
        expect(r[i]![j]!).toBeCloseTo(f.expected.r[i]![j]!, 12)
        expect(Math.abs(r[i]![j]! - f.published.r[i]![j]!)).toBeLessThanOrEqual(0.0001)
      }
    }
    for (let j = 0; j < f.types.length; j++) {
      expect(ns[j]!).toBeCloseTo(f.expected.ns[j]!, 12)
      expect(Math.abs(ns[j]! - f.published.ns[j]!)).toBeLessThanOrEqual(0.0001)
    }
  })

  it('reproduces Euclidean E_i, Taxicab T_i, relative assessment h_ik, scores H_i, and ranking [3, 1, 2, 5, 7, 6, 4] (Tables 3-4)', () => {
    const E = getVectorStep(res.steps, 'codas.euclidean')
    const T = getVectorStep(res.steps, 'codas.taxicab')
    const h = getMatrixStep(res.steps, 'codas.relativeAssessment')
    const H = getVectorStep(res.steps, 'codas.score')

    expect(H).toEqual(res.scores)
    for (let i = 0; i < f.alternatives.length; i++) {
      expect(E[i]!).toBeCloseTo(f.expected.E[i]!, 12)
      expect(Math.abs(E[i]! - f.published.E[i]!)).toBeLessThanOrEqual(0.0001)
      expect(T[i]!).toBeCloseTo(f.expected.T[i]!, 12)
      expect(Math.abs(T[i]! - f.published.T[i]!)).toBeLessThanOrEqual(0.0001)
      expect(res.scores[i]!).toBeCloseTo(f.expected.H[i]!, 12)
      expect(Math.abs(res.scores[i]! - f.published.H[i]!)).toBeLessThanOrEqual(0.0001)
      for (let k = 0; k < f.alternatives.length; k++) {
        expect(h[i]![k]!).toBeCloseTo(f.expected.h[i]![k]!, 12)
        // Table 4 prints h[0][1] = -0.1460 (single-digit typo for -0.1554/-0.1560; transpose h[1][0] is 0.1560)
        if (!(i === 0 && k === 1)) {
          expect(Math.abs(h[i]![k]! - f.published.h[i]![k]!)).toBeLessThanOrEqual(0.0006)
        }
      }
    }
    expect(res.ranking).toEqual(f.published.ranking)
  })
})

describe('CODAS - Keshavarz Ghorabaee et al. (2016) Example 2 (14 office microclimate alternatives x 6 criteria, Tables 5-8)', () => {
  const f = fixture.microclimate
  const problem = makeProblem(f.matrix, f.types as ('benefit' | 'cost')[], f.alternatives, f.criteria)
  const res = codas.compute(problem, f.weights, { tau: f.tau })

  it('reproduces E_i, T_i, H_i, and all 14 ranks (Tables 6-8), breaking the A8/A9 Euclidean near-tie via Taxicab distances', () => {
    const E = getVectorStep(res.steps, 'codas.euclidean')
    const T = getVectorStep(res.steps, 'codas.taxicab')

    for (let i = 0; i < f.alternatives.length; i++) {
      expect(E[i]!).toBeCloseTo(f.expected.E[i]!, 12)
      expect(Math.abs(E[i]! - f.published.E[i]!)).toBeLessThanOrEqual(0.0001)
      expect(T[i]!).toBeCloseTo(f.expected.T[i]!, 12)
      expect(Math.abs(T[i]! - f.published.T[i]!)).toBeLessThanOrEqual(0.0001)
      expect(res.scores[i]!).toBeCloseTo(f.expected.H[i]!, 12)
      // Table 8 prints H_i to 3 decimal places
      expect(Math.abs(res.scores[i]! - f.published.H[i]!)).toBeLessThanOrEqual(f.published.tolerance)
    }
    expect(res.ranking).toEqual(f.published.ranking)
    // E_8 and E_9 both round to 0.1550, with E_8 < E_9 slightly, but T_8 > T_9 puts H_8 > H_9 (rank 1 vs 2)
    expect(E[7]!).toBeLessThan(E[8]!)
    expect(T[7]!).toBeGreaterThan(T[8]!)
    expect(res.scores[7]!).toBeGreaterThan(res.scores[8]!)
  })
})

describe('CODAS - Badi, Abdulshahed & Shetwan (2018) (6 steelmaking suppliers x 4 criteria, Tables 1-5) & examples.ts', () => {
  const f = fixture.badi2018
  const problem = makeProblem(f.matrix, f.types as ('benefit' | 'cost')[], f.alternatives, f.criteria)
  const res = codas.compute(problem, f.weights, { tau: f.tau })

  it('reproduces E_i, T_i, H_i, and ranking [1, 2, 3, 5, 6, 4] at tau = 0.02, plus Table 5 tau sensitivity', () => {
    const E = getVectorStep(res.steps, 'codas.euclidean')
    const T = getVectorStep(res.steps, 'codas.taxicab')
    const ns = getVectorStep(res.steps, 'codas.negativeIdeal')

    for (let j = 0; j < f.types.length; j++) {
      expect(Math.abs(ns[j]! - f.published.ns[j]!)).toBeLessThanOrEqual(0.0001)
    }
    for (let i = 0; i < f.alternatives.length; i++) {
      expect(Math.abs(E[i]! - f.published.E[i]!)).toBeLessThanOrEqual(0.0001)
      expect(Math.abs(T[i]! - f.published.T[i]!)).toBeLessThanOrEqual(0.0001)
      expect(Math.abs(res.scores[i]! - f.published.H[i]!)).toBeLessThanOrEqual(f.published.tolerance)
    }
    expect(res.ranking).toEqual(f.published.ranking)

    // Table 5 sensitivity: tau in {0.01, 0.02, 0.03} gives [1, 2, 3, 5, 6, 4]; tau in {0.04..0.10} gives [1, 2, 4, 5, 6, 3]
    for (const tau of [0.01, 0.02, 0.03]) {
      expect(codas.compute(problem, f.weights, { tau }).ranking).toEqual(f.published.ranking)
    }
    for (const tau of [0.04, 0.05, 0.1]) {
      expect(codas.compute(problem, f.weights, { tau }).ranking).toEqual(f.published.ranking_tau_ge_004)
    }
  })

  it('matches the badi-2018-suppliers entry in src/data/examples.ts', () => {
    const ex = getExample('badi-2018-suppliers')!
    expect(ex).toBeDefined()
    expect(ex.referenceFor).toContain('codas')
    const p: Problem = {
      alternatives: ex.alternatives,
      criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
      matrix: ex.matrix,
    }
    const r = codas.compute(p, ex.weights!, {})
    const pubScore = ex.published.find((x) => x.label === 'codas.score')!.values as number[]
    for (let i = 0; i < pubScore.length; i++) {
      expect(Math.abs(r.scores[i]! - pubScore[i]!)).toBeLessThanOrEqual(f.published.tolerance)
    }
  })
})

describe('CODAS - Trung (2022) Example 3 (16 turning trials x 2 criteria, Tables 12, 14-16)', () => {
  const f = fixture.trung2022
  const problem = makeProblem(f.matrix, f.types as ('benefit' | 'cost')[])

  it('reproduces row 1 of Table 14 to 3 d.p. and matches expected Entropy and MEREC rankings', () => {
    const resEnt = codas.compute(problem, f.weightsEntropy, { tau: 0.02 })
    const h = getMatrixStep(resEnt.steps, 'codas.relativeAssessment')
    for (let k = 0; k < f.publishedTable14Row1.length; k++) {
      expect(Math.abs(h[0]![k]! - f.publishedTable14Row1[k]!)).toBeLessThanOrEqual(0.0005)
    }
    expect(resEnt.ranking).toEqual(f.expectedEntropy.ranking)

    const resMer = codas.compute(problem, f.weightsMerec, { tau: 0.02 })
    expect(resMer.ranking).toEqual(f.expectedMerec.ranking)
  })
})

describe('CODAS - algebraic properties and edge cases', () => {
  const problem = makeProblem(
    fixture.robots.matrix,
    fixture.robots.types as ('benefit' | 'cost')[],
    fixture.robots.alternatives,
    fixture.robots.criteria,
  )
  const weights = fixture.robots.weights

  it('produces an antisymmetric relative assessment matrix (h_ik + h_ki = 0) and zero-sum H scores', () => {
    const res = codas.compute(problem, weights, {})
    const h = getMatrixStep(res.steps, 'codas.relativeAssessment')
    for (let i = 0; i < h.length; i++) {
      expect(h[i]![i]).toBe(0)
      for (let k = 0; k < h.length; k++) {
        expect(h[i]![k]! + h[k]![i]!).toBeCloseTo(0, 14)
      }
    }
    const sumH = res.scores.reduce((a, b) => a + b, 0)
    expect(sumH).toBeCloseTo(0, 13)
  })

  it('is invariant to positive column rescaling', () => {
    const scales = [2.5, 0.1, 10, 0.05, 7]
    const scaled = makeProblem(
      fixture.robots.matrix.map((row) => row.map((v, j) => v * scales[j]!)),
      fixture.robots.types as ('benefit' | 'cost')[],
    )
    const base = codas.compute(problem, weights, {})
    const res = codas.compute(scaled, weights, {})
    for (let i = 0; i < base.scores.length; i++) {
      expect(res.scores[i]!).toBeCloseTo(base.scores[i]!, 13)
    }
    expect(res.ranking).toEqual(base.ranking)
  })

  it('treats a constant positive column as zero distance from ns (proportional to dropping that column)', () => {
    const pConst = makeProblem(
      [
        [10, 5, 2],
        [20, 5, 4],
        [15, 5, 1],
      ],
      ['benefit', 'cost', 'cost'],
    )
    const pDrop = makeProblem(
      [
        [10, 2],
        [20, 4],
        [15, 1],
      ],
      ['benefit', 'cost'],
    )
    const rConst = codas.compute(pConst, [0.3, 0.4, 0.3], { tau: 0.03 })
    const rDrop = codas.compute(pDrop, [0.5, 0.5], { tau: 0.05 })
    for (let i = 0; i < 3; i++) {
      expect(rConst.scores[i]!).toBeCloseTo(0.6 * rDrop.scores[i]!, 14)
    }
    expect(rConst.ranking).toEqual(rDrop.ranking)
  })

  it('gives E = 0, T = 0, H = 0 and rank 1 for all equal alternatives', () => {
    const pEq = makeProblem(
      [
        [4, 7],
        [4, 7],
        [4, 7],
      ],
      ['benefit', 'cost'],
    )
    const res = codas.compute(pEq, [0.4, 0.6], {})
    expect(res.scores).toEqual([0, 0, 0])
    expect(res.ranking).toEqual([1, 1, 1])
    expect(res.warnings).toContainEqual({ code: 'codas.no-spread' })
  })

  it('validates tau in [0.01, 0.1] and rejects non-positive matrix entries', () => {
    expect(() => codas.compute(problem, weights, { tau: 0 })).toThrow(RangeError)
    expect(() => codas.compute(problem, weights, { tau: 0.005 })).toThrow(RangeError)
    expect(() => codas.compute(problem, weights, { tau: 0.11 })).toThrow(RangeError)
    expect(() => codas.compute(problem, weights, { tau: Number.NaN })).toThrow(RangeError)

    const pZero = makeProblem(
      [
        [0, 5],
        [10, 8],
      ],
      ['benefit', 'cost'],
    )
    expect(() => codas.compute(pZero, [0.5, 0.5], {})).toThrow(/non-positive-value/)
  })
})
