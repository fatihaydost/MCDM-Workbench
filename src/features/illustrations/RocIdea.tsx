import { useId, useMemo } from 'react'
import { roc, type RocFormula } from '../../core/methods/roc'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { scaleLinear } from '../charts/scale'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { argMax } from './geometry'
import s from './illustrations.module.css'

export type RocIdeaLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  rank: string
  roc: string
  rs: string
  rr: string
  weight: string
  showTable: string
  /** Header of the first table column. */
  criterion: string
}

/** Development defaults only: the pages pass translated labels. */
export const ROC_IDEA_LABELS_EN: RocIdeaLabels = {
  title: 'Ordinal ranks become cardinal weights',
  caption: '● ROC · ■ RS · ◆ RR',
  rank: 'Rank r',
  roc: 'ROC',
  rs: 'RS',
  rr: 'RR',
  weight: 'Weight w',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type RocIdeaProps = {
  problem: Problem
  formula?: RocFormula | undefined
  ranks?: readonly number[] | undefined
  /** Number format for the weights and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<RocIdeaLabels>
  /** Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. ROC_IDEA_STEPS - 1 that step, the last being the full picture. */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/** The steps of the ROC idea: 0 the rank r and ROC harmonic centroid, 1 comparison with RS and RR on the same scale, 2 the active weight bar. */
export const ROC_IDEA_STEPS = 3

const ROW = 38
const HEAD = 28
const OP = 22
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * ROC in one picture, one row per criterion, read left to right: the ordinal rank r, the three rank-order curves
 * (ROC centroid, RS linear, RR reciprocal) on a shared 0..max scale, then the resulting weight w as a bar with its
 * value. Every number comes from the core's ROC computation.
 */
export function RocIdea({
  problem,
  formula = 'roc',
  ranks,
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: RocIdeaProps) {
  const l = { ...ROC_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)

  const computed = useMemo(() => {
    try {
      const base = ranks ? { ranks: [...ranks] } : {}
      const rocRes = roc.compute(problem, { ...base, formula: 'roc' })
      const rsRes = roc.compute(problem, { ...base, formula: 'rs' })
      const rrRes = roc.compute(problem, { ...base, formula: 'rr' })
      const rStep = rocRes.steps.find((st) => st.key === 'roc.ranks')
      const rVec = rStep && 'vector' in rStep ? rStep.vector : problem.criteria.map((_, j) => j + 1)
      return {
        ranks: rVec,
        roc: rocRes.weights,
        rs: rsRes.weights,
        rr: rrRes.weights,
      }
    } catch {
      return null
    }
  }, [problem, ranks])

  if (!computed) return null

  const activeWeights = formula === 'rs' ? computed.rs : formula === 'rr' ? computed.rr : computed.roc
  const n = problem.criteria.length
  const hasSpread = activeWeights.length > 1 && Math.max(...activeWeights) - Math.min(...activeWeights) > 1e-12
  const hi = hasSpread ? argMax(activeWeights) : -1
  const weightTexts = activeWeights.map((w) => format(w))
  const formatRank = (rVal: number) => (Number.isInteger(rVal) ? String(rVal) : format(rVal))

  // Columns: name | rank | strip (ROC / RS / RR) | → | weight + value.
  const W = Math.max(width, 280)
  const rankW = 36
  const nameW = Math.ceil(
    Math.min(Math.max(...problem.criteria.map((c) => estimateTextWidth(c.name, 13))) + 12, W * 0.24),
  )
  const valueW = Math.ceil(Math.max(...weightTexts.map((t) => estimateTextWidth(t, 13))) + 8)
  const free = Math.max(120, W - nameW - rankW - valueW - OP)
  const stripW = free * 0.52
  const weightW = free - stripW
  const xRank = nameW
  const x0 = nameW + rankW
  const x1 = x0 + stripW + OP
  const pad = 6
  const maxAll = Math.max(...computed.roc, ...computed.rs, ...computed.rr, 1e-9)
  const strip = scaleLinear([0, maxAll], [x0 + pad, x0 + stripW - pad])
  const maxActive = Math.max(...activeWeights, 1e-9)
  const height = HEAD + n * ROW
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), ROC_IDEA_STEPS - 1) : ROC_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')

  const table: ChartTable = {
    corner: l.criterion,
    columns: [l.rank, l.roc, l.rs, l.rr, l.weight],
    rows: problem.criteria.map((c, j) => ({
      label: c.name,
      cells: [
        formatRank(computed.ranks[j]!),
        format(computed.roc[j]!),
        format(computed.rs[j]!),
        format(computed.rr[j]!),
        weightTexts[j]!,
      ],
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
        <text className={s.colHead} x={xRank} y={HEAD - 10}>
          {truncate(l.rank, rankW - 4, 12)}
        </text>
        <text className={s.colHead} x={x0 + pad} y={HEAD - 10}>
          {truncate(`${l.roc} / ${l.rs} / ${l.rr}`, stripW - pad, 12)}
        </text>
        <text className={`${s.colHead} ${s.stageItem}`} data-off={off(2)} x={x1} y={HEAD - 10}>
          {truncate(l.weight, weightW + valueW, 12)}
        </text>
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />
        {problem.criteria.map((c, j) => {
          const y = HEAD + j * ROW + ROW / 2
          const rVal = computed.ranks[j]!
          const xZero = strip(0)
          const xRoc = strip(computed.roc[j]!)
          const xRs = strip(computed.rs[j]!)
          const xRr = strip(computed.rr[j]!)
          const xActive = formula === 'rs' ? xRs : formula === 'rr' ? xRr : xRoc
          const ww = (activeWeights[j]! / maxActive) * weightW
          const on = j === hi
          const short = truncate(c.name, nameW - 12, 13)
          return (
            <g key={j} data-criterion={j}>
              <text className={s.critName} x={0} y={y} dominantBaseline="central">
                {short !== c.name ? <title>{c.name}</title> : null}
                {short}
              </text>
              <text className={s.barValue} x={xRank} y={y} dominantBaseline="central" data-highlight={on || undefined}>
                #{formatRank(rVal)}
              </text>
              <line className={s.stripBase} x1={xZero} x2={strip(maxAll)} y1={y} y2={y} />
              {/* Stage 0+: active formula ruler from 0 to w_j(active) and ROC circle marker */}
              <path
                className={s.sigma}
                data-emph={formula === 'roc' ? '' : undefined}
                d={`M${xZero} ${y}H${stage === 0 ? xRoc : Math.max(xRoc, xRs, xRr, xActive)}`}
              />
              <circle
                className={s.stripDot}
                data-active={formula === 'roc' ? '' : undefined}
                style={formula === 'roc' ? { fill: 'var(--data-accent)' } : undefined}
                cx={xRoc}
                cy={y}
                r={4}
              />
              {/* Stage 1+: RS (square) and RR (diamond) markers on the same strip */}
              <rect
                className={`${s.stripDot} ${s.stageItem}`}
                data-off={off(1)}
                data-active={formula === 'rs' ? '' : undefined}
                style={formula === 'rs' ? { fill: 'var(--data-accent)' } : undefined}
                x={xRs - 3}
                y={y - 3}
                width={6}
                height={6}
              />
              <polygon
                className={`${s.stripDot} ${s.stageItem}`}
                data-off={off(1)}
                data-active={formula === 'rr' ? '' : undefined}
                style={formula === 'rr' ? { fill: 'var(--data-accent)' } : undefined}
                points={`${xRr},${y - 4.5} ${xRr + 4.5},${y} ${xRr},${y + 4.5} ${xRr - 4.5},${y}`}
              />
              {/* Stage 2+: arrow and active weight bar */}
              <path
                className={`${s.op} ${s.stageItem}`}
                data-off={off(2)}
                d={`M${x1 - OP + 5} ${y}h${OP - 10}m-3.5 -3.5 3.5 3.5 -3.5 3.5`}
              />
              <rect
                className={`${s.bar} ${s.criticBar} ${s.stageItem}`}
                data-off={off(2)}
                data-highlight={on || undefined}
                width={1}
                height={1}
                style={{
                  transform:
                    stage >= 2
                      ? `translate(${x1}px, ${y - 7}px) scale(${Math.max(ww, 1)}, 14)`
                      : `translate(${xZero}px, ${y - 2}px) scale(${Math.max(xActive - xZero, 1)}, 4)`,
                }}
              />
              <text
                className={`${s.barValue} ${s.stageItem} ${s.criticValue}`}
                data-off={off(2)}
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
