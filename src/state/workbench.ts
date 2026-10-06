import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  getRankingMethod,
  getWeightingMethod,
  hasErrors,
  ProblemValidationError,
  resolveParams,
  validateProblem,
  validateRequirements,
  validateWeights,
  type Criterion,
  type MethodParams,
  type MethodParamValue,
  type Problem,
  type RankingResult,
  type ValidationIssue,
  type WeightingResult,
} from '../core'
import { getExample } from '../data/examples'
import type { Lang } from '../i18n/lang'

/** The workbench stages, in order. Robustness reads the ranking of the stages before it and changes nothing. */
export const STAGES = ['data', 'weights', 'ranking', 'results', 'robustness'] as const
export type Stage = (typeof STAGES)[number]

export type WeightMethodId = 'critic' | 'entropy' | 'equal' | 'manual'
export type RankingMethodId = 'topsis' | 'saw'

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
}

export type WorkbenchActions = {
  setStage: (stage: Stage) => void
  /** Replaces the whole problem (import, paste of a full table). Keeps manual weights in length. */
  setProblem: (problem: DraftProblem) => void
  /** Replaces the problem with one read from a file and remembers the file name as the source. */
  importProblem: (problem: DraftProblem, fileName: string) => void
  /** Loads a published example; criterion names in `lang`. Sets manual weights when the paper gives them. */
  loadExample: (id: string, lang: Lang) => void
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
})

const fitWeights = (w: (number | null)[], n: number): (number | null)[] =>
  Array.from({ length: n }, (_, j) => w[j] ?? null)

export const useWorkbench = create<WorkbenchState>()(
  persist(
    (set) => ({
      ...initialWorkbench(),

      setStage: (stage) => set({ stage }),

      setProblem: (problem) =>
        set((s) => ({
          problem,
          exampleId: null,
          importedFrom: null,
          manualWeights: fitWeights(s.manualWeights, problem.criteria.length),
        })),

      importProblem: (problem, fileName) =>
        set((s) => ({
          problem,
          exampleId: null,
          importedFrom: fileName,
          manualWeights: fitWeights(s.manualWeights, problem.criteria.length),
        })),

      loadExample: (id, lang) => {
        const ex = getExample(id)
        if (!ex) return
        // An example published for a weighting method opens with that method in its default variant (the
        // variant the paper used); otherwise the paper's weights when it gives them, else CRITIC. An example published
        // for a ranking method opens with that method, also in its default variant; otherwise the ranking method stays.
        const reference = ex.referenceFor.find((m) => getWeightingMethod(m) !== undefined) as WeightMethodId | undefined
        const ranking = ex.referenceFor.find((m) => getRankingMethod(m) !== undefined) as RankingMethodId | undefined
        set((s) => ({
          ...((reference || ranking) && {
            methodParams: { ...s.methodParams, ...(reference && { [reference]: {} }), ...(ranking && { [ranking]: {} }) },
          }),
          ...(ranking && { rankingMethod: ranking }),
          problem: {
            alternatives: [...ex.alternatives],
            criteria: ex.criteria.map((c) => ({ name: c.name[lang], type: c.type })),
            matrix: ex.matrix.map((row) => [...row]),
          },
          exampleId: ex.id,
          importedFrom: null,
          weightMethod: reference ?? (ex.weights ? 'manual' : 'critic'),
          manualWeights: ex.weights ? [...ex.weights] : new Array<number | null>(ex.criteria.length).fill(null),
        }))
      },

      startBlank: (m = 3, n = 3, names) =>
        set({
          problem: {
            alternatives: Array.from({ length: m }, (_, i) => names?.alternative(i) ?? `A${i + 1}`),
            criteria: Array.from({ length: n }, (_, j) => ({ name: names?.criterion(j) ?? `C${j + 1}`, type: 'benefit' })),
            matrix: Array.from({ length: m }, () => new Array<number | null>(n).fill(null)),
          },
          exampleId: null,
          importedFrom: null,
          manualWeights: new Array<number | null>(n).fill(null),
        }),

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
        })),

      setWeightMethod: (weightMethod) => set({ weightMethod }),

      setManualWeight: (col, value) =>
        set((s) => ({
          manualWeights: fitWeights(s.manualWeights, s.problem.criteria.length).map((w, j) => (j === col ? value : w)),
        })),

      setRankingMethod: (rankingMethod) => set({ rankingMethod }),

      setMethodParam: (methodId, key, value) =>
        set((s) => ({ methodParams: { ...s.methodParams, [methodId]: { ...s.methodParams?.[methodId], [key]: value } } })),

      reset: () => set(initialWorkbench()),
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
      }),
    },
  ),
)

// ---------------------------------------------------------------------------------------------
// Derived results. Pure functions of the data (testable without React); hooks memoize them.
// ---------------------------------------------------------------------------------------------

/** A computed value, or null with the issues that blocked it. Warnings may accompany a value. */
export type Computed<T> = { value: T; issues: ValidationIssue[] } | { value: null; issues: ValidationIssue[] }

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

/** Weights for the selected method, or null plus the blocking issues. */
export function computeWeights(
  data: Pick<WorkbenchData, 'problem' | 'weightMethod' | 'manualWeights' | 'methodParams'>,
): Computed<WeightingResult> {
  const problem = toProblem(data.problem)
  const issues = validateProblem(problem)
  const n = problem.criteria.length

  if (data.weightMethod === 'manual') {
    const weights = fitWeights(data.manualWeights, n).map((w) => (w === null ? Number.NaN : w))
    const wIssues = validateWeights(weights, n)
    if (hasErrors(wIssues)) return { value: null, issues: wIssues }
    return { value: { weights, steps: [{ key: 'manual.weights', vector: weights }] }, issues: wIssues }
  }

  if (data.weightMethod === 'equal') {
    // Equal weights only need the number of criteria; the matrix is not read.
    if (n < 1) return { value: null, issues: issues.filter((x) => x.code === 'too-few-criteria') }
    const weights = new Array<number>(n).fill(1 / n)
    return { value: { weights, steps: [{ key: 'equal.weights', vector: weights }] }, issues: [] }
  }

  if (hasErrors(issues)) return { value: null, issues }
  const method = getWeightingMethod(data.weightMethod)
  if (!method) return { value: null, issues }
  try {
    return { value: method.compute(problem, paramsFor(data, method.id)), issues }
  } catch (err) {
    if (err instanceof ProblemValidationError) return { value: null, issues: err.issues }
    throw err
  }
}

/** Ranking with the selected method on the computed weights, or null plus every blocking issue. */
export function computeRanking(
  data: Pick<WorkbenchData, 'problem' | 'weightMethod' | 'manualWeights' | 'rankingMethod' | 'methodParams'>,
  weights: Computed<WeightingResult> = computeWeights(data),
): Computed<RankingResult> {
  const problem = toProblem(data.problem)
  const method = getRankingMethod(data.rankingMethod)
  const issues = [...validateProblem(problem), ...(method ? validateRequirements(problem, method) : [])]
  if (weights.value === null) {
    const seen = new Set(issues.map((x) => JSON.stringify(x)))
    return { value: null, issues: [...issues, ...weights.issues.filter((x) => !seen.has(JSON.stringify(x)))] }
  }
  if (!method || hasErrors(issues)) return { value: null, issues }
  try {
    return { value: method.compute(problem, weights.value.weights, paramsFor(data, method.id)), issues }
  } catch (err) {
    if (err instanceof ProblemValidationError) return { value: null, issues: err.issues }
    throw err
  }
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
  return useMemo(
    () => computeWeights({ problem, weightMethod, manualWeights, methodParams }),
    [problem, weightMethod, manualWeights, methodParams],
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
  return useMemo(
    () => computeRanking({ problem, weightMethod, manualWeights, rankingMethod, methodParams }, weights),
    [problem, weightMethod, manualWeights, rankingMethod, methodParams, weights],
  )
}

/** The options of one method as the methods see them (defaults filled in). */
export function useMethodParams(methodId: string): MethodParams {
  const raw = useWorkbench((s) => s.methodParams?.[methodId])
  return useMemo(() => paramsFor({ methodParams: raw ? { [methodId]: raw } : {} }, methodId), [raw, methodId])
}

/** True when the matrix has no rows and no columns (the Data stage shows its empty state). */
export const isEmptyProblem = (p: DraftProblem): boolean => p.alternatives.length === 0 && p.criteria.length === 0
