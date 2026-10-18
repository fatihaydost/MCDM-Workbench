/**
 * Comparing ranking methods: every method runs on the same problem and weights, and the individual rankings are
 * summarised by a Borda count (consensus order), Kendall's W (agreement) and the most common first place.
 * A method that cannot rank (blocking issues) stays in `runs` with its issues and is left out of every summary.
 * A method whose ranking is another run's by construction (an echo: MARCOS of SAW 'linearMax') is shown but counted
 * once, so it never adds a second agreeing vote.
 */
import { rankScores } from './rank'
import { midRanks } from './robustness'
import { prepareRanking, type RankingRun } from './run'
import type { Problem, RankingResult } from './types'
import type { ValidationIssue } from './validate'

export type MethodRun = { methodId: string; result: RankingResult | null; issues: ValidationIssue[] }

/** A ranked method that always orders like another ranked run, and that run (MARCOS = c x SAW 'linearMax'). */
export type Echo = { methodId: string; of: string }

/**
 * MARCOS with data-derived ideal rows is SAW 'linearMax' times one constant (docs/research/methods/marcos.md, step 7),
 * so it echoes SAW when SAW ran with that option. SAW 'sum' can order differently: no echo then.
 */
function findEchoes(runs: readonly RankingRun[], ranked: ReadonlySet<string>): Echo[] {
  const sawRun = runs.find((r) => r.methodId === 'saw')
  const linear = (sawRun?.params.normalization ?? 'linearMax') === 'linearMax'
  return ranked.has('marcos') && ranked.has('saw') && linear ? [{ methodId: 'marcos', of: 'saw' }] : []
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
  const echoes = findEchoes(runs, new Set(done.map((r) => r.methodId)))
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

const argmax = (row: number[]) => row.reduce((best, x, j) => (x > row[best]! ? j : best), 0)

export function pairFacts(problem: Problem, weights: number[], c: Comparison, i: number, k: number): PairFacts {
  const br = c.borda?.ranking
  const kFirst = br && br[k]! !== br[i]! ? br[k]! < br[i]! : k < i // Borda order, else lower index
  const [a, b] = kFirst ? [k, i] : [i, k]
  const rows = problem.matrix
  const decisive = problem.criteria
    .map((crit, col) => {
      const column = rows.map((r) => r[col]!)
      const range = Math.max(...column) - Math.min(...column)
      const diff = rows[a]![col]! - rows[b]![col]!
      const value = range === 0 ? 0 : (weights[col]! * Math.abs(diff)) / range
      const aWins = crit.type === 'benefit' ? diff > 0 : diff < 0
      return { col, value, better: aWins ? ('a' as const) : ('b' as const) }
    })
    .filter((x) => x.value > 0)
    .sort((x, y) => y.value - x.value)
    .slice(0, 3)
    .map(({ col, better }) => ({ col, better }))
  const methods = c.runs.flatMap((r) => {
    if (!r.result || c.echoes.some((e) => e.methodId === r.methodId)) return []
    const { ranking } = r.result
    const higher = ranking[a]! === ranking[b]! ? 'tie' : ranking[a]! < ranking[b]! ? 'a' : 'b'
    return [{ methodId: r.methodId, higher } as const]
  })
  const d = c.runs.find((r) => r.methodId === 'vikor')?.result?.steps.find((s) => s.key === 'vikor.weightedDistance')
  return {
    a,
    b,
    criteria: decisive,
    methods,
    vikorRegret: d?.matrix
      ? { a: argmax(d.matrix[a]!), b: argmax(d.matrix[b]!), ra: Math.max(...d.matrix[a]!), rb: Math.max(...d.matrix[b]!) }
      : null,
    unanimous: methods.every((m) => m.higher === methods[0]!.higher),
  }
}
