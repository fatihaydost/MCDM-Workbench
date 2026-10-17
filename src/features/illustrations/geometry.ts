/**
 * Pure data for the method illustrations. Everything is read from the core's own steps, so a
 * picture can never disagree with the worked calculation. No DOM.
 */
import { critic } from '../../core/methods/critic'
import { edas } from '../../core/methods/edas'
import { maxOf } from '../../core/math'
import { entropy, type EntropyParams } from '../../core/methods/entropy'
import { merec } from '../../core/methods/merec'
import { sd } from '../../core/methods/sd'
import { saw, type SawParams } from '../../core/methods/saw'
import { topsis } from '../../core/methods/topsis'
import { vikor, vikorCompromise, vikorTerm, type VikorCompromise, type VikorParams } from '../../core/methods/vikor'
import type { Problem, RankingResult, Step, WeightingResult } from '../../core/types'
import { scaleLinear, type Domain, type LinearScale } from '../charts/scale'

const stepMatrix = (steps: Step[], key: string): number[][] => {
  const s = steps.find((x) => x.key === key)
  if (!s?.matrix) throw new Error(`step ${key} has no matrix`)
  return s.matrix
}

const stepVector = (steps: Step[], key: string): number[] => {
  const s = steps.find((x) => x.key === key)
  if (!s?.vector) throw new Error(`step ${key} has no vector`)
  return s.vector
}

// ---------------------------------------------------------------------------------------------
// TOPSIS geometry
// ---------------------------------------------------------------------------------------------

/**
 * The two criteria to draw: the two with the largest weight (ties keep the lower index), returned
 * in criterion order so the x axis is always the earlier column.
 */
export function defaultAxes(weights: readonly number[]): [number, number] {
  const order = weights.map((_, j) => j).sort((a, b) => weights[b]! - weights[a]! || a - b)
  const a = order[0] ?? 0
  const b = order[1] ?? Math.min(1, weights.length - 1)
  return a < b ? [a, b] : [b, a]
}

export type Point = { x: number; y: number }

export type TopsisProjection = {
  result: RankingResult
  /** Criterion indices on the x and y axis. */
  axes: [number, number]
  /** Weighted normalized values v_ij of every alternative on the two axes. */
  points: Point[]
  /** A+ and A- on the two axes (weighted normalized space, as in the core steps). */
  ideal: Point
  antiIdeal: Point
  /** n-dimensional distances and closeness from the core. */
  dPlus: number[]
  dMinus: number[]
  closeness: number[]
  /** Whether the picture is exact (two criteria) or a projection of more. */
  exact: boolean
}

/**
 * Runs TOPSIS through the core and takes the two chosen columns of its weighted normalized matrix,
 * ideal and anti-ideal. Returns null when the problem cannot be computed or has fewer than two
 * criteria.
 */
export function topsisProjection(problem: Problem, weights: readonly number[], axes?: [number, number]): TopsisProjection | null {
  const n = problem.criteria.length
  if (n < 2) return null
  let result: RankingResult
  try {
    result = topsis.compute(problem, [...weights], {})
  } catch {
    return null
  }
  const [a, b] = axes && axes[0] !== axes[1] && axes.every((j) => j >= 0 && j < n) ? axes : defaultAxes(weights)
  const v = stepMatrix(result.steps, 'topsis.weighted')
  const best = stepVector(result.steps, 'topsis.idealBest')
  const worst = stepVector(result.steps, 'topsis.idealWorst')
  return {
    result,
    axes: [a, b],
    points: v.map((row) => ({ x: row[a]!, y: row[b]! })),
    ideal: { x: best[a]!, y: best[b]! },
    antiIdeal: { x: worst[a]!, y: worst[b]! },
    dPlus: stepVector(result.steps, 'topsis.distanceBest'),
    dMinus: stepVector(result.steps, 'topsis.distanceWorst'),
    closeness: result.scores,
    exact: n === 2,
  }
}

/** Euclidean distance in the plane. */
export const planarDistance = (p: Point, q: Point): number => Math.hypot(p.x - q.x, p.y - q.y)

export type PlotBox = { left: number; right: number; top: number; bottom: number }

export type PlotFit = { x: LinearScale; y: LinearScale; box: PlotBox; height: number }

export type FitOptions = {
  margin: { left: number; right: number; top: number; bottom: number }
  minPlotHeight?: number
  maxPlotHeight?: number
  /** Space around the A+ / A- rectangle, as a fraction of its longer side. */
  pad?: number
}

/**
 * Screen scales for the criterion-plane picture.
 * - One unit is the same number of pixels on both axes, so a drawn distance is a true (planar)
 *   Euclidean distance; the height follows the data, clamped, and the data is centred.
 * - Values grow to the right and up on both axes, also on a cost criterion (no reversed axis):
 *   the axis label says which direction is better, and A+ sits wherever the data puts it.
 */
export function fitPlot(proj: Pick<TopsisProjection, 'ideal' | 'antiIdeal'>, width: number, opts: FitOptions): PlotFit {
  const { margin, minPlotHeight = 140, maxPlotHeight = 300, pad = 0.08 } = opts
  const { ideal, antiIdeal } = proj
  const spanX = Math.abs(ideal.x - antiIdeal.x)
  const spanY = Math.abs(ideal.y - antiIdeal.y)
  const span = Math.max(spanX, spanY) || Math.max(Math.abs(ideal.x), Math.abs(ideal.y), 1)
  const p = span * pad
  const dx = Math.max(spanX, span * 1e-3) + 2 * p
  const dy = Math.max(spanY, span * 1e-3) + 2 * p
  const plotW = Math.max(1, width - margin.left - margin.right)
  let k = plotW / dx
  let plotH = dy * k
  if (plotH > maxPlotHeight) {
    plotH = maxPlotHeight
    k = plotH / dy
  }
  plotH = Math.max(plotH, minPlotHeight)
  const box: PlotBox = { left: margin.left, right: margin.left + plotW, top: margin.top, bottom: margin.top + plotH }
  const axis = (a: number, b: number, half: number, r: Domain): LinearScale => {
    const mid = (a + b) / 2
    return scaleLinear([mid - half, mid + half], r)
  }
  return {
    x: axis(antiIdeal.x, ideal.x, plotW / k / 2, [box.left, box.right]),
    y: axis(antiIdeal.y, ideal.y, plotH / k / 2, [box.bottom, box.top]),
    box,
    height: box.bottom + margin.bottom,
  }
}

// ---------------------------------------------------------------------------------------------
// TOPSIS distance plane (exact in any number of criteria)
// ---------------------------------------------------------------------------------------------

/** The rays of constant closeness drawn on the distance plane. */
export const ISO_C_DEFAULT = [0.25, 0.5, 0.75] as const

/** Every alternative as (D+, D-): x is the distance to A+, y the distance to A-, from the core. */
export function distancePoints(proj: Pick<TopsisProjection, 'dPlus' | 'dMinus'>): Point[] {
  return proj.dPlus.map((d, i) => ({ x: d, y: proj.dMinus[i]! }))
}

/** Closeness of a point of the distance plane: C = D- / (D+ + D-) = y / (x + y). */
export const closenessAt = (p: Point): number => (p.x + p.y > 0 ? p.y / (p.x + p.y) : 0)

/**
 * Where the ray of constant closeness C leaves the box [0, xMax] x [0, yMax]. Every point on
 * the ray y = x * C / (1 - C) has closeness C; `side` says which edge it leaves by.
 */
export function isoClosenessEnd(c: number, xMax: number, yMax: number): Point & { side: 'top' | 'right' } {
  const ux = 1 - c
  const uy = c
  const tx = ux > 0 ? xMax / ux : Infinity
  const ty = uy > 0 ? yMax / uy : Infinity
  const t = Math.min(tx, ty)
  return { x: ux * t, y: uy * t, side: ty <= tx ? 'top' : 'right' }
}

export type PlaneFit = PlotFit & { xMax: number; yMax: number }

/**
 * Screen scales for the distance plane: both axes start at 0, one scale on both (so the C = 0.5
 * ray is the 45 degree diagonal), the height follows the data and is clamped.
 */
export function fitDistancePlane(points: readonly Point[], width: number, opts: FitOptions): PlaneFit {
  const { margin, minPlotHeight = 140, maxPlotHeight = 300, pad = 0.12 } = opts
  let plotW = Math.max(1, width - margin.left - margin.right)
  const mx = Math.max(maxOf(points.map((p) => p.x)), 0)
  const my = Math.max(maxOf(points.map((p) => p.y)), 0)
  const m = Math.max(mx, my) || 1
  const dx = Math.max(mx, m * 0.25) * (1 + pad)
  const dy = Math.max(my, m * 0.25) * (1 + pad)
  let k = plotW / dx
  let plotH = dy * k
  if (plotH > maxPlotHeight) {
    plotH = maxPlotHeight
    k = plotH / dy
  }
  plotH = Math.max(plotH, minPlotHeight)
  // No empty band on the right: the plot is only as wide as the data needs at this scale.
  plotW = Math.min(plotW, dx * k)
  const box: PlotBox = { left: margin.left, right: margin.left + plotW, top: margin.top, bottom: margin.top + plotH }
  const xMax = plotW / k
  const yMax = plotH / k
  return {
    x: scaleLinear([0, xMax], [box.left, box.right]),
    y: scaleLinear([0, yMax], [box.bottom, box.top]),
    box,
    height: box.bottom + margin.bottom,
    xMax,
    yMax,
  }
}

/**
 * Where a reference point (A+ or A-) gets its coordinates: each of its two values is some alternative's value on that
 * axis. One segment per axis, from that alternative (the nearest, if several share the value) straight to the
 * reference point: vertical for the x value, horizontal for the y value. Left out when the alternative is the corner
 * itself on that axis (zero length). Compared with a relative tolerance, in data units.
 */
export function referenceGuides(points: readonly Point[], ref: Point): { from: Point; to: Point }[] {
  const span = Math.max(maxOf(points.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y)))), Math.abs(ref.x), Math.abs(ref.y), 1e-12)
  const eps = span * 1e-9
  const out: { from: Point; to: Point }[] = []
  for (const axis of ['x', 'y'] as const) {
    const other = axis === 'x' ? 'y' : 'x'
    let best: Point | null = null
    for (const p of points) {
      if (Math.abs(p[axis] - ref[axis]) > eps) continue
      if (!best || Math.abs(p[other] - ref[other]) < Math.abs(best[other] - ref[other])) best = p
    }
    if (best && Math.abs(best[other] - ref[other]) > eps) out.push({ from: best, to: ref })
  }
  return out
}

/** SVG path data of the straight line from `a` to `b`. */
export function linePath(a: Point, b: Point): string {
  return `M${a.x} ${a.y}L${b.x} ${b.y}`
}

/** CSS transform that puts an element drawn around the origin at `p`, so a move between two places can transition. */
export function pointCss(p: Point): string {
  return `translate(${p.x}px, ${p.y}px)`
}

// ---------------------------------------------------------------------------------------------
// CRITIC parts
// ---------------------------------------------------------------------------------------------

export type CriticParts = {
  result: WeightingResult
  /** Min-max normalized matrix r_ij (1 = best). */
  normalized: number[][]
  sigma: number[]
  conflict: number[]
  information: number[]
  weights: number[]
}

/** CRITIC through the core, with the steps the illustration draws. Null when it cannot run. */
export function criticParts(problem: Problem): CriticParts | null {
  let result: WeightingResult
  try {
    result = critic.compute(problem, {})
  } catch {
    return null
  }
  return {
    result,
    normalized: stepMatrix(result.steps, 'critic.normalized'),
    sigma: stepVector(result.steps, 'critic.sigma'),
    conflict: stepVector(result.steps, 'critic.conflict'),
    information: stepVector(result.steps, 'critic.information'),
    weights: result.weights,
  }
}

// ---------------------------------------------------------------------------------------------
// SD parts
// ---------------------------------------------------------------------------------------------

export type SdParts = {
  result: WeightingResult
  /** Min-max normalized matrix r_ij (1 = best). */
  normalized: number[][]
  sigma: number[]
  weights: number[]
}

/** SD through the core, with the steps the illustration draws. Null when it cannot run. */
export function sdParts(problem: Problem): SdParts | null {
  let result: WeightingResult
  try {
    result = sd.compute(problem, {})
  } catch {
    return null
  }
  return {
    result,
    normalized: stepMatrix(result.steps, 'sd.normalized'),
    sigma: stepVector(result.steps, 'sd.sigma'),
    weights: result.weights,
  }
}

// ---------------------------------------------------------------------------------------------
// MEREC parts
// ---------------------------------------------------------------------------------------------

export type MerecParts = {
  result: WeightingResult
  /** drops[j][i] = S_i - S'_ij: how much alternative i's performance falls when criterion j is removed. */
  drops: number[][]
  /** E_j = Σ_i drops[j][i]. */
  effect: number[]
  weights: number[]
}

/** MEREC through the core, with the per-alternative drops the illustration stacks. Null when it cannot run. */
export function merecParts(problem: Problem): MerecParts | null {
  let result: WeightingResult
  try {
    result = merec.compute(problem, {})
  } catch {
    return null
  }
  const s = stepVector(result.steps, 'merec.performance')
  const removed = stepMatrix(result.steps, 'merec.performanceRemoved')
  const drops = problem.criteria.map((_, j) => s.map((si, i) => Math.max(0, si - removed[i]![j]!)))
  return { result, drops, effect: stepVector(result.steps, 'merec.removalEffect'), weights: result.weights }
}

// ---------------------------------------------------------------------------------------------
// Entropy parts
// ---------------------------------------------------------------------------------------------

export type EntropyParts = {
  result: WeightingResult
  /** Shares p_ij (the sum or min-max variant's proportions step), alternatives x criteria. */
  shares: number[][]
  entropy: number[]
  diversification: number[]
  weights: number[]
  /**
   * The two criteria the idea picture compares: the most even one (largest e) and the most uneven one (smallest e),
   * in that order; the first two criteria when every e is the same.
   */
  pair: [number, number]
}

/** Entropy through the core, with the steps the illustration draws. Null when it cannot run. */
export function entropyParts(problem: Problem, params: EntropyParams = {}): EntropyParts | null {
  let result: WeightingResult
  try {
    result = entropy.compute(problem, params)
  } catch {
    return null
  }
  const shares = stepMatrix(result.steps, (params.normalization ?? 'sum') === 'sum' ? 'entropy.proportionsSum' : 'entropy.proportionsMinmax')
  const e = stepVector(result.steps, 'entropy.entropy')
  const even = argMax(e)
  const uneven = argMax(e.map((x) => -x))
  return {
    result,
    shares,
    entropy: e,
    diversification: stepVector(result.steps, 'entropy.diversification'),
    weights: result.weights,
    pair: even === uneven ? [0, 1] : [even, uneven],
  }
}

// ---------------------------------------------------------------------------------------------
// SAW
// ---------------------------------------------------------------------------------------------

export type SawParts = {
  result: RankingResult
  /** contributions[i][j] = w_j r_ij, the core's 'saw.weighted' step; row i sums to the score S_i. */
  contributions: number[][]
  scores: number[]
  /** Alternatives in rank order (ties keep input order). */
  order: number[]
}

/** The core's SAW result for the picture of its contributions, or null when SAW cannot run on the data. */
export function sawParts(problem: Problem, weights: readonly number[], params: SawParams = {}): SawParts | null {
  let result: RankingResult
  try {
    result = saw.compute(problem, [...weights], params)
  } catch {
    return null
  }
  const order = result.ranking.map((_, i) => i).sort((a, b) => result.ranking[a]! - result.ranking[b]! || a - b)
  return { result, contributions: stepMatrix(result.steps, 'saw.weighted'), scores: result.scores, order }
}

// ---------------------------------------------------------------------------------------------
// VIKOR
// ---------------------------------------------------------------------------------------------

export type VikorParts = {
  result: RankingResult
  /** Group utility S_i and individual regret R_i (the core's steps), lower is better. */
  S: number[]
  R: number[]
  Q: number[]
  /** The two terms of Q before v weighs them: (S - S*) / (S- - S*) and (R - R*) / (R- - R*), 0 when flat. */
  sTerm: number[]
  rTerm: number[]
  v: number
  compromise: VikorCompromise
  /** Alternatives in Q order (ties keep input order), the same order as a' and a''. */
  order: number[]
}

/** The core's VIKOR result for its picture, or null when VIKOR cannot run on the data. */
export function vikorParts(problem: Problem, weights: readonly number[], params: VikorParams = {}): VikorParts | null {
  let result: RankingResult
  try {
    result = vikor.compute(problem, [...weights], params)
  } catch {
    return null
  }
  const S = stepVector(result.steps, 'vikor.groupUtility')
  const R = stepVector(result.steps, 'vikor.individualRegret')
  const Q = result.scores
  const compromise = vikorCompromise(S, R, Q)
  // The core's own terms and order, so the picture agrees with Q when S or R is flat only up to rounding.
  return { result, S, R, Q, sTerm: vikorTerm(S), rTerm: vikorTerm(R), v: result.diagnostics?.v ?? 0.5, compromise, order: compromise.order }
}

// ---------------------------------------------------------------------------------------------
// EDAS
// ---------------------------------------------------------------------------------------------

export type EdasParts = {
  result: RankingResult
  /** above[i][j] = w_j PDA_ij and below[i][j] = w_j NDA_ij, the core's weighted distances (one of them is 0). */
  above: number[][]
  below: number[][]
  /** SP_i and SN_i: the row sums of above and below. */
  sp: number[]
  sn: number[]
  /** Appraisal scores AS_i. */
  scores: number[]
  /** Alternatives in rank order (ties keep input order). */
  order: number[]
}

/** The core's EDAS result for its picture, or null when EDAS cannot run on the data. */
export function edasParts(problem: Problem, weights: readonly number[]): EdasParts | null {
  let result: RankingResult
  try {
    result = edas.compute(problem, [...weights], {})
  } catch {
    return null
  }
  const order = result.ranking.map((_, i) => i).sort((a, b) => result.ranking[a]! - result.ranking[b]! || a - b)
  return {
    result,
    above: stepMatrix(result.steps, 'edas.weightedPda'),
    below: stepMatrix(result.steps, 'edas.weightedNda'),
    sp: stepVector(result.steps, 'edas.sp'),
    sn: stepVector(result.steps, 'edas.sn'),
    scores: result.scores,
    order,
  }
}

/** One segment of a diverging bar: criterion j on the side where its distance is, from x to x + width (px). */
export type DivergingSegment = { col: number; side: 'above' | 'below' | 'at'; value: number; x: number; width: number }

/**
 * The segments of one EDAS row around the average line at `center`: distances above the average stack to the right,
 * distances below it to the left, each side in criterion order outward from the line. A criterion at the average keeps
 * a zero-width segment on the line, so every criterion stays in the keyboard order and the table.
 */
export function divergingSegments(above: readonly number[], below: readonly number[], center: number, pxPerUnit: number): DivergingSegment[] {
  let right = 0
  let left = 0
  return above.map((a, col) => {
    const b = below[col] ?? 0
    if (a > 0) {
      const x = center + right * pxPerUnit
      right += a
      return { col, side: 'above', value: a, x, width: a * pxPerUnit }
    }
    if (b > 0) {
      left += b
      return { col, side: 'below', value: b, x: center - left * pxPerUnit, width: b * pxPerUnit }
    }
    return { col, side: 'at', value: 0, x: center, width: 0 }
  })
}

/**
 * Where the line of constant Q = q leaves the unit square of the (S term, R term) plane: v x + (1 - v) y = q.
 * Returns the two end points (x, y in [0, 1]), or null when the line misses the square (q > 1 or q < 0).
 */
export function isoQSegment(v: number, q: number): [Point, Point] | null {
  if (q < 0 || q > 1 + 1e-12) return null
  const pts: Point[] = []
  const push = (p: Point) => {
    if (p.x < -1e-12 || p.x > 1 + 1e-12 || p.y < -1e-12 || p.y > 1 + 1e-12) return
    if (pts.some((o) => Math.abs(o.x - p.x) < 1e-9 && Math.abs(o.y - p.y) < 1e-9)) return
    pts.push({ x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) })
  }
  if (v > 0) {
    push({ x: q / v, y: 0 })
    push({ x: (q - (1 - v)) / v, y: 1 })
  }
  if (v < 1) {
    push({ x: 0, y: q / (1 - v) })
    push({ x: 1, y: (q - v) / (1 - v) })
  }
  if (pts.length < 2) return pts.length === 1 ? [pts[0]!, pts[0]!] : null
  pts.sort((a, b) => a.x - b.x || b.y - a.y)
  return [pts[0]!, pts[pts.length - 1]!]
}

/** The part of the unit square where v x + (1 - v) y <= q (Sutherland-Hodgman against one half-plane). */
export function isoQRegion(v: number, q: number): Point[] {
  const square: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ]
  const f = (p: Point) => v * p.x + (1 - v) * p.y - q
  const out: Point[] = []
  square.forEach((p, k) => {
    const nxt = square[(k + 1) % 4]!
    const fp = f(p)
    const fn = f(nxt)
    if (fp <= 0) out.push(p)
    if ((fp < 0 && fn > 0) || (fp > 0 && fn < 0)) {
      const t = fp / (fp - fn)
      out.push({ x: p.x + t * (nxt.x - p.x), y: p.y + t * (nxt.y - p.y) })
    }
  })
  return out
}

/** One stacked segment: criterion j from x to x + width (screen px), in the bar of one alternative. */
export type StackSegment = { col: number; value: number; x: number; width: number }

/**
 * The segments of one stacked bar, left to right in criterion order: each starts where the previous one ends, so the
 * bar ends at x0 + (Σ values) * pxPerUnit. Zero contributions keep a zero-width segment (a criterion never vanishes
 * from the table or the keyboard order).
 */
export function stackSegments(values: readonly number[], x0: number, pxPerUnit: number): StackSegment[] {
  let acc = 0
  return values.map((value, col) => {
    const x = x0 + acc * pxPerUnit
    acc += value
    return { col, value, x, width: value * pxPerUnit }
  })
}

/** Index of the largest value (first on ties), or -1 for an empty list. */
export function argMax(values: readonly number[]): number {
  let best = -1
  for (let i = 0; i < values.length; i++) if (best < 0 || values[i]! > values[best]!) best = i
  return best
}

// ---------------------------------------------------------------------------------------------
// Step flow
// ---------------------------------------------------------------------------------------------

/** A node of the step map: its key is the first core step key it covers. */
export type FlowNode = { key: string; stepKeys: readonly string[] }

/** TOPSIS in five nodes: Normalize, Weight, Ideal points, Distances, Closeness. */
export const TOPSIS_FLOW: readonly FlowNode[] = [
  { key: 'topsis.normalized', stepKeys: ['topsis.normalized'] },
  { key: 'topsis.weighted', stepKeys: ['topsis.weighted'] },
  { key: 'topsis.idealBest', stepKeys: ['topsis.idealBest', 'topsis.idealWorst'] },
  { key: 'topsis.distanceBest', stepKeys: ['topsis.distanceBest', 'topsis.distanceWorst'] },
  { key: 'topsis.closeness', stepKeys: ['topsis.closeness'] },
]

/** CRITIC in five nodes: Normalize, Contrast, Correlation, Information, Weights. */
export const CRITIC_FLOW: readonly FlowNode[] = [
  { key: 'critic.normalized', stepKeys: ['critic.normalized'] },
  { key: 'critic.sigma', stepKeys: ['critic.sigma'] },
  { key: 'critic.correlation', stepKeys: ['critic.correlation', 'critic.conflict'] },
  { key: 'critic.information', stepKeys: ['critic.information', 'critic.informationTotal'] },
  { key: 'critic.weights', stepKeys: ['critic.weights'] },
]

/** Entropy, raw-data shares (default): Shares, Entropy, Diversification, Weights. */
export const ENTROPY_FLOW: readonly FlowNode[] = [
  { key: 'entropy.proportionsSum', stepKeys: ['entropy.proportionsSum'] },
  { key: 'entropy.entropy', stepKeys: ['entropy.entropy'] },
  { key: 'entropy.diversification', stepKeys: ['entropy.diversification'] },
  { key: 'entropy.weights', stepKeys: ['entropy.weights'] },
]

/** Entropy with the min-max option: Normalize first, then the same four nodes. */
export const ENTROPY_MINMAX_FLOW: readonly FlowNode[] = [
  { key: 'entropy.normalized', stepKeys: ['entropy.normalized'] },
  { key: 'entropy.proportionsMinmax', stepKeys: ['entropy.proportionsMinmax'] },
  ...ENTROPY_FLOW.slice(1),
]

/** SD in three nodes: Normalize, Spread, Weights. */
export const SD_FLOW: readonly FlowNode[] = [
  { key: 'sd.normalized', stepKeys: ['sd.normalized'] },
  { key: 'sd.sigma', stepKeys: ['sd.sigma'] },
  { key: 'sd.weights', stepKeys: ['sd.sigmaTotal', 'sd.weights'] },
]

/** MEREC in five nodes: Normalize, Performance, Without j, Removal effect, Weights. */
export const MEREC_FLOW: readonly FlowNode[] = [
  { key: 'merec.normalized', stepKeys: ['merec.normalized', 'merec.absLog'] },
  { key: 'merec.performance', stepKeys: ['merec.performance'] },
  { key: 'merec.performanceRemoved', stepKeys: ['merec.performanceRemoved'] },
  { key: 'merec.removalEffect', stepKeys: ['merec.removalEffect'] },
  { key: 'merec.weights', stepKeys: ['merec.weights'] },
]

/** VIKOR in five nodes: Best and worst, Distances, S and R, Q, Threshold. */
export const VIKOR_FLOW: readonly FlowNode[] = [
  { key: 'vikor.best', stepKeys: ['vikor.best', 'vikor.worst'] },
  { key: 'vikor.weightedDistance', stepKeys: ['vikor.weightedDistance'] },
  { key: 'vikor.groupUtility', stepKeys: ['vikor.groupUtility', 'vikor.individualRegret'] },
  { key: 'vikor.q', stepKeys: ['vikor.q'] },
  { key: 'vikor.threshold', stepKeys: ['vikor.threshold'] },
]

export const EDAS_FLOW: readonly FlowNode[] = [
  { key: 'edas.average', stepKeys: ['edas.average'] },
  { key: 'edas.pda', stepKeys: ['edas.pda', 'edas.nda'] },
  { key: 'edas.weightedPda', stepKeys: ['edas.weightedPda', 'edas.weightedNda'] },
  { key: 'edas.sp', stepKeys: ['edas.sp', 'edas.sn'] },
  { key: 'edas.nsp', stepKeys: ['edas.nsp', 'edas.nsn'] },
  { key: 'edas.scores', stepKeys: ['edas.scores'] },
]

/** The node that holds `stepKey`, or -1. */
export function flowIndex(nodes: readonly { key: string; stepKeys?: readonly string[] | undefined }[], stepKey: string | undefined): number {
  if (stepKey === undefined) return -1
  return nodes.findIndex((n) => n.key === stepKey || (n.stepKeys?.includes(stepKey) ?? false))
}

// ---------------------------------------------------------------------------------------------
// Point labels
// ---------------------------------------------------------------------------------------------

export type LabelPlacement = { x: number; y: number; anchor: 'start' | 'end'; box: PlotBox }

/** Where a label may sit around its dot, in order of preference: below right first (the old spot). */
const LABEL_SPOTS: readonly { dx: number; dy: number; anchor: 'start' | 'end' }[] = [
  { dx: 9, dy: 14, anchor: 'start' },
  { dx: 9, dy: -7, anchor: 'start' },
  { dx: -9, dy: 14, anchor: 'end' },
  { dx: -9, dy: -7, anchor: 'end' },
  { dx: 11, dy: 4, anchor: 'start' },
  { dx: -11, dy: 4, anchor: 'end' },
]

const overlap = (a: PlotBox, b: PlotBox): number =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))

/**
 * Places one text label per dot so labels do not cover each other or another dot, and each sits
 * nearer to its own dot than to any other (review P2-5: two alternatives 0.002 apart put "C" next
 * to A). Greedy, in the order given: each label takes the first free spot around its own dot, or
 * the least bad one.
 * `widths` are the text widths; the text is `fontSize` high with its baseline at y. `obstacles`: boxes already taken
 * by other text of the drawing (axis titles), avoided like a placed label.
 */
export function placeLabels(
  points: readonly Point[],
  widths: readonly number[],
  bounds: { width: number; height: number },
  order: readonly number[] = points.map((_, i) => i),
  opts: { fontSize?: number; dotRadius?: number; obstacles?: readonly PlotBox[] } = {},
): LabelPlacement[] {
  const fontSize = opts.fontSize ?? 12
  const r = opts.dotRadius ?? 6
  const dots: PlotBox[] = points.map((p) => ({ left: p.x - r, right: p.x + r, top: p.y - r, bottom: p.y + r }))
  const placed: PlotBox[] = [...(opts.obstacles ?? [])]
  const out: LabelPlacement[] = new Array(points.length)
  for (const i of order) {
    const p = points[i]!
    const w = widths[i] ?? 0
    let best: LabelPlacement | null = null
    let bestCost = Infinity
    for (const spot of LABEL_SPOTS) {
      const x = p.x + spot.dx
      const y = p.y + spot.dy
      const left = spot.anchor === 'start' ? x : x - w
      const box = { left, right: left + w, top: y - fontSize * 0.8, bottom: y + fontSize * 0.25 }
      // Outside the drawing counts as fully covered, so an edge spot is used only as a last resort.
      const outside = box.left < 0 || box.right > bounds.width || box.top < 0 || box.bottom > bounds.height ? w * fontSize : 0
      // A label about as near to another dot as to its own reads as either dot's: its own dot must be
      // clearly nearer (at most 0.7 of the distance to any other dot).
      const cx = (box.left + box.right) / 2
      const cy = (box.top + box.bottom) / 2
      const own = Math.hypot(cx - p.x, cy - p.y)
      const misread = points.some((q, k) => k !== i && own > 0.7 * Math.hypot(cx - q.x, cy - q.y)) ? (w * fontSize) / 2 : 0
      const cost =
        outside +
        misread +
        placed.reduce((sum, b) => sum + overlap(box, b), 0) +
        dots.reduce((sum, d, k) => sum + (k === i ? 0 : overlap(box, d)), 0)
      if (cost < bestCost) {
        best = { x, y, anchor: spot.anchor, box }
        bestCost = cost
        if (cost === 0) break
      }
    }
    out[i] = best!
    placed.push(best!.box)
  }
  return out
}
