import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AHP_CR_THRESHOLD, ahpProgress, type AhpParams } from '../../../core'
import { AHP_IDEA_STEPS, AhpMatrix, type AhpMatrixLabels } from '../../../features/illustrations/AhpMatrix'
import { ahpRankingParts } from '../../../features/illustrations/geometry'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { SawContributions } from '../../../features/illustrations/SawContributions'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { DECIMALS, scoreWords } from '../../workbench/shared'
import { IdeaSource, useStepLabels } from './parts'
import type { JudgementIdeaProps, StagePictureProps } from './types'

const useLabels = (prefix: 'workbench.visual.ahp' | 'methods.page.idea.ahp'): Omit<AhpMatrixLabels, 'showTable' | 'criterion'> => {
  const { t } = useTranslation()
  return {
    title: t(`${prefix}.title`),
    matrix: t(`${prefix}.matrix`),
    fitted: t(`${prefix}.fitted`),
    weight: t(`${prefix}.weight`),
    flagged: t(`${prefix}.flagged`),
  }
}

/** Weights stage, above the card: pairwise matrix on the answers so far; weight bars once every answer is in. */
export function Stage({ problem, judgements, weights, params }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const formatShort = useCallback((v: number) => nf.format(v, 2), [nf])
  const labels = useLabels('workbench.visual.ahp')
  if (!judgements) return null
  const progress = ahpProgress(problem, judgements, params as AhpParams | undefined)
  if (progress.answered === 0) return null
  return (
    <AhpMatrix
      criteria={problem.criteria.map((c) => c.name)}
      pairs={judgements.pairs}
      weights={progress.provisional ? null : weights}
      worstPair={progress.inconsistent ? progress.worstPair : null}
      warn={progress.inconsistent}
      format={format}
      formatShort={formatShort}
      labels={{ ...labels, showTable: t('workbench.chart.showTable'), criterion: t('workbench.criterion') }}
      className="max-w-[760px]"
    />
  )
}

/** Method page: Saaty (2008) Table 3 job selection with a 4-step story. */
export function Idea({ example, criteria }: JudgementIdeaProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(4)
  const steps = useIdeaSteps(AHP_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const labels = useLabels('methods.page.idea.ahp')
  const sentences = (['s1', 's2', 's3', 's4'] as const).map((k) => t(`methods.page.idea.ahp.steps.${k}`))
  const progress = ahpProgress(example.judgements, criteria.length)
  const cr = progress.cr ?? 0
  return (
    <div className="flex flex-col gap-2">
      <AhpMatrix
        criteria={criteria}
        pairs={example.judgements.pairs}
        weights={progress.weights}
        worstPair={progress.worstPair}
        warn={progress.inconsistent}
        format={(v) => format(v, 4)}
        formatShort={(v) => format(v, 2)}
        labels={{
          ...labels,
          caption: t('methods.page.idea.ahp.caption', { cr: format(cr, 3), threshold: format(AHP_CR_THRESHOLD, 2) }),
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

/** Ranking stage: each alternative's global priority P_i as a stack of its weighted local priorities w_j p_ij. */
export function RankingStage({ problem, weights, params, alternativeJudgements, className }: StagePictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const parts = useMemo(
    () => ahpRankingParts(problem, weights, (params as AhpParams | undefined) ?? {}, alternativeJudgements),
    [problem, weights, params, alternativeJudgements],
  )
  return (
    <SawContributions
      problem={problem}
      weights={weights}
      parts={parts}
      format={format}
      labels={{
        title: t('workbench.visual.saw.title'),
        showTable: t('workbench.chart.showTable'),
        alternative: t('workbench.alternative'),
        score: scoreWords('ahp-ranking', t).name,
        legend: t('workbench.visual.saw.legend'),
        others: t('workbench.visual.saw.others'),
        segment: (alternative, criterion, value, score) =>
          t('workbench.visual.ahpRanking.segment', { alternative, criterion, value, score }),
        readout: (alternative, criterion, value, score) =>
          t('workbench.visual.ahpRanking.readout', { alternative, criterion, value, score }),
      }}
      className={cn('max-w-[760px]', className)}
    />
  )
}
