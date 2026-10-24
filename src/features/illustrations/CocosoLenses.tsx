import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { cocoso } from '../../core/methods/cocoso'
import { maxOf } from '../../core/math'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import s from './illustrations.module.css'

export type CocosoLensesLabels = {
  title: string
  /** Line under the figure while nothing is hovered or focused. */
  caption?: string | undefined
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Column heads: the three readings and the combined score ("ka", "kb", "kc", "k"). */
  heads: readonly [string, string, string, string]
  /** Accessible name of one row and the readout, from formatted numbers. */
  row: (alternative: string, ka: string, kb: string, kc: string, k: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const COCOSO_LENSES_LABELS_EN: CocosoLensesLabels = {
  title: 'Three readings, one score',
  showTable: 'Show as table',
  alternative: 'Alternative',
  heads: ['ka', 'kb', 'kc', 'k'],
  row: (a, ka, kb, kc, k) => `${a}: ka = ${ka}, kb = ${kb}, kc = ${kc}, k = ${k}`,
}

export type CocosoLensesProps = {
  problem: Problem
  weights: readonly number[]
  lambda: number
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<CocosoLensesLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. COCOSO_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture. While stepping the rows are inert (no hover, no focus target).
   */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the CoCoSo idea: 0 ka (the share of the total of S and P), 1 kb (against the weakest alternative),
 * 2 kc (against the best mix of S and P), 3 the combined k, which is the full picture. The picture holds the results
 * of S and P, not S and P themselves, so the story starts at the first reading.
 */
export const COCOSO_IDEA_STEPS = 4

const FONT = 13
const BAR = 14
const ROW = 26
const HEAD = 22
const STACK_BELOW = 420
const NAME_LINE = 20
const STACKED_ROW = NAME_LINE + BAR + 10
const GAP = 12
const defaultFormat = (v: number, d: number) => v.toFixed(d)

/**
 * CoCoSo as a picture: one row per alternative in rank order, four bar columns. The first three are the readings of
 * the same S and P (k_a share of the total, k_b against the weakest, k_c against the best λ-mix), each bar against its
 * column's largest value; the fourth is the combined k, the first in the accent. Where the three columns agree the
 * order is clear; where they disagree, k (dominated by k_b) settles it. Hover or focus a row (up / down) to read its
 * numbers. Static at first paint; new numbers move rows and bars at --dur-data.
 */
export function CocosoLenses({ problem, weights, lambda, format = defaultFormat, labels, step, explain = false, className }: CocosoLensesProps) {
  const l = { ...COCOSO_LENSES_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const [activeRow, setActive] = useState<number | null>(null)
  const [focusRow, setFocusRow] = useState(0)
  const res = useMemo(() => {
    try {
      return cocoso.compute(problem, [...weights], { lambda })
    } catch {
      return null
    }
  }, [problem, weights, lambda])
  if (!res) return null

  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), COCOSO_IDEA_STEPS - 1) : COCOSO_IDEA_STEPS - 1
  const active = stepping ? null : activeRow
  // A column the story has not reached yet: drawn at zero length, invisible.
  const off = (c: number) => (stage >= c ? undefined : '')

  const at = (key: string) => res.steps.find((x) => x.key === key)!.vector!
  const cols = [at('cocoso.ka'), at('cocoso.kb'), at('cocoso.kc'), res.scores]
  const names = problem.alternatives
  const m = names.length
  const order = names.map((_, i) => i).sort((a, b) => res.ranking[a]! - res.ranking[b]! || a - b)
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW
  const kText = res.scores.map((v) => format(v, 4))
  const valueWidth = Math.ceil(maxOf(kText.map((t) => estimateTextWidth(t, FONT)))) + 8
  const maxName = maxOf(names.map((n) => estimateTextWidth(n, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP, Math.max(W * 0.3, 64)))
  const colW = (W - labelWidth - valueWidth) / 4
  const barMax = colW - GAP
  const rowStep = stacked ? STACKED_ROW : ROW
  const barY = stacked ? NAME_LINE : (ROW - BAR) / 2
  const height = HEAD + m * rowStep
  const focus = Math.min(focusRow, m - 1)
  const f3 = (v: number) => format(v, 3)
  const rowName = (i: number) => l.row(names[i]!, f3(cols[0]![i]!), f3(cols[1]![i]!), f3(cols[2]![i]!), kText[i]!)

  const table: ChartTable = {
    corner: l.alternative,
    columns: [...l.heads],
    rows: order.map((i) => ({ label: names[i]!, cells: [f3(cols[0]![i]!), f3(cols[1]![i]!), f3(cols[2]![i]!), kText[i]!] })),
  }

  const move = (e: KeyboardEvent<SVGGElement>) => {
    if (stepping) return
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
        className={[s.svg, animate && s.animate, explain && s.explain].filter(Boolean).join(' ')}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="group"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-testid="cocoso-lenses"
      >
        <g aria-hidden>
          {l.heads.map((h, c) => (
            <text key={h} className={`${c === 3 ? s.sawName : s.marcosGhostName} ${s.stageItem}`} data-off={off(c)} x={labelWidth + c * colW} y={HEAD / 2} dominantBaseline="central">
              {h}
            </text>
          ))}
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)}>
          {order.map((i, row) => {
            const short = truncate(names[i]!, stacked ? W - valueWidth : labelWidth - GAP, FONT)
            const isBest = res.ranking[i] === 1
            return (
              <g
                key={i}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${HEAD + row * rowStep}px)` }}
                data-highlight={isBest || undefined}
                data-testid="cocoso-row"
                onMouseEnter={stepping ? undefined : () => setActive(row)}
              >
                <text className={s.sawName} x={0} y={stacked ? 8 : ROW / 2} dominantBaseline="central">
                  {short !== names[i] ? <title>{names[i]}</title> : null}
                  {short}
                </text>
                {cols.map((col, c) => (
                  <rect
                    key={c}
                    className={`${s.marcosBar} ${s.stageItem}`}
                    data-on={active === row || undefined}
                    data-off={off(c)}
                    data-highlight={(c === 3 && isBest) || undefined}
                    x={0}
                    y={barY}
                    width={1}
                    height={BAR}
                    style={{ transform: `translate(${labelWidth + c * colW}px, 0px) scale(${stage >= c ? Math.max((col[i]! / maxOf(col)) * barMax, 0.01) : 0.01}, 1)` }}
                    {...(c === 3
                      ? {
                          'data-row': row,
                          tabIndex: focus === row && !stepping ? 0 : -1,
                          role: 'img',
                          'aria-label': rowName(i),
                          onFocus: () => {
                            setFocusRow(row)
                            setActive(row)
                          },
                          onBlur: () => setActive(null),
                        }
                      : { 'aria-hidden': true })}
                  />
                ))}
                <text className={`${s.sawValue} ${s.stageItem}`} data-off={off(3)} x={W} y={barY + BAR / 2} dominantBaseline="central" textAnchor="end" data-testid="cocoso-k">
                  {kText[i]}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      {/* The focused row's own name says the same to a screen reader, so the readout is for the eyes only. */}
      <p className={s.readout}>
        {shown !== null ? (
          <span className={s.readoutC} aria-hidden>
            {rowName(shown)}
          </span>
        ) : (
          // Hidden, not removed, before the last step: the picture above keeps its place.
          <span className={stage >= COCOSO_IDEA_STEPS - 1 ? undefined : 'invisible'}>{l.caption ?? ' '}</span>
        )}
      </p>
    </ChartFigure>
  )
}
