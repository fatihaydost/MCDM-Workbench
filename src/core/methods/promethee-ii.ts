import { column, isConstant, isNearConstant, zeros } from '../math'
import { rankScores, TIE_TOLERANCE } from '../rank'
import type { MethodWarning, Problem, RankingMethod, RankingResult, Step } from '../types'
import { assertValid, validateProblem, validateWeights } from '../validate'

/** Workbench preference function families selectable for all criteria. */
export type PrometheePreferenceFunction = 'v-shape' | 'usual' | 'level' | 'gaussian'

/** Full Brans & Vincke (1985) generalized criterion types I-VI for per-criterion specs. */
export type PrometheeCriterionType =
  | PrometheePreferenceFunction
  | 'u-shape'
  | 'linear'
  | 'I'
  | 'II'
  | 'III'
  | 'IV'
  | 'V'
  | 'VI'

export interface PrometheeCriterionFunction {
  readonly type: PrometheeCriterionType
  readonly q?: number
  readonly p?: number
  readonly s?: number
}

export type PrometheeParams = {
  /** Family applied to all criteria with column-range thresholds when `criteriaFunctions` is omitted. */
  preferenceFunction?: PrometheePreferenceFunction
  /** Optional explicit per-criterion generalized criterion specifications (types I-VI with raw thresholds). */
  criteriaFunctions?: readonly PrometheeCriterionFunction[]
}

const VALID_FUNCTIONS: readonly PrometheePreferenceFunction[] = ['v-shape', 'usual', 'level', 'gaussian']
const VALID_CRITERION_TYPES: readonly PrometheeCriterionType[] = [
  'v-shape',
  'usual',
  'level',
  'gaussian',
  'u-shape',
  'linear',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
]
const BOUNDARY_EPS = 1e-12

function evalPreference(
  d: number,
  type: PrometheeCriterionType,
  q: number,
  p: number,
  s: number,
  eps: number,
): number {
  if (d <= eps) return 0
  switch (type) {
    case 'usual':
    case 'I':
      return 1
    case 'u-shape':
    case 'II':
      return d > q + eps ? 1 : 0
    case 'v-shape':
    case 'III':
      if (p <= eps || d >= p - eps) return 1
      return d / p
    case 'level':
    case 'IV':
      if (d <= q + eps) return 0
      if (d <= p + eps) return 0.5
      return 1
    case 'linear':
    case 'V':
      if (d <= q + eps) return 0
      if (p <= q + eps || d >= p - eps) return 1
      return (d - q) / (p - q)
    case 'gaussian':
    case 'VI':
      if (s <= eps) return 1
      return 1 - Math.exp(-(d * d) / (2 * s * s))
  }
}

function defaultThresholds(
  range: number,
  type: PrometheeCriterionType,
): { q: number; p: number; s: number } {
  switch (type) {
    case 'usual':
    case 'I':
    case 'u-shape':
    case 'II':
      return { q: 0, p: 0, s: 0 }
    case 'v-shape':
    case 'III':
    case 'linear':
    case 'V':
      return { q: 0, p: range, s: 0 }
    case 'level':
    case 'IV':
      return { q: 0.2 * range, p: 0.6 * range, s: 0 }
    case 'gaussian':
    case 'VI':
      return { q: 0, p: 0, s: 0.5 * range }
  }
}

/**
 * Pairs of alternatives `[a, b]` (`a < b`) that are incomparable in PROMETHEE I (`a R b`):
 * one has strictly higher leaving flow `φ⁺` and also strictly higher entering flow `φ⁻`.
 */
export function prometheeIncomparablePairs(
  positiveFlow: readonly number[],
  negativeFlow: readonly number[],
  tolerance: number = TIE_TOLERANCE,
): [number, number][] {
  const m = positiveFlow.length
  const pairs: [number, number][] = []
  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      const dp = positiveFlow[a]! - positiveFlow[b]!
      const dn = negativeFlow[a]! - negativeFlow[b]!
      if ((dp > tolerance && dn > tolerance) || (dp < -tolerance && dn < -tolerance)) {
        pairs.push([a, b])
      }
    }
  }
  return pairs
}

/**
 * PROMETHEE II — Preference Ranking Organization Method for Enrichment Evaluations
 * (Brans & Vincke 1985; Brans, Vincke & Mareschal 1986; Brans & Mareschal 2005).
 *
 * Steps:
 *   1. Directed pairwise difference on criterion j:
 *        d_j(a, b) = σ_j · (x_aj − x_bj),  σ_j = +1 (benefit) or −1 (cost)
 *   2. Unicriterion preference degree P_j(a, b) = F_j(d_j(a, b)) ∈ [0, 1].
 *   3. Aggregated preference index:
 *        π(a, b) = Σ_j w_j · P_j(a, b),   π(a, a) = 0
 *   4. Leaving (positive) and entering (negative) outranking flows:
 *        φ⁺(a) = (1 / (m − 1)) · Σ_{b ≠ a} π(a, b)
 *        φ⁻(a) = (1 / (m − 1)) · Σ_{b ≠ a} π(b, a)
 *   5. Net outranking flow:
 *        φ(a) = φ⁺(a) − φ⁻(a) ∈ [−1, 1],  rank descending by φ(a).
 */
export const prometheeII: RankingMethod<PrometheeParams> = {
  id: 'promethee-ii',
  kind: 'ranking',
  params: [
    {
      key: 'preferenceFunction',
      kind: 'choice',
      options: ['v-shape', 'usual', 'level', 'gaussian'],
      default: 'v-shape',
    },
  ],
  compute(problem: Problem, weights: number[], params: PrometheeParams = {}): RankingResult {
    const fn: PrometheePreferenceFunction = params?.preferenceFunction ?? 'v-shape'
    if (!VALID_FUNCTIONS.includes(fn)) {
      throw new RangeError(`PROMETHEE II preferenceFunction must be one of ${VALID_FUNCTIONS.join(', ')}; got ${String(fn)}`)
    }

    const m = problem.alternatives.length
    const n = problem.criteria.length
    const issues = validateProblem(problem)
    assertValid([...issues, ...validateWeights(weights, n)])

    const specs = params?.criteriaFunctions
    if (specs !== undefined && (!Array.isArray(specs) || specs.length !== n)) {
      throw new RangeError(
        `PROMETHEE II criteriaFunctions length (${Array.isArray(specs) ? specs.length : typeof specs}) must match criteria count (${n})`,
      )
    }
    if (specs) {
      for (let j = 0; j < n; j++) {
        const spec = specs[j]!
        if (!spec || !VALID_CRITERION_TYPES.includes(spec.type)) {
          throw new RangeError(
            `PROMETHEE II criteriaFunctions[${j}].type must be one of ${VALID_CRITERION_TYPES.join(', ')}; got ${String(spec?.type)}`,
          )
        }
        if (spec.q !== undefined && (!Number.isFinite(spec.q) || spec.q < 0)) {
          throw new RangeError(`PROMETHEE II threshold q must be >= 0 on criterion ${j}`)
        }
        if (spec.p !== undefined && (!Number.isFinite(spec.p) || spec.p < 0)) {
          throw new RangeError(`PROMETHEE II threshold p must be >= 0 on criterion ${j}`)
        }
        if (
          spec.s !== undefined &&
          (!Number.isFinite(spec.s) || ((spec.type === 'gaussian' || spec.type === 'VI') ? spec.s <= 0 : spec.s < 0))
        ) {
          throw new RangeError(`PROMETHEE II threshold s is invalid on criterion ${j}`)
        }
        if (
          (spec.type === 'level' || spec.type === 'IV' || spec.type === 'linear' || spec.type === 'V') &&
          spec.p !== undefined &&
          (spec.q ?? 0) > spec.p + BOUNDARY_EPS * Math.max(spec.q ?? 0, spec.p, 1e-100)
        ) {
          throw new RangeError(`PROMETHEE II threshold q (${spec.q ?? 0}) exceeds p (${spec.p}) on criterion ${j}`)
        }
      }
    }

    const { matrix, criteria } = problem
    const pi = zeros(m, m)
    const warnings: MethodWarning[] = []

    for (let j = 0; j < n; j++) {
      const wj = weights[j]!
      if (wj === 0) continue

      const col = column(matrix, j)
      if (isNearConstant(col)) {
        warnings.push({ code: 'promethee-ii.near-constant-column', col: j })
      }

      let min = Infinity
      let max = -Infinity
      for (let i = 0; i < m; i++) {
        const v = matrix[i]![j]!
        if (v < min) min = v
        if (v > max) max = v
      }
      const range = max - min
      if (range === 0 || isConstant(col)) continue

      const sign = criteria[j]!.type === 'benefit' ? 1 : -1
      const spec = specs?.[j]
      const type: PrometheeCriterionType = spec ? spec.type : fn
      const defaults = defaultThresholds(range, type)
      const q = spec ? (spec.q ?? defaults.q) : defaults.q
      const p = spec ? (spec.p ?? defaults.p) : defaults.p
      const s = spec ? (spec.s ?? defaults.s) : defaults.s
      const eps = BOUNDARY_EPS * Math.max(range, Math.abs(p), Math.abs(q), Math.abs(s), 1e-100)
      if ((type === 'level' || type === 'IV' || type === 'linear' || type === 'V') && q > p + eps) {
        throw new RangeError(`PROMETHEE II threshold q (${q}) exceeds p (${p}) on criterion ${j}`)
      }

      for (let a = 0; a < m; a++) {
        const xa = matrix[a]![j]!
        const row = pi[a]!
        for (let b = 0; b < m; b++) {
          if (a === b) continue
          const d = sign * (xa - matrix[b]![j]!)
          if (d > eps) {
            row[b]! += wj * evalPreference(d, type, q, p, s, eps)
          }
        }
      }
    }

    const denom = m - 1
    const positiveFlow = new Array<number>(m).fill(0)
    const negativeFlow = new Array<number>(m).fill(0)
    for (let a = 0; a < m; a++) {
      let outSum = 0
      let inSum = 0
      for (let b = 0; b < m; b++) {
        if (a === b) continue
        outSum += pi[a]![b]!
        inSum += pi[b]![a]!
      }
      positiveFlow[a] = outSum / denom
      negativeFlow[a] = inSum / denom
    }

    const netFlow = positiveFlow.map((pos, a) => pos - negativeFlow[a]! + 0)
    const incomparablePairs = prometheeIncomparablePairs(positiveFlow, negativeFlow).length

    const steps: Step[] = [
      { key: 'promethee-ii.preferenceMatrix', matrix: pi, axes: ['alternatives', 'alternatives'] },
      { key: 'promethee-ii.positiveFlow', vector: positiveFlow, axes: 'alternatives' },
      { key: 'promethee-ii.negativeFlow', vector: negativeFlow, axes: 'alternatives' },
      { key: 'promethee-ii.netFlow', vector: netFlow, axes: 'alternatives' },
    ]

    return {
      scores: netFlow,
      order: 'desc',
      ranking: rankScores(netFlow, 'desc'),
      steps,
      diagnostics: { incomparablePairs },
      warnings,
    }
  },
}
