import { useTranslation } from 'react-i18next'
import type { MooraIdeaLabels } from '../../features/illustrations'

/** The MOORA picture's words, shared by the Ranking stage and the method page (which has its own title and caption). */
export function useMooraLabels(
  titleKey: 'workbench.visual.moora.title' | 'methods.page.idea.moora.title',
  captionKey: 'workbench.visual.moora.caption' | 'methods.page.idea.moora.caption',
): MooraIdeaLabels {
  const { t } = useTranslation()
  return {
    title: t(titleKey),
    caption: t(captionKey),
    benefitHead: t('workbench.visual.moora.benefitHead'),
    costHead: t('workbench.visual.moora.costHead'),
    zero: t('workbench.visual.moora.zero'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    score: t('workbench.ranking.score.moora.name'),
    sPlus: 'S+',
    sMinus: 'S-',
    legend: t('workbench.visual.moora.legend'),
    others: t('workbench.visual.moora.others'),
    segmentBenefit: (alternative, criterion, value, score) =>
      t('workbench.visual.moora.segmentBenefit', { alternative, criterion, value, score }),
    segmentCost: (alternative, criterion, value, score) =>
      t('workbench.visual.moora.segmentCost', { alternative, criterion, value, score }),
    segmentZero: (alternative, criterion, score) => t('workbench.visual.moora.segmentZero', { alternative, criterion, score }),
    readoutBenefit: (alternative, criterion, value) => t('workbench.visual.moora.readoutBenefit', { alternative, criterion, value }),
    readoutCost: (alternative, criterion, value) => t('workbench.visual.moora.readoutCost', { alternative, criterion, value }),
    readoutZero: (alternative, criterion) => t('workbench.visual.moora.readoutZero', { alternative, criterion }),
  }
}
