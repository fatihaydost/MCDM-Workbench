import { critic as method } from '../../../core'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./critic.pictures')

export const critic: MethodView<'weighting'> = {
  kind: 'weighting',
  idea: {
    example: 'krishnan-2021-smartphones',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  thumb: ({ problem, geometry }) => {
    const weights = method.compute(problem('krishnan-2021-smartphones'), {}).weights
    return { kind: 'bars', values: weights, highlight: geometry.argMax(weights) }
  },
  columns: [
    { step: 'critic.sigma', label: 'workbench.weights.columns.sigma' },
    { step: 'critic.conflict', label: 'workbench.weights.columns.conflict' },
    { step: 'critic.information', label: 'workbench.weights.columns.information' },
  ],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: { example: 'krishnan-2021-smartphones', fixture: 'critic-krishnan2021.json#expected.tolerance', tolerance: 0.00005 },
}
