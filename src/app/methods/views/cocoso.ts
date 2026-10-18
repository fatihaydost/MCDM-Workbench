import { cocoso as method } from '../../../core/methods/cocoso'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./cocoso.pictures')
const EXAMPLE = 'yazdani-2019-logistics'

export const cocoso: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Five providers in rank order (best first), each a stack of its three readings, each against the column's largest.
  thumb: ({ problem, weights }) => {
    const res = method.compute(problem(EXAMPLE), weights(EXAMPLE), {})
    const cols = ['cocoso.ka', 'cocoso.kb', 'cocoso.kc'].map((key) => res.steps.find((x) => x.key === key)!.vector!)
    const order = res.scores.map((_, i) => i).sort((a, b) => res.ranking[a]! - res.ranking[b]!)
    const picks = [0, 1, 2, 3, 4].map((k) => order[Math.round((k * (order.length - 1)) / 4)]!)
    return { kind: 'stack', rows: picks.map((i) => cols.map((c) => c[i]! / Math.max(...c))) }
  },
  // S and P before k; the picture draws the three readings and k in rank order, so it takes the score chart's place.
  columns: [
    { step: 'cocoso.s', label: 'workbench.ranking.columns.weightedSum' },
    { step: 'cocoso.p', label: 'workbench.ranking.columns.powerSum' },
  ],
  columnsFromSm: true,
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  // The paper prints k to 3 decimals with trailing zeros dropped (1.3 for 1.2987), so k is checked to 0.0015.
  ledger: { example: EXAMPLE, fixture: 'cocoso-yazdani2019-logistics.json#expected.tolerance_vs_published.k', tolerance: 0.0015 },
}
