import { sd as method } from '../../../core'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./sd.pictures')

export const sd: MethodView<'weighting'> = {
  kind: 'weighting',
  idea: {
    example: 'diakoulaki-1995-pharma',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // The weights as bars, the largest in the accent.
  thumb: ({ problem, geometry }) => {
    const weights = method.compute(problem('diakoulaki-1995-pharma'), {}).weights
    return { kind: 'bars', values: weights, highlight: geometry.argMax(weights) }
  },
  columns: [{ step: 'sd.sigma', label: 'workbench.weights.columns.spread' }],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: { example: 'diakoulaki-1995-pharma', fixture: 'sd-diakoulaki1995.json#expected.tolerance', tolerance: 0.0005 },
}
