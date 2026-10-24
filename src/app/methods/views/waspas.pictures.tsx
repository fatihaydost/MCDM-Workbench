import { useTranslation } from 'react-i18next'
import { WASPAS_DEFAULT_LAMBDA } from '../../../core/methods/waspas'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { WASPAS_IDEA_STEPS, WaspasLambda, type WaspasLambdaLabels } from '../../../features/illustrations/WaspasLambda'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function useWaspasLabels(): WaspasLambdaLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.waspas.title'),
    caption: t('workbench.visual.waspas.caption'),
    noSwaps: t('workbench.visual.waspas.noSwaps'),
    axis: t('workbench.visual.waspas.axis'),
    current: t('workbench.visual.waspas.current'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    point: (alternative, lambda, value, rank) => t('workbench.visual.waspas.point', { alternative, lambda, value, rank }),
    readout: (lambda, order) => t('workbench.visual.waspas.readout', { lambda, order }),
  }
}

/** Ranking stage: Q of every alternative against λ, the current λ marked (the slider above moves it). */
export function Stage({ problem, weights, params, className }: StagePictureProps) {
  const labels = useWaspasLabels()
  const { format } = useNumberFormat(4)
  const lambda = typeof params.lambda === 'number' ? params.lambda : WASPAS_DEFAULT_LAMBDA
  return <WaspasLambda problem={problem} weights={weights} lambda={lambda} format={format} labels={labels} className={cn('max-w-[880px]', className)} />
}

/** Method page: the same chart on the supplier example, the default λ = 0.5 marked, with a step-through story. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(4)
  const labels = useWaspasLabels()
  const steps = useIdeaSteps(WASPAS_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.waspas.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <WaspasLambda
        problem={problem}
        weights={example.weights ?? []}
        lambda={WASPAS_DEFAULT_LAMBDA}
        format={format}
        labels={{
          ...labels,
          title: t('methods.page.idea.waspas.title'),
          caption: t('methods.page.idea.waspas.caption'),
          current: `λ = ${format(WASPAS_DEFAULT_LAMBDA, 1)}`,
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
        }}
        step={steps.step}
        explain={steps.explain}
        className="max-w-[880px]"
      />
      <IdeaSteps control={steps} sentences={sentences} labels={stepLabels} />
      <IdeaSource example={example} />
    </div>
  )
}
