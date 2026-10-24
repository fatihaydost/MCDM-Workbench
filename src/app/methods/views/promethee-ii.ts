import { prometheeII as method } from '../../../core/methods/promethee-ii'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./promethee-ii.pictures')
const EXAMPLE = 'goswami-2020-laptops'

export const prometheeII: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Each laptop model's net flow φ in rank order around zero: positive to the right, negative to the left.
  thumb: ({ problem, weights }) => {
    const res = method.compute(problem(EXAMPLE), weights(EXAMPLE), {})
    const order = res.scores.map((_, i) => i).sort((a, b) => res.ranking[a]! - res.ranking[b]!)
    return { kind: 'diverging', rows: order.map((i) => ({ below: Math.max(-res.scores[i]!, 0), above: Math.max(res.scores[i]!, 0) })) }
  },
  columns: [
    { step: 'promethee-ii.positiveFlow', label: 'workbench.ranking.columns.positiveFlow' },
    { step: 'promethee-ii.negativeFlow', label: 'workbench.ranking.columns.negativeFlow' },
  ],
  columnsFromSm: true,
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  ledger: {
    example: EXAMPLE,
    fixture: 'promethee-ii-brans1986.json#goswami2020.tolerance',
    tolerance: 0.00002,
  },
}
