import { useId, useMemo } from 'react'
import { swara, type SwaraStepRatio } from '../../core/methods/swara'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { scaleLinear } from '../charts/scale'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { argMax } from './geometry'
import s from './illustrations.module.css'

export type SwaraIdeaLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  s: string
  k: string
  q: string
  weight: string
  showTable: string
  /** Header of the first table column. */
  criterion: string
}

/** Development defaults only: the pages pass translated labels. */
export const SWARA_IDEA_LABELS_EN: SwaraIdeaLabels = {
  title: 'Step-down ratios chain into criterion weights',
  s: 'Step s',
  k: 'Coeff. k',
  q: 'Chain q',
  weight: 'Weight w',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type SwaraIdeaProps = {
  problem: Problem
  stepRatio?: SwaraStepRatio | undefined
  /** Optional explicit comparative importance ratios s_j (e.g. Keršulienė et al. 2010 Table 1). */
  s?: readonly (number | null | undefined)[] | undefined
  order?: readonly number[] | undefined
  /** Number format for the weights and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<SwaraIdeaLabels>
  /** Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. SWARA_IDEA_STEPS - 1 that step, the last being the full picture. */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/** The steps of the SWARA idea: 0 comparative ratio s_j and k_j = 1 + s_j, 1 recalculated chain q_j = q_{j-1} / k_j, 2 normalized weight bar w_j. */
export const SWARA_IDEA_STEPS = 3

const ROW = 38
const HEAD = 28
const OP = 22
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * SWARA in one picture, one row per criterion, read left to right: the comparative step ratio s_j,
 * the recalculated chain q_j = q_{j-1} / (1 + s_j) on a 0..1 strip with step-down guides from q_{j-1},
 * then the normalized weight w_j as a bar with its value. Every number comes from the core's SWARA computation.
 */
export function SwaraIdea({
  problem,
  stepRatio = 'moderate',
  s: customS,
  order,
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: SwaraIdeaProps) {
  const l = { ...SWARA_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)

  const computed = useMemo(() => {
    try {
      const res = swara.compute(problem, {
        stepRatio,
        ...(customS !== undefined ? { s: customS } : {}),
        ...(order !== undefined ? { order } : {}),
      })
      const vecOf = (key: string, fallback: number[]) => {
        const found = res.steps.find((st) => st.key === key)
        return found && 'vector' in found ? found.vector : fallback
      }
      const n = problem.criteria.length
      return {
        s: vecOf('swara.s', new Array<number>(n).fill(0)),
        k: vecOf('swara.k', new Array<number>(n).fill(1)),
        q: vecOf('swara.q', new Array<number>(n).fill(1)),
        weights: res.weights,
      }
    } catch {
      return null
    }
  }, [problem, stepRatio, customS, order])

  if (!computed) return null

  const n = problem.criteria.length
  const perm =
    order &&
    order.length === n &&
    order.every((idx) => Number.isInteger(idx) && idx >= 0 && idx < n) &&
    new Set(order).size === n
      ? order
      : problem.criteria.map((_, j) => j)
  const hasCustomOrder = perm.some((c, i) => c !== i)
  const displayName = (j: number) =>
    hasCustomOrder ? `${problem.criteria[j]!.name} (#${perm.indexOf(j) + 1})` : problem.criteria[j]!.name
  const hasSpread = computed.weights.length > 1 && Math.max(...computed.weights) - Math.min(...computed.weights) > 1e-12
  const hi = hasSpread ? argMax(computed.weights) : -1
  const weightTexts = computed.weights.map((w) => format(w))
  const sTexts = computed.s.map((v, j) => (perm.indexOf(j) === 0 && v === 0 ? '0' : format(v)))

  // Columns: name | s_j | strip (q_j chain in 0..1) | -> | weight + value.
  const W = Math.max(width, 280)
  const sColW = Math.ceil(Math.max(44, ...sTexts.map((t) => estimateTextWidth(t, 12) + 10)))
  const nameW = Math.ceil(
    Math.min(Math.max(...problem.criteria.map((_, j) => estimateTextWidth(displayName(j), 13))) + 12, W * 0.24),
  )
  const valueW = Math.ceil(Math.max(...weightTexts.map((t) => estimateTextWidth(t, 13))) + 8)
  const free = Math.max(120, W - nameW - sColW - valueW - OP)
  const stripW = free * 0.5
  const weightW = free - stripW
  const xS = nameW
  const x0 = nameW + sColW
  const x1 = x0 + stripW + OP
  const pad = 6
  const strip = scaleLinear([0, 1], [x0 + pad, x0 + stripW - pad])
  const maxW = Math.max(...computed.weights, 1e-9)
  const height = HEAD + n * ROW
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), SWARA_IDEA_STEPS - 1) : SWARA_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')

  const table: ChartTable = {
    corner: l.criterion,
    columns: [l.s, l.k, l.q, l.weight],
    rows: perm.map((j) => ({
      label: displayName(j),
      cells: [
        sTexts[j]!,
        format(computed.k[j]!),
        format(computed.q[j]!),
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
        <text className={s.colHead} x={xS} y={HEAD - 10}>
          {truncate(l.s, sColW - 4, 12)}
        </text>
        <text className={`${s.colHead} ${s.stageItem}`} data-off={off(1)} x={x0 + pad} y={HEAD - 10}>
          {truncate(l.q, stripW - pad, 12)}
        </text>
        <text className={`${s.colHead} ${s.stageItem}`} data-off={off(2)} x={x1} y={HEAD - 10}>
          {truncate(l.weight, weightW + valueW, 12)}
        </text>
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />
        {perm.map((j, rankIdx) => {
          const y = HEAD + rankIdx * ROW + ROW / 2
          const isFirstRank = rankIdx === 0
          const qVal = computed.q[j]!
          const prevQ = !isFirstRank ? computed.q[perm[rankIdx - 1]!]! : qVal
          const xZero = strip(0)
          const xQ = strip(Math.min(1, Math.max(0, qVal)))
          const xPrevQ = strip(Math.min(1, Math.max(0, prevQ)))
          const ww = (computed.weights[j]! / maxW) * weightW
          const on = j === hi
          const labelText = displayName(j)
          const short = truncate(labelText, nameW - 12, 13)
          return (
            <g key={j} data-criterion={j}>
              <text className={s.critName} x={0} y={y} dominantBaseline="central">
                {short !== labelText ? <title>{labelText}</title> : null}
                {short}
              </text>
              <text className={s.barValue} x={xS} y={y} dominantBaseline="central" data-highlight={on || undefined}>
                {sTexts[j]}
              </text>
              <line className={s.stripBase} x1={xZero} x2={strip(1)} y1={y} y2={y} />
              {/* Stage 1+: step-down guide from previous ranked criterion's q and q_j ruler */}
              {!isFirstRank && xPrevQ > xQ + 0.5 ? (
                <path
                  className={`${s.op} ${s.stageItem}`}
                  data-off={off(1)}
                  strokeDasharray="2 2"
                  d={`M${xPrevQ} ${y - ROW / 2}V${y}H${xQ}`}
                />
              ) : null}
              <path
                className={`${s.sigma} ${s.stageItem}`}
                data-off={off(1)}
                data-emph=""
                d={`M${xZero} ${y}H${xQ}`}
              />
              <circle className={`${s.stripDot} ${s.stageItem}`} data-off={off(1)} cx={xQ} cy={y} r={4} />
              {/* Stage 2+: arrow and normalized weight bar */}
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
                      : `translate(${xZero}px, ${y - 2}px) scale(${Math.max(xQ - xZero, 1)}, 4)`,
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
              {rankIdx < n - 1 ? <line className={s.rowRule} x1={0} x2={W} y1={y + ROW / 2 - 0.5} y2={y + ROW / 2 - 0.5} /> : null}
            </g>
          )
        })}
      </svg>
      {l.caption ? <p className={s.caption}>{l.caption}</p> : null}
    </ChartFigure>
  )
}
