import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  emptyAlternativeJudgements,
  emptyJudgements,
  getRankingMethod,
  getWeightingMethod,
  hasErrors,
  prepareRanking,
  ProblemValidationError,
  remapAlternativeJudgements,
  remapJudgements,
  resolveParams,
  sanitizeAlternativeJudgements,
  sanitizeJudgements,
  setAlternativePair,
  setAlternativeSource,
  setPair,
  validateProblem,
  validateWeights,
  type AlternativeJudgements,
  type Computed,
  type Criterion,
  type Judgements,
  type MethodParams,
  type MethodParamValue,
  type Problem,
  type RankingId,
  type Ratio,
  type RankingResult,
  type RankingRun,
  type ValidationIssue,
  type WeightingId,
  type WeightingResult,
} from '../core'
import { alternativeNames, getExample } from '../data/examples'
import type { Lang } from '../i18n/lang'

/** The workbench stages, in order. Robustness reads the ranking of the stages before it and changes nothing. */
export const STAGES = ['data', 'weights', 'ranking', 'results', 'robustness', 'compare'] as const
export type Stage = (typeof STAGES)[number]

/** The core's weighting methods plus 'manual' (the user's own weights, which only the store knows). */
export type WeightMethodId = WeightingId | 'manual'
export type RankingMethodId = RankingId

/**
 * Options chosen per method id (Entropy's normalization, later VIKOR's v ...). A missing method or key means the
 * method's default; values are checked against the method's descriptor before a method sees them.
 */
export type MethodParamsState = Partial<Record<string, Record<string, MethodParamValue>>>

/** Raw user input. A null cell is an empty cell (never read as 0). */
export type DraftProblem = {
  alternatives: string[]
  criteria: Criterion[]
  matrix: (number | null)[][]
}

export type WorkbenchData = {
  problem: DraftProblem
  weightMethod: WeightMethodId
  /** One entry per criterion; null = not entered yet. Only used when weightMethod is 'manual'. */
  manualWeights: (number | null)[]
  rankingMethod: RankingMethodId
  stage: Stage
  /** Id of the loaded example (src/data/examples.ts), cleared by the first edit of the data. */
  exampleId: string | null
  /** File name of the last import, cleared by the first edit of the data (like exampleId). */
  importedFrom?: string | null
  /** Method options by method id. Optional: a state saved before options existed loads without it. */
  methodParams?: MethodParamsState | undefined
  /** Pairwise answers about the criteria (AHP, BWM), n × n for the current criteria; travels like manualWeights. */
  judgements?: Judgements | undefined
  /** Optional pairwise alternative comparison matrices per criterion (AHP ranking, m <= 7). */
  alternativeJudgements?: AlternativeJudgements | undefined
}

export type WorkbenchActions = {
  setStage: (stage: Stage) => void
  /**
   * Replaces the whole problem (every grid edit, paste, undo and redo). Manual weights follow their criteria (see
   * `carryWeights`); a problem that was on screen as a loaded example or import brings back the methods and weights
   * it had then (undo after loading an example).
   */
  setProblem: (problem: DraftProblem) => void
  /** Replaces the problem with one read from a file and remembers the file name as the source. */
  importProblem: (problem: DraftProblem, fileName: string) => void
  /** Loads a published example; criterion names in `lang`. Sets manual weights when the paper gives them. */
  /**
   * Loads a published example. `method` (a ranking method id the example is a reference for) picks which of its
   * ranking methods opens, e.g. the VIKOR page's link to the Opricovic and Tzeng example that TOPSIS shares.
   */
  loadExample: (id: string, lang: Lang, method?: string) => void
  /** While a loaded example is unchanged, writes its alternative and criterion names in `lang` (language switch). */
  localizeExample: (lang: Lang) => void
  /** Empty m x n table with default names (A1.., C1..). */
  startBlank: (m?: number, n?: number, names?: { alternative: (i: number) => string; criterion: (j: number) => string }) => void
  setCell: (row: number, col: number, value: number | null) => void
  setAlternativeName: (row: number, name: string) => void
  setCriterion: (col: number, patch: Partial<Criterion>) => void
  addAlternative: (name: string) => void
  removeAlternative: (row: number) => void
  addCriterion: (criterion: Criterion) => void
  removeCriterion: (col: number) => void
  setWeightMethod: (method: WeightMethodId) => void
  setManualWeight: (col: number, value: number | null) => void
  /** Writes the answer for criteria i over k and its reciprocal. */
  setJudgement: (i: number, k: number, value: Ratio | null) => void
  /** BWM's best and worst criteria; when both are the same index, worst becomes null. */
  setAnchors: (best: number | null, worst: number | null) => void
  /** Switches criterion `col` between decision-matrix values ('table' / 'matrix') and pairwise alternative comparisons ('pairwise'). */
  setCriterionSource: (col: number, source: 'table' | 'matrix' | 'pairwise') => void
  /** Writes the pairwise comparison for alternatives i over k on criterion `col` and its reciprocal. */
  setAlternativeJudgement: (col: number, i: number, k: number, value: Ratio | null) => void
  setRankingMethod: (method: RankingMethodId) => void
  /** Sets one option of one method (weighting or ranking), e.g. ('entropy', 'normalization', 'minmax'). */
  setMethodParam: (methodId: string, key: string, value: MethodParamValue) => void
  reset: () => void
}

export type WorkbenchState = WorkbenchData & WorkbenchActions

/** localStorage key; bump the suffix and `version` together when the stored shape changes. */
export const WORKBENCH_STORAGE_KEY = 'kds.workbench.v1'
const STORAGE_VERSION = 1

/**
 * localStorage when it works, otherwise an in-memory map (storage blocked, private mode, Node
 * tests), so persistence degrades to "this page view only" instead of throwing.
 */
function safeStorage(): Storage {
  try {
    const ls = globalThis.localStorage
    if (ls && typeof ls.setItem === 'function') {
      const probe = '__kds_probe__'
      ls.setItem(probe, probe)
      ls.removeItem(probe)
      return ls
    }
  } catch {
    // fall through
  }
  const mem = new Map<string, string>()
  return {
    get length() {
      return mem.size
    },
    clear: () => mem.clear(),
    getItem: (k) => mem.get(k) ?? null,
    key: (i) => [...mem.keys()][i] ?? null,
    removeItem: (k) => void mem.delete(k),
    setItem: (k, v) => void mem.set(k, String(v)),
  }
}

const emptyProblem = (): DraftProblem => ({ alternatives: [], criteria: [], matrix: [] })

export const initialWorkbench = (): WorkbenchData => ({
  problem: emptyProblem(),
  weightMethod: 'critic',
  manualWeights: [],
  rankingMethod: 'topsis',
  stage: 'data',
  exampleId: null,
  importedFrom: null,
  methodParams: {},
  judgements: emptyJudgements(0),
  alternativeJudgements: emptyAlternativeJudgements(0),
})

const judgementsOf = (s: Pick<WorkbenchData, 'problem' | 'judgements'>): Judgements =>
  s.judgements ?? emptyJudgements(s.problem.criteria.length)

const altJudgementsOf = (s: Pick<WorkbenchData, 'problem' | 'alternativeJudgements'>): AlternativeJudgements =>
  s.alternativeJudgements ?? emptyAlternativeJudgements(s.problem.criteria.length)

const fitWeights = (w: (number | null)[], n: number): (number | null)[] =>
  Array.from({ length: n }, (_, j) => w[j] ?? null)

/**
 * The last weight of every criterion object that left the table, so a criterion deleted and brought back by undo gets
 * its weight back. Grid edits keep the objects of the criteria they do not touch, and history keeps the old objects.
 */
const weightMemory = new WeakMap<Criterion, number | null>()

function memorize(criteria: readonly Criterion[], weights: readonly (number | null)[]): void {
  criteria.forEach((c, j) => weightMemory.set(c, weights[j] ?? null))
}

/**
 * Where each new criterion was before: next index → old index, or undefined for a criterion not in the old list.
 * Matched to the criterion and not to the column position (deleting the second criterion must not move the third
 * one's data onto it). In order: the same criterion object (the grid keeps the objects it does not change), then a
 * criterion `remembered` from before (undo of a delete; the caller fills it from its memory, so the later passes skip
 * it), the same name, and, only when `byPosition` and the number of criteria is unchanged, the same column (a rename or
 * a direction change creates a new object in place).
 */
export function matchCriteria(
  oldCriteria: readonly Criterion[],
  next: readonly Criterion[],
  byPosition: boolean,
  remembered: (c: Criterion) => boolean = () => false,
): (number | undefined)[] {
  const used = new Set<number>()
  const take = (j: number) => {
    used.add(j)
    return j
  }
  const out: (number | undefined)[] = next.map((c) => {
    const j = oldCriteria.findIndex((o, k) => o === c && !used.has(k))
    return j >= 0 ? take(j) : undefined
  })
  const open = next.map((c, i) => out[i] === undefined && !remembered(c))
  next.forEach((c, i) => {
    if (!open[i]) return
    const j = oldCriteria.findIndex((o, k) => !used.has(k) && o.name === c.name)
    if (j >= 0) {
      out[i] = take(j)
      open[i] = false
    }
  })
  if (byPosition && next.length === oldCriteria.length) {
    next.forEach((_, i) => {
      if (open[i] && !used.has(i)) out[i] = take(i)
    })
  }
  return out
}

/** Manual weights for a new list of criteria: `matchCriteria`, and the weight memory for criteria seen before. */
export function carryWeights(
  oldCriteria: readonly Criterion[],
  oldWeights: readonly (number | null)[],
  next: readonly Criterion[],
  byPosition: boolean,
): (number | null)[] {
  const old = fitWeights([...oldWeights], oldCriteria.length)
  memorize(oldCriteria, old)
  const map = matchCriteria(oldCriteria, next, byPosition, (c) => weightMemory.has(c))
  return next.map((c, i) => {
    const j = map[i]
    return j !== undefined ? (old[j] ?? null) : (weightMemory.get(c) ?? null)
  })
}

/**
 * The judgements' sibling of `weightMemory`: each criterion object's last answers against the other criteria
 * (row direction: pairMemory.get(a).get(b) was pairs[a][b]) and whether it was the best or worst.
 */
const pairMemory = new WeakMap<Criterion, WeakMap<Criterion, Ratio | null>>()
const anchorMemory = new WeakMap<Criterion, 'best' | 'worst'>()

function memorizeJudgements(criteria: readonly Criterion[], j: Judgements): void {
  criteria.forEach((c, i) => {
    pairMemory.set(c, new WeakMap(criteria.map((o, k) => [o, j.pairs[i]?.[k] ?? null])))
    if (j.best === i) anchorMemory.set(c, 'best')
    else if (j.worst === i) anchorMemory.set(c, 'worst')
    else anchorMemory.delete(c)
  })
}

/** Judgements for a new list of criteria, matched like `carryWeights`; criteria seen before get their answers back. */
function carryJudgements(
  oldCriteria: readonly Criterion[],
  old: Judgements | undefined,
  next: readonly Criterion[],
  byPosition: boolean,
): Judgements {
  const prev = old ?? emptyJudgements(oldCriteria.length)
  memorizeJudgements(oldCriteria, prev)
  const map = matchCriteria(oldCriteria, next, byPosition, (c) => pairMemory.has(c))
  let j = remapJudgements(prev, map)
  next.forEach((c, a) => {
    const mem = map[a] === undefined ? pairMemory.get(c) : undefined
    if (!mem) return
    next.forEach((o, b) => {
      const v = mem.get(o)
      if (a !== b && v != null) j = setPair(j, a, b, v)
    })
    const role = anchorMemory.get(c)
    if (role && j[role] === null && j[role === 'best' ? 'worst' : 'best'] !== a) j = { ...j, [role]: a }
  })
  return j
}

/** What a loaded example or import brought with it besides the table. */
type Setup = Pick<
  WorkbenchData,
  'weightMethod' | 'manualWeights' | 'judgements' | 'alternativeJudgements' | 'rankingMethod' | 'methodParams' | 'exampleId' | 'importedFrom'
>

export function matchAlternatives(
  oldAlternatives: readonly string[],
  next: readonly string[],
  byPosition: boolean,
): (number | undefined)[] {
  const used = new Set<number>()
  const take = (i: number) => {
    used.add(i)
    return i
  }
  const out: (number | undefined)[] = next.map((a) => {
    const i = oldAlternatives.findIndex((o, k) => !used.has(k) && o === a)
    return i >= 0 ? take(i) : undefined
  })
  if (byPosition && next.length === oldAlternatives.length) {
    next.forEach((_, i) => {
      if (out[i] === undefined && !used.has(i)) out[i] = take(i)
    })
  }
  return out
}

function carryAlternativeJudgements(
  oldProblem: DraftProblem,
  old: AlternativeJudgements | undefined,
  nextProblem: DraftProblem,
  byPosition: boolean,
): AlternativeJudgements {
  const critMap = matchCriteria(oldProblem.criteria, nextProblem.criteria, byPosition)
  const altMap = matchAlternatives(oldProblem.alternatives, nextProblem.alternatives, byPosition)
  return remapAlternativeJudgements(old, critMap, altMap, nextProblem.alternatives.length)
}

/**
 * Setups of tables that were replaced, keyed by the table's matrix (the alternatives and criteria must be the same
 * objects too). Undo hands the grid's earlier table back to `setProblem`; finding it here restores the methods and
 * weights it had, so one paper's weights never stay on another paper's data. Kept for every table replaced by
 * loading an example or importing a file, and for a table that was an unchanged example or import when it was left.
 */
const leftSetups = new WeakMap<object, { alternatives: string[]; criteria: Criterion[]; setup: Setup }>()

function remember(s: WorkbenchData, always: boolean): void {
  if (!always && !s.exampleId && !s.importedFrom) return
  leftSetups.set(s.problem.matrix, {
    alternatives: s.problem.alternatives,
    criteria: s.problem.criteria,
    setup: {
      weightMethod: s.weightMethod,
      manualWeights: [...s.manualWeights],
      judgements: judgementsOf(s),
      alternativeJudgements: altJudgementsOf(s),
      rankingMethod: s.rankingMethod,
      methodParams: s.methodParams ?? {},
      exampleId: s.exampleId,
      importedFrom: s.importedFrom ?? null,
    },
  })
}

/**
 * Names written by `localizeExample`, keyed by the alternatives array it made (value: the criteria array it made). A
 * language switch only relabels the table; the grid asks `isLocalization` so it replaces its present undo step instead
 * of adding one, and Ctrl+Z never takes the names back to the other language.
 */
const localizations = new WeakMap<object, object>()

/** Whether this table is exactly the one a language switch just relabelled (same arrays, not equal copies). */
export function isLocalization(p: Pick<DraftProblem, 'alternatives' | 'criteria'>): boolean {
  return localizations.get(p.alternatives) === p.criteria
}

function recall(p: DraftProblem): Setup | undefined {
  const r = leftSetups.get(p.matrix)
  return r && r.alternatives === p.alternatives && r.criteria === p.criteria ? r.setup : undefined
}

export const useWorkbench = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      ...initialWorkbench(),

      setStage: (stage) => set({ stage }),

      setProblem: (problem) =>
        set((s) => {
          const back = recall(problem)
          const manualWeights = carryWeights(s.problem.criteria, s.manualWeights, problem.criteria, true)
          const judgements = carryJudgements(s.problem.criteria, s.judgements, problem.criteria, true)
          const alternativeJudgements = carryAlternativeJudgements(s.problem, s.alternativeJudgements, problem, true)
          remember(s, false)
          const m = problem.alternatives.length
          const n = problem.criteria.length
          if (back)
            return {
              problem,
              ...back,
              manualWeights: fitWeights(back.manualWeights, n),
              judgements: back.judgements ?? emptyJudgements(n),
              alternativeJudgements: sanitizeAlternativeJudgements(back.alternativeJudgements, m, n),
            }
          return { problem, exampleId: null, importedFrom: null, manualWeights, judgements, alternativeJudgements }
        }),

      importProblem: (problem, fileName) =>
        set((s) => {
          remember(s, true)
          // A new file: weights follow criteria of the same name only, never a column position.
          const manualWeights = carryWeights(s.problem.criteria, s.manualWeights, problem.criteria, false)
          const judgements = carryJudgements(s.problem.criteria, s.judgements, problem.criteria, false)
          const alternativeJudgements = carryAlternativeJudgements(s.problem, s.alternativeJudgements, problem, false)
          return { problem, exampleId: null, importedFrom: fileName, manualWeights, judgements, alternativeJudgements }
        }),

      loadExample: (id, lang, method) => {
        const ex = getExample(id)
        if (!ex) return
        // An example published for a weighting method opens with that method in its default variant (the
        // variant the paper used); otherwise the paper's weights when it gives them, Equal weights when the paper weighs
        // equally, else CRITIC. An example published
        // for a ranking method opens with that method, also in its default variant; otherwise the ranking method stays.
        // When it is a reference for several ranking methods: the one asked for, else the current one if it is among
        // them, else the first listed.
        const reference = ex.referenceFor.find((m) => getWeightingMethod(m) !== undefined) as WeightMethodId | undefined
        const rankingRefs = ex.referenceFor.filter((m) => getRankingMethod(m) !== undefined) as RankingMethodId[]
        const current = get().rankingMethod
        const ranking =
          rankingRefs.find((m) => m === method) ?? (rankingRefs.includes(current) ? current : undefined) ?? rankingRefs[0]
        remember(get(), true)
        memorize(get().problem.criteria, get().manualWeights)
        memorizeJudgements(get().problem.criteria, judgementsOf(get()))
        set((s) => ({
          ...((reference || ranking) && {
            methodParams: { ...s.methodParams, ...(reference && { [reference]: {} }), ...(ranking && { [ranking]: {} }) },
          }),
          ...(ranking && { rankingMethod: ranking }),
          problem: {
            alternatives: [...alternativeNames(ex, lang)],
            criteria: ex.criteria.map((c) => ({ name: c.name[lang], type: c.type })),
            matrix: ex.matrix.map((row) => [...row]),
          },
          exampleId: ex.id,
          importedFrom: null,
          weightMethod: reference ?? (ex.weights ? 'manual' : ex.equalWeights ? 'equal' : 'critic'),
          manualWeights: ex.weights ? [...ex.weights] : new Array<number | null>(ex.criteria.length).fill(null),
          judgements: emptyJudgements(ex.criteria.length),
          alternativeJudgements: emptyAlternativeJudgements(ex.criteria.length),
        }))
      },

      localizeExample: (lang) => {
        const s = get()
        const ex = s.exampleId ? getExample(s.exampleId) : undefined
        if (!ex) return
        const alternatives = alternativeNames(ex, lang)
        const names = ex.criteria.map((c) => c.name[lang])
        const p = s.problem
        if (p.alternatives.length !== alternatives.length || p.criteria.length !== names.length) return
        if (p.alternatives.every((a, i) => a === alternatives[i]) && p.criteria.every((c, j) => c.name === names[j])) return
        remember(s, false)
        const problem = {
          alternatives: [...alternatives],
          criteria: p.criteria.map((c, j) => ({ ...c, name: names[j]! })),
          matrix: p.matrix,
        }
        localizations.set(problem.alternatives, problem.criteria)
        set({ problem })
      },

      startBlank: (m = 3, n = 3, names) => {
        remember(get(), true)
        memorize(get().problem.criteria, get().manualWeights)
        memorizeJudgements(get().problem.criteria, judgementsOf(get()))
        set({
          problem: {
            alternatives: Array.from({ length: m }, (_, i) => names?.alternative(i) ?? `A${i + 1}`),
            criteria: Array.from({ length: n }, (_, j) => ({ name: names?.criterion(j) ?? `C${j + 1}`, type: 'benefit' })),
            matrix: Array.from({ length: m }, () => new Array<number | null>(n).fill(null)),
          },
          exampleId: null,
          importedFrom: null,
          manualWeights: new Array<number | null>(n).fill(null),
          judgements: emptyJudgements(n),
          alternativeJudgements: emptyAlternativeJudgements(n),
        })
      },

      setCell: (row, col, value) =>
        set((s) => ({
          exampleId: null,
          importedFrom: null,
          problem: {
            ...s.problem,
            matrix: s.problem.matrix.map((r, i) => (i === row ? r.map((v, j) => (j === col ? value : v)) : r)),
          },
        })),

      setAlternativeName: (row, name) =>
        set((s) => ({
          problem: { ...s.problem, alternatives: s.problem.alternatives.map((a, i) => (i === row ? name : a)) },
        })),

      setCriterion: (col, patch) =>
        set((s) => ({
          exampleId: patch.type !== undefined ? null : s.exampleId,
          importedFrom: patch.type !== undefined ? null : (s.importedFrom ?? null),
          problem: { ...s.problem, criteria: s.problem.criteria.map((c, j) => (j === col ? { ...c, ...patch } : c)) },
        })),

      addAlternative: (name) =>
        set((s) => ({
          exampleId: null,
          importedFrom: null,
          problem: {
            ...s.problem,
            alternatives: [...s.problem.alternatives, name],
            matrix: [...s.problem.matrix, new Array<number | null>(s.problem.criteria.length).fill(null)],
          },
          alternativeJudgements: remapAlternativeJudgements(
            s.alternativeJudgements,
            [...s.problem.criteria.keys()],
            [...s.problem.alternatives.keys(), undefined],
            s.problem.alternatives.length + 1,
          ),
        })),

      removeAlternative: (row) =>
        set((s) => ({
          exampleId: null,
          importedFrom: null,
          problem: {
            ...s.problem,
            alternatives: s.problem.alternatives.filter((_, i) => i !== row),
            matrix: s.problem.matrix.filter((_, i) => i !== row),
          },
          alternativeJudgements: remapAlternativeJudgements(
            s.alternativeJudgements,
            [...s.problem.criteria.keys()],
            [...s.problem.alternatives.keys()].filter((i) => i !== row),
            Math.max(0, s.problem.alternatives.length - 1),
          ),
        })),

      addCriterion: (criterion) =>
        set((s) => ({
          exampleId: null,
          importedFrom: null,
          problem: {
            ...s.problem,
            criteria: [...s.problem.criteria, criterion],
            matrix: s.problem.matrix.map((r) => [...r, null]),
          },
          manualWeights: [...fitWeights(s.manualWeights, s.problem.criteria.length), null],
          judgements: remapJudgements(judgementsOf(s), [...s.problem.criteria.keys(), undefined]),
          alternativeJudgements: remapAlternativeJudgements(
            s.alternativeJudgements,
            [...s.problem.criteria.keys(), undefined],
            [...s.problem.alternatives.keys()],
            s.problem.alternatives.length,
          ),
        })),

      removeCriterion: (col) =>
        set((s) => ({
          exampleId: null,
          importedFrom: null,
          problem: {
            ...s.problem,
            criteria: s.problem.criteria.filter((_, j) => j !== col),
            matrix: s.problem.matrix.map((r) => r.filter((_, j) => j !== col)),
          },
          manualWeights: fitWeights(s.manualWeights, s.problem.criteria.length).filter((_, j) => j !== col),
          judgements: remapJudgements(
            judgementsOf(s),
            [...s.problem.criteria.keys()].filter((j) => j !== col),
          ),
          alternativeJudgements: remapAlternativeJudgements(
            s.alternativeJudgements,
            [...s.problem.criteria.keys()].filter((j) => j !== col),
            [...s.problem.alternatives.keys()],
            s.problem.alternatives.length,
          ),
        })),

      setWeightMethod: (weightMethod) => set({ weightMethod }),

      setManualWeight: (col, value) =>
        set((s) => ({
          manualWeights: fitWeights(s.manualWeights, s.problem.criteria.length).map((w, j) => (j === col ? value : w)),
        })),

      setJudgement: (i, k, value) =>
        set((s) => (i === k ? {} : { judgements: setPair(judgementsOf(s), i, k, value) })),

      setAnchors: (best, worst) =>
        set((s) => ({ judgements: { ...judgementsOf(s), best, worst: best !== null && best === worst ? null : worst } })),

      setCriterionSource: (col, source) =>
        set((s) => ({
          alternativeJudgements: setAlternativeSource(
            s.alternativeJudgements,
            s.problem.alternatives.length,
            s.problem.criteria.length,
            col,
            source,
          ),
        })),

      setAlternativeJudgement: (col, i, k, value) =>
        set((s) =>
          i === k
            ? {}
            : {
                alternativeJudgements: setAlternativePair(
                  s.alternativeJudgements,
                  s.problem.alternatives.length,
                  s.problem.criteria.length,
                  col,
                  i,
                  k,
                  value,
                ),
              },
        ),

      setRankingMethod: (rankingMethod) => set({ rankingMethod }),

      setMethodParam: (methodId, key, value) =>
        set((s) => ({ methodParams: { ...s.methodParams, [methodId]: { ...s.methodParams?.[methodId], [key]: value } } })),

      reset: () => {
        remember(get(), true)
        memorize(get().problem.criteria, get().manualWeights)
        memorizeJudgements(get().problem.criteria, judgementsOf(get()))
        set(initialWorkbench())
      },
    }),
    {
      name: WORKBENCH_STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(safeStorage),
      partialize: (s): WorkbenchData => ({
        problem: s.problem,
        weightMethod: s.weightMethod,
        manualWeights: s.manualWeights,
        rankingMethod: s.rankingMethod,
        stage: s.stage,
        exampleId: s.exampleId,
        importedFrom: s.importedFrom ?? null,
        methodParams: s.methodParams ?? {},
        judgements: judgementsOf(s),
        alternativeJudgements: altJudgementsOf(s),
      }),
      // Saved state is a trust boundary (hand-edited or stale localStorage): refit the judgements to the criteria.
      merge: (persisted, current) => {
        const p = { ...(persisted ?? {}) } as Partial<WorkbenchData>
        // A problem without a criteria list cannot be shown or refitted: keep the current one.
        if (!Array.isArray(p.problem?.criteria)) delete p.problem
        const prob = p.problem ?? current.problem
        const m = prob.alternatives.length
        const n = prob.criteria.length
        return {
          ...current,
          ...p,
          judgements: sanitizeJudgements(p.judgements, n),
          alternativeJudgements: sanitizeAlternativeJudgements(p.alternativeJudgements, m, n),
        }
      },
    },
  ),
)

// ---------------------------------------------------------------------------------------------
// Derived results. Pure functions of the data (testable without React); hooks memoize them.
// ---------------------------------------------------------------------------------------------

/** A computed value, or null with the issues that blocked it. Warnings may accompany a value. */
export type { Computed }

/** Draft to core Problem: empty cells become NaN so validateProblem reports their position. */
export function toProblem(draft: DraftProblem): Problem {
  return {
    alternatives: draft.alternatives,
    criteria: draft.criteria,
    matrix: draft.matrix.map((row) => row.map((v) => (v === null ? Number.NaN : v))),
  }
}

/** Structural and cell validation of the decision matrix (core validateProblem). */
export function computeValidation(draft: DraftProblem): ValidationIssue[] {
  return validateProblem(toProblem(draft))
}

/** The options a registry method runs with: the saved ones checked against its descriptor, defaults filled in. */
export function paramsFor(data: Pick<WorkbenchData, 'methodParams'>, methodId: string): MethodParams {
  const method = getWeightingMethod(methodId) ?? getRankingMethod(methodId)
  return resolveParams(method?.params, data.methodParams?.[methodId])
}

/** The run for any ranking method: its resolved options, plus alternative judgements when methodId === 'ahp-ranking'. */
export function runFor(data: Pick<WorkbenchData, 'methodParams' | 'alternativeJudgements'>, methodId: string): RankingRun {
  return {
    methodId,
    params: paramsFor(data, methodId),
    ...(methodId === 'ahp-ranking' ? { judgements: data.alternativeJudgements } : {}),
  }
}

/** The run the workbench ranks with: the selected ranking method and its resolved options. */
export function rankingRunFor(data: Pick<WorkbenchData, 'rankingMethod' | 'methodParams' | 'alternativeJudgements'>): RankingRun {
  return runFor(data, data.rankingMethod)
}

/** Weights for the selected method, or null plus the blocking issues. */
export function computeWeights(
  data: Pick<WorkbenchData, 'problem' | 'weightMethod' | 'manualWeights' | 'methodParams' | 'judgements'>,
): Computed<WeightingResult> {
  const problem = toProblem(data.problem)
  const issues = validateProblem(problem)
  const n = problem.criteria.length

  if (data.weightMethod === 'manual') {
    const weights = fitWeights(data.manualWeights, n).map((w) => (w === null ? Number.NaN : w))
    const wIssues = validateWeights(weights, n)
    if (hasErrors(wIssues)) return { value: null, issues: wIssues }
    return { value: { weights, steps: [{ key: 'manual.weights', vector: weights, axes: 'criteria' }] }, issues: wIssues }
  }

  if (data.weightMethod === 'equal') {
    // Equal weights only need the number of criteria; the matrix is not read.
    if (n < 1) return { value: null, issues: issues.filter((x) => x.code === 'too-few-criteria') }
    const weights = new Array<number>(n).fill(1 / n)
    return { value: { weights, steps: [{ key: 'equal.weights', vector: weights, axes: 'criteria' }] }, issues: [] }
  }

  const method = getWeightingMethod(data.weightMethod)
  if (!method) return { value: null, issues }
  if (method.reads === 'judgements') {
    // Answers instead of the matrix: the matrix is not validated, only the number of criteria.
    if (n < 2) return { value: null, issues: issues.filter((x) => x.code === 'too-few-criteria') }
    const given = data.judgements
    const judgements = given && given.pairs.length === n ? given : emptyJudgements(n)
    try {
      return { value: method.compute(problem, paramsFor(data, method.id), judgements), issues: [] }
    } catch (err) {
      if (err instanceof ProblemValidationError) return { value: null, issues: err.issues }
      throw err
    }
  }
  if (hasErrors(issues)) return { value: null, issues }
  try {
    return { value: method.compute(problem, paramsFor(data, method.id)), issues }
  } catch (err) {
    if (err instanceof ProblemValidationError) return { value: null, issues: err.issues }
    throw err
  }
}

/** Ranking with the selected method on the computed weights, or null plus every blocking issue. */
export function computeRanking(
  data: Pick<
    WorkbenchData,
    'problem' | 'weightMethod' | 'manualWeights' | 'rankingMethod' | 'methodParams' | 'judgements' | 'alternativeJudgements'
  >,
  weights: Computed<WeightingResult> = computeWeights(data),
): Computed<RankingResult> {
  const problem = toProblem(data.problem)
  const { issues, rank } = prepareRanking(problem, rankingRunFor(data))
  if (weights.value === null) {
    const seen = new Set(issues.map((x) => JSON.stringify(x)))
    return { value: null, issues: [...issues, ...weights.issues.filter((x) => !seen.has(JSON.stringify(x)))] }
  }
  return rank ? rank(weights.value.weights) : { value: null, issues }
}

/** Validation issues of the current matrix (errors and warnings). */
export function useValidation(): ValidationIssue[] {
  const problem = useWorkbench((s) => s.problem)
  return useMemo(() => computeValidation(problem), [problem])
}

/** Computed weights for the current method; value is null while there are blocking issues. */
export function useWeights(): Computed<WeightingResult> {
  const problem = useWorkbench((s) => s.problem)
  const weightMethod = useWorkbench((s) => s.weightMethod)
  const manualWeights = useWorkbench((s) => s.manualWeights)
  const methodParams = useWorkbench((s) => s.methodParams)
  const judgements = useWorkbench((s) => s.judgements)
  return useMemo(
    () => computeWeights({ problem, weightMethod, manualWeights, methodParams, judgements }),
    [problem, weightMethod, manualWeights, methodParams, judgements],
  )
}

/** Ranking for the current methods; value is null while data or weights have blocking issues. */
export function useRanking(): Computed<RankingResult> {
  const weights = useWeights()
  const problem = useWorkbench((s) => s.problem)
  const weightMethod = useWorkbench((s) => s.weightMethod)
  const manualWeights = useWorkbench((s) => s.manualWeights)
  const rankingMethod = useWorkbench((s) => s.rankingMethod)
  const methodParams = useWorkbench((s) => s.methodParams)
  const judgements = useWorkbench((s) => s.judgements)
  const alternativeJudgements = useWorkbench((s) => s.alternativeJudgements)
  return useMemo(
    () =>
      computeRanking(
        { problem, weightMethod, manualWeights, rankingMethod, methodParams, judgements, alternativeJudgements },
        weights,
      ),
    [problem, weightMethod, manualWeights, rankingMethod, methodParams, judgements, alternativeJudgements, weights],
  )
}

/** The options of one method as the methods see them (defaults filled in). */
export function useMethodParams(methodId: string): MethodParams {
  const raw = useWorkbench((s) => s.methodParams?.[methodId])
  return useMemo(() => paramsFor({ methodParams: raw ? { [methodId]: raw } : {} }, methodId), [raw, methodId])
}

/** True when the matrix has no rows and no columns (the Data stage shows its empty state). */
export const isEmptyProblem = (p: DraftProblem): boolean => p.alternatives.length === 0 && p.criteria.length === 0
