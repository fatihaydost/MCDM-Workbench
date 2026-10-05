import { useId, useMemo } from 'react'
import { ChartFigure } from './ChartFigure'
import s from './charts.module.css'
import { layoutBars, type BarSort } from './layout'
import type { Domain } from './scale'
import { useAnimateValues, useElementWidth } from './useElementWidth'

export type BarChartProps = {
  title: string
  /** One label per bar (alternative names). */
  labels: string[]
  values: number[]
  /** Formats the direct value labels and the table, e.g. 4 decimals in the active locale. */
  format: (value: number) => string
  /** Index (into `labels` / `values`) drawn in the accent colour, e.g. the best alternative. */
  highlight?: number
  /** 'desc' / 'asc' sort by value; 'none' (default) keeps the input order. */
  sort?: BarSort
  /** Fixed value domain; default [min(0, values), max(0, values)]. */
  domain?: Domain
  description?: string
  tableLabels: {
    /** Summary of the disclosure, e.g. "Show as table". */
    show: string
    /** Header of the label column, e.g. "Alternative". */
    label: string
    /** Header of the value column, e.g. "Score". */
    value: string
  }
  className?: string
  /** Values come from a held-down key (key repeat): bars jump instead of moving (MOTION.md frequency rule). */
  instant?: boolean
}

/**
 * Horizontal bars with the label on the left and the value printed after the bar end, no axis
 * and no legend. Negative values grow left from a zero line. Context bars use `--data-context`,
 * the highlighted one `--data-accent`.
 */
export function BarChart({
  title,
  labels,
  values,
  format,
  highlight,
  sort = 'none',
  domain,
  description,
  tableLabels,
  className,
  instant = false,
}: BarChartProps) {
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width) && !instant
  const layout = useMemo(
    () => layoutBars({ labels, values, width, format, sort, highlight, domain }),
    [labels, values, width, format, sort, highlight, domain],
  )
  const barY = (layout.rowStep - layout.barHeight) / 2
  const mid = layout.rowStep / 2

  const table = {
    corner: tableLabels.label,
    columns: [tableLabels.value],
    rows: layout.rows.map((r) => ({ label: r.label, cells: [r.text] })),
  }

  return (
    <ChartFigure
      titleId={`${uid}-title`}
      tableId={`${uid}-table`}
      title={title}
      description={description}
      showTable={tableLabels.show}
      table={table}
      plotRef={plotRef}
      className={className}
    >
      <svg
        className={animate ? `${s.svg} ${s.animate}` : s.svg}
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
      >
        {layout.rows.map((r) => (
          <g key={r.index} className={s.row} style={{ transform: `translate(0px, ${r.y}px)` }} data-highlight={r.highlight || undefined}>
            <text className={s.barLabel} x={0} y={mid} dominantBaseline="central">
              {r.label !== r.shortLabel ? <title>{r.label}</title> : null}
              {r.shortLabel}
            </text>
            <rect
              className={s.bar}
              x={0}
              y={barY}
              width={1}
              height={layout.barHeight}
              style={{ transform: `translate(${r.x}px, 0px) scale(${r.width}, 1)` }}
            />
            <text
              className={s.barValue}
              x={0}
              y={mid}
              textAnchor={r.anchor}
              dominantBaseline="central"
              style={{ transform: `translate(${r.textX}px, 0px)` }}
            >
              {r.text}
            </text>
          </g>
        ))}
        <line className={s.zero} x1={layout.zeroX} x2={layout.zeroX} y1={0} y2={layout.height} />
      </svg>
    </ChartFigure>
  )
}
