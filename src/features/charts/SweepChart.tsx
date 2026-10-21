import { useId, useLayoutEffect, useMemo, useRef, type PointerEvent, type ReactNode } from 'react'
import { ChartFigure } from './ChartFigure'
import s from './charts.module.css'
import r from './robustness.module.css'
import { stepDecimals } from './scale'
import { layoutSweep } from './sweep'
import { useAnimateValues, useElementWidth } from './useElementWidth'

export type SweepChartProps = {
  title: string
  /** One name per alternative. */
  labels: string[]
  /** Lines named at their right end (default all); the others are named in the table next to the chart. */
  endLabels?: readonly number[] | undefined
  /** Grid of the swept weight, 0..1. */
  xs: number[]
  /** series[i][p] = closeness of alternative i at xs[p]. */
  series: number[][]
  /** Current weight (the cursor) and the exact closeness of every alternative there; null hides the cursor. */
  cursor: number | null
  cursorValues: number[]
  /** The user's own weight (dashed line). */
  base: number
  /** Where the order of two lines changes: the crossing point. */
  switches: { x: number; y: number }[]
  /** Interval of the weight around the base over which first place, and the whole ranking, stay the same. */
  topBand: [number, number]
  rankingBand: [number, number]
  /** Alternatives drawn in the accent (first place at the cursor). */
  highlight: readonly number[]
  /** Closeness in the table (4 decimals). */
  format: (value: number) => string
  /** Axis tick label with the given decimals. */
  formatTick: (value: number, decimals: number) => string
  /** Weight in the table header. */
  formatWeight: (value: number) => string
  /** Pointer down or drag on the plot picks that weight (rounded by the caller). */
  onPick?: ((weight: number) => void) | undefined
  text: { yours: string; showTable: string; tableCorner: string; axis: string }
  /** Content under the plot that must line up with the x axis (the slider): gets the plot's left and right edges. */
  below?: ((edges: { left: number; right: number; width: number }) => ReactNode) | undefined
  /** The first sweep is still being calculated: the plot area is a placeholder block behind the empty axes. */
  pending?: boolean | undefined
  className?: string | undefined
}

/** Weights listed in the table equivalent: 0, 0.1, …, 1 (the nearest grid points). */
const TABLE_STEPS = 10

/** A duration token in ms (0 with reduced motion, where tokens.css sets them to 0ms). */
function tokenMs(el: Element, name: string): number {
  const raw = getComputedStyle(el).getPropertyValue(name).trim()
  const v = Number.parseFloat(raw)
  return Number.isFinite(v) ? (raw.endsWith('ms') ? v : raw.endsWith('s') ? v * 1000 : v) : 0
}

/**
 * Closeness of every alternative as one criterion's weight runs from 0 to 1 (a gradient sensitivity chart). The
 * cursor follows the weight at once (direct manipulation, no interpolation, no transition); the lines move only when
 * the swept criterion changes, each to its new curve, and the marks that sit on them (crossings, bands) wait until the
 * lines have arrived. Under the axis, a band marks the weights around the user's weight that keep first place, a thin
 * one those that keep the whole ranking.
 */
export function SweepChart({
  title,
  labels,
  endLabels,
  xs,
  series,
  cursor,
  cursorValues,
  base,
  switches,
  topBand,
  pending = false,
  rankingBand,
  highlight,
  format,
  formatTick,
  formatWeight,
  onPick,
  text,
  below,
  className,
}: SweepChartProps) {
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  // The cursor's exact values lie inside the range of the grid's; they never re-layout the chart.
  const layout = useMemo(
    () => layoutSweep({ width, labelled: endLabels, plotHeight: width < 480 ? 200 : 240, xs, series, labels }),
    [width, endLabels, xs, series, labels],
  )
  const { x, y, left, right, top, bottom } = layout
  const hi = new Set(highlight)
  const dragging = useRef(false)
  const marksRef = useRef<SVGGElement | null>(null)
  const lastSeries = useRef(series)

  // New curves (another criterion): the marks on them fade in once the lines have moved, instead of waiting in their
  // new places while the lines are still on the way. A resize or the first render shows them at once.
  useLayoutEffect(() => {
    const changed = lastSeries.current !== series
    lastSeries.current = series
    const g = marksRef.current
    if (!changed || !animate || !g) return
    const move = tokenMs(g, '--dur-data')
    if (move <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const fade = tokenMs(g, '--dur')
    const easing = getComputedStyle(g).getPropertyValue('--ease').trim() || 'ease'
    for (const a of g.getAnimations()) a.cancel()
    g.animate([{ opacity: 0 }, { opacity: 0, offset: move / (move + fade) }, { opacity: 1 }], { duration: move + fade, easing })
  }, [series, animate])

  const pick = (e: PointerEvent<SVGRectElement>) => {
    if (!onPick) return
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    onPick(Math.min(1, Math.max(0, x.invert(e.clientX - box.left))))
  }

  const tableCols = useMemo(() => {
    const cols: number[] = []
    for (let k = 0; k <= TABLE_STEPS; k++) {
      const target = k / TABLE_STEPS
      let best = 0
      for (let p = 1; p < xs.length; p++) if (Math.abs(xs[p]! - target) < Math.abs(xs[best]! - target)) best = p
      if (!cols.includes(best)) cols.push(best)
    }
    return cols
  }, [xs])
  const table = {
    corner: text.tableCorner,
    columns: tableCols.map((p) => formatWeight(xs[p]!)),
    rows: series.map((line, i) => ({ label: labels[i] ?? '', cells: tableCols.map((p) => format(line[p]!)) })),
  }

  const xDecimals = stepDecimals((layout.xTicks[1] ?? 1) - (layout.xTicks[0] ?? 0))
  const yDecimals = stepDecimals((layout.yTicks[1] ?? 1) - (layout.yTicks[0] ?? 0))
  const drawOrder = series.map((_, i) => i).sort((a, b) => Number(hi.has(a)) - Number(hi.has(b)) || a - b)
  const bx = x(base)

  return (
    <ChartFigure
      titleId={`${uid}-title`}
      tableId={`${uid}-table`}
      title={title}
      showTable={text.showTable}
      table={table}
      plotRef={plotRef}
      className={className}
    >
      <svg
        className={animate ? `${s.svg} ${r.animate}` : s.svg}
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-sweep=""
      >
        {pending ? <rect aria-hidden className={r.pending} x={left} y={top} width={right - left} height={bottom - top} /> : null}
        {layout.yTicks.map((v) => (
          <g key={`y${v}`}>
            <line className={r.grid} x1={left} x2={right} y1={y(v)} y2={y(v)} />
            <text className={r.tick} x={left - 8} y={y(v)} textAnchor="end" dominantBaseline="central">
              {formatTick(v, yDecimals)}
            </text>
          </g>
        ))}
        <line className={r.axis} x1={left} x2={right} y1={bottom} y2={bottom} />

        {/* The user's weight. */}
        <line className={r.baseLine} x1={bx} x2={bx} y1={top - 4} y2={bottom} />
        <text className={r.tick} x={Math.min(Math.max(bx, left + 30), right - 30)} y={top - 12} textAnchor="middle" dominantBaseline="central">
          {text.yours}
        </text>

        {drawOrder.map((i) => (
          <path
            key={i}
            className={r.sweepLine}
            data-highlight={hi.has(i) || undefined}
            d={layout.paths[i]}
            style={{ d: `path("${layout.paths[i]}")` }}
          />
        ))}

        <g ref={marksRef}>
          {switches.map((m, k) => (
            <circle key={k} className={r.switchMark} data-switch="" cx={x(m.x)} cy={y(m.y)} r={3.5} />
          ))}
          {/* Bands under the axis: first place kept (thick), the whole ranking kept (thin), around the user's weight. */}
          <line className={r.grid} x1={left} x2={right} y1={layout.bandTopY + 2.5} y2={layout.bandTopY + 2.5} />
          <rect
            className={r.bandTop}
            data-band="top"
            x={x(topBand[0])}
            y={layout.bandTopY}
            width={Math.max(1, x(topBand[1]) - x(topBand[0]))}
            height={5}
          />
          <rect
            className={r.bandRanking}
            data-band="ranking"
            x={x(rankingBand[0])}
            y={layout.bandRankingY}
            width={Math.max(1, x(rankingBand[1]) - x(rankingBand[0]))}
            height={2}
          />
        </g>

        {/* The cursor: moves with the weight at once. */}
        {cursor !== null && (
          <>
            <line className={r.cursor} data-cursor="" x1={x(cursor)} x2={x(cursor)} y1={top - 4} y2={bottom} />
            {cursorValues.map((v, i) => (
              <circle key={i} className={r.cursorDot} data-highlight={hi.has(i) || undefined} cx={x(cursor)} cy={y(v)} r={3.5} />
            ))}
          </>
        )}

        {layout.ends.map((e) => (
          <g key={e.index} className={r.endLabel} style={{ transform: `translate(0px, ${e.y}px)` }} data-highlight={hi.has(e.index) || undefined}>
            <text x={right + 8} y={0} dominantBaseline="central">
              {e.text !== e.full ? <title>{e.full}</title> : null}
              {e.text}
            </text>
          </g>
        ))}

        {layout.xTicks.map((v) => (
          <text key={`x${v}`} className={r.tick} x={x(v)} y={layout.tickY} textAnchor="middle" dominantBaseline="central">
            {formatTick(v, xDecimals)}
          </text>
        ))}
        <text className={r.axisTitle} x={(left + right) / 2} y={layout.titleY} textAnchor="middle" dominantBaseline="central">
          {text.axis}
        </text>

        {onPick && (
          <rect
            className={r.pickArea}
            x={left}
            y={top}
            width={right - left}
            height={bottom - top}
            onPointerDown={(e) => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              pick(e)
            }}
            onPointerMove={(e) => {
              if (dragging.current) pick(e)
            }}
            onPointerUp={() => {
              dragging.current = false
            }}
            onPointerCancel={() => {
              dragging.current = false
            }}
          />
        )}
      </svg>
      {below?.({ left, right, width: layout.width })}
    </ChartFigure>
  )
}
