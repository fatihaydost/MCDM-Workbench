import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { RocFormula } from '../../../core'
import { ChartTableModeProvider } from '../../../features/charts'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { ROC_IDEA_STEPS, RocIdea } from '../../../features/illustrations/RocIdea'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Weights stage: each criterion's rank, its ROC / RS / RR curve position and the active weight bar. */
export function Stage({ problem, params }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const formula: RocFormula = params.formula === 'rs' || params.formula === 'rr' ? params.formula : 'roc'
  return (
    <ChartTableModeProvider value="screen-reader">
      <RocIdea
        problem={problem}
        formula={formula}
        format={format}
        labels={{
          title: t('workbench.visual.roc.title'),
          rank: t('workbench.visual.roc.rank'),
          roc: t('workbench.visual.roc.roc'),
          rs: t('workbench.visual.roc.rs'),
          rr: t('workbench.visual.roc.rr'),
          weight: t('workbench.visual.roc.weight'),
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
  const { format } = useNumberFormat(4)
  const steps = useIdeaSteps(ROC_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.roc.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <RocIdea
        problem={problem}
        formula="roc"
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.roc.title'),
          caption: t('methods.page.idea.roc.caption'),
          rank: t('methods.page.idea.roc.rank'),
          roc: t('methods.page.idea.roc.roc'),
          rs: t('methods.page.idea.roc.rs'),
          rr: t('methods.page.idea.roc.rr'),
          weight: t('methods.page.idea.roc.weight'),
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
