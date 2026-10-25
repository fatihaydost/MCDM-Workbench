// Excel import and export. SheetJS is passed in by the caller (a dynamic `import('xlsx')` in the UI),
// so this module only needs its types and the library stays out of the main bundle.
import type * as XLSX from 'xlsx'
import { AHP_MAX_PAIRWISE_ALTERNATIVES, type AlternativeJudgements, type Judgements, type RankingResult, type Step, type WeightingResult } from '../../core'
import { gridToProblem, problemToGrid, tokenKey, type GridImportOptions, type ImportedProblem, type ImportResult, type TypeWords } from './grid'
import { parseNumber, type DecimalSeparator } from './numbers'
import { stepToTable, tableToCells, type Cell, type StepLabels } from './table'

/** The part of the SheetJS module this file uses. */
export type SheetJS = Pick<typeof XLSX, 'read' | 'write' | 'utils'>
export type WorkBook = XLSX.WorkBook

// ---------------------------------------------------------------- import

export type XlsxImportOptions = GridImportOptions & {
  /** Sheet name or 0-based index; prefers 'Decision Matrix' / 'Karar Matrisi', else the first sheet when omitted. */
  sheet?: string | number
}

export type XlsxImportResult = Omit<ImportResult, 'problem'> & {
  problem: ImportedProblem & { weights?: number[] }
  sheet: string
}

const PREFERRED_SHEET_KEYS = new Set(['decision matrix', 'karar matrisi', 'data', 'veri'])
const WEIGHT_SHEET_KEYS = new Set(['weights', 'weight', 'agirliklar', 'agirlik', 'ağirliklar', 'ağirlik'])
const WEIGHT_MARKS = /^(?:weights?|agirlik(?:lar)?|ağirlik(?:lar)?|ağırlık(?:lar)?)(?:\s*\(.*\))?$/i

export function isWeightRowLabel(cell: unknown): boolean {
  if (typeof cell !== 'string') return false
  const trimmed = cell.trim()
  if (WEIGHT_MARKS.test(trimmed)) return true
  const k = tokenKey(trimmed)
  return (
    k === 'weight' ||
    k === 'weights' ||
    k.startsWith('weight ') ||
    k.startsWith('weights ') ||
    k === 'agirlik' ||
    k === 'agirliklar' ||
    k.startsWith('agirlik ') ||
    k.startsWith('agirliklar ')
  )
}

/**
 * Parses a numeric cell or locale-formatted text number. When a text number contains both '.' and ',',
 * the separator that appears last is treated as the decimal separator and the earlier one as thousands grouping
 * ('1.250,50' -> 1250.5, '1,250.50' -> 1250.5).
 */
export function parseCellNumber(cell: unknown, decimal: DecimalSeparator = '.'): number | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null
  if (typeof cell !== 'string') return null
  const s = cell
    .trim()
    .replace(/[\s\u00a0\u202f\u2009']/g, '')
    .replace(/[−‒–]/g, '-')
  if (!s || !/\d/.test(s)) return null
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastDot >= 0 && lastComma >= 0) {
    const normalized =
      lastComma > lastDot ? s.replace(/\./g, '').replace(/,/g, '.') : s.replace(/,/g, '')
    if (!/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(normalized)) return null
    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
  }
  return parseNumber(s, decimal) ?? (decimal === '.' && s.includes(',') ? parseNumber(s, ',') : null)
}

function pickSheetName(wb: WorkBook, sheet?: string | number): string | undefined {
  if (typeof sheet === 'number') return wb.SheetNames[sheet]
  if (sheet !== undefined) return sheet
  const preferred = wb.SheetNames.find((s) => PREFERRED_SHEET_KEYS.has(tokenKey(s)))
  return preferred ?? wb.SheetNames[0]
}

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
  const name = pickSheetName(wb, opts.sheet)
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
  const rawRows: unknown[][] = ref
    ? X.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: true })
    : []
  const start = ref ? X.utils.decode_range(ref).s : { r: 0, c: 0 }

  // Find leftmost non-empty column offset (skip) to detect Weights (...) rows before gridToProblem.
  let skip = Infinity
  for (const r of rawRows) {
    const k = r.findIndex((c) => c !== null && c !== undefined && String(c).trim() !== '')
    if (k >= 0) skip = Math.min(skip, k)
  }
  if (!Number.isFinite(skip)) skip = 0

  let weightRowCells: unknown[] | null = null
  let votedComma = false
  const cleanedRows: (string | number | boolean | Date | null)[][] = []
  for (const r of rawRows) {
    const label = r[skip]
    if (weightRowCells === null && isWeightRowLabel(label)) {
      weightRowCells = r.slice(skip + 1)
      continue
    }
    cleanedRows.push(
      r.map((cell) => {
        if (typeof cell === 'string' && cell.includes('.') && cell.includes(',')) {
          const parsed = parseCellNumber(cell)
          if (parsed !== null) {
            if (cell.lastIndexOf(',') > cell.lastIndexOf('.')) votedComma = true
            return parsed
          }
        }
        return (cell ?? null) as string | number | boolean | Date | null
      }),
    )
  }

  const { sheet: _sheet, ...gridOpts } = opts
  const result = gridToProblem(cleanedRows, {
    ...gridOpts,
    ...(gridOpts.decimalFallback === undefined && votedComma ? { decimalFallback: ',' as const } : {}),
    origin: { row: start.r, col: start.c },
  })

  const n = result.problem.criteria.length
  let extractedWeights: number[] | undefined
  if (n > 0 && weightRowCells !== null) {
    const parsed = Array.from({ length: n }, (_, j) => parseCellNumber(weightRowCells![j], result.decimal))
    if (parsed.every((w): w is number => w !== null && Number.isFinite(w) && w >= 0)) {
      const sum = parsed.reduce((a, b) => a + b, 0)
      if (sum > 0) extractedWeights = parsed
    }
  }

  // Also check if the workbook has a companion Weights / Ağırlıklar sheet (from buildWorkbook).
  if (extractedWeights === undefined && n > 0) {
    const weightSheetName = wb.SheetNames.find((s) => s !== name && WEIGHT_SHEET_KEYS.has(tokenKey(s)))
    const wWs = weightSheetName ? wb.Sheets[weightSheetName] : undefined
    if (wWs && wWs['!ref']) {
      const wRows = X.utils.sheet_to_json<unknown[]>(wWs, { header: 1, raw: true, defval: null, blankrows: true })
      // In buildWorkbook, row 2 is [Criterion, Type, ..., Weight] and rows 3..3+n-1 hold the criteria.
      const headerRowIdx = wRows.findIndex(
        (r) => Array.isArray(r) && r.length >= 3 && r.some((c) => isWeightRowLabel(c)),
      )
      if (headerRowIdx >= 0 && wRows.length >= headerRowIdx + 1 + n) {
        const headerRow = wRows[headerRowIdx]!
        let weightCol = -1
        for (let c = headerRow.length - 1; c >= 0; c--) {
          if (isWeightRowLabel(headerRow[c])) {
            weightCol = c
            break
          }
        }
        if (weightCol >= 0) {
          const parsed = Array.from({ length: n }, (_, j) =>
            parseCellNumber(wRows[headerRowIdx + 1 + j]?.[weightCol], result.decimal),
          )
          if (parsed.every((w): w is number => w !== null && Number.isFinite(w) && w >= 0)) {
            const sum = parsed.reduce((a, b) => a + b, 0)
            if (sum > 0) extractedWeights = parsed
          }
        }
      }
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

  return { ...result, problem: problemWithWeights, sheet: name }
}

/** `readWorkbook` + `importWorkbook`. */
export function importXlsx(X: SheetJS, data: ArrayBuffer | Uint8Array, opts: XlsxImportOptions = {}): XlsxImportResult {
  return importWorkbook(X, readWorkbook(X, data), opts)
}

// ---------------------------------------------------------------- export

export type WorkbookLabels = {
  sheets: { data: string; weights: string; ranking: string; calculation: string; judgements?: string }
  alternative: string
  criterion: string
  type: string
  /** Written in the Data sheet; must be words the importer reads (benefit/cost, fayda/maliyet, max/min). */
  typeWords: TypeWords
  method: string
  weight: string
  score: string
  rank: string
  best?: string
  worst?: string
  /** Labels of the WASPAS λ grid (`lambdaLabels` in the UI's number format); default 'λ = 0.0' ... */
  lambda?: readonly string[]
  /** Title of a step block (usually the i18n label of the step key). */
  step: (key: string) => string
}

export const DEFAULT_WORKBOOK_LABELS: WorkbookLabels = {
  sheets: { data: 'Data', weights: 'Weights', ranking: 'Ranking', calculation: 'Calculation', judgements: 'Judgements' },
  alternative: 'Alternative',
  criterion: 'Criterion',
  type: 'Type',
  typeWords: { benefit: 'benefit', cost: 'cost' },
  method: 'Method',
  weight: 'Weight',
  score: 'Score',
  rank: 'Rank',
  best: 'Best',
  worst: 'Worst',
  step: (key) => key,
}

export type WorkbookInput = {
  problem: ImportedProblem
  weighting?: { method: string; result: Pick<WeightingResult, 'weights' | 'steps' | 'diagnostics'> }
  ranking?: { method: string; result: Pick<RankingResult, 'scores' | 'ranking' | 'steps'> }
  judgements?: Judgements
  alternativeJudgements?: AlternativeJudgements
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

/** Display format of integer / rank / binary steps. */
export const INTEGER_NUMBER_FORMAT = '0'

/** Step keys whose values are integers, ranks or binary 0/1 flags rather than continuous decimals. */
export const INTEGER_STEP_KEYS = new Set<string>([
  'electre-iii.descending',
  'electre-iii.ascending',
  'roc.ranks',
  'electre-i.kernel',
  'electre-i.outranking',
  'bwm.bestToOthers',
  'bwm.othersToWorst',
])

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
function toSheet(
  X: SheetJS,
  rows: Cell[][],
  numFmt?: string,
  countColumns: readonly number[] = [],
  intCell?: (r: number, c: number) => boolean,
): XLSX.WorkSheet {
  const ws = X.utils.aoa_to_sheet(rows)
  if (numFmt) {
    rows.forEach((row, r) =>
      row.forEach((c, j) => {
        if (typeof c !== 'number' || countColumns.includes(j)) return
        const cell = ws[X.utils.encode_cell({ r, c: j })] as XLSX.CellObject | undefined
        if (cell && cell.t === 'n') cell.z = intCell?.(r, j) ? (Number.isInteger(c) ? INTEGER_NUMBER_FORMAT : '0.0') : numFmt
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
  const add = (
    rows: Cell[][],
    name: string,
    numFmt?: string,
    countColumns?: readonly number[],
    intCell?: (r: number, c: number) => boolean,
  ) => X.utils.book_append_sheet(wb, toSheet(X, rows, numFmt, countColumns, intCell), sheetName(name, taken))

  // Data
  add(problemToGrid(problem, { corner: L.alternative, typeLabel: L.type, typeWords: L.typeWords }), L.sheets.data)

  // Weights
  if (input.weighting) {
    const { method, result } = input.weighting
    const entries = (result.steps ?? []).map((s) => ({
      key: s.key,
      table: stepToTable(s, axisLabels, { valueLabel: L.step(s.key) }),
    }))
    const columns = entries.filter(
      ({ table: t }) => t.kind === 'vector' && t.colAxis === 'criteria' && !sameValues(t.values[0]!, result.weights),
    )
    const scalars = entries.filter(({ table: t }) => t.kind === 'scalar')
    const intCols = new Set(columns.flatMap((col, idx) => (INTEGER_STEP_KEYS.has(col.key) ? [2 + idx] : [])))
    const nCrit = problem.criteria.length
    const rows: Cell[][] = [
      [L.method, method],
      [],
      [L.criterion, L.type, ...columns.map(({ table: t }) => t.rowLabels[0]!), L.weight],
      ...problem.criteria.map((c, j): Cell[] => [
        c.name,
        L.typeWords[c.type],
        ...columns.map(({ table: t }) => finite(t.values[0]![j])),
        finite(result.weights[j]),
      ]),
    ]
    if (scalars.length > 0) rows.push([], ...scalars.map(({ table: t }): Cell[] => [t.rowLabels[0]!, finite(t.values[0]![0])]))
    add(rows, L.sheets.weights, COMPUTED_NUMBER_FORMAT, [], (r, c) => r >= 3 && r < 3 + nCrit && intCols.has(c))
  }

  // Ranking
  if (input.ranking) {
    const { method, result } = input.ranking
    const entries = (result.steps ?? []).map((s) => ({
      key: s.key,
      table: stepToTable(s, axisLabels, { valueLabel: L.step(s.key) }),
    }))
    const columns = entries.filter(
      ({ table: t }) => t.kind === 'vector' && t.rowAxis === 'alternatives' && !sameValues(t.values.map((r) => r[0]!), result.scores),
    )
    const scalars = entries.filter(({ table: t }) => t.kind === 'scalar')
    const intCols = new Set(columns.flatMap((col, idx) => (INTEGER_STEP_KEYS.has(col.key) ? [1 + idx] : [])))
    const nAlt = problem.alternatives.length
    const rows: Cell[][] = [
      [L.method, method],
      [],
      [L.alternative, ...columns.map(({ table: t }) => t.colLabels![0]!), L.score, L.rank],
      ...problem.alternatives.map((a, i): Cell[] => [
        a,
        ...columns.map(({ table: t }) => finite(t.values[i]![0])),
        finite(result.scores[i]),
        finite(result.ranking[i]),
      ]),
    ]
    if (scalars.length > 0) rows.push([], ...scalars.map(({ table: t }): Cell[] => [t.rowLabels[0]!, finite(t.values[0]![0])]))
    add(
      rows,
      L.sheets.ranking,
      COMPUTED_NUMBER_FORMAT,
      [columns.length + 2], // the rank
      (r, c) => r >= 3 && r < 3 + nAlt && intCols.has(c),
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
    const intRows = new Set<number>()
    for (const { step: s, method } of steps) {
      const table = stepToTable(s, axisLabels, { valueLabel: L.step(s.key) })
      rows.push([method ? `${method}: ${L.step(s.key)}` : L.step(s.key)])
      const cells = tableToCells(table, '')
      const blockRows = table.kind === 'scalar' ? cells.map((r) => ['', ...r.slice(1)]) : cells
      if (INTEGER_STEP_KEYS.has(s.key)) {
        for (let k = 0; k < blockRows.length; k++) intRows.add(rows.length + k)
      }
      // A scalar block already has its title as the row label; keep only the value under the title.
      rows.push(...blockRows, [])
    }
    add(rows, L.sheets.calculation, COMPUTED_NUMBER_FORMAT, [], (r) => intRows.has(r))
  }

  // Judgements: criterion pairwise matrix (AHP / BWM) and/or per-criterion alternative pairwise matrices (AHP ranking).
  const jRows: Cell[][] = []
  if (input.judgements && input.judgements.pairs.length === problem.criteria.length) {
    const critNames = problem.criteria.map((c) => c.name)
    jRows.push([input.weighting?.method ? `${input.weighting.method}: ${L.criterion}` : L.criterion])
    if (input.judgements.best !== null && input.judgements.best !== undefined && critNames[input.judgements.best] !== undefined) {
      jRows.push([L.best ?? 'Best', critNames[input.judgements.best]!])
    }
    if (input.judgements.worst !== null && input.judgements.worst !== undefined && critNames[input.judgements.worst] !== undefined) {
      jRows.push([L.worst ?? 'Worst', critNames[input.judgements.worst]!])
    }
    const crInput = input.weighting?.result.diagnostics?.crInput
    if (typeof crInput === 'number' && Number.isFinite(crInput)) {
      jRows.push(['CR', crInput])
    }
    jRows.push(
      [L.criterion, ...critNames],
      ...critNames.map((name, i): Cell[] => [
        name,
        ...critNames.map((_, k) => {
          if (i === k) return 1
          const direct = input.judgements!.pairs[i]?.[k] ?? null
          if (direct !== null) return finite(direct)
          const inv = input.judgements!.pairs[k]?.[i] ?? null
          return inv !== null ? finite(1 / inv) : null
        }),
      ]),
      [],
    )
  }
  if (input.alternativeJudgements && problem.alternatives.length <= AHP_MAX_PAIRWISE_ALTERNATIVES) {
    const altNames = problem.alternatives
    problem.criteria.forEach((c, j) => {
      const mat = input.alternativeJudgements?.[j]
      if (!mat || mat.length !== altNames.length) return
      jRows.push(
        [input.ranking?.method ? `${input.ranking.method}: ${c.name}` : c.name],
        [L.alternative, ...altNames],
        ...altNames.map((name, i): Cell[] => [
          name,
          ...altNames.map((_, k) => {
            if (i === k) return 1
            const direct = mat[i]?.[k] ?? null
            if (direct !== null) return finite(direct)
            const inv = mat[k]?.[i] ?? null
            return inv !== null ? finite(1 / inv) : null
          }),
        ]),
        [],
      )
    })
  }
  if (jRows.length > 0) add(jRows, L.sheets.judgements ?? 'Judgements', COMPUTED_NUMBER_FORMAT)

  if (input.about) add(input.about.rows.map(([k, v]): Cell[] => [k, v]), input.about.sheet)

  return wb
}

/** Serializes a workbook to .xlsx bytes (for a Blob download). */
export function writeWorkbook(X: SheetJS, wb: WorkBook): ArrayBuffer {
  return X.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer
}
