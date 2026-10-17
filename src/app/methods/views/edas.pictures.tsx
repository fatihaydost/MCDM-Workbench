import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { EdasIdea } from '../../../features/illustrations/EdasIdea'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { useEdasLabels } from '../../workbench/edasLabels'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Ranking stage: each alternative's weighted distance above (right) and below (left) the average, AS beside it. */
export function Stage({ problem, weights, className }: StagePictureProps) {
  const labels = useEdasLabels('workbench.visual.edas.title', 'workbench.visual.edas.caption')
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return <EdasIdea problem={problem} weights={weights} format={format} labels={labels} className={cn('max-w-[880px]', className)} />
}

/** Method page: the same picture on the comparison example of its own paper (ten rows read better than 47 items). */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(3)
  const labels = useEdasLabels('methods.page.idea.edas.title', 'methods.page.idea.edas.caption')
  return (
    <div className="flex flex-col gap-2">
      <EdasIdea
        problem={problem}
        weights={example.weights ?? []}
        format={(v) => format(v, 4)}
        labels={{ ...labels, showTable: t('methods.page.idea.showTable'), alternative: t('methods.page.idea.alternative') }}
        className="max-w-[880px]"
      />
      <IdeaSource example={example} />
    </div>
  )
}
