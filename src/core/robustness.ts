/**
 * Robustness of a ranking to its weights: one-at-a-time weight sweep with stability intervals, Monte Carlo
 * weights (Dirichlet) with rank acceptability, criterion removal, and rank agreement coefficients.
 * Formulas and sources: docs/research/combinations.md §C. Pure functions, no DOM; deterministic given a seed.
 *
 * The ranking is passed in as a `RankerFor` (see run.ts: method and options of a RankingRun, validated once per
 * problem), so any ranking method works unchanged and the analysis is of the variant the user chose.
 * Rankings are always the method's own `ranking` (competition ranks from rankScores: ties share, 1, 1, 3).
 */
import { reweight } from './reweight'
import type { RankerFor } from './run'
import { ProblemValidationError } from './validate'
import type { ValidationIssue } from './validate'
import type { MethodParams, Problem, WeightingMethod } from './types'

// ---------- shared helpers ----------

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** Indices of the first-ranked alternatives, ascending. */
const topSet = (ranking: readonly number[]): number[] => {
  const out: number[] = []
  ranking.forEach((r, i) => {
    if (r === 1) out.push(i)
  })
  return out
}

const sameList = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])

const rankKey = (ranking: readonly number[]): string => ranking.join(',')

/** The ranking at these weights, or the issues that block the method there (CoCoSo: an all-worst alternative). */
const tryRank = (rank: (w: number[]) => { ranking: number[] }, w: number[]): number[] | ProblemValidationError => {
  try {
    return rank(w).ranking
  } catch (err) {
    if (err instanceof ProblemValidationError) return err
    throw err
  }
}

/** Agreement fields of a row the method cannot rank: no ranking, nothing to compare. */
const blockedRow = (err: ProblemValidationError): { ranking: number[]; sameTop: boolean; spearman: number; ws: number; blocked: ValidationIssue[] } => ({
  ranking: [],
  sameTop: false,
  spearman: Number.NaN,
  ws: Number.NaN,
  blocked: err.issues.filter((x) => x.severity === 'error'),
})

// ---------- C.1 One-at-a-time weight perturbation ----------

// reweight lives in its own module so the landing hero can use it without the rest of this file.
export { reweight }

/** One point of a sweep: the weight of criterion k, the full weight vector, scores and ranks at that point. */
export type SweepPoint = { wk: number; weights: number[]; scores: number[]; ranking: number[] }

/**
 * An interval of w_k over which the full ranking (or only the first place) stays the same.
 * `from`/`to` are exact switch points (found by bisection between grid points to 1e-6), not grid values.
 * In `topIntervals`, `ranking` is the full ranking at the start of the interval (it may change inside it).
 */
export type StableInterval = { from: number; to: number; ranking: number[]; top: number[] }

export type Sweep = {
  k: number
  /**
   * Grid of `steps + 1` points over w_k ∈ [0, 1] (default steps 100). A grid end where the method cannot rank (CoCoSo
   * at w_k = 1: the alternative worst on criterion k gets S = 0) is left out, so points and intervals start or end at
   * the next grid point.
   */
  points: SweepPoint[]
  /** Consecutive intervals covering [0, 1] where the full ranking is constant. */
  rankingIntervals: StableInterval[]
  /** Consecutive intervals covering [0, 1] where the set of first-ranked alternatives is constant. */
  topIntervals: StableInterval[]
  /** The interval that contains the base weight w_k (the weight stability interval, Mareschal 1988). */
  baseRankingInterval: StableInterval
  baseTopInterval: StableInterval
}

/** Bracket width at which a switch point is accepted (the reported point is the bracket's midpoint). */
const SWITCH_TOL = 1e-6
/** Switch points closer than this are one point (e.g. a tie exactly on a grid point: + -> 0 -> −). */
const MERGE_TOL = 2 * SWITCH_TOL
/** An end piece of the sweep at most this wide whose ranking only adds ties is the end point's tie (see sweepWeight). */
const END_TIE_WIDTH = 1e-4

type Eval = { t: number; weights: number[]; scores: number[]; ranking: number[]; sign: number }

/**
 * How the switch points are found (every change of the ranking is a change of order of some pair a, b):
 * 1. Evaluate the grid w_k = i / steps.
 * 2. For every pair whose order differs between two neighbouring grid points, bisect on that pair's order
 *    until the bracket is ≤ 1e-6. Different pairs switching inside the same grid cell are all found.
 * 3. Two crossings of the same pair inside one cell leave the same order at both ends. For every sample where
 *    the pair's score gap |s_a − s_b| has a local minimum, a parabola through three samples predicts the dip
 *    between samples; if it dips at least halfway to zero, a golden-section search minimizes the gap on the
 *    window; if the order flips there, both crossings are bisected. This finds double crossings of scores
 *    that are smooth at the grid scale; three or more crossings of one pair in one cell are not resolved.
 * 4. The ranking on each piece between switch points is read at the piece's midpoint; neighbouring pieces
 *    with the same ranking are merged. Switch points closer than 2e-6 are merged, so a ranking that holds at
 *    a single point only (a tie exactly at a crossing, or at w_k = 0 / 1 where some weights are exactly 0)
 *    is not an interval; it still shows in `points` when it falls on the grid.
 */
export function sweepWeight(
  problem: Problem,
  weights: readonly number[],
  rankFor: RankerFor,
  k: number,
  opts?: { steps?: number },
): Sweep {
  const n = weights.length
  if (k < 0 || k >= n || !Number.isInteger(k)) throw new RangeError(`criterion index ${k} out of range`)
  const steps = opts?.steps ?? 100
  if (!Number.isInteger(steps) || steps < 1) throw new RangeError('steps must be a positive integer')

  const rank = rankFor(problem)
  const evalAt = (t: number): Eval => {
    const w = reweight(weights, k, t)
    const res = rank(w)
    return { t, weights: w, scores: res.scores, ranking: res.ranking, sign: res.order === 'desc' ? -1 : 1 }
  }
  // Pair order from the ranking itself (so it agrees with the ranking key): −1 a ahead, 0 tied, +1 b ahead.
  const state = (e: Eval, a: number, b: number): number => Math.sign(e.ranking[a]! - e.ranking[b]!)
  // Oriented score gap: negative when a is ahead, whatever the method's score direction.
  const gap = (e: Eval, a: number, b: number): number => e.sign * (e.scores[a]! - e.scores[b]!)

  // Only the ends can block: inside (0, 1) every weight that was above 0 stays above 0.
  const tryEval = (t: number): Eval | null => {
    try {
      return evalAt(t)
    } catch (err) {
      if (err instanceof ProblemValidationError && (t === 0 || t === 1)) return null
      throw err
    }
  }
  const grid: Eval[] = Array.from({ length: steps + 1 }, (_, i) => tryEval(i / steps)).filter((e): e is Eval => e !== null)
  if (grid.length < 2) throw new RangeError('the method cannot rank along this sweep')
  const lo = grid[0]!.t
  const hi = grid[grid.length - 1]!.t
  const last = grid.length - 1
  const m = grid[0]!.ranking.length
  const breaks: number[] = []

  const bisect = (lo: Eval, hi: Eval, a: number, b: number): void => {
    const s0 = state(lo, a, b)
    while (hi.t - lo.t > SWITCH_TOL) {
      const mid = evalAt((lo.t + hi.t) / 2)
      if (state(mid, a, b) === s0) lo = mid
      else hi = mid
    }
    breaks.push((lo.t + hi.t) / 2)
  }

  // Minimum of the parabola through three samples, over [lo, hi].
  const parabolaMin = (p: [number, number][], lo: number, hi: number): number => {
    const [[x0, y0], [x1, y1], [x2, y2]] = p as [[number, number], [number, number], [number, number]]
    const d01 = (y1 - y0) / (x1 - x0)
    const d12 = (y2 - y1) / (x2 - x1)
    const c2 = (d12 - d01) / (x2 - x0)
    const c1 = d01 - c2 * (x0 + x1)
    const c0 = y0 - c1 * x0 - c2 * x0 * x0
    const q = (x: number) => c0 + c1 * x + c2 * x * x
    let best = Math.min(q(lo), q(hi))
    if (c2 > 0) {
      const v = -c1 / (2 * c2)
      if (v > lo && v < hi) best = Math.min(best, q(v))
    }
    return best
  }

  const GOLD = (Math.sqrt(5) - 1) / 2
  /** Search [L, R] for a point where pair (a, b) has a different order than `s`; returns it or null. */
  const findFlip = (L: Eval, R: Eval, a: number, b: number, s: number): Eval | null => {
    const f = (e: Eval) => s * gap(e, a, b)
    let lo = L.t
    let hi = R.t
    let x1 = hi - GOLD * (hi - lo)
    let x2 = lo + GOLD * (hi - lo)
    let e1 = evalAt(x1)
    let e2 = evalAt(x2)
    for (let iter = 0; iter < 60 && hi - lo > SWITCH_TOL / 10; iter++) {
      if (state(e1, a, b) !== s) return e1
      if (state(e2, a, b) !== s) return e2
      if (f(e1) <= f(e2)) {
        hi = x2
        x2 = x1
        e2 = e1
        x1 = hi - GOLD * (hi - lo)
        e1 = evalAt(x1)
      } else {
        lo = x1
        x1 = x2
        e1 = e2
        x2 = lo + GOLD * (hi - lo)
        e2 = evalAt(x2)
      }
    }
    if (state(e1, a, b) !== s) return e1
    if (state(e2, a, b) !== s) return e2
    return null
  }

  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      const st = grid.map((e) => state(e, a, b))
      const f = grid.map((e, i) => st[i]! * gap(e, a, b))
      for (let i = 0; i < last; i++) if (st[i] !== st[i + 1]) bisect(grid[i]!, grid[i + 1]!, a, b)
      for (let i = 0; i <= last; i++) {
        const s = st[i]!
        if (s === 0) continue
        const L = i > 0 && st[i - 1] === s ? i - 1 : i
        const R = i < last && st[i + 1] === s ? i + 1 : i
        if (L === R || f[i]! > f[L]! || f[i]! > f[R]!) continue
        // Three samples for the parabola: the window itself, or the window extended on its open side.
        let idx: number[]
        if (R - L === 2) idx = [L, i, R]
        else if (L === i && R + 1 <= last && st[R + 1] === s) idx = [L, R, R + 1]
        else if (R === i && L - 1 >= 0 && st[L - 1] === s) idx = [L - 1, L, R]
        else idx = []
        const predicted =
          idx.length === 3 ? parabolaMin(idx.map((j) => [grid[j]!.t, f[j]!]), grid[L]!.t, grid[R]!.t) : -Infinity
        if (predicted > 0.5 * f[i]!) continue
        const flip = findFlip(grid[L]!, grid[R]!, a, b, s)
        if (flip) {
          bisect(grid[L]!, flip, a, b)
          bisect(flip, grid[R]!, a, b)
        }
      }
    }
  }

  // Pieces between merged switch points; ranking at each piece's midpoint; merge equal neighbours.
  breaks.sort((x, y) => x - y)
  const cuts: number[] = [lo]
  for (const p of breaks) {
    if (p <= lo || p >= hi) continue
    if (p - cuts[cuts.length - 1]! <= MERGE_TOL) continue
    cuts.push(p)
  }
  if (cuts.length > 1 && hi - cuts[cuts.length - 1]! <= MERGE_TOL) cuts.pop()
  cuts.push(hi)

  const rankingIntervals: StableInterval[] = []
  for (let j = 0; j + 1 < cuts.length; j++) {
    const from = cuts[j]!
    const to = cuts[j + 1]!
    const ranking = evalAt((from + to) / 2).ranking
    const last = rankingIntervals[rankingIntervals.length - 1]
    if (last && rankKey(last.ranking) === rankKey(ranking)) last.to = to
    else rankingIntervals.push({ from, to, ranking, top: topSet(ranking) })
  }

  // At w_k = 0 or 1 some weights are exactly 0, so alternatives equal on the remaining criteria tie there. Next to
  // that point their scores differ by less than the tie tolerance of rankScores (1e-12, relative), so the tie
  // stretches a hair into the sweep (about 2e-6 on Krishnan 2021, k = 2). An end piece that narrow whose ranking only
  // merges places of its neighbour is that end point, not an interval: it joins the neighbour.
  const onlyMerges = (piece: readonly number[], next: readonly number[]): boolean => {
    for (let a = 0; a < piece.length; a++) {
      for (let b = a + 1; b < piece.length; b++) {
        const s = Math.sign(piece[a]! - piece[b]!)
        if (s !== 0 && s !== Math.sign(next[a]! - next[b]!)) return false
      }
    }
    return true
  }
  if (rankingIntervals.length > 1) {
    const first = rankingIntervals[0]!
    if (first.to - first.from <= END_TIE_WIDTH && onlyMerges(first.ranking, rankingIntervals[1]!.ranking)) {
      rankingIntervals.shift()
      rankingIntervals[0]!.from = lo
    }
  }
  if (rankingIntervals.length > 1) {
    const last = rankingIntervals[rankingIntervals.length - 1]!
    const prev = rankingIntervals[rankingIntervals.length - 2]!
    if (last.to - last.from <= END_TIE_WIDTH && onlyMerges(last.ranking, prev.ranking)) {
      rankingIntervals.pop()
      prev.to = hi
    }
  }

  const topIntervals: StableInterval[] = []
  for (const iv of rankingIntervals) {
    const last = topIntervals[topIntervals.length - 1]
    if (last && sameList(last.top, iv.top)) last.to = iv.to
    else topIntervals.push({ ...iv, ranking: [...iv.ranking], top: [...iv.top] })
  }

  // The interval containing the base weight; at a switch point, the one whose ranking is the base ranking.
  const base = Math.min(hi, Math.max(lo, clamp01(weights[k]!)))
  const baseEval = evalAt(base)
  const pick = (ivs: StableInterval[], match: (iv: StableInterval) => boolean): StableInterval => {
    const containing = ivs.filter((iv) => iv.from - MERGE_TOL <= base && base <= iv.to + MERGE_TOL)
    return containing.find(match) ?? containing[0] ?? ivs[0]!
  }
  const baseRankingInterval = pick(rankingIntervals, (iv) => sameList(iv.ranking, baseEval.ranking))
  const baseTopInterval = pick(topIntervals, (iv) => sameList(iv.top, topSet(baseEval.ranking)))

  return {
    k,
    points: grid.map((e) => ({ wk: e.t, weights: e.weights, scores: e.scores, ranking: e.ranking })),
    rankingIntervals,
    topIntervals,
    baseRankingInterval,
    baseTopInterval,
  }
}

/** Relative step δ applied to criterion k (w_k(1 + δ), clamped), with agreement to the base ranking. */
export type PerturbationRow = {
  k: number
  delta: number
  weights: number[]
  ranking: number[]
  sameTop: boolean
  spearman: number
  ws: number
  /** Set when the method cannot rank at these weights (its blocking issues); then ranking is [], spearman and ws NaN. */
  blocked?: ValidationIssue[]
}

/** The other weights summing to at most this count as 0: criterion k holds all the weight. */
const ALL_ON_ONE = 1e-12

/** Default grid δ ∈ {−20 %, −10 %, −5 %, +5 %, +10 %, +20 %} for every criterion. */
export const DEFAULT_DELTAS: readonly number[] = [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2]

/**
 * One row per criterion × δ, criterion-major (k = 0 with every δ, then k = 1, ...). The new weight
 * w_k(1 + δ) is clamped to [0, 1] and the others rescaled by `reweight`. A criterion with weight 0 stays 0
 * (its rows equal the base). A criterion that holds all the weight (w_k = 1, the others 0) is skipped
 * (combinations.md §C.1): the others cannot be rescaled, and an equal split of the rest would be invented weights.
 * Agreement is to the base ranking (x = base, y = perturbed). A change the method cannot rank (CoCoSo: clipped to 1,
 * an alternative is then worst on the only weighted criterion) is a row with `blocked` set.
 */
export function perturbWeights(
  problem: Problem,
  weights: readonly number[],
  rankFor: RankerFor,
  deltas?: readonly number[],
): PerturbationRow[] {
  const ds = deltas ?? DEFAULT_DELTAS
  const rank = rankFor(problem)
  const baseRanking = rank([...weights]).ranking
  const baseTop = topSet(baseRanking)
  const rows: PerturbationRow[] = []
  for (let k = 0; k < weights.length; k++) {
    let others = 0
    for (let j = 0; j < weights.length; j++) if (j !== k) others += weights[j]!
    if (others <= ALL_ON_ONE) continue
    for (const delta of ds) {
      const w = reweight(weights, k, weights[k]! * (1 + delta))
      const ranking = tryRank(rank, w)
      if (ranking instanceof ProblemValidationError) {
        rows.push({ k, delta, weights: w, ...blockedRow(ranking) })
        continue
      }
      rows.push({
        k,
        delta,
        weights: w,
        ranking,
        sameTop: sameList(topSet(ranking), baseTop),
        spearman: spearman(baseRanking, ranking),
        ws: wsCoefficient(baseRanking, ranking),
      })
    }
  }
  return rows
}

// ---------- C.2 Monte Carlo (Dirichlet) ----------

/** 'uniform' = Dirichlet(1, …, 1) (SMAA). A number κ = Dirichlet(κ·w̄) around the base weights. */
export type Concentration = 'uniform' | number

export type MonteCarloResult = {
  n: number
  /** Draws the method could not rank (CoCoSo: a weight so small an alternative's S rounds to 0); left out of every share. */
  blocked: number
  /** acceptability[i][r] = share of runs where alternative i has rank r + 1 (competition ranks; ties share). */
  acceptability: number[][]
  /** Mean rank of each alternative. */
  meanRank: number[]
  /** 2.5 % and 97.5 % rank quantiles of each alternative. */
  rankInterval: [number, number][]
  /** Share of runs whose first-ranked set equals the base one. */
  sameTop: number
  meanSpearman: number
  meanWs: number
}

/**
 * A running Monte Carlo's partial answer: `done` of `total` draws made, and acceptability[i][r] over the draws ranked so
 * far (the same shape as the result's, so a picture can draw it before the end). Not a different method: the last
 * snapshot is the result's own acceptability.
 */
export type MonteCarloProgress = { done: number; total: number; acceptability: number[][] }
export type MonteCarloProgressFn = (p: MonteCarloProgress) => void

/** Seeded PRNG (mulberry32): same seed, same sequence, on every platform. Values in [0, 1), 32-bit seed. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uniform in (0, 1]: safe for log. */
const openUniform = (rng: () => number): number => 1 - rng()

/** Standard normal by Box–Muller (the cosine branch only, so each call uses exactly two uniforms). */
const normal = (rng: () => number): number =>
  Math.sqrt(-2 * Math.log(openUniform(rng))) * Math.cos(2 * Math.PI * rng())

/** log of a Gamma(alpha, 1) draw, alpha ≥ 1 (Marsaglia and Tsang 2000). */
function logGammaMT(alpha: number, rng: () => number): number {
  const d = alpha - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    const x = normal(rng)
    let v = 1 + c * x
    if (v <= 0) continue
    v = v * v * v
    const u = openUniform(rng)
    if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return Math.log(d * v)
    }
  }
}

/** log of a Gamma(alpha, 1) draw, alpha > 0; alpha < 1 via Gamma(alpha + 1) · U^(1/alpha). */
const logGamma = (alpha: number, rng: () => number): number =>
  alpha >= 1 ? logGammaMT(alpha, rng) : logGammaMT(alpha + 1, rng) + Math.log(openUniform(rng)) / alpha

/**
 * One draw from Dirichlet(alpha) via Gamma(alpha_j, 1) (Marsaglia and Tsang 2000; boost for alpha < 1).
 * A component with alpha_j = 0 is always 0 (the degenerate limit; Gamma(0) is undefined). The gammas are
 * normalized in log space, so tiny alpha (U^(1/alpha) underflowing to 0) cannot give 0 / 0.
 * Throws RangeError for a negative or non-finite alpha, or when every alpha is 0.
 */
export function sampleDirichlet(alpha: readonly number[], rng: () => number): number[] {
  const logs = new Array<number>(alpha.length)
  let max = -Infinity
  for (let j = 0; j < alpha.length; j++) {
    const a = alpha[j]!
    if (!Number.isFinite(a) || a < 0) throw new RangeError(`Dirichlet alpha must be finite and ≥ 0 (got ${a})`)
    const l = a === 0 ? -Infinity : logGamma(a, rng)
    logs[j] = l
    if (l > max) max = l
  }
  if (max === -Infinity) throw new RangeError('Dirichlet needs at least one positive alpha')
  let total = 0
  const out = logs.map((l) => {
    const g = Math.exp(l - max)
    total += g
    return g
  })
  return out.map((g) => g / total)
}

/**
 * Nearest-rank quantile of a rank distribution given as counts per rank (counts[r] = runs with rank r + 1):
 * the smallest rank whose cumulative count reaches ceil(p · N) (at least 1).
 */
function rankQuantile(counts: readonly number[], total: number, p: number): number {
  const need = Math.max(1, Math.ceil(p * total - 1e-9))
  let cum = 0
  for (let r = 0; r < counts.length; r++) {
    cum += counts[r]!
    if (cum >= need) return r + 1
  }
  return counts.length
}

/**
 * Monte Carlo over weights: n draws (default 10 000, seed default 1) from Dirichlet(1, …, 1) or
 * Dirichlet(κ·w̄), where w̄ is `weights` divided by its sum (a criterion with weight 0 stays 0).
 * - acceptability and meanRank use the method's competition ranks (a tie of two for first gives both rank 1,
 *   the next rank 3), so each row of `acceptability` sums to 1.
 * - rankInterval: nearest-rank 2.5 % and 97.5 % quantiles (the ceil(0.025 N)-th and ceil(0.975 N)-th smallest
 *   rank), which are always attained ranks.
 * - sameTop, meanSpearman, meanWs compare every run to the base ranking (x = base, y = run).
 * - A draw the method cannot rank is counted in `blocked` and left out; the shares are over the ranked draws.
 */
export function monteCarlo(
  problem: Problem,
  weights: readonly number[],
  rankFor: RankerFor,
  opts: { concentration: Concentration; n?: number; seed?: number; onProgress?: MonteCarloProgressFn; progressEvery?: number },
): MonteCarloResult {
  const runs = opts.n ?? 10000
  if (!Number.isInteger(runs) || runs < 1) throw new RangeError('n must be a positive integer')
  const every = Math.max(1, Math.floor(opts.progressEvery ?? 1000))
  const rng = createRng(opts.seed ?? 1)
  const c = opts.concentration
  let alpha: number[]
  if (c === 'uniform') alpha = weights.map(() => 1)
  else {
    if (!Number.isFinite(c) || c <= 0) throw new RangeError('concentration must be a positive number')
    const total = weights.reduce((s, w) => s + w, 0)
    alpha = weights.map((w) => (c * w) / total)
  }

  // Prepared once: no extra validation per draw below (compute still checks its own input).
  const rank = rankFor(problem)
  const baseRanking = rank([...weights]).ranking
  const m = baseRanking.length
  const counts = Array.from({ length: m }, () => new Array<number>(m).fill(0))
  let sameTop = 0
  let sumRho = 0
  let sumWs = 0
  let blocked = 0
  for (let run = 0; run < runs; run++) {
    const w = sampleDirichlet(alpha, rng)
    const ranking = tryRank(rank, w)
    if (ranking instanceof ProblemValidationError) {
      blocked++
      continue
    }
    let top = true
    for (let i = 0; i < m; i++) {
      const r = ranking[i]!
      counts[i]![r - 1]!++
      if ((r === 1) !== (baseRanking[i] === 1)) top = false
    }
    if (top) sameTop++
    sumRho += spearman(baseRanking, ranking)
    sumWs += wsCoefficient(baseRanking, ranking)
    if (opts.onProgress && (run + 1) % every === 0 && run + 1 < runs) {
      const ranked = run + 1 - blocked
      if (ranked > 0) opts.onProgress({ done: run + 1, total: runs, acceptability: counts.map((row) => row.map((x) => x / ranked)) })
    }
  }

  const ranked = runs - blocked
  if (ranked === 0) throw new RangeError('the method cannot rank any of the draws')
  return {
    n: runs,
    blocked,
    acceptability: counts.map((row) => row.map((x) => x / ranked)),
    meanRank: counts.map((row) => row.reduce((s, x, r) => s + x * (r + 1), 0) / ranked),
    rankInterval: counts.map((row) => [rankQuantile(row, ranked, 0.025), rankQuantile(row, ranked, 0.975)]),
    sameTop: sameTop / ranked,
    meanSpearman: sumRho / ranked,
    meanWs: sumWs / ranked,
  }
}

// ---------- C.3 Criterion removal ----------

export type RemovalRow = {
  /** Removed criterion. */
  j: number
  /** 'renormalize' = w_k / (1 − w_j); 'recompute' = the weighting method run again on the reduced matrix. */
  mode: 'renormalize' | 'recompute'
  /**
   * Weights aligned with the ORIGINAL criteria (length n): index j is 0, the others are the weights used on
   * the reduced problem.
   */
  weights: number[]
  ranking: number[]
  sameTop: boolean
  spearman: number
  ws: number
  /** Set when the method cannot rank without criterion j (its blocking issues); then ranking is [], spearman and ws NaN. */
  blocked?: ValidationIssue[]
}

/**
 * `weighting` is needed for 'recompute'; without it only 'renormalize' rows are returned. Skipped when n ≤ 2.
 * `opts.weightingParams` are the weighting options (default `{}`); `rankFor` prepares the ranking again on each reduced problem.
 * Rows are criterion-major: for each j the 'renormalize' row, then (with `weighting`) the 'recompute' row.
 * Renormalize divides by the actual sum of the remaining weights (1 − w_j for a valid vector); if that is 0
 * the remaining criteria share equally.
 */
export function removeCriteria(
  problem: Problem,
  weights: readonly number[],
  rankFor: RankerFor,
  weighting?: WeightingMethod,
  opts?: { weightingParams?: MethodParams },
): RemovalRow[] {
  const n = problem.criteria.length
  if (n <= 2) return []
  const baseRanking = rankFor(problem)([...weights]).ranking
  const baseTop = topSet(baseRanking)
  const rows: RemovalRow[] = []

  // A removal the method cannot rank (CoCoSo: an alternative then worst on every remaining criterion) is a blocked row.
  const row = (j: number, mode: RemovalRow['mode'], reduced: Problem, w: number[]): RemovalRow => {
    const full = [...w.slice(0, j), 0, ...w.slice(j)]
    let ranking: number[] | ProblemValidationError
    try {
      ranking = tryRank(rankFor(reduced), w)
    } catch (err) {
      if (!(err instanceof ProblemValidationError)) throw err
      ranking = err
    }
    if (ranking instanceof ProblemValidationError) return { j, mode, weights: full, ...blockedRow(ranking) }
    return {
      j,
      mode,
      weights: full,
      ranking,
      sameTop: sameList(topSet(ranking), baseTop),
      spearman: spearman(baseRanking, ranking),
      ws: wsCoefficient(baseRanking, ranking),
    }
  }

  for (let j = 0; j < n; j++) {
    const reduced: Problem = {
      alternatives: problem.alternatives,
      criteria: problem.criteria.filter((_, c) => c !== j),
      matrix: problem.matrix.map((r) => r.filter((_, c) => c !== j)),
    }
    const rest = weights.filter((_, c) => c !== j)
    const restSum = rest.reduce((s, w) => s + w, 0)
    const renorm = restSum > 0 ? rest.map((w) => w / restSum) : rest.map(() => 1 / rest.length)
    rows.push(row(j, 'renormalize', reduced, renorm))
    if (weighting) rows.push(row(j, 'recompute', reduced, weighting.compute(reduced, opts?.weightingParams ?? {}).weights))
  }
  return rows
}

// ---------- C.6 Agreement between rankings (x = reference ranks, y = test ranks, 1-based) ----------

const checkLengths = (x: readonly number[], y: readonly number[]): void => {
  if (x.length !== y.length) throw new RangeError(`rankings differ in length (${x.length} vs ${y.length})`)
}

/**
 * Mid-ranks ("fractional ranking"): tied values get the mean of the positions they occupy, lower value first.
 * Competition ranks (1, 1, 3) become (1.5, 1.5, 3); a vector that already holds mid-ranks is unchanged.
 */
export function midRanks(x: readonly number[]): number[] {
  const idx = x.map((_, i) => i).sort((a, b) => x[a]! - x[b]!)
  const out = new Array<number>(x.length)
  for (let s = 0; s < idx.length; ) {
    let e = s
    while (e + 1 < idx.length && x[idx[e + 1]!] === x[idx[s]!]) e++
    const mid = (s + e) / 2 + 1
    for (let p = s; p <= e; p++) out[idx[p]!] = mid
    s = e + 1
  }
  return out
}

/**
 * Spearman's ρ; with ties, the Pearson correlation of mid-ranks (inputs are converted to mid-ranks first,
 * so competition ranks are fine). Without ties this equals 1 − 6Σd² / (n(n² − 1)).
 * Degenerate cases: n ≤ 1 → 1; both rankings all tied → 1 (identical); only one all tied → 0 (no association).
 */
export function spearman(x: readonly number[], y: readonly number[]): number {
  checkLengths(x, y)
  const n = x.length
  if (n <= 1) return 1
  const rx = midRanks(x)
  const ry = midRanks(y)
  const mean = (n + 1) / 2 // mid-ranks of n items always average (n + 1) / 2
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = rx[i]! - mean
    const dy = ry[i]! - mean
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 && syy === 0) return 1
  if (sxx === 0 || syy === 0) return 0
  return sxy / Math.sqrt(sxx * syy)
}

/**
 * Kendall's τ_b = (n_c − n_d) / √((n_0 − n_1)(n_0 − n_2)); pairs tied in x or y count as neither concordant
 * nor discordant. Degenerate cases: n ≤ 1 → 1; both all tied → 1; only one all tied → 0.
 */
export function kendallTauB(x: readonly number[], y: readonly number[]): number {
  checkLengths(x, y)
  const n = x.length
  if (n <= 1) return 1
  let nc = 0
  let nd = 0
  let n1 = 0
  let n2 = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = Math.sign(x[i]! - x[j]!)
      const dy = Math.sign(y[i]! - y[j]!)
      if (dx === 0) n1++
      if (dy === 0) n2++
      if (dx !== 0 && dy !== 0) {
        if (dx === dy) nc++
        else nd++
      }
    }
  }
  const n0 = (n * (n - 1)) / 2
  const den = Math.sqrt((n0 - n1) * (n0 - n2))
  if (den === 0) return n1 === n0 && n2 === n0 ? 1 : 0
  return (nc - nd) / den
}

/**
 * WS coefficient (Sałabun and Urbaniak 2020): asymmetric, x is the reference, top positions dominate.
 * WS = 1 − Σ 2^(−x_i) |x_i − y_i| / max{|x_i − 1|, |x_i − n|}.
 * Ties: both rankings are converted to mid-ranks first, as in the paper (Table 2: a pair tied for first is
 * 1.5, 1.5). n ≤ 1 → 1 (the denominator is 0; a one-element ranking always agrees).
 */
export function wsCoefficient(x: readonly number[], y: readonly number[]): number {
  checkLengths(x, y)
  const n = x.length
  if (n <= 1) return 1
  const rx = midRanks(x)
  const ry = midRanks(y)
  let s = 0
  for (let i = 0; i < n; i++) {
    const xi = rx[i]!
    s += (2 ** -xi * Math.abs(xi - ry[i]!)) / Math.max(Math.abs(xi - 1), Math.abs(xi - n))
  }
  return 1 - s
}
