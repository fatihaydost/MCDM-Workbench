import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { entropy } from '../../../core/methods/entropy'
import { CoprasBonus, type CoprasBonusLabels } from '../../../features/illustrations/CoprasBonus'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { DECIMALS, scoreWords } from '../../workbench/shared'
import { IdeaSource } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function useCoprasLabels(): CoprasBonusLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.copras.title'),
    caption: t('workbench.visual.copras.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    score: scoreWords('copras', t).name,
    utility: t('workbench.ranking.columns.utility'),
    legend: t('workbench.visual.copras.legend'),
    benefit: t('workbench.visual.copras.benefit'),
    bonus: t('workbench.visual.copras.bonus'),
    segment: (alternative, part, value, score, utility) => t('workbench.visual.copras.segment', { alternative, part, value, score, utility }),
    readout: (alternative, part, value, score) => t('workbench.visual.copras.readout', { alternative, part, value, score }),
  }
}

function useFormats() {
  const { t } = useTranslation()
  const { format } = useNumberFormat(DECIMALS.score)
  return {
    format: useCallback((v: number) => format(v), [format]),
    formatPercent: useCallback((v: number) => t('workbench.visual.copras.percent', { value: format(v, 2) }), [format, t]),
  }
}

/** Ranking stage: each alternative's S+ and cost bonus up to Q, in rank order, N beside it. */
export function Stage({ problem, weights, className }: StagePictureProps) {
  const labels = useCoprasLabels()
  const { format, formatPercent } = useFormats()
  return <CoprasBonus problem={problem} weights={weights} format={format} formatPercent={formatPercent} labels={labels} className={cn('max-w-[760px]', className)} />
}

/** Method page: the same picture on the cream separators, with the Entropy weights the paper computes from the data. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const labels = useCoprasLabels()
  const { format, formatPercent } = useFormats()
  const weights = useMemo(() => example.weights ?? entropy.compute(problem, {}).weights, [example, problem])
  return (
    <div className="flex flex-col gap-2">
      <CoprasBonus
        problem={problem}
        weights={weights}
        format={format}
        formatPercent={formatPercent}
        labels={{
          ...labels,
          title: t('methods.page.idea.copras.title'),
          caption: t('methods.page.idea.copras.caption'),
          showTable: t('methods.page.idea.showTable'),
          alternative: t('methods.page.idea.alternative'),
        }}
        className="max-w-[760px]"
      />
      <IdeaSource example={example} />
    </div>
  )
}
