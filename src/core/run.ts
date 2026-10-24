/**
 * Running a ranking: the one place where (ranking method, options) meet a problem. A `RankingRun` is plain data (it
 * goes into worker messages as is); `prepareRanking` validates once and returns a ranker, so hot loops (Monte Carlo)
 * add no validation per draw. Every consumer ranks through here; none calls `method.compute` itself.
 */
import { validateAlternativeJudgements } from './methods/ahp'
import { resolveParams } from './params'
import { getRankingMethod } from './registry'
import { hasErrors, ProblemValidationError, validateProblem, validateRequirements, type ValidationIssue } from './validate'
import type { AlternativeJudgements, MethodParams, MethodParamValue, Problem, RankingResult } from './types'

/** Which ranking method to run and with which options (raw or resolved: defaults are filled in on prepare). */
export type RankingRun = { methodId: string; params: MethodParams; judgements?: AlternativeJudgements | undefined }

/** A computed value, or null with the issues that blocked it. Warnings may accompany a value. */
export type Computed<T> = { value: T; issues: ValidationIssue[] } | { value: null; issues: ValidationIssue[] }

/** `issues`: everything found on the problem (warnings included); `rank` is null when they block or the method is unknown. */
export type PreparedRanking = {
  issues: ValidationIssue[]
  rank: ((weights: number[]) => Computed<RankingResult>) | null
}

/** Validates the problem and the method's requirements once; the ranker maps a thrown ProblemValidationError to issues. */
export function prepareRanking(problem: Problem, run: RankingRun): PreparedRanking {
  const method = getRankingMethod(run.methodId)
  const baseIssues = [...validateProblem(problem), ...(method ? validateRequirements(problem, method) : [])]
  const jIssues =
    method?.id === 'ahp-ranking' && !hasErrors(baseIssues)
      ? validateAlternativeJudgements(problem.alternatives.length, problem.criteria.length, run.judgements)
      : []
  const issues = [...baseIssues, ...jIssues]
  if (!method || hasErrors(issues)) return { issues, rank: null }
  const params = resolveParams(method.params, run.params)
  return {
    issues,
    rank: (weights) => {
      try {
        return { value: method.compute(problem, weights, params, run.judgements), issues }
      } catch (err) {
        if (err instanceof ProblemValidationError) return { value: null, issues: err.issues }
        throw err
      }
    },
  }
}

/** A prepared ranking on one problem, as a plain function that throws when it cannot rank. */
export type Ranker = (weights: number[]) => RankingResult
/** What robustness analyses take: the ranker for a problem (the reduced one, for criterion removal). */
export type RankerFor = (problem: Problem, removed?: number) => Ranker

const PER_CRITERION_ARRAY_KEYS = ['q', 'p', 'v', 'mode', 'criteriaFunctions'] as const

/** The throwing form for analyses: an unknown method is an Error, blocking issues a ProblemValidationError. */
export const rankerFor =
  (run: RankingRun): RankerFor =>
  (problem, removed) => {
    if (!getRankingMethod(run.methodId)) throw new Error(`unknown ranking method ${run.methodId}`)
    let effectiveRun = run
    if (removed !== undefined) {
      const nextParams: Record<string, MethodParamValue> = { ...run.params }
      for (const key of PER_CRITERION_ARRAY_KEYS) {
        const val = run.params[key]
        if (Array.isArray(val)) {
          nextParams[key] = val.filter((_, idx) => idx !== removed) as unknown as MethodParamValue
        }
      }
      effectiveRun = {
        ...run,
        params: nextParams,
        ...(run.judgements ? { judgements: run.judgements.filter((_, idx) => idx !== removed) } : {}),
      }
    }
    const { issues, rank } = prepareRanking(problem, effectiveRun)
    if (!rank) throw new ProblemValidationError(issues)
    return (weights) => {
      const res = rank(weights)
      if (res.value === null) throw new ProblemValidationError(res.issues)
      return res.value
    }
  }
