import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartTableModeProvider } from '../../../features/charts'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { LOPCOW_IDEA_STEPS, LopcowIdea } from '../../../features/illustrations/LopcowIdea'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Weights stage: each criterion's RMS, spread, percentage value, and the weight it becomes. */
export function Stage({ problem }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return (
    <ChartTableModeProvider value="screen-reader">
      <LopcowIdea
        problem={problem}
        format={format}
        labels={{
          title: t('workbench.visual.lopcow.title'),
          rms: t('workbench.visual.lopcow.rms'),
          stdDev: t('workbench.visual.lopcow.stdDev'),
          pv: t('workbench.visual.lopcow.pv'),
          weight: t('workbench.visual.lopcow.weight'),
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
  const steps = useIdeaSteps(LOPCOW_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3', 's4'] as const).map((k) => t(`methods.page.idea.lopcow.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <LopcowIdea
        problem={problem}
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.lopcow.title'),
          caption: t('methods.page.idea.lopcow.caption'),
          rms: t('methods.page.idea.lopcow.rms'),
          stdDev: t('methods.page.idea.lopcow.stdDev'),
          pv: t('methods.page.idea.lopcow.pv'),
          weight: t('methods.page.idea.lopcow.weight'),
          weightHead: (total) => t('methods.page.idea.lopcow.weightHead', { total }),
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
