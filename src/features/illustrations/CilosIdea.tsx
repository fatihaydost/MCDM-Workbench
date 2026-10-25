import { useId, useMemo } from 'react'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { argMax, cilosParts, stackSegments } from './geometry'
import s from './illustrations.module.css'

export type CilosIdeaLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  /** Column head of the stacked relative losses p_ij on criterion j (sum is |f_jj|). */
  loss: string
  /** Table column of total column loss |f_jj| = Σ_i p_ij. */
  totalLoss: string
  weight: string
  /** Optional head of the weight column on the method page. */
  weightHead?: string | undefined
  showTable: string
  /** Header of the first table column. */
  criterion: string
}

/** Development defaults only: the pages pass translated labels. */
export const CILOS_IDEA_LABELS_EN: CilosIdeaLabels = {
  title: 'Smaller loss under other winners, more weight',
  loss: 'Losses p_ij, sum |f_jj|',
  totalLoss: 'Total loss |f_jj|',
  weight: 'Weight',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type CilosIdeaProps = {
  problem: Problem
  /** Number format for |f_jj|, the weights and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<CilosIdeaLabels>
  /** Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. CILOS_IDEA_STEPS - 1 that step, the last being the full picture. */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/** The steps of the CILOS idea: 0 the criteria, 1 relative losses p_ij on each criterion, 2 their total |f_jj|, 3 the stationary weight w from F w = 0. */
export const CILOS_IDEA_STEPS = 4

const ROW = 36
const HEAD = 28
const OP = 22
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * CILOS in one picture, one row per criterion, read left to right: what criterion j loses (p_ij) when each
 * other criterion i's winning alternative is chosen, stacked into one bar of total length |f_jj| = Σ_i p_ij;
 * then the stationary weight w_j solving F w = 0 as a bar with its value, the largest in the accent.
 * Steps through its story on the method page (IdeaSteps). Every number comes from the core's CILOS steps.
 */
export function CilosIdea({ problem, format = defaultFormat, labels, step, explain = false, className }: CilosIdeaProps) {
  const l = { ...CILOS_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  // Resizing redraws at once, also while stepping (the bars only move on a step change).
  const animate = useAnimateValues(width)
  const parts = useMemo(() => cilosParts(problem), [problem])
  if (!parts) return null

  const n = problem.criteria.length
  const hasSpread = parts.weights.length > 1 && Math.max(...parts.weights) - Math.min(...parts.weights) > 1e-12
  const hi = hasSpread ? argMax(parts.weights) : -1
  const weightTexts = parts.weights.map((w) => format(w))
  const lossTexts = parts.totalLoss.map((tl) => format(tl))
  const weightHead = l.weightHead ?? l.weight

  // Columns: name | losses stack + |f_jj| | → | weight + value.
  const W = Math.max(width, 280)
  const nameW = Math.ceil(Math.min(Math.max(...problem.criteria.map((c) => estimateTextWidth(c.name, 13))) + 12, W * 0.26))
  const valueW = Math.ceil(Math.max(...weightTexts.map((t) => estimateTextWidth(t, 13))) + 8)
  const lossW = Math.ceil(Math.max(...lossTexts.map((t) => estimateTextWidth(t, 13))) + 8)
  const free = Math.max(120, W - nameW - valueW - OP)
  const stripW = free * 0.55
  const weightW = free - stripW
  const x0 = nameW
  const x1 = x0 + stripW + OP
  const pad = 6
  const maxLoss = Math.max(...parts.totalLoss) || 1
  const unit = Math.max(stripW - pad - lossW, 20) / maxLoss
  const maxWeight = Math.max(...parts.weights) || 1
  const height = HEAD + n * ROW
  const stage = step !== null && step !== undefined ? Math.min(Math.max(step, 0), CILOS_IDEA_STEPS - 1) : CILOS_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')
  const table: ChartTable = {
    corner: l.criterion,
    columns: [...problem.criteria.map((c) => c.name), l.totalLoss, l.weight],
    rows: problem.criteria.map((c, j) => ({
      label: c.name,
      cells: [...parts.losses[j]!.map((p) => format(p)), lossTexts[j]!, weightTexts[j]!],
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
          {truncate(l.loss, stripW - pad, 12)}
        </text>
        <text className={`${s.colHead} ${s.stageItem}`} data-off={off(3)} x={x1} y={HEAD - 10}>
          {truncate(weightHead, weightW + valueW, 12)}
        </text>
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />
        {problem.criteria.map((c, j) => {
          const y = HEAD + j * ROW + ROW / 2
          const segments = stackSegments(parts.losses[j]!, x0 + pad, unit)
          const end = x0 + pad + parts.totalLoss[j]! * unit
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
                  <rect key={g.col} className={`${s.stripDot} ${s.stageItem}`} data-off={off(1)} x={g.x} y={y - 6} width={g.width} height={12}>
                    <title>{`${problem.criteria[g.col]?.name ?? `C${g.col + 1}`}: ${format(g.value)}`}</title>
                  </rect>
                ) : null,
              )}
              <text className={`${s.barValue} ${s.stageItem} ${s.criticValue}`} data-off={off(2)} x={end + 6} y={y} dominantBaseline="central" data-loss={parts.totalLoss[j]}>
                {lossTexts[j]}
              </text>
              <path className={`${s.op} ${s.stageItem}`} data-off={off(3)} d={`M${x1 - OP + 5} ${y}h${OP - 10}m-3.5 -3.5 3.5 3.5 -3.5 3.5`} />
              <rect
                className={`${s.bar} ${s.criticBar} ${s.stageItem}`}
                data-off={off(3) || (parts.weights[j] === 0 ? '' : undefined)}
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
