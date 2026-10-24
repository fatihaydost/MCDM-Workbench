import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  AHP_MAX_PAIRWISE_ALTERNATIVES,
  ahp,
  ahpRanking,
  compareRankings,
  emptyAlternativeJudgements,
  judgementsFromUpper,
  ProblemValidationError,
  rankerFor,
  remapAlternativeJudgements,
  saw,
  setAlternativePair,
  setAlternativeSource,
  validateAlternativeJudgements,
  type AlternativeJudgements,
  type Problem,
} from '../src/core'
import { sum } from '../src/core/math'
import { removeCriteria } from '../src/core/robustness'
import { buildWorkbook } from '../src/features/io/xlsx'
import { computeRanking, useWorkbench } from '../src/state/workbench'

const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

const saaty = load('ahp-saaty2008-job.json')
const doguc = load('ahp-doguc2022-recruitment.json')

describe('AHP ranking — published hierarchy synthesis fixtures', () => {
  it('Saaty (2008) job selection hierarchy: 5 criteria x 3 alternatives pairwise synthesis', () => {
    const n = saaty.criteria.length
    const m = saaty.synthesis.alternatives.length
    const problem: Problem = {
      alternatives: saaty.synthesis.alternatives,
      criteria: saaty.criteria.map((name: string) => ({ name, type: 'benefit' as const })),
      matrix: Array.from({ length: m }, () => new Array<number>(n).fill(1)),
    }

    const wRes = ahp.compute(problem, { aggregation: 'eigenvector' }, judgementsFromUpper(n, saaty.upper))
    const altJudgements: AlternativeJudgements = saaty.synthesis.criteria_uppers.map(
      (u: number[]) => judgementsFromUpper(m, u).pairs,
    )

    const ev = ahpRanking.compute(problem, wRes.weights, { aggregation: 'eigenvector' }, altJudgements)
    const gm = ahpRanking.compute(problem, wRes.weights, { aggregation: 'geometric' }, altJudgements)

    expect(ev.ranking).toEqual(saaty.synthesis.expected.ranking)
    expect(gm.ranking).toEqual(saaty.synthesis.expected.ranking)
    expect(sum(ev.scores)).toBeCloseTo(1, 12)

    const localMat = ev.steps.find((s) => s.key === 'ahpRanking.local')!.matrix!
    for (let i = 0; i < m; i++) {
      expect(ev.scores[i]).toBeCloseTo(saaty.synthesis.expected.global_scores[i], 6)
      // For m = 3 alternatives, eigenvector and geometric mean coincide exactly
      expect(ev.scores[i]).toBeCloseTo(gm.scores[i]!, 12)
      for (let j = 0; j < n; j++) {
        expect(localMat[i]![j]).toBeCloseTo(saaty.synthesis.expected.local_priorities[i][j], 6)
      }
    }

    // Passing the local priorities as a decision matrix in table mode produces the exact same synthesis
    const tableProblem: Problem = {
      ...problem,
      matrix: localMat.map((row) => [...row]),
    }
    const tableRes = ahpRanking.compute(tableProblem, wRes.weights, {})
    for (let i = 0; i < m; i++) {
      expect(tableRes.scores[i]).toBeCloseTo(ev.scores[i]!, 12)
    }
    expect(tableRes.ranking).toEqual(ev.ranking)
  })

  it('Doğuç (2022) recruitment hierarchy: 5 criteria x 3 candidates pairwise synthesis', () => {
    const n = doguc.criteria.length
    const m = doguc.synthesis.alternatives.length
    const problem: Problem = {
      alternatives: doguc.synthesis.alternatives,
      criteria: doguc.criteria.map((name: string) => ({ name, type: 'benefit' as const })),
      matrix: Array.from({ length: m }, () => new Array<number>(n).fill(1)),
    }

    const wRes = ahp.compute(problem, { aggregation: 'eigenvector' }, judgementsFromUpper(n, doguc.upper))
    const altJudgements: AlternativeJudgements = doguc.synthesis.criteria_uppers.map(
      (u: number[]) => judgementsFromUpper(m, u).pairs,
    )

    const res = ahpRanking.compute(problem, wRes.weights, { aggregation: 'eigenvector' }, altJudgements)
    expect(res.ranking).toEqual(doguc.synthesis.expected.ranking)
    res.scores.forEach((s, i) => expect(s).toBeCloseTo(doguc.synthesis.expected.global_scores_eigenvector[i], 6))
  })
})

describe('AHP ranking — table-mode equivalence to SAW (sum) and mixed sources', () => {
  const problem: Problem = {
    alternatives: ['A1', 'A2', 'A3', 'A4'],
    criteria: [
      { name: 'Quality', type: 'benefit' },
      { name: 'Cost', type: 'cost' },
      { name: 'LeadTime', type: 'cost' },
      { name: 'Service', type: 'benefit' },
    ],
    matrix: [
      [80, 200, 10, 90],
      [95, 250, 8, 85],
      [70, 180, 12, 75],
      [88, 220, 9, 92],
    ],
  }
  const weights = [0.35, 0.3, 0.15, 0.2]

  it('matches SAW (normalization: sum) to 1e-12 when all criteria come from the table', () => {
    const ahpRes = ahpRanking.compute(problem, weights, {})
    const sawRes = saw.compute(problem, weights, { normalization: 'sum' })

    expect(ahpRes.ranking).toEqual(sawRes.ranking)
    expect(sum(ahpRes.scores)).toBeCloseTo(1, 12)
    ahpRes.scores.forEach((s, i) => expect(s).toBeCloseTo(sawRes.scores[i]!, 12))

    const ahpLocal = ahpRes.steps.find((s) => s.key === 'ahpRanking.local')!.matrix!
    const sawNorm = sawRes.steps.find((s) => s.key === 'saw.normalizedSum')!.matrix!
    const ahpWeighted = ahpRes.steps.find((s) => s.key === 'ahpRanking.weighted')!.matrix!
    const sawWeighted = sawRes.steps.find((s) => s.key === 'saw.weighted')!.matrix!

    for (let i = 0; i < problem.alternatives.length; i++) {
      for (let j = 0; j < problem.criteria.length; j++) {
        expect(ahpLocal[i]![j]).toBeCloseTo(sawNorm[i]![j]!, 12)
        expect(ahpWeighted[i]![j]).toBeCloseTo(sawWeighted[i]![j]!, 12)
      }
    }
  })

  it('mixes table-derived and pairwise-derived criteria and ignores benefit/cost direction on pairwise columns', () => {
    // Make criterion 1 (Cost, type: 'cost') pairwise with preference ratios 4 : 2 : 1 : 1
    const pairCost = judgementsFromUpper(4, [2, 4, 4, 2, 2, 1]).pairs
    const judgements: AlternativeJudgements = [null, pairCost, null, null]

    const resCost = ahpRanking.compute(problem, weights, { aggregation: 'eigenvector' }, judgements)
    const flippedProblem: Problem = {
      ...problem,
      criteria: problem.criteria.map((c, j) => (j === 1 ? { ...c, type: 'benefit' } : c)),
    }
    const resBenefit = ahpRanking.compute(flippedProblem, weights, { aggregation: 'eigenvector' }, judgements)

    // Because criterion 1 uses pairwise preferences ("which alternative is preferred"), flipping its table direction does not change its priorities
    resCost.scores.forEach((s, i) => expect(s).toBeCloseTo(resBenefit.scores[i]!, 12))
    const local = resCost.steps.find((s) => s.key === 'ahpRanking.local')!.matrix!
    expect(local.map((r) => r[1]!)).toEqual([0.5, 0.25, 0.125, 0.125])
    expect(sum(resCost.scores)).toBeCloseTo(1, 12)
  })

  it('supports both eigenvector and geometric mean on 4x4 pairwise alternative matrices', () => {
    // Slightly inconsistent 4x4 matrix where eigenvector and geometric mean differ slightly
    const pairs = judgementsFromUpper(4, [2, 3, 5, 2, 4, 3]).pairs
    const judgements: AlternativeJudgements = [pairs, null, null, null]
    const ev = ahpRanking.compute(problem, weights, { aggregation: 'eigenvector' }, judgements)
    const gm = ahpRanking.compute(problem, weights, { aggregation: 'geometric' }, judgements)
    expect(sum(ev.scores)).toBeCloseTo(1, 12)
    expect(sum(gm.scores)).toBeCloseTo(1, 12)
    expect(ev.scores[0]).not.toBeCloseTo(gm.scores[0]!, 7)
    expect(ev.scores[0]).toBeCloseTo(gm.scores[0]!, 2)
  })
})

describe('AHP ranking — validation, m <= 7 cap, and per-criterion inconsistency warnings', () => {
  it('blocks with judgements-incomplete (with col and answered count) when a pairwise criterion matrix is incomplete', () => {
    const p: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
      ],
      matrix: [
        [10, 20],
        [15, 25],
        [20, 30],
      ],
    }
    let j = setAlternativeSource(undefined, 3, 2, 1, 'pairwise')
    j = setAlternativePair(j, 3, 2, 1, 0, 1, 3)

    const issues = validateAlternativeJudgements(3, 2, j)
    expect(issues).toEqual([{ code: 'judgements-incomplete', severity: 'error', col: 1, row: 0, value: 1 }])
    expect(() => ahpRanking.compute(p, [0.5, 0.5], {}, j)).toThrowError(ProblemValidationError)
  })

  it('ignores pairwise alternative matrices when m > AHP_MAX_PAIRWISE_ALTERNATIVES (m = 8)', () => {
    const m = AHP_MAX_PAIRWISE_ALTERNATIVES + 1 // 8
    const p: Problem = {
      alternatives: Array.from({ length: m }, (_, i) => `A${i + 1}`),
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'cost' },
      ],
      matrix: Array.from({ length: m }, (_, i) => [i + 1, (m - i) * 10]),
    }
    // Incomplete matrix on criterion 0 — would error if m <= 7, but is ignored for m = 8
    const incomplete = setAlternativeSource(undefined, m, 2, 0, 'pairwise')
    expect(validateAlternativeJudgements(m, 2, incomplete)).toEqual([])

    const res = ahpRanking.compute(p, [0.5, 0.5], {}, incomplete)
    const sawRes = saw.compute(p, [0.5, 0.5], { normalization: 'sum' })
    res.scores.forEach((s, i) => expect(s).toBeCloseTo(sawRes.scores[i]!, 12))
    expect(res.warnings).toContainEqual({ code: 'ahp-ranking.pairwise-ignored-above-cap' })
  })

  it('allows zero or negative table cells on pairwise criteria while blocking non-positive cells on table criteria', () => {
    const p: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'PairwiseCrit', type: 'benefit' },
        { name: 'TableCrit', type: 'benefit' },
      ],
      matrix: [
        [0, 10],
        [-5, 20],
        [0, 30],
      ],
    }
    const pairs = judgementsFromUpper(3, [2, 4, 2]).pairs
    const res = ahpRanking.compute(p, [0.5, 0.5], {}, [pairs, null])
    expect(sum(res.scores)).toBeCloseTo(1, 12)

    expect(() => ahpRanking.compute(p, [0.5, 0.5], {}, [null, null])).toThrowError(ProblemValidationError)
  })

  it('emits ahp.inconsistent warning with col and extra metadata when a criterion matrix has CR >= 0.10', () => {
    const p: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
      ],
      matrix: [
        [10, 1],
        [20, 2],
        [30, 3],
      ],
    }
    // Triad [3, 3, 3] has CR ~ 0.117 >= 0.10
    const badPairs = judgementsFromUpper(3, [3, 3, 3]).pairs
    const res = ahpRanking.compute(p, [0.5, 0.5], {}, [null, badPairs])
    expect(res.warnings).toHaveLength(1)
    expect(res.warnings![0]).toMatchObject({
      code: 'ahp.inconsistent',
      col: 1,
    })
    expect(res.warnings![0]!.extra?.cr).toBeGreaterThanOrEqual(0.1)
  })
})

describe('AHP ranking — Compare echo collapsing, Robustness criterion removal, Store & XLSX', () => {
  const p: Problem = {
    alternatives: ['A1', 'A2', 'A3'],
    criteria: [
      { name: 'C1', type: 'benefit' },
      { name: 'C2', type: 'cost' },
      { name: 'C3', type: 'benefit' },
    ],
    matrix: [
      [10, 50, 30],
      [25, 40, 20],
      [15, 30, 40],
    ],
  }
  const w = [0.4, 0.3, 0.3]

  it('collapses ahp-ranking into saw echo only when saw uses sum normalization and ahp-ranking has no pairwise criteria', () => {
    // 1. SAW linearMax + AHP table: not an echo
    const cLinear = compareRankings(p, w, [
      { methodId: 'saw', params: { normalization: 'linearMax' } },
      { methodId: 'ahp-ranking', params: {} },
    ])
    expect(cLinear.runs.map((m) => m.methodId)).toEqual(['saw', 'ahp-ranking'])
    expect(cLinear.echoes).toEqual([])

    // 2. SAW sum + AHP table: ahp-ranking is marked as an echo of saw
    const cSum = compareRankings(p, w, [
      { methodId: 'saw', params: { normalization: 'sum' } },
      { methodId: 'ahp-ranking', params: {} },
    ])
    expect(cSum.runs.map((m) => m.methodId)).toEqual(['saw', 'ahp-ranking'])
    expect(cSum.echoes).toEqual([{ methodId: 'ahp-ranking', of: 'saw' }])

    // 3. SAW sum + AHP with a pairwise criterion: not an echo
    const pairs = judgementsFromUpper(3, [2, 4, 2]).pairs
    const cPairwise = compareRankings(p, w, [
      { methodId: 'saw', params: { normalization: 'sum' } },
      { methodId: 'ahp-ranking', params: {}, judgements: [pairs, null, null] },
    ])
    expect(cPairwise.runs.map((m) => m.methodId)).toEqual(['saw', 'ahp-ranking'])
    expect(cPairwise.echoes).toEqual([])
  })

  it('drops the removed criterion from alternativeJudgements during removeCriteria robustness checks', () => {
    const pairsC3 = judgementsFromUpper(3, [4, 2, 0.5]).pairs
    const rankFor = rankerFor({
      methodId: 'ahp-ranking',
      params: {},
      judgements: [null, null, pairsC3],
    })
    const removal = removeCriteria(p, w, rankFor)
    expect(removal).toHaveLength(3)

    // When criterion 0 is removed, criterion 2 becomes index 1 in the reduced 2-criterion problem and keeps pairsC3
    const reducedP: Problem = {
      alternatives: p.alternatives,
      criteria: [p.criteria[1]!, p.criteria[2]!],
      matrix: p.matrix.map((r) => [r[1]!, r[2]!]),
    }
    const manualReduced = ahpRanking.compute(reducedP, [0.5, 0.5], {}, [null, pairsC3])
    expect(removal[0]!.ranking).toEqual(manualReduced.ranking)
  })

  it('remaps alternativeJudgements across criterion and alternative edits and exports Judgements sheet in XLSX', () => {
    const store = useWorkbench.getState()
    store.reset()
    useWorkbench.getState().setProblem(p)
    useWorkbench.getState().setRankingMethod('ahp-ranking')
    useWorkbench.getState().setCriterionSource(0, 'pairwise')

    // Incomplete pairwise matrix on C1 blocks computeRanking on the ranking stage
    const blocked = computeRanking(useWorkbench.getState())
    expect(blocked.value).toBeNull()
    expect(blocked.issues).toEqual([{ code: 'judgements-incomplete', severity: 'error', col: 0, row: 0, value: 0 }])

    // Answer all 3 pairs on C1
    useWorkbench.getState().setAlternativeJudgement(0, 0, 1, 2)
    useWorkbench.getState().setAlternativeJudgement(0, 0, 2, 4)
    useWorkbench.getState().setAlternativeJudgement(0, 1, 2, 2)

    const ready = computeRanking(useWorkbench.getState())
    expect(ready.value).not.toBeNull()

    // Remap when criteria and alternatives are reordered
    const remapped = remapAlternativeJudgements(
      useWorkbench.getState().alternativeJudgements,
      [1, 0, 2],
      [1, 0, 2],
      3,
    )
    expect(remapped[0]).toBeNull()
    expect(remapped[1]![0]![1]).toBeCloseTo(0.5, 12) // A2 vs A1 = 1/2
    expect(remapped[1]![1]![0]).toBeCloseTo(2, 12)   // A1 vs A2 = 2

    // XLSX export includes Judgements sheet when alternativeJudgements has a pairwise criterion
    const altJ = useWorkbench.getState().alternativeJudgements!
    const wb = buildWorkbook(XLSX, {
      problem: p,
      ranking: { method: 'AHP', result: ready.value! },
      alternativeJudgements: altJ,
    })
    expect(wb.SheetNames).toContain('Judgements')
    expect(emptyAlternativeJudgements(3)).toEqual([null, null, null])
  })
})
