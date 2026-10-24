import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./moora.pictures')

export const moora: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: 'brauers-zavadskas-2010-projects',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Each alternative's cost sum S- to the left of zero and benefit sum S+ to the right, best first.
  thumb: ({ problem, weights, geometry }) => {
    const mr = geometry.mooraParts(problem('brauers-zavadskas-2010-projects'), weights('brauers-zavadskas-2010-projects'))
    return { kind: 'diverging', rows: mr ? mr.order.map((i) => ({ below: mr.sMinus[i]!, above: mr.sPlus[i]! })) : [] }
  },
  columns: [
    { step: 'moora.benefitSum', label: 'workbench.ranking.columns.benefitSum' },
    { step: 'moora.costSum', label: 'workbench.ranking.columns.costSum' },
  ],
  columnsFromSm: true,
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  ledger: {
    example: 'brauers-zavadskas-2010-projects',
    fixture: 'moora-brauers-zavadskas2010.json#expected.tolerance_vs_published_unweighted',
    tolerance: 0.0005,
  },
}
