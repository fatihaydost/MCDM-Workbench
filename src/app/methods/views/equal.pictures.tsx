import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartTableModeProvider } from '../../../features/charts'
import { EQUAL_IDEA_STEPS, EqualIdea } from '../../../features/illustrations/EqualIdea'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Weights stage: every criterion on a 0..1 track reaching the dashed 1/n line. */
export function Stage({ problem }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return (
    <ChartTableModeProvider value="screen-reader">
      <EqualIdea
        problem={problem}
        format={format}
        labels={{
          title: t('workbench.visual.equal.title'),
          share: t('workbench.visual.equal.share'),
          weight: t('workbench.visual.equal.weight'),
          showTable: t('workbench.chart.showTable'),
          criterion: t('workbench.criterion'),
        }}
        className="max-w-[720px]"
      />
    </ChartTableModeProvider>
  )
}

/** Method page: the same picture on the smartphones example with a step-through story. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(4)
  const steps = useIdeaSteps(EQUAL_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.equal.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <EqualIdea
        problem={problem}
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.equal.title'),
          caption: t('methods.page.idea.equal.caption'),
          share: t('methods.page.idea.equal.share'),
          weight: t('methods.page.idea.equal.weight'),
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
