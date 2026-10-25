import { useTranslation } from 'react-i18next'
import type { ElectreIIIParams, ThresholdSpec } from '../../../core/methods/electre-iii'
import { ELECTRE_III_IDEA_STEPS, ElectreIIIIdea, type ElectreIIIIdeaLabels } from '../../../features/illustrations/ElectreIIIIdea'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

const WANG_2008_PARAMS: ElectreIIIParams = {
  q: [
    { abs: 1000 },
    { rel: 0.1 },
    { rel: 0.1 },
    { abs: 5 },
    { rel: 0.1 },
    { rel: 0.1 },
    { rel: 0.1 },
    { abs: 2 },
    { abs: 0.2 },
    { abs: 0 },
    { abs: 0 },
  ],
  p: [
    { abs: 2000 },
    { rel: 0.2 },
    { rel: 0.2 },
    { abs: 10 },
    { rel: 0.2 },
    { rel: 0.2 },
    { rel: 0.2 },
    { abs: 4 },
    { abs: 0.4 },
    { abs: 1 },
    { abs: 1 },
  ],
}

function useElectreIIILabels(): ElectreIIIIdeaLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.electre-iii.title'),
    caption: t('workbench.visual.electre-iii.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    descendingRank: 'r↓',
    ascendingRank: 'r↑',
    score: 'Φ',
    row: (alternative, desc, asc, score) => t('workbench.visual.electre-iii.row', { alternative, desc, asc, score }),
  }
}

/** Ranking stage: each alternative's descending (r↓) and ascending (r↑) distillation ranks, and net credibility Φ. */
export function Stage({ problem, weights, params, className }: StagePictureProps) {
  const labels = useElectreIIILabels()
  const { format } = useNumberFormat(4)
  const thresholdPreset =
    params.thresholdPreset === 'strict' || params.thresholdPreset === 'veto' ? params.thresholdPreset : 'standard'
  const mode = Array.isArray(params.mode) ? (params.mode as readonly ('direct' | 'inverse' | 'abs' | 'rel')[]) : undefined
  const mapThresholds = (arr: readonly unknown[]): readonly ThresholdSpec[] =>
    arr.map((x, j) => (typeof x === 'number' && mode?.[j] === 'rel' ? { rel: x } : (x as ThresholdSpec)))
  const q = Array.isArray(params.q) ? mapThresholds(params.q) : undefined
  const p = Array.isArray(params.p) ? mapThresholds(params.p) : undefined
  const v = Array.isArray(params.v)
    ? params.v.map((x, j) =>
        x === null ? null : typeof x === 'number' && mode?.[j] === 'rel' ? { rel: x } : (x as ThresholdSpec),
      )
    : undefined
  return (
    <ElectreIIIIdea
      problem={problem}
      weights={weights}
      params={
        {
          ...(params as ElectreIIIParams),
          thresholdPreset,
          ...(q !== undefined ? { q } : {}),
          ...(p !== undefined ? { p } : {}),
          ...(v !== undefined ? { v } : {}),
          ...(mode !== undefined ? { mode } : {}),
        } as ElectreIIIParams
      }
      format={format}
      labels={labels}
      className={cn('max-w-[760px]', className)}
    />
  )
}

/** Method page: the ELECTRE III picture on the published waste incineration example, stepping through r↓, r↑, and Φ. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const labels = useElectreIIILabels()
  const { format } = useNumberFormat(4)
  const weights = example.weights ?? []
  const steps = useIdeaSteps(ELECTRE_III_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.electre-iii.steps.${k}`))
  return (
    <div className="flex flex-col gap-2">
      <ElectreIIIIdea
        problem={problem}
        weights={weights}
        params={WANG_2008_PARAMS}
        format={format}
        labels={{
          ...labels,
          title: t('methods.page.idea.electre-iii.title'),
          caption: t('methods.page.idea.electre-iii.caption'),
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
