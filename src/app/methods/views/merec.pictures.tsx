import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartTableModeProvider } from '../../../features/charts'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { MEREC_IDEA_STEPS, MerecIdea } from '../../../features/illustrations/MerecIdea'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Weights stage: the drops each criterion's removal causes, their sum E and the weight. */
export function Stage({ problem }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return (
    <ChartTableModeProvider value="screen-reader">
      <MerecIdea
        problem={problem}
        format={format}
        labels={{
          title: t('workbench.visual.merec.title'),
          drop: t('workbench.visual.merec.drop'),
          effect: t('workbench.visual.merec.effect'),
          weight: t('workbench.visual.merec.weight'),
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
  const steps = useIdeaSteps(MEREC_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3', 's4'] as const).map((k) => t(`methods.page.idea.merec.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <MerecIdea
        problem={problem}
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.merec.title'),
          caption: t('methods.page.idea.merec.caption'),
          drop: t('methods.page.idea.merec.drop'),
          effect: t('methods.page.idea.merec.effect'),
          weight: t('methods.page.idea.merec.weight'),
          weightHead: (total) => t('methods.page.idea.merec.weightHead', { total }),
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
