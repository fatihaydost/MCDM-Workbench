import { electreIII as electreIIIMethod } from '../../../core'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./electre-iii.pictures')

export const electreIII: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: 'wang-2008-waste-incineration',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  thumb: ({ problem, weights }) => {
    const p = problem('wang-2008-waste-incineration')
    const w = weights('wang-2008-waste-incineration')
    try {
      const res = electreIIIMethod.compute(p, w, {})
      const cred = res.steps.find((s) => s.key === 'electre-iii.credibility')?.matrix ?? []
      const m = cred.length
      const denom = Math.max(1, m - 1)
      const order = res.ranking.map((_, i) => i).sort((a, b) => res.ranking[a]! - res.ranking[b]! || a - b)
      return {
        kind: 'diverging',
        rows: order.map((a) => {
          let outSum = 0
          let inSum = 0
          for (let b = 0; b < m; b++) {
            if (a !== b) {
              outSum += cred[a]?.[b] ?? 0
              inSum += cred[b]?.[a] ?? 0
            }
          }
          return { below: inSum / denom, above: outSum / denom }
        }),
      }
    } catch {
      return { kind: 'diverging', rows: [] }
    }
  },
  columns: [
    { step: 'electre-iii.descending', label: 'workbench.ranking.columns.descendingRank', decimals: 0 },
    { step: 'electre-iii.ascending', label: 'workbench.ranking.columns.ascendingRank', decimals: 0 },
  ],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: {
    example: 'wang-2008-waste-incineration',
    fixture: 'electre-iii-wang2008.json#expected.tolerance',
    tolerance: 0.005,
  },
}
