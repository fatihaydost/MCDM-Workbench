import { useTranslation } from 'react-i18next'
import {
  ELECTRE_I_DEFAULT_C_HAT,
  ELECTRE_I_DEFAULT_D_HAT,
  type ElectreIDiscordanceScale,
} from '../../../core/methods/electre-i'
import {
  ELECTRE_I_IDEA_STEPS,
  ElectreIIdea,
  type ElectreIIdeaLabels,
} from '../../../features/illustrations/ElectreIIdea'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function useElectreILabels(): ElectreIIdeaLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.electre-i.title'),
    caption: t('workbench.visual.electre-i.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    netConcordance: 'Cₐ',
    netDiscordance: 'Dₐ',
    kernel: 'K',
    score: 'Φ',
    inKernel: '1',
    outKernel: '0',
    row: (alternative, netC, netD, kernel, score) =>
      t('workbench.visual.electre-i.row', { alternative, netC, netD, kernel, score }),
  }
}

/** Ranking stage: each alternative's net concordance C_a, net discordance D_a, kernel K badge, and net score Φ. */
export function Stage({ problem, weights, params, className }: StagePictureProps) {
  const labels = useElectreILabels()
  const { format } = useNumberFormat(4)
  const cHat = typeof params.cHat === 'number' ? params.cHat : ELECTRE_I_DEFAULT_C_HAT
  const dHat = typeof params.dHat === 'number' ? params.dHat : ELECTRE_I_DEFAULT_D_HAT
  const discordanceScale =
    typeof params.discordanceScale === 'string'
      ? (params.discordanceScale as ElectreIDiscordanceScale)
      : 'global'
  return (
    <ElectreIIdea
      problem={problem}
      weights={weights}
      cHat={cHat}
      dHat={dHat}
      discordanceScale={discordanceScale}
      format={format}
      labels={labels}
      className={cn('max-w-[760px]', className)}
    />
  )
}

/** Method page: the ELECTRE I picture on the published Galway wastewater example, stepping through C_a/D_a, K, and Φ. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const labels = useElectreILabels()
  const { format } = useNumberFormat(4)
  const weights = example.weights ?? []
  const steps = useIdeaSteps(ELECTRE_I_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.electre-i.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <ElectreIIdea
        problem={problem}
        weights={weights}
        format={format}
        labels={{
          ...labels,
          title: t('methods.page.idea.electre-i.title'),
          caption: t('methods.page.idea.electre-i.caption'),
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
