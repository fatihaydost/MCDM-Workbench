import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { prometheeII, type PrometheeCriterionFunction, type PrometheePreferenceFunction } from '../../core/methods/promethee-ii'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import s from './illustrations.module.css'
import b from './mabac.module.css'

export type PrometheeParts = {
  positiveFlow: number[]
  negativeFlow: number[]
  scores: number[]
  ranking: number[]
  order: number[]
}

/** PROMETHEE II flows for the pictures, or null when the core cannot rank this problem. */
export function prometheeParts(
  problem: Problem,
  weights: readonly number[],
  preferenceFunction: PrometheePreferenceFunction = 'v-shape',
  criteriaFunctions?: readonly PrometheeCriterionFunction[],
): PrometheeParts | null {
  let res
  try {
    res = prometheeII.compute(problem, [...weights], {
      preferenceFunction,
      ...(criteriaFunctions !== undefined ? { criteriaFunctions } : {}),
    })
  } catch {
    return null
  }
  const positiveFlow = res.steps.find((x) => x.key === 'promethee-ii.positiveFlow')!.vector!
  const negativeFlow = res.steps.find((x) => x.key === 'promethee-ii.negativeFlow')!.vector!
  const order = res.scores.map((_, i) => i).sort((x, y) => res.ranking[x]! - res.ranking[y]! || x - y)
  return { positiveFlow, negativeFlow, scores: res.scores, ranking: res.ranking, order }
}

const defaultFormat = (v: number, d: number) => v.toFixed(d)
const signed = (format: (v: number, d: number) => string, v: number, d: number) => (v > 0 ? `+${format(v, d)}` : format(v, d))
const sign = (v: number) => (v > 0 ? 'up' : v < 0 ? 'down' : undefined)

export type PrometheeIdeaLabels = {
  title: string
  caption?: string | undefined
  showTable: string
  alternative: string
  positiveFlow: string
  negativeFlow: string
  score: string
  row: (alternative: string, pos: string, neg: string, score: string) => string
}

export const PROMETHEE_IDEA_LABELS_EN: PrometheeIdeaLabels = {
  title: 'Leaving and entering outranking flows and net flow',
  showTable: 'Show as table',
  alternative: 'Alternative',
  positiveFlow: 'φ⁺',
  negativeFlow: 'φ⁻',
  score: 'φ',
  row: (a, pos, neg, sc) => `${a}: φ⁺ = ${pos}, φ⁻ = ${neg}, φ = ${sc}`,
}

export type PrometheeIdeaProps = {
  problem: Problem
  weights: readonly number[]
  preferenceFunction?: PrometheePreferenceFunction | undefined
  criteriaFunctions?: readonly PrometheeCriterionFunction[] | undefined
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<PrometheeIdeaLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. PROMETHEE_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture.
   */
  step?: number | null | undefined
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The 3 steps of the PROMETHEE II idea:
 * 0: Leaving (positive) flow φ⁺(a) measuring how strongly a outranks all other alternatives.
 * 1: Entering (negative) flow φ⁻(a) measuring how strongly all other alternatives outrank a.
 * 2: Net outranking flow φ(a) = φ⁺(a) - φ⁻(a) around zero.
 */
export const PROMETHEE_IDEA_STEPS = 3

const FONT = 13
const HEAD = 22
const ROW = 38
const NAME_LINE = 20
const STACK_BELOW = 380
const GAP = 8

export function PrometheeIdea({
  problem,
  weights,
  preferenceFunction = 'v-shape',
  criteriaFunctions,
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: PrometheeIdeaProps) {
  const l = { ...PROMETHEE_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(
    () => prometheeParts(problem, weights, preferenceFunction, criteriaFunctions),
    [problem, weights, preferenceFunction, criteriaFunctions],
  )
  const [activeRow, setActive] = useState<number | null>(null)
  const [focusRow, setFocusRow] = useState(0)
  if (!parts) return null

  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), PROMETHEE_IDEA_STEPS - 1) : PROMETHEE_IDEA_STEPS - 1
  const active = stepping ? null : activeRow
  const negOff = stage >= 1 ? undefined : ''
  const scoreOff = stage >= 2 ? undefined : ''

  const { positiveFlow, negativeFlow, scores, ranking, order } = parts
  const names = problem.alternatives
  const m = names.length
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW

  const pTexts = positiveFlow.map((v) => format(v, 4))
  const nTexts = negativeFlow.map((v) => format(v, 4))
  const sTexts = scores.map((v) => signed(format, v, 4))
  const rowText = (i: number) => l.row(names[i]!, pTexts[i]!, nTexts[i]!, sTexts[i]!)

  const valueWidth = Math.ceil(Math.max(...sTexts.map((t) => estimateTextWidth(t, FONT)))) + GAP
  const scoreWidth = Math.round(Math.min(150, Math.max(64, W * 0.24)))
  const maxName = Math.max(...names.map((x) => estimateTextWidth(x, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP * 2, Math.max(W * 0.24, 56)))

  const flowLeft = labelWidth
  const flowRight = Math.max(flowLeft + 40, W - valueWidth - scoreWidth - GAP * 3)
  const maxFlow = Math.max(...positiveFlow, ...negativeFlow, 1e-12)
  const unitFlow = (flowRight - flowLeft) / maxFlow

  const sLeft = flowRight + GAP * 3
  const neg = Math.max(-Math.min(...scores), 0)
  const pos = Math.max(Math.max(...scores), 0)
  const unitS = scoreWidth / Math.max(neg + pos, 1e-12)
  const zero = sLeft + (neg + pos > 0 ? neg * unitS : scoreWidth / 2)

  const rowStep = stacked ? NAME_LINE + ROW : ROW
  const mid = (stacked ? NAME_LINE : 0) + ROW / 2
  const height = HEAD + m * rowStep
  const focus = Math.min(focusRow, m - 1)

  const table: ChartTable = {
    corner: l.alternative,
    columns: [l.positiveFlow, l.negativeFlow, l.score],
    rows: order.map((i) => ({ label: names[i]!, cells: [pTexts[i]!, nTexts[i]!, sTexts[i]!] })),
  }

  const move = (e: KeyboardEvent<SVGGElement>) => {
    let next = focus
    if (e.key === 'ArrowDown') next = Math.min(m - 1, focus + 1)
    else if (e.key === 'ArrowUp') next = Math.max(0, focus - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = m - 1
    else if (e.key === 'Escape') {
      setActive(null)
      return
    } else return
    e.preventDefault()
    setFocusRow(next)
    setActive(next)
    e.currentTarget.querySelector<SVGElement>(`[data-row="${next}"]`)?.focus()
  }

  const shown = active === null ? null : order[active]!

  return (
    <ChartFigure titleId={`${uid}-title`} tableId={`${uid}-table`} title={l.title} showTable={l.showTable} table={table} plotRef={plotRef} className={className}>
      <svg
        className={[s.svg, animate && `${s.animate} ${b.animate}`, explain && `${s.explain} ${b.explain}`].filter(Boolean).join(' ')}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="group"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-testid="promethee-ii-idea"
      >
        <g aria-hidden>
          <text className={b.head} x={flowLeft} y={HEAD / 2} textAnchor="start" dominantBaseline="central">
            {`${l.positiveFlow} / ${l.negativeFlow} →`}
          </text>
          <line className={b.zero} x1={flowLeft} x2={flowLeft} y1={HEAD} y2={height} />
          <text className={`${b.head} ${s.stageItem}`} data-off={scoreOff} x={zero} y={HEAD / 2} textAnchor="middle" dominantBaseline="central">
            {l.score}
          </text>
          <line className={`${b.zero} ${s.stageItem}`} data-off={scoreOff} x1={zero} x2={zero} y1={HEAD} y2={height} />
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)}>
          {order.map((i, row) => {
            const short = truncate(names[i]!, stacked ? W : labelWidth - GAP, FONT)
            const pLen = Math.max(positiveFlow[i]! * unitFlow, 0.001)
            const nLen = Math.max((stage >= 1 ? negativeFlow[i]! * unitFlow : 0), 0.001)
            const end = scores[i]! * unitS
            return (
              <g
                key={i}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${HEAD + row * rowStep}px)` }}
                data-highlight={ranking[i] === 1 || undefined}
                data-testid="promethee-ii-row"
              >
                <text className={s.sawName} x={0} y={stacked ? NAME_LINE / 2 : mid} dominantBaseline="central">
                  {short !== names[i] ? <title>{names[i]}</title> : null}
                  {short}
                </text>
                {/* Leaving flow bar φ⁺ (top bar) */}
                <rect
                  className={b.score}
                  data-sign="up"
                  x={flowLeft}
                  y={mid - 8}
                  width={pLen}
                  height={6}
                  aria-hidden
                />
                {/* Entering flow bar φ⁻ (bottom bar) */}
                <rect
                  className={`${b.stick} ${s.stageItem}`}
                  data-sign="down"
                  data-off={negOff}
                  x={flowLeft}
                  y={mid + 2}
                  width={nLen}
                  height={5}
                  opacity={0.65}
                  aria-hidden
                />
                {/* Net flow bar φ from zero */}
                <rect
                  className={b.score}
                  data-sign={sign(scores[i]!)}
                  data-off={scoreOff}
                  x={0}
                  y={mid - 7}
                  width={1}
                  height={14}
                  style={{ transform: `translate(${zero}px, 0px) scale(${(stage >= 2 && end) || 0.001}, 1)` }}
                  aria-hidden
                />
                <text className={`${s.sawValue} ${s.stageItem}`} data-off={scoreOff} x={W} y={mid} textAnchor="end" dominantBaseline="central" data-testid="promethee-ii-phi">
                  {sTexts[i]}
                </text>
                <rect
                  className={b.hit}
                  data-on={active === row || undefined}
                  data-row={row}
                  x={0}
                  y={stacked ? 0 : 1}
                  width={W}
                  height={rowStep - 2}
                  rx={2}
                  tabIndex={stepping ? undefined : row === focus ? 0 : -1}
                  role={stepping ? undefined : 'img'}
                  aria-label={stepping ? undefined : rowText(i)}
                  onMouseEnter={stepping ? undefined : () => setActive(row)}
                  onFocus={
                    stepping
                      ? undefined
                      : () => {
                          setFocusRow(row)
                          setActive(row)
                        }
                  }
                  onBlur={stepping ? undefined : () => setActive(null)}
                />
              </g>
            )
          })}
        </g>
      </svg>
      {(shown !== null || l.caption) && (
        <p className={s.caption} aria-live="polite">
          {shown !== null ? rowText(shown) : l.caption}
        </p>
      )}
    </ChartFigure>
  )
}
