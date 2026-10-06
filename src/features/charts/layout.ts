/**
 * Pure geometry for the charts: text width estimates, bar rows and heatmap cells. No DOM, so the
 * layout can be tested and the SVG components only draw.
 */
import { contrast, labToRgb, mixOklab, mixOklch, oklchToRgb, type Oklch, type Rgb } from './color'
import { normalize, scaleLinear, type Domain } from './scale'

/** Rough width of `text` in IBM Plex Sans at `fontSize` px (average glyph ~0.56 em, digits 0.6 em). */
export function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0
  for (const ch of text) w += /[0-9]/.test(ch) ? 0.6 : /[ .,:;'|il]/.test(ch) ? 0.3 : /[MWmw@%]/.test(ch) ? 0.85 : 0.56
  return w * fontSize
}

/** Cuts `text` with an ellipsis so it fits `maxWidth`. */
export function truncate(text: string, maxWidth: number, fontSize: number): string {
  if (estimateTextWidth(text, fontSize) <= maxWidth) return text
  const chars = [...text]
  while (chars.length > 1 && estimateTextWidth(`${chars.join('')}…`, fontSize) > maxWidth) chars.pop()
  return chars.length > 0 && maxWidth > fontSize ? `${chars.join('').trimEnd()}…` : ''
}

// ---------------------------------------------------------------------------------------------
// Bar chart
// ---------------------------------------------------------------------------------------------

export type BarSort = 'desc' | 'asc' | 'none'

/** Display order of the values: indices sorted by value (ties keep input order), or input order. */
export function barOrder(values: readonly number[], sort: BarSort): number[] {
  const idx = values.map((_, i) => i)
  if (sort === 'none') return idx
  const key = (i: number) => {
    const v = values[i]!
    return Number.isFinite(v) ? v : sort === 'desc' ? -Infinity : Infinity
  }
  return idx.sort((a, b) => (sort === 'desc' ? key(b) - key(a) : key(a) - key(b)) || a - b)
}

export type BarRow = {
  /** Index into the input arrays. */
  index: number
  label: string
  /** Label cut to fit the label column. */
  shortLabel: string
  value: number
  text: string
  y: number
  /** Left edge and width of the bar (0 for a zero or non-finite value; at least 2 px when highlighted). */
  x: number
  width: number
  /** Value label position and anchor: after the bar end, on the side the bar grows to. */
  textX: number
  anchor: 'start' | 'end'
  highlight: boolean
}

export type BarLayout = {
  width: number
  height: number
  labelWidth: number
  zeroX: number
  rowStep: number
  barHeight: number
  /** Whether there is a negative value (the zero line then sits inside the plot). */
  hasNegative: boolean
  rows: BarRow[]
}

export type BarLayoutInput = {
  labels: readonly string[]
  values: readonly number[]
  width: number
  format: (value: number) => string
  sort?: BarSort
  highlight?: number | undefined
  /** Fixed value domain; defaults to [min(0, values), max(0, values)]. */
  domain?: Domain | undefined
  fontSize?: number
  rowStep?: number
  barHeight?: number
}

const GAP = 8
const VALUE_GAP = 4
/** Smallest drawn highlighted bar (px), so a highlighted zero value is still a visible mark. */
const MIN_BAR = 2

export function layoutBars({
  labels,
  values,
  width,
  format,
  sort = 'none',
  highlight,
  domain,
  fontSize = 13,
  rowStep = 28,
  barHeight = 16,
}: BarLayoutInput): BarLayout {
  const finite = values.filter((v) => Number.isFinite(v))
  const lo = domain ? domain[0] : Math.min(0, ...finite)
  const hi = domain ? domain[1] : Math.max(0, ...finite)
  const d: Domain = lo === hi ? [lo, lo + 1] : [lo, hi]
  const hasNegative = d[0] < 0
  const hasPositive = d[1] > 0

  const texts = values.map((v) => (Number.isFinite(v) ? format(v) : ''))
  const maxLabel = Math.max(0, ...labels.map((l) => estimateTextWidth(l, fontSize)))
  const labelWidth = Math.ceil(Math.min(maxLabel + GAP * 2, Math.max(width * 0.4, 48)))
  const valueWidth = Math.ceil(Math.max(0, ...texts.map((t) => estimateTextWidth(t, fontSize))) + VALUE_GAP + 2)
  const plotLeft = labelWidth + (hasNegative ? valueWidth : 0)
  const plotRight = Math.max(plotLeft + 1, width - (hasPositive ? valueWidth : 0))
  const x = scaleLinear(d, [plotLeft, plotRight])
  const zeroX = x(Math.min(Math.max(0, d[0]), d[1]))

  const order = barOrder(values, sort)
  const rows = order.map((index, k): BarRow => {
    const value = values[index]!
    const ok = Number.isFinite(value)
    const end = ok ? x(value) : zeroX
    const negative = ok && value < 0
    const mark = ok && highlight === index
    return {
      index,
      label: labels[index] ?? '',
      shortLabel: truncate(labels[index] ?? '', labelWidth - GAP * 2, fontSize),
      value,
      text: texts[index]!,
      y: k * rowStep,
      // The highlighted bar at (or next to) zero still gets a 2 px mark, so the best of a lower-is-better score
      // (VIKOR Q = 0) shows; other zero values stay empty.
      x: mark && Math.abs(end - zeroX) < MIN_BAR ? (negative ? zeroX - MIN_BAR : zeroX) : Math.min(zeroX, end),
      width: mark ? Math.max(Math.abs(end - zeroX), MIN_BAR) : Math.abs(end - zeroX),
      textX: negative ? end - VALUE_GAP : end + VALUE_GAP,
      anchor: negative ? 'end' : 'start',
      highlight: highlight === index,
    }
  })

  return { width, height: rows.length * rowStep, labelWidth, zeroX, rowStep, barHeight, hasNegative, rows }
}

// ---------------------------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------------------------

export type HeatmapLayoutInput = {
  rowLabels: readonly string[]
  colLabels: readonly string[]
  width: number
  fontSize?: number
  cellHeight?: number
  minCellWidth?: number
  maxCellWidth?: number
}

export type HeatmapLayout = {
  /** Drawn width; wider than the container when the cells hit their minimum width. */
  width: number
  height: number
  labelWidth: number
  headerHeight: number
  cellWidth: number
  cellHeight: number
  rowLabels: string[]
  colLabels: string[]
  /**
   * True when the column labels did not fit and the matrix is square with the same labels on
   * both axes (a correlation matrix): columns then show 1..n and rows "1 Price", so the rows are
   * the legend instead of every column being cut ("Screen…", "Pixel de…").
   */
  numbered: boolean
}

export function layoutHeatmap({
  rowLabels,
  colLabels,
  width,
  fontSize = 12,
  cellHeight = 28,
  minCellWidth = 44,
  maxCellWidth = 96,
}: HeatmapLayoutInput): HeatmapLayout {
  const cols = Math.max(colLabels.length, 1)
  // The label column takes what the longest row name needs, up to 30% of the width, or more (up to
  // 200 px) when the cells still get their minimum width; only then are names cut.
  const cap = Math.max(width * 0.3, 64, Math.min(width - cols * minCellWidth, 200))
  const labelFor = (labels: readonly string[]) =>
    Math.ceil(Math.min(Math.max(0, ...labels.map((l) => estimateTextWidth(l, fontSize))) + GAP * 2, cap))
  const cellFor = (label: number) => Math.floor(Math.min(maxCellWidth, Math.max(minCellWidth, (width - label) / cols)))
  let labelWidth = labelFor(rowLabels)
  let cellWidth = cellFor(labelWidth)
  const headerHeight = 24
  const cut = colLabels.some((l) => estimateTextWidth(l, fontSize) > cellWidth - 6)
  const same = rowLabels.length === colLabels.length && rowLabels.every((l, i) => l === colLabels[i])
  const numbered = cut && same && colLabels.length > 1
  if (numbered) {
    // Size the column for the numbered names ("3 Pixel density"), which are wider.
    labelWidth = labelFor(rowLabels.map((l, i) => `${i + 1} ${l}`))
    cellWidth = cellFor(labelWidth)
  }
  return {
    width: labelWidth + cellWidth * colLabels.length,
    height: headerHeight + cellHeight * rowLabels.length,
    labelWidth,
    headerHeight,
    cellWidth,
    cellHeight,
    rowLabels: rowLabels.map((l, i) => truncate(numbered ? `${i + 1} ${l}` : l, labelWidth - GAP * 2, fontSize)),
    colLabels: colLabels.map((l, j) => (numbered ? String(j + 1) : truncate(l, cellWidth - 6, fontSize))),
    numbered,
  }
}

export type HeatScale = 'sequential' | 'diverging'

export type HeatColor = {
  /** CSS colour for the cell: a token or a `color-mix()` of tokens. */
  fill: string
  /** Which arm of the ramp the value is on. */
  tone: 'pos' | 'neg' | 'none'
  /** Intensity 0..10. */
  level: number
}

const pct = (t: number) => `${Math.round(t * 1000) / 10}%`

type Arm = { tone: HeatColor['tone']; token: '--data-heat-1' | '--data-negative'; space: 'oklch' | 'oklab'; t: number }

/** Where a value sits on the ramp: which end token, the mixing space and the share t (0..1). */
function heatArm(value: number, scale: HeatScale, domain?: Domain): Arm {
  if (scale === 'sequential') {
    const t = normalize(value, domain ?? [0, 1])
    return { tone: t > 0 ? 'pos' : 'none', token: '--data-heat-1', space: 'oklch', t }
  }
  const [lo, hi] = domain ?? [-1, 1]
  const mid = lo < 0 && hi > 0 ? 0 : (lo + hi) / 2
  if (value >= mid) {
    const t = hi === mid ? 0 : Math.min(1, (value - mid) / (hi - mid))
    return { tone: t > 0 ? 'pos' : 'none', token: '--data-heat-1', space: 'oklch', t }
  }
  const t = lo === mid ? 0 : Math.min(1, (mid - value) / (mid - lo))
  return { tone: 'neg', token: '--data-negative', space: 'oklab', t }
}

/**
 * Cell colour from the data colour tokens.
 * - sequential: `--data-heat-0` to `--data-heat-1` over `domain` (default 0..1), mixed in OKLCH;
 * - diverging: `--data-negative` <- `--data-heat-0` (at 0) -> `--data-heat-1` over `domain`
 *   (default -1..1). The negative arm mixes in OKLab: the neutral end is almost achromatic, and an
 *   OKLCH mix from hue 218 to hue 27 would swing through purple on the way.
 */
export function heatColor(value: number | null | undefined, scale: HeatScale, domain?: Domain): HeatColor {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { fill: 'var(--surface-2)', tone: 'none', level: 0 }
  const arm = heatArm(value, scale, domain)
  return { fill: mix(arm.token, arm.t, arm.space), tone: arm.tone, level: Math.round(arm.t * 10) }
}

function mix(token: string, t: number, space: 'oklch' | 'oklab'): string {
  if (t <= 0) return 'var(--data-heat-0)'
  if (t >= 1) return `var(${token})`
  return `color-mix(in ${space}, var(${token}) ${pct(t)}, var(--data-heat-0))`
}

/** Resolved token colours of the active theme (read from the page, or from tokens.css in tests). */
export type HeatTokens = { heat0: Oklch; heat1: Oklch; negative: Oklch; text: Oklch; bg: Oklch }

export type HeatPaint = {
  fill: string
  /** Token for the printed value: whichever of `--text` and `--bg` contrasts more with the fill. */
  ink: 'text' | 'bg'
  /** Measured contrast of the value text on the fill. */
  contrast: number
}

/** DESIGN.md §Accessibility: text contrast >= 4.5:1. The small margin absorbs 8-bit rounding. */
export const HEAT_TEXT_CONTRAST = 4.6
/** Largest change of the ramp share t to move a fill out of a band where no ink reaches 4.5:1. */
const MAX_NUDGE = 0.2
const NUDGE_STEP = 0.005

function armRgb(arm: Pick<Arm, 'token' | 'space'>, t: number, k: HeatTokens): Rgb {
  const end = arm.token === '--data-negative' ? k.negative : k.heat1
  const p = Math.min(1, Math.max(0, t))
  return labToRgb(arm.space === 'oklab' ? mixOklab(end, k.heat0, p) : mixOklch(end, k.heat0, p))
}

function bestInk(fill: Rgb, text: Rgb, bg: Rgb): { ink: 'text' | 'bg'; contrast: number } {
  const onText = contrast(fill, text)
  const onBg = contrast(fill, bg)
  return onText >= onBg ? { ink: 'text', contrast: onText } : { ink: 'bg', contrast: onBg }
}

/**
 * Fill and value-text colour of one cell, chosen by measured contrast instead of fixed
 * thresholds. Where the ramp crosses a mid tone on which neither `--text` nor `--bg` reaches
 * 4.5:1, the fill moves to the nearest share of the ramp that does (at most 0.2 of the ramp,
 * usually a few hundredths); the printed value and the table keep the exact number.
 * Without tokens (first render, no DOM) it falls back to `heatColor` with `--text`.
 */
export function heatPaint(value: number | null | undefined, scale: HeatScale, domain: Domain | undefined, tokens: HeatTokens | null): HeatPaint {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { fill: 'var(--surface-2)', ink: 'text', contrast: 0 }
  const arm = heatArm(value, scale, domain)
  if (!tokens) return { fill: mix(arm.token, arm.t, arm.space), ink: 'text', contrast: 0 }
  const text = oklchToRgb(tokens.text)
  const bg = oklchToRgb(tokens.bg)
  const at = (t: number) => ({ t, ...bestInk(armRgb(arm, t, tokens), text, bg) })
  let best = at(arm.t)
  if (best.contrast < HEAT_TEXT_CONTRAST) {
    for (let d = NUDGE_STEP; d <= MAX_NUDGE + 1e-9; d += NUDGE_STEP) {
      // The weaker side wins a tie, so the fill never looks stronger than the value is.
      const down = arm.t - d >= 0 ? at(arm.t - d) : null
      const up = arm.t + d <= 1 ? at(arm.t + d) : null
      const ok = [down, up].filter((x): x is NonNullable<typeof x> => x !== null && x.contrast >= HEAT_TEXT_CONTRAST)
      if (ok.length > 0) {
        best = ok[0]!
        break
      }
    }
  }
  return { fill: mix(arm.token, best.t, arm.space), ink: best.ink, contrast: best.contrast }
}
