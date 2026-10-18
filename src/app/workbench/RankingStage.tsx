import { Suspense, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getRankingMethod, type RankingResult } from '../../core'
import { BarChart } from '../../features/charts'
import { useNumberFormat } from '../../i18n'
import {
  isEmptyProblem,
  toProblem,
  useMethodParams,
  useRanking,
  useWeights,
  useWorkbench,
  type DraftProblem,
  type RankingMethodId,
} from '../../state/workbench'
import { Button, cn, EmptyState, SegmentedControl, Table, TBody, Td, Th, THead, Tr } from '../../ui'
import { methodViews, RANKING_VIEW_IDS } from '../methods/views'
import { MethodParams } from './MethodParams'
import { useWorkbenchNav } from './nav'
import { BlockedByIssues, CalculationToggle, ContinueBar, MethodWarnings, SectionTitle } from './parts'
import { alternativeName, DECIMALS, findStep, scoreWords, tr, weightMethodFullLabel } from './shared'

/** Alternatives in rank order (ties keep input order). */
export function rankOrder(result: RankingResult): number[] {
  return result.ranking.map((_, i) => i).sort((a, b) => result.ranking[a]! - result.ranking[b]! || a - b)
}

/** Index of the first-ranked alternative. */
export const bestIndex = (result: RankingResult): number => rankOrder(result)[0] ?? 0

/** Every alternative ranked first, in input order (more than one when the best score is tied). */
export const leaders = (result: RankingResult): number[] => rankOrder(result).filter((i) => result.ranking[i] === 1)

/**
 * The ranking in rank order. `compact` keeps rank, name and the score (the Results summary); the full table on the
 * Ranking stage adds the method's own columns (TOPSIS: D+ and D-).
 */
export function RankingTable({
  problem,
  result,
  method,
  id,
  compact = false,
}: {
  problem: DraftProblem
  result: RankingResult
  method: RankingMethodId
  id?: string
  compact?: boolean
}) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const view = methodViews[method]
  const extra = compact ? [] : (view.columns ?? []).map((c) => ({ ...c, values: findStep(result.steps, c.step)?.vector }))
  const before = extra.filter((c) => !c.after)
  const after = extra.filter((c) => c.after)
  const order = rankOrder(result)
  // Results (compact): a small bar before each score, the same raw scale as the score chart on Ranking.
  const topScore = Math.max(...result.scores.map((v) => (Number.isFinite(v) ? Math.max(v, 0) : 0)), 0)
  const narrowHidden = !compact && view.columnsFromSm === true
  const extraClass = narrowHidden ? 'max-sm:hidden' : undefined
  // A column after the score (COPRAS's N) comes with long words ("Relative significance Q", "Utility degree N (%)"):
  // those heads wrap at 390 px, so the N column is not scrolled off. Other tables keep their one-line heads.
  const wrapHead = after.length > 0 ? 'max-sm:whitespace-normal' : undefined
  const wide = extra.length > 0
  const constants = compact ? [] : (view.constants ?? []).map((c) => `${c.symbol} = ${nf.format(findStep(result.steps, c.step)?.scalar)}`)
  return (
    <div className="min-w-0">
      {constants.length > 0 && (
        <p className="mb-2 text-13 text-text-2" data-testid="ranking-constants">
          {t('workbench.ranking.constants', { list: constants.join(', ') })}
        </p>
      )}
      <Table density="regular" className={cn('w-auto', !wide ? 'min-w-[min(100%,360px)]' : narrowHidden ? 'min-w-[min(100%,360px)] sm:min-w-[min(100%,560px)]' : 'min-w-[min(100%,560px)]')} aria-labelledby={id} containerClassName={compact ? 'max-w-[560px]' : undefined}>
        <THead>
          <Tr>
            <Th numeric className="w-16">
              {t('workbench.ranking.columns.rank')}
            </Th>
            <Th>{t('workbench.ranking.columns.alternative')}</Th>
            {before.map((c) => (
              <Th key={c.step} numeric className={cn(extraClass, wrapHead)}>
                {tr(t, c.label)}
              </Th>
            ))}
            <Th numeric className={wrapHead}>
              {scoreWords(method, t).name}
            </Th>
            {after.map((c) => (
              <Th key={c.step} numeric className={cn(extraClass, wrapHead)}>
                {tr(t, c.label)}
              </Th>
            ))}
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
                {before.map((c) => (
                  <Td key={c.step} numeric className={extraClass}>
                    {nf.format(c.values?.[i], c.decimals)}
                  </Td>
                ))}
                <Td numeric data-testid="closeness" className={cn(first ? 'font-semibold' : 'font-medium')}>
                  {compact && topScore > 0 && (
                    <span aria-hidden className="mr-3 inline-block h-2 w-20 bg-surface-2 align-middle">
                      <span
                        className={cn('block h-full', first ? 'bg-accent' : 'bg-[var(--data-context)]')}
                        style={{ width: `${(Math.max(result.scores[i]!, 0) / topScore) * 100}%` }}
                      />
                    </span>
                  )}
                  {nf.format(result.scores[i])}
                </Td>
                {after.map((c) => (
                  <Td key={c.step} numeric className={extraClass} data-testid={`column-${c.step}`}>
                    {nf.format(c.values?.[i], c.decimals)}
                  </Td>
                ))}
              </Tr>
            )
          })}
        </TBody>
      </Table>
    </div>
  )
}

/** The scores as bars, best first: sorted by the method's own order (a lower-is-better score sorts ascending). */
export function ScoreChart({ problem, result, method, className }: { problem: DraftProblem; result: RankingResult; method: RankingMethodId; className?: string }) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const labels = useMemo(() => problem.alternatives.map((_, i) => alternativeName(problem, i, t)), [problem, t])
  const words = scoreWords(method, t)
  return (
    <BarChart
      title={words.title}
      labels={labels}
      values={result.scores}
      highlight={bestIndex(result)}
      sort={result.order}
      format={format}
      tableLabels={{
        show: t('workbench.chart.showTable'),
        label: t('workbench.alternative'),
        value: words.name,
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
  const rankingParams = useMethodParams(rankingMethod)
  const ranking = useRanking()
  const weights = useWeights()
  const { goTo } = useWorkbenchNav()
  const core = useMemo(() => toProblem(problem), [problem])

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
  const view = methodViews[rankingMethod]
  const Picture = view.stage?.Component
  const pictureShowsScores = view.pictureShowsScores === true

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-col gap-2">
        {/* Eight methods do not fit one row at 390 px: two rows of four below sm, no empty cell. */}
        <SegmentedControl<RankingMethodId>
          aria-label={t('workbench.rankingMethod.label')}
          value={rankingMethod}
          onValueChange={setRankingMethod}
          options={RANKING_VIEW_IDS.map((m) => ({ value: m, label: t(`workbench.rankingMethod.${m}`) }))}
          size="md"
          className="self-start max-sm:grid max-sm:grid-cols-4 max-sm:self-stretch max-sm:[&>*]:px-2 max-sm:[&>*]:text-13"
        />
        <p className="max-w-[72ch] text-13 text-text-2">
          {t(`workbench.ranking.methodHint.${rankingMethod}`)}
        </p>
        {/* TOPSIS, EDAS, COPRAS and MARCOS have no options; SAW shows its normalization here, VIKOR its v, WASPAS and CoCoSo their λ. */}
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
            {leaders(result).length > 1
              ? t('workbench.ranking.bestTied', {
                  names: leaders(result).map((i) => alternativeName(problem, i, t)).join(', '),
                  symbol: scoreWords(rankingMethod, t).symbol,
                  value: nf.format(result.scores[best]),
                })
              : t('workbench.ranking.best', {
                  name: alternativeName(problem, best, t),
                  symbol: scoreWords(rankingMethod, t).symbol,
                  value: nf.format(result.scores[best]),
                })}
          </p>
          <div className={cn('grid grid-cols-1 items-start gap-8', !pictureShowsScores && 'xl:grid-cols-2')}>
            {!pictureShowsScores && <ScoreChart problem={problem} result={result} method={rankingMethod} className="min-w-0" />}
            {weights.value && Picture && (
              <Suspense fallback={null}>
                <Picture problem={core} weights={weights.value.weights} params={rankingParams} className="min-w-0" />
              </Suspense>
            )}
          </div>
          <section className="flex flex-col gap-3">
            <SectionTitle>
              <span id="wb-ranking-table">{t('workbench.ranking.tableTitle')}</span>
            </SectionTitle>
            <RankingTable problem={problem} result={result} method={rankingMethod} id="wb-ranking-table" />
          </section>
          <CalculationToggle groups={[{ steps: result.steps }]} problem={problem} />
        </>
      )}

      {result && <ContinueBar to="results" onContinue={() => goTo('results')} />}
    </div>
  )
}
