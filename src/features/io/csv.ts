import { gridToProblem, problemToGrid, type GridImportOptions, type ImportedProblem, type ImportResult, type TypeWords } from './grid'
import { formatNumber, type DecimalSeparator } from './numbers'
import { isWeightRowLabel, parseCellNumber } from './xlsx'

export type Delimiter = ',' | ';' | '\t'

const DELIMITERS: readonly Delimiter[] = ['\t', ';', ',']

/** Splits text into records (RFC 4180 quoting: "a ""b""", line breaks inside quotes). */
export function parseDelimited(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let i = 0
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  while (i < s.length) {
    const ch = s[i]!
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"' && field.trim() === '') {
      // An opening quote (leading spaces before it are dropped).
      field = ''
      quoted = true
      i++
      continue
    }
    if (ch === delimiter) {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (ch === '\r' || ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += ch === '\r' && s[i + 1] === '\n' ? 2 : 1
      continue
    }
    field += ch
    i++
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Count of `d` per line outside quotes, for the first non-empty lines. */
function countsPerLine(text: string, d: Delimiter, maxLines = 20): number[] {
  const counts: number[] = []
  let count = 0
  let quoted = false
  let lineHasContent = false
  for (let i = 0; i < text.length && counts.length < maxLines; i++) {
    const ch = text[i]!
    if (ch === '"') quoted = !quoted
    else if (!quoted && (ch === '\n' || ch === '\r')) {
      if (lineHasContent) counts.push(count)
      count = 0
      lineHasContent = false
      continue
    } else if (!quoted && ch === d) count++
    if (ch.trim() !== '') lineHasContent = true
  }
  if (lineHasContent && counts.length < maxLines) counts.push(count)
  return counts
}

/**
 * Picks the delimiter that splits the lines most consistently (same non-zero count on most lines).
 * Ties go to tab, then semicolon, then comma, so a TR file "A1;0,25;0,5" whose decimal commas are
 * as regular as its semicolons still splits on ';'.
 */
export function detectDelimiter(text: string): Delimiter {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  let best: Delimiter = ','
  let bestScore = -1
  for (const d of DELIMITERS) {
    const counts = countsPerLine(s, d)
    if (counts.length === 0) continue
    const freq = new Map<number, number>()
    for (const c of counts) if (c > 0) freq.set(c, (freq.get(c) ?? 0) + 1)
    let modeHits = 0
    for (const hits of freq.values()) modeHits = Math.max(modeHits, hits)
    const score = modeHits / counts.length
    if (score > bestScore) {
      best = d
      bestScore = score
    }
  }
  return best
}

export type CsvImportOptions = GridImportOptions & {
  /** Field delimiter; detected when omitted. */
  delimiter?: Delimiter
}

export type CsvImportResult = Omit<ImportResult, 'problem'> & {
  problem: ImportedProblem & { weights?: number[] }
  delimiter: Delimiter
}

/**
 * Reads a decision matrix from CSV or TSV text (comma, semicolon or tab; quoted fields; BOM;
 * TR "0,25" / "1.234,5" and EN "0.25" / "1,234.5" numbers). Layout and issues: see `gridToProblem`.
 */
export function importCsv(text: string, opts: CsvImportOptions = {}): CsvImportResult {
  const delimiter = opts.delimiter ?? detectDelimiter(text)
  const rawRows = parseDelimited(text, delimiter)
  let skip = Infinity
  for (const r of rawRows) {
    const k = r.findIndex((c) => c.trim() !== '')
    if (k >= 0) skip = Math.min(skip, k)
  }
  if (!Number.isFinite(skip)) skip = 0

  let weightRowCells: string[] | null = null
  const rows: (string | number)[][] = []
  for (const r of rawRows) {
    if (weightRowCells === null && isWeightRowLabel(r[skip])) {
      weightRowCells = r.slice(skip + 1)
      continue
    }
    rows.push(
      r.map((cell) => {
        if (cell.includes('.') && cell.includes(',')) {
          const parsed = parseCellNumber(cell)
          if (parsed !== null) return parsed
        }
        return cell
      }),
    )
  }
  const fallback: DecimalSeparator = opts.decimalFallback ?? (delimiter === ';' ? ',' : '.')
  const result = gridToProblem(rows, { ...opts, decimalFallback: fallback })
  const n = result.problem.criteria.length
  let extractedWeights: number[] | undefined
  if (n > 0 && weightRowCells !== null) {
    const parsed = Array.from({ length: n }, (_, j) => parseCellNumber(weightRowCells![j], result.decimal))
    if (parsed.every((w): w is number => w !== null && Number.isFinite(w) && w >= 0)) {
      const sum = parsed.reduce((a, b) => a + b, 0)
      if (sum > 0) extractedWeights = parsed
    }
  }
  const problemWithWeights: ImportedProblem & { weights?: number[] } = { ...result.problem }
  if (extractedWeights) {
    Object.defineProperty(problemWithWeights, 'weights', {
      value: extractedWeights,
      enumerable: false,
      configurable: true,
      writable: true,
    })
  }
  return { ...result, problem: problemWithWeights, delimiter }
}

export type CsvExportOptions = {
  /** Default ';' when the decimal separator is ',', otherwise ','. */
  delimiter?: Delimiter
  decimal?: DecimalSeparator
  corner?: string
  typeLabel?: string
  typeWords?: TypeWords
  /** Start with a UTF-8 BOM so Excel opens Turkish characters correctly (default true). */
  bom?: boolean
}

function csvField(text: string, delimiter: Delimiter): string {
  return text.includes(delimiter) || /["\r\n]/.test(text) || text !== text.trim()
    ? `"${text.replace(/"/g, '""')}"`
    : text
}

/** Writes the decision matrix in the layout `importCsv` reads back (header, type row, alternatives). */
export function exportCsv(problem: ImportedProblem, opts: CsvExportOptions = {}): string {
  const decimal = opts.decimal ?? '.'
  const delimiter = opts.delimiter ?? (decimal === ',' ? ';' : ',')
  const grid = problemToGrid(problem, {
    ...(opts.corner !== undefined && { corner: opts.corner }),
    ...(opts.typeLabel !== undefined && { typeLabel: opts.typeLabel }),
    ...(opts.typeWords !== undefined && { typeWords: opts.typeWords }),
  })
  const body = grid
    .map((row) =>
      row
        .map((c) => (c === null ? '' : typeof c === 'number' ? csvField(formatNumber(c, decimal), delimiter) : csvField(c, delimiter)))
        .join(delimiter),
    )
    .join('\r\n')
  return (opts.bom ?? true ? '﻿' : '') + body + '\r\n'
}
