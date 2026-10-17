import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { TOPSIS_IDEA_STEPS, TopsisGeometry } from '../../../features/illustrations/TopsisGeometry'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Ranking stage: alternatives, A+ and A- on the two heaviest criteria. */
export function Stage({ problem, weights, className }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  return (
    <TopsisGeometry
      problem={problem}
      weights={weights}
      format={format}
      labels={{
        title: t('workbench.visual.topsis.title'),
        caption: t('workbench.visual.topsis.caption'),
        projectionNote: t('workbench.visual.topsis.projectionNote'),
        ideal: 'A+',
        antiIdeal: 'A−',
        dPlus: 'D+',
        dMinus: 'D−',
        formula: 'C = D− / (D+ + D−)',
        select: t('workbench.visual.topsis.select'),
        point: (name, value) => t('workbench.visual.topsis.point', { name, value }),
        // The picture's own words are shared with the TOPSIS method page.
        viewLabel: t('methods.page.idea.topsis.view'),
        viewDistances: t('methods.page.idea.topsis.viewDistances'),
        viewCriteria: t('methods.page.idea.topsis.viewCriteria'),
        axisDPlus: t('methods.page.idea.topsis.axisDPlus'),
        axisDMinus: t('methods.page.idea.topsis.axisDMinus'),
        isoC: (c) => t('methods.page.idea.topsis.iso', { c }),
        planeCaption: t('methods.page.idea.topsis.planeCaption'),
        higherBetter: (name) => t('methods.page.idea.topsis.higherBetter', { name }),
        lowerBetter: (name) => t('methods.page.idea.topsis.lowerBetter', { name }),
        showTable: t('workbench.chart.showTable'),
        alternative: t('workbench.alternative'),
        closeness: 'C',
      }}
      className={cn('max-w-[640px]', className)}
    />
  )
}

/** Method page: the same picture on the published example, with a step-through story. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(3)
  // "Step through": the picture transforms from step to step (MOTION.md, explain).
  const steps = useIdeaSteps(TOPSIS_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3', 's4', 's5'] as const).map((k) => t(`methods.page.idea.topsis.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <TopsisGeometry
        problem={problem}
        weights={example.weights ?? [0.5, 0.5]}
        format={(v) => format(v, 3)}
        labels={{
          title: t('methods.page.idea.topsis.title'),
          caption: t('methods.page.idea.topsis.caption'),
          projectionNote: t('methods.page.idea.topsis.projectionNote'),
          select: t('methods.page.idea.topsis.select'),
          point: (name, c) => t('methods.page.idea.topsis.point', { name, c }),
          viewLabel: t('methods.page.idea.topsis.view'),
          viewDistances: t('methods.page.idea.topsis.viewDistances'),
          viewCriteria: t('methods.page.idea.topsis.viewCriteria'),
          axisDPlus: t('methods.page.idea.topsis.axisDPlus'),
          axisDMinus: t('methods.page.idea.topsis.axisDMinus'),
          isoC: (c) => t('methods.page.idea.topsis.iso', { c }),
          planeCaption: t('methods.page.idea.topsis.planeCaption'),
          higherBetter: (name) => t('methods.page.idea.topsis.higherBetter', { name }),
          lowerBetter: (name) => t('methods.page.idea.topsis.lowerBetter', { name }),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
        }}
        step={steps.step}
        explain={steps.explain}
      />
      <IdeaSteps control={steps} sentences={sentences} labels={stepLabels} />
      <IdeaSource example={example} />
    </div>
  )
}
