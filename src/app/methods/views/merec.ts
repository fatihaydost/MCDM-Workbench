import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./merec.pictures')

export const merec: MethodView<'weighting'> = {
  kind: 'weighting',
  idea: {
    example: 'keshavarz-2021-merec',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Per criterion the drops its removal causes, stacked (the bar is E), largest first.
  thumb: ({ problem, geometry }) => {
    const mr = geometry.merecParts(problem('keshavarz-2021-merec'))
    const rows = mr ? mr.effect.map((_, j) => j).sort((a, b) => mr.effect[b]! - mr.effect[a]!).map((j) => mr.drops[j]!) : []
    return { kind: 'stack', rows }
  },
  columns: [{ step: 'merec.removalEffect', label: 'workbench.weights.columns.removalEffect' }],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: {
    example: 'keshavarz-2021-merec',
    fixture: 'merec-keshavarz2021-illustrative.json#expected.tolerance.weights',
    tolerance: 0.00005,
  },
}
