import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { maxOf } from '../../core/math'
import type { SawParams } from '../../core/methods/saw'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { sawParts, stackSegments, type SawParts } from './geometry'
import s from './illustrations.module.css'

export type SawContributionsLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Header of the score column of the table: "Score S". */
  score: string
  /** Accessible name of the legend list: "Criteria". */
  legend: string
  /** Legend entry for the criteria after the eighth, drawn in the context grey: "Other criteria". */
  others: string
  /** Accessible name of one segment, from formatted numbers: "Lithuania, Price: 0.1234 of 0.8744". */
  segment: (alternative: string, criterion: string, value: string, score: string) => string
  /** Readout under the bars for the hovered or focused segment. */
  readout: (alternative: string, criterion: string, value: string, score: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const SAW_CONTRIBUTIONS_LABELS_EN: SawContributionsLabels = {
  title: 'Where each score comes from',
  showTable: 'Show as table',
  alternative: 'Alternative',
  score: 'Score S',
  legend: 'Criteria',
  others: 'Other criteria',
  segment: (a, c, v, sc) => `${a}, ${c}: ${v} of ${sc}`,
  readout: (a, c, v, sc) => `${a}: ${c} adds ${v} to S = ${sc}`,
}

export type SawContributionsProps = {
  problem: Problem
  weights: readonly number[]
  /** The SAW options the numbers come from (default: linear max). */
  params?: SawParams | undefined
  /** Precomputed contributions (e.g. AHP synthesis with pairwise criteria); defaults to SAW on `problem`. */
  parts?: SawParts | null | undefined
  /** Number format for S, the contributions and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<SawContributionsLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. SAW_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture.
   */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the SAW idea: 0 the rescaled values r_ij, each segment the same share of its criterion (the bars end at
 * their sums), 1 weighted: every segment takes its criterion's weight (heavier criteria grow, lighter ones shrink),
 * 2 added up: the bars end at the scores S, and the rows slide from the order of the table to the rank order.
 */
export const SAW_IDEA_STEPS = 3

/** Criteria drawn in their own colour (--data-cat-1..8); the rest share --data-context and one legend entry. */
export const SAW_CATEGORY_COLOURS = 8

const FONT = 13
const BAR = 16
const ROW = 28
/** Below this width the name sits on its own line above the bar, so the bar keeps the full width. */
const STACK_BELOW = 380
const NAME_LINE = 21
const STACKED_ROW = NAME_LINE + BAR + 10
const GAP = 8
const VALUE_GAP = 6
/** Width (px) of a zero contribution: invisible as a fill, wide enough for the focus ring to draw. */
const ZERO_WIDTH = 0.01
const defaultFormat = (v: number) => v.toFixed(4)

type Active = { row: number; col: number }

/**
 * SAW as a picture: one horizontal stacked bar per alternative, in rank order. Each segment is one criterion's
 * contribution w_j r_ij and the bar ends at the score S_i, printed after it, so every part of a score can be traced
 * to a criterion. Criteria keep one colour each (legend below); hovering or focusing a segment names it in the
 * readout and fades the other criteria, so one criterion can be followed through every bar. Arrow keys move
 * between segments (left / right: criteria, up / down: alternatives). Static at first paint; when the numbers change
 * the segments and rows move to their new places (MOTION.md object constancy, --dur-data), never on mount.
 * Every number comes from the core's SAW steps.
 */
export function SawContributions({ problem, weights, params, parts: partsProp, format = defaultFormat, labels, step, explain = false, className }: SawContributionsProps) {
  const l = { ...SAW_CONTRIBUTIONS_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const normalization = params?.normalization
  const parts = useMemo(
    () => (partsProp !== undefined ? partsProp : sawParts(problem, weights, normalization ? { normalization } : {})),
    [partsProp, problem, weights, normalization],
  )
  const [active, setActive] = useState<Active | null>(null)
  const [focusKey, setFocusKey] = useState<Active>({ row: 0, col: 0 })
  if (!parts) return null

  const { contributions, scores, order } = parts
  const m = problem.alternatives.length
  const n = problem.criteria.length
  const names = problem.alternatives
  const critNames = problem.criteria.map((c) => c.name)
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW
  const texts = scores.map((v) => format(v))
  const valueWidth = Math.ceil(maxOf(texts.map((t) => estimateTextWidth(t, FONT)))) + VALUE_GAP + 2
  const maxName = maxOf(names.map((a) => estimateTextWidth(a, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP * 2, Math.max(W * 0.32, 64)))
  const plotLeft = labelWidth
  const plotRight = Math.max(plotLeft + 1, W - valueWidth)
  const top = Math.max(maxOf(scores), 1e-12)
  const pxPerUnit = (plotRight - plotLeft) / top
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), SAW_IDEA_STEPS - 1) : SAW_IDEA_STEPS - 1
  // Step 0 draws the rescaled values r_ij on a scale of their own (their sums are longer than the scores).
  const topR = Math.max(maxOf(parts.normalized.map((row) => row.reduce((a, b) => a + b, 0))), 1e-12)
  const unit = stage === 0 ? (plotRight - plotLeft) / topR : pxPerUnit
  const rowStep = stacked ? STACKED_ROW : ROW
  const barY = stacked ? NAME_LINE : (ROW - BAR) / 2
  const height = m * rowStep
  const best = order[0]!
  const focus = { row: Math.min(focusKey.row, m - 1), col: Math.min(focusKey.col, n - 1) }
  const colour = (j: number) => (j < SAW_CATEGORY_COLOURS ? String(j + 1) : 'other')

  const table: ChartTable = {
    corner: l.alternative,
    columns: [...critNames, l.score],
    rows: order.map((i) => ({ label: names[i]!, cells: [...contributions[i]!.map((v) => format(v)), texts[i]!] })),
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
    // Rows are keyed by alternative and segments by criterion, so the element to focus is found by its data address.
    const el = e.currentTarget.querySelector<SVGElement>(`[data-row="${next.row}"][data-col="${next.col}"]`)
    el?.focus()
  }

  const shown = active ? { i: order[active.row]!, j: active.col } : null
  const legendCols = Array.from({ length: Math.min(n, SAW_CATEGORY_COLOURS) }, (_, j) => j)

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
        data-testid="saw-contributions"
      >
        <g onKeyDown={move} onMouseLeave={() => setActive(null)} data-dimmed={active ? '' : undefined} className={s.sawPlot}>
          {order.map((i, row) => {
            const segs = stackSegments(stage === 0 ? parts.normalized[i]! : contributions[i]!, plotLeft, unit)
            const end = plotLeft + scores[i]! * pxPerUnit
            const first = i === best && stage >= 2
            // Until the last step the rows keep the order of the table; then they slide to the rank order.
            const place = stage >= 2 ? row : i
            const name = names[i]!
            const short = truncate(name, stacked ? W - valueWidth : labelWidth - GAP, FONT)
            return (
              <g
                key={i}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${place * rowStep}px)` }}
                data-highlight={first || undefined}
                data-testid="saw-bar"
                data-score={scores[i]}
              >
                <text className={s.sawName} x={0} y={stacked ? 8 : ROW / 2} dominantBaseline="central">
                  {short !== name ? <title>{name}</title> : null}
                  {short}
                </text>
                {segs.map((g) => {
                  const on = shown?.j === g.col
                  const tabbable = focus.row === row && focus.col === g.col
                  return (
                    <rect
                      key={g.col}
                      className={s.sawSeg}
                      data-cat={colour(g.col)}
                      data-on={on || undefined}
                      data-row={row}
                      data-col={g.col}
                      data-value={g.value}
                      data-testid="saw-segment"
                      x={0}
                      y={barY}
                      width={1}
                      height={BAR}
                      // A zero contribution keeps a hairline width, so its non-scaling focus ring still draws.
                      style={{ transform: `translate(${g.x}px, 0px) scale(${Math.max(g.width, ZERO_WIDTH)}, 1)` }}
                      tabIndex={tabbable ? 0 : -1}
                      role="img"
                      aria-label={l.segment(name, critNames[g.col]!, format(g.value), texts[i]!)}
                      onMouseEnter={() => setActive({ row, col: g.col })}
                      onFocus={() => {
                        setFocusKey({ row, col: g.col })
                        setActive({ row, col: g.col })
                      }}
                      onBlur={() => setActive(null)}
                    />
                  )
                })}
                {/* A 2 px gap in the page colour between neighbours, so touching segments never merge. */}
                {segs.slice(1).map((g) => (
                  <rect
                    key={`gap-${g.col}`}
                    className={s.sawGap}
                    x={-1}
                    y={barY}
                    width={2}
                    height={BAR}
                    style={{ transform: `translate(${g.x}px, 0px)` }}
                    aria-hidden
                  />
                ))}
                <text
                  className={`${s.sawValue} ${s.stageItem}`}
                  data-off={stage >= 2 ? undefined : ''}
                  x={0}
                  y={barY + BAR / 2}
                  dominantBaseline="central"
                  style={{ transform: `translate(${end + VALUE_GAP}px, 0px)` }}
                >
                  {texts[i]}
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
            {l.readout(names[shown.i]!, critNames[shown.j]!, format(contributions[shown.i]![shown.j]!), texts[shown.i]!)}
          </span>
        ) : (
          // Hidden, not removed, before the last step: the picture below keeps its place.
          <span className={stage >= 2 ? undefined : 'invisible'}>{l.caption ?? '\u00a0'}</span>
        )}
      </p>
      <ul className={s.sawLegend} aria-label={l.legend}>
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
