/**
 * Pure helpers of the Robustness stage: crossing marks, the perturbation grid and share texts.
 * No DOM and no React, so they are unit tested (helpers.test.ts).
 */
import { getWeightingMethod } from '../../../core/registry'
import type { Concentration, PerturbationRow, StableInterval } from '../../../core/robustness'
import type { WeightingMethod } from '../../../core/types'
import type { ValidationIssue } from '../../../core/validate'
import type { Lang } from '../../../i18n/lang'
import type { WeightMethodId } from '../../../state/workbench'
import { rankOrder } from '../../ranking/order'

/** Monte Carlo settings shown in the UI (N and seed are printed next to the results). */
export const MC_RUNS = 10_000
export const MC_SEED = 1

export const SPREADS = ['uniform', 'loose', 'medium', 'tight'] as const
export type Spread = (typeof SPREADS)[number]
/** Dirichlet concentration of each preset: uniform over the simplex, or κ around the user's weights. */
export const CONCENTRATION: Record<Spread, Concentration> = { uniform: 'uniform', loose: 20, medium: 100, tight: 500 }

/** Values that agree to 12 decimals are the same weight (0.1 + 0.2 and 0.3). */
const same = (a: number, b: number) => Math.abs(a - b) < 1e-9

/** Index of the largest weight (first on ties): the criterion the sweep opens with. */
export function largestWeight(weights: readonly number[]): number {
  let best = 0
  for (let j = 1; j < weights.length; j++) if (weights[j]! > weights[best]!) best = j
  return best
}

/**
 * The crossing points drawn on the sweep chart: at each boundary between two intervals of constant ranking, the
 * closest pair of alternatives that changed rank there, at their (equal) closeness. `scoresAt` evaluates the method
 * at a weight exactly.
 */
export type Mark = { x: number; y: number }

export function switchMarks(intervals: readonly StableInterval[], scoresAt: (wk: number) => readonly number[]): Mark[] {
  const out: Mark[] = []
  for (let k = 0; k + 1 < intervals.length; k++) {
    const a = intervals[k]!
    const b = intervals[k + 1]!
    const involved = new Set<number>()
    for (let p = 0; p < a.ranking.length; p++) {
      for (let q = p + 1; q < a.ranking.length; q++) {
        if (Math.sign(a.ranking[p]! - a.ranking[q]!) !== Math.sign(b.ranking[p]! - b.ranking[q]!)) {
          involved.add(p)
          involved.add(q)
        }
      }
    }
    const changed = [...involved]
    if (changed.length < 2) continue
    const s = scoresAt(a.to)
    const sorted = changed.slice().sort((p, q) => s[p]! - s[q]!)
    let best = 0
    for (let m = 1; m + 1 < sorted.length; m++) if (s[sorted[m + 1]!]! - s[sorted[m]!]! < s[sorted[best + 1]!]! - s[sorted[best]!]!) best = m
    const p = sorted[best]!
    const q = sorted[best + 1]!
    const sp = s[p] ?? 0
    const sq = s[q] ?? 0
    const y = Math.abs(sp - sq) > 1e-6 ? (b.ranking[p]! < b.ranking[q]! ? sp : sq) : (sp + sq) / 2
    out.push({ x: a.to, y })
  }
  return out
}

/**
 * Only the crossings where first place changes hands: at each boundary between two intervals of constant first place,
 * the old and the new leaders, at their (equal) closeness.
 */
export function topSwitchMarks(intervals: readonly StableInterval[], scoresAt: (wk: number) => readonly number[]): Mark[] {
  const out: Mark[] = []
  for (let k = 0; k + 1 < intervals.length; k++) {
    const a = intervals[k]!
    const b = intervals[k + 1]!
    const players = [...new Set([...a.top, ...b.top])]
    if (players.length < 2) continue
    const s = scoresAt(a.to)
    const p = a.top[0]!
    const q = b.top.find((i) => !a.top.includes(i)) ?? b.top[0]!
    const sp = s[p] ?? 0
    const sq = s[q] ?? 0
    const y = Math.abs(sp - sq) > 1e-6 ? sq : players.reduce((sum, i) => sum + s[i]!, 0) / players.length
    out.push({ x: a.to, y })
  }
  return out
}

/** Past these, drawing every crossing turns the chart into a tangle: only first-place changes are marked. */
export const MANY_ALTERNATIVES = 12
export const MANY_SWITCHES = 40

/**
 * Lines that get a name at their right end: the leaders at the cursor and the first `limit` of the user's ranking.
 * The rest are named in the table next to the chart.
 */
export function labelledLines(baseRanking: readonly number[], leaders: readonly number[], limit = 8): number[] {
  const top = rankOrder(baseRanking).slice(0, limit)
  return [...new Set([...leaders, ...top])].sort((a, b) => a - b)
}

/** Perturbation rows as a grid: grid[j][d] is criterion j changed by deltas[d] (undefined when the core skipped it). */
export function perturbGrid(
  rows: readonly PerturbationRow[],
  n: number,
  deltas: readonly number[],
): (PerturbationRow | undefined)[][] {
  const grid = Array.from({ length: n }, () => new Array<PerturbationRow | undefined>(deltas.length).fill(undefined))
  for (const row of rows) {
    const d = deltas.findIndex((x) => same(x, row.delta))
    if (d >= 0 && row.k >= 0 && row.k < n) grid[row.k]![d] = row
  }
  return grid
}

/**
 * A perturbation of a criterion whose weight is 0 changes nothing (a percentage of 0 is 0): it is not a test of the
 * ranking and is left out of the count.
 */
export const applicable = (row: PerturbationRow, weights: readonly number[]): boolean => (weights[row.k] ?? 0) > 0

/** The alternatives that keep the method from ranking (CoCoSo's all-worst), comma-joined; '' for any other block. */
export function blockedNames(issues: readonly ValidationIssue[] | undefined, names: readonly string[]): string {
  return (issues ?? [])
    .flatMap((x) => (x.code === 'all-worst-alternative' && x.row !== undefined ? [names[x.row] ?? ''] : []))
    .join(', ')
}

/** First place held in how many of the (applicable) perturbations. */
export function heldCount(rows: readonly PerturbationRow[], weights: readonly number[]): { held: number; total: number } {
  // A change the method cannot rank is no test of first place either.
  const counted = rows.filter((r) => applicable(r, weights) && !r.blocked)
  return { held: counted.filter((r) => r.sameTop).length, total: counted.length }
}

const BCP47: Record<Lang, string> = { en: 'en-US', tr: 'tr-TR' }
const percentCache = new Map<string, Intl.NumberFormat>()
function percent(lang: Lang, decimals: number, sign = false): Intl.NumberFormat {
  const key = `${lang}|${decimals}|${sign ? 1 : 0}`
  let f = percentCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(BCP47[lang], {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      ...(sign ? { signDisplay: 'exceptZero' as const } : {}),
    })
    percentCache.set(key, f)
  }
  return f
}

/**
 * A share (0..1) as a percentage in the active locale (EN "62%", TR "%62"). A share that is not zero but rounds to it
 * prints as "<1%" ("<%1"), so "never" and "rarely" read differently.
 */
export function formatShare(p: number, lang: Lang, decimals = 0): string {
  if (!Number.isFinite(p)) return ''
  const f = percent(lang, decimals)
  const min = 10 ** -decimals / 100
  if (p > 0 && p < min / 2) return `<${f.format(min)}`
  return f.format(p)
}

/** A relative change with its sign (EN "+10%", "-20%"; TR "+%10", "-%20"). */
export function formatDelta(delta: number, lang: Lang): string {
  return percent(lang, 0, true).format(delta)
}

/**
 * The weighting method Removal runs again on the reduced matrix. Equal weights have nothing to recompute; weights from
 * the user's answers are not recomputed (no answers exist for the reduced set), so their weights are renormalized.
 */
export function recomputable(weightMethod: WeightMethodId): WeightingMethod | undefined {
  if (weightMethod === 'equal') return undefined
  const method = getWeightingMethod(weightMethod)
  return method?.id === 'bwm' ? undefined : method
}
