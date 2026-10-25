import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { minMaxNormalize } from '../../core/math'
import { mabac } from '../../core/methods/mabac'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import s from './illustrations.module.css'
import b from './mabac.module.css'

export type MabacParts = {
  /** Distance to the border, alternatives x criteria. */
  q: number[][]
  /** Score S per alternative. */
  scores: number[]
  /** 1-based competition ranks per alternative. */
  ranking: number[]
  /** The min-max weighted sum per alternative (= S + B). */
  sum: number[]
  /** The constant B every S is shifted by from the min-max weighted sum. */
  border: number
  /** Alternatives in rank order, best first. */
  order: number[]
}

/** MABAC's numbers for the pictures, or null when the core cannot rank this problem. */
export function mabacParts(problem: Problem, weights: readonly number[]): MabacParts | null {
  let res
  try {
    res = mabac.compute(problem, [...weights], {})
  } catch {
    return null
  }
  const q = res.steps.find((x) => x.key === 'mabac.distance')!.matrix!
  const sum = minMaxNormalize(problem).r.map((row) => row.reduce((a, t, j) => a + t * weights[j]!, 0))
  const order = res.scores.map((_, i) => i).sort((x, y) => res.ranking[x]! - res.ranking[y]! || x - y)
  return { q, scores: res.scores, ranking: res.ranking, sum, border: res.diagnostics!.border as number, order }
}

const defaultFormat = (v: number, d: number) => v.toFixed(d)
/** A signed number: "+0.2183", "-0.0488" (the sign is part of the reading, so a positive one says so too). */
const signed = (format: (v: number, d: number) => string, v: number, d: number) =>
  v >= 0.5 * 10 ** -d ? `+${format(v, d)}` : format(Math.abs(v) < 0.5 * 10 ** -d ? 0 : v, d)
const sign = (v: number) => (v > 0 ? 'up' : v < 0 ? 'down' : undefined)

export type MabacBorderLabels = {
  title: string
  caption?: string | undefined
  showTable: string
  alternative: string
  /** Column head over the scores: "S". */
  score: string
  /** Accessible name of one row and its readout: "Forklift 2: S = +0.2183, above the border on 8 of 10 criteria". */
  row: (alternative: string, score: string, above: number, n: number) => string
}

export const MABAC_BORDER_LABELS_EN: MabacBorderLabels = {
  title: 'Above or below the border',
  showTable: 'Show as table',
  alternative: 'Alternative',
  score: 'S',
  row: (a, sc, up, n) => `${a}: S = ${sc}, above the border on ${up} of ${n} criteria`,
}

export type MabacBorderProps = {
  problem: Problem
  weights: readonly number[]
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<MabacBorderLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. MABAC_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture. While stepping the rows are inert (no hover, no focus target).
   */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the MABAC idea: 0 the border G in every row with the upper and lower area around it, 1 the distance q
 * of every criterion from G, a stick up or down out of the border, 2 the sum of the sticks, the score S, which is the
 * full picture.
 */
export const MABAC_IDEA_STEPS = 3

const FONT = 13
const HEAD = 22
const ROW = 40
const HALF = 15
const NAME_LINE = 20
const STACK_BELOW = 380
const GAP = 8

/**
 * MABAC as a picture: every row is one alternative (rank order, best first) and every criterion a stick from the
 * border line G, up into the upper area (towards the best value, accent) or down into the lower area (towards the
 * worst, the negative colour), all on one scale. The sticks add up to S, drawn on the right as one bar from zero.
 * Hover or focus a row (up / down) to read it. Static at first paint; new numbers move the sticks at --dur-data.
 */
export function MabacBorder({ problem, weights, format = defaultFormat, labels, step, explain = false, className }: MabacBorderProps) {
  const l = { ...MABAC_BORDER_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(() => mabacParts(problem, weights), [problem, weights])
  const [activeRow, setActive] = useState<number | null>(null)
  const [focusRow, setFocusRow] = useState(0)
  if (!parts) return null

  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), MABAC_IDEA_STEPS - 1) : MABAC_IDEA_STEPS - 1
  const active = stepping ? null : activeRow
  // Until its step a stick or the S bar is drawn at no length, invisible.
  const sticksOff = stage >= 1 ? undefined : ''
  const scoreOff = stage >= 2 ? undefined : ''

  const { q, scores, ranking, order } = parts
  const names = problem.alternatives
  const crit = problem.criteria.map((c) => c.name)
  const m = names.length
  const n = crit.length
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW
  const texts = scores.map((v) => signed(format, v, 4))
  const above = q.map((row) => row.filter((x) => x > 0).length)
  const rowText = (i: number) => l.row(names[i]!, texts[i]!, above[i]!, n)

  const valueWidth = Math.ceil(Math.max(...texts.map((t) => estimateTextWidth(t, FONT)))) + GAP
  const maxName = Math.max(...names.map((x) => estimateTextWidth(x, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP * 2, Math.max(W * 0.26, 64)))
  const stripLeft = labelWidth
  const avail = Math.max(80, W - stripLeft - valueWidth - GAP * 2)
  const scoreWidth = Math.round(Math.min(140, Math.max(40, avail * 0.35)))
  const stripRight = Math.max(stripLeft + 40, W - valueWidth - scoreWidth - GAP * 2)
  const gridW = Math.max(stripRight - stripLeft, 40)
  const cell = gridW / n
  const stick = Math.max(2, Math.min(14, cell * 0.55))
  const maxQ = Math.max(...q.flat().map(Math.abs), 1e-12)
  const unitQ = HALF / maxQ

  const sLeft = stripLeft + gridW + GAP * 2
  const neg = Math.max(-Math.min(...scores), 0)
  const pos = Math.max(Math.max(...scores), 0)
  const unitS = scoreWidth / Math.max(neg + pos, 1e-12)
  const zero = sLeft + neg * unitS

  const rowStep = stacked ? NAME_LINE + ROW : ROW
  const mid = (stacked ? NAME_LINE : 0) + ROW / 2
  const height = HEAD + m * rowStep
  const focus = Math.min(focusRow, m - 1)

  const table: ChartTable = {
    corner: l.alternative,
    columns: [...crit.map((c) => `q ${c}`), l.score],
    rows: order.map((i) => ({ label: names[i]!, cells: [...q[i]!.map((x) => signed(format, x, 4)), texts[i]!] })),
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
        data-testid="mabac-border"
      >
        <g aria-hidden>
          {crit.map((c, j) => {
            const short = truncate(c, cell - 2, 11)
            return cell >= 32 ? (
              <text key={j} className={b.head} x={stripLeft + (j + 0.5) * cell} y={HEAD / 2} textAnchor="middle" dominantBaseline="central">
                <title>{c}</title>
                {short}
              </text>
            ) : null
          })}
          <text className={`${b.head} ${s.stageItem}`} data-off={scoreOff} x={zero} y={HEAD / 2} textAnchor="middle" dominantBaseline="central">
            {l.score}
          </text>
          <line className={`${b.zero} ${s.stageItem}`} data-off={scoreOff} x1={zero} x2={zero} y1={HEAD} y2={height} />
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)}>
          {order.map((i, row) => {
            const short = truncate(names[i]!, stacked ? W : labelWidth - GAP, FONT)
            const end = scores[i]! * unitS
            return (
              <g
                key={i}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${HEAD + row * rowStep}px)` }}
                data-highlight={ranking[i] === 1 || undefined}
                data-testid="mabac-row"
              >
                <text className={s.sawName} x={0} y={stacked ? NAME_LINE / 2 : mid} dominantBaseline="central">
                  {short !== names[i] ? <title>{names[i]}</title> : null}
                  {short}
                </text>
                {/* The two areas around the border: tinted bands, then the border line itself. */}
                <rect className={b.upper} x={stripLeft} y={mid - HALF} width={stripRight - stripLeft} height={HALF} aria-hidden />
                <rect className={b.lower} x={stripLeft} y={mid} width={stripRight - stripLeft} height={HALF} aria-hidden />
                {q[i]!.map((x, j) => (
                  <rect
                    key={j}
                    className={b.stick}
                    data-sign={sign(x)}
                    data-off={sticksOff}
                    data-testid="mabac-q"
                    x={0}
                    y={0}
                    width={stick}
                    height={1}
                    style={{ transform: `translate(${stripLeft + (j + 0.5) * cell - stick / 2}px, ${mid}px) scale(1, ${(stage >= 1 && -x * unitQ) || 0.001})` }}
                    aria-hidden
                  />
                ))}
                <line className={b.border} x1={stripLeft} x2={stripRight} y1={mid} y2={mid} aria-hidden />
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
                <text className={`${s.sawValue} ${s.stageItem}`} data-off={scoreOff} x={W} y={mid} textAnchor="end" dominantBaseline="central" data-testid="mabac-s">
                  {texts[i]}
                </text>
                {/* One focus target per row: the whole row, so its name reads the row. */}
                {/* A transparent cell per criterion over the row, so hovering the strip names the criterion. */}
                {crit.map((c, j) => (
                  <rect key={j} x={stripLeft + j * cell} y={stacked ? 0 : 1} width={cell} height={rowStep - 2} fill="transparent" onMouseEnter={stepping ? undefined : () => setActive(row)}>
                    <title>{c}</title>
                  </rect>
                ))}
                <rect
                  className={b.hit}
                  data-on={active === row || undefined}
                  data-row={row}
                  x={0}
                  y={stacked ? 0 : 1}
                  width={W}
                  height={rowStep - 2}
                  tabIndex={focus === row && !stepping ? 0 : -1}
                  role="img"
                  aria-label={rowText(i)}
                  onMouseEnter={stepping ? undefined : () => setActive(row)}
                  onFocus={() => {
                    setFocusRow(row)
                    setActive(row)
                  }}
                  onBlur={() => setActive(null)}
                />
              </g>
            )
          })}
        </g>
      </svg>
      <p className={s.readout}>
        {shown !== null ? (
          <span className={s.readoutC} aria-hidden>
            {rowText(shown)}
          </span>
        ) : (
          // Hidden, not removed, before the last step: the picture above keeps its place.
          <span className={stage >= MABAC_IDEA_STEPS - 1 ? undefined : 'invisible'}>{l.caption ?? ' '}</span>
        )}
      </p>
    </ChartFigure>
  )
}

export type MabacSumLineLabels = {
  title: string
  caption?: string | undefined
  showTable: string
  alternative: string
  /** Axis titles: "Min-max weighted sum", "MABAC S". */
  x: string
  y: string
  /** The line's label, from the formatted constant: "S = sum - B, B = 0.0921". */
  line: (border: string) => string
}

export const MABAC_SUM_LINE_LABELS_EN: MabacSumLineLabels = {
  title: 'Same order as a min-max weighted sum',
  showTable: 'Show as table',
  alternative: 'Alternative',
  x: 'Min-max weighted sum',
  y: 'MABAC S',
  line: (border) => `S = sum - B, B = ${border}`,
}

export type MabacSumLineProps = {
  problem: Problem
  weights: readonly number[]
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<MabacSumLineLabels>
  className?: string | undefined
}

const PAD = { left: 52, right: 16, top: 28, bottom: 40 }

/**
 * Why MABAC orders like a min-max weighted sum: x is that sum, y is S, one dot per alternative. S = sum - B with one B
 * for the whole table, so every dot sits on one line of slope 1, and the border only decides where S = 0 falls (the
 * dashed line): dots above it are positive, below it negative. Both axes span 1 on the same scale. Static.
 */
export function MabacSumLine({ problem, weights, format = defaultFormat, labels, className }: MabacSumLineProps) {
  const l = { ...MABAC_SUM_LINE_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const parts = useMemo(() => mabacParts(problem, weights), [problem, weights])
  if (!parts) return null

  const { sum, scores, border, order } = parts
  const names = problem.alternatives
  const side = Math.max(120, Math.min(Math.max(width, 200) - PAD.left - PAD.right, 280))
  const W = PAD.left + side + PAD.right
  const H = PAD.top + side + PAD.bottom
  const x = (v: number) => PAD.left + v * side
  // y runs from -B to 1 - B, the same span as x.
  const y = (v: number) => PAD.top + (1 - (v + border)) * side

  const table: ChartTable = {
    corner: l.alternative,
    columns: [l.x, l.y],
    rows: order.map((i) => ({ label: names[i]!, cells: [format(sum[i]!, 4), signed(format, scores[i]!, 4)] })),
  }

  return (
    <ChartFigure titleId={`${uid}-title`} tableId={`${uid}-table`} title={l.title} showTable={l.showTable} table={table} plotRef={plotRef} className={className}>
      <svg className={s.svg} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-table`} data-testid="mabac-sum-line">
        <g aria-hidden>
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line className={s.marcosGrid} x1={x(v)} x2={x(v)} y1={y(-border)} y2={y(1 - border)} />
              <text className={s.colHead} x={x(v)} y={y(-border) + 14} textAnchor="middle" dominantBaseline="central">
                {format(v, v === 0.5 ? 1 : 0)}
              </text>
            </g>
          ))}
          {(Math.abs(border) <= 1e-9
            ? [0, 1]
            : [...(border * side >= 14 ? [-border] : []), 0, ...((1 - border) * side >= 14 ? [1 - border] : [])]
          ).map((v, k) => (
            <text key={k} className={s.colHead} x={x(0) - 6} y={y(v)} textAnchor="end" dominantBaseline="central">
              {v === 0 ? format(0, 0) : signed(format, v, 2)}
            </text>
          ))}
          <line className={s.axis} x1={x(0)} x2={x(1)} y1={y(-border)} y2={y(-border)} />
          <line className={s.axis} x1={x(0)} x2={x(0)} y1={y(-border)} y2={y(1 - border)} />
          {/* S = 0: where the border puts the sign; the line itself is the ranking. */}
          <line className={b.zero} x1={x(0)} x2={x(1)} y1={y(0)} y2={y(0)} data-testid="mabac-zero" />
          <text className={s.axisName} x={x(0.5)} y={y(-border) + 32} textAnchor="middle" dominantBaseline="central">
            {l.x}
          </text>
          <text className={s.axisName} x={x(0)} y={PAD.top - 12} textAnchor="start" dominantBaseline="central">
            {l.y}
          </text>
          <line className={s.marcosLine} x1={x(0)} y1={y(-border)} x2={x(1)} y2={y(1 - border)} data-testid="mabac-line" data-border={border} />
          <text className={s.marcosLineLabel} x={x(1)} y={Math.max(PAD.top + 14, y(1 - border) - 12)} textAnchor="end" dominantBaseline="central">
            {l.line(format(border, 4))}
          </text>
          {names.map((name, i) => (
            <circle key={i} className={b.dot} data-sign={sign(scores[i]!)} data-testid="mabac-dot" cx={x(sum[i]!)} cy={y(scores[i]!)} r={4}>
              <title>{`${name}: ${format(sum[i]!, 4)}, S = ${signed(format, scores[i]!, 4)}`}</title>
            </circle>
          ))}
        </g>
      </svg>
      {l.caption ? <p className={s.caption}>{l.caption}</p> : null}
    </ChartFigure>
  )
}
