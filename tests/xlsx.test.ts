import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { ahp, aras, bwm, electreI, electreIII, judgementsFromBwm, judgementsFromUpper, marcos, roc, setPair, type Problem } from '../src/core'
import { buildWorkbook, COMPUTED_NUMBER_FORMAT, importWorkbook, INTEGER_NUMBER_FORMAT, parseCellNumber } from '../src/features/io/xlsx'
import { useWorkbench } from '../src/state/workbench'

const problem: Problem = {
  alternatives: ['A1', 'A2', 'A3'],
  criteria: [
    { name: 'Price', type: 'cost' },
    { name: 'Quality', type: 'benefit' },
    { name: 'Speed', type: 'benefit' },
  ],
  matrix: [
    [100, 8, 50],
    [120, 9, 60],
    [90, 7, 55],
  ],
}

describe('xlsx export and import', () => {
  it('appends scalar ranking steps (MARCOS sAai/sAi, ARAS optimalScore) to the Ranking sheet', () => {
    const marcosRes = marcos.compute(problem, [1 / 3, 1 / 3, 1 / 3], {})
    const wbMarcos = buildWorkbook(XLSX, {
      problem,
      ranking: { method: 'MARCOS', result: marcosRes },
    })
    const rankingRows = XLSX.utils.sheet_to_json<unknown[]>(wbMarcos.Sheets.Ranking!, { header: 1 })
    const labels = rankingRows.map((r) => r[0])
    expect(labels).toContain('marcos.sAai')
    expect(labels).toContain('marcos.sAi')

    const arasRes = aras.compute(problem, [1 / 3, 1 / 3, 1 / 3], {})
    const wbAras = buildWorkbook(XLSX, {
      problem,
      ranking: { method: 'ARAS', result: arasRes },
    })
    const arasRows = XLSX.utils.sheet_to_json<unknown[]>(wbAras.Sheets.Ranking!, { header: 1 })
    expect(arasRows.map((r) => r[0])).toContain('aras.optimalScore')
  })

  it('writes Best and Worst anchor criteria to the Judgements sheet for BWM', () => {
    const judgements = judgementsFromBwm(3, 1, 0, [2, 1, 3], [1, 3, 2])
    const bwmRes = bwm.compute(problem, {}, judgements)
    const wb = buildWorkbook(XLSX, {
      problem,
      weighting: { method: 'BWM', result: bwmRes },
      judgements,
    })
    const jRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets.Judgements!, { header: 1 })
    expect(jRows).toContainEqual(['Best', 'Quality'])
    expect(jRows).toContainEqual(['Worst', 'Price'])
  })

  it('uses integer number format for integer/rank/binary steps in Weights, Ranking, and Calculation sheets', () => {
    const rocRes = roc.compute(problem, { formula: 'roc' })
    const el3Res = electreIII.compute(problem, rocRes.weights, {})
    const wb = buildWorkbook(XLSX, {
      problem,
      weighting: { method: 'ROC', result: rocRes },
      ranking: { method: 'ELECTRE III', result: el3Res },
    })

    // Weights sheet: column C (index 2) is roc.ranks (integer), column D (index 3) is Weight (0.0000)
    const wsWeights = wb.Sheets.Weights!
    expect((wsWeights.C4 as XLSX.CellObject).z).toBe(INTEGER_NUMBER_FORMAT)
    expect((wsWeights.D4 as XLSX.CellObject).z).toBe(COMPUTED_NUMBER_FORMAT)

    // Ranking sheet: column B (index 1) is electre-iii.descending (integer), column C (index 2) is electre-iii.ascending (integer), column D (index 3) is Score (0.0000)
    const wsRanking = wb.Sheets.Ranking!
    expect((wsRanking.B4 as XLSX.CellObject).z).toBe(INTEGER_NUMBER_FORMAT)
    expect((wsRanking.C4 as XLSX.CellObject).z).toBe(INTEGER_NUMBER_FORMAT)
    expect((wsRanking.D4 as XLSX.CellObject).z).toBe(COMPUTED_NUMBER_FORMAT)

    // Calculation sheet: roc.ranks block uses integer format
    const wsCalc = wb.Sheets.Calculation!
    expect((wsCalc.B3 as XLSX.CellObject).z).toBe(INTEGER_NUMBER_FORMAT)

    // ELECTRE I outranking and kernel steps also use integer format
    const el1Res = electreI.compute(problem, rocRes.weights, {})
    const wbEl1 = buildWorkbook(XLSX, {
      problem,
      ranking: { method: 'ELECTRE I', result: el1Res },
    })
    const wsEl1Ranking = wbEl1.Sheets.Ranking!
    const header = XLSX.utils.sheet_to_json<unknown[]>(wsEl1Ranking, { header: 1 })[2] as string[]
    const kernelCol = header.indexOf('electre-i.kernel')
    expect(kernelCol).toBeGreaterThan(0)
    const cellAddr = XLSX.utils.encode_cell({ r: 3, c: kernelCol })
    expect((wsEl1Ranking[cellAddr] as XLSX.CellObject).z).toBe(INTEGER_NUMBER_FORMAT)
  })

  it('round-trips the Data sheet cleanly through importWorkbook', () => {
    const wb = buildWorkbook(XLSX, { problem })
    const imported = importWorkbook(XLSX, wb)
    expect(imported.issues).toEqual([])
    expect(imported.problem).toEqual(problem)
  })

  it('parses numbers containing both . and , by checking which separator appears last', () => {
    expect(parseCellNumber('1.250,50')).toBe(1250.5)
    expect(parseCellNumber('1,250.50')).toBe(1250.5)
    expect(parseCellNumber('1.234.567,89')).toBe(1234567.89)
    expect(parseCellNumber('1,234,567.89')).toBe(1234567.89)

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Alternative', 'Price', 'Quality'],
      ['Type', 'cost', 'benefit'],
      ['A1', '1.250,50', '8,5'],
      ['A2', '1,500.25', '9,25'],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const imported = importWorkbook(XLSX, wb)
    expect(imported.issues).toEqual([])
    expect(imported.problem.matrix).toEqual([
      [1250.5, 8.5],
      [1500.25, 9.25],
    ])
  })

  it('prefers Decision Matrix or Karar Matrisi in a multi-sheet workbook', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Overview'], ['Not a matrix']]), 'Summary')
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Alternative', 'Price', 'Quality', 'Speed'],
        ['Type', 'cost', 'benefit', 'benefit'],
        ['A1', 100, 8, 50],
        ['A2', 120, 9, 60],
        ['A3', 90, 7, 55],
      ]),
      'Decision Matrix',
    )
    const imported = importWorkbook(XLSX, wb)
    expect(imported.sheet).toBe('Decision Matrix')
    expect(imported.issues).toEqual([])
    expect(imported.problem).toEqual(problem)

    const wbTr = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wbTr, XLSX.utils.aoa_to_sheet([['Özet']]), 'Kapak')
    XLSX.utils.book_append_sheet(
      wbTr,
      XLSX.utils.aoa_to_sheet([
        ['Alternatif', 'Price', 'Quality', 'Speed'],
        ['Tür', 'maliyet', 'fayda', 'fayda'],
        ['A1', 100, 8, 50],
        ['A2', 120, 9, 60],
        ['A3', 90, 7, 55],
      ]),
      'Karar Matrisi',
    )
    const importedTr = importWorkbook(XLSX, wbTr)
    expect(importedTr.sheet).toBe('Karar Matrisi')
    expect(importedTr.issues).toEqual([])
    expect(importedTr.problem).toEqual(problem)
  })

  it('extracts weights from a Weights (...) row or exported Weights sheet and populates manualWeights on importProblem', () => {
    // 1. Inline Weights (...) row in the sheet
    const wbInline = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wbInline,
      XLSX.utils.aoa_to_sheet([
        ['Alternative', 'Price', 'Quality', 'Speed'],
        ['Type', 'cost', 'benefit', 'benefit'],
        ['Weights (CRITIC)', 0.25, 0.45, 0.3],
        ['A1', 100, 8, 50],
        ['A2', 120, 9, 60],
        ['A3', 90, 7, 55],
      ]),
      'Decision Matrix',
    )
    const inlineRes = importWorkbook(XLSX, wbInline)
    expect(inlineRes.issues).toEqual([])
    expect(inlineRes.problem.alternatives).toEqual(['A1', 'A2', 'A3'])
    expect(inlineRes.problem.weights).toEqual([0.25, 0.45, 0.3])

    // 2. Round-trip from buildWorkbook with weighting
    const wbExported = buildWorkbook(XLSX, {
      problem,
      weighting: { method: 'Manual', result: { weights: [0.2, 0.5, 0.3], steps: [] } },
    })
    const roundTrip = importWorkbook(XLSX, wbExported)
    expect(roundTrip.issues).toEqual([])
    expect(roundTrip.problem.weights).toEqual([0.2, 0.5, 0.3])

    useWorkbench.getState().importProblem(roundTrip.problem, 'exported.xlsx')
    const st = useWorkbench.getState()
    expect(st.manualWeights).toEqual([0.2, 0.5, 0.3])
    expect(st.weightMethod).toBe('manual')
  })

  it('writes CR for AHP, restricts BWM export to anchor cells (row best, col worst, diagonal), and round-trips Judgements on import', () => {
    // 1. AHP writes diagnostics.cr to Judgements sheet and round-trips via importWorkbook / importProblem
    const ahpJ = judgementsFromUpper(3, [3, 5, 2])
    const ahpRes = ahp.compute(problem, {}, ahpJ)
    const wbAhp = buildWorkbook(XLSX, {
      problem,
      weighting: { method: 'AHP', result: ahpRes },
      judgements: ahpJ,
    })
    const ahpRows = XLSX.utils.sheet_to_json<unknown[]>(wbAhp.Sheets.Judgements!, { header: 1 })
    const crRow = ahpRows.find((r) => r[0] === 'CR')
    expect(crRow).toBeDefined()
    expect(typeof crRow![1]).toBe('number')
    expect(crRow![1]).toBeCloseTo(ahpRes.diagnostics!.cr as number, 6)

    const importedAhp = importWorkbook(XLSX, wbAhp)
    expect(importedAhp.judgements).toBeDefined()
    expect(importedAhp.judgements!.pairs[0]![1]).toBe(3)
    expect(importedAhp.judgements!.pairs[0]![2]).toBe(5)
    expect(importedAhp.judgements!.pairs[1]![2]).toBe(2)

    useWorkbench.getState().importProblem(importedAhp.problem, 'ahp.xlsx')
    expect(useWorkbench.getState().judgements?.pairs[0]?.[1]).toBe(3)
    expect(useWorkbench.getState().judgements?.pairs[0]?.[2]).toBe(5)
    expect(useWorkbench.getState().judgements?.pairs[1]?.[2]).toBe(2)

    // 2. BWM export writes only row best, col worst, and diagonal 1, omitting leftover non-anchor pairs
    const problem4: Problem = {
      alternatives: ['A1', 'A2'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
        { name: 'C3', type: 'benefit' },
        { name: 'C4', type: 'cost' },
      ],
      matrix: [
        [10, 20, 30, 40],
        [15, 25, 35, 45],
      ],
    }
    // Best = 0 (C1), Worst = 3 (C4), plus a leftover non-anchor pair (1, 2) = 7 from an earlier AHP session
    let bwmJ = judgementsFromBwm(4, 0, 3, [1, 2, 4, 8], [8, 4, 2, 1])
    bwmJ = setPair(bwmJ, 1, 2, 7)
    const bwmRes = bwm.compute(problem4, {}, bwmJ)
    const wbBwm = buildWorkbook(XLSX, {
      problem: problem4,
      weighting: { method: 'BWM', result: bwmRes },
      judgements: bwmJ,
    })
    const bwmRows = XLSX.utils.sheet_to_json<unknown[]>(wbBwm.Sheets.Judgements!, { header: 1, defval: null })
    const headerIdx = bwmRows.findIndex((r) => r[0] === 'Criterion' && r[1] === 'C1')
    expect(headerIdx).toBeGreaterThanOrEqual(0)
    // Row 1 (C2, i=1), Col 3 (C3, k=2 -> sheet col index 3) is neither i===best(0) nor k===worst(3), so must be null
    expect(bwmRows[headerIdx + 1 + 1]![1 + 2]).toBeNull()
    expect(bwmRows[headerIdx + 1 + 2]![1 + 1]).toBeNull()
    // Anchor cells are present: row 0 (best) and col 3 (worst -> sheet col index 4)
    expect(bwmRows[headerIdx + 1 + 0]![1 + 1]).toBe(2)
    expect(bwmRows[headerIdx + 1 + 1]![1 + 3]).toBe(4)

    const importedBwm = importWorkbook(XLSX, wbBwm)
    expect(importedBwm.judgements).toBeDefined()
    expect(importedBwm.judgements!.best).toBe(0)
    expect(importedBwm.judgements!.worst).toBe(3)
    expect(importedBwm.judgements!.pairs[0]![1]).toBe(2)
    expect(importedBwm.judgements!.pairs[1]![3]).toBe(4)
    expect(importedBwm.judgements!.pairs[1]![2]).toBeNull()
  })
})
