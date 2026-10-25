import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { vikorCompromise, type RankingResult, type VikorCompromise } from '../../core'
import { findStep } from './shared'
import type { VikorIdeaLabels } from '../../features/illustrations/VikorIdea'
import type { Verdict } from '../methods/views/types'

type TitleKey = 'workbench.visual.vikor.title' | 'methods.page.idea.vikor.title'

/** The VIKOR picture's words, shared by the Ranking stage and the method page (only the title differs). */
export function useVikorLabels(titleKey: TitleKey): VikorIdeaLabels {
  const { t } = useTranslation()
  return vikorLabels(t, titleKey)
}

export function vikorLabels(t: TFunction, titleKey: TitleKey): VikorIdeaLabels {
  return {
    title: t(titleKey),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    axisS: t('workbench.visual.vikor.axisS'),
    axisR: t('workbench.visual.vikor.axisR'),
    ideal: t('workbench.visual.vikor.ideal'),
    barsTitle: t('workbench.ranking.score.vikor.title'),
    threshold: t('workbench.visual.vikor.threshold'),
    s: 'S',
    r: 'R',
    q: 'Q',
    inSet: t('workbench.visual.vikor.inSet'),
    yes: t('workbench.visual.vikor.yes'),
    no: t('workbench.visual.vikor.no'),
    c1: (ok: boolean, first: string, second: string, gap: string, dq: string) =>
      t(ok ? 'workbench.visual.vikor.c1Met' : 'workbench.visual.vikor.c1Failed', { first, second, gap, dq }),
    c2: (ok: boolean, first: string, byS: boolean, byR: boolean) =>
      ok
        ? t((byS && byR) || (!byS && !byR) ? 'workbench.visual.vikor.c2Both' : byS ? 'workbench.visual.vikor.c2S' : 'workbench.visual.vikor.c2R', { first })
        : t('workbench.visual.vikor.c2Failed', { first }),
    result: (names: string[]) =>
      names.length === 1 ? t('workbench.visual.vikor.resultOne', { name: names[0] }) : t('workbench.visual.vikor.resultSet', { names: names.join(', ') }),
  }
}

/** The compromise of a VIKOR result from its S and R steps, or null when the result has none (another method). */
export function vikorCompromiseOf(result: RankingResult): VikorCompromise | null {
  const S = findStep(result.steps, 'vikor.groupUtility')?.vector
  const R = findStep(result.steps, 'vikor.individualRegret')?.vector
  return S && R ? vikorCompromise(S, R, result.scores) : null
}

/**
 * VIKOR's own answer for a result: C1, C2 and the compromise set, in the picture's words. Null when the result has no
 * S and R steps (another method). The VIKOR view's `verdict` (src/app/methods/views/vikor.ts): the Results headline,
 * the workbook, the rail and Compare's note use it, so none of them names one winner where the method names a set.
 */
export function vikorVerdict(
  result: RankingResult,
  names: readonly string[],
  t: TFunction,
  format: (v: number) => string,
): Verdict | null {
  const c = vikorCompromiseOf(result)
  if (!c) return null
  const labels = vikorLabels(t, 'workbench.visual.vikor.title')
  const first = names[c.first]!
  const failed: string[] = []
  if (!c.c1) failed.push(labels.c1(false, first, names[c.second]!, format(c.advantage), format(c.dq)))
  if (!c.c2) failed.push(labels.c2(false, first, c.bestByS, c.bestByR))
  const setNames = c.set.map((i) => names[i]!)
  return {
    set: c.set,
    failed,
    result: labels.result(setNames),
    about: [
      [t('workbench.results.about.vikorC1'), labels.c1(c.c1, first, names[c.second]!, format(c.advantage), format(c.dq))],
      [t('workbench.results.about.vikorC2'), labels.c2(c.c2, first, c.bestByS, c.bestByR)],
      [t('workbench.results.about.vikorSet'), setNames.join(', ')],
    ],
  }
}
