import { electreI as method } from '../../../core/methods/electre-i'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./electre-i.pictures')
const EXAMPLE = 'wang-2008-galway-wastewater'

export const electreI: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Each alternative's net outranking score Φ in rank order around zero: positive to the right, negative to the left.
  thumb: ({ problem, weights }) => {
    const res = method.compute(problem(EXAMPLE), weights(EXAMPLE), {})
    const order = res.scores.map((_, i) => i).sort((a, b) => res.ranking[a]! - res.ranking[b]!)
    return {
      kind: 'diverging',
      rows: order.map((i) => ({ below: Math.max(-res.scores[i]!, 0), above: Math.max(res.scores[i]!, 0) })),
    }
  },
  columns: [
    { step: 'electre-i.kernel', label: 'workbench.ranking.columns.electreIKernel', decimals: 0 },
    { step: 'electre-i.netConcordance', label: 'workbench.ranking.columns.electreINetConcordance' },
    { step: 'electre-i.netDiscordance', label: 'workbench.ranking.columns.electreINetDiscordance' },
  ],
  columnsFromSm: true,
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  ledger: {
    example: EXAMPLE,
    fixture: 'electre-i-wang2008.json#wang2008.tolerance',
    tolerance: 0.0005,
  },
}
