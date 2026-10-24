import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { aras, bwm, electreI, electreIII, judgementsFromBwm, marcos, roc, type Problem } from '../src/core'
import { buildWorkbook, COMPUTED_NUMBER_FORMAT, importWorkbook, INTEGER_NUMBER_FORMAT } from '../src/features/io/xlsx'

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
})
