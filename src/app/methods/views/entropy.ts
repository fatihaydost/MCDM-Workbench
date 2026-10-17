import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./entropy.pictures')

export const entropy: MethodView<'weighting'> = {
  kind: 'weighting',
  idea: {
    example: 'zavadskas-2017-vilnius',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // The most even criterion's shares next to the most uneven one's.
  thumb: ({ problem, geometry }) => {
    const parts = geometry.entropyParts(problem('zavadskas-2017-vilnius'))
    const sharesOf = (j: number) => parts?.shares.map((row) => row[j]!) ?? []
    return { kind: 'shares', even: sharesOf(parts?.pair[0] ?? 0), uneven: sharesOf(parts?.pair[1] ?? 1) }
  },
  // d next to w: on homogeneous data tiny differences in d decide the weights (docs/research/methods/entropy.md).
  columns: [
    { step: 'entropy.entropy', label: 'workbench.weights.columns.entropy' },
    { step: 'entropy.diversification', label: 'workbench.weights.columns.diversification' },
  ],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: { example: 'zavadskas-2017-vilnius', fixture: 'entropy-zavadskas2017.json#expected.tolerance', tolerance: 0.0001 },
}
