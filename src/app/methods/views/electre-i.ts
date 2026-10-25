import { electreI as method } from '../../../core/methods/electre-i'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./electre-i.pictures')
const EXAMPLE = 'wang-2008-galway-wastewater'

export const electreI: MethodView<'ranking'> = {
  kind: 'ranking',
  idea: {
    example: EXAMPLE,
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Each alternative's net outranking score Φ in rank order around zero: positive to the right, negative to the left.
  thumb: ({ problem, weights }) => {
    const res = method.compute(problem(EXAMPLE), weights(EXAMPLE), {})
    const order = res.scores.map((_, i) => i).sort((a, b) => res.ranking[a]! - res.ranking[b]!)
    return {
      kind: 'diverging',
      rows: order.map((i) => ({ below: Math.max(-res.scores[i]!, 0), above: Math.max(res.scores[i]!, 0) })),
    }
  },
  columns: [
    { step: 'electre-i.kernel', label: 'workbench.ranking.columns.electreIKernel', decimals: 0 },
    { step: 'electre-i.netConcordance', label: 'workbench.ranking.columns.electreINetConcordance' },
    { step: 'electre-i.netDiscordance', label: 'workbench.ranking.columns.electreINetDiscordance' },
  ],
  columnsFromSm: true,
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  pictureShowsScores: true,
  verdict: (result, names, t) => {
    const kernelStep = result.steps.find((s) => s.key === 'electre-i.kernel')
    const vec = kernelStep && 'vector' in kernelStep ? kernelStep.vector : undefined
    if (!vec) return null
    const set = vec
      .map((v, i) => (v > 0 ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => (result.ranking[a] ?? a) - (result.ranking[b] ?? b) || a - b)
    const setNames = set.map((i) => names[i] ?? `#${i + 1}`)
    const list = setNames.join(', ')
    const cycleWarning = result.warnings?.find((w) => w.code === 'electre-i.cycle-detected')
    const hasCycles = Boolean(result.diagnostics?.cycles) || Boolean(cycleWarning)
    const key =
      set.length === 0
        ? 'workbench.results.electreIVerdict.emptyKernel'
        : hasCycles
          ? 'workbench.results.electreIVerdict.kernelWithCycles'
          : 'workbench.results.electreIVerdict.kernel'
    const translated = t(key, { names: list, count: setNames.length })
    const resultText =
      translated && translated !== key
        ? translated
        : set.length === 0
          ? 'Outranking kernel K is empty.'
          : hasCycles
            ? `Outranking kernel K (after condensing cycles): ${list}`
            : `Outranking kernel K: ${list}`
    const failed = hasCycles || set.length !== 1 ? [''] : []
    const kernelLabel = t('workbench.ranking.columns.electreIKernel')
    return {
      set,
      failed,
      result: resultText,
      about: [
        [
          kernelLabel && kernelLabel !== 'workbench.ranking.columns.electreIKernel' ? kernelLabel : 'Kernel K',
          list || '—',
        ],
      ],
    }
  },
  ledger: {
    example: EXAMPLE,
    fixture: 'electre-i-wang2008.json#wang2008.tolerance',
    tolerance: 0.0005,
  },
}
