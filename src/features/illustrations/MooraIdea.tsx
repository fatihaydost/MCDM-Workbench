import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { maxOf } from '../../core/math'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { divergingSegments, mooraParts } from './geometry'
import s from './illustrations.module.css'
import { SAW_CATEGORY_COLOURS } from './SawContributions'

export type MooraIdeaLabels = {
  title: string
  /** Line under the figure while nothing is hovered or focused. */
  caption?: string | undefined
  /** Head of the right side: "Benefit sum: S+". */
  benefitHead: string
  /** Head of the left side: "Cost sum: S-". */
  costHead: string
  /** Name of the zero line between the two sides: "Zero". */
  zero: string
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Header of the score column: "Net score y". */
  score: string
  /** S+ and S- as table headers. */
  sPlus: string
  sMinus: string
  /** Accessible name of the legend list: "Criteria". */
  legend: string
  /** Legend entry for the criteria after the eighth: "Other criteria". */
  others: string
  /** Accessible names of one segment, from formatted numbers. */
  segmentBenefit: (alternative: string, criterion: string, value: string, score: string) => string
  segmentCost: (alternative: string, criterion: string, value: string, score: string) => string
  segmentZero: (alternative: string, criterion: string, score: string) => string
  /** Readout under the bars for the hovered or focused segment. */
  readoutBenefit: (alternative: string, criterion: string, value: string) => string
  readoutCost: (alternative: string, criterion: string, value: string) => string
  readoutZero: (alternative: string, criterion: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const MOORA_IDEA_LABELS_EN: MooraIdeaLabels = {
  title: 'Benefit sum minus cost sum',
  benefitHead: 'Benefit sum: S+',
  costHead: 'Cost sum: S-',
  zero: 'Zero',
  showTable: 'Show as table',
  alternative: 'Alternative',
  score: 'Net score y',
  sPlus: 'S+',
  sMinus: 'S-',
  legend: 'Criteria',
  others: 'Other criteria',
  segmentBenefit: (a, c, v, sc) => `${a}, ${c}: +${v} benefit ratio (y = ${sc})`,
  segmentCost: (a, c, v, sc) => `${a}, ${c}: -${v} cost ratio (y = ${sc})`,
  segmentZero: (a, c, sc) => `${a}, ${c}: 0 contribution (y = ${sc})`,
  readoutBenefit: (a, c, v) => `${a}: ${c} adds ${v} to S+`,
  readoutCost: (a, c, v) => `${a}: ${c} subtracts ${v} via S-`,
  readoutZero: (a, c) => `${a}: ${c} contributes 0`,
}

export type MooraIdeaProps = {
  problem: Problem
  weights: readonly number[]
  /** Number format for y, the ratios and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<MooraIdeaLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. MOORA_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture.
   */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the MOORA idea:
 *   0: vector-normalized ratios x*_ij split into benefit (right) and cost (left),
 *   1: weighted ratios v_ij = w_j x*_ij stacking to S+_i (right) and S-_i (left),
 *   2: net assessment score y_i = S+_i - S-_i closes each row and rows sort by rank.
 */
export const MOORA_IDEA_STEPS = 3

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
 * MOORA (Ratio System) as a picture: one diverging bar per alternative, in rank order, around a vertical zero line.
 * Each benefit criterion's weighted ratio (w_j x*_ij) stacks to the right up to S+_i, and each cost criterion's
 * weighted ratio stacks to the left up to S-_i, on one shared scale. The net score y_i = S+_i - S-_i closes each row.
 */
export function MooraIdea({ problem, weights, format = defaultFormat, labels, step, explain = false, className }: MooraIdeaProps) {
  const l = { ...MOORA_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(() => mooraParts(problem, weights), [problem, weights])
  const [active, setActive] = useState<Active | null>(null)
  const [focusKey, setFocusKey] = useState<Active>({ row: 0, col: 0 })
  if (!parts) return null

  const { normalized, benefit, cost, sPlus, sMinus, scores, order } = parts
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), MOORA_IDEA_STEPS - 1) : MOORA_IDEA_STEPS - 1
  const sum = (row: readonly number[]) => row.reduce((a, b) => a + b, 0)
  const isCost = problem.criteria.map((c) => c.type === 'cost')
  // Step 0 draws the unweighted normalized ratios x*_ij on a scale of their own; step 1+ draws weighted v_ij.
  const normBenefit = normalized.map((row) => row.map((v, j) => (isCost[j] ? 0 : Math.max(0, v))))
  const normCost = normalized.map((row) => row.map((v, j) => (isCost[j] ? Math.max(0, v) : 0)))
  const drawAbove = stage === 0 ? normBenefit : benefit.map((row) => row.map((v) => Math.max(0, v)))
  const drawBelow = stage === 0 ? normCost : cost.map((row) => row.map((v) => Math.max(0, v)))
  const drawSp = stage === 0 ? drawAbove.map(sum) : sPlus.map((v, i) => Math.max(0, v, sum(drawAbove[i]!)))
  const drawSn = stage === 0 ? drawBelow.map(sum) : sMinus.map((v, i) => Math.max(0, v, sum(drawBelow[i]!)))
  const m = problem.alternatives.length
  const n = problem.criteria.length
  const names = problem.alternatives
  const critNames = problem.criteria.map((c) => c.name)
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW
  const texts = scores.map((v) => format(v))
  const valueWidth = Math.ceil(maxOf(texts.map((t) => estimateTextWidth(t, FONT)))) + VALUE_GAP
  const maxName = maxOf(names.map((a) => estimateTextWidth(a, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP * 2, Math.max(W * 0.24, 56)))
  const plotLeft = labelWidth
  const plotRight = Math.max(plotLeft + 1, W - valueWidth)
  // One scale for both sides: the zero line sits where the longest S- ends, so S+ and S- keep their true proportions.
  const maxSn = Math.max(0, maxOf(drawSn))
  const maxSp = Math.max(0, maxOf(drawSp))
  const span = maxSn + maxSp > 0 ? maxSn + maxSp : 1
  const pxPerUnit = (plotRight - plotLeft) / span
  const center = plotLeft + (maxSn + maxSp > 0 ? maxSn : span / 2) * pxPerUnit
  const rowStep = stacked ? STACKED_ROW : ROW
  const barY = stacked ? NAME_LINE : (ROW - BAR) / 2
  const height = HEAD + m * rowStep + 4
  const focus = { row: Math.min(focusKey.row, m - 1), col: Math.min(focusKey.col, n - 1) }
  const colour = (j: number) => (j < SAW_CATEGORY_COLOURS ? String(j + 1) : 'other')
  const full =
    center - 6 - estimateTextWidth(`← ${l.costHead}`, HEAD_FONT) >= 0 &&
    center + 6 + estimateTextWidth(`${l.benefitHead} →`, HEAD_FONT) <= W
  const belowText = full ? `← ${l.costHead}` : `← ${l.sMinus}`
  const aboveText = full ? `${l.benefitHead} →` : `${l.sPlus} →`
  const belowX = Math.max(center - 6, estimateTextWidth(belowText, HEAD_FONT))
  const aboveX = Math.min(center + 6, W - estimateTextWidth(aboveText, HEAD_FONT))

  const signed = (i: number, j: number) => {
    const v = isCost[j] ? -parts.weighted[i]![j]! : parts.weighted[i]![j]!
    return v === 0 ? 0 : v
  }
  const table: ChartTable = {
    corner: l.alternative,
    columns: [...critNames, l.sPlus, l.sMinus, l.score],
    rows: order.map((i) => ({
      label: names[i]!,
      cells: [...critNames.map((_, j) => format(signed(i, j))), format(sPlus[i]!), format(sMinus[i]!), texts[i]!],
    })),
  }

  const move = (e: KeyboardEvent<SVGGElement>) => {
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

  const altAt = (r: number) => (stage >= 2 ? order[r]! : r)
  const shown = active && !stepping ? { i: altAt(active.row), j: active.col } : null
  const legendCols = Array.from({ length: Math.min(n, SAW_CATEGORY_COLOURS) }, (_, j) => j)
  const readout = (i: number, j: number) => {
    const val = stage === 0 ? normalized[i]![j]! : parts.weighted[i]![j]!
    if (val === 0) return l.readoutZero(names[i]!, critNames[j]!)
    const isCostCol = problem.criteria[j]?.type === 'cost'
    return isCostCol
      ? l.readoutCost(names[i]!, critNames[j]!, format(val))
      : l.readoutBenefit(names[i]!, critNames[j]!, format(val))
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
        data-testid="moora-idea"
      >
        <g aria-hidden>
          <text className={s.edasHead} x={0} y={HEAD / 2 - 2} style={{ transform: `translate(${belowX}px, 0px)` }} textAnchor="end" dominantBaseline="central">
            {belowText}
          </text>
          <text className={s.edasHead} x={0} y={HEAD / 2 - 2} style={{ transform: `translate(${aboveX}px, 0px)` }} textAnchor="start" dominantBaseline="central">
            {aboveText}
          </text>
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)} data-dimmed={active ? '' : undefined} className={s.sawPlot}>
          {order.map((i, row) => {
            const segs = divergingSegments(drawAbove[i]!, drawBelow[i]!, center, pxPerUnit)
            const first = parts.result.ranking[i] === 1 && stage >= 2
            const place = stage >= 2 ? row : i
            const name = names[i]!
            const short = truncate(name, stacked ? W - valueWidth : labelWidth - GAP, FONT)
            return (
              <g
                key={i}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${HEAD + place * rowStep}px)` }}
                data-highlight={first || undefined}
                data-testid="moora-row"
                data-score={scores[i]}
                data-splus={sPlus[i]}
                data-sminus={sMinus[i]}
              >
                <text className={s.sawName} x={0} y={stacked ? 8 : ROW / 2} dominantBaseline="central">
                  {short !== name ? <title>{name}</title> : null}
                  {short}
                </text>
                {segs.map((g) => {
                  const on = shown?.j === g.col
                  const tabbable = !stepping && focus.row === place && focus.col === g.col
                  const rawVal = stage === 0 ? normalized[i]![g.col]! : parts.weighted[i]![g.col]!
                  const fmtVal = format(rawVal)
                  const label =
                    rawVal === 0
                      ? l.segmentZero(name, critNames[g.col]!, texts[i]!)
                      : isCost[g.col]
                        ? l.segmentCost(name, critNames[g.col]!, fmtVal, texts[i]!)
                        : l.segmentBenefit(name, critNames[g.col]!, fmtVal, texts[i]!)
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
                      data-testid="moora-segment"
                      x={0}
                      y={barY}
                      width={1}
                      height={BAR}
                      style={{ transform: `translate(${g.x}px, 0px) scale(${Math.max(g.width, ZERO_WIDTH)}, 1)` }}
                      tabIndex={tabbable ? 0 : -1}
                      role="img"
                      aria-label={label}
                      onMouseEnter={() => setActive({ row: place, col: g.col })}
                      onFocus={() => {
                        setFocusKey({ row: place, col: g.col })
                        setActive({ row: place, col: g.col })
                      }}
                      onBlur={() => setActive(null)}
                    />
                  )
                })}
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
                  data-testid="moora-y"
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
        <line
          className={s.edasAxis}
          x1={0}
          x2={0}
          y1={HEAD - 2}
          y2={height - 2}
          style={{ transform: `translate(${center}px, 0px)` }}
          aria-hidden
          data-testid="moora-zero-line"
        />
      </svg>
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
          {l.zero}
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
          <li className={s.sawLegendItem} data-on={(shown ? shown.j >= SAW_CATEGORY_COLOURS : focus.col >= SAW_CATEGORY_COLOURS) ? '' : undefined}>
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
