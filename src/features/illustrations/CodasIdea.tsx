import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { CODAS_DEFAULT_TAU, codas } from '../../core/methods/codas'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import s from './illustrations.module.css'
import b from './mabac.module.css'

export type CodasParts = {
  euclidean: number[]
  taxicab: number[]
  scores: number[]
  order: number[]
}

/** CODAS numbers for the pictures, or null when the core cannot rank this problem. */
export function codasParts(problem: Problem, weights: readonly number[], tau: number = CODAS_DEFAULT_TAU): CodasParts | null {
  let res
  try {
    res = codas.compute(problem, [...weights], { tau })
  } catch {
    return null
  }
  const euclidean = res.steps.find((x) => x.key === 'codas.euclidean')!.vector!
  const taxicab = res.steps.find((x) => x.key === 'codas.taxicab')!.vector!
  const order = res.scores.map((_, i) => i).sort((x, y) => res.ranking[x]! - res.ranking[y]! || x - y)
  return { euclidean, taxicab, scores: res.scores, order }
}

const defaultFormat = (v: number, d: number) => v.toFixed(d)
const signed = (format: (v: number, d: number) => string, v: number, d: number) => (v > 0 ? `+${format(v, d)}` : format(v, d))
const sign = (v: number) => (v > 0 ? 'up' : v < 0 ? 'down' : undefined)

export type CodasIdeaLabels = {
  title: string
  caption?: string | undefined
  showTable: string
  alternative: string
  euclidean: string
  taxicab: string
  score: string
  row: (alternative: string, e: string, t: string, score: string) => string
}

export const CODAS_IDEA_LABELS_EN: CodasIdeaLabels = {
  title: 'Euclidean and Taxicab distances from the negative-ideal point',
  showTable: 'Show as table',
  alternative: 'Alternative',
  euclidean: 'E',
  taxicab: 'T',
  score: 'H',
  row: (a, e, t, sc) => `${a}: E = ${e}, T = ${t}, H = ${sc}`,
}

export type CodasIdeaProps = {
  problem: Problem
  weights: readonly number[]
  tau?: number | undefined
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<CodasIdeaLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. CODAS_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture.
   */
  step?: number | null | undefined
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The 3 steps of the CODAS idea:
 * 0: Euclidean distance E_i from the negative-ideal point ns.
 * 1: Taxicab distance T_i from ns (added into h_ik when |E_i - E_k| >= tau).
 * 2: Assessment score H_i = sum_k h_ik around zero.
 */
export const CODAS_IDEA_STEPS = 3

const FONT = 13
const HEAD = 22
const ROW = 38
const NAME_LINE = 20
const STACK_BELOW = 380
const GAP = 8

export function CodasIdea({
  problem,
  weights,
  tau = CODAS_DEFAULT_TAU,
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: CodasIdeaProps) {
  const l = { ...CODAS_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(() => codasParts(problem, weights, tau), [problem, weights, tau])
  const [activeRow, setActive] = useState<number | null>(null)
  const [focusRow, setFocusRow] = useState(0)
  if (!parts) return null

  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), CODAS_IDEA_STEPS - 1) : CODAS_IDEA_STEPS - 1
  const active = stepping ? null : activeRow
  const taxicabOff = stage >= 1 ? undefined : ''
  const scoreOff = stage >= 2 ? undefined : ''

  const { euclidean, taxicab, scores, order } = parts
  const names = problem.alternatives
  const m = names.length
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW

  const eTexts = euclidean.map((v) => format(v, 4))
  const tTexts = taxicab.map((v) => format(v, 4))
  const sTexts = scores.map((v) => signed(format, v, 4))
  const rowText = (i: number) => l.row(names[i]!, eTexts[i]!, tTexts[i]!, sTexts[i]!)

  const valueWidth = Math.ceil(Math.max(...sTexts.map((t) => estimateTextWidth(t, FONT)))) + GAP
  const scoreWidth = Math.round(Math.min(150, Math.max(64, W * 0.24)))
  const maxName = Math.max(...names.map((x) => estimateTextWidth(x, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP * 2, Math.max(W * 0.24, 56)))

  const distLeft = labelWidth
  const distRight = Math.max(distLeft + 40, W - valueWidth - scoreWidth - GAP * 3)
  const maxDist = Math.max(...euclidean, ...taxicab, 1e-12)
  const unitDist = (distRight - distLeft) / maxDist

  const sLeft = distRight + GAP * 3
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
    columns: [l.euclidean, l.taxicab, l.score],
    rows: order.map((i) => ({ label: names[i]!, cells: [eTexts[i]!, tTexts[i]!, sTexts[i]!] })),
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
        data-testid="codas-idea"
      >
        <g aria-hidden>
          <text className={b.head} x={distLeft} y={HEAD / 2} textAnchor="start" dominantBaseline="central">
            { `${l.euclidean} / ${l.taxicab} →` }
          </text>
          <line className={b.zero} x1={distLeft} x2={distLeft} y1={HEAD} y2={height} />
          <text className={`${b.head} ${s.stageItem}`} data-off={scoreOff} x={zero} y={HEAD / 2} textAnchor="middle" dominantBaseline="central">
            {l.score}
          </text>
          <line className={`${b.zero} ${s.stageItem}`} data-off={scoreOff} x1={zero} x2={zero} y1={HEAD} y2={height} />
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)}>
          {order.map((i, row) => {
            const short = truncate(names[i]!, stacked ? W : labelWidth - GAP, FONT)
            const eLen = Math.max(euclidean[i]! * unitDist, 0.001)
            const tLen = Math.max((stage >= 1 ? taxicab[i]! * unitDist : 0), 0.001)
            const end = scores[i]! * unitS
            return (
              <g
                key={i}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${HEAD + row * rowStep}px)` }}
                data-highlight={row === 0 || undefined}
                data-testid="codas-row"
              >
                <text className={s.sawName} x={0} y={stacked ? NAME_LINE / 2 : mid} dominantBaseline="central">
                  {short !== names[i] ? <title>{names[i]}</title> : null}
                  {short}
                </text>
                {/* Euclidean distance bar E_i (top bar) */}
                <rect
                  className={b.score}
                  data-sign="up"
                  x={distLeft}
                  y={mid - 8}
                  width={eLen}
                  height={6}
                  aria-hidden
                />
                {/* Taxicab distance bar T_i (bottom bar, lighter) */}
                <rect
                  className={`${b.stick} ${s.stageItem}`}
                  data-sign="up"
                  data-off={taxicabOff}
                  x={distLeft}
                  y={mid + 2}
                  width={tLen}
                  height={5}
                  opacity={0.55}
                  aria-hidden
                />
                {/* Assessment score bar H_i from zero */}
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
                <text className={`${s.sawValue} ${s.stageItem}`} data-off={scoreOff} x={W} y={mid} textAnchor="end" dominantBaseline="central" data-testid="codas-h">
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
