import { preloadable } from '../../preloadable'
import { vikorVerdict } from '../../workbench/vikorLabels'
import type { MethodView } from './types'

const pictures = () => import('./vikor.pictures')

export const vikor: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: 'keshavarz-2015-ten-alternatives',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // On the ten-alternative example: S against R, the DQ line and the compromise set (C1 fails there).
  thumb: ({ problem, weights, geometry }) => {
    const vk = geometry.vikorParts(problem('keshavarz-2015-ten-alternatives'), weights('keshavarz-2015-ten-alternatives'))
    return {
      kind: 'compromise',
      points: vk ? vk.sTerm.map((x, i) => ({ x, y: vk.rTerm[i]! })) : [],
      v: vk?.v ?? 0.5,
      q: vk ? vk.Q[vk.compromise.first]! + vk.compromise.dq : 0,
      inSet: vk?.compromise.set ?? [],
    }
  },
  // S and R before Q in the table; the picture draws every Q as a bar in rank order (with the DQ band), so it takes
  // the score chart's place. S and R are long numbers in long headers; at phone width the plane's table still has them.
  columns: [
    { step: 'vikor.groupUtility', label: 'workbench.ranking.columns.groupUtility' },
    { step: 'vikor.individualRegret', label: 'workbench.ranking.columns.individualRegret' },
  ],
  columnsFromSm: true,
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  // A compromise set when C1 or C2 fails: the summary, the file, the rail and Compare say so.
  verdict: vikorVerdict,
  ledger: {
    example: 'opricovic-tzeng-2004-f',
    fixture: 'vikor-opricovic-tzeng2004.json#expected.tolerance',
    tolerance: 0.0005,
  },
}
