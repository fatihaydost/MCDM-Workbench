import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartTableModeProvider } from '../../../features/charts'
import { CILOS_IDEA_STEPS, CilosIdea } from '../../../features/illustrations/CilosIdea'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Weights stage: the relative losses each criterion suffers under other criteria's winners, their sum |f_jj|, and the weight. */
export function Stage({ problem }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return (
    <ChartTableModeProvider value="screen-reader">
      <CilosIdea
        problem={problem}
        format={format}
        labels={{
          title: t('workbench.visual.cilos.title'),
          loss: t('workbench.visual.cilos.loss'),
          totalLoss: t('workbench.visual.cilos.totalLoss'),
          weight: t('workbench.visual.cilos.weight'),
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
  const steps = useIdeaSteps(CILOS_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3', 's4'] as const).map((k) => t(`methods.page.idea.cilos.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <CilosIdea
        problem={problem}
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.cilos.title'),
          caption: t('methods.page.idea.cilos.caption'),
          loss: t('methods.page.idea.cilos.loss'),
          totalLoss: t('methods.page.idea.cilos.totalLoss'),
          weight: t('methods.page.idea.cilos.weight'),
          weightHead: t('methods.page.idea.cilos.weightHead'),
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
