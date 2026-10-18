import { useId, useMemo } from 'react'
import { ChartFigure } from './ChartFigure'
import s from './charts.module.css'
import { estimateTextWidth, heatPaint, layoutHeatmap, type HeatScale } from './layout'
import type { Domain } from './scale'
import { useElementWidth } from './useElementWidth'
import { useHeatTokens } from './useHeatTokens'

export type HeatmapProps = {
  title: string
  rowLabels: string[]
  colLabels: string[]
  /** values[i][j] for row i, column j; null draws an empty cell. */
  values: (number | null)[][]
  /**
   * 'diverging' for signed data such as correlation (default domain -1..1, neutral at 0);
   * 'sequential' for 0..1 data such as a normalized matrix (default domain 0..1).
   */
  scale: HeatScale
  domain?: Domain
  /** Formats the value printed in each cell and in the table. */
  format: (value: number) => string
  /** Printed in a cell whose value is null or not finite (an undefined correlation, say); empty by default. */
  emptyText?: string
  description?: string
  tableLabels: {
    /** Summary of the disclosure, e.g. "Show as table". */
    show: string
    /** Header over the row labels, e.g. "Criterion". */
    corner: string
  }
  className?: string
  /** Cells that take a new value change colour in --dur (never move); off by default. */
  fade?: boolean
  /** Title over the column labels (e.g. "Rank" over 1..5); also prefixes the table's column headers. */
  columnsTitle?: string
}

/**
 * Matrix heatmap with the value printed in every cell. The fill is a mix of data tokens. The
 * value text is `--text` or `--bg`, whichever contrasts more with that cell's resolved fill in
 * the active theme; a fill on which neither reaches 4.5:1 moves slightly along the ramp
 * (see `heatPaint`), so every printed value stays readable in light and dark.
 */
export function Heatmap({ title, rowLabels, colLabels, values, scale, domain, format, emptyText = '', description, tableLabels, className, fade = false, columnsTitle }: HeatmapProps) {
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const tokens = useHeatTokens()
  const text = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? format(v) : emptyText)
  // Short values ("44%") need no 44 px column: the narrowest cell that still holds the widest printed value, so ten
  // rank columns fit a 390 px phone instead of scrolling sideways.
  const widest = Math.max(0, ...values.flatMap((row) => row.map((v) => estimateTextWidth(text(v), 12))))
  const minCellWidth = Math.min(44, Math.max(28, Math.ceil(widest) + 10))
  const layout = useMemo(() => layoutHeatmap({ rowLabels, colLabels, width, minCellWidth }), [rowLabels, colLabels, width, minCellWidth])
  const { labelWidth, headerHeight, cellWidth, cellHeight } = layout

  const top = columnsTitle ? 18 : 0
  const table = {
    corner: tableLabels.corner,
    columns: columnsTitle ? colLabels.map((c) => `${columnsTitle} ${c}`) : colLabels,
    rows: rowLabels.map((label, i) => ({ label, cells: colLabels.map((_, j) => text(values[i]?.[j])) })),
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
        className={fade ? `${s.svg} ${s.fade}` : s.svg}
        width={layout.width}
        height={layout.height + top}
        viewBox={`0 0 ${layout.width} ${layout.height + top}`}
        role="img"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
      >
        {columnsTitle ? (
          <text className={s.axisLabel} x={labelWidth + (cellWidth * colLabels.length) / 2} y={top / 2} textAnchor="middle" dominantBaseline="central">
            {columnsTitle}
          </text>
        ) : null}
        <g transform={top ? `translate(0 ${top})` : undefined}>
          {layout.colLabels.map((label, j) => (
            <text
              key={`c${j}`}
              className={s.axisLabel}
              x={labelWidth + j * cellWidth + cellWidth / 2}
              y={headerHeight / 2}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {label !== colLabels[j] ? <title>{colLabels[j]}</title> : null}
              {label}
            </text>
          ))}
          {layout.rowLabels.map((label, i) => {
            const y = headerHeight + i * cellHeight
            return (
              <g key={`r${i}`}>
                <text className={s.axisLabel} x={0} y={y + cellHeight / 2} dominantBaseline="central">
                  {label !== rowLabels[i] ? <title>{rowLabels[i]}</title> : null}
                  {label}
                </text>
                {colLabels.map((_, j) => {
                  const v = values[i]?.[j]
                  const c = heatPaint(v, scale, domain, tokens)
                  const x = labelWidth + j * cellWidth
                  return (
                    <g key={j}>
                      <rect className={s.cell} x={x + 1} y={y + 1} width={cellWidth - 2} height={cellHeight - 2} style={{ fill: c.fill }} />
                      <text
                        className={s.cellText}
                        data-ink={c.ink}
                        x={x + cellWidth / 2}
                        y={y + cellHeight / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {text(v)}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </g>
      </svg>
    </ChartFigure>
  )
}
