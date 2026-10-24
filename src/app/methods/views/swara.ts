import { swara as method } from '../../../core'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const EXAMPLE = 'kersuliene-2010-dispute'
const KERSULIENE_2010_S = [0, 0.15, 0.04, 0.29, 0.02, 0.04] as const
const pictures = () => import('./swara.pictures')

export const swara: MethodView<'weighting'> = {
  kind: 'weighting',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // The weights as bars, the largest in the accent.
  thumb: ({ problem, geometry }) => {
    const weights = method.compute(problem(EXAMPLE), { s: KERSULIENE_2010_S }).weights
    return { kind: 'bars', values: weights, highlight: geometry.argMax(weights) }
  },
  columns: [
    { step: 'swara.s', label: 'workbench.weights.columns.stepRatio', decimals: 2 },
    { step: 'swara.q', label: 'workbench.weights.columns.recalculatedWeight', decimals: 4 },
  ],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: {
    example: EXAMPLE,
    fixture: 'swara-kersuliene2010.json#expected.tolerance_vs_published',
    tolerance: 0.005,
  },
}
