import { useId, useMemo } from 'react'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { argMax, merecParts, stackSegments } from './geometry'
import s from './illustrations.module.css'

export type MerecIdeaLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  /** Column head of the stacked drops (one segment per alternative, the total is E). */
  drop: string
  /** Table column of E. */
  effect: string
  weight: string
  /** Optional head of the weight column with the divisor, e.g. (2.9705) => "Weight = E / 2.9705". */
  weightHead?: ((total: string) => string) | undefined
  showTable: string
  /** Header of the first table column. */
  criterion: string
}

/** Development defaults only: the pages pass translated labels. */
export const MEREC_IDEA_LABELS_EN: MerecIdeaLabels = {
  title: 'Remove a criterion, see how much the scores drop',
  drop: 'Drops in S, sum E',
  effect: 'Removal effect E',
  weight: 'Weight',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type MerecIdeaProps = {
  problem: Problem
  /** Number format for E, the weights and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<MerecIdeaLabels>
  /** Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. MEREC_IDEA_STEPS - 1 that step, the last being the full picture. */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/** The steps of the MEREC idea: 0 the criteria, 1 what removing each costs every alternative, 2 their total E, 3 the weight E / ΣE. */
export const MEREC_IDEA_STEPS = 4

const ROW = 36
const HEAD = 28
const OP = 22
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * MEREC in one picture, one row per criterion, read left to right: what removing the criterion costs each
 * alternative (S_i - S'_ij) as segments of one bar, so the bar's length is the removal effect E_j; then the weight
 * w = E / ΣE as a bar with its value, the largest in the accent. Both bars share their row's scale idea: relative to
 * the largest. Steps through its story on the method page (IdeaSteps). Every number comes from the core's MEREC steps.
 */
export function MerecIdea({ problem, format = defaultFormat, labels, step, explain = false, className }: MerecIdeaProps) {
  const l = { ...MEREC_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  // Resizing redraws at once, also while stepping (the bars only move on a step change).
  const animate = useAnimateValues(width)
  const parts = useMemo(() => merecParts(problem), [problem])
  if (!parts) return null

  const n = problem.criteria.length
  const hasSpread = parts.weights.length > 1 && Math.max(...parts.weights) - Math.min(...parts.weights) > 1e-12
  const hi = hasSpread ? argMax(parts.weights) : -1
  const weightTexts = parts.weights.map((w) => format(w))
  const effectTexts = parts.effect.map((e) => format(e))
  const total = parts.effect.reduce((a, b) => a + b, 0)
  const weightHead = l.weightHead && total > 0 ? l.weightHead(format(total)) : l.weight

  // Columns: name | drops stack + E | → | weight + value.
  const W = Math.max(width, 280)
  const nameW = Math.ceil(Math.min(Math.max(...problem.criteria.map((c) => estimateTextWidth(c.name, 13))) + 12, W * 0.26))
  const valueW = Math.ceil(Math.max(...weightTexts.map((t) => estimateTextWidth(t, 13))) + 8)
  const effectW = Math.ceil(Math.max(...effectTexts.map((t) => estimateTextWidth(t, 13))) + 8)
  const pad = 6
  const free = Math.max(80, W - nameW - valueW - effectW - pad - OP)
  const stripW = free * 0.55 + effectW + pad
  const weightW = free * 0.45
  const x0 = nameW
  const x1 = x0 + stripW + OP
  const maxEffect = Math.max(...parts.effect) || 1
  const unit = Math.max(stripW - pad - effectW, 20) / maxEffect
  const maxWeight = Math.max(...parts.weights) || 1
  const height = HEAD + n * ROW
  const stage = step !== null && step !== undefined ? Math.min(Math.max(step, 0), MEREC_IDEA_STEPS - 1) : MEREC_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')
  const table: ChartTable = {
    corner: l.criterion,
    columns: [...problem.alternatives, l.effect, l.weight],
    rows: problem.criteria.map((c, j) => ({
      label: c.name,
      cells: [...parts.drops[j]!.map((d) => format(d)), effectTexts[j]!, weightTexts[j]!],
    })),
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
        role="img"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
      >
        <text className={`${s.colHead} ${s.stageItem}`} data-off={off(1)} x={x0 + pad} y={HEAD - 10}>
          {truncate(l.drop, stripW - pad, 12)}
        </text>
        <text className={`${s.colHead} ${s.stageItem}`} data-off={off(3)} x={x1} y={HEAD - 10}>
          {truncate(weightHead, weightW + valueW, 12)}
        </text>
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />
        {problem.criteria.map((c, j) => {
          const y = HEAD + j * ROW + ROW / 2
          const segments = stackSegments(parts.drops[j]!, x0 + pad, unit)
          const end = x0 + pad + parts.effect[j]! * unit
          const ww = (parts.weights[j]! / maxWeight) * weightW
          const on = j === hi
          const short = truncate(c.name, nameW - 12, 13)
          return (
            <g key={j} data-criterion={j}>
              <text className={s.critName} x={0} y={y} dominantBaseline="central">
                {short !== c.name ? <title>{c.name}</title> : null}
                {short}
              </text>
              {segments.map((g) =>
                g.width > 0 ? (
                  // stripDot's background stroke draws the gap between alternatives.
                  <rect key={g.col} className={`${s.stripDot} ${s.stageItem}`} data-off={off(1)} x={g.x} y={y - 6} width={g.width} height={12}>
                    <title>{`${problem.alternatives[g.col]}: ${format(g.value)}`}</title>
                  </rect>
                ) : null,
              )}
              <text className={`${s.barValue} ${s.stageItem} ${s.criticValue}`} data-off={off(2)} x={end + 6} y={y} dominantBaseline="central" data-effect={parts.effect[j]}>
                {effectTexts[j]}
              </text>
              <path className={`${s.op} ${s.stageItem}`} data-off={off(3)} d={`M${x1 - OP + 5} ${y}h${OP - 10}m-3.5 -3.5 3.5 3.5 -3.5 3.5`} />
              {/* The weight bar waits, hidden, on the stack of drops, so it comes out of it and is stretched. */}
              <rect
                className={`${s.bar} ${s.criticBar} ${s.stageItem}`}
                data-off={stage < 3 || parts.weights[j] === 0 ? '' : undefined}
                data-highlight={on || undefined}
                width={1}
                height={1}
                style={{
                  transform:
                    stage >= 3
                      ? `translate(${x1}px, ${y - 7}px) scale(${ww > 0 ? Math.max(ww, 1) : 0}, 14)`
                      : `translate(${x0 + pad}px, ${y - 6}px) scale(${Math.max(end - x0 - pad, 1)}, 12)`,
                }}
              />
              <text className={`${s.barValue} ${s.stageItem} ${s.criticValue}`} data-off={off(3)} data-highlight={on || undefined} x={x1 + ww + 6} y={y} dominantBaseline="central">
                {weightTexts[j]}
              </text>
              {j < n - 1 ? <line className={s.rowRule} x1={0} x2={W} y1={y + ROW / 2 - 0.5} y2={y + ROW / 2 - 0.5} /> : null}
            </g>
          )
        })}
      </svg>
      {l.caption ? <p className={s.caption}>{l.caption}</p> : null}
    </ChartFigure>
  )
}
