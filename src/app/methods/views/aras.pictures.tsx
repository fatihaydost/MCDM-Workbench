import { useTranslation } from 'react-i18next'
import { ArasOptimalBar, ARAS_IDEA_STEPS, type ArasOptimalBarLabels } from '../../../features/illustrations/ArasIdea'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function useArasLabels(): ArasOptimalBarLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.aras.title'),
    caption: t('workbench.visual.aras.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    optimal: t('workbench.visual.aras.optimal'),
    total: t('workbench.stepNames.aras.optimality'),
    score: t('workbench.ranking.score.aras.name'),
    bar: (alternative, total, optimalTotal, score) =>
      t('workbench.visual.aras.bar', { alternative, total, optimalTotal, score }),
    readout: (alternative, total, optimalTotal, score) =>
      t('workbench.visual.aras.readout', { alternative, total, optimalTotal, score }),
  }
}

/** Ranking stage: the optimal row A₀ on top and every alternative's optimality S_i below it, K_i = S_i / S₀ beside it. */
export function Stage({ problem, weights, className }: StagePictureProps) {
  const labels = useArasLabels()
  const { format } = useNumberFormat(4)
  return <ArasOptimalBar problem={problem} weights={weights} format={format} labels={labels} className={cn('max-w-[760px]', className)} />
}

/** Method page: the same rows on the airlines example with a 3-step story (S, the optimal row A₀ at S₀, K = S / S₀). */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const labels = useArasLabels()
  const { format } = useNumberFormat(4)
  const weights = example.weights ?? []
  const steps = useIdeaSteps(ARAS_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.aras.steps.${k}`))
  return (
    <div className="flex flex-col gap-6">
      <ArasOptimalBar
        problem={problem}
        weights={weights}
        format={format}
        labels={{
          ...labels,
          title: t('methods.page.idea.aras.title'),
          caption: t('methods.page.idea.aras.caption'),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
        }}
        step={steps.step}
        explain={steps.explain}
        className="max-w-[760px]"
      />
      <IdeaSteps control={steps} sentences={sentences} labels={stepLabels} className="-mt-4" />
      <IdeaSource example={example} />
    </div>
  )
}
