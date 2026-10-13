import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getExample } from '../../data/examples'
import { useLang } from '../../i18n'
import { getRankingMethod } from '../../core'
import { isEmptyProblem, STAGES, toProblem, useMethodParams, useRanking, useValidation, useWeights, useWorkbench, type Stage } from '../../state/workbench'
import { Skeleton } from '../../ui'
import { usePageMeta } from '../landing/usePageMeta'
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
 * example is a reference for several) and opens a stage (links from method pages, screenshots). The query is removed afterwards so a reload keeps the user's edits.
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
    if (example && getExample(example)) loadExample(example, lang, params.get('method') ?? undefined)
    if (isStage(stage)) setStage(stage)
    params.delete('example')
    params.delete('method')
    params.delete('stage')
    const rest = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`)
  }, [lang, loadExample, setStage])
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

const NO_ATTEMPTS: Record<Stage, boolean> = { data: false, weights: false, ranking: false, results: false, robustness: false }

export default function WorkbenchPage() {
  const { t } = useTranslation()
  usePageMeta(t('workbench.meta.title'), t('workbench.meta.description'))
  useQueryBootstrap()
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
      else go()
    },
    [setStage],
  )

  // Results leads to Robustness: fetch it now rather than when the browser is idle.
  useEffect(() => {
    if (stage === 'results') void loadRobustness()
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
    const method = getRankingMethod(rankingMethod)
    if (!robustnessSummary || !method || !weights.value || !ranking.value) return null
    return robustnessSummary(toProblem(problem), weights.value.weights, method, rankingParams)
  }, [robustnessSummary, rankingMethod, rankingParams, problem, weights.value, ranking.value])

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
      stageMeta.results = <StageStatus state="done">{alternativeName(problem, bestIndex(ranking.value), t)}</StageStatus>
    }
    if (robustness) {
      stageMeta.robustness = <StageStatus state="pending">{t('workbench.rail.robustness', robustness)}</StageStatus>
    } else if (ranking.value) {
      // Until the stage's chunk has loaded: an empty line of the same height, so the rail does not shift.
      stageMeta.robustness = <span aria-hidden className="invisible">0</span>
    }
  }

  let content: ReactNode
  if (stage === 'data') content = <DataStage />
  else if (stage === 'weights') content = <WeightsStage />
  else if (stage === 'ranking') content = <RankingStage />
  else if (stage === 'results') content = <ResultsStage />
  else if (LoadedRobustness) content = <LoadedRobustness />
  else
    content = (
      <Suspense fallback={<RobustnessSkeleton />}>
        <RobustnessStage />
      </Suspense>
    )

  return (
    <WorkbenchNavContext.Provider value={nav}>
      <WorkbenchLayout stage={stage} onStageChange={(s) => goTo(s)} stageMeta={stageMeta} explanation={<ExplanationPanel stage={stage} />}>
        {content}
      </WorkbenchLayout>
    </WorkbenchNavContext.Provider>
  )
}
