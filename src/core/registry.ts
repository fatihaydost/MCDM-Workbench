import { critic } from './methods/critic'
import { edas } from './methods/edas'
import { entropy } from './methods/entropy'
import { equal } from './methods/equal'
import { merec } from './methods/merec'
import { saw } from './methods/saw'
import { sd } from './methods/sd'
import { topsis } from './methods/topsis'
import { vikor } from './methods/vikor'
import type { Method, RankingMethod, WeightingMethod } from './types'

const weighting: WeightingMethod[] = [critic, entropy, sd, merec, equal]
const ranking: RankingMethod[] = [topsis, saw, vikor, edas]

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
