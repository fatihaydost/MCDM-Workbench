import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { lazy, Suspense, use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getExample } from '../../data/examples'
import { useLang } from '../../i18n'
import { compareRankings, getRankingMethod, rankingMethods } from '../../core'
import { isEmptyProblem, paramsFor, STAGES, toProblem, useMethodParams, useRanking, useValidation, useWeights, useWorkbench, type Stage } from '../../state/workbench'
import { Skeleton } from '../../ui'
import { usePageMeta } from '../landing/usePageMeta'
import { methodViews, preloadStagePictures } from '../methods/views'
import { WorkbenchLayout } from '../shell/WorkbenchLayout'
import { DataStage } from './DataStage'
import { ExplanationPanel, preloadPanelCards } from './ExplanationPanel'
import { WorkbenchNavContext, type ImportReport, type WorkbenchNav } from './nav'
import { bestIndex, RankingStage } from './RankingStage'
import { ResultsStage } from './ResultsStage'
import { useRobustnessSummary } from './robustnessSummary'
import { alternativeName, rankingMethodFullLabel, weightMethodFullLabel } from './shared'
import { WeightsStage } from './WeightsStage'

// The panel's method cards load alongside this chunk, not after the first render.
preloadPanelCards()
// The stages' pictures (chunks of their own) load alongside too, and the page waits for them (`use` below, under the
// route's skeleton): a deep link to Weights or Ranking renders its picture in the first frame, so the table never shifts.
const stagePictures = preloadStagePictures()

// Robustness (its charts, texts and the Monte Carlo worker) is a chunk of its own: /app does not load it up front.
// Once loaded it renders directly, not through lazy(): a lazy component suspends again on every mount, and React holds
// a Suspense reveal back for a moment, so the stage would open empty and the focus moved into it would find nothing.
type StageComponent = (typeof import('./robustness/RobustnessStage'))['default']
let LoadedRobustness: StageComponent | null = null
const loadRobustness = () =>
  import('./robustness/RobustnessStage').then((m) => {
    LoadedRobustness = m.default
    return m
  })
const RobustnessStage = lazy(loadRobustness)

// Compare is a chunk of its own too (its chart and texts); the rail line below needs only the core.
type CompareComponent = (typeof import('./compare/CompareStage'))['default']
let LoadedCompare: CompareComponent | null = null
const loadCompare = () =>
  import('./compare/CompareStage').then((m) => {
    LoadedCompare = m.default
    return m
  })
const CompareStage = lazy(loadCompare)

/** Layout-shaped placeholder while the compare chunk loads: a chart and a text block. */
function CompareSkeleton() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-label={t('workbench.loadingCompare')} className="flex flex-col gap-4 pt-4">
      <Skeleton width={180} height={20} />
      <Skeleton height={320} />
    </div>
  )
}

/** Layout-shaped placeholder while the robustness chunk loads: a control row, a chart and a table. */
function RobustnessSkeleton() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-label={t('workbench.loadingRobustness')} className="flex flex-col gap-4 pt-4">
      <Skeleton width={180} height={20} />
      <Skeleton width={320} height={28} />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Skeleton height={280} />
        <Skeleton height={280} />
      </div>
    </div>
  )
}

const isStage = (v: string | null): v is Stage => v !== null && (STAGES as readonly string[]).includes(v)

/**
 * `?example=<id>&method=<id>&stage=<stage>` loads a published example (with the ranking method asked for, when the
 * example is a reference for several) and opens a stage (links from method pages, screenshots). A new example with no
 * stage opens on Data, not on the stage left open last time. The query is removed afterwards so a reload keeps the
 * user's edits.
 */
function useQueryBootstrap() {
  const [lang] = useLang()
  const loadExample = useWorkbench((s) => s.loadExample)
  const setStage = useWorkbench((s) => s.setStage)
  const done = useRef(false)
  useLayoutEffect(() => {
    if (done.current) return
    done.current = true
    const params = new URLSearchParams(window.location.search)
    const example = params.get('example')
    const stage = params.get('stage')
    if (!example && !stage) return
    const loaded = example !== null && getExample(example) !== undefined
    if (loaded) loadExample(example, lang, params.get('method') ?? undefined)
    if (isStage(stage)) setStage(stage)
    else if (loaded) setStage('data')
    params.delete('example')
    params.delete('method')
    params.delete('stage')
    const rest = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`)
  }, [lang, loadExample, setStage])
}

/**
 * A loaded example that is still unchanged follows the language: its names are rewritten on a TR/EN switch, and again
 * when undo brings back an unchanged example that was on screen in the other language.
 */
function useExampleLanguage() {
  const [lang] = useLang()
  const exampleId = useWorkbench((s) => s.exampleId)
  const localizeExample = useWorkbench((s) => s.localizeExample)
  useEffect(() => localizeExample(lang), [lang, exampleId, localizeExample])
}

type StageState = 'done' | 'attention' | 'pending'

/** Rail status under a stage name: an icon and a word for done / needs attention, plain otherwise. */
function StageStatus({ state, children }: { state: StageState; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1">
      {state === 'done' && <CheckCircle aria-hidden className="size-3.5 shrink-0 text-ok" />}
      {state === 'attention' && <WarningCircle aria-hidden className="size-3.5 shrink-0 text-warning" />}
      <span className={state === 'attention' ? 'text-warning' : undefined}>{children}</span>
      {state !== 'pending' && (
        <span className="sr-only">, {state === 'done' ? t('workbench.rail.done') : t('workbench.rail.attention')}</span>
      )}
    </span>
  )
}

const NO_ATTEMPTS: Record<Stage, boolean> = { data: false, weights: false, ranking: false, results: false, robustness: false, compare: false }

export default function WorkbenchPage() {
  use(stagePictures)
  const { t } = useTranslation()
  usePageMeta(t('workbench.meta.title'), t('workbench.meta.description'))
  useQueryBootstrap()
  useExampleLanguage()
  const stage = useWorkbench((s) => s.stage)
  const setStage = useWorkbench((s) => s.setStage)
  const problem = useWorkbench((s) => s.problem)
  const weightMethod = useWorkbench((s) => s.weightMethod)
  const weightParams = useWorkbench((s) => s.methodParams?.[s.weightMethod])
  const rankingMethod = useWorkbench((s) => s.rankingMethod)
  const ranking = useRanking()
  const weights = useWeights()
  const validation = useValidation()
  const robustnessSummary = useRobustnessSummary()

  const [attempted, setAttemptedState] = useState<Record<Stage, boolean>>(NO_ATTEMPTS)
  const [importReport, setImportReport] = useState<ImportReport | null>(null)
  const focusRequest = useRef<{ id: string | null } | null>(null)
  const [focusTick, setFocusTick] = useState(0)

  const goTo = useCallback(
    (next: Stage, targetId?: string) => {
      const go = () => {
        focusRequest.current = { id: targetId ?? null }
        setStage(next)
        setFocusTick((k) => k + 1)
      }
      // Robustness opens once its chunk is here, so the stage the focus moves to is never an empty placeholder.
      if (next === 'robustness' && !LoadedRobustness) loadRobustness().then(go, go)
      else if (next === 'compare' && !LoadedCompare) loadCompare().then(go, go)
      else go()
    },
    [setStage],
  )

  // Results leads to Robustness: fetch it now rather than when the browser is idle.
  useEffect(() => {
    if (stage === 'results') void loadRobustness()
    if (stage === 'robustness') void loadCompare()
  }, [stage])

  // After a stage change the user asked for: focus the target control, or the stage itself,
  // so keyboard and screen reader users start at the top of the new stage.
  useEffect(() => {
    const req = focusRequest.current
    if (!req) return
    focusRequest.current = null
    const raf = requestAnimationFrame(() => {
      const el = req.id ? document.getElementById(req.id) : null
      if (el) {
        el.scrollIntoView({ block: 'center' })
        el.focus({ preventScroll: true })
        return
      }
      window.scrollTo({ top: 0 })
      document.getElementById('main')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(raf)
  }, [focusTick])

  // Warm the calculation chunk (KaTeX) and the robustness stage once the page is idle, so "Show the calculation" and
  // the Robustness stage open at once (and the rail can say how robust the ranking is).
  useEffect(() => {
    const load = () => {
      void import('./WorkedCalculation')
      void loadRobustness()
      void loadCompare()
    }
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load, { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(load, 500)
    return () => clearTimeout(id)
  }, [])

  const nav = useMemo<WorkbenchNav>(
    () => ({
      goTo,
      attempted,
      setAttempted: (s, value) => setAttemptedState((a) => (a[s] === value ? a : { ...a, [s]: value })),
      importReport,
      setImportReport,
    }),
    [goTo, attempted, importReport],
  )

  // How often first place survives the ±5/10/20 % nudges of each weight, once the robustness chunk has loaded.
  const rankingParams = useMethodParams(rankingMethod)
  const robustness = useMemo(() => {
    if (!robustnessSummary || !getRankingMethod(rankingMethod) || !weights.value || !ranking.value) return null
    return robustnessSummary(toProblem(problem), weights.value.weights, { methodId: rankingMethod, params: rankingParams })
  }, [robustnessSummary, rankingMethod, rankingParams, problem, weights.value, ranking.value])

  // The rail line: the alternative most methods put first, from every ranking method on the same weights.
  const methodParams = useWorkbench((s) => s.methodParams)
  const weightValues = weights.value?.weights
  const comparison = useMemo(
    () =>
      weightValues && !isEmptyProblem(problem)
        ? compareRankings(
            toProblem(problem),
            weightValues,
            rankingMethods.map((m) => ({ methodId: m.id, params: paramsFor({ methodParams }, m.id) })),
          )
        : null,
    [problem, weightValues, methodParams],
  )

  const stageMeta: Partial<Record<Stage, ReactNode>> = {}
  if (!isEmptyProblem(problem)) {
    const dataErrors = validation.filter((x) => x.severity === 'error').length
    stageMeta.data =
      dataErrors > 0 ? (
        <StageStatus state="attention">{t('workbench.rail.toFix', { count: dataErrors })}</StageStatus>
      ) : (
        <StageStatus state="done">{`${problem.alternatives.length} × ${problem.criteria.length}`}</StageStatus>
      )
    const weightsBroken = weights.value === null && weights.issues.some((x) => x.code.includes('weight'))
    stageMeta.weights = weights.value ? (
      <StageStatus state="done">{weightMethodFullLabel(weightMethod, weightParams, t)}</StageStatus>
    ) : weightsBroken ? (
      <StageStatus state="attention">{t('workbench.rail.checkWeights')}</StageStatus>
    ) : (
      <StageStatus state="pending">{weightMethodFullLabel(weightMethod, weightParams, t)}</StageStatus>
    )
    const rankingLabel = rankingMethodFullLabel(rankingMethod, rankingParams, t)
    stageMeta.ranking = <StageStatus state={ranking.value ? 'done' : 'pending'}>{rankingLabel}</StageStatus>
    if (ranking.value) {
      // A method's own answer can be a set (VIKOR's compromise set): name it (at most three, then a count).
      const names = problem.alternatives.map((_, i) => alternativeName(problem, i, t))
      const set = methodViews[rankingMethod].verdict?.(ranking.value, names, t, String)?.set
      const shown = set && set.length > 1 ? set : [bestIndex(ranking.value)]
      const label = shown.slice(0, 3).map((i) => alternativeName(problem, i, t)).join(', ') + (shown.length > 3 ? ` +${shown.length - 3}` : '')
      stageMeta.results = <StageStatus state="done">{label}</StageStatus>
    }
    if (robustness && robustness.total > 0) {
      stageMeta.robustness = <StageStatus state="pending">{t('workbench.rail.robustness', robustness)}</StageStatus>
    } else if (ranking.value) {
      // Until the stage's chunk has loaded: an empty line of the same height, so the rail does not shift.
      stageMeta.robustness = <span aria-hidden className="invisible">0</span>
    }
    if (comparison?.comparable && comparison.firstPlace) {
      const { alternative, methods, of } = comparison.firstPlace
      stageMeta.compare = (
        <StageStatus state={methods === of ? 'done' : 'pending'}>
          {t('workbench.rail.compare', { name: alternativeName(problem, alternative, t), n: methods, of })}
        </StageStatus>
      )
    }
  }

  let content: ReactNode
  if (stage === 'data') content = <DataStage />
  else if (stage === 'weights') content = <WeightsStage />
  else if (stage === 'ranking') content = <RankingStage />
  else if (stage === 'results') content = <ResultsStage />
  else if (stage === 'robustness') {
    content = LoadedRobustness ? (
      <LoadedRobustness />
    ) : (
      <Suspense fallback={<RobustnessSkeleton />}>
        <RobustnessStage />
      </Suspense>
    )
  } else {
    content = LoadedCompare ? (
      <LoadedCompare />
    ) : (
      <Suspense fallback={<CompareSkeleton />}>
        <CompareStage />
      </Suspense>
    )
  }

  return (
    <WorkbenchNavContext.Provider value={nav}>
      <WorkbenchLayout stage={stage} onStageChange={(s) => goTo(s)} stageMeta={stageMeta} explanation={<ExplanationPanel stage={stage} />}>
        {content}
      </WorkbenchLayout>
    </WorkbenchNavContext.Provider>
  )
}
