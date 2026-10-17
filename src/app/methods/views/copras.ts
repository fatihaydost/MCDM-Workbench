import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./copras.pictures')
const EXAMPLE = 'ozcan-celik-2021-separators'

export const copras: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Each separator's S+ and cost bonus as one stack, best first; the example's weights are Entropy's, as in the paper.
  thumb: ({ problem, geometry }) => {
    const p = problem(EXAMPLE)
    const w = geometry.entropyParts(p)?.weights
    const c = w ? geometry.coprasParts(p, w) : null
    return { kind: 'stack', rows: c ? c.order.map((i) => [c.sPlus[i]!, c.bonus[i]!]) : [] }
  },
  // N after Q; the picture draws S+ and the bonus up to Q in rank order with N beside it, so it replaces the score chart.
  columns: [{ step: 'copras.utility', label: 'workbench.ranking.columns.utility', after: true, decimals: 2 }],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  ledger: { example: EXAMPLE, fixture: 'copras-ozcan-celik2021.json#expected.tolerance', tolerance: 0.0001 },
}
