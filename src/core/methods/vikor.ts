import { column, sum, zeros } from '../math'
import { rankScores } from '../rank'
import type { MethodWarning, Problem, RankingMethod, RankingResult } from '../types'
import { assertValid, validateProblem, validateWeights } from '../validate'

/** v: weight of the "majority of criteria" strategy in Q (Opricovic & Tzeng 2004 §2), in [0, 1], default 0.5. */
export type VikorParams = { v?: number }

export const VIKOR_DEFAULT_V = 0.5

/** Gaps this close to DQ count as equal to it (C1 holds at Q(a'') - Q(a') = DQ even after rounding). */
const DQ_TOLERANCE = 1e-12

/** The acceptance conditions and the compromise solution (Opricovic & Tzeng 2004 §2, steps d and e). */
export type VikorCompromise = {
  /** a': first by Q (lowest Q; among equal Q the earlier alternative). */
  first: number
  /** a'': second by Q in the same order. */
  second: number
  /** DQ = 1 / (m - 1). */
  dq: number
  /** Q(a'') - Q(a'). */
  advantage: number
  /** C1, acceptable advantage: Q(a'') - Q(a') >= DQ. */
  c1: boolean
  /** C2, acceptable stability: a' is also first by S or by R (ties for first count). */
  c2: boolean
  bestByS: boolean
  bestByR: boolean
  /** Whether a' and a'' have the same Q (the order between them is the input order, and C1 fails). */
  tieAtTop: boolean
  /**
   * The compromise solution in Q order: C1 and C2 -> [a']; C1 only -> [a', a'']; C1 fails -> every a(k) with
   * Q(a(k)) - Q(a') < DQ (a', a'' and possibly more).
   */
  set: number[]
}

/**
 * C1, C2 and the compromise set from S, R and Q (all lower is better). The three branches are written out as in the
 * paper; pyDecision's `solution` (whole sorted list when both hold or both fail) is not followed.
 */
export function vikorCompromise(S: readonly number[], R: readonly number[], Q: readonly number[]): VikorCompromise {
  const m = Q.length
  const order = Q.map((_, i) => i).sort((a, b) => Q[a]! - Q[b]! || a - b)
  const first = order[0]!
  const second = order[1] ?? first
  const dq = 1 / (m - 1)
  const qRank = rankScores([...Q], 'asc')
  const advantage = Q[second]! - Q[first]!
  const c1 = advantage >= dq - DQ_TOLERANCE
  const bestByS = rankScores([...S], 'asc')[first] === 1
  const bestByR = rankScores([...R], 'asc')[first] === 1
  const c2 = bestByS || bestByR
  const set = c1 ? (c2 ? [first] : [first, second]) : order.filter((i) => Q[i]! - Q[first]! < dq - DQ_TOLERANCE)
  return { first, second, dq, advantage, c1, c2, bestByS, bestByR, tieAtTop: qRank[second] === qRank[first], set }
}

/**
 * VIKOR, the compromise ranking of Opricovic (1998) as stated in Opricovic & Tzeng (2004), EJOR 156:445, §2.
 * f*_j / f-_j: best / worst value of criterion j (benefit max / min, cost min / max).
 * d_ij = w_j (f*_j - x_ij) / (f*_j - f-_j), S_i = Σ_j d_ij (group utility), R_i = max_j d_ij (individual regret).
 * Q_i = v (S_i - S*) / (S- - S*) + (1 - v) (R_i - R*) / (R- - R*), lower is better; score = Q, order 'asc'.
 * Guards (card §Pitfalls): a constant column has f* = f-, its d is 0 (notice); if every S is equal the S term of Q is 0
 * (only the R term remains, notice), and the same for R. C1, C2 and the compromise set: `vikorCompromise`.
 * See docs/research/methods/vikor.md.
 */
export const vikor: RankingMethod<VikorParams> = {
  id: 'vikor',
  kind: 'ranking',
  params: [{ key: 'v', kind: 'number', min: 0, max: 1, step: 0.05, default: VIKOR_DEFAULT_V }],
  compute(problem: Problem, weights: number[], params: VikorParams = {}): RankingResult {
    const v = params.v ?? VIKOR_DEFAULT_V
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) throw new RangeError(`VIKOR v must be in [0, 1], got ${String(v)}`)
    const n = problem.criteria.length
    assertValid([...validateProblem(problem), ...validateWeights(weights, n)])
    const { matrix, criteria } = problem
    const m = matrix.length
    const warnings: MethodWarning[] = []

    // 1. Best and worst value per criterion.
    const best = new Array<number>(n)
    const worst = new Array<number>(n)
    for (let j = 0; j < n; j++) {
      const col = column(matrix, j)
      const hi = Math.max(...col)
      const lo = Math.min(...col)
      const isCost = criteria[j]!.type === 'cost'
      best[j] = isCost ? lo : hi
      worst[j] = isCost ? hi : lo
    }

    // 2. Weighted normalized distance to the best; a constant column cannot tell anyone apart: 0, never divided.
    const d = zeros(m, n)
    for (let j = 0; j < n; j++) {
      const span = best[j]! - worst[j]!
      if (span === 0) {
        warnings.push({ code: 'vikor.constant-column', col: j })
        continue
      }
      for (let i = 0; i < m; i++) d[i]![j] = (weights[j]! * (best[j]! - matrix[i]![j]!)) / span
    }

    // 3. Group utility S (L1) and individual regret R (L∞).
    const S = d.map((row) => sum(row))
    const R = d.map((row) => Math.max(...row))

    // 4. Q; a term whose spread is 0 is 0 (every alternative equal on it), so Q never divides by 0.
    const sStar = Math.min(...S)
    const sMinus = Math.max(...S)
    const rStar = Math.min(...R)
    const rMinus = Math.max(...R)
    const sFlat = sMinus - sStar === 0
    const rFlat = rMinus - rStar === 0
    if (sFlat && rFlat) warnings.push({ code: 'vikor.no-spread' })
    else if (sFlat) warnings.push({ code: 'vikor.equal-group-utility' })
    else if (rFlat) warnings.push({ code: 'vikor.equal-regret' })
    const Q = S.map((s, i) => {
      const sTerm = sFlat ? 0 : (s - sStar) / (sMinus - sStar)
      const rTerm = rFlat ? 0 : (R[i]! - rStar) / (rMinus - rStar)
      return v * sTerm + (1 - v) * rTerm
    })

    // 5. Acceptance conditions; a tie for first by Q is reported (the order between the tied is the input order).
    const c = vikorCompromise(S, R, Q)
    if (c.tieAtTop && !(sFlat && rFlat)) warnings.push({ code: 'vikor.tie-for-first' })

    return {
      scores: Q,
      order: 'asc',
      ranking: rankScores(Q, 'asc'),
      steps: [
        { key: 'vikor.best', vector: best },
        { key: 'vikor.worst', vector: worst },
        { key: 'vikor.weightedDistance', matrix: d },
        { key: 'vikor.groupUtility', vector: S },
        { key: 'vikor.individualRegret', vector: R },
        { key: 'vikor.q', vector: Q },
        { key: 'vikor.threshold', scalar: c.dq },
      ],
      diagnostics: {
        v,
        dq: c.dq,
        advantage: c.advantage,
        c1: c.c1 ? 1 : 0,
        c2: c.c2 ? 1 : 0,
        compromiseSize: c.set.length,
      },
      warnings,
    }
  },
}
