import { useTranslation } from 'react-i18next'
import { WASPAS_DEFAULT_LAMBDA } from '../../../core/methods/waspas'
import { COCOSO_IDEA_STEPS, CocosoLenses, type CocosoLensesLabels } from '../../../features/illustrations/CocosoLenses'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { WaspasLambda, type WaspasLambdaLabels } from '../../../features/illustrations/WaspasLambda'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function useLensLabels(): CocosoLensesLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.cocoso.title'),
    caption: t('workbench.visual.cocoso.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    heads: ['ka', 'kb', 'kc', 'k'],
    row: (alternative, ka, kb, kc, k) => t('workbench.visual.cocoso.row', { alternative, ka, kb, kc, k }),
  }
}

function useLambdaLabels(): WaspasLambdaLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.cocoso.lambdaTitle'),
    caption: t('workbench.visual.waspas.caption'),
    noSwaps: t('workbench.visual.waspas.noSwaps'),
    axis: t('workbench.visual.cocoso.axis'),
    current: t('workbench.visual.waspas.current'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    point: (alternative, lambda, value, rank) => t('workbench.visual.cocoso.point', { alternative, lambda, value, rank }),
    readout: (lambda, order) => t('workbench.visual.waspas.readout', { lambda, order }),
  }
}

const lambdaOf = (params: StagePictureProps['params']) => (typeof params.lambda === 'number' ? params.lambda : WASPAS_DEFAULT_LAMBDA)

/** Ranking stage: the three readings and k in rank order, then k against λ (the slider above moves the cursor). */
export function Stage({ problem, weights, params, className }: StagePictureProps) {
  const lens = useLensLabels()
  const lam = useLambdaLabels()
  const { format } = useNumberFormat(4)
  const lambda = lambdaOf(params)
  return (
    <div className="flex flex-col gap-6">
      <CocosoLenses problem={problem} weights={weights} lambda={lambda} format={format} labels={lens} className={cn('max-w-[760px]', className)} />
      <WaspasLambda method="cocoso" problem={problem} weights={weights} lambda={lambda} format={format} labels={lam} className={cn('max-w-[880px]', className)} />
    </div>
  )
}

/** Method page: the same two pictures on the logistics example, at the default λ = 0.5; the first steps through ka, kb, kc, k. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(4)
  const lens = useLensLabels()
  const lam = useLambdaLabels()
  const weights = example.weights ?? []
  const steps = useIdeaSteps(COCOSO_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3', 's4'] as const).map((k) => t(`methods.page.idea.cocoso.steps.${k}`))
  const page = { showTable: t('methods.page.idea.showTable'), alternative: t('methods.page.idea.alternative') }
  return (
    <div className="flex flex-col gap-6">
      <CocosoLenses
        problem={problem}
        weights={weights}
        lambda={WASPAS_DEFAULT_LAMBDA}
        format={format}
        labels={{ ...lens, ...page, title: t('methods.page.idea.cocoso.title'), caption: t('methods.page.idea.cocoso.caption') }}
        step={steps.step}
        explain={steps.explain}
        className="max-w-[760px]"
      />
      <IdeaSteps control={steps} sentences={sentences} labels={stepLabels} />
      <WaspasLambda
        method="cocoso"
        problem={problem}
        weights={weights}
        lambda={WASPAS_DEFAULT_LAMBDA}
        format={format}
        labels={{ ...lam, ...page, caption: t('methods.page.idea.cocoso.lambdaCaption'), current: `λ = ${format(WASPAS_DEFAULT_LAMBDA, 1)}` }}
        className="max-w-[880px]"
      />
      <IdeaSource example={example} />
    </div>
  )
}
