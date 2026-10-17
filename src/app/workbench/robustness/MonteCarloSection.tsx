import { useCallback, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RankingRun } from '../../../core/run'
import type { Problem } from '../../../core/types'
import { Heatmap } from '../../../features/charts'
import { RankIntervalChart } from '../../../features/charts/RankIntervalChart'
import { useNumberFormat } from '../../../i18n'
import { useElementWidth } from '../../../features/charts/useElementWidth'
import { Notice, SegmentedControl, Select } from '../../../ui'
import { rankOrder } from '../../ranking/order'
import { CONCENTRATION, formatShare, MC_RUNS, MC_SEED, SPREADS, type Spread } from './helpers'
import { SectionHead, segmentedWidth, SourcesDisclosure } from './SectionParts'
import { useRobustnessText } from './text'
import { useMonteCarlo } from './useWorkerJob'

type Props = {
  problem: Problem
  weights: readonly number[]
  /** The ranking method and options, the same the workbench ranked with. */
  run: RankingRun
  names: string[]
  /** The ranking with the user's weights: rows of the heat map follow it, and its first place is the reference. */
  baseRanking: readonly number[]
}

/**
 * C: random weights (SMAA-style Monte Carlo). A κ preset draws 10,000 weight vectors (uniform, or around the user's
 * weights) in a worker; the heat map gives the share of draws in which each alternative takes each rank, the interval
 * chart the mean rank and its 95 % interval. While a new preset is calculated the previous result stays, marked busy.
 */
export function MonteCarloSection({ problem, weights, run, names, baseRanking }: Props) {
  const { t } = useRobustnessText()
  const { t: tw } = useTranslation()
  const nf = useNumberFormat(2)
  const uid = useId()
  const [spread, setSpread] = useState<Spread>('medium')
  const mc = useMonteCarlo(problem, weights, run, CONCENTRATION[spread], MC_RUNS, MC_SEED)
  const r = mc.result

  const rowOrder = useMemo(() => rankOrder(baseRanking), [baseRanking])
  const baseTop = rowOrder.filter((i) => baseRanking[i] === 1)
  const m = names.length
  const rowLabels = useMemo(() => rowOrder.map((i) => names[i]!), [rowOrder, names])
  const colLabels = useMemo(() => Array.from({ length: m }, (_, k) => String(k + 1)), [m])
  const values = useMemo(() => (r ? rowOrder.map((i) => r.acceptability[i]!) : []), [r, rowOrder])
  const share = useCallback((v: number) => formatShare(v, nf.lang), [nf.lang])
  const formatMean = useCallback((v: number) => nf.format(v, 2), [nf])
  const formatRank = useCallback((v: number) => nf.format(v, Number.isInteger(v) ? 0 : 1), [nf])
  const runs = nf.format(MC_RUNS, 0)
  const options = SPREADS.map((v) => ({ value: v, label: t(`monteCarlo.${v}`) }))
  const [boxRef, boxWidth] = useElementWidth<HTMLElement>()

  return (
    <section aria-labelledby={`${uid}-title`} className="flex flex-col gap-4" ref={boxRef}>
      <SectionHead id={`${uid}-title`} title={t('monteCarlo.title')} lead={t('monteCarlo.lead', { n: runs })} />

      <div className="flex flex-col gap-1.5">
        <span className="text-13 font-medium text-text-2">{t('monteCarlo.spread')}</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {segmentedWidth(options.map((o) => o.label)) <= boxWidth ? (
            <SegmentedControl<Spread> aria-label={t('monteCarlo.spread')} value={spread} onValueChange={setSpread} options={options} size="md" />
          ) : (
            <Select
              aria-label={t('monteCarlo.spread')}
              value={spread}
              onChange={(e) => setSpread(e.target.value as Spread)}
              options={options}
              className="max-w-[320px]"
            />
          )}
          <span className="num text-12 text-text-3" data-testid="mc-note">
            {t('monteCarlo.note', { n: runs, seed: MC_SEED })}
          </span>
          {/* Status in words (no spinner); the previous result stays readable meanwhile. */}
          <span role="status" className="text-12 text-text-2" data-testid="mc-status">
            {mc.busy ? t('monteCarlo.computing') : ''}
          </span>
        </div>
        <p className="text-13 text-text-2">{spread === 'uniform' ? t('monteCarlo.hintUniform') : t('monteCarlo.hintKappa')}</p>
      </div>

      {mc.failed && <Notice tone="danger">{t('monteCarlo.failed')}</Notice>}

      <div aria-busy={mc.busy} data-testid="mc-result" className="flex flex-col gap-4">
        {r ? (
          <>
            <p className="text-16 font-medium text-text" data-testid="mc-same-top">
              {baseTop.length === 1
                ? t('monteCarlo.sameTop', { name: names[baseTop[0]!], share: formatShare(r.sameTop, nf.lang, 1) })
                : t('monteCarlo.sameTopTied', { share: formatShare(r.sameTop, nf.lang, 1) })}
            </p>
            <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
              <Heatmap
                title={t('monteCarlo.acceptTitle')}
                rowLabels={rowLabels}
                colLabels={colLabels}
                values={values}
                scale="sequential"
                domain={[0, 1]}
                format={share}
                tableLabels={{ show: tw('workbench.chart.showTable'), corner: tw('workbench.alternative') }}
                fade
                columnsTitle={t('monteCarlo.rankColumn')}
                className="min-w-0"
              />
              <RankIntervalChart
                title={t('monteCarlo.intervalTitle')}
                labels={names}
                mean={r.meanRank}
                interval={r.rankInterval}
                ranks={m}
                highlight={baseTop}
                format={formatMean}
                formatRank={formatRank}
                tableLabels={{
                  show: tw('workbench.chart.showTable'),
                  label: tw('workbench.alternative'),
                  mean: t('monteCarlo.mean'),
                  low: t('monteCarlo.low'),
                  high: t('monteCarlo.high'),
                }}
                className="min-w-0"
              />
            </div>
          </>
        ) : (
          // First calculation: the space the result will take, so nothing below jumps when it lands.
          <div aria-hidden className="h-[320px]" />
        )}
      </div>
      <SourcesDisclosure part="monteCarlo" />
    </section>
  )
}
