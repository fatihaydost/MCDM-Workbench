/**
 * Pure geometry of the weight sweep chart (closeness of every alternative against one criterion's weight) and of the
 * rank interval chart. No DOM, so it is tested without a browser; the SVG components only draw.
 */
import { estimateTextWidth, truncate } from './layout'
import { extent, niceDomain, niceTicks, scaleLinear, type Domain, type LinearScale } from './scale'

/**
 * Spreads label centres `ys` (any order) so that neighbours are at least `gap` apart, moving each as little as
 * possible, and keeps them inside [lo, hi] when there is room. Returns the new centres in the input order.
 */
export function spreadLabels(ys: readonly number[], gap: number, lo: number, hi: number): number[] {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a]! - ys[b]! || a - b)
  const out = ys.slice()
  // Downward pass: push each label below its upper neighbour.
  let prev = -Infinity
  for (const i of order) {
    const y = Math.max(ys[i]!, prev + gap, lo)
    out[i] = y
    prev = y
  }
  // Upward pass: pull the stack back inside the bottom edge, keeping the gaps.
  let next = Infinity
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k]!
    const y = Math.min(out[i]!, next - gap, hi)
    out[i] = y
    next = y
  }
  return out
}

export type SweepLayoutInput = {
  width: number
  /** Lines that get a name at their right end (default all); only these compete for label room. */
  labelled?: readonly number[] | undefined
  /** Height of the plot area (the lines), without axes and bands. */
  plotHeight?: number
  /** Grid of the swept weight, increasing, e.g. 0, 0.01, …, 1. */
  xs: readonly number[]
  /** series[i][p] = closeness of alternative i at xs[p]. */
  series: readonly (readonly number[])[]
  /** Values the y domain must include besides the series (the cursor's exact scores). */
  extra?: readonly number[]
  labels: readonly string[]
  fontSize?: number
}

export type SweepLayout = {
  width: number
  height: number
  /** Plot area in SVG coordinates. */
  left: number
  right: number
  top: number
  bottom: number
  x: LinearScale
  y: LinearScale
  /** One `M … L …` path per alternative, in the input order. */
  paths: string[]
  /** Line-end labels at the right, spread so they do not overlap. */
  ends: { index: number; text: string; full: string; y: number }[]
  xTicks: number[]
  yTicks: number[]
  /** Vertical positions of the two bands under the x axis (first place, full ranking) and of the tick labels. */
  bandTopY: number
  bandRankingY: number
  tickY: number
  /** Baseline of the x axis title, under the tick labels. */
  titleY: number
}

const LABEL_GAP = 14
const AXIS_LEFT = 40

/** Shortest path text for a polyline, 2 decimals (sub-pixel is enough). */
const num = (v: number) => (Math.round(v * 100) / 100).toString()

export function linePath(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${num(x)} ${num(y)}`).join('')
}

export function layoutSweep({ width, labelled, plotHeight = 240, xs, series, extra = [], labels, fontSize = 12 }: SweepLayoutInput): SweepLayout {
  const top = 22
  const bottom = top + plotHeight
  const left = AXIS_LEFT
  const named = labelled ?? labels.map((_, i) => i)
  const maxLabel = Math.max(0, ...named.map((i) => estimateTextWidth(labels[i] ?? '', fontSize)))
  const labelRoom = Math.ceil(Math.min(maxLabel, Math.max(width * 0.24, 40))) + 12
  const right = Math.max(left + 80, width - labelRoom)

  const all = [...series.flat(), ...extra]
  const e = extent(all) ?? [0, 1]
  const pad = Math.max((e[1] - e[0]) * 0.06, 0.01)
  // Scores in [0, 1] (closeness, SAW, VIKOR Q, COPRAS Q, which add up to 1) keep the axis inside [0, 1]; a method whose
  // scores leave it (a score below 0 or above 1) gets the axis its data need, so no line is cut off.
  const lo = e[0] >= 0 ? Math.max(0, e[0] - pad) : e[0] - pad
  const hi = e[1] <= 1 ? Math.min(1, e[1] + pad) : e[1] + pad
  const yDomain: Domain = niceDomain(lo, hi, 4)
  const x = scaleLinear([xs[0] ?? 0, xs[xs.length - 1] ?? 1], [left, right])
  const y = scaleLinear(yDomain, [bottom, top])

  const paths = series.map((s) => linePath(xs.map((w, p) => [x(w), y(s[p] ?? Number.NaN)] as const).filter(([, py]) => Number.isFinite(py))))
  const lastY = named.map((i) => y(series[i]?.[series[i]!.length - 1] ?? 0))
  const spread = spreadLabels(lastY, LABEL_GAP, top, bottom)
  const ends = named.map((index, k) => {
    const full = labels[index] ?? ''
    return { index, full, text: truncate(full, labelRoom - 8, fontSize), y: spread[k]! }
  })

  const bandTopY = bottom + 6
  const bandRankingY = bottom + 15
  const tickY = bottom + 30
  const titleY = tickY + 20
  return {
    width,
    height: titleY + 8,
    left,
    right,
    top,
    bottom,
    x,
    y,
    paths,
    ends,
    xTicks: niceTicks(x.domain[0], x.domain[1], width < 480 ? 4 : 5),
    yTicks: niceTicks(yDomain[0], yDomain[1], 4),
    bandTopY,
    bandRankingY,
    tickY,
    titleY,
  }
}

// ---------------------------------------------------------------------------------------------
// Rank intervals (Monte Carlo): mean rank as a dot, the 2.5-97.5 % interval as a whisker.
// ---------------------------------------------------------------------------------------------

export type RankIntervalInput = {
  width: number
  labels: readonly string[]
  mean: readonly number[]
  interval: readonly (readonly [number, number])[]
  /** Number of ranks (the x axis runs 1..ranks). */
  ranks: number
  format: (v: number) => string
  fontSize?: number
  rowStep?: number
}

export type RankIntervalRow = {
  index: number
  label: string
  shortLabel: string
  y: number
  mean: number
  x: number
  lo: number
  hi: number
  text: string
}

export type RankIntervalLayout = {
  width: number
  height: number
  left: number
  right: number
  axisY: number
  x: LinearScale
  ticks: number[]
  rows: RankIntervalRow[]
}

/** Rows sorted by mean rank (ties keep input order); x runs from rank 1 (left) to the last rank. */
export function layoutRankIntervals({
  width,
  labels,
  mean,
  interval,
  ranks,
  format,
  fontSize = 13,
  rowStep = 28,
}: RankIntervalInput): RankIntervalLayout {
  const maxLabel = Math.max(0, ...labels.map((l) => estimateTextWidth(l, fontSize)))
  const left = Math.ceil(Math.min(maxLabel + 16, Math.max(width * 0.3, 48)))
  const texts = mean.map((m) => format(m))
  const valueRoom = Math.ceil(Math.max(0, ...texts.map((t) => estimateTextWidth(t, fontSize))) + 12)
  const right = Math.max(left + 60, width - valueRoom)
  const x = scaleLinear([1, Math.max(2, ranks)], [left + 6, right - 6])
  const axisY = 16
  const order = mean.map((_, i) => i).sort((a, b) => mean[a]! - mean[b]! || a - b)
  const rows = order.map((index, k): RankIntervalRow => {
    const [a, b] = interval[index] ?? [mean[index]!, mean[index]!]
    return {
      index,
      label: labels[index] ?? '',
      shortLabel: truncate(labels[index] ?? '', left - 16, fontSize),
      y: axisY + 8 + k * rowStep,
      mean: mean[index]!,
      x: x(mean[index]!),
      lo: x(a),
      hi: x(b),
      text: texts[index]!,
    }
  })
  const ticks = Array.from({ length: Math.max(2, ranks) }, (_, r) => r + 1)
  return { width, height: axisY + 8 + rows.length * rowStep, left, right, axisY, x, ticks, rows }
}
