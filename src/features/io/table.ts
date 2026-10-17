import type { Axis, Step } from '../../core'

export type { Axis }

/** `lambda`: labels of the λ grid; defaults to 'λ = 0', 'λ = 0.1', ... (the UI passes localized ones). */
export type StepLabels = { alternatives: readonly string[]; criteria: readonly string[]; lambda?: readonly string[] }

const LAMBDA_LABELS = Array.from({ length: 11 }, (_, k) => `λ = ${k / 10}`)
const axisLabels = (labels: StepLabels, axis: Axis): string[] =>
  [...(axis === 'lambda' ? (labels.lambda ?? LAMBDA_LABELS) : labels[axis])]

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
}

export type StepTableOptions = {
  /** Label of the single row / column of a vector, or of a scalar. Defaults to the step key. */
  valueLabel?: string
}

/** Lays out one step with the problem's row and column labels, along the axes the step carries. */
export function stepToTable(step: Step, labels: StepLabels, opts: StepTableOptions = {}): StepTable {
  const valueLabel = opts.valueLabel ?? step.key

  if (step.matrix) {
    const [rowAxis, colAxis] = step.axes
    return {
      key: step.key,
      kind: 'matrix',
      rowAxis,
      colAxis,
      rowLabels: axisLabels(labels, rowAxis),
      colLabels: axisLabels(labels, colAxis),
      values: step.matrix.map((row) => [...row]),
    }
  }

  if (step.vector) {
    const v = [...step.vector]
    if (step.axes === 'alternatives') {
      return {
        key: step.key,
        kind: 'vector',
        rowAxis: 'alternatives',
        colAxis: null,
        rowLabels: [...labels.alternatives],
        colLabels: [valueLabel],
        values: v.map((x) => [x]),
      }
    }
    return {
      key: step.key,
      kind: 'vector',
      rowAxis: null,
      colAxis: 'criteria',
      rowLabels: [valueLabel],
      colLabels: [...labels.criteria],
      values: [v],
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
