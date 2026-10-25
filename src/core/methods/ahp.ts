import { nearestScale, SCALE, toScale } from '../judgements'
import { sum, zeros } from '../math'
import { rankScores } from '../rank'
import { sawSumNormalize } from './saw'
import type {
  AlternativeJudgements,
  Judgements,
  MethodWarning,
  Problem,
  RankingMethod,
  RankingResult,
  Ratio,
  Step,
  WeightingMethod,
  WeightingResult,
} from '../types'
import {
  assertValid,
  hasErrors,
  ProblemValidationError,
  validateProblem,
  validateWeights,
  type ValidationIssue,
} from '../validate'

export type AhpAggregation = 'eigenvector' | 'geometric'

export type AhpParams = {
  /** Priority vector extraction: principal right eigenvector (Saaty 1980) or row geometric mean / LLSM (Crawford & Williams 1985). */
  aggregation?: AhpAggregation
}

/** Saaty's Random Index RI_n for n = 1..15 (Saaty & Tran 2007, Table 1; Saaty 2008, Table 1). Index 0 unused. */
export const RI_SAATY: readonly number[] = [
  0, 0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51, 1.48, 1.56, 1.57, 1.59,
]

/** Consistency ratio threshold above or at which Saaty (1980, 2008) flags the judgements for review. */
export const AHP_CR_THRESHOLD = 0.1

export type AhpWorstPair = {
  /** Upper-triangle row index (0 <= i < k < n). */
  i: number
  /** Upper-triangle column index (0 <= i < k < n). */
  k: number
  /** Multiplicative discrepancy max(a_ik * w_k / w_i, w_i / (a_ik * w_k)). */
  epsilon: number
  /** Entered comparison value a_ik. */
  actual: Ratio
  /** Nearest Saaty scale value to the fitted ratio w_i / w_k. */
  suggested: Ratio
}

export type AhpProgress = {
  answered: number
  total: number
  weights: number[] | null
  provisional: boolean
  lambdaMax: number | null
  ci: number | null
  cr: number | null
  threshold: number | null
  thresholdApproximate: boolean
  inconsistent: boolean
  worstPair: AhpWorstPair | null
}

function riFor(n: number): number {
  if (n <= 2) return 0
  if (n < RI_SAATY.length) return RI_SAATY[n]!
  return (2.7699 * n - 4.3513 - n) / (n - 1)
}

function rayleighLambdaMax(A: readonly (readonly number[])[], w: readonly number[]): number {
  const n = A.length
  let sum = 0
  for (let i = 0; i < n; i++) {
    let aw = 0
    const row = A[i]!
    for (let k = 0; k < n; k++) aw += row[k]! * w[k]!
    sum += aw / w[i]!
  }
  return sum / n
}

/** Principal right eigenvector of a positive reciprocal matrix via power iteration, normalized to sum to 1. */
export function ahpEigenvector(A: readonly (readonly number[])[]): { weights: number[]; lambdaMax: number } {
  const n = A.length
  let w = new Array<number>(n).fill(1 / n)
  for (let iter = 0; iter < 1000; iter++) {
    const next = new Array<number>(n).fill(0)
    let sum = 0
    for (let i = 0; i < n; i++) {
      const row = A[i]!
      let s = 0
      for (let k = 0; k < n; k++) s += row[k]! * w[k]!
      next[i] = s
      sum += s
    }
    let diff = 0
    for (let i = 0; i < n; i++) {
      next[i] = next[i]! / sum
      const d = Math.abs(next[i]! - w[i]!)
      if (d > diff) diff = d
    }
    w = next
    if (diff < 1e-13) break
  }
  return { weights: w, lambdaMax: rayleighLambdaMax(A, w) }
}

/** Row geometric mean (LLSM) priority vector of a positive reciprocal matrix, normalized to sum to 1. */
export function ahpGeometricMean(A: readonly (readonly number[])[]): { weights: number[]; lambdaMax: number } {
  const n = A.length
  const g = new Array<number>(n)
  let sum = 0
  for (let i = 0; i < n; i++) {
    const row = A[i]!
    let logSum = 0
    for (let k = 0; k < n; k++) logSum += Math.log(row[k]!)
    const gi = Math.exp(logSum / n)
    g[i] = gi
    sum += gi
  }
  const weights = g.map((gi) => gi / sum)
  return { weights, lambdaMax: ahpEigenvector(A).lambdaMax }
}

function solveLinearSystem(matrix: number[][], rhs: number[]): number[] {
  const m = matrix.length
  const a = matrix.map((row, i) => [...row, rhs[i]!])
  for (let col = 0; col < m; col++) {
    let pivot = col
    let best = Math.abs(a[col]![col]!)
    for (let row = col + 1; row < m; row++) {
      const v = Math.abs(a[row]![col]!)
      if (v > best) {
        best = v
        pivot = row
      }
    }
    if (pivot !== col) {
      const tmp = a[col]!
      a[col] = a[pivot]!
      a[pivot] = tmp
    }
    const diag = a[col]![col]!
    if (Math.abs(diag) < 1e-14) continue
    for (let row = col + 1; row < m; row++) {
      const factor = a[row]![col]! / diag
      if (factor === 0) continue
      for (let k = col; k <= m; k++) a[row]![k] = a[row]![k]! - factor * a[col]![k]!
    }
  }
  const x = new Array<number>(m).fill(0)
  for (let row = m - 1; row >= 0; row--) {
    let s = a[row]![m]!
    for (let col = row + 1; col < m; col++) s -= a[row]![col]! * x[col]!
    const diag = a[row]![row]!
    x[row] = Math.abs(diag) < 1e-14 ? 0 : s / diag
  }
  return x
}

/**
 * Incomplete Logarithmic Least Squares (Bozóki, Fülöp & Rónyai 2010): solves L y = r when the answered comparisons
 * form a single connected component and normalizes exp(y) across the answered criteria (criteria with no answers get NaN;
 * returns null if no pairs are answered or if answered pairs form disconnected components).
 */
export function ahpIncompleteLlsm(n: number, pairs: readonly (readonly (Ratio | null)[])[] | undefined): number[] | null {
  if (!pairs || n < 2) return null
  const edges: { i: number; k: number; v: number }[] = []
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i++)
    for (let k = i + 1; k < n; k++) {
      const v = toScale(pairs[i]?.[k])
      if (v !== null) {
        edges.push({ i, k, v })
        adj[i]!.push(k)
        adj[k]!.push(i)
      }
    }
  if (edges.length === 0) return null

  const out = new Array<number>(n).fill(Number.NaN)
  const visited = new Array<boolean>(n).fill(false)
  let components = 0
  for (let start = 0; start < n; start++) {
    if (visited[start] || adj[start]!.length === 0) continue
    components++
    if (components > 1) return null
    const comp: number[] = []
    const queue = [start]
    visited[start] = true
    while (queue.length > 0) {
      const u = queue.shift()!
      comp.push(u)
      for (const nb of adj[u]!) {
        if (!visited[nb]) {
          visited[nb] = true
          queue.push(nb)
        }
      }
    }
    comp.sort((a, b) => a - b)
    const idxOf = new Map<number, number>(comp.map((v, idx) => [v, idx]))
    const m = comp.length
    const L = Array.from({ length: m }, () => new Array<number>(m).fill(0))
    const r = new Array<number>(m).fill(0)
    for (const e of edges) {
      const u = idxOf.get(e.i)
      const v = idxOf.get(e.k)
      if (u === undefined || v === undefined) continue
      const logA = Math.log(e.v)
      L[u]![u]! += 1
      L[v]![v]! += 1
      L[u]![v]! -= 1
      L[v]![u]! -= 1
      r[u]! += logA
      r[v]! -= logA
    }
    L[0] = new Array<number>(m).fill(0)
    L[0][0] = 1
    r[0] = 0
    const y = solveLinearSystem(L, r)
    const maxY = Math.max(...y)
    let compSum = 0
    const compW = y.map((yi) => {
      const wi = Math.exp(yi - maxY)
      compSum += wi
      return wi
    })
    comp.forEach((critIdx, u) => {
      out[critIdx] = (compW[u]! / compSum) * m
    })
  }
  let total = 0
  for (const w of out) if (Number.isFinite(w)) total += w
  if (!(total > 0)) return null
  return out.map((w) => (Number.isFinite(w) ? w / total : Number.NaN))
}

/** Upper-triangle pair (i, k) with the largest multiplicative error max(a_ik * w_k / w_i, w_i / (a_ik * w_k)). */
export function ahpWorstPair(A: readonly (readonly number[])[], weights: readonly number[]): AhpWorstPair | null {
  const n = A.length
  if (n < 3) return null
  const baseLambda = ahpEigenvector(A).lambdaMax
  const ri = riFor(n)
  const baseCr = ri > 0 ? Math.max(0, (baseLambda - n) / (n - 1)) / ri : 0
  let best: AhpWorstPair | null = null
  for (let i = 0; i < n; i++)
    for (let k = i + 1; k < n; k++) {
      const actual = A[i]![k]! as Ratio
      const ratio = weights[i]! / weights[k]!
      const eps = Math.max(actual / ratio, ratio / actual)
      if (eps <= 1 + 1e-9) continue
      let suggested = nearestScale(ratio)
      if (Math.abs(suggested - actual) <= 1e-9) {
        let logIndirect = 0
        for (let j = 0; j < n; j++) {
          if (j !== i && j !== k) logIndirect += Math.log(A[i]![j]! * A[j]![k]!)
        }
        const indirectRatio = Math.exp(logIndirect / (n - 2))
        const indirectSuggested = nearestScale(indirectRatio)
        if (Math.abs(indirectSuggested - actual) > 1e-9) {
          suggested = indirectSuggested
        } else {
          let bestLambda = baseLambda - 1e-12
          for (const s of SCALE) {
            if (Math.abs(s - actual) <= 1e-9) continue
            const trial = A.map((row, r) =>
              row.map((v, c) => (r === i && c === k ? s : r === k && c === i ? 1 / s : v)),
            )
            const { lambdaMax } = ahpEigenvector(trial)
            if (lambdaMax < bestLambda) {
              bestLambda = lambdaMax
              suggested = s
            }
          }
        }
      }
      const cand: AhpWorstPair = { i, k, epsilon: eps, actual, suggested }
      if (!best) {
        best = cand
        continue
      }
      const bestActionable = Math.abs(best.suggested - best.actual) > 1e-9
      const candActionable = Math.abs(cand.suggested - cand.actual) > 1e-9
      if (baseCr >= AHP_CR_THRESHOLD || Math.abs(eps - best.epsilon) <= 1e-7) {
        if (candActionable && !bestActionable) {
          best = cand
          continue
        }
        if (!candActionable && bestActionable) {
          continue
        }
      }
      if (eps > best.epsilon + 1e-9) {
        best = cand
      }
    }
  return best
}

function buildMatrix(n: number, j: Judgements | undefined): { matrix: number[][] | null; answered: number; total: number } {
  const total = n < 2 ? 0 : (n * (n - 1)) / 2
  if (n < 2) return { matrix: null, answered: 0, total }
  const matrix: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, k) => (i === k ? 1 : 0)))
  let answered = 0
  for (let i = 0; i < n; i++)
    for (let k = i + 1; k < n; k++) {
      const v = toScale(j?.pairs[i]?.[k])
      if (v !== null) {
        answered++
        matrix[i]![k] = v
        matrix[k]![i] = 1 / v
      }
    }
  return { matrix: answered === total ? matrix : null, answered, total }
}

function solveMatrix(A: readonly (readonly number[])[], params?: AhpParams) {
  const n = A.length
  const aggregation: AhpAggregation = params?.aggregation ?? 'eigenvector'
  const { weights, lambdaMax } = aggregation === 'geometric' ? ahpGeometricMean(A) : ahpEigenvector(A)
  const ci = n <= 2 ? 0 : Math.max(0, (lambdaMax - n) / (n - 1))
  const ri = riFor(n)
  const cr = n <= 2 || ri === 0 ? 0 : ci / ri
  return { weights, lambdaMax, ci, cr }
}

/**
 * Live state for the pairwise panel: answered count, provisional (incomplete LLSM) or final weights,
 * consistency numbers (for n >= 3 once complete) and the most inconsistent upper-triangle pair.
 */
export function ahpProgress(
  problem: Pick<Problem, 'criteria'>,
  judgements: Judgements | undefined,
  params?: AhpParams,
): AhpProgress
export function ahpProgress(judgements: Judgements | undefined, n: number, params?: AhpParams): AhpProgress
export function ahpProgress(
  first: Pick<Problem, 'criteria'> | Judgements | undefined,
  second?: Judgements | number,
  params?: AhpParams,
): AhpProgress {
  const isProblem = first !== undefined && 'criteria' in first
  const n = isProblem ? first.criteria.length : (second as number)
  const j = isProblem ? (second as Judgements | undefined) : (first as Judgements | undefined)
  const { matrix, answered, total } = buildMatrix(n, j)

  if (matrix !== null) {
    const { weights, lambdaMax, ci, cr } = solveMatrix(matrix, params)
    const threshold = n >= 3 ? AHP_CR_THRESHOLD : null
    const inconsistent = threshold !== null && cr >= threshold
    const worstPair = ahpWorstPair(matrix, weights)
    return {
      answered,
      total,
      weights,
      provisional: false,
      lambdaMax,
      ci,
      cr,
      threshold,
      thresholdApproximate: n > 15,
      inconsistent,
      worstPair,
    }
  }

  return {
    answered,
    total,
    weights: ahpIncompleteLlsm(n, j?.pairs),
    provisional: true,
    lambdaMax: null,
    ci: null,
    cr: null,
    threshold: null,
    thresholdApproximate: n > 15,
    inconsistent: false,
    worstPair: null,
  }
}

/**
 * Analytic Hierarchy Process (Saaty 1980, 2008): criterion weights from all n(n - 1) / 2 pairwise comparisons on the
 * 1-9 scale, extracted via the principal right eigenvector (default) or the row geometric mean (Crawford & Williams 1985).
 */
export const ahp: WeightingMethod<AhpParams> = {
  id: 'ahp',
  kind: 'weighting',
  reads: 'judgements',
  params: [
    {
      key: 'aggregation',
      kind: 'choice',
      options: ['eigenvector', 'geometric'] as const,
      default: 'eigenvector',
    },
  ],
  compute(problem: Problem, params?: AhpParams, judgements?: Judgements): WeightingResult {
    const n = problem.criteria.length
    if (n < 2) throw new ProblemValidationError([{ code: 'too-few-criteria', severity: 'error' }])
    const { matrix, answered, total } = buildMatrix(n, judgements)
    if (matrix === null || answered !== total) {
      throw new ProblemValidationError([{ code: 'judgements-incomplete', severity: 'error', value: answered }])
    }

    const { weights, lambdaMax, ci, cr } = solveMatrix(matrix, params)
    const warnings: MethodWarning[] = []
    if (n >= 3 && cr >= AHP_CR_THRESHOLD) warnings.push({ code: 'ahp.inconsistent' })
    if (n >= 8) warnings.push({ code: 'ahp.many-criteria' })

    const steps: Step[] = [
      { key: 'ahp.pairwiseMatrix', matrix, axes: ['criteria', 'criteria'] },
      { key: 'ahp.lambdaMax', scalar: lambdaMax },
      { key: 'ahp.consistencyIndex', scalar: ci },
      { key: 'ahp.consistencyRatio', scalar: cr },
      { key: 'ahp.weights', vector: weights, axes: 'criteria' },
    ]

    return {
      weights,
      steps,
      ...(warnings.length > 0 && { warnings }),
      diagnostics: { lambdaMax, ci, cr },
    }
  },
}

/** Maximum alternative count where pairwise alternative comparisons are active in AHP ranking. */
export const AHP_MAX_PAIRWISE_ALTERNATIVES = 7

/** Checks completeness of pairwise alternative comparison matrices when m <= 7. */
export function validateAlternativeJudgements(
  m: number,
  n: number,
  judgements: AlternativeJudgements | undefined,
): ValidationIssue[] {
  if (m < 2 || m > AHP_MAX_PAIRWISE_ALTERNATIVES || !judgements) return []
  const total = (m * (m - 1)) / 2
  for (let j = 0; j < n; j++) {
    const rawMat = judgements[j]
    if (!rawMat) continue
    let answered = 0
    let firstMissingI: number | undefined
    for (let i = 0; i < m; i++) {
      for (let k = i + 1; k < m; k++) {
        const v = Array.isArray(rawMat[i]) ? toScale(rawMat[i]![k]) : null
        if (v !== null) {
          answered++
        } else if (firstMissingI === undefined) {
          firstMissingI = i
        }
      }
    }
    if (rawMat.length !== m || answered !== total) {
      return [
        {
          code: 'judgements-incomplete',
          severity: 'error',
          col: j,
          ...(firstMissingI !== undefined ? { row: firstMissingI } : {}),
          value: answered,
        },
      ]
    }
  }
  return []
}

/**
 * Analytic Hierarchy Process as a ranking method (Saaty 1980, 2008):
 * For each criterion j, local priorities p_ij come either from an m × m pairwise comparison matrix A_j
 * (when m <= 7 and judgements[j] is non-null) or from column-sum normalization of the decision matrix
 * (benefit x_ij / Σ_i x_ij, cost (1 / x_ij) / Σ_i (1 / x_ij)).
 * Global priorities are S_i = Σ_j w_j p_ij, ranked descending.
 */
export const ahpRanking: RankingMethod<AhpParams> = {
  id: 'ahp-ranking',
  kind: 'ranking',
  params: ahp.params!,
  compute(
    problem: Problem,
    weights: number[],
    params: AhpParams = {},
    judgements?: AlternativeJudgements,
  ): RankingResult {
    const aggregation = params?.aggregation ?? 'eigenvector'
    if (aggregation !== 'eigenvector' && aggregation !== 'geometric') {
      throw new RangeError(`unknown AHP aggregation ${String(aggregation)}`)
    }
    const m = problem.alternatives.length
    const n = problem.criteria.length
    const issues = validateProblem(problem)
    const cells: ValidationIssue[] = []
    if (!hasErrors(issues)) {
      problem.matrix.forEach((row, i) =>
        row.forEach((v, j) => {
          const isPairwise = m <= AHP_MAX_PAIRWISE_ALTERNATIVES && judgements?.[j] != null
          if (!isPairwise && typeof v === 'number' && Number.isFinite(v) && v <= 0) {
            cells.push({ code: 'non-positive-value', severity: 'error', row: i, col: j, value: v })
          }
        }),
      )
    }
    const jIssues = hasErrors(issues) ? [] : validateAlternativeJudgements(m, n, judgements)
    assertValid([...issues, ...cells, ...validateWeights(weights, n), ...jIssues])

    const local = zeros(m, n)
    const crPerCriterion = new Array<number>(n).fill(0)
    const pairwiseCriteria: number[] = []
    const warnings: MethodWarning[] = []
    if (m > AHP_MAX_PAIRWISE_ALTERNATIVES && judgements?.some((mat) => mat != null)) {
      warnings.push({ code: 'ahp-ranking.pairwise-ignored-above-cap' })
    }

    for (let j = 0; j < n; j++) {
      const rawMat = m <= AHP_MAX_PAIRWISE_ALTERNATIVES ? judgements?.[j] : null
      if (rawMat) {
        pairwiseCriteria.push(j)
        const A: number[][] = Array.from({ length: m }, (_, i) =>
          Array.from({ length: m }, (_, k) => (i === k ? 1 : 0)),
        )
        for (let i = 0; i < m; i++) {
          for (let k = i + 1; k < m; k++) {
            const v = toScale(rawMat[i]![k])!
            A[i]![k] = v
            A[k]![i] = 1 / v
          }
        }
        const { weights: pj, cr } = solveMatrix(A, params)
        crPerCriterion[j] = cr
        for (let i = 0; i < m; i++) local[i]![j] = pj[i]!
        if (m >= 3 && (weights[j] ?? 0) > 0 && cr >= AHP_CR_THRESHOLD) {
          const worst = ahpWorstPair(A, pj)
          warnings.push({
            code: 'ahp.inconsistent',
            col: j,
            ...(worst
              ? {
                  extra: {
                    cr,
                    threshold: AHP_CR_THRESHOLD,
                    i: worst.i,
                    k: worst.k,
                    actual: worst.actual,
                    suggested: worst.suggested,
                  },
                }
              : {}),
          })
        }
      } else {
        const colNorm = sawSumNormalize({
          alternatives: problem.alternatives,
          criteria: [problem.criteria[j]!],
          matrix: problem.matrix.map((row) => [row[j]!]),
        })
        for (let i = 0; i < m; i++) local[i]![j] = colNorm[i]![0]!
      }
    }

    const weighted = local.map((row) => row.map((pij, j) => weights[j]! * pij))
    const scores = weighted.map((row) => sum(row))

    const steps: Step[] = [
      { key: 'ahpRanking.local', matrix: local, axes: ['alternatives', 'criteria'] },
      ...(pairwiseCriteria.length > 0
        ? [{ key: 'ahpRanking.consistency', vector: crPerCriterion, axes: 'criteria' as const }]
        : []),
      { key: 'ahpRanking.weighted', matrix: weighted, axes: ['alternatives', 'criteria'] },
      { key: 'ahpRanking.scores', vector: scores, axes: 'alternatives' },
    ]

    return {
      scores,
      order: 'desc',
      ranking: rankScores(scores, 'desc'),
      steps,
      warnings,
    }
  },
}
