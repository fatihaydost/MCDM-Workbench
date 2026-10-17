import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { critic, topsis, type Problem, type Step } from '../../../core'
import {
  cellsToTsv,
  detectDecimal,
  detectDelimiter,
  escapeLatex,
  exportCsv,
  importCsv,
  parseCriterionType,
  parseNumber,
  stepToTable,
  tableToCells,
  tableToLatex,
  tableToTsv,
  type ImportIssue,
  type SheetJS,
} from '..'
import { buildWorkbook, importWorkbook, readWorkbook, writeWorkbook } from '../xlsx'

const codes = (issues: ImportIssue[]) => issues.map((x) => x.code)

const problem: Problem = {
  alternatives: ['Ankara; "merkez"', 'İzmir', 'Maxwell', 'Minolta'],
  criteria: [
    { name: 'Fiyat (₺)', type: 'cost' },
    { name: 'Kalite, puan', type: 'benefit' },
    { name: 'Süre', type: 'cost' },
  ],
  matrix: [
    [1234.5, 0.25, 3],
    [980, 0.125, 1e-7],
    [-2.5, 0.3333333333333333, 12],
    [1500, 0.9, 7],
  ],
}

describe('number parsing', () => {
  it('reads TR and EN decimals', () => {
    expect(parseNumber('0,25', ',')).toBe(0.25)
    expect(parseNumber('1.234,5', ',')).toBe(1234.5)
    expect(parseNumber('0.25', '.')).toBe(0.25)
    expect(parseNumber('1,234.5', '.')).toBe(1234.5)
    expect(parseNumber('−3', '.')).toBe(-3)
    expect(parseNumber('1 234,5', ',')).toBe(1234.5)
    expect(parseNumber('1e-3', '.')).toBe(0.001)
  })
  it('rejects text and malformed groups instead of reading 0', () => {
    expect(parseNumber('', '.')).toBeNull()
    expect(parseNumber('abc', '.')).toBeNull()
    expect(parseNumber('12,34.5', '.')).toBeNull()
    expect(parseNumber('0,25', '.')).toBeNull()
  })
  it('guesses the decimal separator', () => {
    expect(detectDecimal(['0,25', '12'])).toMatchObject({ decimal: ',', ambiguous: false })
    expect(detectDecimal(['1.234,5'])).toMatchObject({ decimal: ',' })
    expect(detectDecimal(['0.25'])).toMatchObject({ decimal: '.' })
    expect(detectDecimal(['1.234'])).toMatchObject({ decimal: '.', ambiguous: true })
    expect(detectDecimal(['1.234', '0,5'])).toMatchObject({ decimal: ',', ambiguous: false })
  })
})

describe('criterion types', () => {
  it('is case-insensitive and knows TR words', () => {
    for (const w of ['Max', 'MAX', 'max', 'benefit', 'Benefit', 'fayda', 'FAYDA', 'maks', '↑ Benefit']) {
      expect(parseCriterionType(w), w).toBe('benefit')
    }
    for (const w of ['min', 'Min', 'MIN', 'cost', 'COST', 'maliyet', 'Maliyet', 'MALİYET', '↓ Cost']) {
      expect(parseCriterionType(w), w).toBe('cost')
    }
    expect(parseCriterionType('Maxwell')).toBeNull()
    expect(parseCriterionType('best')).toBeNull()
  })
})

describe('CSV import', () => {
  it('round-trips problem -> CSV -> problem (EN and TR)', () => {
    for (const decimal of ['.', ','] as const) {
      const csv = exportCsv(problem, { decimal })
      const back = importCsv(csv)
      expect(back.issues).toEqual([])
      expect(back.delimiter).toBe(decimal === ',' ? ';' : ',')
      expect(back.decimal).toBe(decimal)
      expect(back.problem).toEqual(problem)
    }
  })

  it('reads semicolon TR files with a BOM', () => {
    const r = importCsv('﻿Alternatif;K1;K2\nTip;fayda;maliyet\nA1;0,25;1.234,5\nA2;0,5;2.000,75\n')
    expect(r.delimiter).toBe(';')
    expect(r.decimal).toBe(',')
    expect(r.issues).toEqual([])
    expect(r.problem.criteria).toEqual([
      { name: 'K1', type: 'benefit' },
      { name: 'K2', type: 'cost' },
    ])
    expect(r.problem.alternatives).toEqual(['A1', 'A2'])
    expect(r.problem.matrix).toEqual([
      [0.25, 1234.5],
      [0.5, 2000.75],
    ])
  })

  it('reads EN comma files with quoted fields and quoted TR decimals', () => {
    const r = importCsv('"",Price,"Quality, score"\n,Max,min\n"Ankara, ""center""",10,"0,5"\n"Line\nbreak",20,"0,75"\n')
    expect(r.delimiter).toBe(',')
    expect(r.problem.criteria.map((c) => c.name)).toEqual(['Price', 'Quality, score'])
    expect(r.problem.criteria.map((c) => c.type)).toEqual(['benefit', 'cost'])
    expect(r.problem.alternatives).toEqual(['Ankara, "center"', 'Line\nbreak'])
    expect(r.problem.matrix).toEqual([
      [10, 0.5],
      [20, 0.75],
    ])
  })

  it('reads tab-separated text and a type row above the header', () => {
    const r = importCsv('\tmaliyet\tfayda\nAlternative\tC1\tC2\nA1\t1\t2\nA2\t3\t4\n')
    expect(r.delimiter).toBe('\t')
    expect(r.problem.criteria.map((c) => c.type)).toEqual(['cost', 'benefit'])
    expect(r.problem.matrix).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('keeps empty and text cells empty with an issue, never 0', () => {
    const r = importCsv('Alternative;C1;C2\nType;max;min\nA1;;2\nA2;abc;4\n')
    expect(r.problem.matrix).toEqual([
      [null, 2],
      [null, 4],
    ])
    expect(r.issues).toEqual([
      { row: 2, col: 1, code: 'empty-cell', alt: 0, crit: 0 },
      { row: 3, col: 1, code: 'not-a-number', alt: 1, crit: 0 },
    ])
  })

  it('stops at the first empty row and at summary rows, keeps "Maxwell" and "Minolta"', () => {
    const r = importCsv('Alternative,C1,C2\nType,max,min\nMaxwell,1,2\nMinolta,3,4\nmax,3,4\nNormalized,C1,C2\nMaxwell,0,0\n')
    expect(r.problem.alternatives).toEqual(['Maxwell', 'Minolta'])
    expect(codes(r.issues)).toEqual(['trailing-content-ignored'])
    expect(r.issues[0]).toMatchObject({ row: 4 })

    const blank = importCsv('Alternative,C1,C2\nA1,1,2\n\nC1,C2,C3\n')
    expect(blank.problem.alternatives).toEqual(['A1'])
    expect(codes(blank.issues)).toEqual(['missing-type-row', 'trailing-content-ignored'])
  })

  it('reports invalid and missing types and defaults them to benefit', () => {
    const r = importCsv('Alternative,C1,C2,C3\nType,cost,best,\nA1,1,2,3\nA2,4,5,6\n')
    expect(r.problem.criteria.map((c) => c.type)).toEqual(['cost', 'benefit', 'benefit'])
    expect(r.issues).toEqual([
      { row: 1, col: 2, code: 'invalid-type', crit: 1 },
      { row: 1, col: 3, code: 'missing-type', crit: 2 },
    ])
  })

  it('detects delimiters', () => {
    expect(detectDelimiter('a;b;c\n1,5;2,5;3\n')).toBe(';')
    expect(detectDelimiter('a,b,c\n1,2,3\n')).toBe(',')
    expect(detectDelimiter('a\tb\n1,5\t2\n')).toBe('\t')
  })
})

describe('step tables, TSV and LaTeX', () => {
  const p: Problem = {
    alternatives: ['A1', 'A2', 'A3', 'A4'],
    criteria: [
      { name: 'C_1', type: 'benefit' },
      { name: 'C2 & 50%', type: 'cost' },
      { name: 'C#3 $', type: 'benefit' },
    ],
    matrix: [
      [5, 16, 2],
      [2, 18, 10],
      [9, 12, 9],
      [10, 17, 6],
    ],
  }
  const labels = { alternatives: p.alternatives, criteria: p.criteria.map((c) => c.name) }
  const w = critic.compute(p, {})
  const t = topsis.compute(p, w.weights, {})

  it('lays out matrices, criterion and alternative vectors and scalars', () => {
    const corr = stepToTable(w.steps.find((s) => s.key === 'critic.correlation')!, labels)
    expect([corr.rowAxis, corr.colAxis]).toEqual(['criteria', 'criteria'])
    const sigma = stepToTable(w.steps.find((s) => s.key === 'critic.sigma')!, labels, { valueLabel: 'σ' })
    expect(tableToCells(sigma)[0]).toEqual(['', 'C_1', 'C2 & 50%', 'C#3 $'])
    expect(sigma.rowLabels).toEqual(['σ'])
    const cl = stepToTable(t.steps.find((s) => s.key === 'topsis.closeness')!, labels)
    expect(cl.rowAxis).toBe('alternatives')
    expect(cl.values.length).toBe(4)
    const total = stepToTable(w.steps.find((s) => s.key === 'critic.informationTotal')!, labels, { valueLabel: 'ΣC' })
    expect(tableToCells(total)).toEqual([['ΣC', w.steps.find((s) => s.key === 'critic.informationTotal')!.scalar!]])
  })

  it('follows the axes the core step carries when m = n', () => {
    const sq: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [{ name: 'C1', type: 'benefit' }, { name: 'C2', type: 'cost' }, { name: 'C3', type: 'benefit' }],
      matrix: [[1, 5, 3], [4, 2, 6], [7, 8, 2]],
    }
    const sqLabels = { alternatives: sq.alternatives, criteria: sq.criteria.map((c) => c.name) }
    const sw = critic.compute(sq, {})
    const st = topsis.compute(sq, sw.weights, {})
    const table = (steps: Step[], key: string) => stepToTable(steps.find((s) => s.key === key)!, sqLabels)
    expect(table(st.steps, 'topsis.closeness')).toMatchObject({ rowAxis: 'alternatives', colAxis: null })
    expect(table(sw.steps, 'critic.weights')).toMatchObject({ rowAxis: null, colAxis: 'criteria' })
    expect(table(sw.steps, 'critic.correlation')).toMatchObject({ rowAxis: 'criteria', colAxis: 'criteria' })
    expect(table(sw.steps, 'critic.normalized')).toMatchObject({ rowAxis: 'alternatives', colAxis: 'criteria', rowLabels: ['A1', 'A2', 'A3'] })
  })

  it('writes TSV with the chosen decimal separator', () => {
    const table = stepToTable({ key: 'k', matrix: [[0.25, -1.5], [3, 1234.5]], axes: ['alternatives', 'criteria'] }, { alternatives: ['A1', 'A2'], criteria: ['C1', 'C2'] })
    expect(tableToTsv(table, { decimal: ',' })).toBe('\tC1\tC2\nA1\t0,25\t-1,5\nA2\t3\t1234,5')
    expect(tableToTsv(table, { decimal: '.', digits: 2 })).toBe('\tC1\tC2\nA1\t0.25\t-1.50\nA2\t3.00\t1234.50')
    expect(cellsToTsv([['a\tb', 'say "hi"', null, -0.00001]], { digits: 3 })).toBe('"a\tb"\t"say ""hi"""\t\t0.000')
  })

  it('writes a booktabs table with escaped labels and fixed decimals', () => {
    const table = stepToTable(w.steps.find((s) => s.key === 'critic.weights')!, labels, { valueLabel: 'w_j' })
    const tex = tableToLatex(table, { digits: 3 })
    const lines = tex.split('\n')
    expect(lines[0]).toBe('\\begin{tabular}{lrrr}')
    expect(lines).toContain('\\toprule')
    expect(lines).toContain('\\midrule')
    expect(lines).toContain('\\bottomrule')
    expect(lines[2]).toBe(' & C\\_1 & C2 \\& 50\\% & C\\#3 \\$ \\\\')
    expect(lines[4]).toMatch(/^w\\_j & \d\.\d{3} & \d\.\d{3} & \d\.\d{3} \\\\$/)
    expect(tex).not.toContain('siunitx')
    expect(escapeLatex('a\\b {c} ~ ^')).toBe('a\\textbackslash{}b \\{c\\} \\textasciitilde{} \\textasciicircum{}')
    const neg = tableToLatex(stepToTable({ key: 'k', scalar: -0.5 }, labels), { digits: 2, caption: 'Total & more' })
    expect(neg).toContain('k & $-$0.50 \\\\')
    expect(neg).toContain('\\caption{Total \\& more}')
  })
})

// Real SheetJS when the package is installed; these tests are skipped otherwise.
const X: SheetJS | null = await import('xlsx').then((m) => (m.default ?? m) as SheetJS).catch(() => null)
const legacyPath = fileURLToPath(new URL('../../../../legacy/CRITIC(2).xlsx', import.meta.url))

describe.skipIf(!X)('xlsx (real SheetJS)', () => {
  it('round-trips problem -> workbook -> problem with numeric cells', () => {
    const w = critic.compute(problem, {})
    const r = topsis.compute(problem, w.weights, {})
    const wb = buildWorkbook(X!, {
      problem,
      weighting: { method: 'critic', result: w },
      ranking: { method: 'topsis', result: r },
    })
    expect(wb.SheetNames).toEqual(['Data', 'Weights', 'Ranking', 'Calculation'])

    // Through real bytes, as a download and re-upload would do.
    const back = importWorkbook(X!, readWorkbook(X!, new Uint8Array(writeWorkbook(X!, wb))))
    expect(back.sheet).toBe('Data')
    expect(back.issues).toEqual([])
    expect(back.problem).toEqual(problem)

    const data = wb.Sheets['Data']!
    expect(data['B3']).toMatchObject({ t: 'n', v: 1234.5 })
    expect(data['B2']).toMatchObject({ t: 's', v: 'cost' })

    const rowsOf = (name: string) =>
      X!.utils
        .sheet_to_json<unknown[]>(wb.Sheets[name]!, { header: 1, defval: null, blankrows: true })
        .map((row) => {
          const out = [...row]
          while (out.length > 0 && out[out.length - 1] === null) out.pop()
          return out
        })
    const weights = rowsOf('Weights')
    expect(weights[0]).toEqual(['Method', 'critic'])
    expect(weights[2]).toEqual(['Criterion', 'Type', 'critic.sigma', 'critic.conflict', 'critic.information', 'Weight'])
    weights.slice(3, 6).forEach((row, j) => expect(row[5]).toBeCloseTo(w.weights[j]!, 15))
    expect(weights[7]).toEqual(['critic.informationTotal', expect.any(Number)])

    const ranking = rowsOf('Ranking')
    expect(ranking[2]).toEqual(['Alternative', 'topsis.distanceBest', 'topsis.distanceWorst', 'Score', 'Rank'])
    ranking.slice(3).forEach((row, i) => {
      expect(row[3]).toBe(r.scores[i])
      expect(row[4]).toBe(r.ranking[i])
    })

    const calc = wb.Sheets['Calculation']!
    const titles = rowsOf('Calculation').filter((row) => row.length === 1).map((row) => row[0])
    // Each block names its method: both CRITIC and TOPSIS have a "normalized matrix".
    expect(titles).toEqual([...w.steps.map((s) => `critic: ${s.key}`), ...r.steps.map((s) => `topsis: ${s.key}`)])
    expect(calc['B3']).toMatchObject({ t: 'n' })
    // Computed numbers keep full precision and show 4 decimals; raw input has no format.
    expect(wb.Sheets['Weights']!['F4']).toMatchObject({ t: 'n', v: w.weights[0], z: '0.0000' })
    expect(data['B3']!.z).toBeUndefined()
    // A computed 0 or 1 (min-max normalization, the correlation diagonal) has the same 4 decimals.
    const exact = Object.entries(calc).filter(([k, c]) => !k.startsWith('!') && (c as { t?: string; v?: unknown }).t === 'n' && Number.isInteger((c as { v: number }).v))
    expect(exact.length).toBeGreaterThan(0)
    for (const [k, c] of exact) expect((c as { z?: string }).z, k).toBe('0.0000')
    // The rank is a count and keeps the general format.
    expect(wb.Sheets['Ranking']!['E4']).toMatchObject({ t: 'n', v: r.ranking[0] })
    expect(wb.Sheets['Ranking']!['E4']!.z).toBeUndefined()
    expect(wb.Sheets['Ranking']!['D4']!.z).toBe('0.0000')
  })

  it('writes a last About sheet with the provenance, after the re-importable Data sheet', () => {
    const wb = buildWorkbook(X!, {
      problem,
      about: { sheet: 'About', rows: [['Tool', 'MCDM Workbench'], ['Created', '2026-09-29']] },
    })
    expect(wb.SheetNames).toEqual(['Data', 'About'])
    expect(wb.Sheets['About']!['A1']).toMatchObject({ v: 'Tool' })
    expect(wb.Sheets['About']!['B2']).toMatchObject({ v: '2026-09-29' })
    expect(importWorkbook(X!, wb).problem).toEqual(problem)
  })

  it('uses localized labels and still re-imports the Data sheet', () => {
    const wb = buildWorkbook(X!, {
      problem,
      labels: {
        sheets: { data: 'Veri', weights: 'Ağırlıklar', ranking: 'Sıralama', calculation: 'Hesaplama' },
        alternative: 'Alternatif',
        type: 'Tip',
        typeWords: { benefit: 'fayda', cost: 'maliyet' },
      },
    })
    expect(wb.SheetNames).toEqual(['Veri'])
    expect(importWorkbook(X!, wb).problem).toEqual(problem)
  })

  it('reads a sheet that starts below A1 and reports sheet positions', () => {
    const ws = X!.utils.sheet_add_aoa({}, [['Alternative', 'C1', 'C2'], ['Type', 'max', 'min'], ['A1', 1, null], ['A2', '0,5', 3]], { origin: 'C3' })
    // SheetJS writes 'A1:E6'; files from other apps may carry a used range that starts at C3. Both must work.
    const fromA1 = importWorkbook(X!, { SheetNames: ['S'], Sheets: { S: { ...ws } } })
    expect(fromA1.issues).toEqual([{ row: 4, col: 4, code: 'empty-cell', alt: 0, crit: 1 }])
    ws['!ref'] = 'C3:E6'
    const wb = X!.utils.book_new()
    X!.utils.book_append_sheet(wb, ws, 'S')
    const r = importWorkbook(X!, wb, { sheet: 'S' })
    expect(r.problem.matrix).toEqual([
      [1, null],
      [0.5, 3],
    ])
    expect(r.issues).toEqual([{ row: 4, col: 4, code: 'empty-cell', alt: 0, crit: 1 }])
  })

  it.skipIf(!existsSync(legacyPath))('imports legacy/CRITIC(2).xlsx as 7 alternatives x 6 criteria', () => {
    const r = importWorkbook(X!, readWorkbook(X!, readFileSync(legacyPath)))
    expect(r.problem.alternatives).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])
    expect(r.problem.criteria.map((c) => c.name)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6'])
    expect(r.problem.criteria.map((c) => c.type)).toEqual(['cost', 'cost', 'cost', 'benefit', 'benefit', 'benefit'])
    expect(r.problem.matrix).toEqual([
      [5, 16, 2, 4, 913, 148],
      [2, 18, 10, 2, 842, 75],
      [9, 12, 9, 5, 720, 84],
      [10, 17, 6, 9, 792, 185],
      [8, 13, 8, 2, 765, 246],
      [9, 16, 1, 6, 260, 120],
      [2, 12, 2, 2, 699, 70],
    ])
    // The "min" row under the data ends the block; the intermediate tables are not read as data.
    expect(r.issues).toEqual([{ row: 10, col: 0, code: 'trailing-content-ignored' }])
  })
})
