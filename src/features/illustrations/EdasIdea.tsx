import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { maxOf } from '../../core/math'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { divergingSegments, edasParts } from './geometry'
import s from './illustrations.module.css'
import { SAW_CATEGORY_COLOURS } from './SawContributions'

export type EdasIdeaLabels = {
  title: string
  /** Line under the figure while nothing is hovered or focused. */
  caption?: string | undefined
  /** Head of the right side: "Above average: SP". */
  above: string
  /** Head of the left side: "Below average: SN". */
  below: string
  /** Name of the line between the two sides: "Average". */
  average: string
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Header of the score column: "Appraisal AS". */
  score: string
  /** SP and SN as table headers. */
  sp: string
  sn: string
  /** Accessible name of the legend list: "Criteria". */
  legend: string
  /** Legend entry for the criteria after the eighth: "Other criteria". */
  others: string
  /** Accessible names of one segment, from formatted numbers. */
  segmentAbove: (alternative: string, criterion: string, value: string, score: string) => string
  segmentBelow: (alternative: string, criterion: string, value: string, score: string) => string
  segmentAt: (alternative: string, criterion: string, score: string) => string
  /** Readout under the bars for the hovered or focused segment. */
  readoutAbove: (alternative: string, criterion: string, value: string) => string
  readoutBelow: (alternative: string, criterion: string, value: string) => string
  readoutAt: (alternative: string, criterion: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const EDAS_IDEA_LABELS_EN: EdasIdeaLabels = {
  title: 'Above and below the average',
  above: 'Above average: SP',
  below: 'Below average: SN',
  average: 'Average',
  showTable: 'Show as table',
  alternative: 'Alternative',
  score: 'Appraisal AS',
  sp: 'SP',
  sn: 'SN',
  legend: 'Criteria',
  others: 'Other criteria',
  segmentAbove: (a, c, v, sc) => `${a}, ${c}: ${v} above the average (AS = ${sc})`,
  segmentBelow: (a, c, v, sc) => `${a}, ${c}: ${v} below the average (AS = ${sc})`,
  segmentAt: (a, c, sc) => `${a}, ${c}: at the average (AS = ${sc})`,
  readoutAbove: (a, c, v) => `${a}: ${c} adds ${v} to SP`,
  readoutBelow: (a, c, v) => `${a}: ${c} adds ${v} to SN`,
  readoutAt: (a, c) => `${a} is at the average on ${c}`,
}

export type EdasIdeaProps = {
  problem: Problem
  weights: readonly number[]
  /** Number format for AS, the distances and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<EdasIdeaLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. EDAS_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture.
   */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the EDAS idea: 0 the distances PDA and NDA from the average line (on a scale of their own), 1 weighted:
 * every segment takes its criterion's weight and the stacks end at SP and SN, 2 appraisal: AS closes the rows, and
 * the rows slide from the order of the table to the rank order.
 */
export const EDAS_IDEA_STEPS = 3

const FONT = 13
const HEAD_FONT = 12
const BAR = 16
const ROW = 28
const HEAD = 24
/** Below this width the name sits on its own line above the bar, so the bar keeps the full width. */
const STACK_BELOW = 420
const NAME_LINE = 21
const STACKED_ROW = NAME_LINE + BAR + 10
const GAP = 8
const VALUE_GAP = 12
/** Width (px) of a zero segment: invisible as a fill, wide enough for the focus ring to draw. */
const ZERO_WIDTH = 0.01
const defaultFormat = (v: number) => v.toFixed(4)

type Active = { row: number; col: number }

/**
 * EDAS as a picture: one diverging bar per alternative, in rank order, around a vertical line that stands for the
 * average solution. Each criterion's weighted distance above the average (w_j PDA_ij) stacks to the right, its weighted
 * distance below (w_j NDA_ij) to the left, in the criterion's own colour (the same --data-cat-* as SAW); so the right
 * part ends at SP_i and the left part at SN_i, on one scale. The appraisal score AS_i, which weighs SP against the
 * largest SP and SN against the largest SN, closes each row. Hover or focus a segment to name it and follow its
 * criterion through every row; arrow keys move between segments (left / right: criteria, up / down: alternatives).
 * Static at first paint; when the numbers change the segments move (MOTION.md object constancy, --dur-data).
 * Every number comes from the core's EDAS steps.
 */
export function EdasIdea({ problem, weights, format = defaultFormat, labels, step, explain = false, className }: EdasIdeaProps) {
  const l = { ...EDAS_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(() => edasParts(problem, weights), [problem, weights])
  const [active, setActive] = useState<Active | null>(null)
  const [focusKey, setFocusKey] = useState<Active>({ row: 0, col: 0 })
  if (!parts) return null

  const { above, below, sp, sn, scores, order } = parts
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), EDAS_IDEA_STEPS - 1) : EDAS_IDEA_STEPS - 1
  const sum = (row: readonly number[]) => row.reduce((a, b) => a + b, 0)
  // Step 0 draws the unweighted distances PDA and NDA on a scale of their own; the sums SP and SN follow from step 1.
  const drawAbove = stage === 0 ? parts.pda : above
  const drawBelow = stage === 0 ? parts.nda : below
  const drawSp = stage === 0 ? drawAbove.map(sum) : sp
  const drawSn = stage === 0 ? drawBelow.map(sum) : sn
  const m = problem.alternatives.length
  const n = problem.criteria.length
  const names = problem.alternatives
  const critNames = problem.criteria.map((c) => c.name)
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW
  const texts = scores.map((v) => format(v))
  const spTexts = sp.map((v) => format(v))
  const snTexts = sn.map((v) => format(v))
  const valueWidth = Math.ceil(maxOf([...texts, ...spTexts, ...snTexts].map((t) => estimateTextWidth(t, FONT)))) + VALUE_GAP
  const maxName = maxOf(names.map((a) => estimateTextWidth(a, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP * 2, Math.max(W * 0.24, 56)))
  const plotLeft = labelWidth
  const plotRight = Math.max(plotLeft + 1, W - valueWidth)
  // One scale for both sides: the line sits where the longest SN ends, so SP and SN keep their true proportions.
  const maxSn = maxOf(drawSn)
  const maxSp = maxOf(drawSp)
  const span = maxSn + maxSp > 0 ? maxSn + maxSp : 1
  const pxPerUnit = (plotRight - plotLeft) / span
  const center = plotLeft + (maxSn + maxSp > 0 ? maxSn : span / 2) * pxPerUnit
  const rowStep = stacked ? STACKED_ROW : ROW
  const barY = stacked ? NAME_LINE : (ROW - BAR) / 2
  const height = HEAD + m * rowStep + 4
  const focus = { row: Math.min(focusKey.row, m - 1), col: Math.min(focusKey.col, n - 1) }
  const colour = (j: number) => (j < SAW_CATEGORY_COLOURS ? String(j + 1) : 'other')
  // The side heads sit against the line; when either full head would be cut, both shorten to "← SN" and "SP →".
  const full = center - 6 - estimateTextWidth(`← ${l.below}`, HEAD_FONT) >= 0 && center + 6 + estimateTextWidth(`${l.above} →`, HEAD_FONT) <= W
  const belowText = full ? `← ${l.below}` : `← ${l.sn}`
  const aboveText = full ? `${l.above} →` : `${l.sp} →`
  const belowX = Math.max(center - 6, estimateTextWidth(belowText, HEAD_FONT))
  const aboveX = Math.min(center + 6, W - estimateTextWidth(aboveText, HEAD_FONT))

  const signed = (i: number, j: number) => (above[i]![j]! > 0 ? above[i]![j]! : -below[i]![j]!)
  const table: ChartTable = {
    corner: l.alternative,
    columns: [...critNames, l.sp, l.sn, l.score],
    rows: order.map((i) => ({
      label: names[i]!,
      cells: [...critNames.map((_, j) => format(signed(i, j))), format(sp[i]!), format(sn[i]!), texts[i]!],
    })),
  }

  const move = (e: KeyboardEvent<SVGGElement>) => {
    if (stepping) return
    const next = { ...focus }
    if (e.key === 'ArrowRight') next.col = Math.min(n - 1, focus.col + 1)
    else if (e.key === 'ArrowLeft') next.col = Math.max(0, focus.col - 1)
    else if (e.key === 'ArrowDown') next.row = Math.min(m - 1, focus.row + 1)
    else if (e.key === 'ArrowUp') next.row = Math.max(0, focus.row - 1)
    else if (e.key === 'Home') next.col = 0
    else if (e.key === 'End') next.col = n - 1
    else if (e.key === 'Escape') {
      setActive(null)
      return
    } else return
    e.preventDefault()
    setFocusKey(next)
    setActive(next)
    const el = e.currentTarget.querySelector<SVGElement>(`[data-row="${next.row}"][data-col="${next.col}"]`)
    el?.focus()
  }

  const shown = active && !stepping ? { i: stage >= 2 ? order[active.row]! : active.row, j: active.col } : null
  const legendCols = Array.from({ length: Math.min(n, SAW_CATEGORY_COLOURS) }, (_, j) => j)
  const readout = (i: number, j: number) => {
    if (drawAbove[i]![j]! > 0) return l.readoutAbove(names[i]!, critNames[j]!, format(drawAbove[i]![j]!))
    if (drawBelow[i]![j]! > 0) return l.readoutBelow(names[i]!, critNames[j]!, format(drawBelow[i]![j]!))
    return l.readoutAt(names[i]!, critNames[j]!)
  }

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
        data-testid="edas-idea"
      >
        <g aria-hidden>
          <text className={s.edasHead} x={0} y={HEAD / 2 - 2} style={{ transform: `translate(${belowX}px, 0px)` }} textAnchor="end" dominantBaseline="central">
            {belowText}
          </text>
          <text className={s.edasHead} x={0} y={HEAD / 2 - 2} style={{ transform: `translate(${aboveX}px, 0px)` }} textAnchor="start" dominantBaseline="central">
            {aboveText}
          </text>
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)} data-dimmed={shown ? '' : undefined} className={s.sawPlot}>
          {order.map((i, row) => {
            const segs = divergingSegments(drawAbove[i]!, drawBelow[i]!, center, pxPerUnit)
            const first = parts.result.ranking[i] === 1 && stage >= 2
            // Until the last step the rows keep the order of the table; then they slide to the rank order.
            const place = stage >= 2 ? row : i
            const name = names[i]!
            const short = truncate(name, stacked ? W - valueWidth : labelWidth - GAP, FONT)
            return (
              <g
                key={i}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${HEAD + place * rowStep}px)` }}
                data-highlight={first || undefined}
                data-testid="edas-row"
                data-score={scores[i]}
                data-sp={sp[i]}
                data-sn={sn[i]}
              >
                <text className={s.sawName} x={0} y={stacked ? 8 : ROW / 2} dominantBaseline="central">
                  {short !== name ? <title>{name}</title> : null}
                  {short}
                </text>
                {segs.map((g) => {
                  const on = shown?.j === g.col
                  const tabbable = !stepping && focus.row === place && focus.col === g.col
                  const label =
                    g.side === 'above'
                      ? l.segmentAbove(name, critNames[g.col]!, format(g.value), texts[i]!)
                      : g.side === 'below'
                        ? l.segmentBelow(name, critNames[g.col]!, format(g.value), texts[i]!)
                        : l.segmentAt(name, critNames[g.col]!, texts[i]!)
                  return (
                    <rect
                      key={g.col}
                      className={s.sawSeg}
                      data-cat={colour(g.col)}
                      data-on={on || undefined}
                      data-row={place}
                      data-col={g.col}
                      data-side={g.side}
                      data-value={g.value}
                      data-testid="edas-segment"
                      x={0}
                      y={barY}
                      width={1}
                      height={BAR}
                      style={{ transform: `translate(${g.x}px, 0px) scale(${Math.max(g.width, ZERO_WIDTH)}, 1)` }}
                      tabIndex={tabbable ? 0 : -1}
                      role="img"
                      aria-label={label}
                      onMouseEnter={stepping ? undefined : () => setActive({ row: place, col: g.col })}
                      onFocus={
                        stepping
                          ? undefined
                          : () => {
                              setFocusKey({ row: place, col: g.col })
                              setActive({ row: place, col: g.col })
                            }
                      }
                      onBlur={stepping ? undefined : () => setActive(null)}
                    />
                  )
                })}
                {/* A 2 px gap in the page colour between neighbours on one side, so touching segments never merge. */}
                {segs
                  .filter((g) => g.side !== 'at' && Math.abs((g.side === 'above' ? g.x : g.x + g.width) - center) > 0.5)
                  .map((g) => (
                    <rect
                      key={`gap-${g.col}`}
                      className={s.sawGap}
                      x={-1}
                      y={barY}
                      width={2}
                      height={BAR}
                      style={{ transform: `translate(${g.side === 'above' ? g.x : g.x + g.width}px, 0px)` }}
                      aria-hidden
                    />
                  ))}
                <text
                  className={`${s.sawValue} ${s.stageItem}`}
                  data-off={stage >= 2 ? undefined : ''}
                  x={W}
                  y={barY + BAR / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {texts[i]}
                </text>
              </g>
            )
          })}
        </g>
        {/* The average solution: drawn over the bars, from the heads to the last row. */}
        <line
          className={s.edasAxis}
          x1={0}
          x2={0}
          y1={HEAD - 2}
          y2={height - 2}
          style={{ transform: `translate(${center}px, 0px)` }}
          aria-hidden
          data-testid="edas-average-line"
        />
      </svg>
      {/* The focused segment's own name says the same to a screen reader, so the readout is for the eyes only. */}
      <p className={s.readout}>
        {shown ? (
          <span className={s.readoutC} aria-hidden>
            {readout(shown.i, shown.j)}
          </span>
        ) : (
          <span>{l.caption ?? ' '}</span>
        )}
      </p>
      <ul className={s.sawLegend} aria-label={l.legend}>
        <li className={s.sawLegendItem}>
          <svg width={12} height={12} aria-hidden className={s.sawSwatch}>
            <line className={s.edasAxis} x1={6} x2={6} y1={0} y2={12} />
          </svg>
          {l.average}
        </li>
        {legendCols.map((j) => (
          <li key={j} className={s.sawLegendItem} data-on={shown?.j === j || undefined}>
            <svg width={12} height={12} aria-hidden className={s.sawSwatch}>
              <rect className={s.sawSeg} data-cat={colour(j)} width={12} height={12} />
            </svg>
            {critNames[j]}
          </li>
        ))}
        {n > SAW_CATEGORY_COLOURS && (
          <li className={s.sawLegendItem}>
            <svg width={12} height={12} aria-hidden className={s.sawSwatch}>
              <rect className={s.sawSeg} data-cat="other" width={12} height={12} />
            </svg>
            {l.others}
          </li>
        )}
      </ul>
    </ChartFigure>
  )
}
