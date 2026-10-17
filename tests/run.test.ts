import { describe, expect, it } from 'vitest'
import { prepareRanking, rankerFor, rankingMethods, vikor, type Problem } from '../src/core'
import { makeProblem } from './helpers'

const problem: Problem = makeProblem(
  [
    [7, 3, 9],
    [5, 8, 4],
    [9, 5, 6],
    [4, 2, 8],
  ],
  ['benefit', 'cost', 'benefit'],
)
const weights = [0.5, 0.3, 0.2]

describe('prepareRanking: every ranking method in the registry', () => {
  for (const method of rankingMethods) {
    it(`${method.id}: prepare, then rank`, () => {
      const { issues, rank } = prepareRanking(problem, { methodId: method.id, params: {} })
      expect(issues.filter((x) => x.severity === 'error')).toEqual([])
      const res = rank!(weights)
      expect(res.value).not.toBeNull()
      const { scores, ranking, order } = res.value!
      expect(scores).toHaveLength(problem.alternatives.length)
      expect(ranking).toHaveLength(problem.alternatives.length)
      // A better score never gets a worse rank, in the method's own direction.
      const sign = order === 'desc' ? 1 : -1
      for (let i = 0; i < scores.length; i++)
        for (let j = 0; j < scores.length; j++) if (sign * (scores[i]! - scores[j]!) > 1e-9) expect(ranking[i]!).toBeLessThan(ranking[j]!)
      // The throwing form gives the same result.
      expect(rankerFor({ methodId: method.id, params: {} })(problem)(weights)).toEqual(res.value)
    })
  }
})

describe('prepareRanking: blocked and unknown', () => {
  it('an unknown method id has no ranker and no error issue of its own', () => {
    const { issues, rank } = prepareRanking(problem, { methodId: 'nope', params: {} })
    expect(rank).toBeNull()
    expect(issues).toEqual([])
    expect(() => rankerFor({ methodId: 'nope', params: {} })(problem)).toThrow('unknown ranking method nope')
  })

  it('SAW with a zero: non-positive-value blocks before any compute', () => {
    const p = makeProblem([[1, 2], [0, 3], [2, 1]], ['benefit', 'benefit'])
    const { issues, rank } = prepareRanking(p, { methodId: 'saw', params: {} })
    expect(rank).toBeNull()
    expect(issues.map((x) => x.code)).toContain('non-positive-value')
  })

  it('EDAS with a varying column whose average is not above 0: the ranker maps the thrown error to issues', () => {
    const p = makeProblem([[-3, 2], [1, 3], [1, 1]], ['benefit', 'benefit'])
    const { rank } = prepareRanking(p, { methodId: 'edas', params: {} })
    const res = rank!([0.5, 0.5])
    expect(res.value).toBeNull()
    expect(res.issues.map((x) => x.code)).toContain('non-positive-average')
  })
})

describe('prepareRanking: options', () => {
  it('fills defaults: VIKOR without params equals v = 0.5', () => {
    const bare = prepareRanking(problem, { methodId: 'vikor', params: {} }).rank!(weights).value!
    const explicit = prepareRanking(problem, { methodId: 'vikor', params: { v: 0.5 } }).rank!(weights).value!
    expect(bare.scores).toEqual(explicit.scores)
    expect(bare.scores).toEqual(vikor.compute(problem, weights, { v: 0.5 }).scores)
  })

  it('an explicit option changes the result', () => {
    const other = prepareRanking(problem, { methodId: 'vikor', params: { v: 0.1 } }).rank!(weights).value!
    expect(other.scores).not.toEqual(vikor.compute(problem, weights, { v: 0.5 }).scores)
  })
})

describe('robustness ranks with the run options', () => {
  it('the worker sweep analyses VIKOR at the given v, not the default', async () => {
    const { runRequest } = await import('../src/app/workbench/robustness/robustness.worker')
    const res = runRequest({ id: 1, kind: 'sweep', k: 0, problem, weights, run: { methodId: 'vikor', params: { v: 0.1 } } })
    if (!('result' in res) || res.kind !== 'sweep') throw new Error('sweep failed')
    const points = res.result.sweep.points
    expect(points.length).toBeGreaterThan(1)
    for (const pt of [points[1]!, points[Math.floor(points.length / 2)]!]) {
      expect(pt.scores).toEqual(vikor.compute(problem, pt.weights, { v: 0.1 }).scores)
      expect(pt.scores).not.toEqual(vikor.compute(problem, pt.weights, { v: 0.5 }).scores)
    }
  })
})
