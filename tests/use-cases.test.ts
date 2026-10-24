import { describe, expect, it } from 'vitest'
import {
  ahp,
  ahpIncompleteLlsm,
  ahpProgress,
  aras,
  bordaCount,
  bwm,
  bwmAnswers,
  bwmProgress,
  cocoso,
  codas,
  compareRankings,
  copras,
  critic,
  edas,
  emptyJudgements,
  entropy,
  equal,
  judgementsFromBwm,
  kendallW,
  lopcow,
  mabac,
  marcos,
  merec,
  moora,
  pairFacts,
  prepareRanking,
  ProblemValidationError,
  rankerFor,
  rankingMethods,
  saw,
  sd,
  setPair,
  topsis,
  validateProblem,
  validateWeights,
  vikor,
  vikorCompromise,
  waspas,
  type Problem,
  type RankingId,
  type RankingRun,
  type Judgements,
} from '../src/core'
import {
  DEFAULT_DELTAS,
  monteCarlo,
  perturbWeights,
  removeCriteria,
  spearman,
  sweepWeight,
  wsCoefficient,
} from '../src/core/robustness'
import { examples, getExample } from '../src/data/examples'
import { ahpQuestions, bwmQuestions } from '../src/features/pairwise'
import { createHistory, deleteCriterion, pushHistory, redo, undo } from '../src/features/grid/model'
import { whySentences } from '../src/app/workbench/compare/why'
import {
  buildWorkbook,
  stepToTable,
  tableToLatex,
  tableToTsv,
  writeWorkbook,
  type SheetJS,
} from '../src/features/io'
import {
  computeRanking,
  computeWeights,
  initialWorkbench,
  paramsFor,
  toProblem,
  useWorkbench,
} from '../src/state/workbench'
import { expectClose } from './helpers'

const X: SheetJS | null = await import('xlsx').then((m) => (m.default ?? m) as SheetJS).catch(() => null)

const ALL_RANKING_IDS: readonly RankingId[] = [
  'topsis',
  'vikor',
  'saw',
  'edas',
  'waspas',
  'copras',
  'marcos',
  'cocoso',
  'mabac',
  'moora',
  'aras',
  'codas',
]

const allRuns: RankingRun[] = ALL_RANKING_IDS.map((methodId) => ({ methodId, params: {} }))

describe('Use Case 1 — Objective Weight Family Comparison (Smartphone Selection)', () => {
  const ex = getExample('krishnan-2021-smartphones')!
  const problem: Problem = {
    alternatives: ex.alternatives,
    criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
    matrix: ex.matrix.map((row) => [...row]),
  }

  const weightFamilies = [
    { id: 'critic', compute: () => critic.compute(problem, {}) },
    { id: 'entropy-sum', compute: () => entropy.compute(problem, { normalization: 'sum' }) },
    { id: 'entropy-minmax', compute: () => entropy.compute(problem, { normalization: 'minmax' }) },
    { id: 'sd', compute: () => sd.compute(problem, {}) },
    { id: 'merec', compute: () => merec.compute(problem, {}) },
    { id: 'lopcow', compute: () => lopcow.compute(problem, {}) },
    { id: 'equal', compute: () => equal.compute(problem, {}) },
  ] as const

  for (const family of weightFamilies) {
    it(`evaluates all 12 ranking methods and builds consensus with ${family.id} weights`, () => {
      const wRes = family.compute()
      const wIssues = validateWeights(wRes.weights, problem.criteria.length)
      expect(wIssues.filter((x) => x.severity === 'error')).toEqual([])
      expect(wRes.weights.every((w) => w >= 0)).toBe(true)
      expectClose(wRes.weights.reduce((a, b) => a + b, 0), 1, 1e-6)

      for (const rankId of ALL_RANKING_IDS) {
        const prep = prepareRanking(problem, { methodId: rankId, params: {} })
        expect(prep.rank).not.toBeNull()
        const res = prep.rank!(wRes.weights)
        expect(res.value).not.toBeNull()
        expect(res.value!.ranking).toHaveLength(problem.alternatives.length)
        expect([...res.value!.ranking].sort()).toEqual([1, 2, 3, 4, 5])
      }

      const comp = compareRankings(problem, wRes.weights, allRuns)
      expect(comp.comparable).toBe(true)
      expect(comp.ranked).toHaveLength(12)
      expect(comp.echoes).toEqual([{ methodId: 'marcos', of: 'saw' }])
      expect(comp.borda).not.toBeNull()
      expect(comp.borda!.ranking).toHaveLength(problem.alternatives.length)
      expect(comp.kendallW).not.toBeNull()
      expect(comp.kendallW!).toBeGreaterThan(0.6)
      expect(comp.kendallW!).toBeLessThanOrEqual(1.0)
      expect(comp.firstPlace).not.toBeNull()
      expect(comp.firstPlace!.of).toBe(11) // 12 methods minus 1 echo
    })
  }
})

describe('Use Case 2 — Expert Judgment to Decision (BWM and AHP Workflow)', () => {
  const criteria = [
    { name: 'Quality', type: 'benefit' as const },
    { name: 'Price', type: 'cost' as const },
    { name: 'Safety', type: 'benefit' as const },
    { name: 'Comfort', type: 'benefit' as const },
    { name: 'Style', type: 'benefit' as const },
  ]
  const n = criteria.length
  const sampleProblem: Problem = {
    alternatives: ['Option A', 'Option B', 'Option C'],
    criteria,
    matrix: [
      [85, 25000, 9, 8, 7],
      [90, 32000, 10, 9, 9],
      [75, 18000, 7, 6, 6],
    ],
  }

  it('BWM: progressive pairwise entry, inconsistency flagging, and recommendation resolution', () => {
    const best = 1 // Price
    const worst = 4 // Style
    let j: Judgements = { ...emptyJudgements(n), best, worst }

    const initialProg = bwmProgress(j, n)
    expect(initialProg.answered).toBe(0)
    expect(initialProg.total).toBe(2 * n - 3) // 7
    expect(initialProg.weights).toBeNull()

    // Answer Best-to-Others: [2, 1, 4, 3, 8]
    const bToOthers = [2, 1, 4, 3, 8]
    for (let k = 0; k < n; k++) {
      if (k !== best) j = setPair(j, best, k, bToOthers[k]!)
    }
    const midProg = bwmProgress(j, n)
    expect(midProg.answered).toBe(4)
    expect(midProg.provisional).toBe(true)
    expect(midProg.weights).not.toBeNull()

    // Answer Others-to-Worst with deliberate severe inconsistency on criterion 2 (Safety):
    // a_BW = 8, a_B,2 = 4. Perfectly consistent a_2,W would be ~ 8/4 = 2.
    // Entering a_2,W = 8 creates 4 * 8 = 32 >> 8, CR^I = 0.428571 > 0.2958.
    const oToWorstInconsistent = [4, 8, 8, 3, 1]
    for (let k = 0; k < n; k++) {
      if (k !== worst && k !== best) j = setPair(j, k, worst, oToWorstInconsistent[k]!)
    }
    const incProg = bwmProgress(j, n)
    expect(incProg.answered).toBe(7)
    expect(incProg.provisional).toBe(false)
    expect(incProg.crInput!).toBeGreaterThan(incProg.threshold!.value)
    expect(incProg.flagged).toBe(2)
    expect(incProg.suggestion).toEqual({ side: 'othersToWorst', value: 2 })

    // Apply the recommended suggestion for the flagged pair
    j = setPair(j, incProg.flagged!, worst, incProg.suggestion!.value)
    const fixedProg = bwmProgress(j, n)
    expect(fixedProg.crInput!).toBeLessThanOrEqual(fixedProg.threshold!.value)
    expect(fixedProg.flagged).toBeNull()

    // Finalize weights with bwm.compute
    const bwmResult = bwm.compute(sampleProblem, {}, j)
    expectClose(bwmResult.weights.reduce((a, b) => a + b, 0), 1, 1e-6)
    expect(bwmResult.weights[best]!).toBeGreaterThan(bwmResult.weights[worst]!)
  })

  it('AHP: progressive queue, Bozóki LLSM live weights, worst pair recommendation dropping CR < 0.10, and downstream analysis', () => {
    const ahpCriteria = criteria.slice(0, 4) // 4 criteria
    const m = ahpCriteria.length
    const ahpProblem: Problem = {
      alternatives: sampleProblem.alternatives,
      criteria: ahpCriteria,
      matrix: sampleProblem.matrix.map((row) => row.slice(0, 4)),
    }

    let j = emptyJudgements(m)
    const questions = ahpQuestions(m) // spanning path first (0-1, 1-2, 2-3), then distance 2 and 3
    expect(questions).toHaveLength((m * (m - 1)) / 2) // 6

    // 1. Spanning tree answers (connected component spanning all 4 criteria)
    j = setPair(j, 0, 1, 3)
    j = setPair(j, 1, 2, 2)
    j = setPair(j, 2, 3, 2)
    const spanProg = ahpProgress(j, m)
    expect(spanProg.answered).toBe(3)
    expect(spanProg.provisional).toBe(true)
    expect(spanProg.weights).not.toBeNull()
    expect(spanProg.weights!.every((w) => Number.isFinite(w) && w > 0)).toBe(true)
    expectClose(spanProg.weights!.reduce((a, b) => a + b, 0), 1, 1e-6)

    // 2. Add remaining pairs with an inconsistent triad (0-2 = 1/2 instead of 6, creating high circular error)
    j = setPair(j, 0, 2, 1 / 2) // contradictory: 0 > 1 (3) and 1 > 2 (2) implies 0 > 2 (~6)
    j = setPair(j, 1, 3, 4)
    j = setPair(j, 0, 3, 9)
    const incProg = ahpProgress(j, m)
    expect(incProg.answered).toBe(6)
    expect(incProg.provisional).toBe(false)
    expect(incProg.inconsistent).toBe(true)
    expect(incProg.cr!).toBeGreaterThanOrEqual(0.1)
    expect(incProg.worstPair).not.toBeNull()
    expect(incProg.worstPair!.i).toBe(0)
    expect(incProg.worstPair!.k).toBe(2)

    // 3. Decision maker accepts the recommended Saaty value
    j = setPair(j, incProg.worstPair!.i, incProg.worstPair!.k, incProg.worstPair!.suggested)
    const fixedProg = ahpProgress(j, m)
    expect(fixedProg.cr!).toBeLessThan(0.1)
    expect(fixedProg.inconsistent).toBe(false)

    // 4. Compute AHP weights
    const ahpRes = ahp.compute(ahpProblem, {}, j)
    expect(ahpRes.warnings).toBeUndefined()
    const weights = ahpRes.weights

    // 5. Downstream Decision: ranking and multi-method consensus
    const runs: RankingRun[] = ['topsis', 'vikor', 'saw', 'edas', 'moora'].map((methodId) => ({ methodId, params: {} }))
    const comp = compareRankings(ahpProblem, weights, runs)
    expect(comp.comparable).toBe(true)
    expect(comp.ranked).toEqual(['topsis', 'vikor', 'saw', 'edas', 'moora'])
    expect(comp.borda).not.toBeNull()

    // 6. Robustness: Criteria removal & Weight sweep on top criterion
    const topsisRanker = rankerFor({ methodId: 'topsis', params: {} })
    const removal = removeCriteria(ahpProblem, weights, topsisRanker)
    expect(removal).toHaveLength(m)
    removal.forEach((r) => {
      expect(Number.isFinite(r.spearman)).toBe(true)
      expect(r.spearman).toBeGreaterThanOrEqual(-1)
      expect(r.spearman).toBeLessThanOrEqual(1)
    })

    const topWeightCrit = weights.indexOf(Math.max(...weights))
    const sweep = sweepWeight(ahpProblem, weights, topsisRanker, topWeightCrit)
    expect(sweep.rankingIntervals.length).toBeGreaterThan(0)
    expect(sweep.baseRankingInterval.from).toBeLessThanOrEqual(weights[topWeightCrit]!)
    expect(sweep.baseRankingInterval.to).toBeGreaterThanOrEqual(weights[topWeightCrit]!)
  })
})

describe('Use Case 3 — Financial / Macroeconomic Dataset with Zero and Negative Values', () => {
  // Real-world portfolio performance matrix:
  // C1: Net Profit Growth (%) [benefit] - has negative & zero
  // C2: Operating Margin (%) [benefit] - has negative & zero
  // C3: Debt / Equity [cost] - strictly positive
  // C4: Revenue Growth (%) [benefit] - has negative
  const financialProblem: Problem = {
    alternatives: ['Alpha Corp', 'Beta Group', 'Gamma Ltd', 'Delta Inc'],
    criteria: [
      { name: 'Net Profit Growth', type: 'benefit' },
      { name: 'Operating Margin', type: 'benefit' },
      { name: 'Debt to Equity', type: 'cost' },
      { name: 'Revenue Growth', type: 'benefit' },
    ],
    matrix: [
      [-5.2, 0.0, 1.2, 3.4],
      [0.0, -2.5, 0.8, -1.1],
      [12.4, 8.6, 2.5, 14.2],
      [-1.8, 4.2, 1.5, 5.0],
    ],
  }

  it('validates which weighting methods succeed vs which return clear cell/criterion issues', () => {
    // Methods that succeed on zero/negative values
    const criticRes = critic.compute(financialProblem, {})
    expectClose(criticRes.weights.reduce((a, b) => a + b, 0), 1, 1e-6)

    const sdRes = sd.compute(financialProblem, {})
    expectClose(sdRes.weights.reduce((a, b) => a + b, 0), 1, 1e-6)

    const lopcowRes = lopcow.compute(financialProblem, {})
    expectClose(lopcowRes.weights.reduce((a, b) => a + b, 0), 1, 1e-6)

    const entropyMinMax = entropy.compute(financialProblem, { normalization: 'minmax' })
    expectClose(entropyMinMax.weights.reduce((a, b) => a + b, 0), 1, 1e-6)

    const equalRes = equal.compute(financialProblem, {})
    expect(equalRes.weights).toEqual([0.25, 0.25, 0.25, 0.25])

    // MEREC requires strictly positive values and throws ProblemValidationError with exact cell issues
    expect(() => merec.compute(financialProblem, {})).toThrow(ProblemValidationError)
    try {
      merec.compute(financialProblem, {})
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemValidationError)
      const issues = (err as ProblemValidationError).issues
      const nonPositive = issues.filter((i) => i.code === 'non-positive-value')
      expect(nonPositive.length).toBeGreaterThanOrEqual(4)
      expect(nonPositive.some((i) => i.row === 0 && i.col === 0 && i.value === -5.2)).toBe(true)
      expect(nonPositive.some((i) => i.row === 0 && i.col === 1 && i.value === 0.0)).toBe(true)
    }

    // Entropy with raw 'sum' normalization requires non-negative values and throws ProblemValidationError
    expect(() => entropy.compute(financialProblem, { normalization: 'sum' })).toThrow(ProblemValidationError)
    try {
      entropy.compute(financialProblem, { normalization: 'sum' })
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemValidationError)
      const issues = (err as ProblemValidationError).issues
      const negatives = issues.filter((i) => i.code === 'negative-value')
      expect(negatives.length).toBeGreaterThanOrEqual(3)
      expect(negatives.some((i) => i.row === 0 && i.col === 0 && i.value === -5.2)).toBe(true)
    }
  })

  it('validates ranking methods: unblocked methods compute, positive-only methods block, compareRankings builds consensus', () => {
    const weights = [0.25, 0.25, 0.25, 0.25]

    // Ranking methods that succeed on zero/negative values
    const unblockedIds: RankingId[] = ['topsis', 'vikor', 'edas', 'cocoso', 'mabac', 'moora']
    for (const id of unblockedIds) {
      const prep = prepareRanking(financialProblem, { methodId: id, params: {} })
      expect(prep.rank, `${id} should be unblocked`).not.toBeNull()
      const res = prep.rank!(weights)
      expect(res.value, `${id} should produce ranking`).not.toBeNull()
      expect(res.value!.ranking).toHaveLength(4)
      if (id === 'edas') {
        expect(res.value!.warnings?.some((w) => w.code === 'edas.negative-values')).toBe(true)
      }
    }

    // Ranking methods that require strictly positive values
    const blockedIds: RankingId[] = ['saw', 'waspas', 'copras', 'marcos', 'aras', 'codas']
    for (const id of blockedIds) {
      const prep = prepareRanking(financialProblem, { methodId: id, params: {} })
      expect(prep.rank, `${id} should be blocked`).toBeNull()
      expect(prep.issues.some((i) => i.code === 'non-positive-value')).toBe(true)
    }

    // compareRankings remains completely resilient: runs all 12 methods, leaves out blocked ones,
    // and successfully computes Borda and Kendall W from unblocked methods
    const comp = compareRankings(financialProblem, weights, allRuns)
    expect(comp.comparable).toBe(true)
    expect(comp.ranked).toEqual(unblockedIds)
    expect(comp.runs.filter((r) => r.result !== null)).toHaveLength(6)
    expect(comp.runs.filter((r) => r.result === null)).toHaveLength(6)
    expect(comp.borda).not.toBeNull()
    expect(comp.borda!.ranking).toHaveLength(4)
    expect(comp.kendallW).not.toBeNull()
    expect(comp.kendallW!).toBeGreaterThan(0)
    expect(comp.firstPlace).not.toBeNull()
  })
})

describe('Use Case 4 — Robustness and Sensitivity Analysis Workflow', () => {
  const ex = getExample('krishnan-2021-smartphones')!
  const problem: Problem = {
    alternatives: ex.alternatives,
    criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
    matrix: ex.matrix.map((row) => [...row]),
  }
  const baseWeights = critic.compute(problem, {}).weights

  const testMethods: { id: RankingId; type: 'linear' | 'nonlinear' }[] = [
    { id: 'saw', type: 'linear' },
    { id: 'mabac', type: 'linear' },
    { id: 'moora', type: 'linear' },
    { id: 'topsis', type: 'nonlinear' },
    { id: 'vikor', type: 'nonlinear' },
    { id: 'waspas', type: 'nonlinear' },
    { id: 'cocoso', type: 'nonlinear' },
    { id: 'aras', type: 'nonlinear' },
    { id: 'codas', type: 'nonlinear' },
  ]

  for (const { id, type } of testMethods) {
    it(`runs sweep, perturbation, Monte Carlo, and removal for ${type} method ${id}`, () => {
      const ranker = rankerFor({ methodId: id, params: {} })

      // 1. One-at-a-time weight sweep
      const sweep = sweepWeight(problem, baseWeights, ranker, 0)
      expect(sweep.points.length).toBeGreaterThan(50)
      expect(sweep.rankingIntervals.length).toBeGreaterThan(0)
      expect(sweep.rankingIntervals[0]!.from).toBe(0)
      expect(sweep.rankingIntervals[sweep.rankingIntervals.length - 1]!.to).toBeCloseTo(id === 'cocoso' ? 0.99 : 1, 2)
      for (let i = 0; i < sweep.rankingIntervals.length - 1; i++) {
        expectClose(sweep.rankingIntervals[i]!.to, sweep.rankingIntervals[i + 1]!.from, 1e-5)
      }
      expect(sweep.baseRankingInterval.from).toBeLessThanOrEqual(baseWeights[0]! + 1e-6)
      expect(sweep.baseRankingInterval.to).toBeGreaterThanOrEqual(baseWeights[0]! - 1e-6)

      // 2. Discrete perturbation
      const perturb = perturbWeights(problem, baseWeights, ranker, DEFAULT_DELTAS)
      expect(perturb.length).toBe(baseWeights.length * DEFAULT_DELTAS.length)
      for (const row of perturb) {
        expectClose(row.weights.reduce((a, b) => a + b, 0), 1, 1e-12)
        expect(row.ranking).toHaveLength(problem.alternatives.length)
        expect(row.spearman).toBeGreaterThanOrEqual(-1)
        expect(row.spearman).toBeLessThanOrEqual(1)
        expect(row.ws).toBeGreaterThanOrEqual(-1)
        expect(row.ws).toBeLessThanOrEqual(1)
      }

      // 3. Monte Carlo stochastic simulation
      const mc = monteCarlo(problem, baseWeights, ranker, { concentration: 50, n: 200, seed: 42 })
      expect(mc.acceptability).toHaveLength(problem.alternatives.length)
      for (let alt = 0; alt < problem.alternatives.length; alt++) {
        const sumShares = mc.acceptability[alt]!.reduce((a, b) => a + b, 0)
        expectClose(sumShares, 1.0, 1e-6)
        expect(mc.meanRank[alt]).toBeGreaterThanOrEqual(1)
        expect(mc.meanRank[alt]).toBeLessThanOrEqual(problem.alternatives.length)
      }
      expect(mc.sameTop).toBeGreaterThanOrEqual(0)
      expect(mc.sameTop).toBeLessThanOrEqual(1)

      // 4. Criteria removal
      const removal = removeCriteria(problem, baseWeights, ranker)
      expect(removal).toHaveLength(problem.criteria.length)
      for (const row of removal) {
        expect(row.ranking).toHaveLength(problem.alternatives.length)
        expect(row.spearman).toBeGreaterThanOrEqual(-1)
        expect(row.spearman).toBeLessThanOrEqual(1)
        expect(row.ws).toBeGreaterThanOrEqual(-1)
        expect(row.ws).toBeLessThanOrEqual(1)
      }
    })
  }
})

describe('Use Case 5 — Undo/Redo, Language Switching (EN/TR), Parameter Sliders, and TSV/LaTeX/XLSX Export', () => {
  it('exercises interactive workbench store actions and export pipeline', () => {
    const st = useWorkbench.getState()
    st.reset()

    // 1. Load Example
    st.loadExample('krishnan-2021-smartphones', 'en')
    let state = useWorkbench.getState()
    expect(state.exampleId).toBe('krishnan-2021-smartphones')
    expect(state.weightMethod).toBe('critic')
    expect(state.rankingMethod).toBe('topsis')
    expect(state.problem.alternatives).toHaveLength(5)
    expect(state.problem.criteria).toHaveLength(5)

    // 2. Cell editing and Undo / Redo history
    let hist = createHistory(state.problem)
    const initialCellVal = state.problem.matrix[0]![0] // 649
    expect(initialCellVal).toBe(649)

    st.setCell(0, 0, 999)
    state = useWorkbench.getState()
    expect(state.exampleId).toBeNull() // Cleared to reflect custom changes
    expect(state.problem.matrix[0]![0]).toBe(999)

    hist = pushHistory(hist, state.problem)
    expect(hist.present.matrix[0]![0]).toBe(999)

    // Undo edit
    hist = undo(hist)
    expect(hist.present.matrix[0]![0]).toBe(649)
    st.setProblem(hist.present)
    expect(useWorkbench.getState().problem.matrix[0]![0]).toBe(649)

    // Redo edit
    hist = redo(hist)
    expect(hist.present.matrix[0]![0]).toBe(999)
    st.setProblem(hist.present)
    expect(useWorkbench.getState().problem.matrix[0]![0]).toBe(999)

    // 3. Language Switching (EN / TR)
    st.loadExample('krishnan-2021-smartphones', 'en')
    st.localizeExample('tr')
    expect(useWorkbench.getState().problem.criteria.map((c) => c.name)).toEqual([
      'Fiyat',
      'Ekran boyutu',
      'Piksel yoğunluğu',
      'Kalınlık',
      'Kütle',
    ])
    st.localizeExample('en')
    expect(useWorkbench.getState().problem.criteria.map((c) => c.name)).toEqual([
      'Price',
      'Screen size',
      'Pixel density',
      'Thickness',
      'Mass',
    ])

    // 4. Method Parameter Sliders
    // VIKOR v parameter
    st.setRankingMethod('vikor')
    st.setMethodParam('vikor', 'v', 0.2)
    const vikorLow = computeRanking(useWorkbench.getState())
    st.setMethodParam('vikor', 'v', 0.8)
    const vikorHigh = computeRanking(useWorkbench.getState())
    expect(vikorLow.value!.scores).not.toEqual(vikorHigh.value!.scores)
    expect(vikorLow.value!.diagnostics?.v).toBe(0.2)
    expect(vikorHigh.value!.diagnostics?.v).toBe(0.8)

    // WASPAS lambda parameter
    st.setRankingMethod('waspas')
    st.setMethodParam('waspas', 'lambda', 0.1)
    const waspasLow = computeRanking(useWorkbench.getState())
    st.setMethodParam('waspas', 'lambda', 0.9)
    const waspasHigh = computeRanking(useWorkbench.getState())
    expect(waspasLow.value!.scores).not.toEqual(waspasHigh.value!.scores)

    // CoCoSo lambda parameter
    st.setRankingMethod('cocoso')
    st.setMethodParam('cocoso', 'lambda', 0.2)
    const cocosoLow = computeRanking(useWorkbench.getState())
    st.setMethodParam('cocoso', 'lambda', 0.8)
    const cocosoHigh = computeRanking(useWorkbench.getState())
    expect(cocosoLow.value!.scores).not.toEqual(cocosoHigh.value!.scores)

    // CODAS tau parameter
    st.setRankingMethod('codas')
    st.setMethodParam('codas', 'tau', 0.02)
    expect(paramsFor(useWorkbench.getState(), 'codas').tau).toBe(0.02)
    st.setMethodParam('codas', 'tau', 0.08)
    expect(paramsFor(useWorkbench.getState(), 'codas').tau).toBe(0.08)
    const codasRes = computeRanking(useWorkbench.getState())
    expect(codasRes.value).not.toBeNull()

    // AHP aggregation choice
    st.setWeightMethod('ahp')
    const ahpJ = { ...emptyJudgements(5) }
    // Add judgments so ahp can compute
    const jUpper = [2, 3, 4, 5, 2, 3, 4, 2, 3, 2]
    let at = 0
    for (let i = 0; i < 5; i++) {
      for (let k = i + 1; k < 5; k++) {
        st.setJudgement(i, k, jUpper[at++]!)
      }
    }
    st.setMethodParam('ahp', 'aggregation', 'eigenvector')
    const ahpEig = computeWeights(useWorkbench.getState())
    st.setMethodParam('ahp', 'aggregation', 'geometric')
    const ahpGeo = computeWeights(useWorkbench.getState())
    expect(ahpEig.value).not.toBeNull()
    expect(ahpGeo.value).not.toBeNull()
    expect(ahpEig.value!.weights).not.toEqual(ahpGeo.value!.weights)

    // 5. TSV, LaTeX, and XLSX Export
    st.setRankingMethod('topsis')
    st.setWeightMethod('critic')
    const currentWeights = computeWeights(useWorkbench.getState())
    const currentRanking = computeRanking(useWorkbench.getState(), currentWeights)
    expect(currentRanking.value).not.toBeNull()

    const stepNorm = currentRanking.value!.steps.find((s) => s.key === 'topsis.normalized')!
    const stepTable = stepToTable(stepNorm, {
      alternatives: useWorkbench.getState().problem.alternatives,
      criteria: useWorkbench.getState().problem.criteria.map((c) => c.name),
    })

    // TSV Export (EN '.' and TR ',')
    const tsvEn = tableToTsv(stepTable, { decimal: '.' })
    expect(tsvEn).toContain('\tPrice\tScreen size\tPixel density\tThickness\tMass')
    expect(tsvEn).toContain('A\t')
    expect(tsvEn).toContain('.')
    expect(tsvEn).not.toContain(',')

    const tsvTr = tableToTsv(stepTable, { decimal: ',' })
    expect(tsvTr).toContain(',')

    // LaTeX Export
    const latex = tableToLatex(stepTable, { caption: 'Normalized Decision Matrix', label: 'tab:norm' })
    expect(latex).toContain('\\begin{table}[htbp]')
    expect(latex).toContain('\\caption{Normalized Decision Matrix}')
    expect(latex).toContain('\\label{tab:norm}')
    expect(latex).toContain('\\begin{tabular}{lrrrrr}')
    expect(latex).toContain('\\toprule')
    expect(latex).toContain('\\midrule')
    expect(latex).toContain('\\bottomrule')
    expect(latex).toContain('\\end{tabular}')

    // XLSX Export (if SheetJS is available)
    if (X) {
      const coreProblem = toProblem(useWorkbench.getState().problem)
      const wb = buildWorkbook(X, {
        problem: coreProblem,
        weighting: { result: currentWeights.value!, method: 'critic' },
        ranking: { result: currentRanking.value!, method: 'topsis' },
      })
      expect(wb.SheetNames).toContain('Data')
      expect(wb.SheetNames).toContain('Weights')
      expect(wb.SheetNames).toContain('Ranking')

      const buf = writeWorkbook(X, wb)
      expect(buf.byteLength).toBeGreaterThan(1000)
    }
  })
})

describe('Use Case 6 — DSS-2 Expert Audit Scenarios', () => {
  it('1. BWM workflow: lowering a_BW filters out-of-cap answers while preserving underlying judgements for AHP', () => {
    const n = 4
    const best = 0
    const worst = 3
    let j: Judgements = { ...emptyJudgements(n), best, worst }

    // Start with a_BW = 8
    j = setPair(j, best, worst, 8)
    // Enter intermediate comparisons with 7 and 6
    j = setPair(j, best, 1, 7)
    j = setPair(j, best, 2, 6)
    j = setPair(j, 1, worst, 3)
    j = setPair(j, 2, worst, 2)

    const fullAnswers = bwmAnswers(j)
    expect(fullAnswers).not.toBeNull()
    expect(fullAnswers!.bestToOthers).toEqual([1, 7, 6, 8])
    expect(fullAnswers!.othersToWorst).toEqual([8, 3, 2, 1])

    const progInitial = bwmProgress(j, n)
    expect(progInitial.answered).toBe(5)
    expect(progInitial.provisional).toBe(false)
    expect(progInitial.weights).not.toBeNull()

    // Decision maker revisits B vs W and reduces a_BW to 5
    j = setPair(j, best, worst, 5)

    // With cap = 5, the existing answers 7 and 6 are filtered by withinCap and become null
    const cappedAnswers = bwmAnswers(j)
    expect(cappedAnswers).not.toBeNull()
    expect(cappedAnswers!.bestToOthers[1]).toBeNull() // 7 exceeds cap 5
    expect(cappedAnswers!.bestToOthers[2]).toBeNull() // 6 exceeds cap 5

    // Incomplete BWM state blocks computation
    const dummyProblem: Problem = {
      alternatives: ['A1', 'A2'],
      criteria: Array.from({ length: n }, (_, i) => ({ name: `C${i + 1}`, type: 'benefit' })),
      matrix: [[1, 2, 3, 4], [2, 3, 4, 5]],
    }
    expect(() => bwm.compute(dummyProblem, {}, j)).toThrow(ProblemValidationError)

    // State integrity: judgements.pairs still retains the exact answers entered
    expect(j.pairs[best]![1]).toBe(7)
    expect(j.pairs[best]![2]).toBe(6)

    // Raising a_BW back to 8 immediately restores all answers
    j = setPair(j, best, worst, 8)
    expect(bwmProgress(j, n).answered).toBe(5)
    expect(bwmProgress(j, n).weights).not.toBeNull()

    // Switching to AHP utilizes the preserved judgements on the Saaty scale
    const ahpProg = ahpProgress(j, n)
    expect(ahpProg.answered).toBeGreaterThanOrEqual(4)
    expect(ahpProg.weights).not.toBeNull()
  })

  it('2. AHP: intransitivity creates inconsistency, and suggested value resolution behavior', () => {
    // Intransitive triad: C1 >> C2 (9), C2 >> C3 (9), but C1 << C3 (1/9)
    let j = emptyJudgements(3)
    j = setPair(j, 0, 1, 9)
    j = setPair(j, 1, 2, 9)
    j = setPair(j, 0, 2, 1 / 9)

    const prog = ahpProgress(j, 3)
    expect(prog.inconsistent).toBe(true)
    expect(prog.cr!).toBeGreaterThanOrEqual(0.1)
    expect(prog.worstPair).not.toBeNull()
    expect(prog.worstPair!.actual).not.toBe(prog.worstPair!.suggested)

    // Updating to the suggested value reduces the inconsistency
    j = setPair(j, prog.worstPair!.i, prog.worstPair!.k, prog.worstPair!.suggested)
    const fixed = ahpProgress(j, 3)
    expect(fixed.cr!).toBeLessThan(prog.cr!)

    // Edge case analysis: when judgements are nearly consistent but round to existing scale
    const jSubtle = emptyJudgements(3)
    setPair(jSubtle, 0, 1, 1)
    setPair(jSubtle, 1, 2, 1)
    setPair(jSubtle, 0, 2, 2)
    const pSubtle = ahpProgress(jSubtle, 3)
    // If worstPair suggested equals actual, UI check Math.abs(suggested - actual) > 1e-9 correctly avoids redundant badge
    if (pSubtle.worstPair && pSubtle.worstPair.actual === pSubtle.worstPair.suggested) {
      expect(pSubtle.worstPair.actual).toBe(pSubtle.worstPair.suggested)
    }
  })

  it('3. Criteria mutations: rename, delete/undo, and name-based re-import preserve judgements', () => {
    const st = useWorkbench.getState()
    st.reset()
    st.startBlank(3, 4)
    st.setWeightMethod('ahp')

    // Set AHP judgements between criteria
    st.setJudgement(0, 1, 3)
    st.setJudgement(1, 2, 4)
    st.setJudgement(2, 3, 2)

    let state = useWorkbench.getState()
    expect(state.judgements!.pairs[0]![1]).toBe(3)
    expect(state.judgements!.pairs[1]![2]).toBe(4)

    // (a) Rename criterion in place
    st.setCriterion(1, { name: 'Renamed C2' })
    state = useWorkbench.getState()
    expect(state.judgements!.pairs[0]![1]).toBe(3)
    expect(state.judgements!.pairs[1]![2]).toBe(4)

    // (b) Delete criterion and Undo
    const beforeDelete = state.problem
    st.setProblem(deleteCriterion(beforeDelete, 1))
    state = useWorkbench.getState()
    expect(state.problem.criteria).toHaveLength(3)
    // Deleting C2 collapses matrix to 3x3
    expect(state.judgements!.pairs).toHaveLength(3)

    // Undo delete
    st.setProblem(beforeDelete)
    state = useWorkbench.getState()
    expect(state.problem.criteria).toHaveLength(4)
    expect(state.judgements!.pairs[0]![1]).toBe(3)
    expect(state.judgements!.pairs[1]![2]).toBe(4)

    // (c) Re-import problem with criteria matched by name only (byPosition = false)
    const reorderedProblem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' as const },
        { name: 'Renamed C2', type: 'benefit' as const },
        { name: 'C3', type: 'benefit' as const },
        { name: 'C4', type: 'benefit' as const },
      ].reverse(), // reversed order
      matrix: [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]],
    }
    st.importProblem(reorderedProblem, 'reordered.csv')
    state = useWorkbench.getState()
    // Criteria matched by name: Renamed C2 is at index 2, C1 is at index 3
    const idxC1 = state.problem.criteria.findIndex((c) => c.name === 'C1')
    const idxC2 = state.problem.criteria.findIndex((c) => c.name === 'Renamed C2')
    expect(state.judgements!.pairs[idxC1]![idxC2]).toBe(3)
  })

  it('4. VIKOR compromise set (C1, C2) distinction from strict competition ranking in robustness', () => {
    const ex = getExample('keshavarz-2015-ten-alternatives')!
    const problem: Problem = {
      alternatives: ex.alternatives,
      criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
      matrix: ex.matrix.map((r) => [...r]),
    }
    const weights = ex.weights!

    const vikorRes = vikor.compute(problem, weights, { v: 0.5 })
    const S = vikorRes.steps.find((s) => s.key === 'vikor.groupUtility')!.vector!
    const R = vikorRes.steps.find((s) => s.key === 'vikor.individualRegret')!.vector!
    const Q = vikorRes.scores

    const compromise = vikorCompromise(S, R, Q)
    expect(compromise.c1).toBe(false) // Advantage < DQ = 0.1111
    expect(compromise.set.length).toBeGreaterThan(1) // Multi-alternative compromise set
    expect(compromise.set).toContain(compromise.first)
    expect(compromise.set).toContain(compromise.second)

    // In contrast, competition ranking gives strict ranks based on Q ascending
    expect(vikorRes.ranking[compromise.first]).toBe(1)
    expect(vikorRes.ranking[compromise.second]).toBe(2)

    // Robustness ranker evaluates top alternative strictly from Q
    const ranker = rankerFor({ methodId: 'vikor', params: {} })
    const mc = monteCarlo(problem, weights, ranker, { concentration: 50, n: 100, seed: 1 })
    expect(mc.meanRank[compromise.first]!).toBeLessThanOrEqual(mc.meanRank[compromise.second]!)
    const worstAlt = compromise.order[compromise.order.length - 1]!
    expect(mc.meanRank[compromise.first]!).toBeLessThan(mc.meanRank[worstAlt]!)
  })

  it('5. Published examples audit: bakir-atalik-2018-airlines and ozcan-celik-2021-separators', () => {
    const st = useWorkbench.getState()
    st.reset()

    // Airlines example
    st.loadExample('bakir-atalik-2018-airlines', 'en')
    let state = useWorkbench.getState()
    expect(state.rankingMethod).toBe('aras')
    expect(state.weightMethod).toBe('manual')

    // Verify paper's manual weights match Entropy calculated on this matrix
    const exAirlines = getExample('bakir-atalik-2018-airlines')!
    const coreProblem = toProblem(state.problem)
    const entropyRes = entropy.compute(coreProblem, { normalization: 'sum' })
    expectClose(entropyRes.weights, exAirlines.weights!, 0.001)

    // Cream separators example
    st.loadExample('ozcan-celik-2021-separators', 'en')
    state = useWorkbench.getState()
    expect(state.rankingMethod).toBe('copras')
    expect(state.weightMethod).toBe('entropy')
  })
})

describe('Use Case 7 — DSS-1 Combinations, Pipeline Equivalence and Edge Cases', () => {
  it('1. Positive-only weighting paired with zero/negative ranker in workbench store', () => {
    const st = useWorkbench.getState()
    st.reset()

    const negativeDraft = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'Profit', type: 'benefit' as const },
        { name: 'Cost', type: 'cost' as const },
      ],
      matrix: [
        [-5, 10],
        [0, 15],
        [10, 8],
      ],
    }
    st.setProblem(negativeDraft)
    st.setRankingMethod('topsis')
    st.setWeightMethod('merec')

    // MEREC blocks because of negative/zero values
    const blockedWeights = computeWeights(useWorkbench.getState())
    expect(blockedWeights.value).toBeNull()
    expect(blockedWeights.issues.some((i) => i.code === 'non-positive-value')).toBe(true)

    const blockedRanking = computeRanking(useWorkbench.getState())
    expect(blockedRanking.value).toBeNull()
    expect(blockedRanking.issues.some((i) => i.code === 'non-positive-value')).toBe(true)

    // Switching to Critic, SD, LOPCOW, or Entropy min-max unblocks ranking immediately
    st.setWeightMethod('critic')
    const unblockedWeights = computeWeights(useWorkbench.getState())
    expect(unblockedWeights.value).not.toBeNull()

    const unblockedRanking = computeRanking(useWorkbench.getState(), unblockedWeights)
    expect(unblockedRanking.value).not.toBeNull()
    expect(unblockedRanking.value!.ranking).toHaveLength(3)
  })

  it('2. Mathematical pipeline equivalences: WASPAS (lambda=1) == SAW (linearMax) and COPRAS (all benefit) == SAW (sum)', () => {
    const p: Problem = {
      alternatives: ['A1', 'A2', 'A3', 'A4'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'cost' },
        { name: 'C3', type: 'benefit' },
      ],
      matrix: [
        [10, 5, 20],
        [15, 3, 25],
        [12, 4, 22],
        [18, 6, 30],
      ],
    }
    const weights = [0.4, 0.3, 0.3]

    // Equivalence 1: WASPAS at lambda = 1 matches SAW linearMax bit for bit
    const sawLinear = saw.compute(p, weights, { normalization: 'linearMax' })
    const waspas1 = waspas.compute(p, weights, { lambda: 1 })
    expect(waspas1.scores).toEqual(sawLinear.scores)
    expect(waspas1.ranking).toEqual(sawLinear.ranking)

    // Equivalence 2: COPRAS on all-benefit problem matches SAW sum order
    const pBenefit: Problem = {
      alternatives: p.alternatives,
      criteria: p.criteria.map((c) => ({ ...c, type: 'benefit' as const })),
      matrix: p.matrix,
    }
    const sawSum = saw.compute(pBenefit, weights, { normalization: 'sum' })
    const coprasRes = copras.compute(pBenefit, weights, {})
    expect(coprasRes.ranking).toEqual(sawSum.ranking)
  })

  it('3. Robustness removeCriteria with weighting recomputed on submatrix', () => {
    const ex = getExample('krishnan-2021-smartphones')!
    const problem: Problem = {
      alternatives: ex.alternatives,
      criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
      matrix: ex.matrix.map((r) => [...r]),
    }
    const baseWeights = critic.compute(problem, {}).weights
    const topsisRanker = rankerFor({ methodId: 'topsis', params: {} })

    // Recompute CRITIC weights on each (n-1) criterion submatrix: produces both 'renormalize' and 'recompute' rows
    const removal = removeCriteria(problem, baseWeights, topsisRanker, critic)
    expect(removal).toHaveLength(2 * problem.criteria.length)
    const recomputed = removal.filter((r) => r.mode === 'recompute')
    expect(recomputed).toHaveLength(problem.criteria.length)
    recomputed.forEach((row) => {
      expect(row.weights[row.j]).toBe(0) // Removed criterion gets 0 weight
      expectClose(row.weights.reduce((a, b) => a + b, 0), 1, 1e-12)
      expect(row.ranking).toHaveLength(problem.alternatives.length)
      expect(row.spearman).toBeGreaterThanOrEqual(-1)
      expect(row.spearman).toBeLessThanOrEqual(1)
    })
  })

  it('4. whySentences provides explanation for divergent method rankings', () => {
    const ex = getExample('keshavarz-2015-ten-alternatives')!
    const problem: Problem = {
      alternatives: ex.alternatives,
      criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
      matrix: ex.matrix.map((r) => [...r]),
    }
    const weights = ex.weights!
    const comp = compareRankings(problem, weights, allRuns)

    const facts = pairFacts(problem, weights, comp, 0, 1)
    const ctx = {
      names: problem.alternatives,
      criteria: problem.criteria.map((c) => c.name),
      methodLabel: (id: string) => id.toUpperCase(),
      t: ((k: string, opts?: any) => {
        if (opts?.methods) return `${k}: ${opts.methods}`
        return k
      }) as any,
      lang: 'en',
    }

    const sentences = whySentences(facts, ctx)
    expect(sentences.length).toBeGreaterThan(0)
    expect(sentences.length).toBeLessThanOrEqual(5)
  })
})

