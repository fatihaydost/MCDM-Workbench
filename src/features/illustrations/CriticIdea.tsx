import { useId, useMemo } from 'react'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { scaleLinear } from '../charts/scale'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { argMax, criticParts } from './geometry'
import s from './illustrations.module.css'

export type CriticIdeaLabels = {
  title: string
  /** Optional line under the figure. */
  caption?: string
  /** Column heads: normalized spread with its sigma, conflict Σ(1 − ρ), resulting weight. */
  contrast: string
  conflict: string
  weight: string
  /** Information C = σ × conflict: in the table, and as the last column's head at the information step. */
  information: string
  /**
   * Optional head of the last column with the divisor, e.g. (9.4228) => "Weight = C / 9.4228"; default `weight`.
   * The method page uses it, so the picture shows the normalization; used only when ΣC > 0.
   */
  weightHead?: ((total: string) => string) | undefined
  showTable: string
  /** Header of the first table column. */
  criterion: string
}

/** Development defaults only: the pages pass translated labels. */
export const CRITIC_IDEA_LABELS_EN: CriticIdeaLabels = {
  title: 'Contrast times conflict gives the weight',
  contrast: 'Contrast (σ)',
  conflict: 'Conflict Σ(1 − ρ)',
  weight: 'Weight',
  information: 'Information C',
  showTable: 'Show as table',
  criterion: 'Criterion',
}

export type CriticIdeaProps = {
  problem: Problem
  /** Criterion drawn in the accent; default the one with the largest weight. */
  highlight?: number | undefined
  /** Number format for the weight labels and the table (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<CriticIdeaLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. CRITIC_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture.
   */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the CRITIC idea: 0 contrast (the σ of each normalized column), 1 conflict Σ(1 − ρ), 2 information
 * C = σ × Σ(1 − ρ) (the conflict bar scaled by σ moves into the last column), 3 weight w = C / ΣC (the same bars, now
 * read as weights; the largest in the accent). Bars in the last column are drawn relative to the largest, so the
 * information bars and the weight bars have the same lengths: dividing by ΣC keeps the proportions.
 */
export const CRITIC_IDEA_STEPS = 4

const ROW = 36
const HEAD_1 = 28
const HEAD_2 = 42
const OP = 22
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * CRITIC in one picture, one row per criterion, read left to right:
 * contrast (the normalized values as dots on 0..1, and σ under them as a ruler from 0 on the same scale, so the
 * rulers compare like the σ values do),
 * times conflict (Σ(1 − ρ) as a bar), gives the weight (a bar with its value).
 * Every number comes from the core's CRITIC steps.
 */
export function CriticIdea({ problem, highlight, format = defaultFormat, labels, step, explain = false, className }: CriticIdeaProps) {
  const l = { ...CRITIC_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  // Resizing redraws at once, also while stepping (the bars only move on a step change).
  const animate = useAnimateValues(width)
  const parts = useMemo(() => criticParts(problem), [problem])
  if (!parts) return null

  const n = problem.criteria.length
  const hasSpread = parts.weights.length > 1 && Math.max(...parts.weights) - Math.min(...parts.weights) > 1e-12
  const hi = highlight ?? (hasSpread ? argMax(parts.weights) : -1)
  const weightTexts = parts.weights.map((w) => format(w))
  const informationTexts = parts.information.map((c) => format(c))
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), CRITIC_IDEA_STEPS - 1) : CRITIC_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')
  const only = (at: number) => (stepping && stage === at ? undefined : '')
  // The method page can step (step is null or a number there); only then do the information texts need room.
  const steppable = step !== undefined
  const total = parts.information.reduce((a, b) => a + b, 0)
  const weightHead = l.weightHead && total > 0 ? l.weightHead(format(total)) : l.weight

  // Columns: name | strip | × | conflict | → | weight + value.
  const W = Math.max(width, 280)
  const nameW = Math.ceil(Math.min(Math.max(...problem.criteria.map((c) => estimateTextWidth(c.name, 13))) + 12, W * 0.26, 140))
  // Wide enough for the information values too, which the last column shows at step 2.
  const valueW = Math.ceil(Math.max(...[...weightTexts, ...(steppable ? informationTexts : [])].map((t) => estimateTextWidth(t, 13))) + 8)
  const free = Math.max(120, W - nameW - valueW - OP * 2)
  const stripW = free * 0.42
  const conflictW = free * 0.24
  const weightW = free - stripW - conflictW
  const x0 = nameW
  const x1 = x0 + stripW + OP
  const x2 = x1 + conflictW + OP
  const pad = 6
  const strip = scaleLinear([0, 1], [x0 + pad, x0 + stripW - pad])
  const maxConflict = Math.max(...parts.conflict) || 1
  const maxInfo = Math.max(...parts.information, 0)
  const maxWeight = Math.max(...parts.weights) || 1
  const table: ChartTable = {
    corner: l.criterion,
    columns: [l.contrast, l.conflict, l.information, l.weight],
    rows: problem.criteria.map((c, j) => ({
      label: c.name,
      cells: [format(parts.sigma[j]!), format(parts.conflict[j]!), format(parts.information[j]!), weightTexts[j]!],
    })),
  }

  // A column head that does not fit its column breaks once, at the first space ("Conflict" / "Σ(1 − ρ)").
  const headLines = (text: string, w: number): string[] => {
    if (estimateTextWidth(text, 12) <= w) return [text]
    const k = text.indexOf(' ')
    if (k < 0) return [truncate(text, w, 12)]
    return [truncate(text.slice(0, k), w, 12), truncate(text.slice(k + 1), w, 12)]
  }
  // The last column's head is "Information C" at the information step and the weight head otherwise; the two
  // cross-fade (the weight one in the second phase).
  const heads = [
    { key: 'contrast', text: l.contrast, x: x0 + pad, w: stripW - pad, off: off(0), value: false },
    { key: 'conflict', text: l.conflict, x: x1, w: conflictW + OP - 4, off: off(1), value: false },
    ...(steppable ? [{ key: 'information', text: l.information, x: x2, w: weightW + valueW, off: only(2), value: true }] : []),
    { key: 'weight', text: weightHead, x: x2, w: weightW + valueW, off: off(3), value: true },
  ].map((h) => ({ ...h, lines: headLines(h.text, h.w) }))
  // The head height does not depend on the step.
  const HEAD = Math.max(...heads.map((h) => h.lines.length)) > 1 ? HEAD_2 : HEAD_1
  const height = HEAD + n * ROW

  const head = (h: (typeof heads)[number]) => (
    <text
      key={h.key}
      className={`${s.colHead} ${s.stageItem}${h.value ? ` ${s.criticValue}` : ''}`}
      data-off={h.off}
      x={h.x}
      y={HEAD - 10 - (h.lines.length - 1) * 14}
    >
      {h.lines.join(' ') !== h.text ? <title>{h.text}</title> : null}
      {h.lines.map((line, i) => (
        <tspan key={i} x={h.x} dy={i === 0 ? 0 : 14}>
          {line}
        </tspan>
      ))}
    </text>
  )

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
        {heads.map(head)}
        <line className={s.rowRule} x1={0} x2={W} y1={HEAD - 0.5} y2={HEAD - 0.5} />
        {problem.criteria.map((c, j) => {
          const y = HEAD + j * ROW + ROW / 2
          const col = parts.normalized.map((row) => row[j]!)
          const sg = parts.sigma[j]!
          // σ as a ruler from 0, on the strip's scale: its true length (a sample SD of values in 0..1 is at most
          // about 0.71), comparable from row to row. Not mean ± σ, which the 0..1 strip would have to cut off.
          const lo = strip(0)
          const hiX = strip(sg)
          const cw = (parts.conflict[j]! / maxConflict) * conflictW
          const iw = maxInfo > 0 ? (parts.information[j]! / maxInfo) * weightW : 0
          const ww = (parts.weights[j]! / maxWeight) * weightW
          const bw = stage === 2 ? iw : ww
          const on = j === hi && stage === 3
          const short = truncate(c.name, nameW - 12, 13)
          return (
            <g key={j}>
              <text className={s.critName} x={0} y={y} dominantBaseline="central">
                {short !== c.name ? <title>{c.name}</title> : null}
                {short}
              </text>
              {/* Contrast: the column's normalized values, and σ below them as a ruler from 0. */}
              <line className={s.stripBase} x1={strip(0)} x2={strip(1)} y1={y - 3} y2={y - 3} />
              {col.map((v, i) => (
                <circle key={i} className={s.stripDot} cx={strip(v)} cy={y - 3} r={3.5} />
              ))}
              <path
                className={s.sigma}
                data-emph={stepping && stage === 0 ? '' : undefined}
                data-sigma={sg}
                d={`M${lo} ${y + 7}H${hiX}M${lo} ${y + 4.5}v5M${hiX} ${y + 4.5}v5`}
              />
              {/* σ's value, only at the contrast step, so the comparison can be read off the picture. */}
              <text className={`${s.sigmaValue} ${s.stageItem}`} data-off={only(0)} x={hiX + 5} y={y + 7} dominantBaseline="central">
                {format(sg)}
              </text>
              {/* × */}
              <path className={`${s.op} ${s.stageItem}`} data-off={off(1)} d={`M${x1 - OP / 2 - 3} ${y - 3}l6 6m0 -6l-6 6`} />
              {/* Conflict. */}
              <rect className={`${s.bar} ${s.stageItem}`} data-off={off(1)} x={x1} y={y - 5} width={Math.max(cw, 1)} height={10} />
              {/* → */}
              <path className={`${s.op} ${s.stageItem}`} data-off={off(2)} d={`M${x2 - OP + 5} ${y}h${OP - 10}m-3.5 -3.5 3.5 3.5 -3.5 3.5`} />
              {/* Information, then weight: a unit square moved and stretched by transform. Before step 2 it waits,
                  hidden, on the conflict bar, so it comes out of that bar. */}
              <rect
                className={`${s.bar} ${s.criticBar} ${s.stageItem}`}
                data-off={off(2)}
                data-highlight={on || undefined}
                width={1}
                height={1}
                style={{
                  transform:
                    stage >= 2
                      ? `translate(${x2}px, ${y - 7}px) scale(${bw > 0 ? Math.max(bw, 1) : 0}, 14)`
                      : `translate(${x1}px, ${y - 5}px) scale(${Math.max(cw, 1)}, 10)`,
                }}
              />
              {/* Information C at step 2, the weight after it: two texts that cross-fade, not one that swaps. */}
              {steppable ? (
                <text className={`${s.barValue} ${s.stageItem} ${s.criticValue}`} data-off={only(2)} x={x2 + iw + 6} y={y} dominantBaseline="central">
                  {informationTexts[j]}
                </text>
              ) : null}
              <text
                className={`${s.barValue} ${s.stageItem} ${s.criticValue}`}
                data-off={off(3)}
                data-highlight={on || undefined}
                x={x2 + ww + 6}
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
