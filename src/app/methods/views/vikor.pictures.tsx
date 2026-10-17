import { useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { VIKOR_DEFAULT_V } from '../../../core/methods/vikor'
import { VikorIdea } from '../../../features/illustrations/VikorIdea'
import { useNumberFormat } from '../../../i18n'
import { cn } from '../../../ui'
import { WeightRange } from '../../ranking/WeightRange'
import { DECIMALS } from '../../workbench/shared'
import { useVikorLabels } from '../../workbench/vikorLabels'
import { IdeaSource } from './parts'
import type { IdeaPictureProps, StagePictureProps } from './types'

/** Ranking stage: S against R with the DQ threshold line, Q with the DQ band, C1 and C2 in words. */
export function Stage({ problem, weights, params, className }: StagePictureProps) {
  const labels = useVikorLabels('workbench.visual.vikor.title')
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const v = typeof params.v === 'number' ? params.v : VIKOR_DEFAULT_V
  return <VikorIdea problem={problem} weights={weights} params={{ v }} format={format} labels={labels} className={cn('max-w-[880px]', className)} />
}

/**
 * Method page: the picture on ten alternatives, where no leader is clearly ahead, so the compromise set and the DQ
 * line show. Its own v slider (the page's state, not the workbench's) instead of a step-through story, since turning
 * the threshold line is its idea.
 */
export function Idea({ example, problem }: IdeaPictureProps) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(4)
  const [v, setV] = useState(0.5)
  const id = useId()
  const labels = useVikorLabels('methods.page.idea.vikor.title')
  const vText = format(v, 2)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full max-w-[360px] flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={id} className="text-13 font-medium text-text-2">
            {t('workbench.params.vikor.v')}
          </label>
          <output htmlFor={id} className="text-14 font-semibold text-text tabular-nums" data-testid="idea-v">
            {vText}
          </output>
        </div>
        <WeightRange id={id} value={v} base={0.5} valueText={vText} onChange={setV} />
        <div className="flex justify-between gap-4 text-12 text-text-3">
          <span>{t('workbench.params.vikor.vEnds.min')}</span>
          <span className="text-right">{t('workbench.params.vikor.vEnds.max')}</span>
        </div>
      </div>
      <VikorIdea
        problem={problem}
        weights={example.weights ?? []}
        params={{ v }}
        format={(x) => format(x, 4)}
        labels={{ ...labels, caption: t('methods.page.idea.vikor.caption'), showTable: t('methods.page.idea.showTable'), alternative: t('methods.page.idea.alternative') }}
        className="max-w-[880px]"
      />
      <IdeaSource example={example} />
    </div>
  )
}
