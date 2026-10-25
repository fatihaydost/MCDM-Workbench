import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartTableModeProvider } from '../../../features/charts'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { SD_IDEA_STEPS, SdIdea } from '../../../features/illustrations/SdIdea'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Weights stage: each criterion's spread and the weight it becomes. */
export function Stage({ problem }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return (
    <ChartTableModeProvider value="screen-reader">
      <SdIdea
        problem={problem}
        format={format}
        labels={{
          title: t('workbench.visual.sd.title'),
          spread: t('workbench.visual.sd.spread'),
          weight: t('workbench.visual.sd.weight'),
          weightHead: t('workbench.weights.columns.weight'),
          showTable: t('workbench.chart.showTable'),
          criterion: t('workbench.criterion'),
        }}
        className="max-w-[760px]"
      />
    </ChartTableModeProvider>
  )
}

/** Method page: the same picture on the published example with a step-through story. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(3)
  const steps = useIdeaSteps(SD_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.sd.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <SdIdea
        problem={problem}
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.sd.title'),
          caption: t('methods.page.idea.sd.caption'),
          spread: t('methods.page.idea.sd.spread'),
          weight: t('methods.page.idea.sd.weight'),
          weightHead: (total) => t('methods.page.idea.sd.weightHead', { total }),
          showTable: t('methods.page.idea.showTable'),
          criterion: t('methods.page.idea.criterion'),
        }}
        step={steps.step}
        explain={steps.explain}
      />
      <IdeaSteps control={steps} sentences={sentences} labels={stepLabels} />
      <IdeaSource example={example} />
    </div>
  )
}
