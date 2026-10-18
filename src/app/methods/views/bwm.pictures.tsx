import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { bwmAnswers, bwmConsistency, bwmProgress, bwmSolve } from '../../../core'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { BWM_IDEA_STEPS, BwmRulers, type BwmRulersLabels } from '../../../features/illustrations/BwmRulers'
import { useNumberFormat } from '../../../i18n'
import { DECIMALS } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { JudgementIdeaProps, StagePictureProps } from './types'

const useLabels = (prefix: 'workbench.visual.bwm' | 'methods.page.idea.bwm'): Omit<BwmRulersLabels, 'showTable' | 'criterion'> => {
  const { t } = useTranslation()
  return {
    title: t(`${prefix}.title`),
    axis: t(`${prefix}.axis`),
    fromBest: t(`${prefix}.fromBest`),
    toWorst: t(`${prefix}.toWorst`),
    weight: t(`${prefix}.weight`),
    best: t(`${prefix}.best`),
    worst: t(`${prefix}.worst`),
    flagged: t(`${prefix}.flagged`),
  }
}

/** Weights stage, above the card: the two rulers on the answers so far; dots and weights once every answer is in. */
export function Stage({ problem, judgements, weights }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const labels = useLabels('workbench.visual.bwm')
  const a = judgements ? bwmAnswers(judgements) : null
  if (!judgements || !a) return null
  const progress = bwmProgress(judgements, problem.criteria.length)
  return (
    <BwmRulers
      criteria={problem.criteria.map((c) => c.name)}
      best={a.best}
      worst={a.worst}
      bestToOthers={a.bestToOthers}
      othersToWorst={a.othersToWorst}
      weights={progress.provisional ? null : weights}
      flagged={progress.flagged}
      warn={progress.flagged !== null}
      format={format}
      labels={{ ...labels, showTable: t('workbench.chart.showTable'), criterion: t('workbench.criterion') }}
      pinAxis
      className="max-w-[760px]"
    />
  )
}

/** Method page: Rezaei 2016 Ex3 with a step-through story; the mark is the CR^I argmax (the card's picture). */
export function Idea({ example, criteria }: JudgementIdeaProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(4)
  const steps = useIdeaSteps(BWM_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const labels = useLabels('methods.page.idea.bwm')
  const sentences = (['s1', 's2', 's3', 's4'] as const).map((k) => t(`methods.page.idea.bwm.steps.${k}`))
  const a = bwmAnswers(example.judgements)!
  const bo = a.bestToOthers as number[]
  const ow = a.othersToWorst as number[]
  const { weights } = bwmSolve(bo, ow, a.best, a.worst)
  const { crInput, mostInconsistent } = bwmConsistency(bo, ow, a.best, a.worst)
  const threshold = bwmProgress(example.judgements, criteria.length).threshold!.value
  return (
    <div className="flex flex-col gap-2">
      <BwmRulers
        criteria={criteria}
        best={a.best}
        worst={a.worst}
        bestToOthers={bo}
        othersToWorst={ow}
        weights={weights}
        // The card marks the CR^I argmax even within the threshold; no warning icon then (the workbench would not warn).
        flagged={crInput > 0 ? mostInconsistent : null}
        warn={crInput > threshold}
        format={(v) => format(v, 4)}
        labels={{
          ...labels,
          caption: t('methods.page.idea.bwm.caption', { cr: format(crInput, 2), threshold: format(threshold, 2) }),
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
