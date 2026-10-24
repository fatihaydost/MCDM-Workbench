import { codas as method } from '../../../core/methods/codas'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./codas.pictures')
const EXAMPLE = 'badi-2018-suppliers'

export const codas: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Each supplier's H in rank order around zero: positive to the right, negative to the left.
  thumb: ({ problem, weights }) => {
    const res = method.compute(problem(EXAMPLE), weights(EXAMPLE), {})
    const order = res.scores.map((_, i) => i).sort((a, b) => res.ranking[a]! - res.ranking[b]!)
    return { kind: 'diverging', rows: order.map((i) => ({ below: Math.max(-res.scores[i]!, 0), above: Math.max(res.scores[i]!, 0) })) }
  },
  columns: [
    { step: 'codas.euclidean', label: 'workbench.ranking.columns.euclidean' },
    { step: 'codas.taxicab', label: 'workbench.ranking.columns.taxicab' },
  ],
  columnsFromSm: true,
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  ledger: {
    example: EXAMPLE,
    fixture: 'codas-ghorabaee2016.json#badi2018.published.tolerance',
    tolerance: 0.0005,
  },
}
