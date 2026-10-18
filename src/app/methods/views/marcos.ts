import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./marcos.pictures')
const EXAMPLE = 'stevic-brkovic-2020-drivers'

export const marcos: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // The ideal row, five drivers spread over the ranking (best first), the anti-ideal row.
  thumb: ({ problem, weights, geometry }) => {
    const p = geometry.marcosParts(problem(EXAMPLE), weights(EXAMPLE))
    if (!p) return { kind: 'ghostRows', rows: [], ideal: 1, antiIdeal: 0 }
    const picks = [0, 1, 2, 3, 4].map((k) => p.order[Math.round((k * (p.order.length - 1)) / 4)]!)
    return { kind: 'ghostRows', rows: picks.map((i) => p.s[i]!), ideal: p.sAi, antiIdeal: p.sAai }
  },
  // f(K-) and f(K+) are one number each for the whole table (decision 3): shown once above it, not as columns.
  constants: [
    { step: 'marcos.fKMinus', symbol: 'f(K⁻)' },
    { step: 'marcos.fKPlus', symbol: 'f(K⁺)' },
  ],
  // The picture draws S in rank order between the two imaginary rows with f(K) beside it, so it replaces the score chart.
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  ledger: { example: EXAMPLE, fixture: 'marcos-stevic-brkovic2020.json#expected.tolerance', tolerance: 0.001 },
}
