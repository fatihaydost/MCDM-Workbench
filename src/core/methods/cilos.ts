import { column, isConstant, isNearConstant, minOf, sum, zeros } from '../math'
import type { MethodWarning, Problem, WeightingMethod, WeightingResult } from '../types'
import { assertValid, validateProblem, type ValidationIssue } from '../validate'

const PIVOT_TOL = 1e-12

/**
 * Solves the homogeneous CILOS system F q = 0 with Σ_j q_j = 1 on an active k × k system matrix F (k >= 2).
 * Since every column of F sums to 0, the last row of F is minus the sum of the first k - 1 rows, so replacing
 * row k - 1 with all ones yields an equivalent k × k square system. Returns null when F is zero or rank-deficient.
 */
function solveCilosSystem(fActive: readonly (readonly number[])[]): number[] | null {
  const k = fActive.length
  let maxAbs = 0
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const v = Math.abs(fActive[i]![j]!)
      if (v > maxAbs) maxAbs = v
    }
  }
  if (maxAbs <= PIVOT_TOL) return null

  const a = fActive.map((row) => [...row])
  a[k - 1] = new Array<number>(k).fill(1)
  const b = new Array<number>(k).fill(0)
  b[k - 1] = 1

  for (let col = 0; col < k; col++) {
    let pivotRow = col
    let best = Math.abs(a[col]![col]!)
    for (let row = col + 1; row < k; row++) {
      const cand = Math.abs(a[row]![col]!)
      if (cand > best) {
        best = cand
        pivotRow = row
      }
    }
    if (best <= PIVOT_TOL) return null
    if (pivotRow !== col) {
      const tmpRow = a[col]!
      a[col] = a[pivotRow]!
      a[pivotRow] = tmpRow
      const tmpB = b[col]!
      b[col] = b[pivotRow]!
      b[pivotRow] = tmpB
    }
    const pivot = a[col]![col]!
    for (let row = col + 1; row < k; row++) {
      const factor = a[row]![col]! / pivot
      if (factor === 0) continue
      for (let c = col; c < k; c++) a[row]![c]! -= factor * a[col]![c]!
      b[row]! -= factor * b[col]!
    }
  }

  const q = new Array<number>(k).fill(0)
  for (let row = k - 1; row >= 0; row--) {
    let acc = b[row]!
    for (let c = row + 1; c < k; c++) acc -= a[row]![c]! * q[c]!
    q[row] = acc / a[row]![row]!
  }

  if (!q.every((v) => Number.isFinite(v) && v >= -1e-9)) return null
  const clamped = q.map((v) => Math.max(0, v))
  const total = sum(clamped)
  return total > PIVOT_TOL ? clamped.map((v) => v / total) : null
}

/**
 * CILOS — Criterion Impact LOSs (Mirkin 1974; Zavadskas & Podvezko 2016; Zavadskas et al. 2017, Sec. 5.1.2, Eqs. 5-8):
 * 1. Cost criteria inverted to benefit: x̃_ij = min_r x_rj / x_ij (cost), x̃_ij = x_ij (benefit).
 * 2. Sum normalization: x̄_ij = x̃_ij / Σ_r x̃_rj.
 * 3. Square matrix A (n × n): row i is row k_i of X̄ where k_i = argmax_r x̄_ri (first occurrence on ties), so a_ii = max_r x̄_ri.
 * 4. Relative impact-loss matrix P (n × n): p_ij = (a_jj - a_ij) / a_jj, p_ii = 0.
 * 5. System matrix F (n × n): f_ij = p_ij (i ≠ j), f_jj = -Σ_{i ≠ j} p_ij.
 * 6. Solve F q = 0 with Σ_j q_j = 1; weights w_j = q_j.
 *
 * Requires strictly positive values x_ij > 0. Constant columns get x̄_ij = 1/m, zero row and column in P and F,
 * and weight 0 (warning), with the linear system solved on the varying criteria so adding a constant column
 * leaves the remaining weights unchanged. When all active criteria share the same optimal alternative (P = 0, F = 0)
 * or the reduced system is rank-deficient, active criteria share the weight equally (1 / n_active).
 * See docs/research/methods/cilos.md.
 */
export const cilos: WeightingMethod = {
  id: 'cilos',
  kind: 'weighting',
  compute(problem: Problem): WeightingResult {
    const own: ValidationIssue[] = []
    problem.matrix.forEach((row, i) => {
      if (!Array.isArray(row)) return
      row.forEach((v, j) => {
        if (typeof v === 'number' && Number.isFinite(v) && v <= 0) {
          own.push({ code: 'non-positive-value', severity: 'error', row: i, col: j, value: v })
        }
      })
    })
    assertValid([...validateProblem(problem), ...own])

    const { matrix, criteria } = problem
    const m = matrix.length
    const n = criteria.length
    const warnings: MethodWarning[] = []
    const cols = Array.from({ length: n }, (_, j) => column(matrix, j))
    const constant = cols.map((c) => isConstant(c))

    constant.forEach((c, j) => c && warnings.push({ code: 'cilos.constant-column', col: j }))
    cols.forEach((c, j) => isNearConstant(c) && warnings.push({ code: 'cilos.near-constant-column', col: j }))

    // 1-2. Cost inversion (min / x) and column-sum normalization: x̄_ij = x̃_ij / Σ_r x̃_rj.
    const normalized = zeros(m, n)
    for (let j = 0; j < n; j++) {
      if (constant[j]) {
        for (let i = 0; i < m; i++) normalized[i]![j] = 1 / m
        continue
      }
      const col = cols[j]!
      const isCost = criteria[j]!.type === 'cost'
      const lo = isCost ? minOf(col) : 0
      const oriented = isCost ? col.map((v) => lo / v) : col
      const total = sum(oriented)
      for (let i = 0; i < m; i++) normalized[i]![j] = oriented[i]! / total
    }

    // 3. Square matrix A (n × n): row i is row k_i of X̄ where k_i = argmax_r x̄_ri (first occurrence on ties).
    const winners = new Array<number>(n).fill(0)
    for (let i = 0; i < n; i++) {
      if (constant[i]) continue
      let best = 0
      for (let r = 1; r < m; r++) {
        if (normalized[r]![i]! > normalized[best]![i]!) best = r
      }
      winners[i] = best
    }
    const squareMatrix = Array.from({ length: n }, (_, i) => [...normalized[winners[i]!]!])

    // 4. Relative impact-loss matrix P (n × n): p_ij = (a_jj - a_ij) / a_jj on active criteria; 0 on constant rows/cols.
    const lossMatrix = zeros(n, n)
    for (let i = 0; i < n; i++) {
      if (constant[i]) continue
      for (let j = 0; j < n; j++) {
        if (i === j || constant[j]) continue
        const ajj = squareMatrix[j]![j]!
        lossMatrix[i]![j] = ajj > 0 ? Math.max(0, (ajj - squareMatrix[i]![j]!) / ajj) : 0
      }
    }

    // 5. System matrix F (n × n): f_ij = p_ij (i ≠ j), f_jj = -Σ_{i ≠ j} p_ij.
    const systemMatrix = lossMatrix.map((row) => [...row])
    for (let j = 0; j < n; j++) {
      let colLoss = 0
      for (let i = 0; i < n; i++) {
        if (i !== j) colLoss += lossMatrix[i]![j]!
      }
      systemMatrix[j]![j] = colLoss === 0 ? 0 : -colLoss
    }

    // 6. Solve F q = 0, Σ_j q_j = 1 on the active (non-constant) criteria.
    const active = Array.from({ length: n }, (_, j) => j).filter((j) => !constant[j])
    const allConstant = active.length === 0
    const activeWinners = active.map((j) => winners[j]!)
    const sharedOptimum = active.length >= 2 && new Set(activeWinners).size < active.length
    if (sharedOptimum) warnings.push({ code: 'cilos.shared-optimum' })

    let zeroLoss = false
    let weights: number[]
    if (allConstant) {
      warnings.push({ code: 'cilos.all-constant-equal-weights' })
      weights = new Array<number>(n).fill(1 / n)
    } else if (active.length === 1) {
      weights = constant.map((c) => (c ? 0 : 1))
    } else {
      const fActive = active.map((i) => active.map((j) => systemMatrix[i]![j]!))
      const solved = solveCilosSystem(fActive)
      if (solved === null) {
        zeroLoss = true
        warnings.push({ code: 'cilos.zero-loss-equal-weights' })
        weights = constant.map((c) => (c ? 0 : 1 / active.length))
      } else {
        weights = new Array<number>(n).fill(0)
        active.forEach((colIdx, k) => {
          weights[colIdx] = solved[k]!
        })
      }
    }

    return {
      weights,
      steps: [
        { key: 'cilos.normalized', matrix: normalized, axes: ['alternatives', 'criteria'] },
        { key: 'cilos.squareMatrix', matrix: squareMatrix, axes: ['criteria', 'criteria'] },
        { key: 'cilos.lossMatrix', matrix: lossMatrix, axes: ['criteria', 'criteria'] },
        { key: 'cilos.systemMatrix', matrix: systemMatrix, axes: ['criteria', 'criteria'] },
        { key: 'cilos.weights', vector: weights, axes: 'criteria' },
      ],
      diagnostics: {
        constantColumns: constant.filter(Boolean).length,
        allConstant: allConstant ? 1 : 0,
        sharedOptimum: sharedOptimum ? 1 : 0,
        zeroLoss: zeroLoss ? 1 : 0,
      },
      warnings,
    }
  },
}
