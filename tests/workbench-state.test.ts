import { describe, expect, it } from 'vitest'
import { examples, getExample, shortCitation } from '../src/data/examples'
import {
  computeRanking,
  computeValidation,
  computeWeights,
  initialWorkbench,
  useWorkbench,
  WORKBENCH_STORAGE_KEY,
  type DraftProblem,
} from '../src/state/workbench'
import { deleteCriterion, insertCriterion, setType, writeCell } from '../src/features/grid/model'
import { expectClose } from './helpers'
import critic2021 from './fixtures/critic-krishnan2021.json'
import edasKG from './fixtures/edas-keshavarz2015.json'
import entropyK from './fixtures/entropy-krishnan2021-minmax.json'
import zavadskas from './fixtures/entropy-zavadskas2017.json'
import f from './fixtures/opricovic-tzeng-2004-f.json'
import phi from './fixtures/opricovic-tzeng-2004-phi.json'
import podvezko from './fixtures/saw-podvezko2011.json'
import diak from './fixtures/sd-diakoulaki1995.json'
import merecK from './fixtures/merec-keshavarz2021-illustrative.json'
import lopcowK from './fixtures/lopcow-keles2023.json'
import cilosZ from './fixtures/cilos-zavadskas2017.json'
import vikorKG from './fixtures/vikor-keshavarz2015.json'
import vikorOT from './fixtures/vikor-opricovic-tzeng2004.json'
import waspasA from './fixtures/waspas-adali2017.json'
import coprasOC from './fixtures/copras-ozcan-celik2021.json'
import marcosSB from './fixtures/marcos-stevic-brkovic2020.json'
import cocosoY from './fixtures/cocoso-yazdani2019-logistics.json'
import mabacPC from './fixtures/mabac-pamucar-cirovic2015-forklifts.json'
import mooraBZ from './fixtures/moora-brauers-zavadskas2010.json'
import arasBA from './fixtures/aras-bakir-atalik2018.json'
import codasG from './fixtures/codas-ghorabaee2016.json'
import rosz from './fixtures/roc-roszkowska2013.json'

const draftOf = (id: string): DraftProblem => {
  const ex = getExample(id)!
  return {
    alternatives: ex.alternatives,
    criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
    matrix: ex.matrix,
  }
}

describe('examples match the published fixtures', () => {
  it('Krishnan et al. 2021', () => {
    const ex = getExample('krishnan-2021-smartphones')!
    expect(ex.matrix).toEqual(critic2021.matrix)
    expect(ex.criteria.map((c) => c.type)).toEqual(critic2021.types)
  })
  it('Zavadskas et al. 2017', () => {
    const ex = getExample('zavadskas-2017-vilnius')!
    expect(ex.matrix).toEqual(zavadskas.matrix)
    expect(ex.alternatives).toEqual(zavadskas.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(zavadskas.types)
    expect(ex.published).toEqual([{ label: 'entropy.weights', values: zavadskas.expected.weights, decimals: 4 }])
  })
  it('Diakoulaki et al. 1995', () => {
    const ex = getExample('diakoulaki-1995-pharma')!
    expect(ex.matrix).toEqual(diak.matrix)
    expect(ex.alternatives).toEqual(diak.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(diak.types)
    expect(ex.published).toEqual([{ label: 'sd.weights', values: diak.published.weights, decimals: 3 }])
  })
  it('Keshavarz-Ghorabaee et al. 2021 (MEREC)', () => {
    const ex = getExample('keshavarz-2021-merec')!
    expect(ex.matrix).toEqual(merecK.matrix)
    expect(ex.alternatives).toEqual(merecK.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(merecK.types)
    expect(ex.published).toEqual([
      { label: 'merec.performance', values: merecK.expected.S, decimals: 2 },
      { label: 'merec.removalEffect', values: merecK.expected.E_printed, decimals: 2 },
      { label: 'merec.weights', values: merecK.expected.weights, decimals: 4 },
    ])
  })
  it('Keleş 2023 (LOPCOW, Table 6)', () => {
    const ex = getExample('keles-2023-cities')!
    expect(ex.referenceFor).toEqual(['lopcow'])
    expect(ex.matrix).toEqual(lopcowK.matrix)
    expect(ex.alternatives).toEqual(lopcowK.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(lopcowK.types)
    expect(ex.published).toEqual([{ label: 'lopcow.weights', values: lopcowK.published.weights, decimals: 3 }])
  })
  it('Zavadskas et al. 2017 (CILOS, Social block, Table 10)', () => {
    const ex = getExample('zavadskas-2017-vilnius-social')!
    expect(ex.referenceFor).toEqual(['cilos'])
    expect(ex.matrix).toEqual(cilosZ.matrix)
    expect(ex.alternatives).toEqual(cilosZ.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(cilosZ.types)
    expect(ex.published).toEqual([{ label: 'cilos.weights', values: cilosZ.expected.weights, decimals: 4 }])
  })
  for (const [id, fx] of [['opricovic-tzeng-2004-f', f], ['opricovic-tzeng-2004-phi', phi]] as const) {
    it(id, () => {
      const ex = getExample(id)!
      expect(ex.matrix).toEqual(fx.matrix)
      expect(ex.weights).toEqual(fx.weights)
      expect(ex.criteria.map((c) => c.type)).toEqual(fx.types)
    })
  }
  it('Podvezko 2011', () => {
    const ex = getExample('podvezko-2011-baltic')!
    expect(ex.matrix).toEqual(podvezko.matrix)
    expect(ex.alternatives).toEqual(podvezko.alternatives)
    expect(ex.weights).toEqual(podvezko.weights)
    expect(ex.criteria.map((c) => c.type)).toEqual(podvezko.types)
    // The corrected scores (Table 3 misprints Lithuania), rounded as Table 3 prints them.
    expect(ex.published).toEqual([{ label: 'saw.scores', values: podvezko.linearMax.expected.S.map((v) => Number(v.toFixed(3))), decimals: 3 }])
  })
  it('Opricovic and Tzeng 2004: the VIKOR outputs printed in Table 3', () => {
    for (const id of ['opricovic-tzeng-2004-f', 'opricovic-tzeng-2004-phi']) {
      const ex = getExample(id)!
      expect(ex.referenceFor).toEqual(['topsis', 'vikor'])
      const pub = Object.fromEntries(ex.published.map((x) => [x.label, x.values]))
      expect(pub['vikor.groupUtility']).toEqual(vikorOT.expected.S)
      expect(pub['vikor.individualRegret']).toEqual(vikorOT.expected.R)
      expect(pub['vikor.q']).toEqual(vikorOT.expected.Q)
    }
    expect(getExample('opricovic-tzeng-2004-phi')!.matrix).toEqual(vikorOT.matrix_phi)
  })
  it('Keshavarz Ghorabaee et al. 2015, weight set 1', () => {
    const ex = getExample('keshavarz-2015-ten-alternatives')!
    expect(ex.matrix).toEqual(vikorKG.matrix)
    expect(ex.alternatives).toEqual(vikorKG.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(vikorKG.types)
    expect(ex.weights).toEqual(vikorKG.weight_sets[0])
    expect(ex.published).toEqual([
      { label: 'vikor.rank', values: vikorKG.published_ranks[0], decimals: 0 },
      { label: 'edas.rank', values: edasKG.tenAlternatives.published_ranks[0], decimals: 0 },
    ])
    expect(ex.matrix).toEqual(edasKG.tenAlternatives.matrix)
    expect(ex.weights).toEqual(edasKG.tenAlternatives.weight_sets_as_printed[0])
  })
  it('Keshavarz Ghorabaee et al. 2015, the 47 items of Tables 1 and 2', () => {
    const ex = getExample('keshavarz-2015-inventory')!
    const inv = edasKG.inventory
    expect(ex.referenceFor).toEqual(['edas'])
    expect(ex.matrix).toEqual(inv.matrix)
    expect(ex.alternatives).toEqual(inv.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(inv.types)
    expect(ex.weights).toBeUndefined()
    expect(ex.equalWeights).toBe(true)
    expect(ex.published).toEqual([{ label: 'edas.scores', values: inv.published.AS, decimals: 2 }])
  })
  it('Aytaç Adalı and Tuş Işık 2017 (WASPAS)', () => {
    const ex = getExample('adali-2017-suppliers')!
    expect(ex.referenceFor).toEqual(['waspas'])
    expect(ex.matrix).toEqual(waspasA.matrix)
    expect(ex.alternatives).toEqual(waspasA.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(waspasA.types)
    expect(ex.weights).toEqual(waspasA.weights)
    expect(ex.published).toEqual([{ label: 'waspas.scores', values: waspasA.expected.Q_table7.map((row) => row[5]), decimals: 4 }])
  })
  it('Özcan and Çelik 2021 (Entropy then COPRAS)', () => {
    const ex = getExample('ozcan-celik-2021-separators')!
    expect(ex.referenceFor).toEqual(['entropy', 'copras'])
    expect(ex.matrix).toEqual(coprasOC.matrix)
    expect(ex.alternatives).toEqual(coprasOC.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(coprasOC.types)
    expect(ex.criteria.map((c) => c.name.en.toLowerCase())).toEqual(coprasOC.criteria)
    expect(ex.weights).toBeUndefined()
    expect(ex.published).toEqual([
      { label: 'entropy.weights', values: coprasOC.weights_printed_table2, decimals: 4 },
      { label: 'copras.significance', values: coprasOC.published.Q_table11, decimals: 4 },
    ])
  })
  it('Stević and Brković 2020 (MARCOS, the weights as Table 4 applies them)', () => {
    const ex = getExample('stevic-brkovic-2020-drivers')!
    expect(ex.referenceFor).toEqual(['marcos'])
    expect(ex.matrix).toEqual(marcosSB.matrix)
    expect(ex.alternatives).toEqual(marcosSB.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(marcosSB.types)
    expect(ex.weights).toEqual(marcosSB.weights)
    expect(ex.published).toEqual([{ label: 'marcos.utility', values: marcosSB.published.fK, decimals: 3 }])
  })
  it('Yazdani et al. 2019 (CoCoSo, example 1)', () => {
    const ex = getExample('yazdani-2019-logistics')!
    expect(ex.referenceFor).toEqual(['cocoso'])
    expect(ex.matrix).toEqual(cocosoY.matrix)
    expect(ex.alternatives).toEqual(cocosoY.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(cocosoY.types)
    expect(ex.weights).toEqual(cocosoY.weights)
    expect(ex.published).toEqual([{ label: 'cocoso.scores', values: cocosoY.published.k, decimals: 3 }])
  })
  it('Pamučar and Ćirović 2015 (MABAC, forklifts)', () => {
    const ex = getExample('pamucar-cirovic-2015-forklifts')!
    expect(ex.referenceFor).toEqual(['mabac'])
    expect(ex.matrix).toEqual(mabacPC.matrix)
    expect(ex.alternatives).toEqual(mabacPC.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(mabacPC.types)
    expect(ex.weights).toEqual(mabacPC.weights)
    expect(ex.published).toEqual([{ label: 'mabac.scores', values: mabacPC.published.S, decimals: 4 }])
  })
  it('Brauers and Zavadskas 2010 (MOORA, transition projects)', () => {
    const ex = getExample('brauers-zavadskas-2010-projects')!
    expect(ex.referenceFor).toEqual(['moora'])
    expect(ex.matrix).toEqual(mooraBZ.matrix)
    expect(ex.alternatives).toEqual(mooraBZ.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(mooraBZ.types)
    expect(ex.weights).toBeUndefined()
    expect(ex.equalWeights).toBe(true)
    expect(ex.published).toEqual([
      { label: 'moora.score', values: mooraBZ.expected.equalWeights.scores.map((v) => Number(v.toFixed(4))), decimals: 4 },
      { label: 'moora.unweighted', values: mooraBZ.published.y_star_unweighted, decimals: 4 },
    ])
  })
  it('Bakır and Atalık 2018 (ARAS, airlines)', () => {
    const ex = getExample('bakir-atalik-2018-airlines')!
    expect(ex.referenceFor).toEqual(['aras'])
    expect(ex.matrix).toEqual(arasBA.matrix)
    expect(ex.alternatives).toEqual(arasBA.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(arasBA.types)
    expect(ex.weights).toEqual(arasBA.weights)
    expect(ex.published).toEqual([{ label: 'aras.utilityDegree', values: arasBA.published.K, decimals: 6 }])
  })
  it('Badi et al. 2018 (CODAS, steelmaking suppliers)', () => {
    const ex = getExample('badi-2018-suppliers')!
    expect(ex.referenceFor).toEqual(['codas'])
    expect(ex.matrix).toEqual(codasG.badi2018.matrix)
    expect(ex.alternatives).toEqual(codasG.badi2018.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(codasG.badi2018.types)
    expect(ex.weights).toEqual(codasG.badi2018.weights)
    expect(ex.published).toEqual([
      { label: 'codas.euclidean', values: codasG.badi2018.published.E, decimals: 4 },
      { label: 'codas.taxicab', values: codasG.badi2018.published.T, decimals: 4 },
      { label: 'codas.score', values: codasG.badi2018.published.H, decimals: 4 },
    ])
  })
  it('Roszkowska 2013 (ROC, 5x5 criteria weighting)', () => {
    const ex = getExample('roszkowska-2013-rank-weights')!
    expect(ex.referenceFor).toEqual(['roc'])
    expect(ex.matrix).toEqual(rosz.matrix)
    expect(ex.alternatives).toEqual(rosz.alternatives)
    expect(ex.criteria.map((c) => c.type)).toEqual(rosz.types)
    expect(ex.weights).toBeUndefined()
    expect(ex.published).toEqual([{ label: 'roc.weights', values: rosz.expected.weights, decimals: 4 }])
  })
  it('every example has a DOI and a table reference', () => {
    for (const ex of examples) {
      for (const names of Object.values(ex.localAlternatives ?? {})) expect(names.length).toBe(ex.alternatives.length)
      expect(ex.citation.doi).toMatch(/^10\.\d{4,}\//)
      expect(ex.citation.tables.en).not.toBe('')
      expect(ex.citation.tables.tr).not.toBe('')
      expect(ex.matrix.length).toBe(ex.alternatives.length)
      for (const row of ex.matrix) expect(row.length).toBe(ex.criteria.length)
    }
  })
  it('short citations', () => {
    expect(shortCitation(getExample('krishnan-2021-smartphones')!.citation, 'en')).toBe('Krishnan et al. (2021)')
    expect(shortCitation(getExample('krishnan-2021-smartphones')!.citation, 'tr')).toBe('Krishnan vd. (2021)')
    expect(shortCitation(getExample('opricovic-tzeng-2004-f')!.citation, 'tr')).toBe('Opricovic ve Tzeng (2004)')
  })
})

describe('derived results', () => {
  it('CRITIC weights reproduce Krishnan et al. 2021 Table 5', () => {
    const w = computeWeights({ problem: draftOf('krishnan-2021-smartphones'), weightMethod: 'critic', manualWeights: [] })
    expect(w.value).not.toBeNull()
    expectClose(w.value!.weights, critic2021.expected.weights, critic2021.expected.tolerance)
  })

  it('manual weights + TOPSIS reproduce Opricovic and Tzeng 2004 Table 3', () => {
    const data = { problem: draftOf('opricovic-tzeng-2004-f'), weightMethod: 'manual' as const, manualWeights: [0.5, 0.5], rankingMethod: 'topsis' as const }
    const r = computeRanking(data)
    expectClose(r.value!.scores, f.expected.closeness, f.expected.tolerance)
    expect(r.value!.ranking).toEqual(f.expected.ranking)
  })

  it('Entropy weights reproduce Zavadskas et al. 2017 (data column order) and, with min-max, Krishnan et al. 2021', () => {
    const w = computeWeights({ problem: draftOf('zavadskas-2017-vilnius'), weightMethod: 'entropy', manualWeights: [] })
    expectClose(w.value!.weights, zavadskas.expected.weights, zavadskas.expected.tolerance)
    const k = computeWeights({
      problem: draftOf('krishnan-2021-smartphones'),
      weightMethod: 'entropy',
      manualWeights: [],
      methodParams: { entropy: { normalization: 'minmax' } },
    })
    expectClose(k.value!.weights, entropyK.expected.weights, entropyK.expected.tolerance)
  })

  it('SD weights reproduce Diakoulaki et al. 1995 through the store', () => {
    const w = computeWeights({ problem: draftOf('diakoulaki-1995-pharma'), weightMethod: 'sd', manualWeights: [] })
    expectClose(w.value!.weights, diak.published.weights, diak.expected.tolerance)
  })

  it('MEREC weights reproduce Keshavarz-Ghorabaee et al. 2021 through the store', () => {
    const w = computeWeights({ problem: draftOf('keshavarz-2021-merec'), weightMethod: 'merec', manualWeights: [] })
    expectClose(w.value!.weights, merecK.expected.weights, merecK.expected.tolerance.weights)
  })

  it('LOPCOW weights reproduce Keleş 2023 Table 6 through the store', () => {
    const w = computeWeights({ problem: draftOf('keles-2023-cities'), weightMethod: 'lopcow', manualWeights: [] })
    expectClose(w.value!.weights, lopcowK.published.weights, lopcowK.expected.tolerance_vs_published)
  })

  it('CILOS weights reproduce Zavadskas et al. 2017 Table 10 through the store', () => {
    const w = computeWeights({ problem: draftOf('zavadskas-2017-vilnius-social'), weightMethod: 'cilos', manualWeights: [] })
    expectClose(w.value!.weights, cilosZ.expected.weights, cilosZ.expected.tolerance)
  })

  it('MEREC blocks a zero cell with non-positive-value at that cell', () => {
    const problem = draftOf('keshavarz-2021-merec')
    problem.matrix[1]![2] = 0
    const w = computeWeights({ problem, weightMethod: 'merec', manualWeights: [] })
    expect(w.value).toBeNull()
    expect(w.issues).toContainEqual(expect.objectContaining({ code: 'non-positive-value', row: 1, col: 2 }))
  })

  it('ignores a saved option the method does not declare', () => {
    const base = computeWeights({ problem: draftOf('zavadskas-2017-vilnius'), weightMethod: 'entropy', manualWeights: [] })
    const odd = computeWeights({
      problem: draftOf('zavadskas-2017-vilnius'),
      weightMethod: 'entropy',
      manualWeights: [],
      methodParams: { entropy: { normalization: 'zscore', other: 3 } },
    })
    expect(odd.value!.weights).toEqual(base.value!.weights)
  })

  it('Entropy (sum) blocks on a negative value with its cell; min-max computes', () => {
    const p = draftOf('zavadskas-2017-vilnius')
    const matrix = p.matrix.map((r) => [...r]) as (number | null)[][]
    matrix[3]![1] = -5
    const draft = { ...p, matrix }
    const w = computeWeights({ problem: draft, weightMethod: 'entropy', manualWeights: [] })
    expect(w.value).toBeNull()
    expect(w.issues).toContainEqual({ code: 'negative-value', severity: 'error', row: 3, col: 1, value: -5 })
    const r = computeRanking({ problem: draft, weightMethod: 'entropy', manualWeights: [], rankingMethod: 'topsis' })
    expect(r.value).toBeNull()
    expect(r.issues.map((x) => x.code)).toContain('negative-value')
    const mm = computeWeights({ problem: draft, weightMethod: 'entropy', manualWeights: [], methodParams: { entropy: { normalization: 'minmax' } } })
    expect(mm.value).not.toBeNull()
  })

  it('equal weights are 1/n', () => {
    const w = computeWeights({ problem: draftOf('krishnan-2021-smartphones'), weightMethod: 'equal', manualWeights: [] })
    expect(w.value!.weights).toEqual([0.2, 0.2, 0.2, 0.2, 0.2])
  })

  it('an empty cell blocks weights and ranking with its position', () => {
    const p = draftOf('krishnan-2021-smartphones')
    const matrix = p.matrix.map((r) => [...r]) as (number | null)[][]
    matrix[1]![2] = null
    const draft = { ...p, matrix }
    expect(computeValidation(draft)).toContainEqual({ code: 'invalid-cell', severity: 'error', row: 1, col: 2 })
    const w = computeWeights({ problem: draft, weightMethod: 'critic', manualWeights: [] })
    expect(w.value).toBeNull()
    const r = computeRanking({ problem: draft, weightMethod: 'critic', manualWeights: [], rankingMethod: 'topsis' })
    expect(r.value).toBeNull()
    expect(r.issues.filter((x) => x.code === 'invalid-cell')).toHaveLength(1)
  })

  it('manual weights that do not sum to 1 block the ranking', () => {
    const r = computeRanking({ problem: draftOf('opricovic-tzeng-2004-f'), weightMethod: 'manual', manualWeights: [0.5, 0.45], rankingMethod: 'topsis' })
    expect(r.value).toBeNull()
    expect(r.issues.map((x) => x.code)).toContain('weights-sum')
  })

  it('a missing manual weight is reported, not read as 0', () => {
    const w = computeWeights({ problem: draftOf('opricovic-tzeng-2004-f'), weightMethod: 'manual', manualWeights: [0.5, null] })
    expect(w.value).toBeNull()
    expect(w.issues).toContainEqual({ code: 'invalid-weight', severity: 'error', col: 1 })
  })
})

describe('store actions', () => {
  it('loadExample sets the problem, names in the language and the published weights', () => {
    useWorkbench.getState().loadExample('opricovic-tzeng-2004-f', 'tr')
    const s = useWorkbench.getState()
    expect(s.exampleId).toBe('opricovic-tzeng-2004-f')
    expect(s.problem.criteria[0]!.name).toBe('Risk (1 ile 5 arası)')
    expect(s.weightMethod).toBe('manual')
    expect(s.manualWeights).toEqual([0.5, 0.5])
  })

  it('editing a cell clears the example; adding and removing keep shapes consistent', () => {
    const st = useWorkbench.getState()
    st.setCell(0, 0, 2)
    expect(useWorkbench.getState().exampleId).toBeNull()
    st.addCriterion({ name: 'C3', type: 'benefit' })
    let s = useWorkbench.getState()
    expect(s.problem.matrix.every((r) => r.length === 3)).toBe(true)
    expect(s.manualWeights).toEqual([0.5, 0.5, null])
    st.removeCriterion(0)
    s = useWorkbench.getState()
    expect(s.problem.criteria.map((c) => c.name)).toEqual(['Yükseklik (deniz seviyesinden m)', 'C3'])
    expect(s.manualWeights).toEqual([0.5, null])
    st.addAlternative('A4')
    st.removeAlternative(0)
    s = useWorkbench.getState()
    expect(s.problem.alternatives).toEqual(['A2', 'A3', 'A4'])
    expect(s.problem.matrix).toEqual([
      [3750, null],
      [4500, null],
      [null, null],
    ])
  })

  it('loadExample opens a weighting method\'s reference example with that method in its default variant', () => {
    const st = useWorkbench.getState()
    st.setMethodParam('entropy', 'normalization', 'minmax')
    st.loadExample('zavadskas-2017-vilnius', 'en')
    const s = useWorkbench.getState()
    expect(s.weightMethod).toBe('entropy')
    expect(s.methodParams?.entropy).toEqual({})
    const w = computeWeights(s)
    expectClose(w.value!.weights, zavadskas.expected.weights, zavadskas.expected.tolerance)
    useWorkbench.getState().loadExample('krishnan-2021-smartphones', 'en')
    expect(useWorkbench.getState().weightMethod).toBe('critic')
  })

  it('loadExample opens a ranking method\'s reference example with that method, its default variant and the paper\'s weights', () => {
    const st = useWorkbench.getState()
    st.setMethodParam('saw', 'normalization', 'sum')
    st.loadExample('podvezko-2011-baltic', 'tr')
    const s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('saw')
    expect(s.methodParams?.saw).toEqual({})
    expect(s.weightMethod).toBe('manual')
    expect(s.manualWeights).toEqual(podvezko.weights)
    expect(s.problem.criteria[3]!.name).toBe('İşsizlik oranı (%)')
    expect(s.problem.alternatives).toEqual(['Estonya', 'Letonya', 'Litvanya', 'Polonya'])
    const r = computeRanking(s)
    expectClose(r.value!.scores, podvezko.linearMax.expected.S, podvezko.linearMax.expected.tolerance)
    expect(r.value!.ranking).toEqual(podvezko.linearMax.expected.ranking)
    // Sum normalization through the store: Table 6.
    st.setMethodParam('saw', 'normalization', 'sum')
    const sum = computeRanking(useWorkbench.getState())
    expectClose(sum.value!.scores, podvezko.sum.published_table6.S, podvezko.sum.expected.tolerance)
    // A TOPSIS reference example switches back; one without a ranking reference keeps the method.
    st.setRankingMethod('saw')
    st.loadExample('krishnan-2021-smartphones', 'en')
    expect(useWorkbench.getState().rankingMethod).toBe('saw')
    st.loadExample('opricovic-tzeng-2004-f', 'en')
    expect(useWorkbench.getState().rankingMethod).toBe('topsis')
  })

  it('VIKOR through the store: its example, its v from the slider state, and the method page link', () => {
    const st = useWorkbench.getState()
    st.setMethodParam('vikor', 'v', 0.8)
    st.loadExample('keshavarz-2015-ten-alternatives', 'en')
    let s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('vikor')
    expect(s.methodParams?.vikor).toEqual({})
    const r = computeRanking(s)
    expect(r.value!.order).toBe('asc')
    expect(r.value!.ranking).toEqual(vikorKG.published_ranks[0])
    expectClose(r.value!.scores, vikorKG.derived.Q_set1, vikorKG.derived.tolerance)
    // v from the store reaches the method; S and R stay, Q changes.
    st.setMethodParam('vikor', 'v', 1)
    const r1 = computeRanking(useWorkbench.getState())
    expect(r1.value!.diagnostics?.v).toBe(1)
    expect(r1.value!.scores).not.toEqual(r.value!.scores)
    // An out-of-range v (old or hand-edited state) falls back to the default.
    st.setMethodParam('vikor', 'v', 7)
    expect(computeRanking(useWorkbench.getState()).value!.scores).toEqual(r.value!.scores)
    // An example shared with TOPSIS: the link asks for VIKOR; without it, the current method stays if it is listed.
    st.loadExample('opricovic-tzeng-2004-f', 'en', 'vikor')
    s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('vikor')
    expectClose(computeRanking(s).value!.scores, vikorOT.expected.Q, vikorOT.expected.tolerance)
    st.loadExample('opricovic-tzeng-2004-phi', 'en')
    expect(useWorkbench.getState().rankingMethod).toBe('vikor')
    st.setRankingMethod('saw')
    st.loadExample('opricovic-tzeng-2004-f', 'en')
    expect(useWorkbench.getState().rankingMethod).toBe('topsis')
    st.loadExample('opricovic-tzeng-2004-f', 'en', 'nope')
    expect(useWorkbench.getState().rankingMethod).toBe('topsis')
  })

  it('WASPAS through the store: its example opens with WASPAS and the SWARA weights, λ from the slider state', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.setMethodParam('waspas', 'lambda', 0.9)
    st.loadExample('adali-2017-suppliers', 'en')
    const s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('waspas')
    expect(s.weightMethod).toBe('manual')
    expect(s.methodParams?.waspas).toEqual({})
    const at = (k: number) => waspasA.expected.Q_table7.map((row) => row[k]!)
    const r = computeRanking(s)
    expectClose(r.value!.scores, at(5), waspasA.expected.tolerance.Q)
    expect(r.value!.ranking).toEqual(waspasA.expected.ranking['lambda_0.4_to_0.8'])
    st.setMethodParam('waspas', 'lambda', 1)
    const r1 = computeRanking(useWorkbench.getState())
    expectClose(r1.value!.scores, at(10), waspasA.expected.tolerance.Q)
    expect(r1.value!.ranking).toEqual(waspasA.expected.ranking['lambda_0.9_to_1'])
  })

  it('COPRAS through the store: the cream separators open with Entropy weights and COPRAS, Q and ranks as published', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.loadExample('ozcan-celik-2021-separators', 'en')
    const s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('copras')
    expect(s.weightMethod).toBe('entropy')
    const r = computeRanking(s)
    expectClose(r.value!.scores, coprasOC.published.Q_table11, coprasOC.expected.tolerance)
    expect(r.value!.ranking).toEqual(coprasOC.expected.ranking)
    expect(r.value!.warnings).toEqual([])
  })

  it('MARCOS through the store: the drivers open with the paper weights and MARCOS, f(K) and ranks as published', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.loadExample('stevic-brkovic-2020-drivers', 'en')
    const s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('marcos')
    expect(s.weightMethod).toBe('manual')
    const r = computeRanking(s)
    expectClose(r.value!.scores, marcosSB.published.fK, marcosSB.expected.tolerance)
    expect(r.value!.ranking).toEqual(marcosSB.published.ranking)
  })

  it('CoCoSo through the store: the logistics example opens with CoCoSo and the paper weights, λ from the slider state', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.setMethodParam('cocoso', 'lambda', 0.9)
    st.loadExample('yazdani-2019-logistics', 'en')
    const s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('cocoso')
    expect(s.weightMethod).toBe('manual')
    expect(s.methodParams?.cocoso).toEqual({})
    const r = computeRanking(s)
    expectClose(r.value!.scores, cocosoY.published.k, cocosoY.expected.tolerance_vs_published.k)
    expect(r.value!.ranking).toEqual(cocosoY.published.ranking)
    st.setMethodParam('cocoso', 'lambda', 0)
    const r0 = computeRanking(useWorkbench.getState())
    expect(r0.value!.scores).not.toEqual(r.value!.scores)
    expect(r0.value!.ranking).toEqual(cocosoY.published.ranking)
  })

  it('MABAC through the store: the forklifts open with MABAC and the paper weights', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.loadExample('pamucar-cirovic-2015-forklifts', 'en')
    const s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('mabac')
    expect(s.weightMethod).toBe('manual')
    const r = computeRanking(s)
    expectClose(r.value!.scores, mabacPC.published.S, mabacPC.expected.tolerance_vs_published.S)
    expect(r.value!.ranking).toEqual(mabacPC.published.ranking)
  })

  it('MOORA through the store: the transition projects open with MOORA and equal weights', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.loadExample('brauers-zavadskas-2010-projects', 'en')
    const s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('moora')
    expect(s.weightMethod).toBe('equal')
    const r = computeRanking(s)
    expectClose(r.value!.scores, mooraBZ.expected.equalWeights.scores, mooraBZ.expected.tolerance_exact)
    expectClose(r.value!.scores.map((y) => y * 9), mooraBZ.published.y_star_unweighted, mooraBZ.expected.tolerance_vs_published_unweighted)
    expect(r.value!.ranking).toEqual(mooraBZ.published.ranking)
  })

  it('ARAS through the store: the airlines open with ARAS and the paper weights', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.loadExample('bakir-atalik-2018-airlines', 'en')
    const s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('aras')
    expect(s.weightMethod).toBe('manual')
    const r = computeRanking(s)
    expectClose(r.value!.scores, arasBA.published.K, arasBA.expected.tolerance_vs_published.K)
    expect(r.value!.ranking).toEqual(arasBA.published.ranking)
  })

  it('CODAS through the store: the steelmaking suppliers open with CODAS and the paper weights, τ from the slider state', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.setMethodParam('codas', 'tau', 0.08)
    st.loadExample('badi-2018-suppliers', 'en')
    const s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('codas')
    expect(s.weightMethod).toBe('manual')
    expect(s.methodParams?.codas).toEqual({})
    const r = computeRanking(s)
    expectClose(r.value!.scores, codasG.badi2018.published.H, codasG.badi2018.published.tolerance)
    expect(r.value!.ranking).toEqual(codasG.badi2018.published.ranking)
  })

  it('EDAS through the store: the 47 items open with EDAS and equal weights, the ten alternatives through the method page link', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.loadExample('keshavarz-2015-inventory', 'en')
    let s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('edas')
    expect(s.weightMethod).toBe('equal')
    const r = computeRanking(s)
    expect(r.value!.order).toBe('desc')
    expectClose(r.value!.scores, edasKG.inventory.expected.AS, edasKG.inventory.expected.tolerance)
    // Shared with VIKOR: the EDAS page asks for EDAS; without it the current method stays because it is listed.
    st.setRankingMethod('topsis')
    st.loadExample('keshavarz-2015-ten-alternatives', 'en', 'edas')
    s = useWorkbench.getState()
    expect(s.rankingMethod).toBe('edas')
    expect(s.weightMethod).toBe('manual')
    expect(computeRanking(s).value!.ranking).toEqual(edasKG.tenAlternatives.published_ranks[0])
    expectClose(computeRanking(s).value!.scores, edasKG.tenAlternatives.derived_AS_renormalized_weights[0]!, 1e-6)
    st.loadExample('keshavarz-2015-ten-alternatives', 'en')
    expect(useWorkbench.getState().rankingMethod).toBe('edas')
  })

  it('EDAS blocks a varying column whose average is 0 or below at its criterion; negative values with a positive average compute with a notice', () => {
    const p = draftOf('keshavarz-2015-ten-alternatives')
    const data = { weightMethod: 'manual' as const, manualWeights: edasKG.tenAlternatives.weight_sets_as_printed[0]!, rankingMethod: 'edas' as const }
    const shifted = p.matrix.map((row) => row.map((x, j) => (j === 0 && x !== null ? x - 30 : x)))
    const blocked = computeRanking({ ...data, problem: { ...p, matrix: shifted } })
    expect(blocked.value).toBeNull()
    expect(blocked.issues.filter((x) => x.severity === 'error').map((x) => [x.code, x.col])).toEqual([['non-positive-average', 0]])
    const negative = p.matrix.map((row, i) => row.map((x, j) => (j === 0 && i === 9 ? -8 : x)))
    const r = computeRanking({ ...data, problem: { ...p, matrix: negative } })
    expect(r.value!.warnings).toEqual([{ code: 'edas.negative-values', col: 0 }])
  })

  it('SAW blocks a zero or negative cell with its position; TOPSIS on the same data computes', () => {
    const p = draftOf('podvezko-2011-baltic')
    const matrix = p.matrix.map((r) => [...r]) as (number | null)[][]
    matrix[2]![3] = 0
    const data = { problem: { ...p, matrix }, weightMethod: 'manual' as const, manualWeights: podvezko.weights }
    const r = computeRanking({ ...data, rankingMethod: 'saw' })
    expect(r.value).toBeNull()
    expect(r.issues).toContainEqual({ code: 'non-positive-value', severity: 'error', row: 2, col: 3, value: 0 })
    expect(computeRanking({ ...data, rankingMethod: 'topsis' }).value).not.toBeNull()
  })

  it('setMethodParam keeps other methods and keys', () => {
    const st = useWorkbench.getState()
    st.reset()
    st.setMethodParam('entropy', 'normalization', 'minmax')
    st.setMethodParam('vikor', 'v', 0.5)
    expect(useWorkbench.getState().methodParams).toEqual({ entropy: { normalization: 'minmax' }, vikor: { v: 0.5 } })
  })

  it('a state saved before method options existed loads, with no options', async () => {
    useWorkbench.getState().reset()
    const storage = useWorkbench.persist.getOptions().storage!
    const old = initialWorkbench() as Partial<ReturnType<typeof initialWorkbench>>
    delete old.methodParams
    await storage.setItem(WORKBENCH_STORAGE_KEY, { state: { ...old, weightMethod: 'critic', exampleId: 'x' }, version: 1 })
    await useWorkbench.persist.rehydrate()
    const s = useWorkbench.getState()
    expect(s.exampleId).toBe('x')
    expect(s.methodParams).toEqual({})
    expect(computeWeights({ ...s, problem: draftOf('krishnan-2021-smartphones') }).value).not.toBeNull()
  })

  it('a deleted criterion takes its own weight with it, and undo brings it back (grid delete, Podvezko 2011)', () => {
    const st = useWorkbench.getState()
    st.loadExample('podvezko-2011-baltic', 'en')
    const before = useWorkbench.getState().problem
    // The grid's Delete criterion on Production growth (column 1), then its undo (the earlier table object).
    st.setProblem(deleteCriterion(before, 1))
    let s = useWorkbench.getState()
    expect(s.problem.criteria.map((c) => c.name)).not.toContain(before.criteria[1]!.name)
    expect(s.manualWeights).toEqual([0.35, 0.17, 0.25, 0.13])
    st.setProblem(before)
    s = useWorkbench.getState()
    expect(s.manualWeights).toEqual(podvezko.weights)
    // An inserted criterion starts empty; the others keep theirs.
    st.setProblem(insertCriterion(useWorkbench.getState().problem, 2, 'New'))
    expect(useWorkbench.getState().manualWeights).toEqual([0.35, 0.1, null, 0.17, 0.25, 0.13])
  })

  it('renaming or turning a criterion keeps its weight in place', () => {
    const st = useWorkbench.getState()
    st.loadExample('podvezko-2011-baltic', 'en')
    const p = useWorkbench.getState().problem
    st.setProblem(writeCell(p, { row: 0, col: 2 }, 'Growth', Number).problem)
    st.setProblem(setType(useWorkbench.getState().problem, 3, 'benefit'))
    expect(useWorkbench.getState().manualWeights).toEqual(podvezko.weights)
  })

  it('undo after loading an example brings back the earlier example\'s methods and weights', () => {
    const st = useWorkbench.getState()
    st.setRankingMethod('topsis')
    st.loadExample('krishnan-2021-smartphones', 'en')
    const krishnan = useWorkbench.getState().problem
    st.loadExample('podvezko-2011-baltic', 'en')
    const baltic = useWorkbench.getState().problem
    expect(useWorkbench.getState().rankingMethod).toBe('saw')
    st.setProblem(krishnan) // undo
    let s = useWorkbench.getState()
    expect(s.exampleId).toBe('krishnan-2021-smartphones')
    expect(s.weightMethod).toBe('critic')
    expect(s.rankingMethod).toBe('topsis')
    st.setProblem(baltic) // redo
    s = useWorkbench.getState()
    expect(s.exampleId).toBe('podvezko-2011-baltic')
    expect(s.weightMethod).toBe('manual')
    expect(s.manualWeights).toEqual(podvezko.weights)
    expect(s.rankingMethod).toBe('saw')
  })

  it('an import matches weights by criterion name only, and undo restores what was there', () => {
    const st = useWorkbench.getState()
    st.loadExample('podvezko-2011-baltic', 'en')
    const baltic = useWorkbench.getState().problem
    const file: DraftProblem = {
      alternatives: ['X', 'Y'],
      criteria: [{ name: 'a', type: 'benefit' }, { name: baltic.criteria[3]!.name, type: 'cost' }, { name: 'c', type: 'benefit' }, { name: 'd', type: 'benefit' }, { name: 'e', type: 'benefit' }],
      matrix: [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]],
    }
    st.importProblem(file, 'data.csv')
    expect(useWorkbench.getState().manualWeights).toEqual([null, 0.25, null, null, null])
    st.setProblem(baltic) // undo
    const s = useWorkbench.getState()
    expect(s.exampleId).toBe('podvezko-2011-baltic')
    expect(s.manualWeights).toEqual(podvezko.weights)
  })

  it('an unchanged example follows the language; an edited one keeps its names', () => {
    const st = useWorkbench.getState()
    st.loadExample('podvezko-2011-baltic', 'en')
    expect(useWorkbench.getState().problem.alternatives).toContain('Lithuania')
    st.localizeExample('tr')
    let s = useWorkbench.getState()
    expect(s.problem.alternatives).toEqual(['Estonya', 'Letonya', 'Litvanya', 'Polonya'])
    expect(s.problem.criteria[3]!.name).toBe('İşsizlik oranı (%)')
    expect(s.exampleId).toBe('podvezko-2011-baltic')
    expect(s.manualWeights).toEqual(podvezko.weights)
    st.setCell(0, 0, 1)
    st.localizeExample('en')
    s = useWorkbench.getState()
    expect(s.problem.alternatives).toContain('Litvanya')
  })

  it('startBlank and reset', () => {
    useWorkbench.getState().startBlank(2, 4)
    const s = useWorkbench.getState()
    expect(s.problem.matrix).toEqual([
      [null, null, null, null],
      [null, null, null, null],
    ])
    expect(s.problem.criteria.map((c) => c.name)).toEqual(['C1', 'C2', 'C3', 'C4'])
    useWorkbench.getState().reset()
    expect(useWorkbench.getState().problem.alternatives).toEqual([])
  })
})

describe('BWM through the store', () => {
  it('Rezaei 2016 Ex2 answers on the Krishnan criteria give the paper weights; incomplete answers block the ranking with judgements-incomplete', () => {
    const st = () => useWorkbench.getState()
    st().loadExample('krishnan-2021-smartphones', 'en')
    st().setWeightMethod('bwm')
    expect(computeRanking(st()).issues).toContainEqual({ code: 'anchors-missing', severity: 'error' })
    // Best 1, worst 4 (0-based) and a_BW alone: 1 of the 2n - 3 = 7 answers.
    st().setAnchors(1, 4)
    st().setJudgement(1, 4, 8)
    expect(computeRanking(st()).issues).toContainEqual({ code: 'judgements-incomplete', severity: 'error', value: 1 })
    const others = [0, 2, 3]
    others.forEach((j, k) => {
      st().setJudgement(1, j, [2, 4, 3][k]!)
      st().setJudgement(j, 4, [4, 2, 3][k]!)
    })
    const w = computeWeights(st())
    expect(w.value).not.toBeNull()
    expectClose(w.value!.weights, [0.229508, 0.448087, 0.114754, 0.153005, 0.054645], 1e-6)
  })
})

describe('AHP through the store', () => {
  it('Saaty 2008 job answers on the Krishnan criteria give the eigenvector and geometric-mean weights; incomplete answers block with judgements-incomplete', () => {
    const st = () => useWorkbench.getState()
    st().loadExample('krishnan-2021-smartphones', 'en')
    st().setWeightMethod('ahp')
    st().setJudgement(0, 1, 1 / 4)
    expect(computeRanking(st()).issues).toContainEqual({ code: 'judgements-incomplete', severity: 'error', value: 1 })
    const upper = [1 / 4, 1 / 6, 1 / 4, 1 / 8, 1 / 3, 3, 1 / 7, 4, 1 / 2, 1 / 7]
    let idx = 0
    for (let i = 0; i < 5; i++) {
      for (let k = i + 1; k < 5; k++) {
        st().setJudgement(i, k, upper[idx++]!)
      }
    }
    const w = computeWeights(st())
    expect(w.value).not.toBeNull()
    expectClose(w.value!.weights, [0.0360501, 0.1219027, 0.2618926, 0.0745529, 0.5056017], 1e-6)
    st().setMethodParam('ahp', 'aggregation', 'geometric')
    const g = computeWeights(st())
    expect(g.value).not.toBeNull()
    expectClose(g.value!.weights, [0.0351085, 0.1185434, 0.2714848, 0.0721176, 0.5027456], 1e-6)
  })
})
