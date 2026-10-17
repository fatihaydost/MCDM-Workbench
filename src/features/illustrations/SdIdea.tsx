import { useId, useMemo } from 'react'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { scaleLinear } from '../charts/scale'
import { useElementWidth } from '../charts/useElementWidth'
import { argMax, sdParts } from './geometry'
import s from './illustrations.module.css'

export type SdIdeaLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  /** Column heads: the normalized values with their σ, and the resulting weight. */
  spread: string
  weight: string
  /** Optional head of the weight column with the divisor, e.g. (1.0729) => "Weight = σ / 1.0729". */
  weightHead?: ((total: string) => string) | undefined
  showTable: string
  /** Header of the first table column. */
  criterion: string
}

/** Development defaults only: the pages pass translated labels. */
export const SD_IDEA_LABELS_EN: SdIdeaLabels = {
  title: 'Wider spread, more weight',
  spread: 'Spread σ',
  weight: 'Weight',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type SdIdeaProps = {
  problem: Problem
  /** Number format for σ, the weights and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<SdIdeaLabels>
  className?: string | undefined
}

const ROW = 36
const HEAD = 28
const OP = 22
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * SD in one picture, one row per criterion, read left to right: the normalized values as dots on 0..1 with σ under
 * them as a ruler from 0 on the same scale (as in CriticIdea), then the weight w = σ / Σσ as a bar with its value.
 * The bars are drawn relative to the largest weight, so they compare like the rulers do. Static: no motion.
 * Every number comes from the core's SD steps.
 */
export function SdIdea({ problem, format = defaultFormat, labels, className }: SdIdeaProps) {
  const l = { ...SD_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const parts = useMemo(() => sdParts(problem), [problem])
  if (!parts) return null

  const n = problem.criteria.length
  const hi = argMax(parts.weights)
  const weightTexts = parts.weights.map((w) => format(w))
  const total = parts.sigma.reduce((a, b) => a + b, 0)
  const weightHead = l.weightHead && total > 0 ? l.weightHead(format(total)) : l.weight

  // Columns: name | strip | → | weight + value.
  const W = Math.max(width, 280)
  // No fixed cap: on a wide figure long names fit; on a phone the 26 % share still truncates them.
  const nameW = Math.ceil(Math.min(Math.max(...problem.criteria.map((c) => estimateTextWidth(c.name, 13))) + 12, W * 0.26))
  const valueW = Math.ceil(Math.max(...weightTexts.map((t) => estimateTextWidth(t, 13))) + 8)
  const free = Math.max(120, W - nameW - valueW - OP)
  const stripW = free * 0.55
  const weightW = free - stripW
  const x0 = nameW
  const x1 = x0 + stripW + OP
  const pad = 6
  const strip = scaleLinear([0, 1], [x0 + pad, x0 + stripW - pad])
  const maxWeight = Math.max(...parts.weights) || 1
  const height = HEAD + n * ROW
  const table: ChartTable = {
    corner: l.criterion,
    columns: [l.spread, l.weight],
    rows: problem.criteria.map((c, j) => ({ label: c.name, cells: [format(parts.sigma[j]!), weightTexts[j]!] })),
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
          {truncate(l.spread, stripW - pad, 12)}
        </text>
        <text className={s.colHead} x={x1} y={HEAD - 10}>
          {truncate(weightHead, weightW + valueW, 12)}
        </text>
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />
        {problem.criteria.map((c, j) => {
          const y = HEAD + j * ROW + ROW / 2
          const col = parts.normalized.map((row) => row[j]!)
          const sg = parts.sigma[j]!
          const lo = strip(0)
          const hiX = strip(sg)
          const ww = (parts.weights[j]! / maxWeight) * weightW
          const on = j === hi
          const short = truncate(c.name, nameW - 12, 13)
          return (
            <g key={j} data-criterion={j}>
              <text className={s.critName} x={0} y={y} dominantBaseline="central">
                {short !== c.name ? <title>{c.name}</title> : null}
                {short}
              </text>
              <line className={s.stripBase} x1={strip(0)} x2={strip(1)} y1={y - 3} y2={y - 3} />
              {col.map((v, i) => (
                <circle key={i} className={s.stripDot} cx={strip(v)} cy={y - 3} r={3.5} />
              ))}
              <path className={s.sigma} data-sigma={sg} d={`M${lo} ${y + 7}H${hiX}M${lo} ${y + 4.5}v5M${hiX} ${y + 4.5}v5`} />
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
