import { describe, expect, it } from 'vitest'
import type { WorkerRequest, WorkerResponse } from './robustness.worker'
import { startJob, type WorkerSlot } from './useWorkerJob'

/** A worker that never loads: like a browser, it fires one error and then ignores every message. */
class DeadWorker {
  onmessage: ((e: MessageEvent<WorkerResponse>) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  posted = 0
  terminated = false
  postMessage() {
    this.posted++
    if (this.posted === 1) queueMicrotask(() => this.onerror?.({ preventDefault() {}, message: 'load failed' } as ErrorEvent))
  }
  terminate() {
    this.terminated = true
  }
}

const sweepReq = (id: number): WorkerRequest => ({
  kind: 'sweep',
  id,
  problem: { alternatives: ['A', 'B'], criteria: [{ name: 'x', type: 'benefit' }, { name: 'y', type: 'benefit' }], matrix: [[1, 2], [2, 1]] },
  weights: [0.5, 0.5],
  method: 'topsis',
  params: {},
  k: 0,
})

const now = (fn: () => void) => {
  fn()
  return () => {}
}

describe('startJob: a worker that fails to load', () => {
  it('answers the failed request and every later one on the main thread, never posting to the dead worker again', async () => {
    const slot: WorkerSlot = { worker: null, running: false, broken: false }
    const answers: WorkerResponse[] = []
    const made: DeadWorker[] = []
    const make = () => {
      const w = new DeadWorker()
      made.push(w)
      return w as unknown as Worker
    }
    const done = (res: WorkerResponse) => {
      slot.running = false
      answers.push(res)
    }
    startJob(slot, sweepReq(1), done, make, now)
    await new Promise((r) => setTimeout(r, 0))
    expect(made).toHaveLength(1)
    expect(made[0]!.terminated).toBe(true)
    expect(slot).toMatchObject({ worker: null, broken: true })
    expect(answers.map((a) => [a.id, 'result' in a])).toEqual([[1, true]])

    startJob(slot, sweepReq(2), done, make, now)
    expect(made).toHaveLength(1) // no new worker, nothing posted to the dead one
    expect(made[0]!.posted).toBe(1)
    expect(answers.map((a) => [a.id, 'result' in a])).toEqual([[1, true], [2, true]])
  })
})
