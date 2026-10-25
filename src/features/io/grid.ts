import type { Criterion, CriterionType } from '../../core'
import { detectDecimal, parseNumber, type DecimalSeparator } from './numbers'

/** A raw cell from a CSV (always text) or a spreadsheet (number, text, boolean, date, empty). */
export type RawCell = string | number | boolean | Date | null | undefined

/** Imported data as typed by the user: an empty or unreadable cell is null, never 0. */
export type ImportedProblem = {
  alternatives: string[]
  criteria: Criterion[]
  matrix: (number | null)[][]
}

export type ImportIssueCode =
  /** Nothing to read. */
  | 'empty-file'
  /** No row of criterion names before the data; names were generated (C1, C2, ...). */
  | 'missing-header'
  | 'missing-criterion-name'
  | 'duplicate-criterion-name'
  /** No benefit / cost row anywhere; every criterion was set to benefit. */
  | 'missing-type-row'
  /** The type row has no value for this criterion; set to benefit. */
  | 'missing-type'
  /** The type cell is not one of benefit, cost, max, min, fayda, maliyet (...); set to benefit. */
  | 'invalid-type'
  /** Two type rows disagree for this criterion; the row closest to the header wins. */
  | 'conflicting-type'
  | 'missing-alternative-name'
  | 'duplicate-alternative-name'
  /** A data cell is empty; it stays empty (null). */
  | 'empty-cell'
  /** A data cell holds text that is not a number; it is left empty (null). */
  | 'not-a-number'
  /** A value right of the last named criterion; ignored. */
  | 'extra-cell'
  /** The data block ended here (summary row such as "min" / "max" / "toplam", or a new table header); the rest was not read. */
  | 'trailing-content-ignored'
  /** Numbers such as "1.234" could be read either way and nothing else in the file decided it. */
  | 'ambiguous-decimal'
  /** Some numbers use '.' and others ',' as the decimal separator; the majority was used. */
  | 'mixed-decimal'

/**
 * `row` / `col` are 0-based positions in the source (CSV line, sheet row and column),
 * -1 for issues about the whole file. `alt` / `crit` locate the cell in the imported problem.
 */
export type ImportIssue = {
  row: number
  col: number
  code: ImportIssueCode
  alt?: number
  crit?: number
}

export type ImportResult = {
  problem: ImportedProblem
  issues: ImportIssue[]
  /** Decimal separator used to read text numbers. */
  decimal: DecimalSeparator
}

export type GridImportOptions = {
  /** Decimal separator of text numbers; 'auto' (default) guesses it from the data. */
  decimal?: DecimalSeparator | 'auto'
  /** Used by 'auto' when no number decides it. */
  decimalFallback?: DecimalSeparator
  /** Added to the reported row / col (sheet ranges that do not start at A1). */
  origin?: { row: number; col: number }
}

type Cell = string | number | boolean | null

function normalizeCell(c: RawCell): Cell {
  if (c === null || c === undefined) return null
  if (c instanceof Date) return c.toISOString()
  if (typeof c === 'string') {
    const t = c.trim()
    return t === '' ? null : t
  }
  if (typeof c === 'number' && !Number.isFinite(c)) return String(c)
  return c
}

/** Case- and locale-insensitive key: "MALİYET", "Maliyet", "maliyet" and "↓ Cost" all match. */
export function tokenKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/̇/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/[↑↓▲▼]/g, '')
    .replace(/[.:]+$/, '')
    .trim()
}

const TYPE_TOKENS: Readonly<Record<string, CriterionType>> = {
  benefit: 'benefit',
  beneficial: 'benefit',
  max: 'benefit',
  maks: 'benefit',
  maximum: 'benefit',
  maksimum: 'benefit',
  maximize: 'benefit',
  fayda: 'benefit',
  cost: 'cost',
  'non-beneficial': 'cost',
  min: 'cost',
  minimum: 'cost',
  minimize: 'cost',
  maliyet: 'cost',
}

/** benefit | cost | max | min | fayda | maliyet (and a few spellings), case-insensitive; null otherwise. */
export function parseCriterionType(text: string): CriterionType | null {
  return TYPE_TOKENS[tokenKey(text)] ?? null
}

/** Row labels that mark a summary row under the data (exact match, so "Maxwell" is still an alternative). */
const SUMMARY_LABELS = new Set([
  'min', 'max', 'maks', 'minimum', 'maximum', 'maksimum', 'sum', 'total', 'toplam',
  'mean', 'average', 'avg', 'ortalama', 'std', 'sd', 'stdev', 'standart sapma',
])

const isText = (c: Cell): c is string => typeof c === 'string'
const isEmptyRow = (row: Cell[]): boolean => row.every((c) => c === null)
const values = (row: Cell[]): Cell[] => row.slice(1)

type Parse = (s: string) => number | null

function isTypeRow(row: Cell[]): boolean {
  const filled = values(row).filter((c) => c !== null)
  if (filled.length === 0) return false
  const tokens = filled.filter((c) => isText(c) && parseCriterionType(c) !== null).length
  return tokens > 0 && tokens * 2 >= filled.length
}

/** Every filled value cell is text that is neither a number nor a type token. */
function isHeaderLike(row: Cell[], parse: Parse, minFilled: number): boolean {
  const filled = values(row).filter((c) => c !== null)
  if (filled.length < minFilled) return false
  return filled.every((c) => isText(c) && parse(c) === null && parseCriterionType(c) === null)
}

function hasNumber(row: Cell[], parse: Parse): boolean {
  return values(row).some((c) => typeof c === 'number' || (isText(c) && parse(c) !== null))
}

/**
 * Reads a decision matrix from a grid. Expected layout: a header row of criterion names (its first
 * cell empty or a label such as "Alternative"), optional type rows directly above or below it, then
 * one row per alternative (name in the first column). Reading stops at the first fully empty row, at a
 * summary row ("min", "max", "toplam", ...) or at a new table header; the rest is reported once.
 * Empty and non-numeric cells become null with an issue, never 0.
 */
export function gridToProblem(raw: readonly (readonly RawCell[])[], opts: GridImportOptions = {}): ImportResult {
  const normalized: Cell[][] = raw.map((r) => r.map(normalizeCell))
  // A table that starts right of column A (pasted at C3): drop the empty columns in front of it.
  let skip = Infinity
  for (const r of normalized) {
    const k = r.findIndex((c) => c !== null)
    if (k >= 0) skip = Math.min(skip, k)
  }
  if (!Number.isFinite(skip)) skip = 0
  const grid = skip > 0 ? normalized.map((r) => r.slice(skip)) : normalized

  const oRow = opts.origin?.row ?? 0
  const oCol = (opts.origin?.col ?? 0) + skip
  const issues: ImportIssue[] = []
  const issue = (row: number, col: number, code: ImportIssueCode, at: { alt?: number; crit?: number } = {}) => {
    issues.push({ row: row < 0 ? -1 : row + oRow, col: col < 0 ? -1 : col + oCol, code, ...at })
  }

  // Decimal separator: from every text cell that looks numeric.
  let decimal: DecimalSeparator
  if (opts.decimal === '.' || opts.decimal === ',') {
    decimal = opts.decimal
  } else {
    const guess = detectDecimal(
      grid.flatMap((r) => values(r).filter(isText)),
      opts.decimalFallback ?? '.',
    )
    decimal = guess.decimal
    if (guess.ambiguous) issue(-1, -1, 'ambiguous-decimal')
    if (guess.conflict) issue(-1, -1, 'mixed-decimal')
  }
  const parse: Parse = (s) => parseNumber(s, decimal)

  const empty: ImportResult = { problem: { alternatives: [], criteria: [], matrix: [] }, issues, decimal }
  const first = grid.findIndex((r) => !isEmptyRow(r))
  if (first < 0) {
    issue(-1, -1, 'empty-file')
    return empty
  }

  // 1. Header: the first header-like row before any row with numbers. Type rows before it are kept.
  let header = -1
  let dataStart = -1
  const typeRowsAbove: number[] = []
  for (let i = first; i < grid.length; i++) {
    const row = grid[i]!
    if (isEmptyRow(row)) continue
    if (isTypeRow(row)) {
      typeRowsAbove.push(i)
      continue
    }
    if (hasNumber(row, parse)) {
      dataStart = i
      break
    }
    if (isHeaderLike(row, parse, 1)) {
      header = i
      break
    }
    // A title line (only the first cell) or other preamble: skip.
  }

  // 2. Criteria.
  const criteria: Criterion[] = []
  let n: number
  if (header >= 0) {
    const cells = values(grid[header]!)
    n = cells.reduce<number>((last, c, j) => (c !== null ? j + 1 : last), 0)
    const seen = new Set<string>()
    for (let j = 0; j < n; j++) {
      const c = cells[j] ?? null
      let name = c === null ? '' : String(c)
      if (name === '') {
        issue(header, j + 1, 'missing-criterion-name', { crit: j })
        name = `C${j + 1}`
      }
      const key = tokenKey(name)
      if (seen.has(key)) issue(header, j + 1, 'duplicate-criterion-name', { crit: j })
      seen.add(key)
      criteria.push({ name, type: 'benefit' })
    }
  } else if (dataStart >= 0) {
    issue(dataStart, -1, 'missing-header')
    const cells = values(grid[dataStart]!)
    n = cells.reduce<number>((last, c, j) => (c !== null ? j + 1 : last), 0)
    for (let j = 0; j < n; j++) criteria.push({ name: `C${j + 1}`, type: 'benefit' })
  } else {
    issue(first, -1, 'missing-header')
    return empty
  }

  // 3. Type rows: those above the header, then any directly below it.
  let cursor = header >= 0 ? header + 1 : dataStart
  const typeRowsBelow: number[] = []
  if (header >= 0) {
    while (cursor < grid.length && isTypeRow(grid[cursor]!)) typeRowsBelow.push(cursor++)
    if (dataStart < 0) dataStart = cursor
    // Blank lines between the header block and the first alternative are not the end of the data.
    while (dataStart < grid.length && isEmptyRow(grid[dataStart]!)) dataStart++
  }
  // Closest to the header first: that one wins a conflict.
  const typeRows = [...typeRowsBelow, ...typeRowsAbove.reverse()]
  if (typeRows.length === 0) issue(-1, -1, 'missing-type-row')
  else {
    for (let j = 0; j < n; j++) {
      let chosen: CriterionType | null = null
      let chosenRow = -1
      let invalidAt = -1
      for (const r of typeRows) {
        const c = grid[r]![j + 1] ?? null
        if (c === null) continue
        const t = isText(c) ? parseCriterionType(c) : null
        if (t === null) {
          if (invalidAt < 0) invalidAt = r
          continue
        }
        if (chosen === null) {
          chosen = t
          chosenRow = r
        } else if (t !== chosen) issue(r, j + 1, 'conflicting-type', { crit: j })
      }
      if (chosen !== null) criteria[j]!.type = chosen
      else if (invalidAt >= 0) issue(invalidAt, j + 1, 'invalid-type', { crit: j })
      else issue(chosenRow >= 0 ? chosenRow : typeRows[0]!, j + 1, 'missing-type', { crit: j })
    }
  }

  // 4. Alternatives, until an empty row, a summary row or a new header.
  const alternatives: string[] = []
  const matrix: (number | null)[][] = []
  const seenAlt = new Set<string>()
  let i = dataStart
  for (; i < grid.length; i++) {
    const row = grid[i]!
    if (isEmptyRow(row)) break
    const label = row[0] ?? null
    if (isText(label) && SUMMARY_LABELS.has(tokenKey(label))) break
    if (isHeaderLike(row, parse, Math.max(2, Math.ceil(n / 2)))) break

    const a = alternatives.length
    let name = label === null ? '' : String(label)
    if (name === '') {
      issue(i, 0, 'missing-alternative-name', { alt: a })
      name = `A${a + 1}`
    }
    const key = tokenKey(name)
    if (seenAlt.has(key)) issue(i, 0, 'duplicate-alternative-name', { alt: a })
    seenAlt.add(key)

    const out: (number | null)[] = []
    for (let j = 0; j < n; j++) {
      const c = row[j + 1] ?? null
      if (c === null) {
        issue(i, j + 1, 'empty-cell', { alt: a, crit: j })
        out.push(null)
      } else if (typeof c === 'number') {
        out.push(c)
      } else {
        const x = isText(c) ? parse(c) : null
        if (x === null) issue(i, j + 1, 'not-a-number', { alt: a, crit: j })
        out.push(x)
      }
    }
    for (let j = n + 1; j < row.length; j++) if (row[j] !== null) issue(i, j, 'extra-cell', { alt: a })
    alternatives.push(name)
    matrix.push(out)
  }

  // 5. Anything after the block is not read; say so once.
  if (i < grid.length && grid.slice(i).some((r) => !isEmptyRow(r))) {
    const at = isEmptyRow(grid[i]!) ? grid.findIndex((r, k) => k > i && !isEmptyRow(r)) : i
    issue(at, 0, 'trailing-content-ignored')
  }

  return { problem: { alternatives, criteria, matrix }, issues, decimal }
}

export type TypeWords = { benefit: string; cost: string }

/**
 * The layout `gridToProblem` reads back: header row, type row, one row per alternative.
 * Empty cells stay null. `typeWords` must be words `parseCriterionType` accepts.
 */
export function problemToGrid(
  problem: ImportedProblem,
  opts: { corner?: string; typeLabel?: string; typeWords?: TypeWords } = {},
): (string | number | null)[][] {
  const words = opts.typeWords ?? { benefit: 'benefit', cost: 'cost' }
  return [
    [opts.corner ?? 'Alternative', ...problem.criteria.map((c) => c.name)],
    [opts.typeLabel ?? 'Type', ...problem.criteria.map((c) => words[c.type])],
    ...problem.matrix.map((row, i) => [
      problem.alternatives[i] ?? '',
      ...row.map((x) => (x === null || !Number.isFinite(x) ? null : x)),
    ]),
  ]
}
