import { useEffect, useMemo, useRef, useState } from 'react'
import type { Concentration, MonteCarloProgress, MonteCarloResult } from '../../../core/robustness'
import type { RankingRun } from '../../../core/run'
import type { Problem } from '../../../core/types'
import { runRequest, type SweepResult, type WorkerRequest, type WorkerResponse } from './robustness.worker'

export type JobState<T> = {
  /** The last finished result; it stays on screen while a new one is calculated. */
  result: T | null
  /** A calculation for the current inputs is running. */
  busy: boolean
  failed: boolean
  /** The job has been running longer than SLOW_MS: only then does a picture show its progress. */
  slow: boolean
  /** Partial counts of a running Monte Carlo (null otherwise, and once the job is done). */
  progress: MonteCarloProgress | null
}

/** A job that is done sooner than this shows nothing of its progress: a flash of half a picture is noise. */
export const SLOW_MS = 250

type Job = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never

function createWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  try {
    return new Worker(new URL('./robustness.worker.ts', import.meta.url), { type: 'module' })
  } catch {
    return null
  }
}

/** The worker of one hook: whether it is busy, and whether it failed to load (then every job runs on the main thread). */
export type WorkerSlot = { worker: Worker | null; running: boolean; broken: boolean }

/** Runs `fn` after this frame; returns a cancel function. */
type Schedule = (fn: () => void) => () => void
const nextFrame: Schedule = (fn) => {
  const t = globalThis.setTimeout(fn, 0)
  return () => globalThis.clearTimeout(t)
}

/**
 * Starts one request: in the slot's worker (a busy one is terminated first, its answer is no longer wanted), or on the
 * main thread after this frame when there is no worker. A worker that fires `error` failed to load (blocked, a chunk
 * that did not arrive) and would never answer again: it is dropped, this request runs on the main thread, and so do
 * the later ones. `done` gets every answer; it must ignore answers to older requests. Returns a cancel function for a
 * main-thread run.
 */
export function startJob(
  slot: WorkerSlot,
  req: WorkerRequest,
  done: (res: WorkerResponse) => void,
  make: () => Worker | null = createWorker,
  schedule: Schedule = nextFrame,
): (() => void) | undefined {
  if (slot.running && slot.worker) {
    slot.worker.terminate()
    slot.worker = null
  }
  if (!slot.broken) slot.worker ??= make()
  slot.running = true
  const onMain = () => schedule(() => done(runRequest(req)))
  const w = slot.worker
  if (!w) return onMain()
  w.onmessage = (e: MessageEvent<WorkerResponse>) => done(e.data)
  w.onerror = (e) => {
    e.preventDefault()
    w.terminate()
    if (slot.worker === w) slot.worker = null
    slot.broken = true
    onMain()
  }
  w.postMessage(req)
  return undefined
}

/**
 * One robustness calculation in a Web Worker of its own. A new `job` (a new object: memoize it) cancels the running
 * calculation (the worker is terminated and a new one started) and starts the new one; answers to older requests are
 * dropped by id. The previous result stays until the new one arrives.
 */
function useWorkerJob<T>(job: Job): JobState<T> {
  const [state, setState] = useState<JobState<T>>({ result: null, busy: true, failed: false, slow: false, progress: null })
  const slot = useRef<WorkerSlot>({ worker: null, running: false, broken: false })
  const lastId = useRef(0)

  useEffect(() => {
    const id = ++lastId.current
    const req = { ...job, id } as WorkerRequest
    const done = (res: WorkerResponse) => {
      if (res.id !== lastId.current) return
      if ('progress' in res) {
        setState((s) => ({ ...s, progress: res.progress }))
        return
      }
      slot.current.running = false
      setState((s) =>
        'result' in res
          ? { result: res.result as T, busy: false, failed: false, slow: false, progress: null }
          : { result: s.result, busy: false, failed: true, slow: false, progress: null },
      )
    }
    setState((s) => (s.busy && !s.failed && !s.slow && !s.progress ? s : { ...s, busy: true, failed: false, slow: false, progress: null }))
    // Progress is shown only for a job that outlasts SLOW_MS.
    const timer = setTimeout(() => setState((s) => (s.busy ? { ...s, slow: true } : s)), SLOW_MS)
    // Without a worker the calculation runs after this frame, so the previous result and the status paint first.
    const cancel = startJob(slot.current, req, done)
    return () => {
      clearTimeout(timer)
      cancel?.()
    }
  }, [job])

  useEffect(
    () => () => {
      slot.current.worker?.terminate()
      slot.current.worker = null
      slot.current.running = false
    },
    [],
  )

  return state
}

/** Monte Carlo weights (core monteCarlo) in a worker; `run` is the ranking method and options (memoize it). */
export function useMonteCarlo(
  problem: Problem,
  weights: readonly number[],
  run: RankingRun,
  concentration: Concentration,
  n: number,
  seed: number,
): JobState<MonteCarloResult> {
  const job = useMemo(
    (): Job => ({ kind: 'monteCarlo', problem, weights: [...weights], run, concentration, n, seed }),
    [problem, weights, run, concentration, n, seed],
  )
  return useWorkerJob<MonteCarloResult>(job)
}

/** The sweep of criterion k (core sweepWeight) and its crossing marks, in a worker; `run` as in useMonteCarlo. */
export function useSweep(problem: Problem, weights: readonly number[], run: RankingRun, k: number): JobState<SweepResult> {
  const job = useMemo(
    (): Job => ({ kind: 'sweep', problem, weights: [...weights], run, k }),
    [problem, weights, run, k],
  )
  return useWorkerJob<SweepResult>(job)
}
