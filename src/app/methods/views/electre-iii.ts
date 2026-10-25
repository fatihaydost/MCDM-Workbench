import { electreIII as electreIIIMethod, type ElectreIIIParams } from '../../../core'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./electre-iii.pictures')

const WANG_2008_PARAMS: ElectreIIIParams = {
  q: [
    { abs: 1000 },
    { rel: 0.1 },
    { rel: 0.1 },
    { abs: 5 },
    { rel: 0.1 },
    { rel: 0.1 },
    { rel: 0.1 },
    { abs: 2 },
    { abs: 0.2 },
    { abs: 0 },
    { abs: 0 },
  ],
  p: [
    { abs: 2000 },
    { rel: 0.2 },
    { rel: 0.2 },
    { abs: 10 },
    { rel: 0.2 },
    { rel: 0.2 },
    { rel: 0.2 },
    { abs: 4 },
    { abs: 0.4 },
    { abs: 1 },
    { abs: 1 },
  ],
}

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
      const res = electreIIIMethod.compute(p, w, WANG_2008_PARAMS)
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
  pictureShowsScores: true,
  verdict: (result, names, t, format) => {
    const descStep = result.steps.find((s) => s.key === 'electre-iii.descending')
    const ascStep = result.steps.find((s) => s.key === 'electre-iii.ascending')
    const desc = descStep && 'vector' in descStep ? descStep.vector : undefined
    const asc = ascStep && 'vector' in ascStep ? ascStep.vector : undefined
    if (!desc || !asc) return null
    const set = result.ranking
      .map((r, i) => (r === 1 ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b)
    if (set.length === 0) return null
    const setNames = set.map((i) => names[i] ?? `#${i + 1}`)
    const list = setNames.join(', ')
    const meanRank = 0.5 * ((desc[set[0]!] ?? 0) + (asc[set[0]!] ?? 0))
    const dec = format(0.5).includes(',') ? ',' : '.'
    const meanRankStr = meanRank.toFixed(1).replace('.', dec)
    const rankDetails = set.map((i) => `r↓ = ${desc[i] ?? 1}, r↑ = ${asc[i] ?? 1}`).join(' / ')
    const key =
      set.length === 1
        ? 'workbench.results.electreIIIVerdict.rankFirst'
        : 'workbench.results.electreIIIVerdict.shareFirst'
    const resultText = t(key, { names: list, meanRank: meanRankStr, details: rankDetails })
    return {
      set,
      failed: [],
      result: resultText,
      about: [
        [
          t('workbench.results.electreIIIVerdict.distillationRank'),
          `${list} (r̄ = ${meanRankStr}: ${rankDetails})`,
        ],
      ],
    }
  },
  ledger: {
    example: 'wang-2008-waste-incineration',
    fixture: 'electre-iii-wang2008.json#expected.tolerance',
    tolerance: 0.005,
  },
}
