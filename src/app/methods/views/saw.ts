import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./saw.pictures')

export const saw: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: 'podvezko-2011-baltic',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Each country's score as a stack of contributions, best first.
  thumb: ({ problem, weights, geometry }) => {
    const p = geometry.sawParts(problem('podvezko-2011-baltic'), weights('podvezko-2011-baltic'))
    return { kind: 'stack', rows: p ? p.order.map((i) => p.contributions[i]!) : [] }
  },
  // No columns: the contributions are the picture (each bar ends at S, so it replaces the score chart), and the full
  // matrix is in the calculation.
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  ledger: { example: 'podvezko-2011-baltic', fixture: 'saw-podvezko2011.json#expected.tolerance', tolerance: 0.0005 },
}
