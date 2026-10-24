import { useTranslation } from 'react-i18next'
import type { PrometheeCriterionFunction, PrometheePreferenceFunction } from '../../../core/methods/promethee-ii'
import { PROMETHEE_IDEA_STEPS, PrometheeIdea, type PrometheeIdeaLabels } from '../../../features/illustrations/PrometheeIdea'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function usePrometheeLabels(): PrometheeIdeaLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.promethee-ii.title'),
    caption: t('workbench.visual.promethee-ii.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    positiveFlow: 'φ⁺',
    negativeFlow: 'φ⁻',
    score: 'φ',
    row: (alternative, pos, neg, score) => t('workbench.visual.promethee-ii.row', { alternative, pos, neg, score }),
  }
}

/** Ranking stage: each alternative's leaving (φ⁺) and entering (φ⁻) flows, and net outranking flow φ on the right. */
export function Stage({ problem, weights, params, className }: StagePictureProps) {
  const labels = usePrometheeLabels()
  const { format } = useNumberFormat(4)
  const preferenceFunction =
    typeof params.preferenceFunction === 'string'
      ? (params.preferenceFunction as PrometheePreferenceFunction)
      : 'v-shape'
  const criteriaFunctions = Array.isArray(params.criteriaFunctions)
    ? (params.criteriaFunctions as readonly PrometheeCriterionFunction[])
    : undefined
  return (
    <PrometheeIdea
      problem={problem}
      weights={weights}
      preferenceFunction={preferenceFunction}
      criteriaFunctions={criteriaFunctions}
      format={format}
      labels={labels}
      className={cn('max-w-[760px]', className)}
    />
  )
}

/** Method page: the PROMETHEE II picture on the published laptops example, stepping through φ⁺, φ⁻, and φ. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const labels = usePrometheeLabels()
  const { format } = useNumberFormat(4)
  const weights = example.weights ?? []
  const steps = useIdeaSteps(PROMETHEE_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.promethee-ii.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <PrometheeIdea
        problem={problem}
        weights={weights}
        format={format}
        labels={{
          ...labels,
          title: t('methods.page.idea.promethee-ii.title'),
          caption: t('methods.page.idea.promethee-ii.caption'),
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
