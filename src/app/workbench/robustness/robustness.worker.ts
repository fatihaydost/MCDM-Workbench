/**
 * The heavy robustness calculations off the main thread: Monte Carlo weights (10,000 rankings) and the weight sweep of
 * one criterion (101 grid points, bisection to every switch point and the crossing marks; about 200 ms on a 30 x 15
 * matrix). One request at a time per worker; the page drops stale answers by id and terminates a worker that is
 * still busy when a new request comes (the calculation is synchronous, so a message could not interrupt it).
 */
import { rankerFor, type RankingRun } from '../../../core/run'
import { monteCarlo, reweight, sweepWeight, type Concentration, type MonteCarloResult, type Sweep } from '../../../core/robustness'
import type { Problem } from '../../../core/types'
import { switchMarks, topSwitchMarks, type Mark } from './helpers'

export type SweepResult = {
  sweep: Sweep
  /** Crossings where any two alternatives swap, and only those where first place changes. */
  marks: Mark[]
  topMarks: Mark[]
}

/** `run`: the ranking method and options, the same the workbench ranked with. */
type Common = { id: number; problem: Problem; weights: number[]; run: RankingRun }
export type MonteCarloRequest = Common & { kind: 'monteCarlo'; concentration: Concentration; n: number; seed: number }
export type SweepRequest = Common & { kind: 'sweep'; k: number }
export type WorkerRequest = MonteCarloRequest | SweepRequest

export type WorkerResponse =
  | { id: number; kind: 'monteCarlo'; result: MonteCarloResult }
  | { id: number; kind: 'sweep'; result: SweepResult }
  | { id: number; error: string }

/** Runs one request; shared with the main-thread fallback where workers are not available. */
export function runRequest(req: WorkerRequest): WorkerResponse {
  const rankFor = rankerFor(req.run)
  try {
    if (req.kind === 'monteCarlo') {
      const result = monteCarlo(req.problem, req.weights, rankFor, { concentration: req.concentration, n: req.n, seed: req.seed })
      return { id: req.id, kind: 'monteCarlo', result }
    }
    const sweep = sweepWeight(req.problem, req.weights, rankFor, req.k)
    const rank = rankFor(req.problem)
    const scoresAt = (w: number) => rank(reweight(req.weights, req.k, w)).scores
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
