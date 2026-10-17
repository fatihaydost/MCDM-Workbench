import { expect } from 'vitest'
import type { CriterionType, MethodParams, Problem, RankerFor, RankingMethod, Step } from '../src/core'

type Nested = number | Nested[]

/** Element-wise |actual - expected| <= tol, with the failing path in the message. */
export function expectClose(actual: Nested, expected: Nested, tol: number, path = ''): void {
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), `${path} should be an array`).toBe(true)
    const a = actual as Nested[]
    expect(a.length, `${path} length`).toBe(expected.length)
    expected.forEach((e, i) => expectClose(a[i]!, e, tol, `${path}[${i}]`))
    return
  }
  const diff = Math.abs((actual as number) - expected)
  expect(diff <= tol, `${path}: got ${String(actual)}, expected ${expected} ± ${tol} (diff ${diff})`).toBe(true)
}

export function step(steps: Step[], key: string): Step {
  const s = steps.find((x) => x.key === key)
  if (!s) throw new Error(`missing step ${key}`)
  return s
}

export function makeProblem(matrix: number[][], types: CriterionType[], alternatives?: string[]): Problem {
  return {
    alternatives: alternatives ?? matrix.map((_, i) => `A${i + 1}`),
    criteria: types.map((type, j) => ({ name: `C${j + 1}`, type })),
    matrix,
  }
}

/** A RankerFor over a method object (also a synthetic one that is not in the registry), with fixed options. */
export const rankerOf =
  (method: RankingMethod<any>, params: MethodParams = {}): RankerFor =>
  (problem) =>
  (weights) =>
    method.compute(problem, weights, params)
