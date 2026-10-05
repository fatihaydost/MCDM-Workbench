import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getRankingMethod, type RankingResult } from '../../core'
import { BarChart } from '../../features/charts'
import { TopsisGeometry } from '../../features/illustrations'
import { useNumberFormat } from '../../i18n'
import { isEmptyProblem, toProblem, useRanking, useWeights, useWorkbench, type DraftProblem, type RankingMethodId } from '../../state/workbench'
import { Button, cn, EmptyState, SegmentedControl, Table, TBody, Td, Th, THead, Tr } from '../../ui'
import { MethodParams } from './MethodParams'
import { useWorkbenchNav } from './nav'
import { BlockedByIssues, CalculationToggle, ContinueBar, MethodWarnings, SectionTitle } from './parts'
import { alternativeName, DECIMALS, findStep, weightMethodFullLabel } from './shared'

const RANKING_METHODS: readonly RankingMethodId[] = ['topsis']

/** Alternatives in rank order (ties keep input order). */
export function rankOrder(result: RankingResult): number[] {
  return result.ranking.map((_, i) => i).sort((a, b) => result.ranking[a]! - result.ranking[b]! || a - b)
}

/** Index of the first-ranked alternative. */
export const bestIndex = (result: RankingResult): number => rankOrder(result)[0] ?? 0

/**
 * The ranking in rank order. `compact` keeps rank, name and C (the Results summary); the full
 * table on the Ranking stage adds D+ and D-.
 */
export function RankingTable({ problem, result, id, compact = false }: { problem: DraftProblem; result: RankingResult; id?: string; compact?: boolean }) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const dPlus = findStep(result.steps, 'topsis.distanceBest')?.vector
  const dMinus = findStep(result.steps, 'topsis.distanceWorst')?.vector
  const order = rankOrder(result)
  return (
    <div className="min-w-0">
      <Table density="regular" className={cn('w-auto', compact ? 'min-w-[min(100%,360px)]' : 'min-w-[min(100%,560px)]')} aria-labelledby={id} containerClassName={compact ? 'max-w-[560px]' : undefined}>
        <THead>
          <Tr>
            <Th numeric className="w-16">
              {t('workbench.ranking.columns.rank')}
            </Th>
            <Th>{t('workbench.ranking.columns.alternative')}</Th>
            {!compact && <Th numeric>{t('workbench.ranking.columns.dPlus')}</Th>}
            {!compact && <Th numeric>{t('workbench.ranking.columns.dMinus')}</Th>}
            <Th numeric>{t('workbench.ranking.columns.closeness')}</Th>
          </Tr>
        </THead>
        <TBody>
          {order.map((i) => {
            const first = result.ranking[i] === 1
            return (
              <Tr key={i} selected={first} data-testid="ranking-row">
                <Td numeric className={cn(first && 'font-semibold')}>
                  {result.ranking[i]}
                </Td>
                <Th scope="row" className={cn(first && 'font-semibold')}>
                  {alternativeName(problem, i, t)}
                </Th>
                {!compact && <Td numeric>{nf.format(dPlus?.[i])}</Td>}
                {!compact && <Td numeric>{nf.format(dMinus?.[i])}</Td>}
                <Td numeric data-testid="closeness" className={cn(first ? 'font-semibold' : 'font-medium')}>
                  {nf.format(result.scores[i])}
                </Td>
              </Tr>
            )
          })}
        </TBody>
      </Table>
    </div>
  )
}

export function ClosenessChart({ problem, result, className }: { problem: DraftProblem; result: RankingResult; className?: string }) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const labels = useMemo(() => problem.alternatives.map((_, i) => alternativeName(problem, i, t)), [problem, t])
  return (
    <BarChart
      title={t('workbench.ranking.chartTitle')}
      labels={labels}
      values={result.scores}
      highlight={bestIndex(result)}
      sort="desc"
      format={format}
      tableLabels={{
        show: t('workbench.chart.showTable'),
        label: t('workbench.alternative'),
        value: t('workbench.ranking.columns.closeness'),
      }}
      className={cn('max-w-[640px]', className)}
    />
  )
}

/** TOPSIS as a picture: alternatives, A+ and A- on the two heaviest criteria (features/illustrations). */
export function TopsisPicture({ problem, weights, className }: { problem: DraftProblem; weights: readonly number[]; className?: string }) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const core = useMemo(() => toProblem(problem), [problem])
  return (
    <TopsisGeometry
      problem={core}
      weights={weights}
      format={format}
      labels={{
        title: t('workbench.visual.topsis.title'),
        caption: t('workbench.visual.topsis.caption'),
        projectionNote: t('workbench.visual.topsis.projectionNote'),
        ideal: 'A+',
        antiIdeal: 'A−',
        dPlus: 'D+',
        dMinus: 'D−',
        formula: 'C = D− / (D+ + D−)',
        select: t('workbench.visual.topsis.select'),
        point: (name, value) => t('workbench.visual.topsis.point', { name, value }),
        // The picture's own words are shared with the TOPSIS method page.
        viewLabel: t('methods.page.idea.topsis.view'),
        viewDistances: t('methods.page.idea.topsis.viewDistances'),
        viewCriteria: t('methods.page.idea.topsis.viewCriteria'),
        axisDPlus: t('methods.page.idea.topsis.axisDPlus'),
        axisDMinus: t('methods.page.idea.topsis.axisDMinus'),
        isoC: (c) => t('methods.page.idea.topsis.iso', { c }),
        planeCaption: t('methods.page.idea.topsis.planeCaption'),
        higherBetter: (name) => t('methods.page.idea.topsis.higherBetter', { name }),
        lowerBetter: (name) => t('methods.page.idea.topsis.lowerBetter', { name }),
        showTable: t('workbench.chart.showTable'),
        alternative: t('workbench.alternative'),
        closeness: 'C',
      }}
      className={cn('max-w-[640px]', className)}
    />
  )
}

export function RankingStage() {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const problem = useWorkbench((s) => s.problem)
  const weightMethod = useWorkbench((s) => s.weightMethod)
  const weightParams = useWorkbench((s) => s.methodParams?.[s.weightMethod])
  const rankingMethod = useWorkbench((s) => s.rankingMethod)
  const setRankingMethod = useWorkbench((s) => s.setRankingMethod)
  const ranking = useRanking()
  const weights = useWeights()
  const { goTo } = useWorkbenchNav()

  if (isEmptyProblem(problem)) {
    return (
      <EmptyState
        title={t('workbench.empty.ranking.title')}
        description={t('workbench.empty.ranking.body')}
        action={<Button onClick={() => goTo('data')}>{t('workbench.empty.weights.action')}</Button>}
      />
    )
  }

  const result = ranking.value
  const best = result ? bestIndex(result) : -1

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-col gap-2">
        {/* One method today; the control is where the next ones will appear. */}
        <SegmentedControl<RankingMethodId>
          aria-label={t('workbench.rankingMethod.label')}
          value={rankingMethod}
          onValueChange={setRankingMethod}
          options={RANKING_METHODS.map((m) => ({ value: m, label: t(`workbench.rankingMethod.${m}`) }))}
          size="md"
          className="self-start"
        />
        <p className="max-w-[72ch] text-13 text-text-2">
          {t(`workbench.ranking.methodHint.${rankingMethod}`)}
        </p>
        {/* Nothing today (TOPSIS has no options); SAW, VIKOR and WASPAS will show theirs here. */}
        <MethodParams methodId={rankingMethod} descriptors={getRankingMethod(rankingMethod)?.params} />
        <p className="flex flex-wrap items-center gap-x-2 text-13 text-text-2">
          <span>{t('workbench.ranking.weightsUsed', { method: weightMethodFullLabel(weightMethod, weightParams, t) })}</span>
          <button type="button" className="text-accent underline underline-offset-2 hover:no-underline" onClick={() => goTo('weights')}>
            {t('workbench.ranking.changeWeights')}
          </button>
        </p>
      </div>

      {!result ? (
        <BlockedByIssues issues={ranking.issues} problem={problem} />
      ) : (
        <>
          <MethodWarnings warnings={result.warnings} problem={problem} />
          <p className="text-20 font-semibold text-text" data-testid="best-sentence">
            {t('workbench.ranking.best', { name: alternativeName(problem, best, t), value: nf.format(result.scores[best]) })}
          </p>
          <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
            <ClosenessChart problem={problem} result={result} className="min-w-0" />
            {weights.value && <TopsisPicture problem={problem} weights={weights.value.weights} className="min-w-0" />}
          </div>
          <section className="flex flex-col gap-3">
            <SectionTitle>
              <span id="wb-ranking-table">{t('workbench.ranking.tableTitle')}</span>
            </SectionTitle>
            <RankingTable problem={problem} result={result} id="wb-ranking-table" />
          </section>
          <CalculationToggle groups={[{ steps: result.steps }]} problem={problem} />
        </>
      )}

      {result && <ContinueBar to="results" onContinue={() => goTo('results')} />}
    </div>
  )
}
