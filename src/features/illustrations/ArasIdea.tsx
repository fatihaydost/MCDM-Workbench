import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { maxOf } from '../../core/math'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { arasParts } from './geometry'
import s from './illustrations.module.css'

export type ArasOptimalBarLabels = {
  title: string
  /** Line under the figure while nothing is hovered or focused. */
  caption?: string | undefined
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Name of the optimal benchmark row at the top: "Optimal A₀". */
  optimal: string
  /** Table columns: "Optimality S", "Utility degree K". */
  total: string
  score: string
  /** Accessible name of one alternative's bar, from formatted numbers. */
  bar: (alternative: string, total: string, optimalTotal: string, score: string) => string
  /** Readout for the hovered or focused bar. */
  readout: (alternative: string, total: string, optimalTotal: string, score: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const ARAS_OPTIMAL_BAR_LABELS_EN: ArasOptimalBarLabels = {
  title: 'One optimal row to measure against',
  showTable: 'Show as table',
  alternative: 'Alternative',
  optimal: 'Optimal A₀',
  total: 'Optimality S',
  score: 'Utility degree K',
  bar: (a, si, s0, k) => `${a}: S = ${si}, S₀ = ${s0}, K = ${k}`,
  readout: (a, si, s0, k) => `${a}: S = ${si} of S₀ = ${s0}, K = S / S₀ = ${k}`,
}

export type ArasOptimalBarProps = {
  problem: Problem
  weights: readonly number[]
  /** S, S₀ and K in the active locale with the given decimals. */
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<ArasOptimalBarLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. ARAS_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture.
   */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the ARAS idea:
 * 0 = the weighted totals S of the alternatives on one scale,
 * 1 = the optimal row A₀ and its vertical guide S₀ appear,
 * 2 = each bar is read as a share of S₀: K = S / S₀ closes each row.
 */
export const ARAS_IDEA_STEPS = 3

const FONT = 13
const BAR = 16
const ROW = 28
const STACK_BELOW = 380
const NAME_LINE = 21
const STACKED_ROW = NAME_LINE + BAR + 10
const GAP = 8
const VALUE_GAP = 6
const defaultFormat = (v: number, d: number) => v.toFixed(d)

/**
 * ARAS as a picture: the table grows an optimal row A₀ (the best value of every criterion) on top, drawn dashed at S₀
 * with a vertical dotted guide through every row. Every bar is an alternative's optimality function S_i on the same
 * scale, so K_i = S_i / S₀ (what share of the optimal total it reaches) is literally the bar's length against the S₀
 * guide. Alternatives in rank order, the first in the accent; K closes each row on the right. Hover or focus a bar
 * (up / down) to read its S, S₀ and K.
 */
export function ArasOptimalBar({
  problem,
  weights,
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: ArasOptimalBarProps) {
  const l = { ...ARAS_OPTIMAL_BAR_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(() => arasParts(problem, weights), [problem, weights])
  const [active, setActive] = useState<number | null>(null)
  const [focusRow, setFocusRow] = useState(0)
  if (!parts) return null

  const { optimalScore, optimality: totals, scores, order } = parts
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), ARAS_IDEA_STEPS - 1) : ARAS_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')
  const names = problem.alternatives
  const m = names.length
  const f4 = (v: number) => format(v, 4)

  // Rows top to bottom: the optimal row A₀, then the alternatives in rank order.
  const rows = [
    { key: 'opt', name: l.optimal, total: optimalScore, ghost: true, i: -1 },
    ...order.map((i) => ({ key: `a${i}`, name: names[i]!, total: totals[i]!, ghost: false, i })),
  ]
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW
  const texts = rows.map((r) => f4(r.total))
  const right = scores.map((v) => f4(v))
  const valueWidth = Math.ceil(maxOf(texts.map((t) => estimateTextWidth(t, FONT)))) + VALUE_GAP + 2
  const rightWidth = Math.ceil(maxOf(right.map((t) => estimateTextWidth(t, FONT)))) + GAP * 2
  const maxName = maxOf(rows.map((r) => estimateTextWidth(r.name, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP * 2, Math.max(W * 0.34, 64)))
  const plotLeft = labelWidth
  const plotRight = Math.max(plotLeft + 1, W - valueWidth - rightWidth)
  const pxPerUnit = (plotRight - plotLeft) / Math.max(optimalScore, maxOf(totals), 1e-12)
  const rowStep = stacked ? STACKED_ROW : ROW
  const barY = stacked ? NAME_LINE : (ROW - BAR) / 2
  const height = rows.length * rowStep
  const focus = Math.min(focusRow, m - 1)
  const xOpt = plotLeft + optimalScore * pxPerUnit
  const s0Text = f4(optimalScore)

  const table: ChartTable = {
    corner: l.alternative,
    columns: [l.total, l.score],
    rows: rows.map((r, k) => ({
      label: r.name,
      cells: r.ghost ? [texts[k]!, f4(1)] : [texts[k]!, right[r.i]!],
    })),
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

  const activeRow = stepping ? null : active
  const shown = activeRow === null ? null : order[activeRow]!

  return (
    <ChartFigure
      titleId={`${uid}-title`}
      tableId={`${uid}-table`}
      title={l.title}
      showTable={l.showTable}
      table={table}
      plotRef={plotRef}
      className={className}
    >
      <svg
        className={[s.svg, animate && s.animate, explain && s.explain].filter(Boolean).join(' ')}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="group"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-testid="aras-rows"
      >
        {/* The optimal total S₀ as a vertical guide through every row: K = S / S₀ is each bar's length against it. */}
        <g aria-hidden>
          <line
            className={`${s.marcosGuide} ${s.stageItem}`}
            data-off={off(1)}
            x1={0}
            x2={0}
            y1={barY}
            y2={height - rowStep + barY + BAR}
            style={{ transform: `translate(${xOpt}px, 0px)` }}
          />
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)}>
          {rows.map((r, k) => {
            const row = k - 1
            const short = truncate(r.name, stacked ? W - valueWidth - rightWidth : labelWidth - GAP, FONT)
            const end = plotLeft + r.total * pxPerUnit
            const isBest = !r.ghost && parts.result.ranking[r.i] === 1 && stage >= 2
            return (
              <g
                key={r.key}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${k * rowStep}px)` }}
                data-highlight={isBest || undefined}
                data-ghost={r.ghost || undefined}
                data-testid={r.ghost ? 'aras-optimal' : 'aras-bar'}
              >
                <text
                  className={r.ghost ? `${s.marcosGhostName} ${s.stageItem}` : s.sawName}
                  data-off={r.ghost ? off(1) : undefined}
                  x={0}
                  y={stacked ? 8 : ROW / 2}
                  dominantBaseline="central"
                >
                  {short !== r.name ? <title>{r.name}</title> : null}
                  {short}
                </text>
                {r.ghost ? (
                  <rect
                    className={`${s.marcosGhost} ${s.stageItem}`}
                    data-off={off(1)}
                    x={plotLeft}
                    y={barY + 0.5}
                    width={Math.max(0, end - plotLeft)}
                    height={BAR - 1}
                    aria-hidden
                  />
                ) : (
                  <rect
                    className={s.marcosBar}
                    data-on={activeRow === row || undefined}
                    data-highlight={isBest || undefined}
                    data-row={row}
                    x={0}
                    y={barY}
                    width={1}
                    height={BAR}
                    style={{ transform: `translate(${plotLeft}px, 0px) scale(${Math.max(end - plotLeft, 0.01)}, 1)` }}
                    tabIndex={!stepping && focus === row ? 0 : -1}
                    role="img"
                    aria-label={l.bar(r.name, texts[k]!, s0Text, right[r.i]!)}
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
                )}
                <text
                  className={r.ghost ? `${s.sawValue} ${s.stageItem}` : s.sawValue}
                  data-off={r.ghost ? off(1) : undefined}
                  x={0}
                  y={barY + BAR / 2}
                  dominantBaseline="central"
                  style={{ transform: `translate(${end + VALUE_GAP}px, 0px)` }}
                >
                  {texts[k]}
                </text>
                {!r.ghost && (
                  <text
                    className={`${s.sawValue} ${s.stageItem}`}
                    data-off={off(2)}
                    x={W}
                    y={barY + BAR / 2}
                    dominantBaseline="central"
                    textAnchor="end"
                    data-testid="aras-utility"
                  >
                    {right[r.i]}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
      <p className={s.readout}>
        {shown !== null ? (
          <span className={s.readoutC} aria-hidden>
            {l.readout(names[shown]!, f4(totals[shown]!), s0Text, right[shown]!)}
          </span>
        ) : (
          <span className={stage >= 2 ? undefined : 'invisible'}>{l.caption ?? ' '}</span>
        )}
      </p>
    </ChartFigure>
  )
}
