import { CaretDown, Check, Copy, Info } from '@phosphor-icons/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isStepKey, stepContent } from '../../content/steps'
import type { Step } from '../../core'
import { CRITIC_FLOW, ENTROPY_FLOW, ENTROPY_MINMAX_FLOW, StepFlow, TOPSIS_FLOW, type FlowNode } from '../../features/illustrations'
import { stepToTable, tableToLatex, tableToTsv, type StepTable } from '../../features/io'
import { useNumberFormat } from '../../i18n'
import type { DraftProblem } from '../../state/workbench'
import { Button, cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, IconButton, Tooltip } from '../../ui'
// Direct import, not the barrel: KaTeX must stay out of the main chunk.
import { Formula } from '../../ui/Formula'
import type { CalcGroup } from './parts'
import { DECIMALS, stepAxisLabels, stepName, tr } from './shared'

/** Row label of a vector or scalar step in the table and in TSV (plain text). */
const PLAIN_SYMBOL: Readonly<Record<string, string>> = {
  'critic.sigma': 'σ',
  'critic.conflict': 'Σ(1 − ρ)',
  'critic.information': 'C',
  'critic.informationTotal': 'ΣC',
  'critic.weights': 'w',
  'entropy.entropy': 'e',
  'entropy.diversification': 'd',
  'entropy.weights': 'w',
  'topsis.idealBest': 'A+',
  'topsis.idealWorst': 'A−',
  'topsis.distanceBest': 'D+',
  'topsis.distanceWorst': 'D−',
  'topsis.closeness': 'C',
  'equal.weights': 'w',
  'manual.weights': 'w',
}

/** The same labels in TeX math for the LaTeX copy (pdfLaTeX has no σ in text mode). */
const TEX_SYMBOL: Readonly<Record<string, string>> = {
  'critic.sigma': String.raw`$\sigma_j$`,
  'critic.conflict': String.raw`$\sum_k (1 - \rho_{jk})$`,
  'critic.information': '$C_j$',
  'critic.informationTotal': String.raw`$\sum_k C_k$`,
  'critic.weights': '$w_j$',
  'entropy.entropy': '$e_j$',
  'entropy.diversification': '$d_j$',
  'entropy.weights': '$w_j$',
  'topsis.idealBest': '$A^{+}_j$',
  'topsis.idealWorst': '$A^{-}_j$',
  'topsis.distanceBest': '$D^{+}_i$',
  'topsis.distanceWorst': '$D^{-}_i$',
  'topsis.closeness': '$C_i$',
  'equal.weights': '$w_j$',
  'manual.weights': '$w_j$',
}

/** Steps the workbench adds itself (src/state/workbench.ts); their text lives in i18n steps.*. */
const LOCAL_TEX: Readonly<Record<string, string>> = {
  'equal.weights': String.raw`w_j = \frac{1}{n}, \qquad j = 1, \dots, n`,
  'manual.weights': String.raw`w_j \ge 0, \qquad \sum_{j=1}^{n} w_j = 1`,
}

const PLACEHOLDER = 'KDSSYMBOLPLACEHOLDER'

type Copied = 'tsv' | 'latex' | 'failed' | null

export type WorkedCalculationProps = {
  groups: readonly CalcGroup[]
  problem: DraftProblem
  /** Heading level of each step title; group titles use the level above. Default h3. */
  headingLevel?: 'h3' | 'h4' | undefined
}

/**
 * The signature element (DESIGN.md §Signature element): every step of a result as a block with a
 * one-line description, its formula, the labelled matrix or vector and copy as TSV or LaTeX.
 * The focused (or last clicked) step carries the accent on its hairline and number.
 */
const FLOWS: readonly (readonly FlowNode[])[] = [CRITIC_FLOW, ENTROPY_FLOW, ENTROPY_MINMAX_FLOW, TOPSIS_FLOW]

/** The step map for a group of steps (by its first node's key, so each Entropy variant gets its own), or null. */
const flowFor = (steps: readonly Step[]) => FLOWS.find((f) => steps.some((s) => s.key === f[0]!.key)) ?? null

const stepDomId = (key: string) => `wb-step-${key.replace(/\./g, '-')}`

export default function WorkedCalculation({ groups, problem, headingLevel = 'h3' }: WorkedCalculationProps) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(0)
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
    const i = keys.indexOf(key)
    if (i < 0) return
    setCurrent(i)
    const target = document.getElementById(stepDomId(key))
    target?.scrollIntoView({ block: 'start' })
    target?.focus({ preventScroll: true })
  }

  let n = 0
  return (
    <div ref={root} className="flex flex-col gap-10">
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
                    heading={headingLevel}
                    name={stepName(step.key, t)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
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
  heading: 'h3' | 'h4'
  name: string
}

function StepBlock({ step, number, index, domId, current, onCurrent, labels, heading: H, name }: StepBlockProps) {
  const { t, i18n } = useTranslation()
  const nf = useNumberFormat(DECIMALS.step)
  const lang = nf.lang
  const titleId = useId()
  const [copied, setCopied] = useState<Copied>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const table = useMemo(
    () => stepToTable(step, labels, { valueLabel: PLAIN_SYMBOL[step.key] ?? name }),
    [step, labels, name],
  )

  const content = isStepKey(step.key) ? stepContent[step.key] : null
  const description = content ? content[lang] : i18n.exists(`steps.${step.key}`) ? tr(t, `steps.${step.key}`) : ''
  const tex = content?.tex ?? LOCAL_TEX[step.key] ?? ''
  const edgeCase = content?.edgeCase?.[lang]

  const copy = async (format: 'tsv' | 'latex') => {
    let text: string
    if (format === 'tsv') {
      // Full precision, in the separator the user's spreadsheet expects.
      text = tableToTsv(table, { decimal: lang === 'tr' ? ',' : '.' })
    } else {
      const withPlaceholder = stepToTable(step, labels, { valueLabel: PLACEHOLDER })
      const symbol = TEX_SYMBOL[step.key]
      const body = tableToLatex(withPlaceholder, { digits: DECIMALS.step })
      text = `% ${name}\n${symbol ? body.replace(PLACEHOLDER, symbol) : body.replace(PLACEHOLDER, name)}`
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
        <StepTableView table={table} format={(v) => nf.format(v)} label={t('workbench.calc.tableLabel', { n: number, name })} />
      </div>

      {copied === 'failed' && <p className="text-13 text-danger sm:pl-8">{t('workbench.calc.copyFailed')}</p>}
      <span aria-live="polite" className="sr-only">
        {live}
      </span>
    </section>
  )
}

type Hover = { r: number; c: number } | null

/**
 * Labelled matrix, vector or scalar in Plex Mono with fixed decimals. Hovering a cell tints its
 * row and column labels. Wide or tall tables scroll inside their own box, never the page.
 */
function StepTableView({ table, format, label }: { table: StepTable; format: (v: number) => string; label: string }) {
  const [hover, setHover] = useState<Hover>(null)

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
    <div role="region" aria-label={label} tabIndex={0} className="max-h-[420px] max-w-full overflow-auto rounded-control">
      <table className="border-separate border-spacing-0 text-13" onMouseLeave={() => setHover(null)}>
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
            <tr key={r}>
              <th
                scope="row"
                className={cn(
                  'sticky left-0 z-[1] h-8 border-b border-line px-3 text-left text-13 font-medium whitespace-nowrap transition-colors',
                  rowOn(r) ? 'bg-accent-bg text-text' : 'bg-bg text-text',
                )}
              >
                {table.rowLabels[r]}
              </th>
              {row.map((v, c) => (
                <td
                  key={c}
                  onMouseEnter={() => setHover({ r, c })}
                  className={cn(
                    'num h-8 border-b border-line px-3 text-right font-mono whitespace-nowrap text-text transition-colors',
                    rowOn(r) && colOn(c) && 'bg-accent-bg',
                  )}
                >
                  {format(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
