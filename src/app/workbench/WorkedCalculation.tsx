import { CaretDown, Check, Copy, Info } from '@phosphor-icons/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isStepKey, stepContent, stepFlow } from '../../content/steps'
import type { Criterion, Step } from '../../core'
import { StepFlow } from '../../features/illustrations/StepFlow'
import { escapeLatex, stepToTable, tableToLatex, tableToTsv, type StepTable } from '../../features/io'
import { useNumberFormat } from '../../i18n'
import type { DraftProblem } from '../../state/workbench'
import { Button, cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, IconButton, Tooltip, TooltipProvider } from '../../ui'
// Direct import, not the barrel: KaTeX must stay out of the main chunk.
import { Formula } from '../../ui/Formula'
import type { CalcGroup } from './parts'
import { DECIMALS, stepAxisLabels, stepName, tr } from './shared'

const PLACEHOLDER = 'KDSSYMBOLPLACEHOLDER'

type Copied = 'tsv' | 'latex' | 'failed' | null

export type WorkedCalculationProps = {
  groups: readonly CalcGroup[]
  problem: DraftProblem
  /** Heading level of each step title; group titles use the level above. Default h3. */
  headingLevel?: 'h3' | 'h4' | undefined
}

/** The step map for a group of steps: its method is the prefix of the step keys (`<id>.<step>`). */
const flowFor = (steps: readonly Step[]) => stepFlow(steps[0]?.key.split('.')[0] ?? '', steps.map((s) => s.key))

const stepDomId = (key: string) => `wb-step-${key.replace(/\./g, '-')}`

/**
 * The signature element (DESIGN.md §Signature element): every step of a result as a block with a
 * one-line description, its formula, the labelled matrix or vector and copy as TSV or LaTeX.
 * The focused (or last clicked) step carries the accent on its hairline and number.
 */
export default function WorkedCalculation({ groups, problem, headingLevel = 'h3' }: WorkedCalculationProps) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(0)
  const [digits, setDigits] = useState<2 | 4>(DECIMALS.step as 4)
  const [highlightCols, setHighlightCols] = useState(true)
  const labels = useMemo(() => stepAxisLabels(problem, t), [problem, t])
  const GroupHeading = headingLevel === 'h4' ? 'h3' : 'h2'
  const root = useRef<HTMLDivElement>(null)
  const keys = groups.flatMap((g) => g.steps.map((s) => s.key))

  // The step crossing the upper third of the viewport is the current one while scrolling.
  useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = Number((e.target as HTMLElement).dataset.index)
          if (Number.isFinite(i)) setCurrent(i)
        }
      },
      { rootMargin: '-25% 0px -70% 0px' },
    )
    el.querySelectorAll('section[data-step]').forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [groups])

  const jump = (key: string) => {
    let resolved = key
    if (!keys.includes(resolved)) {
      for (const g of groups) {
        const node = flowFor(g.steps)?.find((n) => n.key === key)
        const firstKey = node?.stepKeys?.find((k) => keys.includes(k))
        if (firstKey) {
          resolved = firstKey
          break
        }
      }
    }
    const i = keys.indexOf(resolved)
    if (i < 0) return
    setCurrent(i)
    const target = document.getElementById(stepDomId(resolved))
    target?.scrollIntoView({ block: 'start' })
    target?.focus({ preventScroll: true })
  }

  let n = 0
  return (
    <TooltipProvider>
      <div ref={root} className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface px-3 py-2 text-13">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-2">{t('workbench.calc.decimals')}:</span>
          <div className="inline-flex rounded-control border border-line-strong bg-bg p-0.5">
            {([2, 4] as const).map((d) => (
              <button
                key={d}
                type="button"
                tabIndex={-1}
                onClick={() => setDigits(d)}
                className={cn(
                  'rounded-xs px-2 py-0.5 text-12 font-medium transition-colors',
                  digits === d ? 'bg-accent text-bg' : 'text-text-2 hover:text-text',
                )}
              >
                {t(d === 2 ? 'workbench.calc.decimals2' : 'workbench.calc.decimals4')}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          tabIndex={-1}
          aria-pressed={highlightCols}
          onClick={() => setHighlightCols((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-12 font-medium transition-colors',
            highlightCols ? 'border-accent bg-accent-bg text-text' : 'border-line-strong bg-bg text-text-2 hover:text-text',
          )}
        >
          <span aria-hidden className={cn('size-2 rounded-full', highlightCols ? 'bg-accent' : 'bg-line-strong')} />
          {t('workbench.calc.highlightCols')}
        </button>
      </div>
      {groups.map((g, gi) => {
        const flow = flowFor(g.steps)
        const first = n
        const activeKey = current >= first && current < first + g.steps.length ? keys[current] : undefined
        return (
          <div key={gi} className="flex flex-col gap-6">
            {g.title && <GroupHeading className="text-14 font-semibold text-text-2">{g.title}</GroupHeading>}
            {flow && (
              <div className="sticky top-15 z-20 -mx-1 bg-bg px-1 py-2">
                <StepFlow
                  steps={flow.map((node) => ({ ...node, label: tr(t, `workbench.flow.${node.key}`) }))}
                  active={activeKey}
                  onSelect={jump}
                  labels={{ nav: t('workbench.flow.nav') }}
                />
              </div>
            )}
            <div className="flex flex-col gap-8">
              {g.steps.map((step) => {
                const index = n++
                return (
                  <StepBlock
                    key={`${gi}-${step.key}`}
                    step={step}
                    number={index + 1}
                    index={index}
                    domId={stepDomId(step.key)}
                    current={index === current}
                    onCurrent={() => setCurrent(index)}
                    labels={labels}
                    criteria={problem.criteria}
                    heading={headingLevel}
                    name={stepName(step.key, t)}
                    digits={digits}
                    highlightCols={highlightCols}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
      </div>
    </TooltipProvider>
  )
}

type StepBlockProps = {
  step: Step
  number: number
  index: number
  domId: string
  current: boolean
  onCurrent: () => void
  labels: ReturnType<typeof stepAxisLabels>
  criteria: readonly Criterion[]
  heading: 'h3' | 'h4'
  name: string
  digits: 2 | 4
  highlightCols: boolean
}

function StepBlock({ step, number, index, domId, current, onCurrent, labels, criteria, heading: H, name, digits, highlightCols }: StepBlockProps) {
  const { t, i18n } = useTranslation()
  const nf = useNumberFormat(digits)
  const lang = nf.lang
  const titleId = useId()
  const [copied, setCopied] = useState<Copied>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const content = isStepKey(step.key) ? stepContent[step.key] : undefined
  const table = useMemo(
    () => stepToTable(step, labels, { valueLabel: content?.symbol ?? name }),
    [step, labels, name, content],
  )

  // equal and manual have no one-liner in their module; their text lives in i18n steps.*.
  const description = content?.[lang] ?? (i18n.exists(`steps.${step.key}`) ? tr(t, `steps.${step.key}`) : '')
  const tex = content?.tex ?? ''
  const edgeCase = content?.edgeCase?.[lang]

  const copy = async (format: 'tsv' | 'latex') => {
    let text: string
    if (format === 'tsv') {
      // Full precision, in the separator the user's spreadsheet expects.
      text = tableToTsv(table, { decimal: lang === 'tr' ? ',' : '.' })
    } else {
      const withPlaceholder = stepToTable(step, labels, { valueLabel: PLACEHOLDER })
      const symbol = content?.texSymbol
      const body = tableToLatex(withPlaceholder, { digits: DECIMALS.step })
      text = `% ${name}\n${symbol ? body.replace(PLACEHOLDER, symbol) : body.replace(PLACEHOLDER, escapeLatex(name))}`
    }
    let result: Copied = format
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      result = 'failed'
    }
    setCopied(result)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), result === 'failed' ? 5000 : 1500)
  }

  const live =
    copied === 'tsv'
      ? t('workbench.calc.copiedTsv', { n: number })
      : copied === 'latex'
        ? t('workbench.calc.copiedLatex', { n: number })
        : copied === 'failed'
          ? t('workbench.calc.copyFailed')
          : ''

  return (
    <section
      id={domId}
      tabIndex={-1}
      aria-labelledby={titleId}
      data-step={step.key}
      data-index={index}
      data-current={current || undefined}
      className="relative flex min-w-0 scroll-mt-32 flex-col gap-3 border-l border-line pl-5 outline-none"
      onFocusCapture={onCurrent}
      onPointerDown={onCurrent}
    >
      {current && <span aria-hidden className="absolute inset-y-0 -left-px w-0.5 bg-accent" />}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 max-w-[68ch] gap-3">
          <span aria-hidden className={cn('num w-5 shrink-0 text-14 leading-5 font-semibold', current ? 'text-accent' : 'text-text-3')}>
            {number}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <H id={titleId} className="text-14 font-semibold text-text">
                <span className="sr-only">{t('workbench.calc.step', { n: number })}: </span>
                {name}
              </H>
              {edgeCase && (
                <Tooltip content={edgeCase} side="top">
                  <IconButton size="sm" aria-label={t('workbench.calc.edgeCase', { text: edgeCase })} icon={<Info />} className="-my-1" />
                </Tooltip>
              )}
            </div>
            {description && <p className="text-14 text-text-2">{description}</p>}
          </div>
        </div>
        {/* One quiet "Copy" menu per step (TSV or LaTeX), so 14 steps do not carry 28 buttons. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('workbench.calc.copyLabel', { n: number })}
              icon={copied === 'tsv' || copied === 'latex' ? <Check aria-hidden /> : <Copy aria-hidden />}
              iconEnd={<CaretDown aria-hidden />}
              className="shrink-0"
            >
              {copied === 'tsv' || copied === 'latex' ? t('workbench.calc.copied') : t('workbench.calc.copy')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => void copy('tsv')}>{t('workbench.calc.copyTsv')}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void copy('latex')}>{t('workbench.calc.copyLatex')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {tex && (
        <div className="min-w-0 sm:pl-8">
          <Formula tex={tex} display className="text-text" />
        </div>
      )}

      <div className="min-w-0 sm:pl-8">
        {/* A value the step leaves undefined (a constant column's correlation) says so instead of a blank cell. */}
        <StepTableView
          table={table}
          stepKey={step.key}
          criteria={criteria}
          format={(v) => (Number.isFinite(v) ? nf.format(v) : t('workbench.calc.undefined'))}
          label={t('workbench.calc.tableLabel', { n: number, name })}
          signed={content?.signed}
          highlightCols={highlightCols}
        />
      </div>

      {copied === 'failed' && <p className="text-13 text-danger sm:pl-8">{t('workbench.calc.copyFailed')}</p>}
      <span aria-live="polite" className="sr-only">
        {live}
      </span>
    </section>
  )
}

type Hover = { r: number; c: number } | null

const NO_PEAK_STEPS = new Set<string>([
  'critic.correlation',
  'electre-i.concordance',
  'electre-i.discordance',
  'electre-i.outranking',
  'electre-iii.concordance',
  'electre-iii.credibility',
  'promethee-ii.preferenceMatrix',
  'codas.relativeAssessment',
  'vikor.best',
  'vikor.worst',
  'topsis.idealBest',
  'topsis.idealWorst',
  'cilos.squareMatrix',
  'cilos.lossMatrix',
  'cilos.systemMatrix',
])

const MIN_PEAK_STEPS = new Set<string>([
  'vikor.weightedDistance',
  'vikor.groupUtility',
  'vikor.individualRegret',
  'vikor.q',
  'topsis.distanceBest',
  'merec.normalized',
  'edas.nda',
  'edas.weightedNda',
  'edas.sn',
  'copras.sMinus',
  'moora.costSum',
  'promethee-ii.negativeFlow',
  'electre-i.netDiscordance',
  'electre-iii.descending',
  'electre-iii.ascending',
  'electre-iii.meanRank',
])

const UNORIENTED_MATRIX_STEPS = new Set<string>([
  'topsis.normalized',
  'topsis.weighted',
  'moora.normalized',
  'moora.weighted',
  'copras.normalizedSum',
  'copras.weighted',
  'electre-i.oriented',
])

/**
 * Labelled matrix, vector or scalar in Plex Mono with fixed decimals. Hovering a cell tints its
 * row and column labels. Wide or tall tables scroll inside their own box, never the page.
 */
function StepTableView({
  table,
  stepKey,
  criteria,
  format,
  label,
  signed,
  highlightCols = false,
}: {
  table: StepTable
  stepKey?: string | undefined
  criteria?: readonly Criterion[] | undefined
  format: (v: number) => string
  label: string
  signed?: true | undefined
  highlightCols?: boolean | undefined
}) {
  const [hover, setHover] = useState<Hover>(null)

  const colPeaks = useMemo(() => {
    if (!highlightCols || table.values.length < 2) return null
    const cols = table.values[0]?.length ?? 0
    if (stepKey !== undefined && NO_PEAK_STEPS.has(stepKey)) return Array.from({ length: cols }, () => NaN)
    const lowerIsBetterStep = stepKey !== undefined && MIN_PEAK_STEPS.has(stepKey)
    const unorientedMatrix = stepKey !== undefined && UNORIENTED_MATRIX_STEPS.has(stepKey)
    return Array.from({ length: cols }, (_, c) => {
      const colVals = table.values.map((r) => r[c]!).filter(Number.isFinite)
      if (colVals.length < 2) return null
      const min = Math.min(...colVals)
      const max = Math.max(...colVals)
      if (max - min <= 1e-12) return null
      if (lowerIsBetterStep) return min
      if (unorientedMatrix && stepKey !== 'electre-i.oriented' && criteria?.[c]?.type === 'cost') return min
      return max
    })
  }, [highlightCols, table.values, stepKey, criteria])

  if (table.kind === 'scalar') {
    return (
      <p className="font-mono text-14 text-text">
        <span className="font-sans text-text-2">{table.rowLabels[0]} = </span>
        <span className="num">{format(table.values[0]![0]!)}</span>
      </p>
    )
  }

  const colOn = (c: number) => hover?.c === c
  const rowOn = (r: number) => hover?.r === r

  return (
    <div role="region" aria-label={label} tabIndex={0} className="max-h-[420px] max-w-full overflow-auto rounded-control border border-line">
      <table className="w-auto min-w-full border-separate border-spacing-0 text-13" onMouseLeave={() => setHover(null)}>
        {table.colLabels && (
          <thead>
            <tr>
              <td aria-hidden className="sticky top-0 left-0 z-20 h-8 border-b border-line bg-surface-2 px-3" />
              {table.colLabels.map((l, c) => (
                <th
                  key={c}
                  scope="col"
                  className={cn(
                    'sticky top-0 z-10 h-8 border-b border-line px-3 text-right text-12 font-medium whitespace-nowrap transition-colors',
                    colOn(c) ? 'bg-accent-bg text-text' : 'bg-surface-2 text-text-2',
                  )}
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.values.map((row, r) => (
            <tr key={r} className="even:bg-surface/40">
              <th
                scope="row"
                className={cn(
                  'sticky left-0 z-[1] h-8 border-b border-line px-3 text-left text-13 font-medium whitespace-nowrap transition-colors',
                  rowOn(r) ? 'bg-accent-bg text-text' : 'bg-bg text-text',
                )}
              >
                {table.rowLabels[r]}
              </th>
              {row.map((v, c) => {
                const peak = colPeaks?.[c]
                const isPeak = peak !== null && peak !== undefined && Number.isFinite(v) && Math.abs(v - peak) < 1e-12
                return (
                  <td
                    key={c}
                    onMouseEnter={() => setHover({ r, c })}
                    className={cn(
                      'num h-8 border-b border-line px-3 text-right font-mono whitespace-nowrap transition-colors',
                      rowOn(r) && colOn(c)
                        ? 'bg-accent-bg text-text'
                        : isPeak
                          ? 'bg-accent-bg/30 font-semibold text-text'
                          : 'text-text',
                    )}
                  >
                    {/* Above or below a border (MABAC's Q): a triangle in the area's colour, so the sign reads without colour too. */}
                    {signed && v !== 0 && (
                      <span aria-hidden data-sign={v > 0 ? 'up' : 'down'} className={cn('mr-1.5 text-12', v > 0 ? 'text-data-accent' : 'text-data-negative')}>
                        {v > 0 ? '▲' : '▼'}
                      </span>
                    )}
                    {format(v)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
