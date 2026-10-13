import { useTranslation } from 'react-i18next'
import type { EdasIdeaLabels } from '../../features/illustrations'

/** The EDAS picture's words, shared by the Ranking stage and the method page (which has its own title and caption). */
export function useEdasLabels(
  titleKey: 'workbench.visual.edas.title' | 'methods.page.idea.edas.title',
  captionKey: 'workbench.visual.edas.caption' | 'methods.page.idea.edas.caption',
): EdasIdeaLabels {
  const { t } = useTranslation()
  return {
    title: t(titleKey),
    caption: t(captionKey),
    above: t('workbench.visual.edas.above'),
    below: t('workbench.visual.edas.below'),
    average: t('workbench.visual.edas.average'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    score: t('workbench.ranking.score.edas.name'),
    sp: 'SP',
    sn: 'SN',
    legend: t('workbench.visual.edas.legend'),
    others: t('workbench.visual.edas.others'),
    segmentAbove: (alternative, criterion, value, score) => t('workbench.visual.edas.segmentAbove', { alternative, criterion, value, score }),
    segmentBelow: (alternative, criterion, value, score) => t('workbench.visual.edas.segmentBelow', { alternative, criterion, value, score }),
    segmentAt: (alternative, criterion, score) => t('workbench.visual.edas.segmentAt', { alternative, criterion, score }),
    readoutAbove: (alternative, criterion, value) => t('workbench.visual.edas.readoutAbove', { alternative, criterion, value }),
    readoutBelow: (alternative, criterion, value) => t('workbench.visual.edas.readoutBelow', { alternative, criterion, value }),
    readoutAt: (alternative, criterion) => t('workbench.visual.edas.readoutAt', { alternative, criterion }),
  }
}
