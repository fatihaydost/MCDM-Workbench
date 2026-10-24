import { lopcow as method } from '../../../core'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./lopcow.pictures')

export const lopcow: MethodView<'weighting'> = {
  kind: 'weighting',
  idea: {
    example: 'keles-2023-cities',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // The weights as bars, the largest in the accent.
  thumb: ({ problem, geometry }) => {
    const weights = method.compute(problem('keles-2023-cities'), {}).weights
    return { kind: 'bars', values: weights, highlight: geometry.argMax(weights) }
  },
  columns: [
    { step: 'lopcow.rms', label: 'workbench.weights.columns.rms' },
    { step: 'lopcow.stdDev', label: 'workbench.weights.columns.spread' },
    { step: 'lopcow.pv', label: 'workbench.weights.columns.pv' },
  ],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: { example: 'keles-2023-cities', fixture: 'lopcow-keles2023.json#expected.tolerance', tolerance: 0.0005 },
}
