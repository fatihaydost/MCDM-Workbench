import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { maxOf } from '../../core/math'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { coprasParts, stackSegments } from './geometry'
import s from './illustrations.module.css'

export type CoprasBonusLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Score column of the table: "Relative significance Q". */
  score: string
  /** Utility column of the table: "Utility degree N (%)". */
  utility: string
  /** Accessible name of the legend list: "Parts of Q". */
  legend: string
  /** The two parts of a bar: "Benefit share S+", "Cost bonus". */
  benefit: string
  bonus: string
  /** Accessible name of one segment, from formatted numbers. */
  segment: (alternative: string, part: string, value: string, score: string, utility: string) => string
  /** Readout under the bars for the hovered or focused segment. */
  readout: (alternative: string, part: string, value: string, score: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const COPRAS_BONUS_LABELS_EN: CoprasBonusLabels = {
  title: 'Benefit share plus cost bonus',
  showTable: 'Show as table',
  alternative: 'Alternative',
  score: 'Relative significance Q',
  utility: 'Utility degree N (%)',
  legend: 'Parts of Q',
  benefit: 'Benefit share S+',
  bonus: 'Cost bonus',
  segment: (a, p, v, sc, u) => `${a}, ${p}: ${v} (Q = ${sc}, N = ${u})`,
  readout: (a, p, v, sc) => `${a}: ${p} ${v} of Q = ${sc}`,
}

export type CoprasBonusProps = {
  problem: Problem
  weights: readonly number[]
  /** Q and its parts (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  /** N in percent (active locale, 2 decimals). */
  formatPercent?: ((value: number) => string) | undefined
  labels?: Partial<CoprasBonusLabels>
  className?: string | undefined
}

const FONT = 13
const BAR = 16
const ROW = 28
/** Below this width the name sits on its own line above the bar, so the bar keeps the full width. */
const STACK_BELOW = 380
const NAME_LINE = 21
const STACKED_ROW = NAME_LINE + BAR + 10
const GAP = 8
const VALUE_GAP = 6
const ZERO_WIDTH = 0.01
const defaultFormat = (v: number) => v.toFixed(4)
const defaultPercent = (v: number) => `${v.toFixed(2)} %`

/** Benefit share in --data-cat-1 (blue), cost bonus in --data-cat-5 (ochre): apart for every colour-vision type, and not red. */
const PART_COLOURS = ['1', '5'] as const

type Active = { row: number; col: number }

/**
 * COPRAS as a picture: one horizontal bar per alternative, in rank order, made of two parts: the benefit share S+_i
 * and the cost bonus W_C (1 / S-_i) / Σ (1 / S-_k), which grows as the cost share shrinks. The bar ends at Q_i, printed
 * after it; the utility degree N_i (percent of the best Q) closes the row on the right. The parts keep their colour
 * (--data-cat-1, --data-cat-5; legend below); hovering or focusing a segment names it in the readout and fades the
 * other part. Arrow keys move between segments (left / right: parts, up / down: alternatives). Static at first paint;
 * new numbers move rows and segments at --dur-data. Every number comes from the core's COPRAS steps.
 */
export function CoprasBonus({ problem, weights, format = defaultFormat, formatPercent = defaultPercent, labels, className }: CoprasBonusProps) {
  const l = { ...COPRAS_BONUS_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(() => coprasParts(problem, weights), [problem, weights])
  const [active, setActive] = useState<Active | null>(null)
  const [focusKey, setFocusKey] = useState<Active>({ row: 0, col: 0 })
  if (!parts) return null

  const { sPlus, bonus, scores, utility, order } = parts
  const m = problem.alternatives.length
  const names = problem.alternatives
  const partNames = [l.benefit, l.bonus]
  const values = (i: number) => [sPlus[i]!, bonus[i]!]
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW
  const texts = scores.map((v) => format(v))
  const percents = utility.map((v) => formatPercent(v))
  const valueWidth = Math.ceil(maxOf(texts.map((t) => estimateTextWidth(t, FONT)))) + VALUE_GAP + 2
  const percentWidth = Math.ceil(maxOf(percents.map((t) => estimateTextWidth(t, FONT)))) + GAP * 2
  const maxName = maxOf(names.map((a) => estimateTextWidth(a, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP * 2, Math.max(W * 0.32, 64)))
  const plotLeft = labelWidth
  const plotRight = Math.max(plotLeft + 1, W - valueWidth - percentWidth)
  const top = Math.max(maxOf(scores), 1e-12)
  const pxPerUnit = (plotRight - plotLeft) / top
  const rowStep = stacked ? STACKED_ROW : ROW
  const barY = stacked ? NAME_LINE : (ROW - BAR) / 2
  const height = m * rowStep
  const best = order[0]!
  const focus = { row: Math.min(focusKey.row, m - 1), col: focusKey.col }

  const table: ChartTable = {
    corner: l.alternative,
    columns: [...partNames, l.score, l.utility],
    rows: order.map((i) => ({ label: names[i]!, cells: [format(sPlus[i]!), format(bonus[i]!), texts[i]!, percents[i]!] })),
  }

  const move = (e: KeyboardEvent<SVGGElement>) => {
    const next = { ...focus }
    if (e.key === 'ArrowRight' || e.key === 'End') next.col = 1
    else if (e.key === 'ArrowLeft' || e.key === 'Home') next.col = 0
    else if (e.key === 'ArrowDown') next.row = Math.min(m - 1, focus.row + 1)
    else if (e.key === 'ArrowUp') next.row = Math.max(0, focus.row - 1)
    else if (e.key === 'Escape') {
      setActive(null)
      return
    } else return
    e.preventDefault()
    setFocusKey(next)
    setActive(next)
    e.currentTarget.querySelector<SVGElement>(`[data-row="${next.row}"][data-col="${next.col}"]`)?.focus()
  }

  const shown = active ? { i: order[active.row]!, j: active.col } : null

  return (
    <ChartFigure titleId={`${uid}-title`} tableId={`${uid}-table`} title={l.title} showTable={l.showTable} table={table} plotRef={plotRef} className={className}>
      <svg
        className={animate ? `${s.svg} ${s.animate}` : s.svg}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="group"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-testid="copras-bonus"
      >
        <g onKeyDown={move} onMouseLeave={() => setActive(null)} data-dimmed={active ? '' : undefined} className={s.sawPlot}>
          {order.map((i, row) => {
            const segs = stackSegments(values(i), plotLeft, pxPerUnit)
            const end = plotLeft + scores[i]! * pxPerUnit
            const name = names[i]!
            const short = truncate(name, stacked ? W - valueWidth - percentWidth : labelWidth - GAP, FONT)
            return (
              <g
                key={i}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${row * rowStep}px)` }}
                data-highlight={i === best || undefined}
                data-testid="copras-bar"
                data-score={scores[i]}
              >
                <text className={s.sawName} x={0} y={stacked ? 8 : ROW / 2} dominantBaseline="central">
                  {short !== name ? <title>{name}</title> : null}
                  {short}
                </text>
                {segs.map((g) => (
                  <rect
                    key={g.col}
                    className={s.sawSeg}
                    data-cat={PART_COLOURS[g.col]}
                    data-on={shown?.j === g.col || undefined}
                    data-row={row}
                    data-col={g.col}
                    data-value={g.value}
                    data-testid="copras-segment"
                    x={0}
                    y={barY}
                    width={1}
                    height={BAR}
                    // A zero part (no cost weight) keeps a hairline width, so its non-scaling focus ring still draws.
                    style={{ transform: `translate(${g.x}px, 0px) scale(${Math.max(g.width, ZERO_WIDTH)}, 1)` }}
                    tabIndex={focus.row === row && focus.col === g.col ? 0 : -1}
                    role="img"
                    aria-label={l.segment(name, partNames[g.col]!, format(g.value), texts[i]!, percents[i]!)}
                    onMouseEnter={() => setActive({ row, col: g.col })}
                    onFocus={() => {
                      setFocusKey({ row, col: g.col })
                      setActive({ row, col: g.col })
                    }}
                    onBlur={() => setActive(null)}
                  />
                ))}
                <rect className={s.sawGap} x={-1} y={barY} width={2} height={BAR} style={{ transform: `translate(${segs[1]!.x}px, 0px)` }} aria-hidden />
                <text className={s.sawValue} x={0} y={barY + BAR / 2} dominantBaseline="central" style={{ transform: `translate(${end + VALUE_GAP}px, 0px)` }}>
                  {texts[i]}
                </text>
                <text className={s.sawValue} x={W} y={barY + BAR / 2} dominantBaseline="central" textAnchor="end" data-testid="copras-utility">
                  {percents[i]}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      {/* The focused segment's own name says the same to a screen reader, so the readout is for the eyes only. */}
      <p className={s.readout}>
        {shown ? (
          <span className={s.readoutC} aria-hidden>
            {l.readout(names[shown.i]!, partNames[shown.j]!, format(values(shown.i)[shown.j]!), texts[shown.i]!)}
          </span>
        ) : (
          <span>{l.caption ?? ' '}</span>
        )}
      </p>
      <ul className={s.sawLegend} aria-label={l.legend}>
        {partNames.map((p, j) => (
          <li key={j} className={s.sawLegendItem} data-on={shown?.j === j || undefined}>
            <svg width={12} height={12} aria-hidden className={s.sawSwatch}>
              <rect className={s.sawSeg} data-cat={PART_COLOURS[j]} width={12} height={12} />
            </svg>
            {p}
          </li>
        ))}
      </ul>
    </ChartFigure>
  )
}
