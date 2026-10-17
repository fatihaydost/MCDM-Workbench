import { useId, useMemo } from 'react'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useElementWidth } from '../charts/useElementWidth'
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
  className?: string | undefined
}

const ROW = 36
const HEAD = 28
const OP = 22
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * MEREC in one picture, one row per criterion, read left to right: what removing the criterion costs each
 * alternative (S_i - S'_ij) as segments of one bar, so the bar's length is the removal effect E_j; then the weight
 * w = E / ΣE as a bar with its value, the largest in the accent. Both bars share their row's scale idea: relative to
 * the largest. Static: no motion. Every number comes from the core's MEREC steps.
 */
export function MerecIdea({ problem, format = defaultFormat, labels, className }: MerecIdeaProps) {
  const l = { ...MEREC_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const parts = useMemo(() => merecParts(problem), [problem])
  if (!parts) return null

  const n = problem.criteria.length
  const hi = argMax(parts.weights)
  const weightTexts = parts.weights.map((w) => format(w))
  const effectTexts = parts.effect.map((e) => format(e))
  const total = parts.effect.reduce((a, b) => a + b, 0)
  const weightHead = l.weightHead && total > 0 ? l.weightHead(format(total)) : l.weight

  // Columns: name | drops stack + E | → | weight + value.
  const W = Math.max(width, 280)
  const nameW = Math.ceil(Math.min(Math.max(...problem.criteria.map((c) => estimateTextWidth(c.name, 13))) + 12, W * 0.26))
  const valueW = Math.ceil(Math.max(...weightTexts.map((t) => estimateTextWidth(t, 13))) + 8)
  const effectW = Math.ceil(Math.max(...effectTexts.map((t) => estimateTextWidth(t, 13))) + 8)
  const free = Math.max(120, W - nameW - valueW - OP)
  const stripW = free * 0.55
  const weightW = free - stripW
  const x0 = nameW
  const x1 = x0 + stripW + OP
  const pad = 6
  const maxEffect = Math.max(...parts.effect) || 1
  const unit = Math.max(stripW - pad - effectW, 20) / maxEffect
  const maxWeight = Math.max(...parts.weights) || 1
  const height = HEAD + n * ROW
  const table: ChartTable = {
    corner: l.criterion,
    columns: [l.effect, l.weight],
    rows: problem.criteria.map((c, j) => ({ label: c.name, cells: [effectTexts[j]!, weightTexts[j]!] })),
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
        className={s.svg}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
      >
        <text className={s.colHead} x={x0 + pad} y={HEAD - 10}>
          {truncate(l.drop, stripW - pad, 12)}
        </text>
        <text className={s.colHead} x={x1} y={HEAD - 10}>
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
                  <rect key={g.col} className={s.stripDot} x={g.x} y={y - 6} width={g.width} height={12}>
                    <title>{`${problem.alternatives[g.col]}: ${format(g.value)}`}</title>
                  </rect>
                ) : null,
              )}
              <text className={s.barValue} x={end + 6} y={y} dominantBaseline="central" data-effect={parts.effect[j]}>
                {effectTexts[j]}
              </text>
              <path className={s.op} d={`M${x1 - OP + 5} ${y}h${OP - 10}m-3.5 -3.5 3.5 3.5 -3.5 3.5`} />
              <rect className={s.bar} data-highlight={on || undefined} x={x1} y={y - 7} width={Math.max(ww, 1)} height={14} />
              <text className={s.barValue} data-highlight={on || undefined} x={x1 + ww + 6} y={y} dominantBaseline="central">
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
