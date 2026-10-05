import { useSyncExternalStore } from 'react'
import type { MethodParams, Problem, RankingMethod } from '../../core'

/** First place kept in `held` of `total` one-at-a-time weight nudges. */
export type RobustnessSummary = { held: number; total: number }
export type SummarizeRobustness = (
  problem: Problem,
  weights: readonly number[],
  method: RankingMethod,
  params: MethodParams,
) => RobustnessSummary | null

let summarize: SummarizeRobustness | null = null
const listeners = new Set<() => void>()

/**
 * Called by the robustness chunk when it loads. The rail's status line then uses it; until then the rail shows no
 * status for the stage, so the /app entry does not carry the robustness code.
 */
export function registerRobustnessSummary(fn: SummarizeRobustness): void {
  summarize = fn
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

export function useRobustnessSummary(): SummarizeRobustness | null {
  return useSyncExternalStore(
    subscribe,
    () => summarize,
    () => null,
  )
}
