import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./aras.pictures')
const EXAMPLE = 'bakir-atalik-2018-airlines'

export const aras: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Five airlines spread across the ranking (best first), showing their utility degree K against the optimal row.
  thumb: ({ problem, weights, geometry }) => {
    const p = geometry.arasParts(problem(EXAMPLE), weights(EXAMPLE))
    if (!p) return { kind: 'bars', values: [], highlight: 0 }
    const picks = [0, 1, 2, 3, 4].map((k) => p.order[Math.round((k * (p.order.length - 1)) / 4)]!)
    return { kind: 'bars', values: picks.map((i) => p.scores[i]!), highlight: 0 }
  },
  // S₀ is a single benchmark constant for the whole table: shown once above the table, not repeated on every row.
  constants: [{ step: 'aras.optimalScore', symbol: 'S₀' }],
  columns: [{ step: 'aras.optimality', label: 'workbench.ranking.columns.arasOptimality' }],
  // The picture draws S in rank order under the optimal row A₀ with K = S / S₀ beside it, so it replaces the score chart.
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  ledger: { example: EXAMPLE, fixture: 'aras-bakir-atalik2018.json#expected.tolerance_vs_published.K', tolerance: 0.00002 },
}
