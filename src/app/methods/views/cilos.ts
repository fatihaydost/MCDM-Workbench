import { cilos as method } from '../../../core'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./cilos.pictures')

export const cilos: MethodView<'weighting'> = {
  kind: 'weighting',
  idea: {
    example: 'zavadskas-2017-vilnius-social',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // The weights as bars, the largest in the accent.
  thumb: ({ problem, geometry }) => {
    const weights = method.compute(problem('zavadskas-2017-vilnius-social'), {}).weights
    const highlight =
      weights.length > 1 && Math.max(...weights) - Math.min(...weights) > 1e-12 ? geometry.argMax(weights) : -1
    return { kind: 'bars', values: weights, highlight }
  },
  columns: [{ step: 'cilos.totalLoss', label: 'workbench.weights.columns.totalLoss', decimals: 4 }],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: {
    example: 'zavadskas-2017-vilnius-social',
    fixture: 'cilos-zavadskas2017.json#expected.tolerance',
    tolerance: 0.0001,
  },
}
