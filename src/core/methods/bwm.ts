import { sanitizeJudgements } from '../judgements'
import type { Judgements, MethodWarning, Problem, WeightingMethod, WeightingResult } from '../types'
import { ProblemValidationError, type ValidationIssue } from '../validate'

/**
 * BWM (Best-Worst Method), linear model: Rezaei 2016, model (19), solved by its closed form (Ratandhara & Kumar,
 * Theorem 2, Eqs. 7-18; equals the LP to 1e-12). Consistency: input-based CR^I and its thresholds (Liang, Brunelli &
 * Rezaei 2020, Eqs. 6-7, Table 3). The decision matrix is never read; the input is the user's judgements.
 * See docs/research/methods/bwm.md.
 */

export type BwmAnswers = { best: number; worst: number; bestToOthers: (number | null)[]; othersToWorst: (number | null)[] }

type Side = 'bestToOthers' | 'othersToWorst'

export type BwmProgress = {
  answered: number
  total: number
  weights: number[] | null
  provisional: boolean
  crInput: number | null
  threshold: { value: number; approximate: boolean } | null
  flagged: number | null
  suggestion: { side: Side; value: number } | null
}

/** Liang et al. 2020 Table 3: rows a_BW 3..9, columns n 3..9. */
const LIANG_CRI: readonly (readonly number[])[] = [
  [0.1667, 0.1667, 0.1667, 0.1667, 0.1667, 0.1667, 0.1667],
  [0.1121, 0.1529, 0.1898, 0.2206, 0.2527, 0.2577, 0.2683],
  [0.1354, 0.1994, 0.2306, 0.2546, 0.2716, 0.2844, 0.296],
  [0.133, 0.199, 0.2643, 0.3044, 0.3144, 0.3221, 0.3262],
  [0.1294, 0.2457, 0.2819, 0.3029, 0.3144, 0.3251, 0.3403],
  [0.1309, 0.2521, 0.2958, 0.3154, 0.3408, 0.362, 0.3657],
  [0.1359, 0.2681, 0.3062, 0.3337, 0.3517, 0.362, 0.3662],
]

/** The BWM view of the pairwise answers; an entry outside 1..cap (AHP direction, above a_BW) counts as unanswered. */
export function bwmAnswers(j: Judgements): BwmAnswers | null {
  const { best: B, worst: W } = j
  const n = j.pairs?.length ?? 0
  if (B === null || W === null || B === W || B < 0 || B >= n || W < 0 || W >= n) return null
  const at = (a: number, b: number) => j.pairs[a]?.[b] ?? null
  const ok = (v: number | null, cap: number) => (v !== null && Number.isInteger(v) && v >= 1 && v <= cap ? v : null)
  const aBW = ok(at(B, W), 9)
  const cap = aBW ?? 9
  const bestToOthers = Array.from({ length: n }, (_, k) => (k === B ? 1 : k === W ? aBW : ok(at(B, k), cap)))
  const othersToWorst = Array.from({ length: n }, (_, k) => (k === W ? 1 : k === B ? aBW : ok(at(k, W), cap)))
  return { best: B, worst: W, bestToOthers, othersToWorst }
}

/** Card step 4: closed form of the linear model; η = 0 gives the consistent weights of step 2. */
export function bwmSolve(
  bestToOthers: readonly number[],
  othersToWorst: readonly number[],
  best: number,
  worst: number,
): { weights: number[]; xi: number } {
  const bo = bestToOthers
  const ow = othersToWorst
  const n = bo.length
  const aBW = bo[worst]!
  const D = Array.from({ length: n }, (_, i) => i).filter((i) => i !== best && i !== worst)
  const p = (i: number) => bo[i]! * ow[i]!
  const D1 = D.filter((i) => p(i) < aBW)
  const D2 = D.filter((i) => p(i) > aBW)
  // η = max ε (Eqs. 7 and 11); the first maximum wins, ε_i before ε_ij, as in bwm.py.
  let eta = 0
  let i0 = -1
  let j0 = -1
  for (const i of D) {
    const e = Math.abs(p(i) - aBW) / (bo[i]! + 2)
    if (e > eta) [eta, i0, j0] = [e, i, -1]
  }
  for (const i of D1)
    for (const k of D2) {
      const e = Math.abs(p(i) - p(k)) / (bo[i]! + bo[k]! + 2)
      if (e > eta) [eta, i0, j0] = [e, i, k]
    }
  const v = new Array<number>(n).fill(0)
  v[worst] = 1
  const rest = (skip: number[], cap: number) => D.forEach((i) => skip.includes(i) || (v[i] = Math.min(ow[i]! + eta, cap / bo[i]!)))
  if (eta === 0) {
    v[best] = aBW
    D.forEach((i) => (v[i] = ow[i]!))
  } else if (j0 < 0 && D1.includes(i0)) {
    // Eq. 16
    v[best] = aBW - eta
    v[i0] = ow[i0]! + eta
    rest([i0], aBW)
  } else if (j0 < 0) {
    // Eq. 17
    v[best] = aBW + eta
    v[i0] = ow[i0]! - eta
    rest([i0], aBW + 2 * eta)
  } else {
    // Eq. 18
    v[best] = p(i0) + (bo[i0]! + 1) * eta
    v[i0] = ow[i0]! + eta
    v[j0] = ow[j0]! - eta
    rest([i0, j0], p(i0) + (bo[i0]! + 2) * eta)
  }
  const sigma = v.reduce((a, b) => a + b, 0)
  return { weights: v.map((x) => x / sigma), xi: eta / sigma }
}

/** Card steps 5-6: CR^I_j (0 where an answer is missing, or when a_BW = 1), CR^I = max, argmax (first on ties). */
export function bwmConsistency(
  bestToOthers: readonly (number | null)[],
  othersToWorst: readonly (number | null)[],
  _best: number,
  worst: number,
): { local: number[]; crInput: number; mostInconsistent: number } {
  const aBW = bestToOthers[worst]!
  const local = bestToOthers.map((b, k) => {
    const w = othersToWorst[k]
    return aBW === 1 || b === null || w === null || w === undefined ? 0 : Math.abs(b * w - aBW) / (aBW * (aBW - 1))
  })
  const crInput = Math.max(...local)
  return { local, crInput, mostInconsistent: local.indexOf(crInput) }
}

/** Liang Table 3 threshold for scale a_BW and n criteria; n > 9 uses the n = 9 column (approximate). */
export function liangThreshold(aBW: number, n: number): { value: number; approximate: boolean } | null {
  if (n < 3) return null
  if (aBW <= 2) return { value: 0, approximate: false }
  return { value: LIANG_CRI[aBW - 3]![Math.min(n, 9) - 3]!, approximate: n > 9 }
}

/** The one value in 1..a_BW, on either side, that brings a_Bj · a_jW closest to a_BW; ties: othersToWorst, then smaller. */
export function bwmSuggestion(
  bestToOthers: readonly (number | null)[],
  othersToWorst: readonly (number | null)[],
  _best: number,
  worst: number,
  j: number,
): { side: Side; value: number } {
  const aBW = bestToOthers[worst]!
  let out: { side: Side; value: number } = { side: 'othersToWorst', value: 1 }
  let gap = Infinity
  const sides: [Side, number][] = [['othersToWorst', bestToOthers[j]!], ['bestToOthers', othersToWorst[j]!]]
  for (const [side, other] of sides)
    for (let value = 1; value <= aBW; value++) {
      const g = Math.abs(other * value - aBW)
      if (g < gap) [gap, out] = [g, { side, value }]
    }
  return out
}

/** Live state while answering: count, provisional or final weights, CR^I against its threshold, flag and suggestion. */
export function bwmProgress(j: Judgements, n: number): BwmProgress {
  const total = Math.max(2 * n - 3, 0)
  const none: BwmProgress = { answered: 0, total, weights: null, provisional: false, crInput: null, threshold: null, flagged: null, suggestion: null }
  const a = bwmAnswers(j?.pairs?.length === n ? j : sanitizeJudgements(j, n))
  if (!a) return none
  const { best: B, worst: W, bestToOthers: bo, othersToWorst: ow } = a
  const aBW = bo[W] ?? null
  const answered = countAnswered(a)
  if (aBW === null) return { ...none, answered }
  let weights: number[]
  let provisional = false
  if (answered === total) weights = bwmSolve(bo as number[], ow as number[], B, W).weights
  else {
    provisional = true
    const v = bo.map((b, k) => {
      if (k === B) return aBW
      if (k === W) return 1
      const known = [b === null ? null : aBW / b, ow[k]!].filter((x): x is number => x !== null)
      return known.length ? known.reduce((s, x) => s + x, 0) / known.length : 0
    })
    const sigma = v.reduce((s, x) => s + x, 0)
    weights = v.map((x) => x / sigma)
  }
  const { crInput, mostInconsistent } = bwmConsistency(bo, ow, B, W)
  const threshold = liangThreshold(aBW, n)
  const flagged = threshold && crInput > threshold.value ? mostInconsistent : null
  const suggestion = flagged === null ? null : bwmSuggestion(bo, ow, B, W, flagged)
  return { answered, total, weights, provisional, crInput, threshold, flagged, suggestion }
}

/** Answered positions out of 2n − 3: a_BW once, then a_Bj and a_jW for every j other than B and W. */
function countAnswered({ best: B, worst: W, bestToOthers: bo, othersToWorst: ow }: BwmAnswers): number {
  let c = bo[W] === null ? 0 : 1
  bo.forEach((b, k) => k !== B && k !== W && (c += (b !== null ? 1 : 0) + (ow[k] !== null ? 1 : 0)))
  return c
}

export const bwm: WeightingMethod = {
  id: 'bwm',
  kind: 'weighting',
  reads: 'judgements',
  compute(problem: Problem, _params, judgements?: Judgements): WeightingResult {
    const n = problem.criteria.length
    const fail = (issue: Omit<ValidationIssue, 'severity'>): never => {
      throw new ProblemValidationError([{ ...issue, severity: 'error' }])
    }
    if (n < 2) fail({ code: 'too-few-criteria', value: n })
    const clean = judgements ? (judgements.pairs?.length === n ? judgements : sanitizeJudgements(judgements, n)) : null
    const a = clean ? bwmAnswers(clean) : null
    if (!a) return fail({ code: 'anchors-missing' })
    const answered = countAnswered(a)
    if (answered !== 2 * n - 3) fail({ code: 'judgements-incomplete', value: answered })
    const { best: B, worst: W } = a
    const bo = a.bestToOthers as number[]
    const ow = a.othersToWorst as number[]
    const { weights, xi } = bwmSolve(bo, ow, B, W)
    const { local, crInput, mostInconsistent } = bwmConsistency(bo, ow, B, W)
    const threshold = liangThreshold(bo[W]!, n)
    const warnings: MethodWarning[] = []
    if (threshold && crInput > threshold.value) warnings.push({ code: 'bwm.inconsistent', col: mostInconsistent })
    if (n > 9) warnings.push({ code: 'bwm.threshold-approximate' })
    return {
      weights,
      steps: [
        { key: 'bwm.bestToOthers', vector: bo, axes: 'criteria' },
        { key: 'bwm.othersToWorst', vector: ow, axes: 'criteria' },
        { key: 'bwm.consistencyLocal', vector: local, axes: 'criteria' },
        { key: 'bwm.xi', scalar: xi },
        { key: 'bwm.weights', vector: weights, axes: 'criteria' },
      ],
      diagnostics: { xiL: xi, crInput, crThreshold: threshold?.value ?? Number.NaN, mostInconsistent },
      warnings,
    }
  },
}
