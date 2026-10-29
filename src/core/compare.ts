/**
 * Comparing ranking methods: every method runs on the same problem and weights, and the individual rankings are
 * summarised by a Borda count (consensus order), Kendall's W (agreement) and the most common first place.
 * A method that cannot rank (blocking issues) stays in `runs` with its issues and is left out of every summary.
 * A method whose ranking is another run's by construction (an echo: MARCOS of SAW 'linearMax') is shown but counted
 * once, so it never adds a second agreeing vote.
 */
import { isConstant, maxOf, minOf } from './math'
import { AHP_MAX_PAIRWISE_ALTERNATIVES } from './methods/ahp'
import { rankScores, TIE_TOLERANCE } from './rank'
import type { RankingId } from './registry'
import { midRanks } from './robustness'
import { prepareRanking, type RankingRun } from './run'
import type { Problem, RankingResult } from './types'
import type { ValidationIssue } from './validate'

/** Registry order, with AHP and MARCOS right after SAW so their echo lines sit adjacent. */
export const COMPARE_ORDER: readonly RankingId[] = [
  'topsis',
  'saw',
  'ahp-ranking',
  'marcos',
  'vikor',
  'edas',
  'waspas',
  'copras',
  'cocoso',
  'mabac',
  'moora',
  'aras',
  'codas',
  'promethee-ii',
  'electre-i',
  'electre-iii',
]

export type MethodRun = { methodId: string; result: RankingResult | null; issues: ValidationIssue[] }

/** A ranked method that always orders like another ranked run, and that run (MARCOS = c x SAW 'linearMax', AHP = SAW 'sum'). */
export type Echo = { methodId: string; of: string }

/**
 * MARCOS with data-derived ideal rows is SAW 'linearMax' times one constant (docs/research/methods/marcos.md, step 7),
 * so it echoes SAW when SAW ran with that option.
 * AHP with all criteria from the decision matrix uses SAW 'sum' local priorities, so it echoes SAW when SAW ran with
 * 'sum' and no criterion has active pairwise alternative comparisons (m <= 7).
 * WASPAS with lambda = 1 is purely the WSM component (SAW 'linearMax'), so it echoes SAW ('linearMax') or MARCOS.
 * PROMETHEE II with a linear ('v-shape') preference function over the full criterion range (p_j = max - min) is an
 * affine transform of MABAC (Mareschal 2015), so it echoes MABAC when no per-criterion function overrides it.
 */
function findEchoes(
  runs: readonly RankingRun[],
  ranked: ReadonlySet<string>,
  problem: Problem,
  weights: readonly number[],
): Echo[] {
  const echoes: Echo[] = []
  const sawLinear =
    ranked.has('saw') && runs.some((r) => r.methodId === 'saw' && (r.params.normalization ?? 'linearMax') === 'linearMax')
  const sawSum =
    ranked.has('saw') && runs.some((r) => r.methodId === 'saw' && r.params.normalization === 'sum')
  const ahpJudgements = runs.find((r) => r.methodId === 'ahp-ranking')?.judgements
  const ahpFromTable =
    ranked.has('ahp-ranking') &&
    (problem.alternatives.length > AHP_MAX_PAIRWISE_ALTERNATIVES ||
      !ahpJudgements ||
      problem.criteria.every((_, j) => (weights[j] ?? 0) <= 0 || ahpJudgements[j] == null))
  if (ranked.has('marcos') && sawLinear) {
    echoes.push({ methodId: 'marcos', of: 'saw' })
  }
  if (ahpFromTable && sawSum) {
    echoes.push({ methodId: 'ahp-ranking', of: 'saw' })
  }
  if (ranked.has('waspas')) {
    const waspasRun = runs.find((r) => r.methodId === 'waspas')
    if (waspasRun?.params.lambda === 1) {
      if (sawLinear) echoes.push({ methodId: 'waspas', of: 'saw' })
      else if (ranked.has('marcos')) echoes.push({ methodId: 'waspas', of: 'marcos' })
    }
  }
  const activeCostCount = problem.criteria.filter((c, j) => c.type === 'cost' && (weights[j] ?? 0) > 0).length
  const coprasIsSawSum = activeCostCount <= 1 || problem.alternatives.length === 2
  if (coprasIsSawSum && ranked.has('copras')) {
    if (sawSum) echoes.push({ methodId: 'copras', of: 'saw' })
    else if (ahpFromTable) echoes.push({ methodId: 'copras', of: 'ahp-ranking' })
  }
  const promRun = runs.find((r) => r.methodId === 'promethee-ii')
  const promDefault = (promRun?.params.preferenceFunction ?? 'v-shape') === 'v-shape' && !promRun?.params.criteriaFunctions
  if (ranked.has('vikor')) {
    const vikorRun = runs.find((r) => r.methodId === 'vikor')
    if (vikorRun && Number(vikorRun.params.v ?? 0.5) === 1) {
      if (ranked.has('mabac')) echoes.push({ methodId: 'vikor', of: 'mabac' })
      else if (ranked.has('promethee-ii') && promDefault) echoes.push({ methodId: 'vikor', of: 'promethee-ii' })
    }
  }
  if (ranked.has('promethee-ii') && ranked.has('mabac') && promDefault) {
    echoes.push({ methodId: 'promethee-ii', of: 'mabac' })
  }
  return echoes
}

export type Comparison = {
  /** One per requested run, in the order given. */
  runs: MethodRun[]
  /** Ids of the methods that produced a result. */
  ranked: string[]
  /** Ranked methods left out of Borda, W, first place and the pair's method list, because they echo another run. */
  echoes: Echo[]
  /** At least two methods ranked, so there is something to compare. */
  comparable: boolean
  borda: { points: number[]; ranking: number[] } | null
  kendallW: number | null
  /** The alternative that is first under the most methods (ties inside a method count each tied alternative). */
  firstPlace: { alternative: number; methods: number; of: number } | null
}

/** Points per alternative = Σ over rankings of (n − midRank); the Borda ranking shares ties. */
export function bordaCount(rankings: number[][]): { points: number[]; ranking: number[] } {
  const n = rankings[0]?.length ?? 0
  const points = new Array<number>(n).fill(0)
  for (const r of rankings) midRanks(r).forEach((rank, i) => (points[i]! += n - rank))
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
  return denom === 0 ? 1 : Math.max(0, Math.min(1, (12 * S) / denom)) // every ranking all tied: identical, full agreement
}

/**
 * Tie-corrected Kendall's τ_b on two rankings in [-1, 1]:
 * τ_b = (C − D) / √((n_0 − n_1)(n_0 − n_2)), where n_0 − n_k is the count of untied pairs in ranking k.
 */
export function kendallTauB(rA: readonly number[], rB: readonly number[]): number {
  const n = Math.min(rA.length, rB.length)
  let c = 0
  let d = 0
  let uA = 0
  let uB = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dA = rA[i]! - rA[j]!
      const dB = rB[i]! - rB[j]!
      if (dA !== 0) uA++
      if (dB !== 0) uB++
      const prod = dA * dB
      if (prod > 0) c++
      else if (prod < 0) d++
    }
  }
  if (uA === 0 && uB === 0) return 1
  if (uA === 0 || uB === 0) return 0
  return Math.max(-1, Math.min(1, (c - d) / Math.sqrt(uA * uB)))
}

/** Symmetric N × N Kendall τ_b matrix across the independent (non-echo) ranked methods. */
export function rankCorrelationMatrix(comparison: Comparison): { methods: string[]; matrix: number[][] } {
  const counted = comparison.runs.filter(
    (r): r is MethodRun & { result: RankingResult } =>
      r.result !== null && !comparison.echoes.some((e) => e.methodId === r.methodId),
  )
  const methods = counted.map((r) => r.methodId)
  const matrix = counted.map((a, i) =>
    counted.map((b, j) => (i === j ? 1 : kendallTauB(a.result.ranking, b.result.ranking))),
  )
  return { methods, matrix }
}

export function compareRankings(problem: Problem, weights: number[], runs: RankingRun[]): Comparison {
  const results: MethodRun[] = runs.map((run) => {
    const { issues, rank } = prepareRanking(problem, run)
    if (!rank) return { methodId: run.methodId, result: null, issues }
    const res = rank(weights)
    return { methodId: run.methodId, result: res.value, issues: res.issues }
  })
  const done = results.filter((r): r is MethodRun & { result: RankingResult } => r.result !== null)
  const echoes = findEchoes(runs, new Set(done.map((r) => r.methodId)), problem, weights)
  const counted = done.filter((r) => !echoes.some((e) => e.methodId === r.methodId))
  const rankings = counted.map((r) => r.result.ranking)
  const comparable = counted.length >= 2
  const firsts = new Map<number, number>()
  for (const r of rankings) r.forEach((rank, i) => rank === 1 && firsts.set(i, (firsts.get(i) ?? 0) + 1))
  let firstPlace: Comparison['firstPlace'] = null
  for (const [alternative, methods] of [...firsts].sort((a, b) => b[1] - a[1] || a[0] - b[0])) {
    firstPlace = { alternative, methods, of: counted.length }
    break
  }
  return {
    runs: results,
    ranked: done.map((r) => r.methodId),
    echoes,
    comparable,
    borda: comparable ? bordaCount(rankings) : null,
    kendallW: comparable ? kendallW(rankings) : null,
    firstPlace,
  }
}

export type PairFacts = {
  /** Alternative indices; a is the Borda-higher one (the lower index on a Borda tie). */
  a: number
  b: number
  /** The 1 to 3 criteria that separate the pair most, most decisive first; `better` is relative to a and b. */
  criteria: { col: number; better: 'a' | 'b' }[]
  /** Ranked methods only, from their own ranking. */
  methods: { methodId: string; higher: 'a' | 'b' | 'tie' }[]
  /** The criterion that sets each one's R in VIKOR (argmax of its regret row), with the R values (the row maxima); null if VIKOR did not rank. */
  vikorRegret: { a: number; b: number; ra: number; rb: number } | null
  /** Every ranked method orders a and b the same way. */
  unanimous: boolean
}

/** Borda rank 1 and the next alternative by Borda order (lower index on ties); null when not comparable. */
export function defaultPair(c: Comparison): [number, number] | null {
  if (!c.borda) return null
  const order = c.borda.ranking.map((rank, i) => [rank, i] as const).sort((x, y) => x[0] - y[0] || x[1] - y[1])
  return [order[0]![1], order[1]![1]]
}

/** True when every ranked method gives the same ranking (nothing crosses in the chart). */
export function identicalRankings(c: Comparison): boolean {
  const rs = c.runs.flatMap((r) => (r.result ? [r.result.ranking] : []))
  return rs.every((r) => r.every((x, i) => x === rs[0]![i]))
}

const argmax = (row: number[]) => row.reduce((best, x, j) => (x > row[best]! + TIE_TOLERANCE ? j : best), 0)

export function pairFacts(problem: Problem, weights: number[], c: Comparison, i: number, k: number): PairFacts {
  const br = c.borda?.ranking
  const kFirst = br && br[k]! !== br[i]! ? br[k]! < br[i]! : k < i // Borda order, else lower index
  const [a, b] = kFirst ? [k, i] : [i, k]
  const rows = problem.matrix
  const methods = c.runs.flatMap((r) => {
    if (!r.result || c.echoes.some((e) => e.methodId === r.methodId)) return []
    const { ranking } = r.result
    const higher = ranking[a]! === ranking[b]! ? 'tie' : ranking[a]! < ranking[b]! ? 'a' : 'b'
    return [{ methodId: r.methodId, higher } as const]
  })
  const allDecisive = problem.criteria
    .map((crit, col) => {
      const column = rows.map((r) => r[col]!)
      const range = isConstant(column) ? 0 : maxOf(column) - minOf(column)
      const diff = rows[a]![col]! - rows[b]![col]!
      const value = range === 0 ? 0 : (weights[col]! * Math.abs(diff)) / range
      const aWins = crit.type === 'benefit' ? diff > 0 : diff < 0
      return { col, value, better: aWins ? ('a' as const) : ('b' as const) }
    })
    .filter((x) => x.value > 0)
    .sort((x, y) => y.value - x.value)
  const top = allDecisive.slice(0, 3)
  const unanimous = methods.every((m) => m.higher === methods[0]!.higher)
  const split = !unanimous
  if (split && top.length === 3 && top.every((x) => x.better === top[0]!.better)) {
    const other = allDecisive.find((x) => x.better !== top[0]!.better)
    if (other) top[2] = other
  }
  const decisive = top.map(({ col, better }) => ({ col, better }))
  const vikorRes = c.runs.find((r) => r.methodId === 'vikor')?.result
  const d = (vikorRes?.diagnostics?.v ?? 0.5) < 1 ? vikorRes?.steps.find((s) => s.key === 'vikor.weightedDistance') : undefined
  const rowA = d?.matrix?.[a]
  const rowB = d?.matrix?.[b]
  const ra = rowA ? maxOf(rowA) : 0
  const rb = rowB ? maxOf(rowB) : 0
  return {
    a,
    b,
    criteria: decisive,
    methods,
    vikorRegret:
      rowA && rowB && ra > 1e-12 && rb > 1e-12
        ? { a: argmax(rowA), b: argmax(rowB), ra, rb }
        : null,
    unanimous,
  }
}
