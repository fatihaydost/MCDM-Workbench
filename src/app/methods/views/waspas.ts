import { waspas as method } from '../../../core/methods/waspas'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./waspas.pictures')

export const waspas: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: 'adali-2017-suppliers',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Each supplier's straight line from the weighted product to the weighted sum; the first at λ = 0.5 in the accent.
  thumb: ({ problem, weights }) => {
    const res = method.compute(problem('adali-2017-suppliers'), weights('adali-2017-suppliers'), {})
    const at = (key: string) => res.steps.find((x) => x.key === key)!.vector!
    const sum = at('waspas.wsm')
    return { kind: 'lines', rows: at('waspas.wpm').map((product, i) => ({ product, sum: sum[i]! })), highlight: res.ranking.indexOf(1) }
  },
  // Q1 and Q2 before Q; the λ chart draws Q against λ, not in rank order, so the score chart stays.
  columns: [
    { step: 'waspas.wsm', label: 'workbench.ranking.columns.wsm' },
    { step: 'waspas.wpm', label: 'workbench.ranking.columns.wpm' },
  ],
  columnsFromSm: true,
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: { example: 'adali-2017-suppliers', fixture: 'waspas-adali2017.json#expected.tolerance.Q', tolerance: 0.0001 },
}
