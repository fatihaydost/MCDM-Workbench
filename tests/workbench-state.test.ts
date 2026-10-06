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
import { expectClose } from './helpers'
import critic2021 from './fixtures/critic-krishnan2021.json'
import entropyK from './fixtures/entropy-krishnan2021-minmax.json'
import zavadskas from './fixtures/entropy-zavadskas2017.json'
import f from './fixtures/opricovic-tzeng-2004-f.json'
import phi from './fixtures/opricovic-tzeng-2004-phi.json'
import podvezko from './fixtures/saw-podvezko2011.json'

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
