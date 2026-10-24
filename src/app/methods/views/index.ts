import type { RankingMethodId, WeightMethodId } from '../../../state/workbench'
import { aras } from './aras'
import { bwm } from './bwm'
import { cocoso } from './cocoso'
import { copras } from './copras'
import { critic } from './critic'
import { edas } from './edas'
import { entropy } from './entropy'
import { equal } from './equal'
import { manual } from './manual'
import { marcos } from './marcos'
import { mabac } from './mabac'
import { merec } from './merec'
import { saw } from './saw'
import { sd } from './sd'
import { topsis } from './topsis'
import type { MethodView } from './types'
import { vikor } from './vikor'
import { waspas } from './waspas'

export type { IdeaPictureProps, JudgementIdeaProps, MethodView, StagePictureProps, ThumbKit, Verdict } from './types'

export type ViewId = WeightMethodId | RankingMethodId

/**
 * What the UI shows per method id: one module per method in this folder (`<id>.ts`, its pictures in
 * `<id>.pictures.tsx`, loaded on demand). Keyed by every store id, so a method without a view does not compile.
 * The order of the entries is the order of the segmented controls, the catalogue cards and the landing ledger.
 * Light on purpose: data and loaders only, no illustration (they stay out of the catalogue, landing and main chunks).
 */
type Views = { [I in WeightMethodId]: MethodView<'weighting'> } & { [I in RankingMethodId]: MethodView<'ranking'> }

export const methodViews: Readonly<Views> = {
  critic,
  entropy,
  sd,
  merec,
  equal,
  manual,
  bwm,
  topsis,
  saw,
  vikor,
  edas,
  waspas,
  copras,
  marcos,
  cocoso,
  mabac,
  aras,
}

const ids = Object.keys(methodViews) as ViewId[]
export const WEIGHTING_VIEW_IDS = ids.filter((id): id is WeightMethodId => methodViews[id].kind === 'weighting')
export const RANKING_VIEW_IDS = ids.filter((id): id is RankingMethodId => methodViews[id].kind === 'ranking')

/** The view of a method id, or undefined for an id without one (methods in research). */
export const viewOf = (id: string): MethodView | undefined =>
  Object.hasOwn(methodViews, id) ? methodViews[id as ViewId] : undefined

/** Loads every stage picture; settles when all have loaded or failed (a failed one suspends again when rendered). */
export function preloadStagePictures(): Promise<unknown> {
  return Promise.allSettled(ids.map((id) => methodViews[id].stage?.preload()))
}
