import { useTranslation } from 'react-i18next'
import { MabacBorder, MabacSumLine, type MabacBorderLabels } from '../../../features/illustrations/MabacBorder'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { IdeaSource } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function useBorderLabels(): MabacBorderLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.mabac.title'),
    caption: t('workbench.visual.mabac.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    score: 'S',
    row: (alternative, score, above, n) => t('workbench.visual.mabac.row', { alternative, score, above, n }),
  }
}

/** Ranking stage: every alternative's distances to the border, up or down, and S on the right. */
export function Stage({ problem, weights, className }: StagePictureProps) {
  const labels = useBorderLabels()
  const { format } = useNumberFormat(4)
  return <MabacBorder problem={problem} weights={weights} format={format} labels={labels} className={cn('max-w-[760px]', className)} />
}

/** Method page: the border picture on the forklifts, then why the order is the min-max weighted sum's: one line. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const labels = useBorderLabels()
  const { format } = useNumberFormat(4)
  const weights = example.weights ?? []
  return (
    <div className="flex flex-col gap-6">
      <MabacBorder
        problem={problem}
        weights={weights}
        format={format}
        labels={{
          ...labels,
          title: t('methods.page.idea.mabac.title'),
          caption: t('methods.page.idea.mabac.caption'),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
        }}
        className="max-w-[760px]"
      />
      <MabacSumLine
        problem={problem}
        weights={weights}
        format={format}
        labels={{
          title: t('methods.page.idea.mabac.sumTitle'),
          caption: t('methods.page.idea.mabac.sumCaption'),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
          x: t('methods.page.idea.mabac.sumX'),
          y: t('methods.page.idea.mabac.sumY'),
          line: (border) => t('methods.page.idea.mabac.sumLine', { border }),
        }}
        className="max-w-[420px]"
      />
      <IdeaSource example={example} />
    </div>
  )
}
