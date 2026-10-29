import type { JSX } from 'react'
import { truncate } from '../../../features/charts/layout'
import type {
  CatSlot,
  CriterionDeltaItem,
  CriterionProfileLegendItem,
  CriterionProfileRow,
} from './types'

const round2 = (n: number): number => Math.round(n * 100) / 100

export function catColorVar(slot: CatSlot): string {
  return slot === 'other' ? 'var(--data-context)' : `var(--data-cat-${slot})`
}

export function CriterionProfileChart(props: {
  rows: readonly CriterionProfileRow[]
  legend: readonly CriterionProfileLegendItem[]
  altNames: readonly string[]
  criterionLabel: (col: number | 'others', restCount?: number) => string
  formatValue: (v: number) => string
  ariaLabel: string
}): JSX.Element {
  const { rows, legend, altNames, criterionLabel, formatValue, ariaLabel } = props
  const width = 360
  const labelWidth = 92
  const valueWidth = 46
  const plotLeft = labelWidth + 6
  const plotRight = width - valueWidth - 4
  const plotWidth = Math.max(40, plotRight - plotLeft)
  const rowStep = 20
  const barHeight = 11
  const height = Math.max(24, rows.length * rowStep + 4)
  const maxTotal = Math.max(...rows.map((r) => r.totalProfile), 1e-9)

  return (
    <div className="flex flex-col gap-1.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="block overflow-visible"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        data-testid="criterion-profile-chart"
      >
        {rows.map((row, idx) => {
          const yTop = idx * rowStep + 2
          const yMid = yTop + rowStep / 2 - 1
          const barY = yMid - barHeight / 2
          const isLeader = row.rank === 1
          const rawName = altNames[row.altIndex] ?? `#${row.altIndex + 1}`
          const shortName = truncate(rawName, labelWidth - 4, 10)
          let cursor = plotLeft
          const nonZeroSegments = row.segments.filter((seg) => seg.value > 1e-9)

          return (
            <g key={row.altIndex} data-testid="profile-row" data-alt={row.altIndex}>
              <text
                x={labelWidth}
                y={yMid}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={isLeader ? 600 : 400}
                fill={isLeader ? 'var(--text)' : 'var(--text-2)'}
              >
                {shortName}
              </text>
              <rect
                x={plotLeft}
                y={barY}
                width={plotWidth}
                height={barHeight}
                rx={1.5}
                fill="var(--surface-2)"
              />
              {nonZeroSegments.map((seg, sIdx) => {
                const segW = Math.max(1, (seg.value / maxTotal) * plotWidth)
                const x = cursor
                cursor += segW
                const drawW = sIdx + 1 < nonZeroSegments.length ? Math.max(0.5, segW - 1) : segW
                return (
                  <rect
                    key={seg.key}
                    x={round2(x)}
                    y={barY}
                    width={round2(drawW)}
                    height={barHeight}
                    rx={1}
                    fill={catColorVar(seg.catSlot)}
                    data-slot={seg.catSlot}
                  />
                )
              })}
              <text
                x={width - 2}
                y={yMid}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={isLeader ? 600 : 400}
                fill={isLeader ? 'var(--text)' : 'var(--text-2)'}
              >
                {formatValue(row.totalProfile)}
              </text>
            </g>
          )
        })}
      </svg>

      {legend.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 text-[10px] leading-tight text-text-2">
          {legend.map((item) => {
            const label = criterionLabel(item.col, item.restCount)
            return (
              <li key={item.key} className="inline-flex items-center gap-1">
                <svg width={8} height={8} viewBox="0 0 8 8" aria-hidden className="shrink-0">
                  <rect width={8} height={8} rx={1} fill={catColorVar(item.catSlot)} />
                </svg>
                <span className="truncate max-w-[120px]">{label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function HeadToHeadDeltaChart(props: {
  items: readonly CriterionDeltaItem[]
  pairNames: readonly [string, string]
  critNames: readonly string[]
  formatDelta: (v: number) => string
  emptyText: string
  ariaLabel: string
}): JSX.Element {
  const { items, pairNames, critNames, formatDelta, emptyText, ariaLabel } = props
  const active = items.filter((d) => Math.abs(d.delta) > 1e-12)

  if (active.length === 0) {
    return (
      <p className="m-0 py-2 text-12 text-text-2" data-testid="head-to-head-empty">
        {emptyText}
      </p>
    )
  }

  const width = 280
  const labelWidth = 86
  const valueWidth = 46
  const plotLeft = labelWidth + 6
  const plotRight = width - valueWidth - 4
  const plotWidth = Math.max(60, plotRight - plotLeft)
  const zeroX = round2(plotLeft + plotWidth / 2)
  const halfSpan = plotWidth / 2
  const headHeight = 16
  const rowStep = 20
  const barHeight = 10
  const height = headHeight + active.length * rowStep + 4
  const maxAbs = Math.max(...active.map((d) => Math.abs(d.delta)), 1e-9)

  const shortA = truncate(pairNames[0], 72, 9.5)
  const shortB = truncate(pairNames[1], 72, 9.5)

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className="block overflow-visible"
      style={{ fontVariantNumeric: 'tabular-nums' }}
      data-testid="head-to-head-chart"
    >
      <text
        x={zeroX - 4}
        y={8}
        textAnchor="end"
        dominantBaseline="central"
        fontSize={9.5}
        fontWeight={500}
        fill="var(--data-negative)"
      >
        {`← ${shortB}`}
      </text>
      <text
        x={zeroX + 4}
        y={8}
        textAnchor="start"
        dominantBaseline="central"
        fontSize={9.5}
        fontWeight={600}
        fill="var(--data-accent)"
      >
        {`${shortA} →`}
      </text>

      <line
        x1={zeroX}
        x2={zeroX}
        y1={headHeight - 2}
        y2={height - 2}
        stroke="var(--line-strong)"
        strokeWidth={1}
      />

      {active.map((item, idx) => {
        const yTop = headHeight + idx * rowStep
        const yMid = yTop + rowStep / 2
        const barY = yMid - barHeight / 2
        const rawCrit = critNames[item.col] ?? `C${item.col + 1}`
        const shortCrit = truncate(rawCrit, labelWidth - 4, 10)
        const barW = Math.max(2, (Math.abs(item.delta) / maxAbs) * (halfSpan - 4))
        const isPos = item.delta >= 0
        const barX = isPos ? zeroX : zeroX - barW

        return (
          <g key={item.col} data-testid="delta-row" data-col={item.col}>
            <text
              x={labelWidth}
              y={yMid}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={10}
              fill="var(--text-2)"
            >
              {shortCrit}
            </text>
            <rect
              x={round2(barX)}
              y={barY}
              width={round2(barW)}
              height={barHeight}
              rx={1.5}
              fill={isPos ? 'var(--data-accent)' : 'var(--data-negative)'}
            />
            <text
              x={width - 2}
              y={yMid}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={10}
              fontWeight={isPos ? 600 : 500}
              fill={isPos ? 'var(--text)' : 'var(--text-2)'}
            >
              {formatDelta(item.delta)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function StabilityBandSparkbar(props: {
  weight: number
  interval: { from: number; to: number } | null
  ariaLabel: string
}): JSX.Element {
  const { weight, interval, ariaLabel } = props
  const pad = 4
  const trackW = 80
  const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))
  const wX = round2(pad + clamp01(weight) * trackW)

  const bandFrom = interval ? clamp01(interval.from) : null
  const bandTo = interval ? clamp01(interval.to) : null
  const bandX = bandFrom !== null ? round2(pad + bandFrom * trackW) : 0
  const bandW =
    bandFrom !== null && bandTo !== null
      ? round2(Math.max(2, (bandTo - bandFrom) * trackW))
      : 0

  return (
    <svg
      width={88}
      height={14}
      viewBox="0 0 88 14"
      role="img"
      aria-label={ariaLabel}
      className="inline-block align-middle overflow-visible"
    >
      <rect x={pad} y={5} width={trackW} height={4} rx={1.5} fill="var(--surface-2)" />
      {interval !== null && (
        <rect
          x={bandX}
          y={3.5}
          width={bandW}
          height={7}
          rx={1.5}
          fill="var(--data-accent)"
          fillOpacity={0.28}
          stroke="var(--data-accent)"
          strokeWidth={0.75}
          data-testid="sparkbar-band"
        />
      )}
      <line
        x1={wX}
        x2={wX}
        y1={1.5}
        y2={12.5}
        stroke={interval !== null ? 'var(--data-accent)' : 'var(--text-2)'}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MiniScoreBar(props: {
  value: number
  scores: readonly number[]
  order: 'asc' | 'desc'
  isLeader: boolean
}): JSX.Element {
  const { value, scores, order, isLeader } = props
  const finite = scores.filter((v) => Number.isFinite(v))

  if (!Number.isFinite(value) || finite.length === 0) {
    return <span className="inline-block h-2 w-12 rounded-[1px] bg-surface-2 align-middle" aria-hidden />
  }

  const minScore = Math.min(...finite)
  const maxScore = Math.max(...finite)
  const span = maxScore - minScore
  const fill = isLeader ? 'var(--data-accent)' : 'var(--data-context)'

  if (order === 'asc') {
    const strength = span <= 1e-12 ? 1 : (maxScore - value) / span
    const widthPct = round2(Math.max(8, Math.min(100, strength * 100)))
    return (
      <span
        className="relative inline-block h-2 w-12 overflow-hidden rounded-[1px] bg-surface-2 align-middle"
        aria-hidden
      >
        <span
          className="absolute inset-y-0 left-0 rounded-[1px]"
          style={{ width: `${widthPct}%`, backgroundColor: fill }}
        />
      </span>
    )
  }

  if (minScore < 0) {
    const lo = Math.min(0, minScore)
    const hi = Math.max(0, maxScore)
    const totalSpan = hi - lo > 1e-12 ? hi - lo : 1
    const zeroPct = round2(((0 - lo) / totalSpan) * 100)
    const isNeg = value < 0
    const rawW = (Math.abs(value) / totalSpan) * 100
    const widthPct = round2(Math.max(isLeader ? 4 : 0, Math.min(100, rawW)))
    const leftPct = isNeg ? round2(Math.max(0, zeroPct - widthPct)) : zeroPct
    const barColor = isNeg ? 'var(--data-negative)' : fill

    return (
      <span
        className="relative inline-block h-2 w-12 overflow-hidden rounded-[1px] bg-surface-2 align-middle"
        aria-hidden
      >
        <span
          className="absolute inset-y-0 w-px bg-line-strong"
          style={{ left: `${zeroPct}%` }}
        />
        <span
          className="absolute inset-y-0 rounded-[1px]"
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: barColor }}
        />
      </span>
    )
  }

  const hi = maxScore > 1e-12 ? maxScore : 1
  const widthPct = round2(Math.max(isLeader ? 8 : 0, Math.min(100, (value / hi) * 100)))

  return (
    <span
      className="relative inline-block h-2 w-12 overflow-hidden rounded-[1px] bg-surface-2 align-middle"
      aria-hidden
    >
      <span
        className="absolute inset-y-0 left-0 rounded-[1px]"
        style={{ width: `${widthPct}%`, backgroundColor: fill }}
      />
    </span>
  )
}
