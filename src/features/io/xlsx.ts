// Excel import and export. SheetJS is passed in by the caller (a dynamic `import('xlsx')` in the UI),
// so this module only needs its types and the library stays out of the main bundle.
import type * as XLSX from 'xlsx'
import {
  AHP_MAX_PAIRWISE_ALTERNATIVES,
  emptyAlternativeJudgements,
  emptyJudgements,
  SCALE,
  setAlternativePair,
  setAlternativeSource,
  setPair,
  type AlternativeJudgements,
  type Judgements,
  type RankingId,
  type RankingResult,
  type Step,
  type WeightingId,
  type WeightingResult,
} from '../../core'
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
  problem: ImportedProblem & {
    weights?: number[]
    judgements?: Judgements
    alternativeJudgements?: AlternativeJudgements
    weightMethod?: WeightingId | 'manual'
    rankingMethod?: RankingId
  }
  sheet: string
  judgements?: Judgements
  alternativeJudgements?: AlternativeJudgements
  weightMethod?: WeightingId | 'manual'
  rankingMethod?: RankingId
}

const PREFERRED_SHEET_KEYS = new Set(['decision matrix', 'karar matrisi', 'data', 'veri'])
const WEIGHT_SHEET_KEYS = new Set(['weights', 'weight', 'agirliklar', 'agirlik', 'ağirliklar', 'ağirlik'])
const RANKING_SHEET_KEYS = new Set(['ranking', 'siralama', 'sıralama'])
const ABOUT_SHEET_KEYS = new Set(['about', 'hakkinda', 'hakkında'])
const JUDGEMENT_SHEET_KEYS = new Set(['judgements', 'judgments', 'yargilar', 'yargılar'])
const BEST_KEYS = new Set(['best', 'en iyi', 'best criterion', 'en iyi kriter'])
const WORST_KEYS = new Set(['worst', 'en kotu', 'en kötü', 'worst criterion', 'en kotu kriter'])
const METHOD_ROW_KEYS = new Set(['method', 'yontem'])
const ABOUT_WEIGHTING_KEYS = new Set([
  'weighting',
  'weighting method',
  'agirliklandirma',
  'agirliklandirma yontemi',
  'agirlik yontemi',
  'agirlik',
])
const ABOUT_RANKING_KEYS = new Set(['ranking', 'ranking method', 'siralama', 'siralama yontemi'])

const WEIGHT_METHOD_TOKENS: Readonly<Record<string, WeightingId | 'manual'>> = {
  critic: 'critic',
  entropy: 'entropy',
  entropi: 'entropy',
  equal: 'equal',
  'equal weights': 'equal',
  'equal weight': 'equal',
  'esit agirlik': 'equal',
  'esit agirliklar': 'equal',
  manual: 'manual',
  manuel: 'manual',
  elle: 'manual',
  'manual weights': 'manual',
  'elle girilen agirliklar': 'manual',
  sd: 'sd',
  'standard deviation': 'sd',
  'standart sapma': 'sd',
  merec: 'merec',
  lopcow: 'lopcow',
  cilos: 'cilos',
  bwm: 'bwm',
  'best worst': 'bwm',
  'best-worst': 'bwm',
  'best worst method': 'bwm',
  ahp: 'ahp',
  roc: 'roc',
  'rank order centroid': 'roc',
  swara: 'swara',
}

const RANKING_METHOD_TOKENS: Readonly<Record<string, RankingId>> = {
  topsis: 'topsis',
  saw: 'saw',
  wsm: 'saw',
  'ahp-ranking': 'ahp-ranking',
  ahp: 'ahp-ranking',
  vikor: 'vikor',
  edas: 'edas',
  waspas: 'waspas',
  copras: 'copras',
  marcos: 'marcos',
  cocoso: 'cocoso',
  mabac: 'mabac',
  moora: 'moora',
  aras: 'aras',
  codas: 'codas',
  'promethee-ii': 'promethee-ii',
  'promethee ii': 'promethee-ii',
  'promethee 2': 'promethee-ii',
  promethee: 'promethee-ii',
  'electre-i': 'electre-i',
  'electre i': 'electre-i',
  'electre 1': 'electre-i',
  'electre-iii': 'electre-iii',
  'electre iii': 'electre-iii',
  'electre 3': 'electre-iii',
}

function methodToken(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const base = raw.replace(/\s*\(.*\)\s*$/, '').trim()
  return tokenKey(base)
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
}

function parseWeightMethodLabel(raw: unknown): WeightingId | 'manual' | undefined {
  return WEIGHT_METHOD_TOKENS[methodToken(raw)]
}

function parseRankingMethodLabel(raw: unknown): RankingId | undefined {
  return RANKING_METHOD_TOKENS[methodToken(raw)]
}
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
  let extractedWeightMethod: WeightingId | 'manual' | undefined
  let extractedRankingMethod: RankingId | undefined
  if (n > 0) {
    const weightSheetName = wb.SheetNames.find((s) => s !== name && WEIGHT_SHEET_KEYS.has(tokenKey(s)))
    const wWs = weightSheetName ? wb.Sheets[weightSheetName] : undefined
    if (wWs && wWs['!ref']) {
      const wRows = X.utils.sheet_to_json<unknown[]>(wWs, { header: 1, raw: true, defval: null, blankrows: true })
      for (const r of wRows) {
        if (Array.isArray(r) && r.length >= 2 && METHOD_ROW_KEYS.has(methodToken(r[0]))) {
          extractedWeightMethod = parseWeightMethodLabel(r[1])
          if (extractedWeightMethod) break
        }
      }
      if (extractedWeights === undefined) {
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

    const rankingSheetName = wb.SheetNames.find((s) => s !== name && RANKING_SHEET_KEYS.has(tokenKey(s)))
    const rWs = rankingSheetName ? wb.Sheets[rankingSheetName] : undefined
    if (rWs && rWs['!ref']) {
      const rRows = X.utils.sheet_to_json<unknown[]>(rWs, { header: 1, raw: true, defval: null, blankrows: true })
      for (const r of rRows) {
        if (Array.isArray(r) && r.length >= 2 && METHOD_ROW_KEYS.has(methodToken(r[0]))) {
          extractedRankingMethod = parseRankingMethodLabel(r[1])
          if (extractedRankingMethod) break
        }
      }
    }

    const aboutSheetName = wb.SheetNames.find((s) => s !== name && ABOUT_SHEET_KEYS.has(tokenKey(s)))
    const aWs = aboutSheetName ? wb.Sheets[aboutSheetName] : undefined
    if (aWs && aWs['!ref']) {
      const aRows = X.utils.sheet_to_json<unknown[]>(aWs, { header: 1, raw: true, defval: null, blankrows: true })
      for (const r of aRows) {
        if (!Array.isArray(r) || r.length < 2) continue
        const key = methodToken(r[0])
        if (!extractedWeightMethod && ABOUT_WEIGHTING_KEYS.has(key)) {
          extractedWeightMethod = parseWeightMethodLabel(r[1])
        } else if (!extractedRankingMethod && ABOUT_RANKING_KEYS.has(key)) {
          extractedRankingMethod = parseRankingMethodLabel(r[1])
        }
      }
    }
  }

  let extractedJudgements: Judgements | undefined
  let extractedAltJudgements: AlternativeJudgements | undefined
  if (n > 0) {
    const jSheetName = wb.SheetNames.find((s) => s !== name && JUDGEMENT_SHEET_KEYS.has(tokenKey(s)))
    const jWs = jSheetName ? wb.Sheets[jSheetName] : undefined
    if (jWs && jWs['!ref']) {
      const jRows = X.utils.sheet_to_json<unknown[]>(jWs, { header: 1, raw: true, defval: null, blankrows: true })
      const critNames = result.problem.criteria.map((c) => c.name.trim())
      const critKeys = critNames.map((c) => tokenKey(c))
      const matchCrit = (cell: unknown): number => {
        if (cell === null || cell === undefined) return -1
        const s = String(cell).trim()
        const exact = critNames.indexOf(s)
        if (exact >= 0) return exact
        const k = tokenKey(s)
        return k ? critKeys.indexOf(k) : -1
      }
      const matchCritTitle = (cell: unknown): number => {
        const direct = matchCrit(cell)
        if (direct >= 0) return direct
        if (typeof cell !== 'string') return -1
        const firstColon = cell.indexOf(':')
        if (firstColon >= 0) {
          const afterFirst = matchCrit(cell.slice(firstColon + 1))
          if (afterFirst >= 0) return afterFirst
          const lastColon = cell.lastIndexOf(':')
          if (lastColon > firstColon) {
            const afterLast = matchCrit(cell.slice(lastColon + 1))
            if (afterLast >= 0) return afterLast
          }
        }
        return -1
      }
      const toRatio = (cell: unknown) => {
        const v = parseCellNumber(cell, result.decimal)
        if (v === null || !(v > 0)) return null
        return SCALE.find((s) => Math.abs(s - v) < 1e-3) ?? null
      }
      const headerIdx = jRows.findIndex(
        (r) =>
          Array.isArray(r) &&
          r.length >= 1 + n &&
          critNames.every((cn, j) => {
            const cellStr = String(r[1 + j] ?? '').trim()
            return cellStr === cn || (tokenKey(cellStr) !== '' && tokenKey(cellStr) === critKeys[j])
          }),
      )
      if (headerIdx >= 0 && jRows.length >= headerIdx + 1 + n) {
        let best: number | null = null
        let worst: number | null = null
        for (let r = 0; r < headerIdx; r++) {
          const row = jRows[r]
          if (!Array.isArray(row) || row.length < 2) continue
          const k = tokenKey(String(row[0] ?? ''))
          if (BEST_KEYS.has(k)) {
            const idx = matchCrit(row[1])
            if (idx >= 0) best = idx
          } else if (WORST_KEYS.has(k)) {
            const idx = matchCrit(row[1])
            if (idx >= 0) worst = idx
          }
        }
        let parsedJ: Judgements = {
          ...emptyJudgements(n),
          best,
          worst: best !== null && best === worst ? null : worst,
        }
        let hasAny = best !== null || worst !== null
        for (let i = 0; i < n; i++) {
          for (let k = i + 1; k < n; k++) {
            const ratio = toRatio(jRows[headerIdx + 1 + i]?.[1 + k])
            if (ratio !== null) {
              parsedJ = setPair(parsedJ, i, k, ratio)
              hasAny = true
            }
          }
        }
        for (let i = 0; i < n; i++) {
          for (let k = 0; k < i; k++) {
            if (parsedJ.pairs[i]?.[k] === null) {
              const ratio = toRatio(jRows[headerIdx + 1 + i]?.[1 + k])
              if (ratio !== null) {
                parsedJ = setPair(parsedJ, i, k, ratio)
                hasAny = true
              }
            }
          }
        }
        if (hasAny) extractedJudgements = parsedJ
      }

      const m = result.problem.alternatives.length
      if (m >= 2 && m <= AHP_MAX_PAIRWISE_ALTERNATIVES) {
        const altNames = result.problem.alternatives.map((a) => a.trim())
        const altKeys = altNames.map((a) => tokenKey(a))
        let parsedAltJ: AlternativeJudgements = emptyAlternativeJudgements(n)
        let hasAnyAlt = false
        for (let rIdx = 0; rIdx < jRows.length; rIdx++) {
          if (rIdx === headerIdx) continue
          const row = jRows[rIdx]
          if (
            !Array.isArray(row) ||
            row.length < 1 + m ||
            jRows.length < rIdx + 1 + m ||
            !altNames.every((an, i) => {
              const cellStr = String(row[1 + i] ?? '').trim()
              return cellStr === an || (tokenKey(cellStr) !== '' && tokenKey(cellStr) === altKeys[i])
            })
          ) {
            continue
          }
          let critCol = -1
          for (let back = rIdx - 1; back >= 0 && back >= rIdx - 4; back--) {
            const prevRow = jRows[back]
            if (!Array.isArray(prevRow)) continue
            const c0 = matchCritTitle(prevRow[0])
            if (c0 >= 0) {
              critCol = c0
              break
            }
            const c1 = matchCritTitle(prevRow[1])
            if (c1 >= 0) {
              critCol = c1
              break
            }
          }
          if (critCol < 0 || critCol >= n) continue
          parsedAltJ = setAlternativeSource(parsedAltJ, m, n, critCol, 'pairwise')
          hasAnyAlt = true
          for (let i = 0; i < m; i++) {
            for (let k = i + 1; k < m; k++) {
              const ratio = toRatio(jRows[rIdx + 1 + i]?.[1 + k])
              if (ratio !== null) {
                parsedAltJ = setAlternativePair(parsedAltJ, m, n, critCol, i, k, ratio)
              }
            }
          }
          for (let i = 0; i < m; i++) {
            for (let k = 0; k < i; k++) {
              if (parsedAltJ[critCol]?.[i]?.[k] === null) {
                const ratio = toRatio(jRows[rIdx + 1 + i]?.[1 + k])
                if (ratio !== null) {
                  parsedAltJ = setAlternativePair(parsedAltJ, m, n, critCol, i, k, ratio)
                }
              }
            }
          }
          rIdx += m
        }
        if (hasAnyAlt) {
          extractedAltJudgements = parsedAltJ
          if (!extractedRankingMethod) extractedRankingMethod = 'ahp-ranking'
        }
      }
    }
  }

  const problemWithWeights: XlsxImportResult['problem'] = { ...result.problem }
  const defineHidden = (key: string, value: unknown) => {
    if (value === undefined) return
    Object.defineProperty(problemWithWeights, key, {
      value,
      enumerable: false,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(problemWithWeights.matrix, key, {
      value,
      enumerable: false,
      configurable: true,
      writable: true,
    })
  }
  defineHidden('weights', extractedWeights)
  defineHidden('judgements', extractedJudgements)
  defineHidden('alternativeJudgements', extractedAltJudgements)
  defineHidden('weightMethod', extractedWeightMethod)
  defineHidden('rankingMethod', extractedRankingMethod)

  return {
    ...result,
    problem: problemWithWeights,
    sheet: name,
    ...(extractedJudgements ? { judgements: extractedJudgements } : {}),
    ...(extractedAltJudgements ? { alternativeJudgements: extractedAltJudgements } : {}),
    ...(extractedWeightMethod ? { weightMethod: extractedWeightMethod } : {}),
    ...(extractedRankingMethod ? { rankingMethod: extractedRankingMethod } : {}),
  }
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
    const cr = input.weighting?.result.diagnostics?.crInput ?? input.weighting?.result.diagnostics?.cr
    if (typeof cr === 'number' && Number.isFinite(cr)) {
      jRows.push(['CR', cr])
    }
    const bestIdx = input.judgements.best
    const worstIdx = input.judgements.worst
    const isBwmOnly =
      bestIdx !== null &&
      bestIdx !== undefined &&
      worstIdx !== null &&
      worstIdx !== undefined &&
      (!input.weighting?.method || /^bwm\b/i.test(input.weighting.method.trim()))
    jRows.push(
      [L.criterion, ...critNames],
      ...critNames.map((name, i): Cell[] => [
        name,
        ...critNames.map((_, k) => {
          if (i === k) return 1
          if (isBwmOnly && i !== bestIdx && k !== worstIdx) return null
          const direct = input.judgements!.pairs[i]?.[k] ?? null
          if (direct !== null) return finite(direct)
          if (isBwmOnly) return null
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
