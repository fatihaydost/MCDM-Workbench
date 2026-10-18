import { isConstant } from './math'
import type { Problem, RankingMethod } from './types'

export type ValidationCode =
  | 'too-few-alternatives'
  | 'too-few-criteria'
  | 'alternatives-count-mismatch'
  | 'row-length-mismatch'
  | 'invalid-cell'
  | 'value-out-of-range'
  | 'invalid-criterion-type'
  | 'constant-column'
  | 'non-positive-value'
  | 'negative-value'
  | 'non-positive-average'
  | 'all-worst-alternative'
  | 'weights-length-mismatch'
  | 'invalid-weight'
  | 'negative-weight'
  | 'weights-sum'

export type ValidationIssue = {
  code: ValidationCode
  /** 'error' blocks computation; 'warning' is shown but the methods still run. */
  severity: 'error' | 'warning'
  row?: number
  col?: number
  /** Offending number where one exists (row length, weight sum, ...). */
  value?: number
}

export const MIN_ALTERNATIVES = 2
export const MIN_CRITERIA = 2
/** Allowed |sum(weights) - 1|. */
export const WEIGHT_SUM_TOLERANCE = 1e-6

/**
 * Magnitudes the methods compute with safely: a value above 1e100 (or a non-zero one below 1e-100) can overflow or
 * underflow inside a method (TOPSIS squares the values, SAW and Entropy add a column up, SAW inverts cost values), which
 * would silently zero a column. Such a cell is a blocking 'value-out-of-range' error instead; rescaling the criterion
 * (a unit change) brings it back in range.
 */
export const MAX_MAGNITUDE = 1e100
export const MIN_MAGNITUDE = 1e-100

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * Structural and numeric checks on a problem. Never throws; returns every issue found.
 * Empty cells are expected to arrive as NaN (or null/undefined from untyped input) and are
 * reported with their position instead of being read as 0.
 */
export function validateProblem(problem: Problem): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { alternatives, criteria, matrix } = problem
  const m = matrix.length
  const n = criteria.length

  if (m < MIN_ALTERNATIVES) issues.push({ code: 'too-few-alternatives', severity: 'error', value: m })
  if (n < MIN_CRITERIA) issues.push({ code: 'too-few-criteria', severity: 'error', value: n })
  if (alternatives.length !== m) {
    issues.push({ code: 'alternatives-count-mismatch', severity: 'error', value: alternatives.length })
  }

  criteria.forEach((c, j) => {
    // Runtime guard for untyped input: only the exact lowercase literals are accepted.
    const t: unknown = c.type
    if (t !== 'benefit' && t !== 'cost') issues.push({ code: 'invalid-criterion-type', severity: 'error', col: j })
  })

  let shapeOk = true
  matrix.forEach((row, i) => {
    if (!Array.isArray(row) || row.length !== n) {
      shapeOk = false
      issues.push({ code: 'row-length-mismatch', severity: 'error', row: i, value: Array.isArray(row) ? row.length : 0 })
      return
    }
    row.forEach((v, j) => {
      if (!isFiniteNumber(v)) issues.push({ code: 'invalid-cell', severity: 'error', row: i, col: j })
      else if (v !== 0 && (Math.abs(v) > MAX_MAGNITUDE || Math.abs(v) < MIN_MAGNITUDE)) {
        issues.push({ code: 'value-out-of-range', severity: 'error', row: i, col: j, value: v })
      }
    })
  })

  if (shapeOk && m >= MIN_ALTERNATIVES) {
    for (let j = 0; j < n; j++) {
      const col = matrix.map((row) => row[j])
      if (!col.every(isFiniteNumber)) continue
      if (isConstant(col)) issues.push({ code: 'constant-column', severity: 'warning', col: j })
    }
  }

  return issues
}

/** Checks a weight vector against n criteria: length, finite, non-negative, sums to 1. */
export function validateWeights(weights: number[], n: number): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (weights.length !== n) {
    issues.push({ code: 'weights-length-mismatch', severity: 'error', value: weights.length })
  }
  let finite = true
  weights.forEach((w, j) => {
    if (!isFiniteNumber(w)) {
      finite = false
      issues.push({ code: 'invalid-weight', severity: 'error', col: j })
    } else if (w < 0) {
      issues.push({ code: 'negative-weight', severity: 'error', col: j, value: w })
    }
  })
  if (finite) {
    const sum = weights.reduce((a, b) => a + b, 0)
    if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) issues.push({ code: 'weights-sum', severity: 'error', value: sum })
  }
  return issues
}

/** Checks the method-specific requirements declared in `RankingMethod.requires`. */
export function validateRequirements(problem: Problem, method: Pick<RankingMethod, 'requires'>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (method.requires?.positiveValues) {
    problem.matrix.forEach((row, i) =>
      row.forEach((v, j) => {
        if (isFiniteNumber(v) && v <= 0) issues.push({ code: 'non-positive-value', severity: 'error', row: i, col: j, value: v })
      }),
    )
  }
  return issues
}

export const hasErrors = (issues: ValidationIssue[]): boolean => issues.some((x) => x.severity === 'error')

/** Thrown by `compute()` when the input has blocking issues. */
export class ProblemValidationError extends Error {
  readonly issues: ValidationIssue[]
  constructor(issues: ValidationIssue[]) {
    super(`Invalid problem: ${issues.filter((x) => x.severity === 'error').map((x) => x.code).join(', ')}`)
    this.name = 'ProblemValidationError'
    this.issues = issues
  }
}

/** Throws ProblemValidationError if any issue is an error; returns the issues otherwise (warnings only). */
export function assertValid(issues: ValidationIssue[]): ValidationIssue[] {
  if (hasErrors(issues)) throw new ProblemValidationError(issues)
  return issues
}
