import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { reweight } from '../../../core/robustness'
import { rankerFor, type RankingRun } from '../../../core/run'
import type { Problem } from '../../../core/types'
import { ProblemValidationError } from '../../../core/validate'
import { SweepChart } from '../../../features/charts/SweepChart'
import { useElementWidth } from '../../../features/charts/useElementWidth'
import { useNumberFormat } from '../../../i18n'
import { Button, Notice, SegmentedControl, Select } from '../../../ui'
import type { RankingMethodId } from '../../../state/workbench'
import { DECIMALS, scoreWords, tr } from '../shared'
import { LiveRanking } from '../../ranking/LiveRanking'
import { rankOrder, snapWeight } from '../../ranking/order'
import { THUMB, WeightRange } from '../../ranking/WeightRange'
import { blockedNames, labelledLines, largestWeight, MANY_ALTERNATIVES, MANY_SWITCHES } from './helpers'
import s from './robustness.module.css'
import { SectionHead, segmentedWidth, SourcesDisclosure } from './SectionParts'
import { useRobustnessText } from './text'
import { useSweep } from './useWorkerJob'

type Props = {
  problem: Problem
  weights: readonly number[]
  /** The ranking method and options, the same the workbench ranked with. */
  run: RankingRun
  /** The ranking with the user's weights. */
  baseRanking: readonly number[]
  names: string[]
  criteria: string[]
}

const EMPTY_XS = [0, 1]
const NO_LINES: number[] = []
const NO_MARKS: { x: number; y: number }[] = []

/**
 * A: one weight at a time. Pick a criterion, drag its weight (the others keep their proportions); the chart shows
 * every alternative's score over the whole range with a cursor at the weight, and the table next to it is the
 * ranking at that weight, its rows sliding to their new places as the order changes. The sweep of a criterion is
 * calculated in a worker (a large matrix takes a few hundred ms); the ranking at the cursor is one calculation, here.
 */
export function SweepSection({ problem, weights, run, baseRanking, names, criteria }: Props) {
  const { t } = useRobustnessText()
  const { t: tw } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const uid = useId()
  const [k, setK] = useState(() => largestWeight(weights))
  const base = weights[k] ?? 0
  const [wk, setWk] = useState(base)
  const [boxRef, boxWidth] = useElementWidth<HTMLElement>()
  // Set by the key handler just before the weight changes: a held-down key makes the rows jump instead of slide.
  const keyRepeat = useRef(false)

  const choose = (j: number) => {
    keyRepeat.current = false
    setK(j)
    setWk(weights[j] ?? 0)
  }
  const setWeight = (v: number, repeat = false) => {
    keyRepeat.current = repeat
    setWk(v)
  }

  const job = useSweep(problem, weights, run, k)
  const result = job.result
  const sweep = result?.sweep ?? null
  const current = sweep !== null && sweep.k === k
  const xs = useMemo(() => sweep?.points.map((p) => p.wk) ?? [], [sweep])
  const series = useMemo(() => (sweep ? names.map((_, i) => sweep.points.map((p) => p.scores[i]!)) : []), [sweep, names])
  // The ranking at the slider's weight: computed exactly there, never read off the grid. Where the method cannot rank
  // (CoCoSo at w_k = 1: an alternative is then worst on every weighted criterion) there is no ranking, only a note.
  const at = useMemo(() => {
    try {
      return rankerFor(run)(problem)(reweight(weights, k, wk))
    } catch (err) {
      if (err instanceof ProblemValidationError) return err
      throw err
    }
  }, [run, problem, weights, k, wk])
  const atRes = at instanceof ProblemValidationError ? null : at
  const scoreOrder: 'asc' | 'desc' = atRes?.order ?? (run.methodId === 'vikor' ? 'asc' : 'desc')
  const atRanking = atRes?.ranking ?? NO_LINES
  const atScores = atRes?.scores ?? NO_LINES
  const order = rankOrder(atRanking)
  const leaders = order.filter((i) => atRanking[i] === 1)
  const baseLeaders = rankOrder(baseRanking).filter((i) => baseRanking[i] === 1)
  const criterion = criteria[k] ?? ''
  // shortcut: names only CoCoSo's all-worst alternative, the one block a sweep end meets; another block would read "can't rank: ".
  const blockedNote =
    at instanceof ProblemValidationError
      ? t(wk === 1 ? 'sweep.blockedOne' : 'sweep.blockedRest', {
          w: nf.format(wk, Number.isInteger(wk) ? 0 : 2),
          method: tr(tw, `workbench.rankingMethod.${run.methodId}`),
          name: blockedNames(at.issues, names),
        })
      : null
  // The registry method the workbench ranked with, so its id is one of the workbench's ranking methods.
  const score = scoreWords(run.methodId as RankingMethodId, tw)
  const shownCriterion = sweep ? (criteria[sweep.k] ?? '') : criterion
  const many = names.length > MANY_ALTERNATIVES || (result?.marks.length ?? 0) > MANY_SWITCHES
  const endLabels = useMemo(
    () => (names.length > MANY_ALTERNATIVES ? labelledLines(baseRanking, leaders) : undefined),
    // Leaders change while dragging; their names come and go with the accent (the key keeps the memo stable meanwhile).
    [names.length, baseRanking, leaders.join(',')],
  )

  const format4 = useCallback((v: number) => nf.format(v), [nf])
  const formatTick = useCallback((v: number, d: number) => nf.format(v, d), [nf])
  const formatWeight = useCallback((v: number) => nf.format(v, 2), [nf])

  let holds = ''
  if (baseLeaders.length > 1) holds = t('sweep.tied', { names: baseLeaders.map((i) => names[i]).join(', ') })
  else if (sweep && current) {
    const top = sweep.baseTopInterval
    const topNames = top.top.map((i) => names[i]).join(', ')
    holds =
      top.from <= 1e-9 && top.to >= 1 - 1e-9
        ? t('sweep.holdsAll', { name: topNames, criterion })
        : t('sweep.holds', { name: topNames, criterion, from: nf.format(top.from), to: nf.format(top.to), base: nf.format(base) })
  }

  const useSegments = criteria.length <= 5 && segmentedWidth(criteria) <= boxWidth
  const sliderId = `${uid}-slider`
  const tableTitleId = `${uid}-table`
  const baseName = baseLeaders.map((i) => names[i]).join(', ')
  const readout = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="text-14 text-text-2">
        {t('sweep.slider', { criterion })}{' '}
        <output htmlFor={sliderId} className="num font-semibold text-text" data-testid="sweep-weight">
          {nf.format(wk)}
        </output>
      </p>
      <Button size="sm" variant="ghost" icon={<ArrowCounterClockwise aria-hidden />} onClick={() => setWeight(base)} disabled={wk === base}>
        {t('sweep.reset')}
      </Button>
    </div>
  )

  return (
    <section aria-labelledby={`${uid}-title`} className="flex flex-col gap-4" ref={boxRef}>
      <SectionHead id={`${uid}-title`} title={t('sweep.title')} lead={t('sweep.lead')} />

      <div className="flex flex-col gap-1.5">
        <span id={`${uid}-crit`} className="text-13 font-medium text-text-2">
          {t('sweep.criterion')}
        </span>
        {useSegments ? (
          <SegmentedControl<string>
            aria-label={t('sweep.criterion')}
            value={String(k)}
            onValueChange={(v) => choose(Number(v))}
            options={criteria.map((c, j) => ({ value: String(j), label: c }))}
            size="md"
            className="self-start"
          />
        ) : (
          <Select
            aria-labelledby={`${uid}-crit`}
            value={String(k)}
            onChange={(e) => choose(Number(e.target.value))}
            options={criteria.map((c, j) => ({ value: String(j), label: c }))}
            className="max-w-[320px]"
          />
        )}
      </div>

      {/* The sentence of the criterion being shown; it changes when that criterion's sweep has arrived. */}
      <p className="min-h-6 max-w-[72ch] text-16 font-medium text-text" data-testid="holds-sentence">
        {holds}
      </p>

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-3" aria-busy={job.busy} data-testid="sweep-chart">
          {/* One chart from the start (empty axes until the first sweep arrives), so the slider inside it is the same
              element throughout and keeps the focus. */}
          <SweepChart
            title={t('sweep.chartTitle', { score: score.title, criterion: shownCriterion })}
            labels={names}
            pending={!sweep}
            endLabels={sweep ? endLabels : NO_LINES}
            xs={sweep ? xs : EMPTY_XS}
            series={series}
            cursor={current ? wk : null}
            cursorValues={atScores}
            base={weights[sweep?.k ?? k] ?? 0}
            switches={!result ? NO_MARKS : many ? result.topMarks : result.marks}
            topBand={sweep ? [sweep.baseTopInterval.from, sweep.baseTopInterval.to] : [base, base]}
            rankingBand={sweep ? [sweep.baseRankingInterval.from, sweep.baseRankingInterval.to] : [base, base]}
            highlight={current ? leaders : []}
            order={scoreOrder}
            format={format4}
            formatTick={formatTick}
            formatWeight={formatWeight}
            onPick={(v) => setWeight(snapWeight(v))}
            text={{
              yours: t('sweep.yours'),
              showTable: tw('workbench.chart.showTable'),
              tableCorner: t('sweep.tableCorner', { criterion: shownCriterion }),
              axis: t('sweep.axis', { criterion: shownCriterion }),
            }}
            below={({ left, right }) => (
              <div className="flex flex-col gap-1">
                <WeightRange
                  id={sliderId}
                  label={t('sweep.slider', { criterion })}
                  value={wk}
                  base={base}
                  valueText={nf.format(wk)}
                  onChange={setWeight}
                  style={{ marginLeft: left - THUMB / 2, width: right - left + THUMB }}
                />
                {readout}
              </div>
            )}
          />
          <span role="status" className="text-12 text-text-2" data-testid="sweep-status">
            {job.busy ? t('sweep.computing') : ''}
          </span>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-12 text-text-2" aria-hidden>
            <li className="inline-flex items-center gap-1.5">
              <span className={s.swatchLeader} />
              {t('sweep.legendLeader')}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className={s.swatchTop} />
              {t('sweep.legendTop', { name: baseName })}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className={s.swatchRanking} />
              {t('sweep.legendRanking')}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className={s.swatchSwitch} />
              {t('sweep.legendSwitch')}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className={s.swatchBase} />
              {t('sweep.yours')}
            </li>
          </ul>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <h3 id={tableTitleId} className="text-14 font-medium text-text">
            {t('sweep.tableTitle')}
          </h3>
          {blockedNote ? (
            <Notice tone="info">
              <span data-testid="sweep-blocked">{blockedNote}</span>
            </Notice>
          ) : (
            <LiveRanking
              order={order}
              ranking={atRanking}
              scores={atScores}
              names={names}
              format={format4}
              labelledBy={tableTitleId}
              instant={keyRepeat.current}
              columns={{
                rank: tw('workbench.ranking.columns.rank'),
                alternative: tw('workbench.ranking.columns.alternative'),
                closeness: score.name,
              }}
            />
          )}
          {/* Said when first place changes; the table itself is not a live region (it changes on every step). */}
          <p aria-live="polite" className="sr-only">
            {blockedNote ?? t('sweep.leader', { name: leaders.map((i) => names[i]).join(', ') })}
          </p>
        </div>
      </div>

      <SourcesDisclosure part="sweep" />
    </section>
  )
}
