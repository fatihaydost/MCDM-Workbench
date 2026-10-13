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
import vikorKG from './fixtures/vikor-keshavarz2015.json'
import vikorOT from './fixtures/vikor-opricovic-tzeng2004.json'

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
