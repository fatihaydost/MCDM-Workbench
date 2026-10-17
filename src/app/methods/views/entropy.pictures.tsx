import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { EntropyNormalization } from '../../../core/methods/entropy'
import { ChartTableModeProvider } from '../../../features/charts'
import { EntropyIdea } from '../../../features/illustrations/EntropyIdea'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Weights stage: the most even criterion's shares next to the most uneven one's, with the chosen normalization. */
export function Stage({ problem, params }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return (
    <ChartTableModeProvider value="screen-reader">
      <EntropyIdea
        problem={problem}
        params={{ normalization: params.normalization as EntropyNormalization }}
        format={format}
        labels={{
          title: t('workbench.visual.entropy.title'),
          even: t('workbench.visual.entropy.even'),
          entropy: t('workbench.visual.entropy.entropy'),
          weight: t('workbench.visual.entropy.weight'),
          share: t('workbench.visual.entropy.share'),
          showTable: t('workbench.chart.showTable'),
          alternative: t('workbench.alternative'),
        }}
        className="max-w-[760px]"
      />
    </ChartTableModeProvider>
  )
}

/** Method page: the same picture on the published example (no step-through story yet). */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(3)
  return (
    <div className="flex flex-col gap-2">
      <EntropyIdea
        problem={problem}
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.entropy.title'),
          caption: t('methods.page.idea.entropy.caption'),
          even: t('methods.page.idea.entropy.even'),
          entropy: t('methods.page.idea.entropy.entropy'),
          weight: t('methods.page.idea.entropy.weight'),
          share: t('methods.page.idea.entropy.share'),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
        }}
      />
      <IdeaSource example={example} />
    </div>
  )
}
