import { critic } from './methods/critic'
import { entropy } from './methods/entropy'
import { equal } from './methods/equal'
import { topsis } from './methods/topsis'
import type { Method, RankingMethod, WeightingMethod } from './types'

const weighting: WeightingMethod[] = [critic, entropy, equal]
const ranking: RankingMethod[] = [topsis]

export const weightingMethods: readonly WeightingMethod[] = weighting
export const rankingMethods: readonly RankingMethod[] = ranking

export function listMethods(kind?: Method['kind']): Method[] {
  if (kind === 'weighting') return [...weighting]
  if (kind === 'ranking') return [...ranking]
  return [...weighting, ...ranking]
}

export function getMethod(id: string): Method | undefined {
  return listMethods().find((mt) => mt.id === id)
}

export const getWeightingMethod = (id: string): WeightingMethod | undefined => weighting.find((mt) => mt.id === id)
export const getRankingMethod = (id: string): RankingMethod | undefined => ranking.find((mt) => mt.id === id)
