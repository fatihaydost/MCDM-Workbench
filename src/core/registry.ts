import { ahp, ahpRanking } from './methods/ahp'
import { aras } from './methods/aras'
import { bwm } from './methods/bwm'
import { cilos } from './methods/cilos'
import { cocoso } from './methods/cocoso'
import { codas } from './methods/codas'
import { copras } from './methods/copras'
import { critic } from './methods/critic'
import { edas } from './methods/edas'
import { electreI } from './methods/electre-i'
import { electreIII } from './methods/electre-iii'
import { entropy } from './methods/entropy'
import { equal } from './methods/equal'
import { lopcow } from './methods/lopcow'
import { mabac } from './methods/mabac'
import { marcos } from './methods/marcos'
import { merec } from './methods/merec'
import { moora } from './methods/moora'
import { prometheeII } from './methods/promethee-ii'
import { roc } from './methods/roc'
import { saw } from './methods/saw'
import { sd } from './methods/sd'
import { swara } from './methods/swara'
import { topsis } from './methods/topsis'
import { vikor } from './methods/vikor'
import { waspas } from './methods/waspas'
import type { Method, RankingMethod, WeightingMethod } from './types'

/** The ids of the registered methods, in registry order. The store's method id types derive from these. */
export const WEIGHTING_IDS = ['critic', 'entropy', 'sd', 'merec', 'lopcow', 'cilos', 'equal', 'bwm', 'ahp', 'roc', 'swara'] as const
export const RANKING_IDS = ['topsis', 'saw', 'vikor', 'edas', 'waspas', 'copras', 'marcos', 'cocoso', 'mabac', 'moora', 'aras', 'codas', 'promethee-ii', 'electre-i', 'electre-iii', 'ahp-ranking'] as const
export type WeightingId = (typeof WEIGHTING_IDS)[number]
export type RankingId = (typeof RANKING_IDS)[number]

// Records, so an id without its method (or a method without its id) does not compile.
const weightingById: Record<WeightingId, WeightingMethod> = { critic, entropy, sd, merec, lopcow, cilos, equal, bwm, ahp, roc, swara }
const rankingById: Record<RankingId, RankingMethod> = {
  topsis,
  saw,
  vikor,
  edas,
  waspas,
  copras,
  marcos,
  cocoso,
  mabac,
  moora,
  aras,
  codas,
  'promethee-ii': prometheeII,
  'electre-i': electreI,
  'electre-iii': electreIII,
  'ahp-ranking': ahpRanking,
}
// Pure: a bundle that uses only one kind (the robustness worker: ranking) drops the other kind's methods.
const weighting: WeightingMethod[] = /* @__PURE__ */ WEIGHTING_IDS.map((id) => weightingById[id])
const ranking: RankingMethod[] = /* @__PURE__ */ RANKING_IDS.map((id) => rankingById[id])

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
