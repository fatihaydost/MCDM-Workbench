import { useTranslation } from 'react-i18next'
import { CODAS_DEFAULT_TAU } from '../../../core/methods/codas'
import { CODAS_IDEA_STEPS, CodasIdea, type CodasIdeaLabels } from '../../../features/illustrations/CodasIdea'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function useCodasLabels(): CodasIdeaLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.codas.title'),
    caption: t('workbench.visual.codas.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    euclidean: 'E',
    taxicab: 'T',
    score: 'H',
    row: (alternative, e, tx, score) => t('workbench.visual.codas.row', { alternative, e, t: tx, score }),
  }
}

/** Ranking stage: each alternative's Euclidean (E) and Taxicab (T) distances from ns, and assessment score H on the right. */
export function Stage({ problem, weights, params, className }: StagePictureProps) {
  const labels = useCodasLabels()
  const { format } = useNumberFormat(4)
  const tau = typeof params.tau === 'number' ? params.tau : CODAS_DEFAULT_TAU
  return <CodasIdea problem={problem} weights={weights} tau={tau} format={format} labels={labels} className={cn('max-w-[760px]', className)} />
}

/** Method page: the CODAS picture on the published suppliers example, stepping through E, T, and H. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const labels = useCodasLabels()
  const { format } = useNumberFormat(4)
  const weights = example.weights ?? []
  const steps = useIdeaSteps(CODAS_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.codas.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <CodasIdea
        problem={problem}
        weights={weights}
        format={format}
        labels={{
          ...labels,
          title: t('methods.page.idea.codas.title'),
          caption: t('methods.page.idea.codas.caption'),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
        }}
        step={steps.step}
        explain={steps.explain}
        className="max-w-[760px]"
      />
      <IdeaSteps control={steps} sentences={sentences} labels={stepLabels} />
      <IdeaSource example={example} />
    </div>
  )
}
