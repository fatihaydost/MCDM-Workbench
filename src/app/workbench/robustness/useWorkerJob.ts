import { useEffect, useMemo, useRef, useState } from 'react'
import type { Concentration, MonteCarloResult } from '../../../core/robustness'
import type { MethodParams, Problem } from '../../../core/types'
import { runRequest, type SweepResult, type WorkerRequest, type WorkerResponse } from './robustness.worker'

export type JobState<T> = {
  /** The last finished result; it stays on screen while a new one is calculated. */
  result: T | null
  /** A calculation for the current inputs is running. */
  busy: boolean
  failed: boolean
}

type Job = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never

function createWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  try {
    return new Worker(new URL('./robustness.worker.ts', import.meta.url), { type: 'module' })
  } catch {
    return null
  }
}

/**
 * One robustness calculation in a Web Worker of its own. A new `job` (a new object: memoize it) cancels the running
 * calculation (the worker is terminated and a new one started) and starts the new one; answers to older requests are
 * dropped by id. The previous result stays until the new one arrives.
 */
function useWorkerJob<T>(job: Job): JobState<T> {
  const [state, setState] = useState<JobState<T>>({ result: null, busy: true, failed: false })
  const worker = useRef<Worker | null>(null)
  const running = useRef(false)
  const lastId = useRef(0)

  useEffect(() => {
    const id = ++lastId.current
    const req = { ...job, id } as WorkerRequest
    const done = (res: WorkerResponse) => {
      if (res.id !== lastId.current) return
      running.current = false
      setState((s) => ('result' in res ? { result: res.result as T, busy: false, failed: false } : { result: s.result, busy: false, failed: true }))
    }
    // A worker still busy with the previous inputs is stopped: its answer is no longer wanted.
    if (running.current && worker.current) {
      worker.current.terminate()
      worker.current = null
    }
    worker.current ??= createWorker()
    running.current = true
    setState((s) => (s.busy && !s.failed ? s : { ...s, busy: true, failed: false }))
    const w = worker.current
    if (!w) {
      // No workers here: compute after this frame, so the previous result and the status paint first.
      const t = window.setTimeout(() => done(runRequest(req)), 0)
      return () => window.clearTimeout(t)
    }
    w.onmessage = (e: MessageEvent<WorkerResponse>) => done(e.data)
    w.onerror = (e) => {
      e.preventDefault()
      done({ id, error: e.message })
    }
    w.postMessage(req)
    return undefined
  }, [job])

  useEffect(
    () => () => {
      worker.current?.terminate()
      worker.current = null
      running.current = false
    },
    [],
  )

  return state
}

/** Monte Carlo weights (core monteCarlo) in a worker; `params` are the ranking method's options (memoize them). */
export function useMonteCarlo(
  problem: Problem,
  weights: readonly number[],
  method: string,
  params: MethodParams,
  concentration: Concentration,
  n: number,
  seed: number,
): JobState<MonteCarloResult> {
  const job = useMemo(
    (): Job => ({ kind: 'monteCarlo', problem, weights: [...weights], method, params, concentration, n, seed }),
    [problem, weights, method, params, concentration, n, seed],
  )
  return useWorkerJob<MonteCarloResult>(job)
}

/** The sweep of criterion k (core sweepWeight) and its crossing marks, in a worker; `params` as in useMonteCarlo. */
export function useSweep(problem: Problem, weights: readonly number[], method: string, params: MethodParams, k: number): JobState<SweepResult> {
  const job = useMemo(
    (): Job => ({ kind: 'sweep', problem, weights: [...weights], method, params, k }),
    [problem, weights, method, params, k],
  )
  return useWorkerJob<SweepResult>(job)
}
