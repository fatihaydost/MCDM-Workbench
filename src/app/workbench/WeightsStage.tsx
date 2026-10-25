import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getWeightingMethod, type ValidationIssue, type WeightingResult } from '../../core'
import { getExample, shortCitation } from '../../data/examples'
import { BarChart } from '../../features/charts'
import { useNumberFormat } from '../../i18n'
import {
  computeWeights,
  isEmptyProblem,
  toProblem,
  useMethodParams,
  useWeights,
  useWorkbench,
  type DraftProblem,
  type WeightMethodId,
} from '../../state/workbench'
import { Button, cn, EmptyState, ErrorSummary, NumberInput, SegmentedControl, Table, TBody, Td, Th, THead, Tr, type ErrorSummaryItem } from '../../ui'
import { methodViews, WEIGHTING_VIEW_IDS } from '../methods/views'
import { MethodParams } from './MethodParams'
import { useWorkbenchNav } from './nav'
import { JudgementWeights } from './JudgementWeights'
import { OrdinalWeights } from './OrdinalWeights'
import { BlockedByIssues, CalculationToggle, ContinueBar, MethodWarnings, SectionTitle } from './parts'
import { criterionName, DECIMALS, findStep, ids, placeIssue, sumDecimals, tr, weightMethodLabel } from './shared'

/** A weighting method that the core computes (everything but manual). */
type ComputedMethod = Exclude<WeightMethodId, 'manual'>

const WEIGHT_FAMILIES: readonly { key: 'objective' | 'subjective' | 'direct'; ids: readonly WeightMethodId[] }[] = [
  { key: 'objective', ids: ['critic', 'entropy', 'sd', 'merec', 'lopcow', 'cilos'] },
  { key: 'subjective', ids: ['bwm', 'ahp', 'swara', 'roc'] },
  { key: 'direct', ids: ['equal', 'manual'] },
]

export function WeightsStage() {
  const { t } = useTranslation()
  const problem = useWorkbench((s) => s.problem)
  const weightMethod = useWorkbench((s) => s.weightMethod)
  const setWeightMethod = useWorkbench((s) => s.setWeightMethod)
  const weights = useWeights()
  const { goTo, attempted, setAttempted } = useWorkbenchNav()
  const summaryRoot = useRef<HTMLDivElement>(null)
  const [focusSummary, setFocusSummary] = useState(0)

  useEffect(() => {
    if (focusSummary > 0) summaryRoot.current?.querySelector<HTMLElement>('[tabindex="-1"]')?.focus()
  }, [focusSummary])

  if (isEmptyProblem(problem)) {
    return (
      <EmptyState
        title={t('workbench.empty.weights.title')}
        description={t('workbench.empty.weights.body')}
        action={<Button onClick={() => goTo('data')}>{t('workbench.empty.weights.action')}</Button>}
      />
    )
  }

  const onContinue = () => {
    if (weights.value === null) {
      setAttempted('weights', true)
      setFocusSummary((k) => k + 1)
      return
    }
    goTo('ranking')
  }

  // Weights from answers do not read the matrix: missing answers are asked on the stage, only n < 2 blocks.
  const fromAnswers = getWeightingMethod(weightMethod)?.reads === 'judgements'
  const dataBlocked = weights.value === null && weightMethod !== 'manual' && !(fromAnswers && problem.criteria.length >= 2)

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-col gap-2">
        <SegmentedControl<WeightMethodId>
          aria-label={t('workbench.weightMethod.label')}
          value={weightMethod}
          onValueChange={setWeightMethod}
          options={WEIGHTING_VIEW_IDS.map((m) => ({ value: m, label: weightMethodLabel(m, t) }))}
          size="md"
          // Eleven methods do not fit one row below xl: a 4-col grid below xl, 3-col below sm.
          className="self-start max-xl:grid max-xl:grid-cols-4 max-sm:grid-cols-3 max-sm:self-stretch max-sm:[&>*]:px-2 max-sm:[&>*]:text-13"
        />
        <div aria-hidden className="flex flex-wrap items-center gap-x-4 gap-y-1 text-12 text-text-3">
          {WEIGHT_FAMILIES.map((f) => {
            const active = f.ids.includes(weightMethod)
            return (
              <span key={f.key} className={cn('inline-flex flex-wrap items-center gap-1', active && 'text-text-2')}>
                <span className={cn('font-semibold', active ? 'text-accent' : 'text-text-3')}>
                  {t(`workbench.weights.families.${f.key}`)}:
                </span>
                <span>{f.ids.map((m) => weightMethodLabel(m, t)).join(' · ')}</span>
              </span>
            )
          })}
        </div>
        <span id={ids.weightMethod} tabIndex={-1} className="sr-only">
          {t('workbench.weightMethod.label')}
        </span>
        <p className="max-w-[72ch] text-13 text-text-2">{t(`workbench.weights.methodHint.${weightMethod}`)}</p>
        <MethodParams methodId={weightMethod} descriptors={getWeightingMethod(weightMethod)?.params} />
      </div>

      {weightMethod === 'manual' ? (
        <ManualWeights problem={problem} issues={weights.issues} showErrors={attempted.weights} summaryRoot={summaryRoot} />
      ) : dataBlocked ? (
        <BlockedByIssues issues={weights.issues} problem={problem} />
      ) : weightMethod === 'bwm' || weightMethod === 'ahp' ? (
        <JudgementWeights problem={problem} method={weightMethod} result={weights} />
      ) : weights.value ? (
        <>
          {(weightMethod === 'swara' || weightMethod === 'roc') && <OrdinalWeights problem={problem} method={weightMethod} />}
          <ComputedWeights problem={problem} method={weightMethod} result={weights.value} />
        </>
      ) : null}

      {fromAnswers && !dataBlocked && attempted.weights && weights.value === null && (
        <BlockedByIssues issues={weights.issues} problem={problem} />
      )}
      {!dataBlocked && <ContinueBar to="ranking" onContinue={onContinue} />}
    </div>
  )
}

export function ComputedWeights({ problem, method, result }: { problem: DraftProblem; method: ComputedMethod; result: WeightingResult }) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const names = problem.criteria.map((_, j) => criterionName(problem.criteria, j, t))
  const view = methodViews[method]
  const extra = (view.columns ?? []).map((c) => ({ ...c, values: findStep(result.steps, c.step)?.vector }))
  const params = useMethodParams(method)
  // Weights from answers draw their picture above the questions (JudgementWeights), not here again.
  const Picture = getWeightingMethod(method)?.reads === 'judgements' ? undefined : view.stage?.Component
  const core = useMemo(() => toProblem(problem), [problem])
  const n = problem.criteria.length

  return (
    <>
      <MethodWarnings warnings={result.warnings} problem={problem} />
      {method === 'equal' && (
        <p className="text-14 text-text">{t('workbench.weights.equalNote', { n, value: nf.format(1 / n) })}</p>
      )}
      {Picture && (
        <Suspense fallback={null}>
          <Picture problem={core} weights={result.weights} params={params} />
        </Suspense>
      )}
      <section className="flex flex-col gap-3">
        <SectionTitle>
          <span id="wb-weights-table">{t('workbench.weights.tableTitle')}</span>
        </SectionTitle>
        <div className="min-w-0">
          <Table density="compact" className="w-auto min-w-[min(100%,560px)]" aria-labelledby="wb-weights-table">
            <THead>
              <Tr>
                <Th>{t('workbench.weights.columns.criterion')}</Th>
                <Th>{t('workbench.weights.columns.direction')}</Th>
                {/* Below sm the method's columns step aside, so name, direction and w fit without a sideways scroll;
                    they stay in the picture and in "Show the calculation". */}
                {extra.map((c) => (
                  <Th key={c.step} numeric className="hidden sm:table-cell">
                    {tr(t, c.label)}
                  </Th>
                ))}
                <Th numeric>{t('workbench.weights.columns.weight')}</Th>
              </Tr>
            </THead>
            <TBody>
              {(() => {
                const maxW = Math.max(...result.weights.filter(Number.isFinite), 0)
                const bestJ = argmax(result.weights)
                return problem.criteria.map((c, j) => {
                  const isTop = maxW > 0 && j === bestJ && problem.criteria.length > 1
                  const wj = result.weights[j] ?? 0
                  return (
                    <Tr key={j} selected={isTop}>
                      <Th scope="row" className={cn('max-sm:whitespace-normal', isTop && 'font-semibold')}>
                        {names[j]}
                      </Th>
                      <Td className="text-text-2">
                        <DirectionLabel type={c.type} />
                      </Td>
                      {extra.map((col) => {
                        const v = col.values?.[j]
                        const d = col.decimals === 0 && typeof v === 'number' && !Number.isInteger(v) ? 1 : col.decimals
                        return (
                          <Td key={col.step} numeric className="hidden sm:table-cell">
                            {nf.format(v, d)}
                          </Td>
                        )
                      })}
                      <Td numeric className={cn(isTop ? 'font-semibold' : 'font-medium')}>
                        {maxW > 0 && (
                          <span aria-hidden className="mr-2.5 inline-block h-2 w-14 bg-surface-2 align-middle">
                            <span
                              className={cn('block h-full', isTop ? 'bg-accent' : 'bg-[var(--data-context)]')}
                              style={{ width: `${Math.min(100, (Math.max(wj, 0) / maxW) * 100)}%` }}
                            />
                          </span>
                        )}
                        {nf.format(wj)}
                      </Td>
                    </Tr>
                  )
                })
              })()}
            </TBody>
          </Table>
        </div>
      </section>

      {getWeightingMethod(method) && <CalculationToggle groups={[{ steps: result.steps }]} problem={problem} />}
    </>
  )
}

/** "↑ Benefit"; below sm only the arrow, with the word kept for screen readers. */
function DirectionLabel({ type }: { type: 'benefit' | 'cost' }) {
  const { t } = useTranslation()
  const label = t(`workbench.criterionType.${type}`)
  return (
    <>
      <span aria-hidden className="sm:hidden">
        {type === 'benefit' ? '↑' : '↓'}
      </span>
      <span className="max-sm:sr-only">{label}</span>
    </>
  )
}

/** Index of the largest weight (the first one on ties), drawn in the accent as on the landing page; -1 when all weights are equal. */
export const argmax = (values: readonly number[]): number => {
  const finite = values.filter(Number.isFinite)
  if (finite.length < 2 || Math.max(...finite) - Math.min(...finite) <= 1e-12) return -1
  return values.reduce((best, v, j) => (v > (values[best] ?? -Infinity) ? j : best), 0)
}

export function WeightsChart({ names, weights, format, className }: { names: string[]; weights: number[]; format: (v: number) => string; className?: string }) {
  const { t } = useTranslation()
  return (
    <BarChart
      title={t('workbench.weights.chartTitle')}
      labels={names}
      values={weights}
      highlight={argmax(weights)}
      format={format}
      tableLabels={{ show: t('workbench.chart.showTable'), label: t('workbench.criterion'), value: t('workbench.weights.columns.weight') }}
      className={cn('max-w-[640px]', className)}
    />
  )
}

type ManualProps = {
  problem: DraftProblem
  issues: ValidationIssue[]
  showErrors: boolean
  summaryRoot: React.RefObject<HTMLDivElement | null>
}

function ManualWeights({ problem, issues, showErrors, summaryRoot }: ManualProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const manualWeights = useWorkbench((s) => s.manualWeights)
  const setManualWeight = useWorkbench((s) => s.setManualWeight)
  const exampleId = useWorkbench((s) => s.exampleId)
  const n = problem.criteria.length
  const w = Array.from({ length: n }, (_, j) => manualWeights[j] ?? null)
  const names = problem.criteria.map((_, j) => criterionName(problem.criteria, j, t))

  const filled = w.every((x): x is number => x !== null)
  const sum = w.reduce<number>((a, x) => a + (x ?? 0), 0)
  const sumOk = filled && issues.every((x) => x.code !== 'weights-sum')
  const canNormalize = filled && w.every((x) => (x ?? 0) >= 0) && sum > 0 && !sumOk

  const critic = useMemo(() => computeWeights({ problem, weightMethod: 'critic', manualWeights: [] }), [problem])
  const example = exampleId ? getExample(exampleId) : undefined
  const fromPaper = example?.weights && example.weights.length === n && example.weights.every((x, j) => x === w[j])

  const fill = (values: number[]) => values.forEach((v, j) => setManualWeight(j, v))
  const normalize = () => {
    const maxW = Math.max(...w.map((x) => Math.abs(x ?? 0)), 1e-300)
    const scaled = w.map((x) => (x ?? 0) / maxW)
    const scaledSum = scaled.reduce((a, b) => a + b, 0)
    if (scaledSum > 0) fill(scaled.map((x) => x / scaledSum))
  }

  const errorFor = (j: number): string | undefined => {
    const x = issues.find((i) => i.col === j && (i.code === 'invalid-weight' || i.code === 'negative-weight'))
    if (!x) return undefined
    if (x.code === 'invalid-weight') return t('workbench.weights.emptyWeight', { criterion: names[j] })
    return placeIssue(x, problem, t, nf.format).message
  }

  const blocking = issues.filter((x) => x.severity === 'error')
  const summaryItems: ErrorSummaryItem[] = blocking.map((x) => {
    const p = placeIssue(x, problem, t, nf.format)
    return { targetId: p.targetId, message: x.code === 'invalid-weight' && x.col !== undefined ? t('workbench.weights.emptyWeight', { criterion: names[x.col] }) : p.message }
  })
  const sumMessage = filled && !sumOk ? t('workbench.weights.sumError', { value: nf.format(sum, sumDecimals(sum)) }) : null

  return (
    <>
      <div ref={summaryRoot} className={showErrors && summaryItems.length > 0 ? undefined : 'hidden'}>
        <ErrorSummary autoFocus={false} errors={showErrors ? summaryItems : []} />
      </div>

      {fromPaper && example && (
        <p className="text-13 text-text-2">{t('workbench.weights.fromPaper', { citation: shortCitation(example.citation, nf.lang) })}</p>
      )}

      <section className="flex flex-col gap-3">
        <SectionTitle>
          <span id="wb-weights-table">{t('workbench.weights.tableTitle')}</span>
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => fill(new Array<number>(n).fill(1 / n))}>
            {t('workbench.weights.startEqual')}
          </Button>
          {critic.value && (
            <Button size="sm" variant="ghost" onClick={() => fill(critic.value!.weights)}>
              {t('workbench.weights.startCritic')}
            </Button>
          )}
        </div>
        <div className="min-w-0">
          <Table density="regular" stickyHeader={false} className="w-auto min-w-[min(100%,480px)]" aria-labelledby="wb-weights-table">
            <THead>
              <Tr>
                <Th>{t('workbench.weights.columns.criterion')}</Th>
                <Th>{t('workbench.weights.columns.direction')}</Th>
                <Th numeric className="w-40">
                  {t('workbench.weights.columns.weight')}
                </Th>
              </Tr>
            </THead>
            <TBody>
              {problem.criteria.map((c, j) => {
                const err = showErrors ? errorFor(j) : undefined
                return (
                  <Tr key={j}>
                    <Th scope="row">
                      <label htmlFor={ids.weight(j)}>{names[j]}</label>
                    </Th>
                    <Td className="text-text-2">{t(`workbench.criterionType.${c.type}`)}</Td>
                    <Td className="py-1">
                      <NumberInput
                        id={ids.weight(j)}
                        value={w[j] ?? null}
                        decimals={DECIMALS.weight}
                        controlSize="sm"
                        invalid={Boolean(err)}
                        aria-describedby={err ? `${ids.weight(j)}-error` : undefined}
                        onValueChange={(v) => setManualWeight(j, v)}
                        className="w-32"
                      />
                      {err && (
                        <p id={`${ids.weight(j)}-error`} className="mt-1 max-w-40 text-12 text-danger">
                          {err}
                        </p>
                      )}
                    </Td>
                  </Tr>
                )
              })}
              <Tr>
                <Th scope="row" className="font-semibold">
                  {t('workbench.weights.total')}
                </Th>
                <Td />
                <Td numeric className="pr-5 font-semibold" aria-live="polite">
                  <span className={filled && !sumOk ? 'text-danger' : undefined}>{nf.format(sum, Math.max(DECIMALS.weight, sumDecimals(sum)))}</span>
                </Td>
              </Tr>
            </TBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button id={ids.normalize} onClick={normalize} disabled={!canNormalize} aria-describedby="wb-normalize-hint">
            {t('workbench.weights.normalize')}
          </Button>
          <p id="wb-normalize-hint" className={cn('text-13', sumMessage ? 'text-danger' : filled ? 'text-ok' : 'text-text-3')}>
            {sumMessage ?? (filled ? t('workbench.weights.sumOk') : t('workbench.weights.normalizeHint'))}
          </p>
        </div>
      </section>

      {sumOk && filled && <WeightsChart names={names} weights={w as number[]} format={format} />}
    </>
  )
}

