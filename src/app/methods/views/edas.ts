import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./edas.pictures')

export const edas: MethodView<'ranking'> = {
  kind: 'ranking',
  // The comparison example of its own paper: ten rows and seven criteria read better than the 47 items.
  idea: {
    example: 'keshavarz-2015-ten-alternatives',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Each alternative's SN to the left of the average line and SP to the right, best first.
  thumb: ({ problem, weights, geometry }) => {
    const ed = geometry.edasParts(problem('keshavarz-2015-ten-alternatives'), weights('keshavarz-2015-ten-alternatives'))
    return { kind: 'diverging', rows: ed ? ed.order.map((i) => ({ below: ed.sn[i]!, above: ed.sp[i]! })) : [] }
  },
  // SP and SN before AS; the picture draws both as one diverging bar per alternative in rank order with AS beside it,
  // so it takes the score chart's place.
  columns: [
    { step: 'edas.sp', label: 'workbench.ranking.columns.aboveAverage' },
    { step: 'edas.sn', label: 'workbench.ranking.columns.belowAverage' },
  ],
  columnsFromSm: true,
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  // The paper rounded to 3 and then 2 decimals, so a printed AS can be 0.0055 from the exact one.
  ledger: {
    example: 'keshavarz-2015-inventory',
    fixture: 'edas-keshavarz2015.json#inventory.published.tolerance',
    tolerance: 0.006,
  },
}
