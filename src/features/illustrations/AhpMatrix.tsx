import { useId } from 'react'
import { toScale, type AhpWorstPair, type Ratio } from '../../core'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { scaleLinear } from '../charts/scale'
import { useElementWidth } from '../charts/useElementWidth'
import { argMax } from './geometry'
import s from './illustrations.module.css'

const formatRatio = (v: number): string => (v >= 1 ? String(Math.round(v)) : `1/${Math.round(1 / v)}`)

export type AhpMatrixLabels = {
  title: string
  caption?: string | undefined
  matrix: string
  fitted: string
  weight: string
  flagged: string
  showTable: string
  criterion: string
}

export const AHP_MATRIX_LABELS_EN: AhpMatrixLabels = {
  title: 'A matrix of ratios, one vector that fits it',
  matrix: 'Pairwise ratios',
  fitted: 'Fitted w_i / w_k',
  weight: 'Weight',
  flagged: 'Largest gap',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type AhpMatrixProps = {
  criteria: readonly string[]
  /** n × n pairwise comparison answers (upper triangle answered, lower triangle reciprocal, diagonal 1). */
  pairs: readonly (readonly (Ratio | null)[])[]
  /** Final priority vector (or null while answers are incomplete). */
  weights: readonly number[] | null
  /** Upper-triangle pair (i, k) with the largest discrepancy max(a_ik * w_k / w_i, w_i / (a_ik * w_k)). */
  worstPair: AhpWorstPair | null
  /** True when CR >= 0.10 (draws the warning icon on the flagged cell). */
  warn?: boolean | undefined
  format?: ((value: number) => string) | undefined
  formatShort?: ((value: number) => string) | undefined
  labels?: Partial<AhpMatrixLabels>
  /** Step through the idea (IdeaSteps): null/undefined draws the full picture; 0 .. AHP_IDEA_STEPS - 1 that step. */
  step?: number | null | undefined
  explain?: boolean | undefined
  className?: string | undefined
}

/** 0 upper + mirror cells, 1 fitted w_i / w_k ratios, 2 weight bars, 3 inconsistency highlight (full picture). */
export const AHP_IDEA_STEPS = 4

const ROW = 42
const HEAD = 28
const FOOT = 28
const defaultFormat = (v: number) => v.toFixed(4)
const defaultShort = (v: number) => v.toFixed(2)

/**
 * AHP's visual ("a matrix of ratios, one vector that fits it", docs/research/methods/ahp.md):
 * the n × n comparison matrix with upper-triangle answers, faint lower-triangle reciprocals, fitted weight ratios
 * w_i / w_k, horizontal weight bars on the right, and the most inconsistent pair highlighted.
 */
export function AhpMatrix(props: AhpMatrixProps) {
  const {
    criteria,
    pairs,
    weights,
    worstPair,
    warn = false,
    format = defaultFormat,
    formatShort = defaultShort,
    step,
    explain = false,
    className,
  } = props
  const l = { ...AHP_MATRIX_LABELS_EN, ...props.labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const n = criteria.length
  if (n < 2) return null

  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), AHP_IDEA_STEPS - 1) : AHP_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')

  const hi = weights ? argMax(weights) : -1
  const maxW = weights ? Math.max(...weights, 1e-9) : 1
  const weightTexts = weights?.map((w) => format(w)) ?? null

  const W = Math.max(width, 300)
  const nameW = Math.ceil(Math.min(Math.max(...criteria.map((c) => estimateTextWidth(c, 13))) + 10, W * 0.24))
  const valueW = Math.ceil(
    Math.max(estimateTextWidth(l.weight, 12), ...(weightTexts ?? ['0.0000']).map((t) => estimateTextWidth(t, 13))) + 10,
  )
  const barReserve = Math.max(44, Math.min(120, Math.floor((W - nameW - valueW) * 0.25)))
  const gridAvail = Math.max(n * 26, W - nameW - barReserve - valueW - 16)
  const cellW = Math.max(24, Math.min(60, Math.floor(gridAvail / n)))
  const gridW = cellW * n
  const xGrid0 = nameW + 6
  const xBar0 = xGrid0 + gridW + 12
  const xBar1 = Math.max(xBar0 + 24, W - valueW - 8)
  const xBarScale = scaleLinear([0, maxW], [xBar0, xBar1])
  const showFittedInCell = weights !== null && cellW >= 42 && n <= 6
  const height = HEAD + n * ROW + FOOT
  const dash = '—'

  const cellValue = (i: number, k: number): number | null => {
    if (i === k) return 1
    return toScale(pairs[i]?.[k])
  }

  const table: ChartTable = {
    corner: l.criterion,
    columns: [...criteria, ...(weights ? [l.weight] : [])],
    rows: criteria.map((c, i) => ({
      label: c,
      cells: [
        ...criteria.map((_, k) => {
          const v = cellValue(i, k)
          return v === null ? dash : formatRatio(v)
        }),
        ...(weights ? [format(weights[i]!)] : []),
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
        className={[s.svg, explain && s.explain].filter(Boolean).join(' ')}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
      >
        {criteria.map((c, k) => {
          const cx = xGrid0 + k * cellW + cellW / 2
          const short = truncate(c, cellW - 4, 11)
          return (
            <text key={k} className={s.colHead} x={cx} y={HEAD - 8} textAnchor="middle">
              {short !== c ? <title>{c}</title> : null}
              {short}
            </text>
          )
        })}
        <text
          className={`${s.colHead} ${s.stageItem}`}
          data-off={weightTexts ? off(2) : ''}
          x={W - 2}
          y={HEAD - 8}
          textAnchor="end"
        >
          {l.weight}
        </text>
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />

        {criteria.map((c, i) => {
          const yTop = HEAD + i * ROW
          const yMid = yTop + ROW / 2
          const short = truncate(c, nameW - 4, 13)
          const wi = weights?.[i] ?? null
          const barW = wi !== null && Number.isFinite(wi) ? Math.max(0, xBarScale(wi) - xBar0) : 0
          return (
            <g key={i} data-criterion={i}>
              <text className={s.critName} x={0} y={yMid} dominantBaseline="central">
                {short !== c ? <title>{c}</title> : null}
                {short}
              </text>

              {criteria.map((_, k) => {
                const xCell = xGrid0 + k * cellW
                const part = i === k ? 'diag' : i < k ? 'upper' : 'lower'
                const v = cellValue(i, k)
                const isWorstUpper = worstPair !== null && i === worstPair.i && k === worstPair.k
                const isWorstLower = worstPair !== null && i === worstPair.k && k === worstPair.i
                const isFlagged = (isWorstUpper || isWorstLower) && stage >= 3
                const fitted =
                  weights !== null && i < k && Number.isFinite(weights[i]) && Number.isFinite(weights[k])
                    ? weights[i]! / weights[k]!
                    : null
                return (
                  <g
                    key={k}
                    data-cell={`${i}-${k}`}
                    data-part={part}
                    data-flagged={isWorstUpper && stage >= 3 ? '' : undefined}
                    data-value={v !== null ? formatRatio(v) : undefined}
                  >
                    <rect
                      className={s.ahpCell}
                      data-part={part}
                      data-flagged={isFlagged ? '' : undefined}
                      x={xCell + 1.5}
                      y={yTop + 3}
                      width={cellW - 3}
                      height={ROW - 6}
                      rx={2}
                    />
                    <text
                      className={s.ahpCellText}
                      data-part={part}
                      data-flagged={isFlagged ? '' : undefined}
                      x={xCell + cellW / 2}
                      y={showFittedInCell && part === 'upper' ? yMid - 5 : yMid}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {v === null ? dash : formatRatio(v)}
                    </text>
                    {showFittedInCell && part === 'upper' && fitted !== null ? (
                      <text
                        className={`${s.ahpRatioText} ${s.stageItem}`}
                        data-off={off(1)}
                        x={xCell + cellW / 2}
                        y={yMid + 8}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {formatShort(fitted)}
                      </text>
                    ) : null}
                    {isWorstUpper && warn && stage >= 3 ? (
                      <g data-warn="" className={s.stageItem} data-off={off(3)}>
                        <circle className={s.bwmFlagIcon} cx={xCell + cellW - 7} cy={yTop + 9} r={3.5} />
                      </g>
                    ) : null}
                  </g>
                )
              })}

              {wi !== null && Number.isFinite(wi) ? (
                <rect
                  className={`${s.ahpBar} ${s.stageItem}`}
                  data-off={off(2)}
                  data-highlight={i === hi || undefined}
                  x={xBar0}
                  y={yMid - 6}
                  width={barW}
                  height={12}
                  rx={1.5}
                />
              ) : null}
              {weightTexts ? (
                <text
                  className={`${s.barValue} ${s.stageItem}`}
                  data-off={off(2)}
                  data-highlight={i === hi || undefined}
                  x={W - 2}
                  y={yMid}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {weightTexts[i]}
                </text>
              ) : null}
            </g>
          )
        })}

        <line className={s.rowRule} x1={0} x2={W} y1={HEAD + n * ROW - 0.5} y2={HEAD + n * ROW - 0.5} />
        <text className={s.axisName} x={xGrid0} y={HEAD + n * ROW + 18}>
          {truncate(l.matrix, gridW, 12)}
        </text>
        {worstPair ? (
          <text
            className={`${s.bwmFlagText} ${s.stageItem}`}
            data-off={off(3)}
            x={W - 2}
            y={HEAD + n * ROW + 18}
            textAnchor="end"
          >
            {truncate(`${l.flagged}: ${criteria[worstPair.i]} / ${criteria[worstPair.k]}`, W - xGrid0 - 90, 12)}
          </text>
        ) : null}
      </svg>
      {l.caption ? <p className={s.caption}>{l.caption}</p> : null}
    </ChartFigure>
  )
}
