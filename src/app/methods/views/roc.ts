import { roc as method } from '../../../core'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./roc.pictures')

export const roc: MethodView<'weighting'> = {
  kind: 'weighting',
  idea: {
    example: 'roszkowska-2013-rank-weights',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // The weights as bars, the largest in the accent.
  thumb: ({ problem, geometry }) => {
    const weights = method.compute(problem('roszkowska-2013-rank-weights'), {}).weights
    const highlight =
      weights.length > 1 && Math.max(...weights) - Math.min(...weights) > 1e-12 ? geometry.argMax(weights) : -1
    return { kind: 'bars', values: weights, highlight }
  },
  columns: [{ step: 'roc.ranks', label: 'workbench.weights.columns.criterionRank', decimals: 0 }],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: {
    example: 'roszkowska-2013-rank-weights',
    fixture: 'roc-roszkowska2013.json#expected.tolerance_vs_published',
    tolerance: 0.015,
  },
}
