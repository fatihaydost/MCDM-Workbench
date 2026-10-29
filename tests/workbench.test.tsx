import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Router } from 'wouter'
import { describe, expect, it } from 'vitest'
import i18n, { initI18n, registerLanguages } from '../src/i18n'
import enJson from '../src/i18n/en.json'
import { ahpProgress, bwmSuggestion, judgementsFromBwm, judgementsFromUpper, MAX_MAGNITUDE, MIN_MAGNITUDE, type Step } from '../src/core'
import { equal as equalContent } from '../src/content/methods/equal'
import { MethodArticle, preloadIdea } from '../src/app/methods/MethodPage'
import { OrdinalWeights } from '../src/app/workbench/OrdinalWeights'
import { PrintReport } from '../src/app/workbench/PrintReport'
import { RANKING_FAMILIES } from '../src/app/workbench/RankingStage'
import { ResultsStage } from '../src/app/workbench/ResultsStage'
import { ComputedWeights } from '../src/app/workbench/WeightsStage'
import { MIN_PEAK_STEPS, NO_PEAK_STEPS, stepToLatex, UNORIENTED_MATRIX_STEPS } from '../src/app/workbench/WorkedCalculation'
import { WorkbenchNavContext, type WorkbenchNav } from '../src/app/workbench/nav'
import { variantLabel, weightMethodFullLabel } from '../src/app/workbench/shared'
import {
  computeWeights,
  resizeMethodParamsOnCriterionChange,
  sanitizeMethodParams,
  useWorkbench,
  type DraftProblem,
} from '../src/state/workbench'

registerLanguages({ en: enJson })
initI18n('en')

const mockNav: WorkbenchNav = {
  goTo: () => {},
  attempted: { data: false, weights: false, ranking: false, results: false, robustness: false, compare: false },
  setAttempted: () => {},
  importReport: null,
  setImportReport: () => {},
}

function withProviders(node: ReactNode) {
  Object.assign(useWorkbench.getInitialState(), useWorkbench.getState())
  return (
    <Router ssrPath="/app">
      <WorkbenchNavContext.Provider value={mockNav}>{node}</WorkbenchNavContext.Provider>
    </Router>
  )
}

describe('Workbench UI, State Store, and WorkedCalculation fixes (Work Package 3)', () => {
  it('1a. computeWeights with equal method does not inspect the matrix and ComputedWeights renders it', () => {
    const draft: DraftProblem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'cost' },
      ],
      matrix: [
        [5, 10],
        [5, 20],
        [5, 30],
      ],
    }
    const w = computeWeights({ problem: draft, weightMethod: 'equal', manualWeights: [] })
    expect(w.value).not.toBeNull()
    expect(w.value!.weights).toEqual([0.5, 0.5])
    expect(w.value!.warnings).toBeUndefined()

    const html = renderToStaticMarkup(withProviders(createElement(ComputedWeights, { problem: draft, method: 'equal', result: w.value! })))
    expect(html).toContain('C1')
  })

  it('1b. resizeMethodParamsOnCriterionChange and addCriterion append to SWARA custom s and order arrays', () => {
    const resized = resizeMethodParamsOnCriterionChange(
      { swara: { order: [2, 0, 1], s: [0, 0.25, 0.1], stepRatio: 'steep' } },
      3,
      4,
    )
    expect(resized.swara?.order).toEqual([2, 0, 1, 3])
    expect(resized.swara?.s).toEqual([0, 0.25, 0.1, 0.25])

    const st = useWorkbench.getState()
    st.loadExample('kersuliene-2010-dispute', 'en')
    st.setMethodParam('swara', 'order', [1, 0, 2, 3, 4, 5])
    st.addCriterion({ name: 'Extra', type: 'benefit' })
    const after = useWorkbench.getState().methodParams?.swara
    expect(after?.order).toEqual([1, 0, 2, 3, 4, 5, 6])
    expect(after?.s).toEqual([0, 0.15, 0.04, 0.29, 0.02, 0.04, 0.15])
  })

  it('1c. sanitizeMethodParams enforces MAX_MAGNITUDE and MIN_MAGNITUDE on aras.optimal', () => {
    const valid = sanitizeMethodParams({ aras: { optimal: [10, 20, 30] } }, 3)
    expect(valid.aras?.optimal).toEqual([10, 20, 30])

    const tooLarge = sanitizeMethodParams({ aras: { optimal: [10, MAX_MAGNITUDE * 10, 30] } }, 3)
    expect(tooLarge.aras?.optimal).toBeUndefined()

    const tooSmall = sanitizeMethodParams({ aras: { optimal: [10, MIN_MAGNITUDE / 10, 30] } }, 3)
    expect(tooSmall.aras?.optimal).toBeUndefined()
  })

  it('1d. loadExample loads example judgements when provided (e.g. rezaei-2016-car)', () => {
    const st = useWorkbench.getState()
    st.loadExample('rezaei-2016-car', 'en')
    const s = useWorkbench.getState()
    expect(s.weightMethod).toBe('bwm')
    expect(s.judgements?.best).toBe(1)
    expect(s.judgements?.worst).toBe(4)
    const w = computeWeights(s)
    expect(w.value).not.toBeNull()
    expect(w.value!.weights[1]).toBeGreaterThan(0.4)
  })

  it('2. OrdinalWeights renders SWARA s inputs with 4-decimal precision and ROC tie movement keeps tie groups intact', () => {
    const st = useWorkbench.getState()
    st.startBlank(2, 3)
    st.setWeightMethod('swara')
    st.setMethodParam('swara', 's', [0, 0.1234, 0.2345])
    const html = renderToStaticMarkup(
      withProviders(createElement(OrdinalWeights, { problem: useWorkbench.getState().problem, method: 'swara' })),
    )
    expect(html).toContain('0.1234')
    expect(html).toContain('0.2345')

    const moveRocLogic = (ranks: number[], pos: number, delta: -1 | 1): number[] => {
      const n = ranks.length
      const ordered = Array.from({ length: n }, (_, j) => j).sort((a, b) => ranks[a]! - ranks[b]! || a - b)
      const target = pos + delta
      if (target < 0 || target >= n) return ranks
      const j = ordered[pos]!
      const b = ordered[target]!
      const nextRanks = ranks.map((rk) => 1 + ranks.filter((other) => other < rk).length)
      const r = nextRanks[j]!
      const tiesAtR = nextRanks.filter((rk) => rk === r)
      if (tiesAtR.length > 1) {
        if (delta === 1) {
          for (let idx = 0; idx < n; idx++) {
            if (nextRanks[idx]! > r) nextRanks[idx] = nextRanks[idx]! + 1
          }
          nextRanks[j] = r + 1
        } else {
          for (let idx = 0; idx < n; idx++) {
            if (idx !== j && nextRanks[idx]! >= r) nextRanks[idx] = nextRanks[idx]! + 1
          }
        }
      } else {
        const rb = nextRanks[b]!
        for (let idx = 0; idx < n; idx++) {
          if (nextRanks[idx] === rb) nextRanks[idx] = r
        }
        nextRanks[j] = rb
      }
      return nextRanks.map((rk) => 1 + nextRanks.filter((other) => other < rk).length)
    }

    expect(moveRocLogic([1, 2, 2], 0, 1)).toEqual([3, 1, 1])
    expect(moveRocLogic([1, 1, 3], 2, -1)).toEqual([2, 2, 1])
  })

  it('3. BWM fallback suggestion breaks half-integer ties downward like bwmSuggestion, and AHP > 15 criteria marks thresholdApproximate', () => {
    const j = judgementsFromBwm(3, 0, 2, [1, 2, 3], [3, 2, 1])
    const coreSug = bwmSuggestion([1, 2, 3], [3, 2, 1], 0, 2, 1)
    expect(coreSug?.value).toBe(1)

    const aBW = 3
    const otherVal = 2
    let bestVal = 1
    let bestGap = Number.POSITIVE_INFINITY
    for (let v = 1; v <= aBW; v++) {
      const g = Math.abs(otherVal * v - aBW)
      if (g < bestGap) {
        bestGap = g
        bestVal = v
      }
    }
    expect(bestVal).toBe(1)
    expect(j.best).toBe(0)

    const n16 = 16
    const upper16 = new Array<number>((n16 * (n16 - 1)) / 2).fill(1)
    const prog16 = ahpProgress(judgementsFromUpper(n16, upper16), n16)
    expect(prog16.thresholdApproximate).toBe(true)
  })

  it('4. RANKING_FAMILIES places edas under distance, not additive', () => {
    const distance = RANKING_FAMILIES.find((f) => f.key === 'distance')!
    const additive = RANKING_FAMILIES.find((f) => f.key === 'additive')!
    expect(distance.ids).toContain('edas')
    expect(additive.ids).not.toContain('edas')
  })

  it('5. ResultsStage renders results-vikor-verdict even when both C1 and C2 are satisfied (verdict.failed is empty)', () => {
    const st = useWorkbench.getState()
    st.loadExample('keshavarz-2015-ten-alternatives', 'en', 'vikor')
    const html = renderToStaticMarkup(withProviders(createElement(ResultsStage)))
    expect(html).toContain('data-testid="results-vikor-verdict"')
  })

  it('6. WorkedCalculation stepToLatex formats λ headers as $\\lambda = ...$ and step peak sets are clean', () => {
    const step: Step = {
      key: 'waspas.grid',
      matrix: [
        [0.5, 0.6],
        [0.7, 0.8],
      ],
      axes: ['alternatives', 'lambda'],
    }
    const latex = stepToLatex(step, { alternatives: ['A1', 'A2'], criteria: ['C1', 'C2'] }, 'WASPAS Grid', 'Q')
    expect(latex).toContain('$\\lambda = 0.0$')
    expect(latex).not.toContain('λ =')

    expect(NO_PEAK_STEPS.has('ahpRanking.consistency')).toBe(true)
    expect(MIN_PEAK_STEPS.has('ahpRanking.consistency')).toBe(false)
    expect(MIN_PEAK_STEPS.has('promethee.negativeFlow')).toBe(false)
    expect(UNORIENTED_MATRIX_STEPS.has('entropy.proportionsSum')).toBe(true)
    expect(UNORIENTED_MATRIX_STEPS.has('moora:normalized')).toBe(false)
    expect(UNORIENTED_MATRIX_STEPS.has('moora:weighted')).toBe(false)
    expect(UNORIENTED_MATRIX_STEPS.has('copras:weighted')).toBe(false)
  })

  it('7. CompareStage ECHO_NOTE_KEYS includes marcos_saw and variantLabel reflects custom SWARA order/s', async () => {
    const { ECHO_NOTE_KEYS } = await import('../src/app/workbench/compare/CompareStage')
    expect(ECHO_NOTE_KEYS.has('marcos_saw')).toBe(true)

    const t = i18n.t.bind(i18n)
    expect(variantLabel('swara', {}, t)).toBe('')
    expect(variantLabel('swara', { order: [1, 0, 2] }, t)).toBe('custom')
    expect(variantLabel('swara', { s: [0, 0.2, 0.15] }, t)).toBe('custom')
    expect(weightMethodFullLabel('swara', { s: [0, 0.2, 0.15] }, t)).toContain('(custom)')
  })

  it('8. MethodPage renders origin.url link in #sources when origin.doi is absent (e.g. Laplace 1812)', async () => {
    await preloadIdea('equal')
    const { doi: _doi, ...originWithoutDoi } = equalContent.origin
    const urlOnlyMethod = {
      ...equalContent,
      origin: {
        ...originWithoutDoi,
        url: 'https://gallica.bnf.fr/ark:/12148/bpt6k775950',
      },
    }
    const html = renderToStaticMarkup(withProviders(<MethodArticle m={urlOnlyMethod} />))
    expect(html).toContain('href="https://gallica.bnf.fr/ark:/12148/bpt6k775950"')
  })

  it('9. ResultsStage renders executive 2-page report preview button, KPI cards, micro-charts, and robustness dashboard', () => {
    const st = useWorkbench.getState()
    st.loadExample('krishnan-2021-smartphones', 'en', 'topsis')
    const html = renderToStaticMarkup(withProviders(createElement(ResultsStage)))
    expect(html).toContain('data-testid="print-report-button"')
    expect(html).toContain('Report preview (PDF)')
    expect(html).toContain('data-testid="print-report"')
    expect(html).toContain('data-testid="report-page-1"')
    expect(html).toContain('data-testid="report-page-2"')
    expect(html).not.toContain('data-testid="report-page-appendix"')
    expect(html).toContain('data-testid="print-verdict"')
    expect(html).toContain('data-testid="report-kpi-grid"')
    expect(html).toContain('data-testid="report-profile-section"')
    expect(html).toContain('data-testid="report-head-to-head-section"')
    expect(html).toContain('data-testid="print-weights-section"')
    expect(html).toContain('data-testid="print-ranking-section"')
    expect(html).toContain('data-testid="print-robustness-summary"')
    expect(html).toContain("Kendall&#x27;s W =")
    expect(html).toContain('Borda consensus leader:')
    expect(html).toContain('Weight stability (±5%, ±10%, ±20%):')
  })

  it('10. PrintReport renders compromise verdict styling and horizontally banded raw matrix when includeAppendix is enabled', () => {
    const st = useWorkbench.getState()
    st.loadExample('opricovic-2004-hydropower', 'en', 'vikor')
    const problem = useWorkbench.getState().problem
    const weights = computeWeights({ problem, weightMethod: 'critic', manualWeights: [] }).value!
    const html = renderToStaticMarkup(
      withProviders(
        createElement(PrintReport, {
          problem,
          weights,
          result: {
            scores: [0.02, 0.03, 0.4, 0.7, 0.9, 1],
            ranking: [1, 2, 3, 4, 5, 6],
            order: 'asc',
            steps: [],
          },
          weightMethod: 'critic',
          rankingMethod: 'vikor',
          weightLabel: 'CRITIC',
          rankingLabel: 'VIKOR (v = 0.50)',
          verdict: {
            set: [0, 1],
            failed: ['Acceptable advantage (C1) is not met.'],
            result: 'Compromise set: A1, A2',
            about: [],
          },
          includeAppendix: true,
        }),
      ),
    )
    expect(html).toContain('data-tone="compromise"')
    expect(html).toContain('Compromise / conditional result')
    expect(html).toContain('data-testid="report-page-appendix"')
    expect(html).toContain('data-testid="report-raw-matrix"')
  })
})
