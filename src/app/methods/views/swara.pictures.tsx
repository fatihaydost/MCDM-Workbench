import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { SwaraStepRatio } from '../../../core'
import { ChartTableModeProvider } from '../../../features/charts'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { SWARA_IDEA_STEPS, SwaraIdea } from '../../../features/illustrations/SwaraIdea'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Keršulienė, Zavadskas & Turskis (2010), Table 1 comparative importance ratios s_j. */
const KERSULIENE_2010_S = [0, 0.15, 0.04, 0.29, 0.02, 0.04] as const

/** Weights stage: each criterion's step-down ratio s_j, recalculated chain q_j and normalized weight w_j. */
export function Stage({ problem, params }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const stepRatio: SwaraStepRatio =
    params.stepRatio === 'gentle' || params.stepRatio === 'steep' ? params.stepRatio : 'moderate'
  return (
    <ChartTableModeProvider value="screen-reader">
      <SwaraIdea
        problem={problem}
        stepRatio={stepRatio}
        format={format}
        labels={{
          title: t('workbench.visual.swara.title'),
          s: t('workbench.visual.swara.s'),
          k: t('workbench.visual.swara.k'),
          q: t('workbench.visual.swara.q'),
          weight: t('workbench.visual.swara.weight'),
          showTable: t('workbench.chart.showTable'),
          criterion: t('workbench.criterion'),
        }}
        className="max-w-[760px]"
      />
    </ChartTableModeProvider>
  )
}

/** Method page: the same picture on the published Keršulienė et al. (2010) Table 1 example with a step-through story. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(4)
  const steps = useIdeaSteps(SWARA_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.swara.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <SwaraIdea
        problem={problem}
        s={KERSULIENE_2010_S}
        format={(v) => format(v, 4)}
        labels={{
          title: t('methods.page.idea.swara.title'),
          caption: t('methods.page.idea.swara.caption'),
          s: t('methods.page.idea.swara.s'),
          k: t('methods.page.idea.swara.k'),
          q: t('methods.page.idea.swara.q'),
          weight: t('methods.page.idea.swara.weight'),
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
