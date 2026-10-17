import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./topsis.pictures')

export const topsis: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: 'opricovic-tzeng-2004-f',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // On its own reference example: three well spread points (Opricovic and Tzeng 2004).
  thumb: ({ problem, geometry }) => {
    const proj = geometry.topsisProjection(problem('opricovic-tzeng-2004-f'), [0.5, 0.5])
    return {
      kind: 'plane',
      points: proj ? geometry.distancePoints(proj) : [],
      highlight: proj ? geometry.argMax(proj.closeness) : undefined,
    }
  },
  columns: [
    { step: 'topsis.distanceBest', label: 'workbench.ranking.columns.dPlus' },
    { step: 'topsis.distanceWorst', label: 'workbench.ranking.columns.dMinus' },
  ],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: { example: 'opricovic-tzeng-2004-f', fixture: 'opricovic-tzeng-2004-f.json#expected.tolerance', tolerance: 0.0005 },
}
