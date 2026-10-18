import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { maxOf } from '../../core/math'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { marcosParts } from './geometry'
import s from './illustrations.module.css'

export type MarcosRowsLabels = {
  title: string
  /** Line under the figure while nothing is hovered or focused. */
  caption?: string | undefined
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Names of the two imaginary rows: "Ideal AI", "Anti-ideal AAI". */
  ideal: string
  antiIdeal: string
  /** Table columns: "Weighted total S", "K-", "K+", "Utility f(K)". */
  total: string
  kMinus: string
  kPlus: string
  score: string
  /** Accessible name of one alternative's bar, from formatted numbers. */
  bar: (alternative: string, total: string, kMinus: string, kPlus: string, score: string) => string
  /** Readout for the hovered or focused bar. */
  readout: (alternative: string, kMinus: string, kPlus: string, score: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const MARCOS_ROWS_LABELS_EN: MarcosRowsLabels = {
  title: 'Two imaginary rows to measure against',
  showTable: 'Show as table',
  alternative: 'Alternative',
  ideal: 'Ideal AI',
  antiIdeal: 'Anti-ideal AAI',
  total: 'Weighted total S',
  kMinus: 'K-',
  kPlus: 'K+',
  score: 'Utility f(K)',
  bar: (a, t, km, kp, f) => `${a}: S = ${t}, K- = ${km}, K+ = ${kp}, f(K) = ${f}`,
  readout: (a, km, kp, f) => `${a}: ${km} anti-ideals (K-), ${kp} of the ideal (K+), f(K) = ${f}`,
}

export type MarcosRowsProps = {
  problem: Problem
  weights: readonly number[]
  /** S, K and f(K) in the active locale with the given decimals. */
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<MarcosRowsLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. MARCOS_ROWS_STEPS - 1 draws that
   * step, the last one being the full picture.
   */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the MARCOS idea: 0 the weighted totals S of the alternatives on one scale, 1 the two imaginary rows
 * (ideal, anti-ideal) and their guides appear, 2 the bars are read against them: f(K) closes each row.
 */
export const MARCOS_ROWS_STEPS = 3

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
 * MARCOS as a picture: the table grows two imaginary rows, the ideal AI (best value of every criterion) on top and the
 * anti-ideal AAI (worst) at the bottom, drawn dashed. Every bar is a weighted total S on one scale, so K- = S / S_aai
 * (how many anti-ideals a bar is worth) and K+ = S / S_ai (what share of the ideal it reaches) are read against the two
 * dashed guides. Alternatives in rank order, the first in the accent; f(K) closes each row on the right. Hover or focus
 * a bar (up / down) to read its K- and K+. Static at first paint; new numbers move rows and bars at --dur-data.
 */
export function MarcosRows({ problem, weights, format = defaultFormat, labels, step, explain = false, className }: MarcosRowsProps) {
  const l = { ...MARCOS_ROWS_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(() => marcosParts(problem, weights), [problem, weights])
  const [active, setActive] = useState<number | null>(null)
  const [focusRow, setFocusRow] = useState(0)
  if (!parts) return null

  const { s: totals, kMinus, kPlus, scores, sAai, sAi, order } = parts
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), MARCOS_ROWS_STEPS - 1) : MARCOS_ROWS_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')
  const names = problem.alternatives
  const m = names.length
  const f4 = (v: number) => format(v, 4)
  const f3 = (v: number) => format(v, 3)
  // Rows top to bottom: the ideal, the alternatives in rank order, the anti-ideal.
  const rows = [
    { key: 'ai', name: l.ideal, total: sAi, ghost: true, i: -1 },
    ...order.map((i) => ({ key: `a${i}`, name: names[i]!, total: totals[i]!, ghost: false, i })),
    { key: 'aai', name: l.antiIdeal, total: sAai, ghost: true, i: -1 },
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
  const pxPerUnit = (plotRight - plotLeft) / Math.max(sAi, maxOf(totals), 1e-12)
  const rowStep = stacked ? STACKED_ROW : ROW
  const barY = stacked ? NAME_LINE : (ROW - BAR) / 2
  const height = rows.length * rowStep
  const best = order[0]!
  const focus = Math.min(focusRow, m - 1)
  const xAai = plotLeft + sAai * pxPerUnit
  const xAi = plotLeft + sAi * pxPerUnit

  const table: ChartTable = {
    corner: l.alternative,
    columns: [l.total, l.kMinus, l.kPlus, l.score],
    rows: rows.map((r, k) => ({
      label: r.name,
      cells: r.ghost ? [texts[k]!, '', '', ''] : [texts[k]!, f3(kMinus[r.i]!), f3(kPlus[r.i]!), right[r.i]!],
    })),
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
        className={[s.svg, animate && s.animate, explain && s.explain].filter(Boolean).join(' ')}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="group"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-testid="marcos-rows"
      >
        {/* The two reference totals as guides through every row: K- and K+ are a bar's length against them. */}
        <g aria-hidden>
          <line className={`${s.marcosGuide} ${s.stageItem}`} data-off={off(1)} x1={0} x2={0} y1={barY} y2={height - rowStep + barY + BAR} style={{ transform: `translate(${xAai}px, 0px)` }} />
          <line className={`${s.marcosGuide} ${s.stageItem}`} data-off={off(1)} x1={0} x2={0} y1={barY} y2={height - rowStep + barY + BAR} style={{ transform: `translate(${xAi}px, 0px)` }} />
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)}>
          {rows.map((r, k) => {
            const row = k - 1
            const short = truncate(r.name, stacked ? W - valueWidth - rightWidth : labelWidth - GAP, FONT)
            const end = plotLeft + r.total * pxPerUnit
            return (
              <g
                key={r.key}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${k * rowStep}px)` }}
                data-highlight={(r.i === best && stage >= 2) || undefined}
                data-ghost={r.ghost || undefined}
                data-testid={r.ghost ? 'marcos-ghost' : 'marcos-bar'}
              >
                <text className={r.ghost ? `${s.marcosGhostName} ${s.stageItem}` : s.sawName} data-off={r.ghost ? off(1) : undefined} x={0} y={stacked ? 8 : ROW / 2} dominantBaseline="central">
                  {short !== r.name ? <title>{r.name}</title> : null}
                  {short}
                </text>
                {r.ghost ? (
                  <rect className={`${s.marcosGhost} ${s.stageItem}`} data-off={off(1)} x={plotLeft} y={barY + 0.5} width={Math.max(0, end - plotLeft)} height={BAR - 1} aria-hidden />
                ) : (
                  <rect
                    className={s.marcosBar}
                    data-on={active === row || undefined}
                    data-highlight={(r.i === best && stage >= 2) || undefined}
                    data-row={row}
                    x={0}
                    y={barY}
                    width={1}
                    height={BAR}
                    style={{ transform: `translate(${plotLeft}px, 0px) scale(${Math.max(end - plotLeft, 0.01)}, 1)` }}
                    tabIndex={focus === row ? 0 : -1}
                    role="img"
                    aria-label={l.bar(r.name, texts[k]!, f3(kMinus[r.i]!), f3(kPlus[r.i]!), right[r.i]!)}
                    onMouseEnter={() => setActive(row)}
                    onFocus={() => {
                      setFocusRow(row)
                      setActive(row)
                    }}
                    onBlur={() => setActive(null)}
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
                  <text className={`${s.sawValue} ${s.stageItem}`} data-off={off(2)} x={W} y={barY + BAR / 2} dominantBaseline="central" textAnchor="end" data-testid="marcos-utility">
                    {right[r.i]}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
      {/* The focused bar's own name says the same to a screen reader, so the readout is for the eyes only. */}
      <p className={s.readout}>
        {shown !== null ? (
          <span className={s.readoutC} aria-hidden>
            {l.readout(names[shown]!, f3(kMinus[shown]!), f3(kPlus[shown]!), right[shown]!)}
          </span>
        ) : (
          // Hidden, not removed, before the last step: the picture below keeps its place.
          <span className={stage >= 2 ? undefined : 'invisible'}>{l.caption ?? ' '}</span>
        )}
      </p>
    </ChartFigure>
  )
}

export type MarcosSawLineLabels = {
  title: string
  caption?: string | undefined
  showTable: string
  alternative: string
  /** Axis titles: "SAW (Linear) score S", "MARCOS f(K)". */
  x: string
  y: string
  /** The line's label, from the formatted constant: "f(K) = c · S, c = 0.87". */
  line: (c: string) => string
}

export const MARCOS_SAW_LINE_LABELS_EN: MarcosSawLineLabels = {
  title: 'Same order as SAW (Linear)',
  showTable: 'Show as table',
  alternative: 'Alternative',
  x: 'SAW (Linear) score S',
  y: 'MARCOS f(K)',
  line: (c) => `f(K) = c · S, c = ${c}`,
}

export type MarcosSawLineProps = {
  problem: Problem
  weights: readonly number[]
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<MarcosSawLineLabels>
  className?: string | undefined
}

const PAD = { left: 44, right: 16, top: 16, bottom: 40 }

/**
 * Why MARCOS orders like SAW (Linear): x is SAW's own score, y is MARCOS's f(K), one dot per alternative. f(K) = c S
 * with one c for the whole table, so every dot sits on one straight line through the origin and no pair can swap.
 * Both axes run 0 to 1 on the same scale, so the line's slope is c itself. Static: it changes only with new data.
 */
export function MarcosSawLine({ problem, weights, format = defaultFormat, labels, className }: MarcosSawLineProps) {
  const l = { ...MARCOS_SAW_LINE_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const parts = useMemo(() => marcosParts(problem, weights), [problem, weights])
  if (!parts) return null

  const { saw, scores, c, order } = parts
  const names = problem.alternatives
  const side = Math.max(120, Math.min(Math.max(width, 200) - PAD.left - PAD.right, 280))
  const W = PAD.left + side + PAD.right
  const H = PAD.top + side + PAD.bottom
  const x = (v: number) => PAD.left + v * side
  const y = (v: number) => PAD.top + (1 - v) * side
  const ticks = [0, 0.5, 1]
  const best = order[0]!
  const lineLabel = l.line(format(c, 4))

  const table: ChartTable = {
    corner: l.alternative,
    columns: [l.x, l.y],
    rows: order.map((i) => ({ label: names[i]!, cells: [format(saw[i]!, 4), format(scores[i]!, 4)] })),
  }

  return (
    <ChartFigure titleId={`${uid}-title`} tableId={`${uid}-table`} title={l.title} showTable={l.showTable} table={table} plotRef={plotRef} className={className}>
      <svg className={s.svg} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-table`} data-testid="marcos-saw-line">
        <g aria-hidden>
          {ticks.map((v) => (
            <g key={v}>
              <line className={s.marcosGrid} x1={x(0)} x2={x(1)} y1={y(v)} y2={y(v)} />
              <text className={s.colHead} x={x(0) - 6} y={y(v)} textAnchor="end" dominantBaseline="central">
                {format(v, v === 0.5 ? 1 : 0)}
              </text>
              <text className={s.colHead} x={x(v)} y={y(0) + 14} textAnchor="middle" dominantBaseline="central">
                {format(v, v === 0.5 ? 1 : 0)}
              </text>
            </g>
          ))}
          <line className={s.axis} x1={x(0)} x2={x(1)} y1={y(0)} y2={y(0)} />
          <line className={s.axis} x1={x(0)} x2={x(0)} y1={y(0)} y2={y(1)} />
          <text className={s.axisName} x={x(0.5)} y={y(0) + 32} textAnchor="middle" dominantBaseline="central">
            {l.x}
          </text>
          <text className={s.axisName} x={x(0)} y={PAD.top - 8} textAnchor="start" dominantBaseline="central">
            {l.y}
          </text>
          <line className={s.marcosLine} x1={x(0)} y1={y(0)} x2={x(1)} y2={y(c)} data-testid="marcos-line" data-c={c} />
          <text className={s.marcosLineLabel} x={x(1)} y={y(c) - 12} textAnchor="end" dominantBaseline="central">
            {lineLabel}
          </text>
          {names.map((name, i) => (
            <circle key={i} className={s.marcosDot} data-highlight={i === best || undefined} data-testid="marcos-dot" cx={x(saw[i]!)} cy={y(scores[i]!)} r={4}>
              <title>{`${name}: S = ${format(saw[i]!, 4)}, f(K) = ${format(scores[i]!, 4)}`}</title>
            </circle>
          ))}
        </g>
      </svg>
      {l.caption ? <p className={s.caption}>{l.caption}</p> : null}
    </ChartFigure>
  )
}
