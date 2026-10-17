import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartTableModeProvider } from '../../../features/charts'
import { CRITIC_IDEA_STEPS, CriticIdea } from '../../../features/illustrations/CriticIdea'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Weights stage: contrast, conflict and the weight per criterion. */
export function Stage({ problem }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return (
    // The table right below shows the same numbers, so the picture keeps its table for
    // screen readers only instead of a third copy behind "Show as table".
    <ChartTableModeProvider value="screen-reader">
      <CriticIdea
        problem={problem}
        format={format}
        labels={{
          title: t('workbench.visual.critic.title'),
          contrast: t('workbench.visual.critic.contrast'),
          conflict: t('workbench.visual.critic.conflict'),
          weight: t('workbench.visual.critic.weight'),
          information: t('workbench.visual.critic.information'),
          showTable: t('workbench.chart.showTable'),
          criterion: t('workbench.criterion'),
        }}
        className="max-w-[760px]"
      />
    </ChartTableModeProvider>
  )
}

/** Method page: the same picture on the published example, with a step-through story. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(3)
  // "Step through": the picture transforms from step to step (MOTION.md, explain).
  const steps = useIdeaSteps(CRITIC_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3', 's4'] as const).map((k) => t(`methods.page.idea.critic.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <CriticIdea
        problem={problem}
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.critic.title'),
          contrast: t('methods.page.idea.critic.contrast'),
          conflict: t('methods.page.idea.critic.conflict'),
          weight: t('methods.page.idea.critic.weight'),
          information: t('methods.page.idea.critic.information'),
          weightHead: (total) => t('methods.page.idea.critic.weightHead', { total }),
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
