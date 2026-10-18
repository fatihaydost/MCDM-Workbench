import { useTranslation } from 'react-i18next'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { MARCOS_ROWS_STEPS, MarcosRows, MarcosSawLine, type MarcosRowsLabels } from '../../../features/illustrations/MarcosIdea'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function useMarcosLabels(): MarcosRowsLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.marcos.title'),
    caption: t('workbench.visual.marcos.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    ideal: t('workbench.visual.marcos.ideal'),
    antiIdeal: t('workbench.visual.marcos.antiIdeal'),
    total: t('workbench.stepNames.marcos.s'),
    kMinus: 'K⁻',
    kPlus: 'K⁺',
    score: t('workbench.ranking.score.marcos.name'),
    bar: (alternative, total, kMinus, kPlus, score) => t('workbench.visual.marcos.bar', { alternative, total, kMinus, kPlus, score }),
    readout: (alternative, kMinus, kPlus, score) => t('workbench.visual.marcos.readout', { alternative, kMinus, kPlus, score }),
  }
}

/** Ranking stage: the two imaginary rows and every alternative's weighted total between them, f(K) beside it. */
export function Stage({ problem, weights, className }: StagePictureProps) {
  const labels = useMarcosLabels()
  const { format } = useNumberFormat(4)
  return <MarcosRows problem={problem} weights={weights} format={format} labels={labels} className={cn('max-w-[760px]', className)} />
}

/** Method page: the same rows on the drivers example (with a step-through story: S, the two rows, f(K)), then why its order is SAW (Linear)'s: one line through the origin. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const labels = useMarcosLabels()
  const { format } = useNumberFormat(4)
  const weights = example.weights ?? []
  const steps = useIdeaSteps(MARCOS_ROWS_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.marcos.steps.${k}`))
  return (
    <div className="flex flex-col gap-6">
      <MarcosRows
        problem={problem}
        weights={weights}
        format={format}
        labels={{
          ...labels,
          title: t('methods.page.idea.marcos.title'),
          caption: t('methods.page.idea.marcos.caption'),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
        }}
        step={steps.step}
        explain={steps.explain}
        className="max-w-[760px]"
      />
      <IdeaSteps control={steps} sentences={sentences} labels={stepLabels} className="-mt-4" />
      <MarcosSawLine
        problem={problem}
        weights={weights}
        format={format}
        labels={{
          title: t('methods.page.idea.marcos.sawTitle'),
          caption: t('methods.page.idea.marcos.sawCaption'),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
          x: t('methods.page.idea.marcos.sawX'),
          y: t('methods.page.idea.marcos.sawY'),
          line: (c) => t('methods.page.idea.marcos.sawLine', { c }),
        }}
        className="max-w-[420px]"
      />
      <IdeaSource example={example} />
    </div>
  )
}
