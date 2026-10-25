import { mabac as method } from '../../../core/methods/mabac'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./mabac.pictures')
const EXAMPLE = 'pamucar-cirovic-2015-forklifts'

export const mabac: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Every forklift's S in rank order, from zero: right of the line above the border, left of it below.
  thumb: ({ problem, weights }) => {
    const res = method.compute(problem(EXAMPLE), weights(EXAMPLE), {})
    const order = res.scores.map((_, i) => i).sort((a, b) => res.ranking[a]! - res.ranking[b]! || a - b)
    return { kind: 'diverging', rows: order.map((i) => ({ below: Math.max(-res.scores[i]!, 0), above: Math.max(res.scores[i]!, 0) })) }
  },
  // The picture draws every row's distances and S in rank order, so it takes the score chart's place.
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  ledger: { example: EXAMPLE, fixture: 'mabac-pamucar-cirovic2015-forklifts.json#expected.tolerance_vs_published.S', tolerance: 0.0001 },
}
