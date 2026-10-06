import type { Step } from '../../core'

/** What a table dimension runs over. */
export type Axis = 'alternatives' | 'criteria'

export type StepLabels = { alternatives: readonly string[]; criteria: readonly string[] }

/**
 * A step laid out as a labelled table. Criterion vectors are one row (they line up with the
 * matrix columns), alternative vectors are one column, a scalar is a single labelled cell.
 */
export type StepTable = {
  key: string
  kind: 'matrix' | 'vector' | 'scalar'
  /** null when the dimension is not an axis (the single row of a criterion vector, a scalar). */
  rowAxis: Axis | null
  colAxis: Axis | null
  rowLabels: string[]
  /** null means the table has no header row (a scalar). */
  colLabels: string[] | null
  values: number[][]
  /** True when the axis could not be told apart (m = n) and neither a hint nor the key decided it. */
  ambiguous: boolean
}

export type StepTableOptions = {
  /** Axis override for a vector, or for the rows of a matrix. */
  rows?: Axis
  /** Axis override for the columns of a matrix. */
  cols?: Axis
  /** Label of the single row / column of a vector, or of a scalar. Defaults to the step key. */
  valueLabel?: string
}

/**
 * Axes of the known step keys, used when the lengths alone cannot decide (m = n).
 * Vectors: one axis. Matrices: [rows, cols].
 */
export const KNOWN_STEP_AXES: Readonly<Record<string, Axis | readonly [Axis, Axis]>> = {
  'critic.normalized': ['alternatives', 'criteria'],
  'critic.sigma': 'criteria',
  'critic.correlation': ['criteria', 'criteria'],
  'critic.conflict': 'criteria',
  'critic.information': 'criteria',
  'critic.weights': 'criteria',
  'entropy.normalized': ['alternatives', 'criteria'],
  'entropy.proportionsSum': ['alternatives', 'criteria'],
  'entropy.proportionsMinmax': ['alternatives', 'criteria'],
  'entropy.entropy': 'criteria',
  'entropy.diversification': 'criteria',
  'entropy.weights': 'criteria',
  'topsis.normalized': ['alternatives', 'criteria'],
  'topsis.weighted': ['alternatives', 'criteria'],
  'topsis.idealBest': 'criteria',
  'topsis.idealWorst': 'criteria',
  'topsis.distanceBest': 'alternatives',
  'topsis.distanceWorst': 'alternatives',
  'topsis.closeness': 'alternatives',
  'saw.normalizedLinearMax': ['alternatives', 'criteria'],
  'saw.normalizedSum': ['alternatives', 'criteria'],
  'saw.weighted': ['alternatives', 'criteria'],
  'saw.scores': 'alternatives',
}

const indexLabels = (k: number): string[] => Array.from({ length: k }, (_, i) => String(i + 1))

function axisFor(
  length: number,
  labels: StepLabels,
  hint: Axis | undefined,
): { axis: Axis | null; ambiguous: boolean } {
  const m = labels.alternatives.length
  const n = labels.criteria.length
  const fitsAlt = length === m
  const fitsCrit = length === n
  if (hint && ((hint === 'alternatives' && fitsAlt) || (hint === 'criteria' && fitsCrit))) {
    return { axis: hint, ambiguous: false }
  }
  if (fitsAlt && !fitsCrit) return { axis: 'alternatives', ambiguous: false }
  if (fitsCrit && !fitsAlt) return { axis: 'criteria', ambiguous: false }
  if (fitsAlt && fitsCrit) return { axis: 'criteria', ambiguous: true }
  return { axis: null, ambiguous: false }
}

const labelsOf = (axis: Axis | null, labels: StepLabels, length: number): string[] =>
  axis === null ? indexLabels(length) : [...labels[axis]]

/** Lays out one step with the problem's row and column labels. */
export function stepToTable(step: Step, labels: StepLabels, opts: StepTableOptions = {}): StepTable {
  const known = KNOWN_STEP_AXES[step.key]
  const valueLabel = opts.valueLabel ?? step.key

  if (step.matrix) {
    const values = step.matrix.map((row) => [...row])
    const rows = values.length
    const cols = values[0]?.length ?? 0
    const knownPair = Array.isArray(known) ? (known as readonly [Axis, Axis]) : undefined
    const r = axisFor(rows, labels, opts.rows ?? knownPair?.[0])
    const c = axisFor(cols, labels, opts.cols ?? knownPair?.[1])
    return {
      key: step.key,
      kind: 'matrix',
      rowAxis: r.axis,
      colAxis: c.axis,
      rowLabels: labelsOf(r.axis, labels, rows),
      colLabels: labelsOf(c.axis, labels, cols),
      values,
      ambiguous: r.ambiguous || c.ambiguous,
    }
  }

  if (step.vector) {
    const v = [...step.vector]
    const knownAxis = typeof known === 'string' ? (known as Axis) : undefined
    const { axis, ambiguous } = axisFor(v.length, labels, opts.rows ?? knownAxis)
    if (axis === 'alternatives') {
      return {
        key: step.key,
        kind: 'vector',
        rowAxis: 'alternatives',
        colAxis: null,
        rowLabels: [...labels.alternatives],
        colLabels: [valueLabel],
        values: v.map((x) => [x]),
        ambiguous,
      }
    }
    return {
      key: step.key,
      kind: 'vector',
      rowAxis: null,
      colAxis: axis,
      rowLabels: [valueLabel],
      colLabels: labelsOf(axis, labels, v.length),
      values: [v],
      ambiguous,
    }
  }

  return {
    key: step.key,
    kind: 'scalar',
    rowAxis: null,
    colAxis: null,
    rowLabels: [valueLabel],
    colLabels: null,
    values: [[step.scalar ?? NaN]],
    ambiguous: false,
  }
}

export type Cell = string | number | null

/**
 * The table as a 2D cell array: a header row (corner + column labels) unless the table has none,
 * then one row per label. Numbers stay numbers; non-finite values become null.
 */
export function tableToCells(table: StepTable, corner = ''): Cell[][] {
  const body: Cell[][] = table.values.map((row, i) => [
    table.rowLabels[i] ?? '',
    ...row.map((x) => (Number.isFinite(x) ? x : null)),
  ])
  return table.colLabels === null ? body : [[corner, ...table.colLabels], ...body]
}
