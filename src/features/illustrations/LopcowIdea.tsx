import { useId, useMemo } from 'react'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { scaleLinear } from '../charts/scale'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { argMax, lopcowParts } from './geometry'
import s from './illustrations.module.css'

export type LopcowIdeaLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  /** Column heads: root-mean-square and spread on the 0..1 strip, percentage value PV, and weight. */
  rms: string
  stdDev: string
  pv: string
  weight: string
  /** Optional head of the weight column with the divisor, e.g. (346.7408) => "Weight = PV / 346.7408". */
  weightHead?: ((total: string) => string) | undefined
  showTable: string
  /** Header of the first table column. */
  criterion: string
}

/** Development defaults only: the pages pass translated labels. */
export const LOPCOW_IDEA_LABELS_EN: LopcowIdeaLabels = {
  title: 'Log ratio of root-mean-square to spread gives the weight',
  rms: 'RMS',
  stdDev: 'Spread σ',
  pv: 'Percentage value PV',
  weight: 'Weight',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type LopcowIdeaProps = {
  problem: Problem
  /** Number format for the values and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<LopcowIdeaLabels>
  /** Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. LOPCOW_IDEA_STEPS - 1 that step. */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the LOPCOW idea: 0 normalized values on 0..1 with RMS as a ruler from 0, 1 sample standard deviation σ
 * as a second ruler from 0 below RMS on the same scale, 2 PV = |ln(RMS / σ) * 100| as a bar, 3 weight w = PV / ΣPV.
 */
export const LOPCOW_IDEA_STEPS = 4

const ROW = 40
const HEAD = 28
const OP = 22
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * LOPCOW in one picture, one row per criterion, read left to right: the normalized values as dots on 0..1 with both
 * RMS and sample σ drawn as rulers from 0 on that same 0..1 scale (since RMS >= σ always, the gap between the two
 * rulers is the log ratio ln(RMS / σ)), then the resulting weight w = PV / ΣPV as a bar with its value.
 * Every number comes from the core's LOPCOW steps.
 */
export function LopcowIdea({ problem, format = defaultFormat, labels, step, explain = false, className }: LopcowIdeaProps) {
  const l = { ...LOPCOW_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(() => lopcowParts(problem), [problem])
  if (!parts) return null

  const n = problem.criteria.length
  const hasSpread = parts.weights.length > 1 && Math.max(...parts.weights) - Math.min(...parts.weights) > 1e-12
  const hi = hasSpread ? argMax(parts.weights) : -1
  const weightTexts = parts.weights.map((w) => format(w))
  const pvTexts = parts.pv.map((v) => format(v))
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), LOPCOW_IDEA_STEPS - 1) : LOPCOW_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')
  const only = (at: number) => (stepping && stage === at ? undefined : '')
  const steppable = step !== undefined
  const total = parts.pv.reduce((a, b) => a + b, 0)
  const weightHead = l.weightHead && total > 0 ? l.weightHead(format(total)) : l.weight
  const stripHead = stage === 0 && stepping ? l.rms : stage === 1 && stepping ? l.stdDev : `${l.rms} / ${l.stdDev}`

  // Columns: name | 0..1 strip (dots + RMS ruler + σ ruler) | → | PV / weight bar + value.
  const W = Math.max(width, 280)
  const nameW = Math.ceil(Math.min(Math.max(...problem.criteria.map((c) => estimateTextWidth(c.name, 13))) + 12, W * 0.26))
  const valueW = Math.ceil(Math.max(...[...weightTexts, ...(steppable ? pvTexts : [])].map((t) => estimateTextWidth(t, 13))) + 8)
  const free = Math.max(120, W - nameW - valueW - OP)
  const stripW = free * 0.55
  const weightW = free - stripW
  const x0 = nameW
  const x1 = x0 + stripW + OP
  const pad = 6
  const strip = scaleLinear([0, 1], [x0 + pad, x0 + stripW - pad])
  const maxPv = Math.max(...parts.pv, 0)
  const maxWeight = Math.max(...parts.weights) || 1
  const height = HEAD + n * ROW
  const table: ChartTable = {
    corner: l.criterion,
    columns: [l.rms, l.stdDev, l.pv, l.weight],
    rows: problem.criteria.map((c, j) => ({
      label: c.name,
      cells: [format(parts.rms[j]!), format(parts.stdDev[j]!), pvTexts[j]!, weightTexts[j]!],
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
        <text className={`${s.colHead} ${s.stageItem}`} data-off={off(0)} x={x0 + pad} y={HEAD - 10}>
          {truncate(stripHead, stripW - pad, 12)}
        </text>
        {steppable ? (
          <text className={`${s.colHead} ${s.stageItem} ${s.criticValue}`} data-off={only(2)} x={x1} y={HEAD - 10}>
            {truncate(l.pv, weightW + valueW, 12)}
          </text>
        ) : null}
        <text className={`${s.colHead} ${s.stageItem} ${s.criticValue}`} data-off={off(3)} x={x1} y={HEAD - 10}>
          {truncate(weightHead, weightW + valueW, 12)}
        </text>
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />
        {problem.criteria.map((c, j) => {
          const y = HEAD + j * ROW + ROW / 2
          const col = parts.normalized.map((row) => row[j]!)
          const q = parts.rms[j]!
          const sg = parts.stdDev[j]!
          const lo = strip(0)
          const rmsX = strip(q)
          const sdX = strip(sg)
          const pvw = maxPv > 0 ? (parts.pv[j]! / maxPv) * weightW : 0
          const ww = (parts.weights[j]! / maxWeight) * weightW
          const bw = stage === 2 ? pvw : ww
          const on = j === hi && stage === 3
          const short = truncate(c.name, nameW - 12, 13)
          return (
            <g key={j} data-criterion={j}>
              <text className={s.critName} x={0} y={y} dominantBaseline="central">
                {short !== c.name ? <title>{c.name}</title> : null}
                {short}
              </text>
              <line className={s.stripBase} x1={strip(0)} x2={strip(1)} y1={y - 6} y2={y - 6} />
              {col.map((v, i) => (
                <circle key={i} className={s.stripDot} cx={strip(v)} cy={y - 6} r={3.5} />
              ))}
              {/* RMS ruler from 0 on the 0..1 scale. */}
              <path
                className={`${s.sigma} ${s.stageItem}`}
                data-off={off(0)}
                data-emph={stepping && stage === 0 ? '' : undefined}
                data-rms={q}
                d={`M${lo} ${y + 3}H${rmsX}M${lo} ${y + 0.5}v5M${rmsX} ${y + 0.5}v5`}
              />
              <text className={`${s.sigmaValue} ${s.stageItem}`} data-off={only(0)} x={rmsX + 5} y={y + 3} dominantBaseline="central">
                {format(q)}
              </text>
              {/* Sample standard deviation σ ruler from 0 below RMS on the same 0..1 scale. */}
              <path
                className={`${s.sigma} ${s.stageItem}`}
                data-off={off(1)}
                data-emph={stepping && stage === 1 ? '' : undefined}
                data-sigma={sg}
                d={`M${lo} ${y + 10}H${sdX}M${lo} ${y + 7.5}v5M${sdX} ${y + 7.5}v5`}
              />
              <text className={`${s.sigmaValue} ${s.stageItem}`} data-off={only(1)} x={sdX + 5} y={y + 10} dominantBaseline="central">
                {format(sg)}
              </text>
              <path className={`${s.op} ${s.stageItem}`} data-off={off(2)} d={`M${x1 - OP + 5} ${y}h${OP - 10}m-3.5 -3.5 3.5 3.5 -3.5 3.5`} />
              {/* PV at step 2, then weight w = PV / ΣPV at step 3 (same relative bar lengths). */}
              <rect
                className={`${s.bar} ${s.criticBar} ${s.stageItem}`}
                data-off={off(2) || (parts.pv[j] === 0 ? '' : undefined)}
                data-highlight={on || undefined}
                width={1}
                height={1}
                style={{
                  transform:
                    stage >= 2
                      ? `translate(${x1}px, ${y - 7}px) scale(${bw > 0 ? Math.max(bw, 1) : 0}, 14)`
                      : `translate(${lo}px, ${y + 1}px) scale(${Math.max(rmsX - lo, 1)}, 4)`,
                }}
              />
              {steppable ? (
                <text className={`${s.barValue} ${s.stageItem} ${s.criticValue}`} data-off={only(2)} x={x1 + pvw + 6} y={y} dominantBaseline="central">
                  {pvTexts[j]}
                </text>
              ) : null}
              <text
                className={`${s.barValue} ${s.stageItem} ${s.criticValue}`}
                data-off={off(3)}
                data-highlight={on || undefined}
                x={x1 + ww + 6}
                y={y}
                dominantBaseline="central"
              >
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
