import { useId, useMemo } from 'react'
import { maxOf } from '../../core/math'
import type { EntropyParams } from '../../core/methods/entropy'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { truncate } from '../charts/layout'
import { useElementWidth } from '../charts/useElementWidth'
import { entropyParts } from './geometry'
import s from './illustrations.module.css'

export type EntropyIdeaLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string | undefined
  /** Legend of the dashed line at 1/m, the share every alternative would have if all were equal. */
  even: string
  /** "Entropy e" and "Weight w": printed with "= value" under each panel, and as table rows. */
  entropy: string
  weight: string
  /** Name of the bars (table value header suffix): "Share p". */
  share: string
  showTable: string
  /** Header of the first table column. */
  alternative: string
}

/** Development defaults only: the pages pass translated labels. */
export const ENTROPY_IDEA_LABELS_EN: EntropyIdeaLabels = {
  title: 'Uneven shares, more weight',
  even: 'even share 1/m',
  entropy: 'Entropy e',
  weight: 'Weight w',
  share: 'Share p',
  showTable: 'Show as table',
  alternative: 'Alternative',
}

export type EntropyIdeaProps = {
  problem: Problem
  /** The Entropy options the numbers come from (default: shares of the raw data). */
  params?: EntropyParams | undefined
  /** Number format for e, w and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<EntropyIdeaLabels>
  className?: string | undefined
}

const NAME = 18
const PLOT_TOP = 30
const PLOT_H = 96
const GAP = 28
const LINE = 20
const BAR = 8
const LEGEND = 30
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * Entropy in one picture: two criteria side by side, each alternative's share p_ij as a bar on one common scale,
 * with the even share 1/m dashed. The most even criterion (entropy near 1) is on the left, the most uneven one on the
 * right; under each, its entropy e_j and the resulting weight w_j with a bar on one scale. Static: no motion.
 * Every number comes from the core's Entropy steps.
 */
export function EntropyIdea({ problem, params, format = defaultFormat, labels, className }: EntropyIdeaProps) {
  const l = { ...ENTROPY_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const normalization = params?.normalization
  const parts = useMemo(() => entropyParts(problem, normalization ? { normalization } : {}), [problem, normalization])
  if (!parts) return null

  const m = problem.alternatives.length
  const [a, b] = parts.pair
  const pair = [a, b] as const
  const W = Math.max(width, 280)
  const panelW = (W - GAP) / 2
  const shares = pair.map((j) => parts.shares.map((row) => row[j]!))
  const yMax = Math.max(maxOf(shares.flat()), 1 / m) * 1.08
  const y = (p: number) => PLOT_TOP + PLOT_H - (p / yMax) * PLOT_H
  const base = PLOT_TOP + PLOT_H
  const slot = panelW / m
  const bw = Math.max(1, slot * (m > 40 ? 0.85 : 0.7))
  const maxW = Math.max(parts.weights[a]!, parts.weights[b]!, 1e-12)
  const hi = parts.weights[b]! >= parts.weights[a]! ? b : a
  const yE = base + LINE
  const yW = yE + LINE
  const yBar = yW + 12
  const height = yBar + BAR + LEGEND

  const names = pair.map((j) => problem.criteria[j]!.name)
  const table: ChartTable = {
    corner: l.alternative,
    columns: names.map((n) => `${n}: ${l.share}`),
    rows: [
      ...problem.alternatives.map((alt, i) => ({ label: alt, cells: shares.map((col) => format(col[i]!)) })),
      { label: l.entropy, cells: pair.map((j) => format(parts.entropy[j]!)) },
      { label: l.weight, cells: pair.map((j) => format(parts.weights[j]!)) },
    ],
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
        {pair.map((j, k) => {
          const x0 = k * (panelW + GAP)
          const on = j === hi
          const short = truncate(names[k]!, panelW, 13)
          return (
            <g key={j} data-criterion={j}>
              <text className={s.critName} x={x0} y={NAME}>
                {short !== names[k] ? <title>{names[k]}</title> : null}
                {short}
              </text>
              {shares[k]!.map((p, i) => (
                <rect
                  key={i}
                  className={s.bar}
                  data-highlight={on || undefined}
                  x={x0 + i * slot + (slot - bw) / 2}
                  y={y(p)}
                  width={bw}
                  height={Math.max(base - y(p), 0)}
                />
              ))}
              <line className={s.evenLine} x1={x0} x2={x0 + panelW} y1={y(1 / m)} y2={y(1 / m)} />
              <line className={s.stripBase} x1={x0} x2={x0 + panelW} y1={base + 0.5} y2={base + 0.5} />
              <text className={s.barValue} x={x0} y={yE} dominantBaseline="central">
                {`${l.entropy} = ${format(parts.entropy[j]!)}`}
              </text>
              <text className={s.barValue} data-highlight={on || undefined} x={x0} y={yW} dominantBaseline="central">
                {`${l.weight} = ${format(parts.weights[j]!)}`}
              </text>
              <rect
                className={s.bar}
                data-highlight={on || undefined}
                x={x0}
                y={yBar}
                width={Math.max((parts.weights[j]! / maxW) * panelW, 1)}
                height={BAR}
              />
            </g>
          )
        })}
        <line className={s.evenLine} x1={0} x2={20} y1={height - 8} y2={height - 8} />
        <text className={s.evenNote} x={26} y={height - 8} dominantBaseline="central">
          {l.even}
        </text>
      </svg>
      {l.caption ? <p className={s.caption}>{l.caption}</p> : null}
    </ChartFigure>
  )
}
