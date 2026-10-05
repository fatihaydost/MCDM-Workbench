/**
 * The heavy robustness calculations off the main thread: Monte Carlo weights (10,000 rankings) and the weight sweep of
 * one criterion (101 grid points, bisection to every switch point and the crossing marks; about 200 ms on a 30 x 15
 * matrix). One request at a time per worker; the page drops stale answers by id and terminates a worker that is
 * still busy when a new request comes (the calculation is synchronous, so a message could not interrupt it).
 */
import { getRankingMethod } from '../../../core/registry'
import { monteCarlo, reweight, sweepWeight, type Concentration, type MonteCarloResult, type Sweep } from '../../../core/robustness'
import type { MethodParams, Problem } from '../../../core/types'
import { switchMarks, topSwitchMarks, type Mark } from './helpers'

export type SweepResult = {
  sweep: Sweep
  /** Crossings where any two alternatives swap, and only those where first place changes. */
  marks: Mark[]
  topMarks: Mark[]
}

/** `params`: the ranking method's options, the same the workbench ranked with. */
type Common = { id: number; problem: Problem; weights: number[]; method: string; params: MethodParams }
export type MonteCarloRequest = Common & { kind: 'monteCarlo'; concentration: Concentration; n: number; seed: number }
export type SweepRequest = Common & { kind: 'sweep'; k: number }
export type WorkerRequest = MonteCarloRequest | SweepRequest

export type WorkerResponse =
  | { id: number; kind: 'monteCarlo'; result: MonteCarloResult }
  | { id: number; kind: 'sweep'; result: SweepResult }
  | { id: number; error: string }

/** Runs one request; shared with the main-thread fallback where workers are not available. */
export function runRequest(req: WorkerRequest): WorkerResponse {
  const method = getRankingMethod(req.method)
  if (!method) return { id: req.id, error: `unknown ranking method ${req.method}` }
  try {
    if (req.kind === 'monteCarlo') {
      const result = monteCarlo(req.problem, req.weights, method, { concentration: req.concentration, n: req.n, seed: req.seed, params: req.params })
      return { id: req.id, kind: 'monteCarlo', result }
    }
    const sweep = sweepWeight(req.problem, req.weights, method, req.k, { params: req.params })
    const scoresAt = (w: number) => method.compute(req.problem, reweight(req.weights, req.k, w), req.params).scores
    return {
      id: req.id,
      kind: 'sweep',
      result: { sweep, marks: switchMarks(sweep.rankingIntervals, scoresAt), topMarks: topSwitchMarks(sweep.topIntervals, scoresAt) },
    }
  } catch (err) {
    return { id: req.id, error: err instanceof Error ? err.message : String(err) }
  }
}

type WorkerScope = { onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null; postMessage: (msg: WorkerResponse) => void }

// Only inside a worker (no `document`): the fallback imports runRequest on the main thread too.
if (typeof document === 'undefined' && typeof self !== 'undefined') {
  const scope = self as unknown as WorkerScope
  scope.onmessage = (e) => scope.postMessage(runRequest(e.data))
}
