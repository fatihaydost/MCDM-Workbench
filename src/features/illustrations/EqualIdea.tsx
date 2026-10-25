import { useId, useMemo } from 'react'
import { equal } from '../../core/methods/equal'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { scaleLinear } from '../charts/scale'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import s from './illustrations.module.css'

export type EqualIdeaLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  /** Note for the dashed 1/n reference line: "equal share 1/n". */
  share: string
  /** Column and table header: "Weight w". */
  weight: string
  showTable: string
  /** Header of the first table column. */
  criterion: string
}

/** Development defaults only: the pages pass translated labels. */
export const EQUAL_IDEA_LABELS_EN: EqualIdeaLabels = {
  title: 'Equal share 1/n for every criterion',
  share: 'equal share 1/n',
  weight: 'Weight w',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type EqualIdeaProps = {
  problem: Problem
  /** Number format for the weights and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<EqualIdeaLabels>
  /** Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. EQUAL_IDEA_STEPS - 1 that step, the last being the full picture. */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/** The steps of the Equal weights idea: 0 the n criteria on the 0..1 weight track, 1 the 1/n reference line and equal bars, 2 the resulting weights w = 1/n. */
export const EQUAL_IDEA_STEPS = 3

const ROW = 36
const HEAD = 28
const FOOT = 24
const BAR = 14
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * Equal weights in one picture: one row per criterion on a 0..1 weight track, a dashed vertical reference line at 1/n,
 * and every criterion's bar reaching 1/n with none highlighted above the rest.
 */
export function EqualIdea({
  problem,
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: EqualIdeaProps) {
  const l = { ...EQUAL_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)

  const weights = useMemo(() => {
    try {
      return equal.compute(problem, {}).weights
    } catch {
      return null
    }
  }, [problem])

  if (!weights) return null

  const n = problem.criteria.length
  const share = 1 / n
  const weightTexts = weights.map((w) => format(w))

  const W = Math.max(width, 280)
  const nameW = Math.ceil(
    Math.min(Math.max(...problem.criteria.map((c) => estimateTextWidth(c.name, 13))) + 12, W * 0.3),
  )
  const valueW = Math.ceil(Math.max(...weightTexts.map((t) => estimateTextWidth(t, 13))) + 12)
  const x0 = nameW
  const x1 = Math.max(x0 + 80, W - valueW)
  const track = scaleLinear([0, 1], [x0, x1])
  const xShare = track(share)
  const barW = Math.max(xShare - x0, 1)
  const bodyBottom = HEAD + n * ROW
  const height = bodyBottom + FOOT

  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), EQUAL_IDEA_STEPS - 1) : EQUAL_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')

  const table: ChartTable = {
    corner: l.criterion,
    columns: [l.weight],
    rows: problem.criteria.map((c, j) => ({
      label: c.name,
      cells: [weightTexts[j]!],
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
        data-testid="equal-idea"
      >
        <text className={s.colHead} x={x0} y={HEAD - 10}>
          {truncate(l.weight, x1 - x0 - 28, 12)}
        </text>
        <text className={s.colHead} x={x1} y={HEAD - 10} textAnchor="end">
          1
        </text>
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />
        {problem.criteria.map((c, j) => {
          const y = HEAD + j * ROW + ROW / 2
          const short = truncate(c.name, nameW - 12, 13)
          return (
            <g key={j} data-criterion={j}>
              <text className={s.critName} x={0} y={y} dominantBaseline="central">
                {short !== c.name ? <title>{c.name}</title> : null}
                {short}
              </text>
              <line className={s.stripBase} x1={x0} x2={x1} y1={y} y2={y} />
              <rect
                className={`${s.bar} ${s.stageItem}`}
                data-off={off(1)}
                x={x0}
                y={y - BAR / 2}
                width={barW}
                height={BAR}
              />
              <text
                className={`${s.barValue} ${s.stageItem}`}
                data-off={off(2)}
                x={x1 + 8}
                y={y}
                dominantBaseline="central"
              >
                {weightTexts[j]}
              </text>
              {j < n - 1 ? <line className={s.rowRule} x1={0} x2={W} y1={y + ROW / 2 - 0.5} y2={y + ROW / 2 - 0.5} /> : null}
            </g>
          )
        })}
        <line
          className={`${s.evenLine} ${s.stageItem}`}
          data-off={off(1)}
          x1={xShare}
          x2={xShare}
          y1={HEAD}
          y2={bodyBottom}
        />
        <line
          className={`${s.evenLine} ${s.stageItem}`}
          data-off={off(1)}
          x1={x0}
          x2={x0 + 20}
          y1={height - 8}
          y2={height - 8}
        />
        <text
          className={`${s.evenNote} ${s.stageItem}`}
          data-off={off(1)}
          x={x0 + 26}
          y={height - 8}
          dominantBaseline="central"
        >
          {l.share}
        </text>
      </svg>
      {l.caption ? <p className={s.caption}>{l.caption}</p> : null}
    </ChartFigure>
  )
}
