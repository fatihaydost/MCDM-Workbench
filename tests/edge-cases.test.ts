import { describe, expect, it } from 'vitest'
import {
  ahp,
  ahpIncompleteLlsm,
  ahpProgress,
  ahpWorstPair,
  aras,
  bwm,
  bwmProgress,
  cocoso,
  codas,
  CODAS_DEFAULT_TAU,
  compareRankings,
  copras,
  critic,
  edas,
  emptyJudgements,
  entropy,
  equal,
  judgementsFromBwm,
  lopcow,
  mabac,
  marcos,
  merec,
  moora,
  pairFacts,
  ProblemValidationError,
  saw,
  sd,
  setPair,
  topsis,
  type CriterionType,
  type RankingMethod,
  type WeightingMethod,
  vikor,
  waspas,
} from '../src/core'
import { removeCriteria, sweepWeight } from '../src/core/robustness'
import { pearson } from '../src/core/math'
import { makeProblem, rankerOf, step } from './helpers'

const w2 = [0.5, 0.5]
const b2: CriterionType[] = ['benefit', 'benefit']
const bc: CriterionType[] = ['benefit', 'cost']

const allRankingMethods: { name: string; method: RankingMethod<any> }[] = [
  { name: 'topsis', method: topsis },
  { name: 'saw', method: saw },
  { name: 'vikor', method: vikor },
  { name: 'edas', method: edas },
  { name: 'waspas', method: waspas },
  { name: 'copras', method: copras },
  { name: 'marcos', method: marcos },
  { name: 'cocoso', method: cocoso },
  { name: 'mabac', method: mabac },
  { name: 'moora', method: moora },
  { name: 'aras', method: aras },
  { name: 'codas', method: codas },
]

const allWeightingMethods: { name: string; method: WeightingMethod<any> }[] = [
  { name: 'critic', method: critic },
  { name: 'entropy', method: entropy },
  { name: 'sd', method: sd },
  { name: 'merec', method: merec },
  { name: 'lopcow', method: lopcow },
  { name: 'equal', method: equal },
]

describe('1. Minimum dimensions (m = 2 alternatives, n = 2 criteria)', () => {
  it('sd emits sd.two-alternatives and equal weights [0.5, 0.5]', () => {
    const p = makeProblem([[10, 20], [30, 40]], b2)
    const res = sd.compute(p, {})
    expect(res.warnings).toContainEqual({ code: 'sd.two-alternatives' })
    expect(res.weights).toEqual([0.5, 0.5])
    expect(res.weights.every((w) => Number.isFinite(w) && !Number.isNaN(w))).toBe(true)
  })

  it('lopcow emits lopcow.two-alternatives and collapses PV to 0 with equal weights', () => {
    const p = makeProblem([[10, 20], [30, 40]], b2)
    const res = lopcow.compute(p, {})
    expect(res.warnings).toContainEqual({ code: 'lopcow.two-alternatives' })
    const pv = step(res.steps, 'lopcow.pv').vector!
    expect(pv).toEqual([0, 0])
    expect(res.weights).toEqual([0.5, 0.5])
  })

  describe('critic with m = 2 (correlation +/- 1)', () => {
    it('positively correlated columns (+1) trigger critic.no-conflict-equal-weights without NaN', () => {
      const p = makeProblem([[10, 20], [30, 60]], b2)
      const res = critic.compute(p, {})
      expect(res.warnings).toContainEqual({ code: 'critic.few-alternatives' })
      expect(res.warnings).toContainEqual({ code: 'critic.no-conflict-equal-weights' })
      expect(res.weights).toEqual([0.5, 0.5])
      const rho = step(res.steps, 'critic.correlation').matrix!
      expect(rho[0]![1]).toBeCloseTo(1, 12)
    })

    it('negatively correlated columns (-1) compute contrast and conflict without NaN', () => {
      const p = makeProblem([[10, 60], [30, 20]], b2)
      const res = critic.compute(p, {})
      expect(res.warnings).toContainEqual({ code: 'critic.few-alternatives' })
      expect(res.warnings).not.toContainEqual({ code: 'critic.no-conflict-equal-weights' })
      expect(res.weights).toEqual([0.5, 0.5])
      const rho = step(res.steps, 'critic.correlation').matrix!
      expect(rho[0]![1]).toBeCloseTo(-1, 12)
    })
  })

  it('ahp with n = 2 has CI = 0, CR = 0 and produces valid weights under eigenvector and geometric mean', () => {
    const p = makeProblem([[1, 2], [3, 4]], b2)
    let j = emptyJudgements(2)
    j = setPair(j, 0, 1, 3) // criterion 0 is 3x more important than criterion 1

    const resEigen = ahp.compute(p, { aggregation: 'eigenvector' }, j)
    expect(resEigen.diagnostics?.ci).toBe(0)
    expect(resEigen.diagnostics?.cr).toBe(0)
    expect(resEigen.diagnostics?.lambdaMax).toBeCloseTo(2, 12)
    expect(resEigen.warnings ?? []).not.toContainEqual(expect.objectContaining({ code: 'ahp.inconsistent' }))
    expect(resEigen.weights[0]).toBeCloseTo(0.75, 12)
    expect(resEigen.weights[1]).toBeCloseTo(0.25, 12)

    const resGeom = ahp.compute(p, { aggregation: 'geometric' }, j)
    expect(resGeom.diagnostics?.ci).toBe(0)
    expect(resGeom.diagnostics?.cr).toBe(0)
    expect(resGeom.weights[0]).toBeCloseTo(0.75, 12)
    expect(resGeom.weights[1]).toBeCloseTo(0.25, 12)
  })

  it('bwm with n = 2 needs only 2n - 3 = 1 comparison, has xi = 0, CR = 0 and exact weights', () => {
    const p = makeProblem([[1, 2], [3, 4]], b2)
    const j = judgementsFromBwm(2, 0, 1, [1, 4], [4, 1])

    const res = bwm.compute(p, {}, j)
    expect(res.diagnostics?.xiL).toBe(0)
    expect(res.diagnostics?.crInput).toBe(0)
    expect(res.warnings).toEqual([])
    expect(res.weights[0]).toBeCloseTo(4 / 5, 12)
    expect(res.weights[1]).toBeCloseTo(1 / 5, 12)

    const progress = bwmProgress(j, 2)
    expect(progress.answered).toBe(1)
    expect(progress.total).toBe(1)
    expect(progress.provisional).toBe(false)
  })

  describe('all 12 ranking methods run on m = 2, n = 2 without NaN or Infinity', () => {
    // Neither alternative is worst on all criteria: Alt 0 wins cost, Alt 1 wins benefit
    const p = makeProblem([[10, 20], [30, 40]], bc)

    it.each(allRankingMethods)('$name produces finite scores and valid ranking', ({ method }) => {
      const res = method.compute(p, w2, {})
      expect(res.scores.length).toBe(2)
      expect(res.scores.every((s: number) => Number.isFinite(s) && !Number.isNaN(s))).toBe(true)
      expect(res.ranking.length).toBe(2)
      expect(res.ranking.every((r: number) => r === 1 || r === 2)).toBe(true)

      // Step matrices, vectors and scalars must not leak NaN or Infinity
      for (const stepItem of res.steps) {
        if (stepItem.scalar !== undefined) {
          expect(Number.isFinite(stepItem.scalar)).toBe(true)
        }
        if (stepItem.vector !== undefined) {
          expect(stepItem.vector.every((x: number) => Number.isFinite(x))).toBe(true)
        }
        if (stepItem.matrix !== undefined) {
          expect(stepItem.matrix.every((row: number[]) => row.every((x) => Number.isFinite(x)))).toBe(true)
        }
      }
    })
  })
})

describe('2. Large dimensions & underflow/overflow protection', () => {
  const m = 250
  const n = 4
  const w4 = [0.3, 0.2, 0.3, 0.2]
  const types4: CriterionType[] = ['benefit', 'cost', 'benefit', 'cost']

  // Deterministic varying positive matrix
  const matrix250: number[][] = Array.from({ length: m }, (_, i) => [
    10 + ((i * 17) % 91),
    5 + ((i * 23) % 47),
    100 + ((i * 31) % 199),
    1 + ((i * 7) % 29),
  ])
  const p250 = makeProblem(matrix250, types4)

  it('mabac computes m = 250 without geometric mean product underflow in G', () => {
    const res = mabac.compute(p250, w4, {})
    const g = step(res.steps, 'mabac.border').vector!
    expect(g.length).toBe(n)
    expect(g.every((gj) => Number.isFinite(gj) && gj > 0)).toBe(true)
    expect(res.scores.every((s) => Number.isFinite(s))).toBe(true)
    expect(res.ranking.length).toBe(m)
  })

  it('merec computes m = 250 with stable logarithmic sum and normalized weights', () => {
    const res = merec.compute(p250, {})
    expect(res.weights.length).toBe(n)
    expect(res.weights.every((w) => Number.isFinite(w) && w > 0)).toBe(true)
    const sumW = res.weights.reduce((a, b) => a + b, 0)
    expect(sumW).toBeCloseTo(1, 10)
  })

  describe('zero-weight criteria w_j = 0 and 0^0 protection', () => {
    const weightsZero = [0.6, 0.4, 0]
    const p3 = makeProblem([[10, 20, 5], [20, 10, 50], [15, 15, 10]], ['benefit', 'cost', 'benefit'])

    it('waspas does not corrupt WPM when w_j = 0 (x^0 = 1)', () => {
      const res = waspas.compute(p3, weightsZero, { lambda: 0 })
      expect(res.scores.every((s) => Number.isFinite(s) && s > 0)).toBe(true)
      const wpm = step(res.steps, 'waspas.wpm').vector!
      // All WPM values must be strictly positive and finite
      expect(wpm.every((v) => Number.isFinite(v) && v > 0)).toBe(true)
    })

    it('cocoso does not add 1 to P when an alternative has r = 0 on a zero-weight criterion', () => {
      // Alternative 0 has min value (0) on criterion 2, but w2 = 0
      const pZero = makeProblem([[10, 20, 1], [20, 10, 10]], ['benefit', 'benefit', 'benefit'])
      const res = cocoso.compute(pZero, [0.5, 0.5, 0], {})
      const pVec = step(res.steps, 'cocoso.p').vector!
      // Alternative 0: r0 = [0, 1, 0]; criterion 2 with w=0 must contribute 0, not 0^0 = 1
      // Criteria 0, 1: 0^0.5 = 0, 1^0.5 = 1 => total P for alt 0 should be 1, not 2
      expect(pVec[0]).toBeCloseTo(1, 10)
      expect(res.scores.every((s) => Number.isFinite(s) && !Number.isNaN(s))).toBe(true)
    })

    it('waspas and cocoso compute at lambda extremes 0 and 1 without error', () => {
      const pExtreme = makeProblem([[10, 20], [20, 10]], ['benefit', 'benefit'])
      const wExtreme = [0.6, 0.4]

      const resWaspas0 = waspas.compute(pExtreme, wExtreme, { lambda: 0 })
      const resWaspas1 = waspas.compute(pExtreme, wExtreme, { lambda: 1 })
      expect(resWaspas0.scores).toEqual(step(resWaspas0.steps, 'waspas.wpm').vector)
      expect(resWaspas1.scores).toEqual(step(resWaspas1.steps, 'waspas.wsm').vector)

      const resCocoso0 = cocoso.compute(pExtreme, wExtreme, { lambda: 0 })
      const resCocoso1 = cocoso.compute(pExtreme, wExtreme, { lambda: 1 })
      expect(resCocoso0.scores.every((s) => Number.isFinite(s))).toBe(true)
      expect(resCocoso1.scores.every((s) => Number.isFinite(s))).toBe(true)
    })
  })

  describe('mixed scales: columns of 10^9 and 10^-9 in the same matrix', () => {
    const mixedMatrix: number[][] = [
      [1e9, 1e-9, 5],
      [2e9, 3e-9, 10],
      [4e9, 2e-9, 15],
    ]
    const pMixed = makeProblem(mixedMatrix, ['benefit', 'cost', 'benefit'])
    const w3 = [1 / 3, 1 / 3, 1 / 3]

    it.each(allWeightingMethods)('$name computes finite weights on mixed-scale columns', ({ method }) => {
      const res = method.compute(pMixed, {})
      expect(res.weights.length).toBe(3)
      expect(res.weights.every((w: number) => Number.isFinite(w) && !Number.isNaN(w))).toBe(true)
      expect(res.weights.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(1, 10)
    })

    it.each(allRankingMethods)('$name computes finite scores on mixed-scale columns', ({ method }) => {
      const res = method.compute(pMixed, w3, {})
      expect(res.scores.length).toBe(3)
      expect(res.scores.every((s: number) => Number.isFinite(s) && !Number.isNaN(s))).toBe(true)
      expect(res.ranking.every((r: number) => r >= 1 && r <= 3)).toBe(true)
    })
  })
})

describe('3. Constant, near-constant, and tied data states', () => {
  describe('single constant column', () => {
    const pOneConst = makeProblem(
      [
        [10, 42, 100],
        [20, 42, 200],
        [30, 42, 150],
      ],
      ['benefit', 'benefit', 'cost'],
    )
    const w3 = [0.4, 0.2, 0.4]

    it('weighting methods assign 0 weight to the constant column with notice', () => {
      const sdRes = sd.compute(pOneConst, {})
      expect(sdRes.weights[1]).toBe(0)
      expect(sdRes.warnings).toContainEqual({ code: 'sd.constant-column', col: 1 })

      const criticRes = critic.compute(pOneConst, {})
      expect(criticRes.weights[1]).toBe(0)
      expect(criticRes.warnings).toContainEqual({ code: 'critic.constant-column', col: 1 })

      const lopcowRes = lopcow.compute(pOneConst, {})
      expect(lopcowRes.weights[1]).toBe(0)
      expect(lopcowRes.warnings).toContainEqual({ code: 'lopcow.constant-column', col: 1 })

      const merecRes = merec.compute(pOneConst, {})
      expect(merecRes.weights[1]).toBe(0)
      expect(merecRes.warnings).toContainEqual({ code: 'merec.constant-column', col: 1 })

      const entRes = entropy.compute(pOneConst, { normalization: 'minmax' })
      expect(entRes.weights[1]).toBe(0)
      expect(entRes.warnings).toContainEqual({ code: 'entropy.constant-column', col: 1 })
    })

    it.each(allRankingMethods)('$name computes safely when one column is constant', ({ method }) => {
      const res = method.compute(pOneConst, w3, {})
      expect(res.scores.every((s: number) => Number.isFinite(s))).toBe(true)
      expect(res.ranking.length).toBe(3)
    })
  })

  describe('all columns constant (every alternative identical)', () => {
    const pAllConst = makeProblem(
      [
        [10, 20],
        [10, 20],
        [10, 20],
      ],
      b2,
    )

    it('sd, lopcow, critic, merec, entropy fall back to equal weights with notice', () => {
      expect(sd.compute(pAllConst, {}).weights).toEqual([0.5, 0.5])
      expect(sd.compute(pAllConst, {}).warnings).toContainEqual({ code: 'sd.all-constant-equal-weights' })

      expect(lopcow.compute(pAllConst, {}).weights).toEqual([0.5, 0.5])
      expect(lopcow.compute(pAllConst, {}).warnings).toContainEqual({ code: 'lopcow.all-constant-equal-weights' })

      expect(critic.compute(pAllConst, {}).weights).toEqual([0.5, 0.5])
      expect(critic.compute(pAllConst, {}).warnings).toContainEqual({ code: 'critic.all-constant-equal-weights' })

      expect(merec.compute(pAllConst, {}).weights).toEqual([0.5, 0.5])
      expect(merec.compute(pAllConst, {}).warnings).toContainEqual({ code: 'merec.all-constant-equal-weights' })

      expect(entropy.compute(pAllConst, {}).weights).toEqual([0.5, 0.5])
      expect(entropy.compute(pAllConst, {}).warnings).toContainEqual({ code: 'entropy.all-constant-equal-weights' })
    })

    it('ranking methods tie all alternatives at rank 1', () => {
      expect(topsis.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
      expect(topsis.compute(pAllConst, w2, {}).warnings).toContainEqual({ code: 'topsis.zero-distance' })

      expect(saw.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])

      expect(vikor.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
      expect(vikor.compute(pAllConst, w2, {}).warnings).toContainEqual({ code: 'vikor.no-spread' })

      expect(edas.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
      expect(edas.compute(pAllConst, w2, {}).warnings).toContainEqual({ code: 'edas.no-spread' })

      expect(waspas.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
      expect(copras.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
      expect(marcos.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
      expect(mabac.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
      expect(moora.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
      expect(aras.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
      expect(codas.compute(pAllConst, w2, {}).ranking).toEqual([1, 1, 1])
    })

    it('cocoso ties all alternatives at rank 1 with cocoso.no-spread when all columns are constant', () => {
      const res = cocoso.compute(pAllConst, w2, {})
      expect(res.ranking).toEqual([1, 1, 1])
      expect(res.warnings).toContainEqual({ code: 'cocoso.no-spread' })
    })
  })

  describe('tied alternatives (identical rows between two alternatives)', () => {
    const pTied = makeProblem(
      [
        [10, 20],
        [30, 40],
        [30, 40], // Alt 2 ties Alt 1
        [50, 10],
      ],
      bc,
    )
    const w = [0.5, 0.5]

    it.each(allRankingMethods)('$name gives identical scores and tied ranks to Alt 1 and Alt 2', ({ method }) => {
      const res = method.compute(pTied, w, {})
      expect(res.scores[1]).toBeCloseTo(res.scores[2]!, 12)
      expect(res.ranking[1]).toBe(res.ranking[2])
    })
  })

  describe('cocoso all-worst-alternative vs zero-weight worst criterion', () => {
    it('blocks with all-worst-alternative when an alternative is worst across all criteria', () => {
      const p = makeProblem([[10, 10], [20, 20]], b2) // Alt 0 is worst on both
      expect(() => cocoso.compute(p, [0.5, 0.5], {})).toThrow(ProblemValidationError)
      try {
        cocoso.compute(p, [0.5, 0.5], {})
      } catch (e) {
        const issues = (e as ProblemValidationError).issues
        expect(issues).toContainEqual(expect.objectContaining({ code: 'all-worst-alternative', row: 0 }))
      }
    })

    it('does NOT block when the alternative is worst only on a criterion with weight 0', () => {
      // 3 criteria: C0 (w = 0.5), C1 (w = 0.5), C2 (w = 0). Alt 0 is worst only on C2 (w2 = 0)
      const p = makeProblem(
        [
          [20, 20, 10], // Alt 0: worst on C2 (10), but moderate on C0 and C1
          [10, 30, 20], // Alt 1: worst on C0
          [30, 10, 30], // Alt 2: worst on C1
        ],
        ['benefit', 'benefit', 'benefit'],
      )
      expect(() => cocoso.compute(p, [0.5, 0.5, 0], {})).not.toThrow()
      const res = cocoso.compute(p, [0.5, 0.5, 0], {})
      expect(res.scores.every((s) => Number.isFinite(s) && s > 0)).toBe(true)
    })

    it('blocks when the alternative is best on w=0 criterion but worst on all w>0 criteria', () => {
      // Alt 0 is best on C2 (w2 = 0), but worst on both C0 and C1 (w0 = 0.5, w1 = 0.5) -> weighted S = 0
      const p = makeProblem(
        [
          [10, 10, 100], // Alt 0: worst on C0 and C1 (the only weighted criteria)
          [20, 30, 20],
          [30, 20, 30],
        ],
        ['benefit', 'benefit', 'benefit'],
      )
      expect(() => cocoso.compute(p, [0.5, 0.5, 0], {})).toThrow(ProblemValidationError)
      try {
        cocoso.compute(p, [0.5, 0.5, 0], {})
      } catch (e) {
        expect((e as ProblemValidationError).issues).toContainEqual(
          expect.objectContaining({ code: 'all-worst-alternative', row: 0 }),
        )
      }
    })
  })

  describe('edas edge cases', () => {
    it('throws non-positive-average when a varying column has mean <= 0', () => {
      const p = makeProblem([[-2, 10], [-4, 20], [-6, 30]], b2) // col 0 mean is -4 <= 0
      expect(() => edas.compute(p, w2, {})).toThrow(ProblemValidationError)
      try {
        edas.compute(p, w2, {})
      } catch (e) {
        expect((e as ProblemValidationError).issues).toContainEqual(
          expect.objectContaining({ code: 'non-positive-average', col: 0 }),
        )
      }
    })

    it('does NOT throw non-positive-average when column is constant <= 0 (it is ignored with notice)', () => {
      const p = makeProblem([[0, 10], [0, 20], [0, 30]], b2) // col 0 is constant 0
      expect(() => edas.compute(p, w2, {})).not.toThrow()
      const res = edas.compute(p, w2, {})
      expect(res.warnings).toContainEqual({ code: 'edas.constant-column', col: 0 })
    })

    it('warns edas.negative-values and edas.small-average when 0 < mean < 0.05 * max(|x|)', () => {
      // Col 0: [-100, 102], mean = 1, max|x| = 102; 1 < 0.05 * 102 = 5.1
      const p = makeProblem([[-100, 10], [102, 20]], b2)
      const res = edas.compute(p, w2, {})
      expect(res.warnings).toContainEqual({ code: 'edas.negative-values', col: 0 })
      expect(res.warnings).toContainEqual({ code: 'edas.small-average', col: 0 })
    })

    it('warns edas.no-spread and gives AS = 0.5 to all alternatives when max SP = 0', () => {
      const p = makeProblem([[5, 10], [5, 10]], b2)
      const res = edas.compute(p, w2, {})
      expect(res.warnings).toContainEqual({ code: 'edas.no-spread' })
      expect(res.scores).toEqual([0.5, 0.5])
    })
  })

  describe('copras and moora benefit-only and cost-only problems', () => {
    const pBen = makeProblem([[10, 20], [30, 40]], ['benefit', 'benefit'])
    const pCost = makeProblem([[10, 20], [30, 40]], ['cost', 'cost'])

    it('copras on benefit-only emits copras.no-cost-criteria and scores equal sPlus', () => {
      const res = copras.compute(pBen, w2, {})
      expect(res.warnings).toContainEqual({ code: 'copras.no-cost-criteria' })
      const sPlus = step(res.steps, 'copras.sPlus').vector!
      expect(res.scores).toEqual(sPlus)
      expect(res.ranking).toEqual([2, 1])
    })

    it('copras on cost-only computes valid reciprocal scores without NaN', () => {
      const res = copras.compute(pCost, w2, {})
      expect(res.warnings).toEqual([])
      expect(res.scores.every((s) => Number.isFinite(s) && s > 0)).toBe(true)
      // Alternative 0 has lower cost, so it should rank 1
      expect(res.ranking).toEqual([1, 2])
    })

    it('moora on benefit-only has costSum = 0 and scores equal benefitSum', () => {
      const res = moora.compute(pBen, w2, {})
      const sm = step(res.steps, 'moora.costSum').vector!
      const sp = step(res.steps, 'moora.benefitSum').vector!
      expect(sm).toEqual([0, 0])
      expect(res.scores).toEqual(sp)
      expect(res.ranking).toEqual([2, 1])
    })

    it('moora on cost-only has benefitSum = 0 and scores equal -costSum', () => {
      const res = moora.compute(pCost, w2, {})
      const sm = step(res.steps, 'moora.costSum').vector!
      const sp = step(res.steps, 'moora.benefitSum').vector!
      expect(sp).toEqual([0, 0])
      expect(res.scores).toEqual(sm.map((x) => -x + 0))
      // Lower cost alternative gives higher (less negative) score -> rank 1
      expect(res.ranking).toEqual([1, 2])
    })
  })

  describe('vikor parameter bounds and degenerate cases', () => {
    const p = makeProblem([[10, 40], [30, 20], [20, 30]], bc)

    it('computes at v = 0 (regret only), v = 0.5 (balanced), and v = 1 (group utility only)', () => {
      const resV0 = vikor.compute(p, w2, { v: 0 })
      const resV05 = vikor.compute(p, w2, { v: 0.5 })
      const resV1 = vikor.compute(p, w2, { v: 1 })

      expect(resV0.diagnostics?.v).toBe(0)
      expect(resV05.diagnostics?.v).toBe(0.5)
      expect(resV1.diagnostics?.v).toBe(1)

      expect(resV0.scores.every((s) => Number.isFinite(s))).toBe(true)
      expect(resV1.scores.every((s) => Number.isFinite(s))).toBe(true)
    })

    it('throws RangeError when v is outside [0, 1]', () => {
      expect(() => vikor.compute(p, w2, { v: -0.1 })).toThrow(RangeError)
      expect(() => vikor.compute(p, w2, { v: 1.1 })).toThrow(RangeError)
    })

    it('warns vikor.equal-group-utility when S* = S- (S has zero spread)', () => {
      // Construct a problem where S is constant across alternatives but R differs
      // e.g. Alt 0: d = [0.5, 0], S = 0.5, R = 0.5
      //      Alt 1: d = [0.25, 0.25], S = 0.5, R = 0.25
      const pSFlat = makeProblem([[10, 30], [20, 20], [30, 10]], b2)
      // With w = [0.5, 0.5]:
      // Col 0: best 30, worst 10, span 20. d_i0 = 0.5 * (30 - x) / 20 = (30 - x)/40
      // Col 1: best 30, worst 10, span 20. d_i1 = 0.5 * (30 - y) / 20 = (30 - y)/40
      // S_i = (60 - (x + y))/40. For all alts, x+y = 40! So S_i = 20/40 = 0.5 everywhere!
      // But R_0 = max(0.5, 0) = 0.5, R_1 = max(0.25, 0.25) = 0.25, R_2 = max(0, 0.5) = 0.5!
      const res = vikor.compute(pSFlat, w2, {})
      expect(res.warnings).toContainEqual({ code: 'vikor.equal-group-utility' })
      expect(res.warnings).not.toContainEqual({ code: 'vikor.no-spread' })
      expect(res.scores.every((s) => Number.isFinite(s))).toBe(true)
    })

    it('warns vikor.equal-regret when R* = R- (R has zero spread while S varies)', () => {
      // Col 0: [40, 80, 40] -> best 80, worst 40, span 40. d_0 = [0.5, 0, 0.5]
      // Col 1: [80, 40, 40] -> best 80, worst 40, span 40. d_1 = [0, 0.5, 0.5]
      // R = [0.5, 0.5, 0.5] -> flat!
      // S = [0.5, 0.5, 1.0] -> varies!
      const pRFlat = makeProblem([[40, 80], [80, 40], [40, 40]], b2)
      const res = vikor.compute(pRFlat, w2, {})
      expect(res.warnings).toContainEqual({ code: 'vikor.equal-regret' })
      expect(res.warnings).not.toContainEqual({ code: 'vikor.equal-group-utility' })
      expect(res.warnings).not.toContainEqual({ code: 'vikor.no-spread' })
      expect(res.scores.every((s) => Number.isFinite(s))).toBe(true)
    })
  })

  describe('codas tau parameter boundaries and exact equality', () => {
    const p = makeProblem([[10, 20], [20, 10], [15, 15]], b2)
    const w = [0.5, 0.5]

    it('accepts boundary values tau = 0.01 and tau = 0.10', () => {
      expect(() => codas.compute(p, w, { tau: 0.01 })).not.toThrow()
      expect(() => codas.compute(p, w, { tau: 0.1 })).not.toThrow()
    })

    it('throws RangeError when tau is outside [0.01, 0.10]', () => {
      expect(() => codas.compute(p, w, { tau: 0.009 })).toThrow(RangeError)
      expect(() => codas.compute(p, w, { tau: 0.101 })).toThrow(RangeError)
    })

    it('activates taxicab distance at exact equality |E_i - E_k| >= tau', () => {
      const pExact = makeProblem([[100, 10], [92, 10]], b2)
      // Base run to inspect the exact floating-point Euclidean gap dE
      const base = codas.compute(pExact, w2, { tau: CODAS_DEFAULT_TAU })
      const e = step(base.steps, 'codas.euclidean').vector!
      const t = step(base.steps, 'codas.taxicab').vector!
      const dE = Math.abs(e[0]! - e[1]!)
      const dT = Math.abs(t[0]! - t[1]!)

      // Gap is well within allowed range [0.01, 0.10]
      expect(dE).toBeGreaterThanOrEqual(0.01)
      expect(dE).toBeLessThanOrEqual(0.1)

      // When tau = dE: |E0 - E1| >= tau is TRUE (psi = 1), so Taxicab distance dT is activated
      const resAtTau = codas.compute(pExact, w2, { tau: dE })
      expect(resAtTau.scores[0]).toBeCloseTo(dE + dT, 12)
      expect(resAtTau.scores[1]).toBeCloseTo(-(dE + dT), 12)

      // When tau = dE + 1e-6: |E0 - E1| >= tau is FALSE (psi = 0), so Taxicab distance is omitted
      const resAboveTau = codas.compute(pExact, w2, { tau: dE + 1e-6 })
      expect(resAboveTau.scores[0]).toBeCloseTo(dE, 12)
      expect(resAboveTau.scores[1]).toBeCloseTo(-dE, 12)
    })
  })

  describe('ahp and bwm extreme judgements and cyclic inconsistency', () => {
    it('ahp converges without NaN under maximum extreme ratings 9 and 1/9', () => {
      const p = makeProblem([[1, 2], [3, 4], [5, 6]], ['benefit', 'benefit', 'benefit'])
      let j = emptyJudgements(3)
      j = setPair(j, 0, 1, 9)
      j = setPair(j, 1, 2, 9)
      j = setPair(j, 0, 2, 9) // fully consistent extreme scale

      const res = ahp.compute(p, {}, j)
      expect(res.weights.every((w) => Number.isFinite(w) && w > 0)).toBe(true)
      expect(res.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    })

    it('ahp handles cyclic maximum inconsistency (A > B = 9, B > C = 9, A < C = 1/9)', () => {
      const p = makeProblem([[1, 2], [3, 4], [5, 6]], ['benefit', 'benefit', 'benefit'])
      let j = emptyJudgements(3)
      j = setPair(j, 0, 1, 9)
      j = setPair(j, 1, 2, 9)
      j = setPair(j, 0, 2, 1 / 9) // cyclic contradiction

      const res = ahp.compute(p, {}, j)
      expect(res.warnings).toContainEqual({ code: 'ahp.inconsistent' })
      expect(res.diagnostics?.cr).toBeGreaterThan(0.1)
      // By 3-way rotational symmetry, weights converge to equal [1/3, 1/3, 1/3]
      expect(res.weights[0]).toBeCloseTo(1 / 3, 4)
      expect(res.weights[1]).toBeCloseTo(1 / 3, 4)
      expect(res.weights[2]).toBeCloseTo(1 / 3, 4)

      // Worst pair detection identifies the severe inconsistency
      const worst = ahpWorstPair(
        step(res.steps, 'ahp.pairwiseMatrix').matrix!,
        res.weights,
      )
      expect(worst).not.toBeNull()
      expect(worst?.epsilon).toBeGreaterThan(1)
    })

    it('bwm flags inconsistency and provides suggestion when a_Bj * a_jW >> a_BW', () => {
      // 3 criteria, Best = 0, Worst = 2, a_BW = 9. Criterion 1: a_B1 = 9, a_1W = 9 => p(1) = 81 >> 9
      const j = judgementsFromBwm(3, 0, 2, [1, 9, 9], [9, 9, 1])
      const p = makeProblem([[1, 2, 3], [4, 5, 6]], ['benefit', 'benefit', 'benefit'])
      const res = bwm.compute(p, {}, j)
      expect(res.warnings).toContainEqual(expect.objectContaining({ code: 'bwm.inconsistent' }))
      const progress = bwmProgress(j, 3)
      expect(progress.flagged).toBe(1)
      expect(progress.suggestion).not.toBeNull()
    })

    describe('ahp partial / incomplete judgment graphs (Bozóki LLSM)', () => {
      it('returns NaN only for isolated disconnected criteria with provisional = true', () => {
        let j = emptyJudgements(3)
        j = setPair(j, 0, 1, 3) // criterion 2 has NO comparisons

        const weights = ahpIncompleteLlsm(3, j.pairs)
        expect(weights).not.toBeNull()
        expect(Number.isFinite(weights![0])).toBe(true)
        expect(Number.isFinite(weights![1])).toBe(true)
        expect(Number.isNaN(weights![2])).toBe(true)

        const progress = ahpProgress(j, 3)
        expect(progress.provisional).toBe(true)
        expect(progress.answered).toBe(1)
        expect(progress.total).toBe(3)
      })

      it('normalizes across disconnected components of size >= 2 without NaN', () => {
        // 4 criteria: Component A {0, 1} with a_01 = 2; Component B {2, 3} with a_23 = 4
        let j = emptyJudgements(4)
        j = setPair(j, 0, 1, 2)
        j = setPair(j, 2, 3, 4)

        const weights = ahpIncompleteLlsm(4, j.pairs)
        expect(weights).not.toBeNull()
        expect(weights!.every((w) => Number.isFinite(w) && !Number.isNaN(w))).toBe(true)
        expect(weights!.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
      })

      it('handles connected cyclic incomplete comparisons without crash or NaN', () => {
        let j = emptyJudgements(3)
        j = setPair(j, 0, 1, 9)
        j = setPair(j, 1, 2, 9)
        j = setPair(j, 0, 2, 1 / 9)

        const weights = ahpIncompleteLlsm(3, j.pairs)
        expect(weights).not.toBeNull()
        expect(weights!.every((w) => Number.isFinite(w) && !Number.isNaN(w))).toBe(true)
        expect(weights![0]).toBeCloseTo(1 / 3, 4)
        expect(weights![1]).toBeCloseTo(1 / 3, 4)
        expect(weights![2]).toBeCloseTo(1 / 3, 4)
      })

      it('returns null when no comparisons have been answered', () => {
        const j = emptyJudgements(3)
        expect(ahpIncompleteLlsm(3, j.pairs)).toBeNull()
      })
    })
  })

  describe('4. Algorithmic audits and findings documentation', () => {
    it('documents TOPSIS behavior on all-constant matrix up to IEEE-754 rounding', () => {
      // Col 0: [0.3, 0.1 + 0.2, 0.3], Col 1: [1.0, 1.0, 1.0]
      const pNoisy = makeProblem([[0.3, 1], [0.1 + 0.2, 1], [0.3, 1]], b2)
      const res = topsis.compute(pNoisy, w2, {})
      expect(res.scores).toEqual([0.5, 0.5, 0.5])
      expect(res.ranking).toEqual([1, 1, 1])
      expect(res.warnings).toContainEqual({ code: 'topsis.zero-distance' })
    })

    it('ignores ULP rounding noise on constant column in pairFacts', () => {
      const p = makeProblem(
        [
          [10, 0.3],
          [20, 0.1 + 0.2],
          [30, 0.3],
        ],
        b2,
      )
      const cmp = compareRankings(p, w2, [{ methodId: 'saw', params: {} }])
      const facts = pairFacts(p, w2, cmp, 0, 1)
      // Col 1 is constant within CONSTANT_TOLERANCE, so it is not treated as a decisive criterion:
      const decisiveCol1 = facts.criteria.find((c) => c.col === 1)
      expect(decisiveCol1).toBeUndefined()
    })

    it('documents CoCoSo all-worst-alternative blocking at sweepWeight endpoints for n = 2', () => {
      const p = makeProblem([[10, 20], [20, 10]], b2)
      const rankFor = rankerOf(cocoso)
      // For n = 2, at t = 0 (w = [0, 1]) and t = 1 (w = [1, 0]), CoCoSo fails with all-worst-alternative.
      // sweepWeight drops t = 0 and t = 1:
      const sw = sweepWeight(p, w2, rankFor, 0, { steps: 10 })
      expect(sw.points[0]!.wk).toBeCloseTo(0.1, 10)
      expect(sw.points.at(-1)!.wk).toBeCloseTo(0.9, 10)

      // When steps = 2, dropping both ends leaves only 1 evaluation (t = 0.5), throwing RangeError:
      expect(() => sweepWeight(p, w2, rankFor, 0, { steps: 2 })).toThrow(RangeError)
    })

    it('returns blocked recompute rows in removeCriteria when used with subjective weighting methods without judgements', () => {
      // 3 criteria problem: removing 1 criterion leaves n = 2, so recompute executes
      const p3 = makeProblem(
        [
          [10, 20, 30],
          [20, 10, 15],
        ],
        ['benefit', 'benefit', 'benefit'],
      )
      const w3 = [1 / 3, 1 / 3, 1 / 3]
      const rows = removeCriteria(p3, w3, rankerOf(saw), bwm)
      const recomputeRows = rows.filter((r) => r.mode === 'recompute')
      expect(recomputeRows).toHaveLength(3)
      for (const r of recomputeRows) {
        expect(r.ranking).toEqual([])
        expect(r.blocked?.map((x) => x.code)).toContain('anchors-missing')
      }
    })

    describe('Mathematician 1 findings: weighting, judgements, and numerical stability', () => {
      it('clamps CRITIC / pearson rounding on affine columns to [-1, 1] with non-negative conflict', () => {
        // C1 and C2 are strictly affine: C2 = 0.3 * C1 + 0.1
        const pAffine = makeProblem(
          [
            [0, 0.1],
            [1, 0.4],
            [2, 0.7],
            [12, 3.7],
            [61, 18.4],
          ],
          b2,
        )
        const res = critic.compute(pAffine, {})
        const rho = step(res.steps, 'critic.correlation').matrix!
        const conflict = step(res.steps, 'critic.conflict').vector!
        const info = step(res.steps, 'critic.information').vector!
        const infoTotal = step(res.steps, 'critic.informationTotal').scalar!

        expect(rho[0]![1]).toBe(1)
        expect(conflict[0]).toBe(0)
        expect(info[0]).toBe(0)
        expect(infoTotal).toBe(0)
      })

      it('prevents pearson overflow when columns have large magnitude ~ 1e80', () => {
        const xs = [1e80, 2e80, 3e80]
        const ys = [1e80, 2e80, 3e80]
        expect(pearson(xs, ys)).toBe(1)
      })

      it('keeps entropy constant column at 0 weight when varying column has 1 ppm spread (< ENTROPY_NO_INFORMATION)', () => {
        // Col 0 is strictly constant. Col 1 varies by 1 ppm (10^6 to 10^6 + 1).
        // Diversification d_1 ~ 1.8e-13 < ENTROPY_NO_INFORMATION (1e-12).
        const p1ppm = makeProblem(
          [
            [1000000, 1000000],
            [1000000, 1000001],
          ],
          b2,
        )
        const res = entropy.compute(p1ppm, { normalization: 'sum' })
        expect(res.warnings).toContainEqual({ code: 'entropy.constant-column', col: 0 })
        expect(res.warnings).toContainEqual({ code: 'entropy.all-constant-equal-weights' })
        expect(res.diagnostics?.constantColumns).toBe(1)
        expect(res.diagnostics?.allConstant).toBe(1)
        // Strictly constant Col 0 stays at 0; varying Col 1 gets 1:
        expect(res.weights).toEqual([0, 1])
      })

      it('emits lopcow.zero-pv-column warnings when single best alternative yields PV = 0', () => {
        // m = 3, n = 2. On each criterion, exactly one alternative is 1 and all others are 0.
        // For normalized column [1, 0, 0]: RMS = 1/sqrt(3) and sampleStd = 1/sqrt(3).
        // Because RMS === sampleStd, PV collapses to 0 on both columns.
        const pDegenerate = makeProblem(
          [
            [10, 0],
            [0, 20],
            [0, 0],
          ],
          b2,
        )
        const res = lopcow.compute(pDegenerate, {})
        const pv = step(res.steps, 'lopcow.pv').vector!
        expect(pv).toEqual([0, 0])
        expect(res.weights).toEqual([0.5, 0.5])
        expect(res.warnings).toEqual([
          { code: 'lopcow.zero-pv-column', col: 0 },
          { code: 'lopcow.zero-pv-column', col: 1 },
        ])
        expect(res.diagnostics?.allConstant).toBe(0)
      })

      it('prefers an actionable AHP worstPair where suggested !== actual on tied epsilon', () => {
        const p = makeProblem([[1, 2, 3], [4, 5, 6]], ['benefit', 'benefit', 'benefit'])
        let j = emptyJudgements(3)
        j = setPair(j, 0, 1, 1 / 9)
        j = setPair(j, 0, 2, 1 / 9)
        j = setPair(j, 1, 2, 3)

        const res = ahp.compute(p, {}, j)
        expect(res.warnings).toContainEqual({ code: 'ahp.inconsistent' })

        const A = step(res.steps, 'ahp.pairwiseMatrix').matrix!
        const worst = ahpWorstPair(A, res.weights)
        expect(worst).not.toBeNull()
        // Pair (0, 2) has actual = 1/9 and suggested = 1/6 (actionable instead of stuck (0, 1) at 1/9):
        expect(worst?.i).toBe(0)
        expect(worst?.k).toBe(2)
        expect(worst?.suggested).not.toBe(worst?.actual)
      })

      it('sanitizes BWM judgements when dimension differs from problem', () => {
        const p3 = makeProblem(
          [
            [1, 2, 3],
            [4, 5, 6],
          ],
          ['benefit', 'benefit', 'benefit'],
        )
        // Judgements for 4 criteria with worst = 3 (out of bounds for n = 3) are sanitized to worst = null:
        const j4 = judgementsFromBwm(4, 0, 3, [1, 2, 3, 4], [4, 3, 2, 1])
        expect(() => bwm.compute(p3, {}, j4)).toThrow(ProblemValidationError)
        try {
          bwm.compute(p3, {}, j4)
        } catch (e) {
          expect((e as ProblemValidationError).issues).toContainEqual({
            code: 'anchors-missing',
            severity: 'error',
          })
        }

        // An n=6 judgment matrix passed to an n=4 problem is sanitized to n=4 (never returns 6 weights):
        const p4 = makeProblem(
          [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
          ],
          ['benefit', 'benefit', 'benefit', 'benefit'],
        )
        let j6 = emptyJudgements(6)
        j6 = { ...j6, best: 0, worst: 5 }
        j6 = setPair(j6, 0, 5, 9)
        j6 = setPair(j6, 0, 1, 2)
        j6 = setPair(j6, 1, 5, 2)
        j6 = setPair(j6, 0, 2, 3)
        j6 = setPair(j6, 2, 5, 3)

        expect(() => bwm.compute(p4, {}, j6)).toThrow(ProblemValidationError)
      })
    })
  })
})
