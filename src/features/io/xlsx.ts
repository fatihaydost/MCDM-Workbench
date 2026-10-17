// Excel import and export. SheetJS is passed in by the caller (a dynamic `import('xlsx')` in the UI),
// so this module only needs its types and the library stays out of the main bundle.
import type * as XLSX from 'xlsx'
import type { RankingResult, Step, WeightingResult } from '../../core'
import { gridToProblem, problemToGrid, type GridImportOptions, type ImportedProblem, type ImportResult, type TypeWords } from './grid'
import { stepToTable, tableToCells, type Cell, type StepLabels } from './table'

/** The part of the SheetJS module this file uses. */
export type SheetJS = Pick<typeof XLSX, 'read' | 'write' | 'utils'>
export type WorkBook = XLSX.WorkBook

// ---------------------------------------------------------------- import

export type XlsxImportOptions = GridImportOptions & {
  /** Sheet name or 0-based index; the first sheet when omitted. */
  sheet?: string | number
}

export type XlsxImportResult = ImportResult & { sheet: string }

/** Parses .xlsx / .xls / .ods bytes. */
export function readWorkbook(X: SheetJS, data: ArrayBuffer | Uint8Array): WorkBook {
  return X.read(data, { type: 'array' })
}

/**
 * Reads the decision matrix from one sheet with the same rules as `importCsv`: numeric cells are
 * taken as numbers, text cells are parsed ("0,25" typed as text in a TR Excel), reading stops at the
 * first fully empty row or summary row. Issue positions are 0-based sheet rows and columns.
 */
export function importWorkbook(X: SheetJS, wb: WorkBook, opts: XlsxImportOptions = {}): XlsxImportResult {
  const name =
    typeof opts.sheet === 'number' ? wb.SheetNames[opts.sheet] : opts.sheet ?? wb.SheetNames[0]
  const ws = name === undefined ? undefined : wb.Sheets[name]
  if (name === undefined || ws === undefined) {
    return {
      problem: { alternatives: [], criteria: [], matrix: [] },
      issues: [{ row: -1, col: -1, code: 'empty-file' }],
      decimal: opts.decimal === ',' ? ',' : '.',
      sheet: name ?? '',
    }
  }
  const ref = ws['!ref']
  const rows: unknown[][] = ref
    ? X.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: true })
    : []
  const start = ref ? X.utils.decode_range(ref).s : { r: 0, c: 0 }
  const { sheet: _sheet, ...gridOpts } = opts
  const result = gridToProblem(rows as (string | number | boolean | Date | null)[][], {
    ...gridOpts,
    origin: { row: start.r, col: start.c },
  })
  return { ...result, sheet: name }
}

/** `readWorkbook` + `importWorkbook`. */
export function importXlsx(X: SheetJS, data: ArrayBuffer | Uint8Array, opts: XlsxImportOptions = {}): XlsxImportResult {
  return importWorkbook(X, readWorkbook(X, data), opts)
}

// ---------------------------------------------------------------- export

export type WorkbookLabels = {
  sheets: { data: string; weights: string; ranking: string; calculation: string }
  alternative: string
  criterion: string
  type: string
  /** Written in the Data sheet; must be words the importer reads (benefit/cost, fayda/maliyet, max/min). */
  typeWords: TypeWords
  method: string
  weight: string
  score: string
  rank: string
  /** Labels of the WASPAS λ grid (`lambdaLabels` in the UI's number format); default 'λ = 0.0' ... */
  lambda?: readonly string[]
  /** Title of a step block (usually the i18n label of the step key). */
  step: (key: string) => string
}

export const DEFAULT_WORKBOOK_LABELS: WorkbookLabels = {
  sheets: { data: 'Data', weights: 'Weights', ranking: 'Ranking', calculation: 'Calculation' },
  alternative: 'Alternative',
  criterion: 'Criterion',
  type: 'Type',
  typeWords: { benefit: 'benefit', cost: 'cost' },
  method: 'Method',
  weight: 'Weight',
  score: 'Score',
  rank: 'Rank',
  step: (key) => key,
}

export type WorkbookInput = {
  problem: ImportedProblem
  weighting?: { method: string; result: Pick<WeightingResult, 'weights' | 'steps'> }
  ranking?: { method: string; result: Pick<RankingResult, 'scores' | 'ranking' | 'steps'> }
  labels?: Partial<WorkbookLabels>
  /**
   * Provenance written as a last sheet (tool, address, date, data source, methods), so a file
   * that travels on its own still says where it came from. Data stays the first sheet, so the
   * file imports back as it is.
   */
  about?: { sheet: string; rows: (readonly [string, string])[] }
}

/** Display format of computed numbers; the cells keep full precision. */
export const COMPUTED_NUMBER_FORMAT = '0.0000'

const sameValues = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i])

/** Excel sheet names: at most 31 characters, none of : \ / ? * [ ]. */
function sheetName(name: string, taken: Set<string>): string {
  const base = name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet'
  let out = base
  for (let k = 2; taken.has(out.toLowerCase()); k++) out = `${base.slice(0, 28)} ${k}`
  taken.add(out.toLowerCase())
  return out
}

const finite = (x: number | null | undefined): number | null =>
  typeof x === 'number' && Number.isFinite(x) ? x : null

/**
 * `numFmt`: display format for every number cell of a computed sheet, so a normalized 0 or 1 reads
 * "0.0000" like its neighbours (fixed decimals per column); raw input keeps none. `countColumns`:
 * columns that hold counts such as the rank, which stay as they are.
 */
function toSheet(X: SheetJS, rows: Cell[][], numFmt?: string, countColumns: readonly number[] = []): XLSX.WorkSheet {
  const ws = X.utils.aoa_to_sheet(rows)
  if (numFmt) {
    rows.forEach((row, r) =>
      row.forEach((c, j) => {
        if (typeof c !== 'number' || countColumns.includes(j)) return
        const cell = ws[X.utils.encode_cell({ r, c: j })] as XLSX.CellObject | undefined
        if (cell && cell.t === 'n') cell.z = numFmt
      }),
    )
  }
  const widths: number[] = []
  for (const row of rows) {
    row.forEach((c, j) => {
      const len = c === null ? 0 : typeof c === 'number' ? 12 : c.length
      widths[j] = Math.max(widths[j] ?? 8, Math.min(len + 2, 48))
    })
  }
  ws['!cols'] = widths.map((wch) => ({ wch }))
  return ws
}

/**
 * The full calculation as a workbook: "Data" (the matrix with types, re-importable), "Weights"
 * (method, weights and the per-criterion weighting steps as columns), "Ranking" (score and rank,
 * per-alternative ranking steps as columns) and "Calculation" (every step as a titled block).
 * Every number is written as a number cell.
 */
export function buildWorkbook(X: SheetJS, input: WorkbookInput): WorkBook {
  const L: WorkbookLabels = {
    ...DEFAULT_WORKBOOK_LABELS,
    ...input.labels,
    sheets: { ...DEFAULT_WORKBOOK_LABELS.sheets, ...input.labels?.sheets },
  }
  const { problem } = input
  const axisLabels: StepLabels = { alternatives: problem.alternatives, criteria: problem.criteria.map((c) => c.name), ...(L.lambda ? { lambda: L.lambda } : {}) }
  const wb = X.utils.book_new()
  const taken = new Set<string>()
  const add = (rows: Cell[][], name: string, numFmt?: string, countColumns?: readonly number[]) =>
    X.utils.book_append_sheet(wb, toSheet(X, rows, numFmt, countColumns), sheetName(name, taken))

  // Data
  add(problemToGrid(problem, { corner: L.alternative, typeLabel: L.type, typeWords: L.typeWords }), L.sheets.data)

  // Weights
  if (input.weighting) {
    const { method, result } = input.weighting
    const tables = (result.steps ?? []).map((s) => stepToTable(s, axisLabels, { valueLabel: L.step(s.key) }))
    const columns = tables.filter(
      (t) => t.kind === 'vector' && t.colAxis === 'criteria' && !sameValues(t.values[0]!, result.weights),
    )
    const scalars = tables.filter((t) => t.kind === 'scalar')
    const rows: Cell[][] = [
      [L.method, method],
      [],
      [L.criterion, L.type, ...columns.map((t) => t.rowLabels[0]!), L.weight],
      ...problem.criteria.map((c, j): Cell[] => [
        c.name,
        L.typeWords[c.type],
        ...columns.map((t) => finite(t.values[0]![j])),
        finite(result.weights[j]),
      ]),
    ]
    if (scalars.length > 0) rows.push([], ...scalars.map((t): Cell[] => [t.rowLabels[0]!, finite(t.values[0]![0])]))
    add(rows, L.sheets.weights, COMPUTED_NUMBER_FORMAT)
  }

  // Ranking
  if (input.ranking) {
    const { method, result } = input.ranking
    const tables = (result.steps ?? []).map((s) => stepToTable(s, axisLabels, { valueLabel: L.step(s.key) }))
    const columns = tables.filter(
      (t) => t.kind === 'vector' && t.rowAxis === 'alternatives' && !sameValues(t.values.map((r) => r[0]!), result.scores),
    )
    add(
      [
        [L.method, method],
        [],
        [L.alternative, ...columns.map((t) => t.colLabels![0]!), L.score, L.rank],
        ...problem.alternatives.map((a, i): Cell[] => [
          a,
          ...columns.map((t) => finite(t.values[i]![0])),
          finite(result.scores[i]),
          finite(result.ranking[i]),
        ]),
      ],
      L.sheets.ranking,
      COMPUTED_NUMBER_FORMAT,
      [columns.length + 2], // the rank
    )
  }

  // Calculation: every step, weighting first, as a titled block with its labels. The block title
  // names the method ("CRITIC: ...", "TOPSIS: ..."), since both methods have a normalized matrix.
  const steps: { step: Step; method: string | undefined }[] = [
    ...(input.weighting?.result.steps ?? []).map((step) => ({ step, method: input.weighting?.method })),
    ...(input.ranking?.result.steps ?? []).map((step) => ({ step, method: input.ranking?.method })),
  ]
  if (steps.length > 0) {
    const rows: Cell[][] = []
    for (const { step: s, method } of steps) {
      const table = stepToTable(s, axisLabels, { valueLabel: L.step(s.key) })
      rows.push([method ? `${method}: ${L.step(s.key)}` : L.step(s.key)])
      const cells = tableToCells(table, '')
      // A scalar block already has its title as the row label; keep only the value under the title.
      rows.push(...(table.kind === 'scalar' ? cells.map((r) => ['', ...r.slice(1)]) : cells), [])
    }
    add(rows, L.sheets.calculation, COMPUTED_NUMBER_FORMAT)
  }

  if (input.about) add(input.about.rows.map(([k, v]): Cell[] => [k, v]), input.about.sheet)

  return wb
}

/** Serializes a workbook to .xlsx bytes (for a Blob download). */
export function writeWorkbook(X: SheetJS, wb: WorkBook): ArrayBuffer {
  return X.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer
}
