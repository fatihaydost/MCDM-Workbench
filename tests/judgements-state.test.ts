import { describe, expect, it } from 'vitest'
import { getExample } from '../src/data/examples'
import { initialWorkbench, useWorkbench, WORKBENCH_STORAGE_KEY, type DraftProblem, type WorkbenchState } from '../src/state/workbench'
import { deleteCriterion, insertCriterion, setType, writeCell } from '../src/features/grid/model'

const draftOf = (id: string): DraftProblem => {
  const ex = getExample(id)!
  return {
    alternatives: ex.alternatives,
    criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
    matrix: ex.matrix,
  }
}

const KRISHNAN = 'krishnan-2021-smartphones'

/** The store's judgements are always n × n for the current criteria. */
function square(s: WorkbenchState) {
  const n = s.problem.criteria.length
  expect(s.judgements!.pairs.length).toBe(n)
  for (const row of s.judgements!.pairs) expect(row.length).toBe(n)
}

/** Krishnan 2021 (Price, Screen size, Pixel density, Thickness, Mass), edited so it is no longer the example, answered. */
function answered(): DraftProblem {
  const st = useWorkbench.getState()
  st.loadExample(KRISHNAN, 'en')
  st.setCell(0, 0, 999) // an edit: the table is the user's own, so undo goes through the criterion memory
  st.setAnchors(1, 4)
  st.setJudgement(1, 4, 8)
  st.setJudgement(1, 0, 2)
  st.setJudgement(0, 4, 4)
  return useWorkbench.getState().problem
}

describe('judgements in the store', () => {
  it('setJudgement writes both cells; setAnchors never keeps best = worst', () => {
    answered()
    let s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.pairs[1]![4]).toBe(8)
    expect(s.judgements!.pairs[4]![1]).toBe(1 / 8)
    expect(s.judgements!.pairs[0]![1]).toBe(1 / 2)
    s.setAnchors(2, 2)
    s = useWorkbench.getState()
    expect(s.judgements!.best).toBe(2)
    expect(s.judgements!.worst).toBeNull()
  })

  it('grid delete of a plain criterion re-indexes, undo brings everything back', () => {
    const before = answered()
    const st = useWorkbench.getState()
    st.setProblem(deleteCriterion(before, 0))
    let s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.best).toBe(0)
    expect(s.judgements!.worst).toBe(3)
    expect(s.judgements!.pairs[0]![3]).toBe(8)
    st.setProblem(before)
    s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.best).toBe(1)
    expect(s.judgements!.worst).toBe(4)
    expect(s.judgements!.pairs[1]![0]).toBe(2)
    expect(s.judgements!.pairs[0]![1]).toBe(1 / 2)
    expect(s.judgements!.pairs[0]![4]).toBe(4)
    expect(s.judgements!.pairs[4]![0]).toBe(1 / 4)
  })

  it('deleting the best criterion clears the anchor; undo restores it', () => {
    const before = answered()
    const st = useWorkbench.getState()
    st.setProblem(deleteCriterion(before, 1))
    let s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.best).toBeNull()
    expect(s.judgements!.worst).toBe(3)
    st.setProblem(before)
    s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.best).toBe(1)
    expect(s.judgements!.worst).toBe(4)
    expect(s.judgements!.pairs[1]![4]).toBe(8)
  })

  it('insert, rename and type change keep answers on their criteria', () => {
    const before = answered()
    const st = useWorkbench.getState()
    st.setProblem(insertCriterion(before, 2, 'New'))
    let s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.pairs[1]![5]).toBe(8)
    expect(s.judgements!.pairs[2]).toEqual([null, null, 1, null, null, null])
    expect(s.judgements!.best).toBe(1)
    expect(s.judgements!.worst).toBe(5)
    const j = s.judgements
    st.setProblem(writeCell(s.problem, { row: 0, col: 2 }, 'Screen', Number).problem) // rename the best criterion
    st.setProblem(setType(useWorkbench.getState().problem, 4, 'benefit'))
    s = useWorkbench.getState()
    square(s)
    expect(s.problem.criteria[1]!.name).toBe('Screen')
    expect(s.judgements).toEqual(j)
  })

  it('addCriterion and removeCriterion actions', () => {
    answered()
    const st = useWorkbench.getState()
    st.addCriterion({ name: 'X', type: 'benefit' })
    let s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.pairs.length).toBe(6)
    expect(s.judgements!.pairs[5]).toEqual([null, null, null, null, null, 1])
    expect(s.judgements!.pairs[1]![4]).toBe(8)
    st.removeCriterion(5)
    st.removeCriterion(0)
    s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.pairs.length).toBe(4)
    expect(s.judgements!.best).toBe(0)
    expect(s.judgements!.worst).toBe(3)
    expect(s.judgements!.pairs[0]![3]).toBe(8)
    st.removeCriterion(0) // the best one
    s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.best).toBeNull()
    expect(s.judgements!.worst).toBe(2)
  })

  it('import matches by name only', () => {
    answered()
    const file: DraftProblem = {
      alternatives: ['X', 'Y'],
      criteria: ['Mass', 'Price', 'a', 'b', 'c'].map((name) => ({ name, type: 'benefit' as const })),
      matrix: [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]],
    }
    useWorkbench.getState().importProblem(file, 'data.csv')
    const s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.worst).toBe(0)
    expect(s.judgements!.best).toBeNull()
    expect(s.judgements!.pairs[1]![0]).toBe(4)
    expect(s.judgements!.pairs[0]![1]).toBe(1 / 4)
    expect(s.judgements!.pairs[2]![0]).toBeNull()
  })

  it('loading an example starts empty; undo restores the earlier answers', () => {
    const krishnan = answered()
    const st = useWorkbench.getState()
    st.loadExample('podvezko-2011-baltic', 'en')
    let s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.best).toBeNull()
    expect(s.judgements!.worst).toBeNull()
    s.judgements!.pairs.forEach((row, i) => row.forEach((v, k) => expect(v).toBe(i === k ? 1 : null)))
    st.setProblem(krishnan) // undo
    s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.pairs[1]![4]).toBe(8)
    expect(s.judgements!.best).toBe(1)
  })

  it('answers survive switching the weighting method away and back', () => {
    answered()
    const j = useWorkbench.getState().judgements
    useWorkbench.getState().setWeightMethod('manual')
    useWorkbench.getState().setWeightMethod('critic')
    expect(useWorkbench.getState().judgements).toBe(j)
  })

  it('a saved state without judgements, or with broken ones, loads sanitized', async () => {
    const storage = useWorkbench.persist.getOptions().storage!
    const problem = draftOf(KRISHNAN)
    const old = { ...initialWorkbench(), problem } as Partial<ReturnType<typeof initialWorkbench>>
    delete old.judgements
    await storage.setItem(WORKBENCH_STORAGE_KEY, { state: old, version: 1 })
    await useWorkbench.persist.rehydrate()
    let s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.best).toBeNull()

    const broken = { pairs: [[1, 11], [null, 1]], best: 2, worst: 2 }
    await storage.setItem(WORKBENCH_STORAGE_KEY, { state: { ...old, judgements: broken }, version: 1 })
    await useWorkbench.persist.rehydrate()
    s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.pairs[0]![1]).toBeNull()
    expect(s.judgements!.best).toBeNull()
    expect(s.judgements!.worst).toBeNull()
  })

  it('a saved state whose problem lacks criteria falls back to the current problem instead of throwing', async () => {
    const storage = useWorkbench.persist.getOptions().storage!
    const old = { ...initialWorkbench(), stage: 'ranking', problem: { alternatives: ['A'] } } as unknown
    await storage.setItem(WORKBENCH_STORAGE_KEY, { state: old, version: 1 })
    await useWorkbench.persist.rehydrate()
    const s = useWorkbench.getState()
    expect(s.stage).toBe('ranking') // the rest of the saved state still loaded (a throwing merge would drop it)
    expect(Array.isArray(s.problem.criteria)).toBe(true)
    square(s)
  })

  it('startBlank and reset empty the answers', () => {
    answered()
    const st = useWorkbench.getState()
    st.startBlank(3, 4)
    let s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.pairs[0]).toEqual([1, null, null, null])
    expect(s.judgements!.best).toBeNull()
    st.reset()
    s = useWorkbench.getState()
    square(s)
    expect(s.judgements!.pairs).toEqual([])
  })
})
