import { describe, expect, it } from 'vitest'
import {
  AHP_CR_THRESHOLD,
  ahp,
  ahpEigenvector,
  ahpGeometricMean,
  aras,
  assertValid,
  bordaCount,
  bwm,
  bwmAnswers,
  bwmSolve,
  cocoso,
  codas,
  compareRankings,
  copras,
  critic,
  edas,
  emptyJudgements,
  entropy,
  equal,
  getMethod,
  getRankingMethod,
  getWeightingMethod,
  judgementsFromBwm,
  judgementsFromUpper,
  kendallW,
  listMethods,
  lopcow,
  mabac,
  marcos,
  merec,
  moora,
  nearestScale,
  prepareRanking,
  ProblemValidationError,
  RANKING_IDS,
  rankingMethods,
  rankerFor,
  remapJudgements,
  sanitizeJudgements,
  saw,
  sd,
  setPair,
  toScale,
  topsis,
  validateProblem,
  validateRequirements,
  validateWeights,
  vikor,
  waspas,
  WEIGHTING_IDS,
  weightingMethods,
  type Criterion,
  type Problem,
  type RankingId,
  type RankingMethod,
  type Step,
  type WeightingId,
  type WeightingMethod,
} from '../src/core'
import {
  column,
  isConstant,
  isNearConstant,
  linearMaxNormalize,
  maxOf,
  mean,
  minMaxNormalize,
  minOf,
  pearson,
  sampleStd,
  sum,
  vectorNormalize,
  zeros,
} from '../src/core/math'
import { reweight } from '../src/core/reweight'
import {
  createRng,
  kendallTauB,
  midRanks,
  sampleDirichlet,
  spearman,
  wsCoefficient,
} from '../src/core/robustness'
import { computeRanking } from '../src/state/workbench'

// Base test problem with m=4 alternatives, n=3 criteria (2 benefit, 1 cost).
// No column is constant, all averages > 0, all values > 0.
// Crucially, A1 strictly Pareto-dominates A4 (C1: 100 > 90, C2 cost: 15 < 18, C3: 55 > 50).
const makeBaseProblem = (): Problem => ({
  alternatives: ['A1', 'A2', 'A3', 'A4'],
  criteria: [
    { name: 'C1', type: 'benefit' },
    { name: 'C2', type: 'cost' },
    { name: 'C3', type: 'benefit' },
  ],
  matrix: [
    [100, 15, 55], // A1: strictly dominates A4
    [80, 12, 60],  // A2: worst on C1, best on C2 and C3
    [120, 25, 40], // A3: best on C1, worst on C2 and C3
    [90, 18, 50],  // A4: dominated by A1
  ],
})

const BASE_WEIGHTS = [0.4, 0.3, 0.3]

// Perfectly consistent judgements for n=3 criteria with relative ratios 4 : 2 : 1.
// Expected weights: [4/7, 2/7, 1/7] ~ [0.57142857, 0.28571429, 0.14285714].
const makeConsistentJudgements = () => {
  // upper triangle: (0,1)=2, (0,2)=4, (1,2)=2
  return judgementsFromUpper(3, [2, 4, 2])
}

const makeConsistentBwmJudgements = () => {
  // Best = 0 (weight 4/7), Worst = 2 (weight 1/7)
  // bestToOthers: [1, 2, 4], othersToWorst: [4, 2, 1]
  return judgementsFromBwm(3, 0, 2, [1, 2, 4], [4, 2, 1])
}

describe('Registry Invariants (all 20 methods)', () => {
  it('lists exactly 8 weighting and 12 ranking methods with unique ids', () => {
    expect(WEIGHTING_IDS).toHaveLength(8)
    expect(RANKING_IDS).toHaveLength(12)
    expect(listMethods('weighting')).toHaveLength(8)
    expect(listMethods('ranking')).toHaveLength(12)
    expect(listMethods()).toHaveLength(20)

    const allIds = listMethods().map((m) => m.id)
    const uniqueIds = new Set(allIds)
    expect(uniqueIds.size).toBe(20)

    for (const id of WEIGHTING_IDS) {
      expect(getWeightingMethod(id)?.id).toBe(id)
      expect(getMethod(id)?.kind).toBe('weighting')
    }
    for (const id of RANKING_IDS) {
      expect(getRankingMethod(id)?.id).toBe(id)
      expect(getMethod(id)?.kind).toBe('ranking')
    }
  })
})

describe('Weighting Methods Invariants (all 8 methods)', () => {
  const objectiveWeightingMethods: WeightingMethod<any>[] = [
    critic,
    entropy,
    sd,
    merec,
    lopcow,
    equal,
  ]

  it('weights sum to 1, non-negative, and finite on base problem', () => {
    const p = makeBaseProblem()
    for (const id of WEIGHTING_IDS) {
      const method = weightingMethods.find((m) => m.id === id)!
      const j = id === 'bwm' ? makeConsistentBwmJudgements() : id === 'ahp' ? makeConsistentJudgements() : undefined
      const res = method.compute(p, {}, j)

      expect(res.weights.length, `${id} weights length`).toBe(p.criteria.length)
      expect(Math.abs(sum(res.weights) - 1), `${id} weights sum to 1`).toBeLessThan(1e-12)
      for (let k = 0; k < res.weights.length; k++) {
        expect(res.weights[k]!, `${id} weight ${k} >= 0`).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(res.weights[k]!), `${id} weight ${k} is finite`).toBe(true)
      }
    }
  })

  it('column permutation invariance: permuting criteria permutes weights accordingly', () => {
    const p = makeBaseProblem()
    const perm = [1, 2, 0] // C2 -> C0, C3 -> C1, C1 -> C2
    const permutedProblem: Problem = {
      alternatives: [...p.alternatives],
      criteria: perm.map((j) => p.criteria[j]!),
      matrix: p.matrix.map((row) => perm.map((j) => row[j]!)),
    }

    // Objective methods
    for (const method of objectiveWeightingMethods) {
      const orig = method.compute(p, {}).weights
      const permuted = method.compute(permutedProblem, {}).weights
      for (let newCol = 0; newCol < perm.length; newCol++) {
        const oldCol = perm[newCol]!
        expect(permuted[newCol], `${method.id} column perm`).toBeCloseTo(orig[oldCol]!, 12)
      }
    }

    // AHP (both eigenvector and geometric)
    for (const aggregation of ['eigenvector', 'geometric'] as const) {
      const ahpOrig = ahp.compute(p, { aggregation }, makeConsistentJudgements()).weights
      const ahpJPermuted = remapJudgements(makeConsistentJudgements(), perm)
      const ahpPermuted = ahp.compute(permutedProblem, { aggregation }, ahpJPermuted).weights
      for (let newCol = 0; newCol < perm.length; newCol++) {
        expect(ahpPermuted[newCol], `ahp (${aggregation}) column perm`).toBeCloseTo(ahpOrig[perm[newCol]!]!, 10)
      }
    }

    // BWM
    const bwmOrig = bwm.compute(p, {}, makeConsistentBwmJudgements()).weights
    const bwmJPermuted = remapJudgements(makeConsistentBwmJudgements(), perm)
    const bwmPermuted = bwm.compute(permutedProblem, {}, bwmJPermuted).weights
    for (let newCol = 0; newCol < perm.length; newCol++) {
      expect(bwmPermuted[newCol], 'bwm column perm').toBeCloseTo(bwmOrig[perm[newCol]!]!, 10)
    }
  })

  it('alternative (row) permutation invariance: permuting rows leaves objective weights invariant', () => {
    const p = makeBaseProblem()
    const rowPerm = [2, 0, 3, 1]
    const permutedProblem: Problem = {
      alternatives: rowPerm.map((i) => p.alternatives[i]!),
      criteria: [...p.criteria],
      matrix: rowPerm.map((i) => p.matrix[i]!),
    }

    for (const method of objectiveWeightingMethods) {
      const orig = method.compute(p, {}).weights
      const permuted = method.compute(permutedProblem, {}).weights
      for (let j = 0; j < p.criteria.length; j++) {
        expect(permuted[j], `${method.id} row perm invariance`).toBeCloseTo(orig[j]!, 13)
      }
    }

    // Check entropy with minmax as well
    const origMm = entropy.compute(p, { normalization: 'minmax' }).weights
    const permMm = entropy.compute(permutedProblem, { normalization: 'minmax' }).weights
    for (let j = 0; j < p.criteria.length; j++) {
      expect(permMm[j], 'entropy minmax row perm invariance').toBeCloseTo(origMm[j]!, 13)
    }
  })

  it('positive scale invariance: scaling a criterion column leaves weights invariant', () => {
    const p = makeBaseProblem()
    const scaleFactor = 7.5

    // Test scaling on each criterion column separately
    for (let targetCol = 0; targetCol < p.criteria.length; targetCol++) {
      const scaledProblem: Problem = {
        alternatives: [...p.alternatives],
        criteria: [...p.criteria],
        matrix: p.matrix.map((row) => row.map((val, j) => (j === targetCol ? val * scaleFactor : val))),
      }

      // critic, sd, lopcow, merec, equal
      for (const method of [critic, sd, lopcow, merec, equal]) {
        const orig = method.compute(p, {}).weights
        const scaled = method.compute(scaledProblem, {}).weights
        for (let j = 0; j < p.criteria.length; j++) {
          expect(scaled[j], `${method.id} scale invariance on col ${targetCol}`).toBeCloseTo(orig[j]!, 11)
        }
      }

      // entropy (both 'sum' and 'minmax')
      for (const norm of ['sum', 'minmax'] as const) {
        const orig = entropy.compute(p, { normalization: norm }).weights
        const scaled = entropy.compute(scaledProblem, { normalization: norm }).weights
        for (let j = 0; j < p.criteria.length; j++) {
          expect(scaled[j], `entropy (${norm}) scale invariance on col ${targetCol}`).toBeCloseTo(orig[j]!, 11)
        }
      }
    }
  })

  it('AHP exact consistency reconstruction (CR = 0, exact weights)', () => {
    const p = makeBaseProblem()
    const j = makeConsistentJudgements()
    const expectedWeights = [4 / 7, 2 / 7, 1 / 7]

    for (const aggregation of ['eigenvector', 'geometric'] as const) {
      const res = ahp.compute(p, { aggregation }, j)
      expect(res.diagnostics?.cr, `AHP (${aggregation}) CR`).toBeCloseTo(0, 10)
      expect(res.diagnostics?.ci, `AHP (${aggregation}) CI`).toBeCloseTo(0, 10)
      expect(res.diagnostics?.lambdaMax, `AHP (${aggregation}) lambdaMax`).toBeCloseTo(3.0, 10)
      for (let k = 0; k < 3; k++) {
        expect(res.weights[k], `AHP (${aggregation}) weight ${k}`).toBeCloseTo(expectedWeights[k]!, 10)
      }
    }
  })

  it('BWM exact consistency reconstruction (xi = 0, crInput = 0, exact weights)', () => {
    const p = makeBaseProblem()
    const j = makeConsistentBwmJudgements()
    const expectedWeights = [4 / 7, 2 / 7, 1 / 7]

    const res = bwm.compute(p, {}, j)
    expect(res.diagnostics?.xiL, 'BWM xi').toBeCloseTo(0, 12)
    expect(res.diagnostics?.crInput, 'BWM crInput').toBeCloseTo(0, 12)
    for (let k = 0; k < 3; k++) {
      expect(res.weights[k], `BWM weight ${k}`).toBeCloseTo(expectedWeights[k]!, 12)
    }
  })
})

describe('Ranking Methods Invariants (all 12 methods)', () => {
  it('alternative permutation invariance: shuffling rows permutes scores and ranks identically', () => {
    const p = makeBaseProblem()
    const rowPerm = [2, 0, 3, 1] // new row i is old rowPerm[i]
    const permutedProblem: Problem = {
      alternatives: rowPerm.map((i) => p.alternatives[i]!),
      criteria: [...p.criteria],
      matrix: rowPerm.map((i) => p.matrix[i]!),
    }

    for (const id of RANKING_IDS) {
      const method = rankingMethods.find((m) => m.id === id)!
      const orig = method.compute(p, BASE_WEIGHTS, {})
      const permuted = method.compute(permutedProblem, BASE_WEIGHTS, {})

      expect(permuted.scores.length, `${id} scores length`).toBe(p.alternatives.length)
      expect(permuted.ranking.length, `${id} ranking length`).toBe(p.alternatives.length)

      for (let newRow = 0; newRow < rowPerm.length; newRow++) {
        const oldRow = rowPerm[newRow]!
        expect(permuted.scores[newRow], `${id} score invariance row ${newRow} -> ${oldRow}`).toBeCloseTo(orig.scores[oldRow]!, 11)
        expect(permuted.ranking[newRow], `${id} rank invariance row ${newRow} -> ${oldRow}`).toBe(orig.ranking[oldRow]!)
      }
    }
  })

  it('criteria permutation invariance: permuting columns and weights leaves scores and ranks unchanged', () => {
    const p = makeBaseProblem()
    const colPerm = [1, 2, 0]
    const permutedProblem: Problem = {
      alternatives: [...p.alternatives],
      criteria: colPerm.map((j) => p.criteria[j]!),
      matrix: p.matrix.map((row) => colPerm.map((j) => row[j]!)),
    }
    const permutedWeights = colPerm.map((j) => BASE_WEIGHTS[j]!)

    for (const id of RANKING_IDS) {
      const method = rankingMethods.find((m) => m.id === id)!
      const orig = method.compute(p, BASE_WEIGHTS, {})
      const permuted = method.compute(permutedProblem, permutedWeights, {})

      for (let i = 0; i < p.alternatives.length; i++) {
        expect(permuted.scores[i], `${id} score criteria perm invariance`).toBeCloseTo(orig.scores[i]!, 11)
        expect(permuted.ranking[i], `${id} rank criteria perm invariance`).toBe(orig.ranking[i]!)
      }
    }
  })

  it('Pareto dominance property: dominating alternative A1 ranks ahead of dominated A4 across all 12 methods', () => {
    const p = makeBaseProblem()
    // A1 strictly dominates A4 across all benefit and cost criteria.
    // Under strictly positive weights, A1 must rank strictly better (lower rank number) than A4.
    for (const id of RANKING_IDS) {
      const method = rankingMethods.find((m) => m.id === id)!
      const res = method.compute(p, BASE_WEIGHTS, {})

      const rankA1 = res.ranking[0]! // A1
      const rankA4 = res.ranking[3]! // A4
      expect(rankA1, `${id} Pareto dominance: rank(A1) <= rank(A4)`).toBeLessThanOrEqual(rankA4)

      // Strict score ordering in line with method.order
      const scoreA1 = res.scores[0]!
      const scoreA4 = res.scores[3]!
      if (res.order === 'desc') {
        expect(scoreA1, `${id} score A1 > A4 (desc)`).toBeGreaterThan(scoreA4)
      } else {
        expect(scoreA1, `${id} score A1 < A4 (asc)`).toBeLessThan(scoreA4)
      }
    }
  })

  it('identical alternatives share the exact same score and rank (competition tie)', () => {
    const p = makeBaseProblem()
    // Duplicate row A1 into A4
    p.matrix[3] = [...p.matrix[0]!]

    for (const id of RANKING_IDS) {
      const method = rankingMethods.find((m) => m.id === id)!
      const res = method.compute(p, BASE_WEIGHTS, {})

      expect(res.scores[0], `${id} tied scores`).toBeCloseTo(res.scores[3]!, 12)
      expect(res.ranking[0], `${id} tied ranks`).toBe(res.ranking[3]!)
    }
  })
})

describe('Step Metadata and Dimensions Verification', () => {
  function verifySteps(steps: Step[], m: number, n: number, methodId: string) {
    expect(steps.length, `${methodId} has steps`).toBeGreaterThan(0)
    for (const s of steps) {
      expect(s.key.startsWith(`${methodId}.`), `step key ${s.key} starts with ${methodId}.`).toBe(true)

      if (s.matrix) {
        expect(s.axes, `step ${s.key} matrix axes length`).toHaveLength(2)
        const [rAxis, cAxis] = s.axes
        const expectedRows = rAxis === 'alternatives' ? m : rAxis === 'criteria' ? n : 0
        expect(s.matrix.length, `step ${s.key} row count`).toBe(expectedRows)

        for (let r = 0; r < s.matrix.length; r++) {
          const row = s.matrix[r]!
          const expectedCols = cAxis === 'criteria' ? n : cAxis === 'alternatives' ? m : cAxis === 'lambda' ? 11 : 0
          expect(row.length, `step ${s.key} row ${r} col count`).toBe(expectedCols)
          for (let c = 0; c < row.length; c++) {
            expect(Number.isFinite(row[c]), `step ${s.key}[${r}][${c}] must be finite`).toBe(true)
          }
        }
      } else if (s.vector) {
        const expectedLen = s.axes === 'alternatives' ? m : s.axes === 'criteria' ? n : 0
        expect(s.vector.length, `step ${s.key} vector length`).toBe(expectedLen)
        for (let i = 0; i < s.vector.length; i++) {
          expect(Number.isFinite(s.vector[i]), `step ${s.key}[${i}] must be finite`).toBe(true)
        }
      } else if (s.scalar !== undefined) {
        expect(Number.isFinite(s.scalar), `step ${s.key} scalar must be finite`).toBe(true)
      }
    }
  }

  it('all 12 ranking methods produce well-typed steps via prepareRanking', () => {
    const p = makeBaseProblem()
    const m = p.alternatives.length
    const n = p.criteria.length

    for (const id of RANKING_IDS) {
      const prepared = prepareRanking(p, { methodId: id, params: {} })
      expect(prepared.issues.filter((x) => x.severity === 'error'), `${id} no error issues`).toHaveLength(0)
      expect(prepared.rank, `${id} rank function present`).not.toBeNull()

      const res = prepared.rank!(BASE_WEIGHTS)
      expect(res.value, `${id} computed value`).not.toBeNull()
      verifySteps(res.value!.steps, m, n, id)
    }
  })

  it('special matrix axes are explicitly verified (CODAS m x m, WASPAS/CoCoSo m x 11, CRITIC/AHP n x n)', () => {
    const p = makeBaseProblem()
    const m = p.alternatives.length
    const n = p.criteria.length

    // CODAS relative assessment matrix is m x m
    const codasRes = codas.compute(p, BASE_WEIGHTS, {})
    const codasRel = codasRes.steps.find((s) => s.key === 'codas.relativeAssessment')!
    expect(codasRel.matrix).toBeDefined()
    expect(codasRel.axes).toEqual(['alternatives', 'alternatives'])
    expect(codasRel.matrix!.length).toBe(m)
    expect(codasRel.matrix![0]!.length).toBe(m)

    // WASPAS lambda sweep is m x 11
    const waspasRes = waspas.compute(p, BASE_WEIGHTS, {})
    const waspasSweep = waspasRes.steps.find((s) => s.key === 'waspas.lambdaSweep')!
    expect(waspasSweep.matrix).toBeDefined()
    expect(waspasSweep.axes).toEqual(['alternatives', 'lambda'])
    expect(waspasSweep.matrix!.length).toBe(m)
    expect(waspasSweep.matrix![0]!.length).toBe(11)

    // CoCoSo lambda sweep is m x 11
    const cocosoRes = cocoso.compute(p, BASE_WEIGHTS, {})
    const cocosoSweep = cocosoRes.steps.find((s) => s.key === 'cocoso.lambdaSweep')!
    expect(cocosoSweep.matrix).toBeDefined()
    expect(cocosoSweep.axes).toEqual(['alternatives', 'lambda'])
    expect(cocosoSweep.matrix!.length).toBe(m)
    expect(cocosoSweep.matrix![0]!.length).toBe(11)

    // CRITIC correlation matrix is n x n
    const criticRes = critic.compute(p, {})
    const criticCorr = criticRes.steps.find((s) => s.key === 'critic.correlation')!
    expect(criticCorr.matrix).toBeDefined()
    expect(criticCorr.axes).toEqual(['criteria', 'criteria'])
    expect(criticCorr.matrix!.length).toBe(n)
    expect(criticCorr.matrix![0]!.length).toBe(n)

    // AHP pairwise comparison matrix is n x n
    const ahpRes = ahp.compute(p, {}, makeConsistentJudgements())
    const ahpComp = ahpRes.steps.find((s) => s.key === 'ahp.pairwiseMatrix')!
    expect(ahpComp.matrix).toBeDefined()
    expect(ahpComp.axes).toEqual(['criteria', 'criteria'])
    expect(ahpComp.matrix!.length).toBe(n)
    expect(ahpComp.matrix![0]!.length).toBe(n)
  })

  it('all 12 ranking methods produce well-typed steps via computeRanking (workbench state)', () => {
    const p = makeBaseProblem()
    const m = p.alternatives.length
    const n = p.criteria.length

    for (const id of RANKING_IDS) {
      const computed = computeRanking({
        problem: p,
        weightMethod: 'equal',
        manualWeights: [],
        rankingMethod: id,
        methodParams: {},
        judgements: emptyJudgements(n),
      })

      expect(computed.issues.filter((x) => x.severity === 'error'), `${id} computeRanking no errors`).toHaveLength(0)
      expect(computed.value, `${id} computeRanking has value`).not.toBeNull()
      verifySteps(computed.value!.steps, m, n, id)
    }
  })

  it('all 8 weighting methods produce well-typed steps matching metadata', () => {
    const p = makeBaseProblem()
    const m = p.alternatives.length
    const n = p.criteria.length

    for (const id of WEIGHTING_IDS) {
      const method = weightingMethods.find((x) => x.id === id)!
      const j = id === 'bwm' ? makeConsistentBwmJudgements() : id === 'ahp' ? makeConsistentJudgements() : undefined
      const res = method.compute(p, {}, j)
      verifySteps(res.steps, m, n, id)
    }
  })
})

describe('Core Math and Normalization Invariants', () => {
  it('minMaxNormalize invariants: values in [0, 1], best is 1, affine scale invariant', () => {
    const p = makeBaseProblem()
    const { r } = minMaxNormalize(p)

    for (let j = 0; j < p.criteria.length; j++) {
      const col = r.map((row) => row[j]!)
      expect(maxOf(col), `col ${j} max`).toBeCloseTo(1, 14)
      expect(minOf(col), `col ${j} min`).toBeCloseTo(0, 14)
      for (const val of col) {
        expect(val).toBeGreaterThanOrEqual(-1e-15)
        expect(val).toBeLessThanOrEqual(1 + 1e-15)
      }
    }
  })

  it('linearMaxNormalize invariants: benefit x/max and cost min/x in (0, 1], best is 1', () => {
    const p = makeBaseProblem()
    const r = linearMaxNormalize(p)

    for (let j = 0; j < p.criteria.length; j++) {
      const col = r.map((row) => row[j]!)
      expect(maxOf(col), `col ${j} best`).toBeCloseTo(1, 14)
      for (const val of col) {
        expect(val).toBeGreaterThan(0)
        expect(val).toBeLessThanOrEqual(1 + 1e-15)
      }
    }
  })

  it('vectorNormalize invariants: sum of squares along each column equals 1', () => {
    const p = makeBaseProblem()
    const { normalized, zeroCols } = vectorNormalize(p.matrix)
    expect(zeroCols).toHaveLength(0)

    for (let j = 0; j < p.criteria.length; j++) {
      const colSqSum = normalized.reduce((acc, row) => acc + row[j]! * row[j]!, 0)
      expect(colSqSum, `col ${j} vector norm`).toBeCloseTo(1, 14)
    }
  })

  it('sampleStd and pearson correlation invariants', () => {
    const xs = [10, 20, 30, 40]
    const ys = [5, 10, 15, 20]
    const zs = [40, 30, 20, 10]

    // Pearson invariants
    expect(pearson(xs, xs)).toBeCloseTo(1, 14)
    expect(pearson(xs, ys)).toBeCloseTo(1, 14)
    expect(pearson(xs, zs)).toBeCloseTo(-1, 14)
    expect(pearson(xs, ys)).toBeCloseTo(pearson(ys, xs), 14)

    // Constant array yields 0
    expect(pearson(xs, [5, 5, 5, 5])).toBe(0)

    // Sample std scale property: std(c * x) = |c| * std(x)
    const s1 = sampleStd(xs)
    const s2 = sampleStd(xs.map((x) => -3 * x))
    expect(s2).toBeCloseTo(3 * s1, 12)
  })

  it('isConstant and isNearConstant are mutually exclusive', () => {
    const exact = [5, 5, 5, 5]
    expect(isConstant(exact)).toBe(true)
    expect(isNearConstant(exact)).toBe(false)

    const near = [1, 1 + 1e-10, 1, 1]
    expect(isConstant(near)).toBe(false)
    expect(isNearConstant(near)).toBe(true)

    const normal = [1, 2, 3, 4]
    expect(isConstant(normal)).toBe(false)
    expect(isNearConstant(normal)).toBe(false)
  })

  it('LOPCOW algebraic identity RMS_j^2 - sigma_j^2 >= 0 holds for all normalized columns', () => {
    const p = makeBaseProblem()
    const { r } = minMaxNormalize(p)
    const m = r.length

    for (let j = 0; j < p.criteria.length; j++) {
      const col = r.map((row) => row[j]!)
      const sq = col.reduce((acc, v) => acc + v * v, 0)
      const rms = Math.sqrt(sq / m)
      const s = sampleStd(col)

      // Algebraic non-negativity
      expect(rms * rms - s * s).toBeGreaterThanOrEqual(-1e-14)
    }
  })
})

describe('Validation, Execution, and Judgements Invariants', () => {
  it('validateProblem catches structural issues', () => {
    // Too few alternatives
    const tooFewM: Problem = { alternatives: ['A1'], criteria: [{ name: 'C1', type: 'benefit' }, { name: 'C2', type: 'cost' }], matrix: [[1, 2]] }
    expect(validateProblem(tooFewM)).toContainEqual(expect.objectContaining({ code: 'too-few-alternatives' }))

    // Too few criteria
    const tooFewN: Problem = { alternatives: ['A1', 'A2'], criteria: [{ name: 'C1', type: 'benefit' }], matrix: [[1], [2]] }
    expect(validateProblem(tooFewN)).toContainEqual(expect.objectContaining({ code: 'too-few-criteria' }))

    // Non-finite cell
    const nanProblem: Problem = {
      alternatives: ['A1', 'A2'],
      criteria: [{ name: 'C1', type: 'benefit' }, { name: 'C2', type: 'cost' }],
      matrix: [[1, Number.NaN], [2, 3]],
    }
    expect(validateProblem(nanProblem)).toContainEqual(expect.objectContaining({ code: 'invalid-cell' }))
  })

  it('validateWeights catches length, negative, and sum mismatch', () => {
    expect(validateWeights([0.5, 0.5], 3)).toContainEqual(expect.objectContaining({ code: 'weights-length-mismatch' }))
    expect(validateWeights([0.6, -0.1, 0.5], 3)).toContainEqual(expect.objectContaining({ code: 'negative-weight' }))
    expect(validateWeights([0.4, 0.4, 0.4], 3)).toContainEqual(expect.objectContaining({ code: 'weights-sum' }))
  })

  it('assertValid throws ProblemValidationError on errors and returns warnings on valid problem', () => {
    const invalid: Problem = { alternatives: ['A1'], criteria: [{ name: 'C1', type: 'benefit' }], matrix: [[1]] }
    expect(() => assertValid(validateProblem(invalid))).toThrow(ProblemValidationError)

    const valid = makeBaseProblem()
    expect(assertValid(validateProblem(valid))).toEqual([])
  })

  it('rankerFor throws on unknown method or invalid problem and returns valid results', () => {
    const valid = makeBaseProblem()
    expect(() => rankerFor({ methodId: 'unknown-id', params: {} })(valid)).toThrow(/unknown ranking method/)

    const invalid: Problem = { alternatives: ['A1'], criteria: [{ name: 'C1', type: 'benefit' }], matrix: [[1]] }
    expect(() => rankerFor({ methodId: 'topsis', params: {} })(invalid)).toThrow(ProblemValidationError)

    const topsisRanker = rankerFor({ methodId: 'topsis', params: {} })(valid)
    const res = topsisRanker(BASE_WEIGHTS)
    expect(res.scores).toHaveLength(4)
    expect(res.ranking).toHaveLength(4)
  })

  it('nearestScale rounds to valid Saaty scale and preserves reciprocal symmetry', () => {
    expect(nearestScale(1.0)).toBe(1)
    expect(nearestScale(2.1)).toBe(2)
    expect(nearestScale(9.2)).toBe(9)
    expect(nearestScale(1 / 2.1)).toBe(1 / 2)
    expect(nearestScale(1 / 8.9)).toBe(1 / 9)
  })

  it('setPair updates both [i][k] and [k][i] with reciprocals', () => {
    const j0 = emptyJudgements(3)
    const j1 = setPair(j0, 0, 1, 3)
    expect(j1.pairs[0]![1]).toBe(3)
    expect(j1.pairs[1]![0]).toBeCloseTo(1 / 3, 9)
  })

  it('sanitizeJudgements cleans corrupted input back to safe Judgements', () => {
    const corrupted = {
      pairs: [
        [1, 999, 4],
        [null, 1, 2],
        [null, null, 1],
      ],
      best: 0,
      worst: 0, // conflicting anchors
    }
    const clean = sanitizeJudgements(corrupted, 3)
    expect(clean.pairs[0]![1]).toBeNull() // 999 not on Saaty scale -> null
    expect(clean.pairs[0]![2]).toBe(4)
    expect(clean.pairs[2]![0]).toBeCloseTo(1 / 4, 9)
    expect(clean.best).toBeNull() // invalid anchor conflict cleaned
    expect(clean.worst).toBeNull()
  })
})

describe('Compare and Robustness Invariants', () => {
  it('bordaCount total points invariant', () => {
    const rankings = [
      [1, 2, 3, 4],
      [2, 1, 4, 3],
      [1, 3, 2, 4],
    ]
    const m = rankings.length
    const n = rankings[0]!.length
    const { points, ranking } = bordaCount(rankings)

    // Total points distributed across n alternatives: m * n*(n - 1)/2
    const totalPoints = sum(points)
    const expectedTotal = m * ((n * (n - 1)) / 2)
    expect(totalPoints).toBe(expectedTotal)
    expect(ranking.length).toBe(n)
  })

  it('kendallW equals 1.0 on identical rankings and is bounded in [0, 1]', () => {
    const identical = [
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
    ]
    expect(kendallW(identical)).toBeCloseTo(1.0, 14)

    const mixed = [
      [1, 2, 3, 4],
      [4, 3, 2, 1],
      [2, 1, 4, 3],
    ]
    const w = kendallW(mixed)
    expect(w).toBeGreaterThanOrEqual(0)
    expect(w).toBeLessThanOrEqual(1)
  })

  it('compareRankings correctly detects MARCOS as echo of SAW linearMax', () => {
    const p = makeBaseProblem()
    const runs = [
      { methodId: 'saw', params: { normalization: 'linearMax' } },
      { methodId: 'marcos', params: {} },
      { methodId: 'topsis', params: {} },
    ]
    const comp = compareRankings(p, BASE_WEIGHTS, runs)
    expect(comp.comparable).toBe(true)
    expect(comp.echoes).toContainEqual({ methodId: 'marcos', of: 'saw' })
  })

  it('reweight maintains sum(weights) = 1 and relative ratios among untouched criteria', () => {
    const orig = [0.5, 0.3, 0.2]
    for (const targetW of [0.0, 0.25, 0.7, 1.0]) {
      const rw = reweight(orig, 0, targetW)
      expect(sum(rw)).toBeCloseTo(1.0, 14)
      expect(rw[0]).toBeCloseTo(targetW, 14)

      // Untouched criteria (1 and 2) maintain their relative ratio 0.3 / 0.2 = 1.5 (unless targetW = 1)
      if (targetW < 1.0) {
        expect(rw[1]! / rw[2]!).toBeCloseTo(orig[1]! / orig[2]!, 12)
      } else {
        expect(rw[1]).toBe(0)
        expect(rw[2]).toBe(0)
      }
    }
  })

  it('Spearman, Kendall tau-b, and WS rank similarity metrics invariants', () => {
    const r1 = [1, 2, 3, 4, 5]
    const r2 = [5, 4, 3, 2, 1]

    // Spearman
    expect(spearman(r1, r1)).toBeCloseTo(1.0, 14)
    expect(spearman(r1, r2)).toBeCloseTo(-1.0, 14)

    // Kendall tau-b
    expect(kendallTauB(r1, r1)).toBeCloseTo(1.0, 14)
    expect(kendallTauB(r1, r2)).toBeCloseTo(-1.0, 14)

    // WS rank similarity
    expect(wsCoefficient(r1, r1)).toBeCloseTo(1.0, 14)
    const ws = wsCoefficient(r1, r2)
    expect(ws).toBeGreaterThanOrEqual(0)
    expect(ws).toBeLessThanOrEqual(1)

    // Dirichlet sampling invariant: weights always sum to 1 and are strictly positive
    const rng = createRng(12345)
    for (let trial = 0; trial < 10; trial++) {
      const sample = sampleDirichlet([1, 1, 1], rng)
      expect(sum(sample)).toBeCloseTo(1.0, 12)
      expect(sample.every((w) => w > 0)).toBe(true)
    }
  })
})

