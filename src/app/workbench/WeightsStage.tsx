import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getWeightingMethod, type ValidationIssue, type WeightingResult } from '../../core'
import type { EntropyNormalization } from '../../core/methods/entropy'
import { getExample, shortCitation } from '../../data/examples'
import { BarChart, ChartTableModeProvider } from '../../features/charts'
import { CriticIdea, EntropyIdea } from '../../features/illustrations'
import { useNumberFormat } from '../../i18n'
import {
  computeWeights,
  toProblem,
  isEmptyProblem,
  useMethodParams,
  useWeights,
  useWorkbench,
  type DraftProblem,
  type WeightMethodId,
} from '../../state/workbench'
import { Button, cn, EmptyState, ErrorSummary, NumberInput, SegmentedControl, Table, TBody, Td, Th, THead, Tr, type ErrorSummaryItem } from '../../ui'
import { MethodParams } from './MethodParams'
import { useWorkbenchNav } from './nav'
import { BlockedByIssues, CalculationToggle, ContinueBar, MethodWarnings, SectionTitle } from './parts'
import { criterionName, DECIMALS, findStep, ids, placeIssue, sumDecimals, tr, weightMethodLabel } from './shared'

const METHODS: readonly WeightMethodId[] = ['critic', 'entropy', 'equal', 'manual']

/** A weighting method that the core computes (everything but manual). */
type ComputedMethod = Exclude<WeightMethodId, 'manual'>

/** Intermediate results shown as columns next to the weight, per method: step key and column header. */
const EXTRA_COLUMNS: Partial<Record<ComputedMethod, readonly { step: string; label: string }[]>> = {
  critic: [
    { step: 'critic.sigma', label: 'workbench.weights.columns.sigma' },
    { step: 'critic.conflict', label: 'workbench.weights.columns.conflict' },
    { step: 'critic.information', label: 'workbench.weights.columns.information' },
  ],
  // d next to w: on homogeneous data tiny differences in d decide the weights (docs/research/methods/entropy.md).
  entropy: [
    { step: 'entropy.entropy', label: 'workbench.weights.columns.entropy' },
    { step: 'entropy.diversification', label: 'workbench.weights.columns.diversification' },
  ],
}

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

  const dataBlocked = weights.value === null && weightMethod !== 'manual'

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-col gap-2">
        <SegmentedControl<WeightMethodId>
          aria-label={t('workbench.weightMethod.label')}
          value={weightMethod}
          onValueChange={setWeightMethod}
          options={METHODS.map((m) => ({ value: m, label: weightMethodLabel(m, t) }))}
          size="md"
          className="self-start"
        />
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
      ) : weights.value ? (
        <ComputedWeights problem={problem} method={weightMethod} result={weights.value} />
      ) : null}

      {!dataBlocked && <ContinueBar to="ranking" onContinue={onContinue} />}
    </div>
  )
}

function ComputedWeights({ problem, method, result }: { problem: DraftProblem; method: ComputedMethod; result: WeightingResult }) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const names = problem.criteria.map((_, j) => criterionName(problem.criteria, j, t))
  const extra = (EXTRA_COLUMNS[method] ?? []).map((c) => ({ ...c, values: findStep(result.steps, c.step)?.vector }))
  const entropyParams = useMethodParams('entropy')
  const n = problem.criteria.length

  return (
    <>
      <MethodWarnings warnings={result.warnings} problem={problem} />
      {method === 'equal' && (
        <p className="text-14 text-text">{t('workbench.weights.equalNote', { n, value: nf.format(1 / n) })}</p>
      )}
      {method === 'critic' && (
        // The table right below shows the same numbers, so the picture keeps its table for
        // screen readers only instead of a third copy behind "Show as table".
        <ChartTableModeProvider value="screen-reader">
          <CriticIdea
            problem={toProblem(problem)}
            format={format}
            labels={{
              title: t('workbench.visual.critic.title'),
              contrast: t('workbench.visual.critic.contrast'),
              conflict: t('workbench.visual.critic.conflict'),
              weight: t('workbench.visual.critic.weight'),
              information: t('workbench.visual.critic.information'),
              showTable: t('workbench.chart.showTable'),
              criterion: t('workbench.criterion'),
            }}
            className="max-w-[760px]"
          />
        </ChartTableModeProvider>
      )}
      {method === 'entropy' && (
        <ChartTableModeProvider value="screen-reader">
          <EntropyIdea
            problem={toProblem(problem)}
            params={{ normalization: entropyParams.normalization as EntropyNormalization }}
            format={format}
            labels={{
              title: t('workbench.visual.entropy.title'),
              even: t('workbench.visual.entropy.even'),
              entropy: t('workbench.visual.entropy.entropy'),
              weight: t('workbench.visual.entropy.weight'),
              share: t('workbench.visual.entropy.share'),
              showTable: t('workbench.chart.showTable'),
              alternative: t('workbench.alternative'),
            }}
            className="max-w-[760px]"
          />
        </ChartTableModeProvider>
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
                {extra.map((c) => (
                  <Th key={c.step} numeric>
                    {tr(t, c.label)}
                  </Th>
                ))}
                <Th numeric>{t('workbench.weights.columns.weight')}</Th>
              </Tr>
            </THead>
            <TBody>
              {problem.criteria.map((c, j) => (
                <Tr key={j}>
                  <Th scope="row">{names[j]}</Th>
                  <Td className="text-text-2">{t(`workbench.criterionType.${c.type}`)}</Td>
                  {extra.map((c) => (
                    <Td key={c.step} numeric>
                      {nf.format(c.values?.[j])}
                    </Td>
                  ))}
                  <Td numeric className="font-medium">
                    {nf.format(result.weights[j])}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </section>

      {getWeightingMethod(method) && <CalculationToggle groups={[{ steps: result.steps }]} problem={problem} />}
    </>
  )
}

/** Index of the largest weight (the first one on ties), drawn in the accent as on the landing page. */
export const argmax = (values: readonly number[]): number =>
  values.reduce((best, v, j) => (v > (values[best] ?? -Infinity) ? j : best), 0)

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
  const normalize = () => fill(w.map((x) => (x ?? 0) / sum))

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

