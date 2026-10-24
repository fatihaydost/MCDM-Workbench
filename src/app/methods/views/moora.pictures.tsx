import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { MOORA_IDEA_STEPS, MooraIdea } from '../../../features/illustrations/MooraIdea'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { useMooraLabels } from '../../workbench/mooraLabels'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Ranking stage: each alternative's weighted benefit ratios (right) and cost ratios (left), net score y beside it. */
export function Stage({ problem, weights, className }: StagePictureProps) {
  const labels = useMooraLabels('workbench.visual.moora.title', 'workbench.visual.moora.caption')
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return <MooraIdea problem={problem} weights={weights} format={format} labels={labels} className={cn('max-w-[880px]', className)} />
}

/** Method page: the same picture on the published Brauers & Zavadskas (2010) projects example, with a step-through story. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(4)
  const labels = useMooraLabels('methods.page.idea.moora.title', 'methods.page.idea.moora.caption')
  const steps = useIdeaSteps(MOORA_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.moora.steps.${k}`))
  const n = problem.criteria.length
  const weights = example.weights ?? new Array<number>(n).fill(1 / n)
  return (
    <div className="flex flex-col gap-2">
      <MooraIdea
        problem={problem}
        weights={weights}
        format={(v) => format(v, 4)}
        labels={{ ...labels, showTable: t('methods.page.idea.showTable'), alternative: t('methods.page.idea.alternative') }}
        step={steps.step}
        explain={steps.explain}
        className="max-w-[880px]"
      />
      <IdeaSteps control={steps} sentences={sentences} labels={stepLabels} />
      <IdeaSource example={example} />
    </div>
  )
}
