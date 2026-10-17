import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { SawNormalization } from '../../../core/methods/saw'
import { SawContributions } from '../../../features/illustrations/SawContributions'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { DECIMALS, scoreWords } from '../../workbench/shared'
import { IdeaSource } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Ranking stage: each alternative's score as a stack of its criteria's contributions. */
export function Stage({ problem, weights, params, className }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const normalization = params.normalization as SawNormalization | undefined
  return (
    <SawContributions
      problem={problem}
      weights={weights}
      params={normalization ? { normalization } : {}}
      format={format}
      labels={{
        title: t('workbench.visual.saw.title'),
        showTable: t('workbench.chart.showTable'),
        alternative: t('workbench.alternative'),
        score: scoreWords('saw', t).name,
        legend: t('workbench.visual.saw.legend'),
        others: t('workbench.visual.saw.others'),
        segment: (alternative, criterion, value, score) => t('workbench.visual.saw.segment', { alternative, criterion, value, score }),
        readout: (alternative, criterion, value, score) => t('workbench.visual.saw.readout', { alternative, criterion, value, score }),
      }}
      className={cn('max-w-[760px]', className)}
    />
  )
}

/** Method page: the same picture on the published example (its answers hover and focus, no step-through story). */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(3)
  return (
    <div className="flex flex-col gap-2">
      <SawContributions
        problem={problem}
        weights={example.weights ?? []}
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.saw.title'),
          caption: t('methods.page.idea.saw.caption'),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
          score: t('workbench.ranking.score.saw.name'),
          legend: t('workbench.visual.saw.legend'),
          others: t('workbench.visual.saw.others'),
          segment: (alternative, criterion, value, score) => t('workbench.visual.saw.segment', { alternative, criterion, value, score }),
          readout: (alternative, criterion, value, score) => t('workbench.visual.saw.readout', { alternative, criterion, value, score }),
        }}
        className="max-w-[760px]"
      />
      <IdeaSource example={example} />
    </div>
  )
}
