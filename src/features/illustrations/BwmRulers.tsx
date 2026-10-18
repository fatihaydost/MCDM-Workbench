import { useId } from 'react'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { scaleLinear } from '../charts/scale'
import { useElementWidth } from '../charts/useElementWidth'
import { argMax } from './geometry'
import s from './illustrations.module.css'

export type BwmRulersLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  /** The axis: "times the worst criterion". */
  axis: string
  /** The two rulers (legend and table heads): a_BW / a_Bj and a_jW. */
  fromBest: string
  toWorst: string
  weight: string
  /** Tags under the anchors' names. */
  best: string
  worst: string
  /** Under the flagged criterion's name, next to the icon. */
  flagged: string
  showTable: string
  /** Header of the first table column. */
  criterion: string
}

/** Development defaults only: the pages pass translated labels. */
export const BWM_RULERS_LABELS_EN: BwmRulersLabels = {
  title: 'Two rulers, one scale',
  axis: 'Times the worst criterion',
  fromBest: 'From the best',
  toWorst: 'To the worst',
  weight: 'Weight',
  best: 'Best',
  worst: 'Worst',
  flagged: 'Fits worst',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type BwmRulersProps = {
  criteria: readonly string[]
  best: number
  worst: number
  /** a_Bj and a_jW, as bwmAnswers gives them (null: not answered, no tick). */
  bestToOthers: readonly (number | null)[]
  othersToWorst: readonly (number | null)[]
  /** Final weights, or null while answers are missing (no dots, input order). */
  weights: readonly number[] | null
  /** The criterion whose band is drawn in the accent (by CR^I, not by width), or null. */
  flagged: number | null
  /** Number format for the weights and the table. */
  format?: ((value: number) => string) | undefined
  labels?: Partial<BwmRulersLabels>
  /** Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. BWM_IDEA_STEPS - 1 that step. */
  step?: number | null | undefined
  /** Fade at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/** 0 the anchors, 1 the best's ruler, 2 the worst's ruler with the bands, 3 the weights (the full picture). */
export const BWM_IDEA_STEPS = 4

const ROW = 44
const HEAD = 28
const FOOT = 40
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * BWM's "two rulers" (docs/research/methods/bwm.md, Visual proposal): one row per criterion on one axis in "times the
 * worst criterion". The best's ruler puts criterion j at a_BW / a_Bj (filled mark above the line), the worst's ruler at
 * a_jW (hollow mark below); they coincide exactly when the answers agree, and the band between them is the
 * disagreement. The weight is a dot at w_j / w_W. Static: steps only fade parts in.
 */
export function BwmRulers(props: BwmRulersProps) {
  const { criteria, best, worst, bestToOthers, othersToWorst, weights, flagged, format = defaultFormat, step, explain = false, className } = props
  const l = { ...BWM_RULERS_LABELS_EN, ...props.labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const aBW = bestToOthers[worst]
  if (aBW === null || aBW === undefined) return null

  const n = criteria.length
  const fromBest = bestToOthers.map((b) => (b === null ? null : aBW / b))
  const toWorst = othersToWorst
  const ratio = weights ? weights.map((w) => w / weights[worst]!) : null
  const order = criteria.map((_, j) => j)
  if (weights) order.sort((a, b) => weights[b]! - weights[a]!)
  const hi = weights ? argMax(weights) : -1
  const weightTexts = weights?.map((w) => format(w)) ?? null

  const W = Math.max(width, 280)
  // The tags under the names (best, worst, the flag after its icon) count too.
  const tagW = Math.max(estimateTextWidth(l.best, 12), estimateTextWidth(l.worst, 12), flagged === null ? 0 : estimateTextWidth(l.flagged, 12) + 14)
  const nameW = Math.ceil(Math.min(Math.max(tagW, ...criteria.map((c) => estimateTextWidth(c, 13))) + 12, W * 0.26))
  const valueW = Math.ceil(Math.max(estimateTextWidth(l.weight, 12), ...(weightTexts ?? []).map((t) => estimateTextWidth(t, 13))) + 12)
  const x0 = nameW + 8
  const x1 = W - valueW - 8
  const max = Math.max(aBW, ...(ratio ?? []), ...fromBest.map((v) => v ?? 0), ...toWorst.map((v) => v ?? 0))
  const x = scaleLinear([0, Math.ceil(max)], [x0, x1])
  const grid = Array.from({ length: Math.ceil(max) }, (_, k) => k + 1)
  // Every integer when there is room for its label, else only the anchors' 1 and a_BW.
  const every = x(2) - x(1) >= 18
  const height = HEAD + n * ROW + FOOT
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), BWM_IDEA_STEPS - 1) : BWM_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')
  const dash = '—'
  const table: ChartTable = {
    corner: l.criterion,
    columns: [l.fromBest, l.toWorst, l.weight],
    rows: order.map((j) => ({
      label: criteria[j]!,
      cells: [fromBest[j], toWorst[j], weights?.[j] ?? null].map((v) => (v === null || v === undefined ? dash : format(v))),
    })),
  }
  const legendW = (x1 - x0) / 2

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
        className={[s.svg, explain && s.explain].filter(Boolean).join(' ')}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
      >
        <g className={s.stageItem} data-off={off(1)}>
          <path className={s.bwmFromBest} d={`M${x0} ${HEAD - 20}h10l-5 8z`} />
          <text className={s.colHead} x={x0 + 14} y={HEAD - 10}>
            {truncate(l.fromBest, legendW - 18, 12)}
          </text>
        </g>
        <g className={s.stageItem} data-off={off(2)}>
          <path className={s.bwmToWorst} d={`M${x0 + legendW} ${HEAD - 12}h10l-5 -8z`} />
          <text className={s.colHead} x={x0 + legendW + 14} y={HEAD - 10}>
            {truncate(l.toWorst, legendW - 18, 12)}
          </text>
        </g>
        <text className={`${s.colHead} ${s.stageItem}`} data-off={weightTexts ? off(3) : ''} x={W - 2} y={HEAD - 10} textAnchor="end">
          {l.weight}
        </text>
        {grid.map((k) => (
          <line key={k} className={s.bwmGrid} data-one={k === 1 || undefined} x1={x(k)} x2={x(k)} y1={HEAD} y2={HEAD + n * ROW} />
        ))}
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />
        {order.map((j, r) => {
          const y = HEAD + r * ROW + ROW / 2
          const anchor = j === best || j === worst
          // The anchors are on the axis from the first step: best at a_BW, worst at 1.
          const tickOff = (from: number) => (anchor ? undefined : off(from))
          const fb = fromBest[j] ?? null
          const tw = toWorst[j] ?? null
          const isFlagged = j === flagged
          const tag = j === best ? l.best : j === worst ? l.worst : isFlagged ? l.flagged : null
          const short = truncate(criteria[j]!, nameW - 4, 13)
          return (
            <g key={j} data-criterion={j} data-flagged={isFlagged || undefined}>
              <text className={s.critName} x={0} y={tag ? y - 7 : y} dominantBaseline="central">
                {short !== criteria[j] ? <title>{criteria[j]}</title> : null}
                {short}
              </text>
              {tag && !isFlagged ? (
                <text className={s.colHead} x={0} y={y + 10} dominantBaseline="central">
                  {truncate(tag, nameW - 4, 12)}
                </text>
              ) : null}
              {isFlagged ? (
                <g className={s.stageItem} data-off={off(2)}>
                  <circle className={s.bwmFlagIcon} cx={5} cy={y + 10} r={4.5} />
                  <path className={s.bwmFlagIcon} d={`M5 ${y + 7.5}v3`} />
                  <circle className={s.bwmFlagDot} cx={5} cy={y + 12.5} r={0.8} />
                  <text className={s.bwmFlagText} x={14} y={y + 10} dominantBaseline="central">
                    {truncate(l.flagged, nameW - 18, 12)}
                  </text>
                </g>
              ) : null}
              <line className={s.stripBase} x1={x0} x2={x1} y1={y} y2={y} />
              {fb !== null && tw !== null ? (
                <rect
                  className={`${s.bwmBand} ${s.stageItem}`}
                  data-off={off(2)}
                  data-highlight={isFlagged || undefined}
                  x={x(Math.min(fb, tw))}
                  y={y - 2.5}
                  width={Math.abs(x(fb) - x(tw))}
                  height={5}
                />
              ) : null}
              {fb !== null ? <path className={`${s.bwmFromBest} ${s.stageItem}`} data-off={tickOff(1)} data-value={fb} d={`M${x(fb) - 5} ${y - 11}h10l-5 8z`} /> : null}
              {tw !== null ? (
                <path className={`${s.bwmToWorst} ${s.stageItem}`} data-off={tickOff(2)} data-value={tw} d={`M${x(tw) - 5} ${y + 11}h10l-5 -8z`} />
              ) : null}
              {ratio ? <circle className={`${s.bwmDot} ${s.stageItem}`} data-off={off(3)} cx={x(ratio[j]!)} cy={y} r={4.5} /> : null}
              {weightTexts ? (
                <text className={`${s.barValue} ${s.stageItem}`} data-off={off(3)} data-highlight={j === hi || undefined} x={W - 2} y={y} textAnchor="end" dominantBaseline="central">
                  {weightTexts[j]}
                </text>
              ) : null}
              {r < n - 1 ? <line className={s.rowRule} x1={0} x2={W} y1={y + ROW / 2 - 0.5} y2={y + ROW / 2 - 0.5} /> : null}
            </g>
          )
        })}
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD + n * ROW - 0.5} y2={HEAD + n * ROW - 0.5} />
        {grid
          .filter((k) => every || k === 1 || k === aBW)
          .map((k) => (
            <text key={k} className={s.axisName} x={x(k)} y={HEAD + n * ROW + 12} textAnchor="middle">
              {k}
            </text>
          ))}
        <text className={s.axisName} x={x1} y={HEAD + n * ROW + 32} textAnchor="end">
          {truncate(l.axis, x1 - x0, 12)}
        </text>
      </svg>
      {l.caption ? <p className={s.caption}>{l.caption}</p> : null}
    </ChartFigure>
  )
}
