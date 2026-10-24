import { nearestScale, toScale } from '../judgements'
import type { Judgements, MethodWarning, Problem, Ratio, Step, WeightingMethod, WeightingResult } from '../types'
import { ProblemValidationError } from '../validate'

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
  return { weights, lambdaMax: rayleighLambdaMax(A, weights) }
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
 * Incomplete Logarithmic Least Squares (Bozóki, Fülöp & Rónyai 2010): solves L y = r on each connected component of
 * answered comparisons and normalizes exp(y) across the answered criteria. Criteria with no answers get NaN.
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
  for (let start = 0; start < n; start++) {
    if (visited[start] || adj[start]!.length === 0) continue
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
  let bestI = -1
  let bestK = -1
  let bestEps = 1
  for (let i = 0; i < n; i++)
    for (let k = i + 1; k < n; k++) {
      const actual = A[i]![k]!
      const ratio = weights[i]! / weights[k]!
      const eps = Math.max(actual / ratio, ratio / actual)
      if (eps > bestEps + 1e-12) {
        bestEps = eps
        bestI = i
        bestK = k
      }
    }
  if (bestI < 0 || bestEps <= 1 + 1e-9) return null
  return {
    i: bestI,
    k: bestK,
    epsilon: bestEps,
    actual: A[bestI]![bestK]!,
    suggested: nearestScale(weights[bestI]! / weights[bestK]!),
  }
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
