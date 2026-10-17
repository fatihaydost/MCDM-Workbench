/**
 * Comparing ranking methods: every method runs on the same problem and weights, and the individual rankings are
 * summarised by a Borda count (consensus order), Kendall's W (agreement) and the most common first place.
 * A method that cannot rank (blocking issues) stays in `runs` with its issues and is left out of every summary.
 */
import { rankScores } from './rank'
import { midRanks } from './robustness'
import { prepareRanking, type RankingRun } from './run'
import type { Problem, RankingResult } from './types'
import type { ValidationIssue } from './validate'

export type MethodRun = { methodId: string; result: RankingResult | null; issues: ValidationIssue[] }

export type Comparison = {
  /** One per requested run, in the order given. */
  runs: MethodRun[]
  /** Ids of the methods that produced a result. */
  ranked: string[]
  /** At least two methods ranked, so there is something to compare. */
  comparable: boolean
  borda: { points: number[]; ranking: number[] } | null
  kendallW: number | null
  /** The alternative that is first under the most methods (ties inside a method count each tied alternative). */
  firstPlace: { alternative: number; methods: number; of: number } | null
}

/** Points per alternative = Σ over rankings of (n − rank); the Borda ranking shares ties. */
export function bordaCount(rankings: number[][]): { points: number[]; ranking: number[] } {
  const n = rankings[0]?.length ?? 0
  const points = new Array<number>(n).fill(0)
  for (const r of rankings) r.forEach((rank, i) => (points[i]! += n - rank))
  return { points, ranking: rankScores(points, 'desc') }
}

/**
 * Kendall's coefficient of concordance on mid-ranks, tie-corrected:
 * W = 12·Σ(R_i − R̄)² / (m²(n³ − n) − m·Σ_k T_k), with T_k = Σ over tie groups in ranking k of (t³ − t).
 */
export function kendallW(rankings: number[][]): number {
  const m = rankings.length
  const n = rankings[0]?.length ?? 0
  const mid = rankings.map(midRanks)
  const sums = Array.from({ length: n }, (_, i) => mid.reduce((s, r) => s + r[i]!, 0))
  const mean = sums.reduce((a, b) => a + b, 0) / n
  const S = sums.reduce((s, x) => s + (x - mean) ** 2, 0)
  let T = 0
  for (const r of mid) {
    const counts = new Map<number, number>()
    for (const x of r) counts.set(x, (counts.get(x) ?? 0) + 1)
    for (const t of counts.values()) T += t ** 3 - t
  }
  const denom = m * m * (n ** 3 - n) - m * T
  return denom === 0 ? 1 : (12 * S) / denom // every ranking all tied: identical, full agreement
}

export function compareRankings(problem: Problem, weights: number[], runs: RankingRun[]): Comparison {
  const results: MethodRun[] = runs.map((run) => {
    const { issues, rank } = prepareRanking(problem, run)
    if (!rank) return { methodId: run.methodId, result: null, issues }
    const res = rank(weights)
    return { methodId: run.methodId, result: res.value, issues: res.issues }
  })
  const done = results.filter((r): r is MethodRun & { result: RankingResult } => r.result !== null)
  const rankings = done.map((r) => r.result.ranking)
  const comparable = done.length >= 2
  const firsts = new Map<number, number>()
  for (const r of rankings) r.forEach((rank, i) => rank === 1 && firsts.set(i, (firsts.get(i) ?? 0) + 1))
  let firstPlace: Comparison['firstPlace'] = null
  for (const [alternative, methods] of [...firsts].sort((a, b) => b[1] - a[1] || a[0] - b[0])) {
    firstPlace = { alternative, methods, of: done.length }
    break
  }
  return {
    runs: results,
    ranked: done.map((r) => r.methodId),
    comparable,
    borda: comparable ? bordaCount(rankings) : null,
    kendallW: comparable ? kendallW(rankings) : null,
    firstPlace,
  }
}
