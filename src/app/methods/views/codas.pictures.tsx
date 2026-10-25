import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CODAS_DEFAULT_TAU } from '../../../core/methods/codas'
import { CODAS_IDEA_STEPS, CodasIdea, type CodasIdeaLabels } from '../../../features/illustrations/CodasIdea'
import { IdeaSteps, useIdeaSteps } from '../../../features/illustrations/IdeaSteps'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import r from '../../ranking/ranking.module.css'
import { THUMB } from '../../ranking/WeightRange'
import { IdeaSource, useStepLabels } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

function useCodasLabels(): CodasIdeaLabels {
  const { t } = useTranslation()
  return {
    title: t('workbench.visual.codas.title'),
    caption: t('workbench.visual.codas.caption'),
    showTable: t('workbench.chart.showTable'),
    alternative: t('workbench.alternative'),
    euclidean: 'E',
    taxicab: 'T',
    score: 'H',
    row: (alternative, e, tx, score) => t('workbench.visual.codas.row', { alternative, e, t: tx, score }),
  }
}

/** Ranking stage: each alternative's Euclidean (E) and Taxicab (T) distances from ns, and assessment score H on the right. */
export function Stage({ problem, weights, params, className }: StagePictureProps) {
  const labels = useCodasLabels()
  const { format } = useNumberFormat(4)
  const tau = typeof params.tau === 'number' ? params.tau : CODAS_DEFAULT_TAU
  return <CodasIdea problem={problem} weights={weights} tau={tau} format={format} labels={labels} className={cn('max-w-[760px]', className)} />
}

/** Method page: the CODAS picture on the published suppliers example, stepping through E, T, and H. */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const labels = useCodasLabels()
  const { format } = useNumberFormat(4)
  const [tau, setTau] = useState(CODAS_DEFAULT_TAU)
  const id = useId()
  const weights = example.weights ?? []
  const steps = useIdeaSteps(CODAS_IDEA_STEPS)
  const stepLabels = useStepLabels()
  const sentences = (['s1', 's2', 's3'] as const).map((k) => t(`methods.page.idea.codas.steps.${k}`))
  const shownTau = steps.step !== null ? CODAS_DEFAULT_TAU : tau
  const tauDecimals = Math.abs(Math.round(shownTau * 100) - shownTau * 100) > 1e-6 ? 3 : 2
  const tauText = format(shownTau, tauDecimals)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full max-w-[360px] flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={id} className="text-13 font-medium text-text-2">
            {t('workbench.params.codas.tau')}
          </label>
          <output htmlFor={id} className="text-14 font-semibold text-text tabular-nums" data-testid="idea-tau">
            {tauText}
          </output>
        </div>
        <div className={r.slider}>
          <input
            id={id}
            type="range"
            className={r.range}
            min={0.01}
            max={0.1}
            step={0.01}
            value={shownTau}
            disabled={steps.step !== null}
            aria-valuetext={tauText}
            onChange={(e) => setTau(Math.min(0.1, Math.max(0.01, Math.round(Number(e.target.value) * 100) / 100)))}
          />
          <span
            aria-hidden
            className={r.baseTick}
            style={{ left: `calc(${THUMB / 2}px + ${(CODAS_DEFAULT_TAU - 0.01) / (0.1 - 0.01)} * (100% - ${THUMB}px))` }}
          />
        </div>
        <div className="flex justify-between gap-4 text-12 text-text-3">
          <span>{t('workbench.params.codas.tauEnds.min')}</span>
          <span className="text-right">{t('workbench.params.codas.tauEnds.max')}</span>
        </div>
      </div>
      <CodasIdea
        problem={problem}
        weights={weights}
        tau={shownTau}
        format={format}
        labels={{
          ...labels,
          title: t('methods.page.idea.codas.title'),
          caption: t('methods.page.idea.codas.caption'),
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
