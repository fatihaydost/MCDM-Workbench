import type { TFunction } from 'i18next'
import type { Criterion, MethodParamValue, ParamDescriptor, Step, ValidationIssue } from '../../core'
import { changedParams, getRankingMethod, getWeightingMethod, MIN_ALTERNATIVES, MIN_CRITERIA } from '../../core'
import type { DraftProblem, Stage, WeightMethodId } from '../../state/workbench'

/** Fixed decimals per kind of number (DESIGN.md §Type): weights and scores 4, correlation cells 2. */
export const DECIMALS = { weight: 4, score: 4, step: 4, correlation: 2 } as const

/** Stable DOM ids that error summaries and "fix" links focus. */
export const ids = {
  cell: (i: number, j: number) => `wb-cell-${i}-${j}`,
  alternative: (i: number) => `wb-alt-${i}`,
  criterion: (j: number) => `wb-crit-${j}`,
  type: (j: number) => `wb-type-${j}`,
  corner: 'wb-corner',
  addAlternative: 'wb-add-alternative',
  addCriterion: 'wb-add-criterion',
  weight: (j: number) => `wb-weight-${j}`,
  normalize: 'wb-normalize',
  weightMethod: 'wb-weight-method',
} as const

/**
 * i18next with a key built at runtime (warning codes, step keys). The typed `t` only accepts
 * literal keys; these keys are checked by tests/i18n.test.ts instead.
 */
export function tr(t: TFunction, key: string, opts?: Record<string, unknown>): string {
  return (t as unknown as (k: string, o?: Record<string, unknown>) => string)(key, opts)
}

export const alternativeName = (problem: DraftProblem, i: number, t: TFunction): string =>
  problem.alternatives[i]?.trim() || t('workbench.alternativeN', { n: i + 1 })

export const criterionName = (criteria: readonly Criterion[], j: number, t: TFunction): string =>
  criteria[j]?.name.trim() || t('workbench.criterionN', { n: j + 1 })

export const weightMethodLabel = (m: WeightMethodId, t: TFunction): string => t(`workbench.weightMethod.${m}`)

/** Label of a method option ("Normalization") and of one of its choices ("Min-max"), from workbench.params. */
export const paramLabel = (methodId: string, d: ParamDescriptor, t: TFunction): string => tr(t, `workbench.params.${methodId}.${d.key}`)
export const paramOptionLabel = (methodId: string, d: ParamDescriptor, option: string, t: TFunction): string =>
  tr(t, `workbench.params.${methodId}.${d.key}Options.${option}`)

/**
 * The variant a method ran with, when it is not the default: "min-max" for Entropy with min-max normalization, "" for
 * the defaults. A number option reads "label value".
 */
export function variantLabel(methodId: string, raw: Readonly<Record<string, MethodParamValue>> | undefined, t: TFunction): string {
  const method = getWeightingMethod(methodId) ?? getRankingMethod(methodId)
  return changedParams(method?.params, raw)
    .map(([d, v]) => (d.kind === 'choice' ? tr(t, `workbench.params.${methodId}.${d.key}Variant.${String(v)}`) : `${paramLabel(methodId, d, t)} ${String(v)}`))
    .join(', ')
}

/** The weighting method's name with its variant where the method is named as provenance: "Entropy (min-max)". */
export function weightMethodFullLabel(m: WeightMethodId, raw: Readonly<Record<string, MethodParamValue>> | undefined, t: TFunction): string {
  const variant = variantLabel(m, raw, t)
  return variant ? `${weightMethodLabel(m, t)} (${variant})` : weightMethodLabel(m, t)
}

/** Short name of a step ("Contrast σ"), used as block title, xlsx column header and row label. */
export const stepName = (key: string, t: TFunction): string => tr(t, `workbench.stepNames.${key}`)

/** Weight sums print with 3 decimals ("0.950"), more only when 3 would round to exactly 1. */
export function sumDecimals(sum: number): number {
  for (let d = 3; d <= 6; d++) if (Math.abs(Number(sum.toFixed(d)) - 1) > 0 || Math.abs(sum - 1) < 1e-12) return d
  return 6
}

/** One problem, placed: the stage that fixes it, the control to focus and the message. */
export type PlacedIssue = { stage: Stage; targetId: string; message: string; code: ValidationIssue['code'] }

/**
 * Where a validation issue is fixed and what it says. Messages come from validation.codes with
 * names and locale-formatted numbers filled in.
 */
export function placeIssue(
  issue: ValidationIssue,
  problem: DraftProblem,
  t: TFunction,
  format: (v: number, d?: number) => string,
): PlacedIssue {
  const { row, col } = issue
  const alternative = row !== undefined ? alternativeName(problem, row, t) : ''
  const criterion = col !== undefined ? criterionName(problem.criteria, col, t) : ''
  const vars = {
    alternative,
    criterion,
    n: problem.criteria.length,
    min: issue.code === 'too-few-alternatives' ? MIN_ALTERNATIVES : MIN_CRITERIA,
    value: issue.value === undefined ? '' : issue.code === 'weights-sum' ? format(issue.value, sumDecimals(issue.value)) : format(issue.value, Number.isInteger(issue.value) ? 0 : 4),
  }
  const message = tr(t, `validation.codes.${issue.code}`, vars)
  const base = { message, code: issue.code }
  switch (issue.code) {
    case 'too-few-alternatives':
      return { ...base, stage: 'data', targetId: ids.addAlternative }
    case 'too-few-criteria':
      return { ...base, stage: 'data', targetId: ids.addCriterion }
    case 'invalid-cell':
    case 'non-positive-value':
    case 'negative-value':
      return { ...base, stage: 'data', targetId: row !== undefined && col !== undefined ? ids.cell(row, col) : ids.corner }
    case 'invalid-criterion-type':
      return { ...base, stage: 'data', targetId: col !== undefined ? ids.type(col) : ids.corner }
    case 'constant-column':
      return { ...base, stage: 'data', targetId: col !== undefined ? ids.criterion(col) : ids.corner }
    case 'row-length-mismatch':
      return { ...base, stage: 'data', targetId: row !== undefined ? ids.alternative(row) : ids.corner }
    case 'alternatives-count-mismatch':
      return { ...base, stage: 'data', targetId: ids.corner }
    case 'invalid-weight':
    case 'negative-weight':
      return { ...base, stage: 'weights', targetId: col !== undefined ? ids.weight(col) : ids.weightMethod }
    case 'weights-sum':
      return {
        ...base,
        message: t('workbench.weights.sumError', { value: vars.value }),
        stage: 'weights',
        targetId: ids.normalize,
      }
    case 'weights-length-mismatch':
      return { ...base, stage: 'weights', targetId: ids.weightMethod }
  }
}

/** Row labels of step tables: the problem's names, with fallbacks for empty ones. */
export function stepAxisLabels(problem: DraftProblem, t: TFunction) {
  return {
    alternatives: problem.alternatives.map((_, i) => alternativeName(problem, i, t)),
    criteria: problem.criteria.map((_, j) => criterionName(problem.criteria, j, t)),
  }
}

export const findStep = (steps: readonly Step[], key: string): Step | undefined => steps.find((s) => s.key === key)

/** Saves a Blob as a file through a temporary link. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
