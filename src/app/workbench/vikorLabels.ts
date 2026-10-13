import { useTranslation } from 'react-i18next'
import type { VikorIdeaLabels } from '../../features/illustrations/VikorIdea'

/** The VIKOR picture's words, shared by the Ranking stage and the method page (only the title differs). */
export function useVikorLabels(titleKey: 'workbench.visual.vikor.title' | 'methods.page.idea.vikor.title'): VikorIdeaLabels {
  const { t } = useTranslation()
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
      ok ? t(byS && byR ? 'workbench.visual.vikor.c2Both' : byS ? 'workbench.visual.vikor.c2S' : 'workbench.visual.vikor.c2R', { first }) : t('workbench.visual.vikor.c2Failed', { first }),
    result: (names: string[]) =>
      names.length === 1 ? t('workbench.visual.vikor.resultOne', { name: names[0] }) : t('workbench.visual.vikor.resultSet', { names: names.join(', ') }),
  }
}
