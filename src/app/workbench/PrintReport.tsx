import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { COMPARE_ORDER, compareRankings, getRankingMethod, rankerFor, type RankingResult, type WeightingResult } from '../../core'
import { DEFAULT_DELTAS, perturbWeights } from '../../core/robustness'
import { formatCitation, getExample } from '../../data/examples'
import { useNumberFormat } from '../../i18n'
import { runFor, toProblem, useWorkbench, type DraftProblem, type RankingMethodId } from '../../state/workbench'
import { Table, TBody, Td, Th, THead, Tr } from '../../ui'
import type { Verdict } from '../methods/views'
import { bestIndex, leaders, RankingTable } from './RankingStage'
import { heldCount } from './robustness/helpers'
import { useRobustnessSummary } from './robustnessSummary'
import { alternativeName, criterionName, DECIMALS, scoreWords } from './shared'

export type PrintReportProps = {
  problem: DraftProblem
  weights: WeightingResult
  result: RankingResult
  weightLabel: string
  rankingLabel: string
  rankingMethod: RankingMethodId
  verdict: Verdict | null
}

export function PrintReport({
  problem,
  weights,
  result,
  weightLabel,
  rankingLabel,
  rankingMethod,
  verdict,
}: PrintReportProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const exampleId = useWorkbench((s) => s.exampleId)
  const importedFrom = useWorkbench((s) => s.importedFrom ?? null)
  const methodParams = useWorkbench((s) => s.methodParams)
  const alternativeJudgements = useWorkbench((s) => s.alternativeJudgements)
  const summarizeRobustness = useRobustnessSummary()

  const coreProblem = useMemo(() => toProblem(problem), [problem])
  const altNames = useMemo(() => problem.alternatives.map((_, i) => alternativeName(problem, i, t)), [problem, t])
  const critNames = useMemo(() => problem.criteria.map((_, j) => criterionName(problem.criteria, j, t)), [problem, t])
  const score = scoreWords(rankingMethod, t)
  const best = bestIndex(result)
  const firsts = leaders(result)

  const example = exampleId ? getExample(exampleId) : undefined
  const sourceText = example
    ? `${formatCitation(example.citation)}; ${example.citation.tables[nf.lang]}`
    : importedFrom
      ? t('workbench.results.sourceFile', { name: importedFrom })
      : t('workbench.results.sourceManual')

  const headline = (() => {
    if (firsts.length > 1) {
      const leaderScores = firsts.map((i) => result.scores[i]!).filter(Number.isFinite)
      const minL = Math.min(...leaderScores)
      const maxL = Math.max(...leaderScores)
      const val = leaderScores.length > 1 && maxL - minL > 1e-9 ? `${nf.format(minL)} .. ${nf.format(maxL)}` : nf.format(result.scores[best])
      return t('workbench.results.headlineTied', {
        names: firsts.map((i) => altNames[i]).join(', '),
        symbol: score.symbol,
        value: val,
      })
    }
    return t('workbench.results.headline', {
      name: altNames[best],
      symbol: score.symbol,
      value: nf.format(result.scores[best]),
    })
  })()

  const comparison = useMemo(
    () =>
      compareRankings(
        coreProblem,
        weights.weights,
        COMPARE_ORDER.map((id) => runFor({ methodParams, alternativeJudgements }, id)),
      ),
    [coreProblem, weights.weights, methodParams, alternativeJudgements],
  )

  const robustness = useMemo(() => {
    if (!getRankingMethod(rankingMethod)) return null
    const run = runFor({ methodParams, alternativeJudgements }, rankingMethod)
    try {
      if (summarizeRobustness) return summarizeRobustness(coreProblem, weights.weights, run)
      return heldCount(perturbWeights(coreProblem, weights.weights, rankerFor(run), DEFAULT_DELTAS), weights.weights)
    } catch {
      return null
    }
  }, [summarizeRobustness, rankingMethod, methodParams, alternativeJudgements, coreProblem, weights.weights])

  const bordaLeaders = comparison.borda
    ? altNames.filter((_, i) => comparison.borda!.ranking[i] === 1).join(', ')
    : ''
  const independentCount = comparison.ranked.length - comparison.echoes.length

  return (
    <article
      aria-label={t('workbench.results.print.title')}
      className="print-only hidden flex-col gap-4 print:flex"
      data-testid="print-report"
    >
      <header className="border-b border-line pb-3">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-12 font-semibold uppercase tracking-wide text-text-2">{t('common.wordmark')}</p>
            <h1 className="text-20 font-semibold text-text">{t('workbench.results.print.title')}</h1>
          </div>
          <p className="num text-12 text-text-2">
            {t('workbench.results.about.created')}: {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-3 text-12">
          <div>
            <dt className="font-medium text-text-2">{t('workbench.results.about.source')}</dt>
            <dd className="text-text">{sourceText}</dd>
          </div>
          <div>
            <dt className="font-medium text-text-2">{t('workbench.results.about.weighting')}</dt>
            <dd className="text-text">{weightLabel}</dd>
          </div>
          <div>
            <dt className="font-medium text-text-2">{t('workbench.results.about.ranking')}</dt>
            <dd className="text-text">{rankingLabel}</dd>
          </div>
        </dl>
      </header>

      <section
        aria-label={t('workbench.results.print.verdictTitle')}
        className="rounded-control border border-line-strong bg-surface-2 px-3.5 py-2.5"
        data-testid="print-verdict"
      >
        <p className="text-16 font-semibold text-text">{headline}</p>
        {verdict && (verdict.failed.length > 0 || Boolean((verdict as { summary?: string }).summary || verdict.result)) && (
          <p className="mt-1 text-13 text-text">
            {verdict.failed.length > 0 ? (
              <>
                {verdict.failed.join(' ')} <span className="font-semibold">{verdict.result}.</span>
              </>
            ) : (
              <span className="font-semibold">{(verdict as { summary?: string }).summary ?? `${verdict.result}.`}</span>
            )}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-1.5" data-testid="print-weights-section">
        <h2 className="text-14 font-semibold text-text">{t('workbench.results.print.weightsTitle')}</h2>
        <Table density="compact" stickyHeader={false} className="w-full">
          <THead>
            <Tr>
              <Th>{t('workbench.weights.columns.criterion')}</Th>
              <Th>{t('workbench.weights.columns.direction')}</Th>
              <Th numeric>{t('workbench.weights.columns.weight')}</Th>
            </Tr>
          </THead>
          <TBody>
            {problem.criteria.map((c, j) => (
              <Tr key={j}>
                <Th scope="row">{critNames[j]}</Th>
                <Td className="text-text-2">{t(`workbench.criterionType.${c.type}`)}</Td>
                <Td numeric className="font-medium">
                  {nf.format(weights.weights[j] ?? 0, DECIMALS.weight)}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </section>

      <section className="flex flex-col gap-1.5" data-testid="print-ranking-section">
        <h2 className="text-14 font-semibold text-text">{t('workbench.results.print.rankingTitle')}</h2>
        <RankingTable problem={problem} result={result} method={rankingMethod} />
      </section>

      <section
        aria-label={t('workbench.results.print.summaryTitle')}
        className="border-t border-line pt-2.5 text-12 text-text-2"
        data-testid="print-robustness-summary"
      >
        <h2 className="text-13 font-semibold text-text">{t('workbench.results.print.summaryTitle')}</h2>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {comparison.comparable && comparison.kendallW !== null && (
            <span>{t('workbench.results.print.kendallW', { w: nf.format(comparison.kendallW, 2), count: independentCount })}</span>
          )}
          {bordaLeaders && <span>{t('workbench.results.print.bordaLeader', { name: bordaLeaders })}</span>}
          {comparison.firstPlace && (
            <span>
              {t('workbench.results.print.firstPlaceAgreement', {
                name: altNames[comparison.firstPlace.alternative],
                n: comparison.firstPlace.methods,
                of: comparison.firstPlace.of,
              })}
            </span>
          )}
          {robustness && robustness.total > 0 && (
            <span>{t('workbench.results.print.weightStability', { held: robustness.held, total: robustness.total })}</span>
          )}
        </p>
      </section>
    </article>
  )
}
