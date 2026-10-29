import { Suspense, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  COMPARE_ORDER,
  compareRankings,
  defaultPair,
  emptyJudgements,
  identicalRankings,
  pairFacts,
  type Problem,
} from '../../../core'
import { formatCitation, getExample } from '../../../data/examples'
import { ChartTableModeProvider } from '../../../features/charts'
import { RankLines, type RankLinesColumn } from '../../../features/illustrations/RankLines'
import { useNumberFormat } from '../../../i18n'
import { runFor, toProblem, useWorkbench } from '../../../state/workbench'
import { cn, Table, TBody, Td, Th, THead, Tr } from '../../../ui'
import { methodViews, viewOf } from '../../methods/views'
import { LogoMark } from '../../shell/LogoMark'
import { ECHO_NOTE_KEYS, useCompareText } from '../compare/text'
import { whySentences } from '../compare/why'
import { rankOrder, ScoreChart } from '../RankingStage'
import { alternativeName, criterionName, DECIMALS, findStep, placeIssue, scoreWords, tr } from '../shared'
import { WeightsChart } from '../WeightsStage'
import {
  catColorVar,
  CriterionProfileChart,
  HeadToHeadDeltaChart,
  MiniScoreBar,
  StabilityBandSparkbar,
} from './ReportCharts'
import { computeExecutiveMetrics } from './reportMetrics'
import type { CatSlot, ReportDocumentProps } from './types'

/** Compresses a full ranking `1..m` onto a subset of alternative indices `subset` as competition ranks `1..k`. */
function compressSubRanking(fullRanking: readonly number[], subset: readonly number[]): number[] {
  const k = subset.length
  const order = Array.from({ length: k }, (_, idx) => idx).sort(
    (a, b) => fullRanking[subset[a]!]! - fullRanking[subset[b]!]! || a - b,
  )
  const out = new Array<number>(k).fill(1)
  for (let start = 0; start < k; ) {
    let end = start
    const base = fullRanking[subset[order[start]!]!]!
    while (end + 1 < k && fullRanking[subset[order[end + 1]!]!] === base) end++
    for (let p = start; p <= end; p++) out[order[p]!] = start + 1
    start = end + 1
  }
  return out
}

export function ReportDocument({
  problem,
  weights,
  result,
  weightMethod,
  rankingMethod,
  weightLabel,
  rankingLabel,
  verdict,
  includeAppendix = false,
  comparison: providedComparison,
  metrics: providedMetrics,
}: ReportDocumentProps) {
  const { t, i18n } = useTranslation()
  const { t: tc } = useCompareText()
  const nf = useNumberFormat(DECIMALS.score)
  const formatScore = useCallback((v: number) => nf.format(v, DECIMALS.score), [nf])
  const formatWeight = useCallback((v: number) => nf.format(v, DECIMALS.weight), [nf])
  const format2 = useCallback((v: number) => nf.format(v, 2), [nf])
  const format3 = useCallback((v: number) => nf.format(v, 3), [nf])

  const exampleId = useWorkbench((s) => s.exampleId)
  const importedFrom = useWorkbench((s) => s.importedFrom ?? null)
  const methodParams = useWorkbench((s) => s.methodParams)
  const storedJudgements = useWorkbench((s) => s.judgements)
  const alternativeJudgements = useWorkbench((s) => s.alternativeJudgements)

  const coreProblem = useMemo(() => toProblem(problem), [problem])
  const weightCoreProblem = useMemo<Problem>(() => {
    if ((weightMethod === 'swara' || weightMethod === 'roc') && coreProblem.criteria.length >= 2) {
      return {
        alternatives: coreProblem.alternatives.length >= 2 ? coreProblem.alternatives : ['A1', 'A2'],
        criteria: coreProblem.criteria,
        matrix: Array.from({ length: Math.max(2, coreProblem.alternatives.length) }, () =>
          new Array<number>(coreProblem.criteria.length).fill(0),
        ),
      }
    }
    return coreProblem
  }, [coreProblem, weightMethod])

  const altNames = useMemo(() => problem.alternatives.map((_, i) => alternativeName(problem, i, t)), [problem, t])
  const critNames = useMemo(() => problem.criteria.map((_, j) => criterionName(problem.criteria, j, t)), [problem, t])
  const score = scoreWords(rankingMethod, t)
  const m = problem.alternatives.length
  const n = problem.criteria.length
  const createdDate = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const totalPagesLabel = includeAppendix ? '3+' : '2'

  const example = exampleId ? getExample(exampleId) : undefined
  const sourceText = example
    ? `${formatCitation(example.citation)}; ${example.citation.tables[nf.lang]}`
    : importedFrom
      ? t('workbench.results.sourceFile', { name: importedFrom })
      : t('workbench.results.sourceManual')

  const comparison = useMemo(
    () =>
      providedComparison ??
      compareRankings(
        coreProblem,
        weights.weights,
        COMPARE_ORDER.map((id) => runFor({ methodParams, alternativeJudgements }, id)),
      ),
    [providedComparison, coreProblem, weights.weights, methodParams, alternativeJudgements],
  )

  const metrics = useMemo(
    () =>
      providedMetrics ??
      computeExecutiveMetrics({
        problem: coreProblem,
        weights,
        result,
        weightMethod,
        rankingMethod,
        methodParams,
        judgements: storedJudgements,
        alternativeJudgements,
      }),
    [
      providedMetrics,
      coreProblem,
      weights,
      result,
      weightMethod,
      rankingMethod,
      methodParams,
      storedJudgements,
      alternativeJudgements,
    ],
  )

  const { winner } = metrics
  const isCompromise = Boolean((verdict && verdict.failed.length > 0) || winner.leaders.length > 1)

  const headline = (() => {
    if (winner.leaders.length > 1) {
      const leaderScores = winner.leaders.map((i) => result.scores[i]!).filter(Number.isFinite)
      const minL = Math.min(...leaderScores)
      const maxL = Math.max(...leaderScores)
      const val =
        leaderScores.length > 1 && maxL - minL > 1e-9
          ? `${nf.format(minL)} .. ${nf.format(maxL)}`
          : nf.format(winner.bestScore)
      return t('workbench.results.headlineTied', {
        names: winner.leaders.map((i) => altNames[i]).join(', '),
        symbol: score.symbol,
        value: val,
      })
    }
    return t('workbench.results.headline', {
      name: altNames[winner.bestIndex],
      symbol: score.symbol,
      value: nf.format(winner.bestScore),
    })
  })()

  // Up to 2 method-specific columns on Page 1 Leaderboard so the 7-column panel stays uncluttered.
  const rankingView = methodViews[rankingMethod]
  const allRankingExtra = useMemo(
    () => (rankingView.columns ?? []).map((c) => ({ ...c, values: findStep(result.steps, c.step)?.vector })),
    [rankingView.columns, result.steps],
  )
  const page1Extra = allRankingExtra.slice(0, 2)
  const page1Before = page1Extra.filter((c) => !c.after)
  const page1After = page1Extra.filter((c) => c.after)
  const fullBefore = allRankingExtra.filter((c) => !c.after)
  const fullAfter = allRankingExtra.filter((c) => c.after)

  const weightView = methodViews[weightMethod]
  const allWeightExtra = useMemo(
    () => (weightView.columns ?? []).map((c) => ({ ...c, values: findStep(weights.steps, c.step)?.vector })),
    [weightView.columns, weights.steps],
  )

  const fullRankOrder = useMemo(() => rankOrder(result), [result])
  const page1RankOrder = useMemo(() => fullRankOrder.slice(0, 8), [fullRankOrder])

  // Map criterion index -> categorical colour slot on Page 1 so the weights table matches the stacked profile legend.
  const catSlotByCol = useMemo(() => {
    const map = new Map<number, CatSlot>()
    for (const item of metrics.profileLegend) {
      if (typeof item.col === 'number') map.set(item.col, item.catSlot)
    }
    return map
  }, [metrics.profileLegend])

  const bordaLeaders = comparison.borda
    ? altNames.filter((_, i) => comparison.borda!.ranking[i] === 1).join(', ')
    : ''
  const independentCount = comparison.ranked.length - comparison.echoes.length

  const RankingPicture = rankingView.stage?.Component
  const WeightingPicture = weightView.stage?.Component
  const rankingParams = methodParams?.[rankingMethod] ?? {}
  const weightParams = methodParams?.[weightMethod] ?? {}
  const judgements =
    storedJudgements && storedJudgements.pairs.length === n ? storedJudgements : emptyJudgements(n)

  const rankingConstants = useMemo(
    () =>
      (rankingView.constants ?? [])
        .map((c) => {
          const v = findStep(result.steps, c.step)?.scalar
          return typeof v === 'number' && Number.isFinite(v) ? `${c.symbol} = ${nf.format(v)}` : null
        })
        .filter((s): s is string => s !== null),
    [rankingView.constants, result.steps, nf],
  )

  // Top-10 RankLines projection for Page 2.
  const rankLinesSubset = useMemo(() => {
    if (comparison.borda) {
      return Array.from({ length: m }, (_, i) => i)
        .sort((a, b) => comparison.borda!.ranking[a]! - comparison.borda!.ranking[b]! || a - b)
        .slice(0, 10)
    }
    return fullRankOrder.slice(0, 10)
  }, [comparison.borda, m, fullRankOrder])

  const rankLinesColumns = useMemo<RankLinesColumn[]>(() => {
    const isSub = rankLinesSubset.length < m
    return comparison.runs.map((r) => {
      const label = tr(t, `workbench.rankingMethod.${r.methodId}`)
      if (!r.result) {
        const issue = r.issues.find((x) => x.severity === 'error')
        return {
          methodId: r.methodId,
          label,
          ranking: null,
          reason: issue && placeIssue(issue, problem, t, nf.format).message,
        }
      }
      const ranking = isSub ? compressSubRanking(r.result.ranking, rankLinesSubset) : r.result.ranking
      const set = viewOf(r.methodId)?.verdict?.(r.result, altNames, t, nf.format)?.set ?? []
      const note = set.length > 1 ? tc('vikorNote', { list: set.map((i) => altNames[i]).join(', ') }) : undefined
      return { methodId: r.methodId, label, ranking, note }
    })
  }, [comparison.runs, rankLinesSubset, m, t, tc, problem, nf.format, altNames])

  const rankLinesBorda = useMemo(() => {
    if (!comparison.borda) return null
    return rankLinesSubset.length < m
      ? compressSubRanking(comparison.borda.ranking, rankLinesSubset)
      : comparison.borda.ranking
  }, [comparison.borda, rankLinesSubset, m])

  const rankLinesSelected = useMemo<[number, number] | null>(() => {
    if (!comparison.comparable || m < 2) return null
    const pair = defaultPair(comparison)
    if (!pair) return rankLinesSubset.length >= 2 ? [0, 1] : null
    const ia = rankLinesSubset.indexOf(pair[0])
    const ib = rankLinesSubset.indexOf(pair[1])
    if (ia >= 0 && ib >= 0 && ia !== ib) return [ia, ib]
    return rankLinesSubset.length >= 2 ? [0, 1] : null
  }, [comparison, m, rankLinesSubset])

  const synthesisSentences = useMemo(() => {
    if (!comparison.comparable || m < 2) return []
    const pair = defaultPair(comparison)
    if (!pair) return []
    const facts = pairFacts(coreProblem, weights.weights, comparison, pair[0], pair[1])
    let hasCrossings = false
    const rs = comparison.runs.flatMap((r) => (r.result ? [r.result.ranking] : []))
    outer: for (let p = 0; p < m; p++) {
      for (let q = p + 1; q < m; q++) {
        let aWins = false
        let bWins = false
        for (const r of rs) {
          if (r[p]! < r[q]!) aWins = true
          else if (r[p]! > r[q]!) bWins = true
          if (aWins && bWins) {
            hasCrossings = true
            break outer
          }
        }
      }
    }
    return whySentences(facts, {
      names: altNames,
      criteria: critNames,
      methodLabel: (id) => tr(t, `workbench.rankingMethod.${id}`),
      t: tc,
      lang: i18n.language,
      identical: identicalRankings(comparison),
      hasCrossings,
    }).slice(0, 3)
  }, [comparison, m, coreProblem, weights.weights, altNames, critNames, t, tc, i18n.language])

  const warningItems = useMemo(() => {
    const raw = [...(weights.warnings ?? []), ...(result.warnings ?? [])]
    return raw.map((w) => {
      const code = w.code === 'ahp.inconsistent' && w.col !== undefined ? 'ahp.inconsistent-criterion' : w.code
      return tr(t, `warnings.${code}`, {
        alternative: w.row !== undefined ? alternativeName(problem, w.row, t) : '',
        criterion: w.col !== undefined ? criterionName(problem.criteria, w.col, t) : '',
        ...(w.extra ?? {}),
      })
    })
  }, [weights.warnings, result.warnings, problem, t])

  const listFmt = useMemo(
    () => new Intl.ListFormat(nf.lang === 'tr' ? 'tr' : 'en-GB', { type: 'conjunction' }),
    [nf.lang],
  )

  return (
    <div className="flex flex-col gap-6 print:block print:gap-0">
      {/* ==================== PAGE 1: EXECUTIVE DECISION BRIEF ==================== */}
      <section
        aria-label={t('workbench.results.print.page1Badge', { total: totalPagesLabel })}
        className="report-sheet flex flex-col gap-2.5"
        data-testid="report-page-1"
      >
        <header className="border-b border-line pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <LogoMark size={26} className="shrink-0 text-accent" />
              <div>
                <p className="text-[10px] leading-[13px] font-semibold tracking-wider text-text-2 uppercase">
                  {t('common.wordmark')}
                </p>
                <h1 className="text-[18px] leading-[23px] font-semibold text-text">
                  {t('workbench.results.print.title')}
                </h1>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              <span className="inline-flex items-center rounded-control border border-line-strong bg-surface-2 px-1.5 py-0.5 text-[10px] leading-[13px] font-medium text-text-2">
                {t('workbench.results.print.page1Badge', { total: totalPagesLabel })}
              </span>
              <p className="num text-[11px] leading-[15px] text-text-2">
                {createdDate} · {t('workbench.results.print.problemSize', { m, n })}
              </p>
            </div>
          </div>

          <dl className="mt-2 grid grid-cols-12 gap-2 border-t border-line pt-1.5 text-[11px] leading-[14px]">
            <div className="col-span-5 min-w-0">
              <dt className="font-medium text-text-3">{t('workbench.results.about.source')}</dt>
              <dd className="truncate text-text" title={sourceText}>
                {sourceText}
              </dd>
            </div>
            <div className="col-span-3 min-w-0">
              <dt className="font-medium text-text-3">{t('workbench.results.about.weighting')}</dt>
              <dd className="truncate font-medium text-text" title={weightLabel}>
                {weightLabel}
              </dd>
            </div>
            <div className="col-span-4 min-w-0">
              <dt className="font-medium text-text-3">{t('workbench.results.about.ranking')}</dt>
              <dd className="truncate font-medium text-text" title={rankingLabel}>
                {rankingLabel}
              </dd>
            </div>
          </dl>
        </header>

        {/* Answer-first Verdict Banner */}
        <section
          aria-label={t('workbench.results.print.verdictTitle')}
          className={cn(
            'rounded-control border border-line border-l-[3px] px-3 py-2',
            isCompromise
              ? 'border-l-warning bg-warning-bg'
              : 'border-l-accent bg-accent-bg',
          )}
          data-testid="print-verdict"
          data-tone={isCompromise ? 'compromise' : 'clear'}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span
              className={cn(
                'text-[10px] leading-[13px] font-semibold tracking-wider uppercase',
                isCompromise ? 'text-warning' : 'text-accent',
              )}
            >
              {isCompromise
                ? t('workbench.results.print.verdictCompromise')
                : t('workbench.results.print.verdictClear')}
            </span>
            {comparison.firstPlace && (
              <span className="num text-[11px] leading-[14px] text-text-2">
                {t('workbench.results.print.firstPlaceAgreement', {
                  name: altNames[comparison.firstPlace.alternative],
                  n: comparison.firstPlace.methods,
                  of: comparison.firstPlace.of,
                })}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[15px] leading-[20px] font-semibold text-text">{headline}</p>
          {verdict && (verdict.failed.length > 0 || Boolean((verdict as { summary?: string }).summary || verdict.result)) && (
            <p className="mt-0.5 text-[11.5px] leading-[15px] text-text">
              {verdict.failed.length > 0 ? (
                <>
                  {verdict.failed.join(' ')} <span className="font-semibold">{verdict.result}.</span>
                </>
              ) : (
                <span className="font-semibold">
                  {(verdict as { summary?: string }).summary ?? `${verdict.result}.`}
                </span>
              )}
            </p>
          )}
        </section>

        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-4 gap-2" data-testid="report-kpi-grid">
          {/* KPI 1: Winner & Margin */}
          <div className="flex min-w-0 flex-col justify-between rounded-control border border-line bg-surface-2/55 px-2.5 py-1.5">
            <p className="text-[10px] leading-[13px] font-semibold tracking-wide text-text-2 uppercase">
              {t('workbench.results.print.kpiWinner')}
            </p>
            <p className="mt-0.5 truncate text-[13px] leading-[17px] font-semibold text-text">
              {winner.leaders.map((i) => altNames[i]).join(', ')}
            </p>
            <p className="num mt-0.5 text-[10.5px] leading-[14px] text-text-2">
              {winner.leaders.length > 1
                ? t('workbench.results.print.kpiMarginTied', { count: winner.leaders.length })
                : winner.runnerUpIndex !== null && winner.rawMargin !== null
                  ? winner.relativeMarginPct !== null
                    ? t('workbench.results.print.kpiMargin', {
                        name: altNames[winner.runnerUpIndex],
                        raw: formatScore(winner.rawMargin),
                        pct: nf.format(winner.relativeMarginPct, 1),
                      })
                    : t('workbench.results.print.kpiMarginRawOnly', {
                        name: altNames[winner.runnerUpIndex],
                        raw: formatScore(winner.rawMargin),
                      })
                  : `${score.symbol} = ${formatScore(winner.bestScore)}`}
            </p>
          </div>

          {/* KPI 2: #1 vs #2 Key Trade-off */}
          <div className="flex min-w-0 flex-col justify-between rounded-control border border-line bg-surface-2/55 px-2.5 py-1.5">
            <p className="text-[10px] leading-[13px] font-semibold tracking-wide text-text-2 uppercase">
              {t('workbench.results.print.kpiTradeoff')}
            </p>
            {metrics.headToHeadPair ? (
              <>
                <p className="num mt-0.5 text-[10.5px] leading-[13.5px] font-medium break-words text-accent">
                  {metrics.topAdvantageA
                    ? t('workbench.results.print.kpiTradeoffGain', {
                        criterion: critNames[metrics.topAdvantageA.col],
                        delta: format3(metrics.topAdvantageA.delta),
                      })
                    : t('workbench.results.print.kpiTradeoffEqual', {
                        name: altNames[metrics.headToHeadPair[1]],
                      })}
                </p>
                <p className="num mt-0.5 text-[10px] leading-[13px] break-words text-text-2">
                  {metrics.topAdvantageB
                    ? t('workbench.results.print.kpiTradeoffLoss', {
                        criterion: critNames[metrics.topAdvantageB.col],
                        delta: format3(metrics.topAdvantageB.delta),
                      })
                    : t('workbench.results.print.kpiTradeoffDominates', {
                        name: altNames[metrics.headToHeadPair[1]],
                      })}
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-[11px] text-text-2">-</p>
            )}
          </div>

          {/* KPI 3: Cross-Method Consensus */}
          <div className="flex min-w-0 flex-col justify-between rounded-control border border-line bg-surface-2/55 px-2.5 py-1.5">
            <p className="text-[10px] leading-[13px] font-semibold tracking-wide text-text-2 uppercase">
              {t('workbench.results.print.kpiConsensus')}
            </p>
            <p className="num mt-0.5 text-[13px] leading-[17px] font-semibold text-text">
              {comparison.firstPlace
                ? t('workbench.results.print.kpiConsensusValue', {
                    n: comparison.firstPlace.methods,
                    of: comparison.firstPlace.of,
                  })
                : t('workbench.results.print.kpiConsensusSingle')}
            </p>
            <p className="num mt-0.5 text-[10px] leading-[13.5px] break-words text-text-2">
              {comparison.comparable && comparison.kendallW !== null
                ? `W = ${format2(comparison.kendallW)}${bordaLeaders ? ` · Borda: ${bordaLeaders}` : ''}`
                : bordaLeaders
                  ? `Borda: ${bordaLeaders}`
                  : '-'}
            </p>
          </div>

          {/* KPI 4: Weight Stability */}
          <div className="flex min-w-0 flex-col justify-between rounded-control border border-line bg-surface-2/55 px-2.5 py-1.5">
            <p className="text-[10px] leading-[13px] font-semibold tracking-wide text-text-2 uppercase">
              {t('workbench.results.print.kpiStability')}
            </p>
            <p className="num mt-0.5 text-[13px] leading-[17px] font-semibold text-text">
              {metrics.perturbationGrid.total > 0
                ? t('workbench.results.print.kpiStabilityHeld', {
                    held: metrics.perturbationGrid.held,
                    total: metrics.perturbationGrid.total,
                  })
                : '-'}
            </p>
            <p className="num mt-0.5 text-[10px] leading-[13.5px] break-words text-text-2">
              {metrics.criticalCriterion
                ? t('workbench.results.print.kpiStabilityCritical', {
                    criterion: critNames[metrics.criticalCriterion.col],
                    from: format2(metrics.criticalCriterion.from),
                    to: format2(metrics.criticalCriterion.to),
                  })
                : metrics.allSweepStable
                  ? t('workbench.results.print.kpiStabilityUnconditional')
                  : '-'}
            </p>
          </div>
        </div>

        {/* 7:5 Two-Column Visual Body */}
        <div className="grid grid-cols-12 items-start gap-3">
          {/* LEFT (7 cols): Leaderboard + Criterion Profile Stacked Bar */}
          <div className="col-span-7 flex min-w-0 flex-col gap-2.5">
            <section className="flex flex-col gap-1" data-testid="print-ranking-section">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[12px] leading-[16px] font-semibold text-text">
                  {t('workbench.results.print.leaderboardTitle')}
                </h2>
                {metrics.truncatedAlternatives > 0 && (
                  <span className="num text-[10px] leading-[13px] text-text-3">
                    {t('workbench.results.print.topRowsNote', { shown: page1RankOrder.length, total: m })}
                  </span>
                )}
              </div>
              <div className="rounded-control border border-line">
                <table className="w-full border-collapse text-[11px] leading-[15px]">
                  <thead>
                    <tr className="border-b border-line bg-surface-2 text-text-2">
                      <th scope="col" className="w-8 px-1.5 py-1 text-right font-medium">
                        {t('workbench.ranking.columns.rank')}
                      </th>
                      <th scope="col" className="px-2 py-1 text-left font-medium">
                        {t('workbench.alternative')}
                      </th>
                      {page1Before.map((c) => (
                        <th key={c.step} scope="col" className="px-1.5 py-1 text-right font-medium">
                          {tr(t, c.label)}
                        </th>
                      ))}
                      <th scope="col" className="px-2 py-1 text-right font-medium">
                        {`${score.name} (${score.symbol})`}
                      </th>
                      {page1After.map((c) => (
                        <th key={c.step} scope="col" className="px-1.5 py-1 text-right font-medium">
                          {tr(t, c.label)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page1RankOrder.map((i) => {
                      const rk = result.ranking[i]!
                      const first = rk === 1
                      return (
                        <tr
                          key={i}
                          className={cn(
                            'border-b border-line last:border-b-0',
                            first && 'bg-accent-bg/45',
                          )}
                        >
                          <td className="num px-1.5 py-1 text-right">
                            <span
                              className={cn(
                                'inline-flex min-w-4 items-center justify-center rounded-control px-1 text-[10.5px] leading-[14px]',
                                first
                                  ? 'bg-accent font-semibold text-accent-fg'
                                  : rk <= 3
                                    ? 'font-semibold text-text'
                                    : 'text-text-3',
                              )}
                            >
                              {rk}
                            </span>
                          </td>
                          <th
                            scope="row"
                            className={cn('max-w-[130px] truncate px-2 py-1 text-left', first ? 'font-semibold text-text' : 'font-normal text-text')}
                          >
                            {altNames[i]}
                          </th>
                          {page1Before.map((c) => (
                            <td key={c.step} className="num px-1.5 py-1 text-right font-mono text-[10.5px] text-text-2">
                              {nf.format(c.values?.[i], c.decimals)}
                            </td>
                          ))}
                          <td className="num px-2 py-1 text-right">
                            <span className="inline-flex items-center justify-end gap-1.5">
                              <MiniScoreBar
                                value={result.scores[i] ?? 0}
                                scores={result.scores}
                                order={result.order}
                                isLeader={first}
                              />
                              <span className={cn('font-mono text-[11px]', first ? 'font-semibold text-text' : 'font-medium text-text')}>
                                {formatScore(result.scores[i] ?? 0)}
                              </span>
                            </span>
                          </td>
                          {page1After.map((c) => (
                            <td key={c.step} className="num px-1.5 py-1 text-right font-mono text-[10.5px] text-text-2">
                              {nf.format(c.values?.[i], c.decimals)}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Criterion Profile Stacked Bar SVG */}
            <section className="flex flex-col gap-1 rounded-control border border-line p-2" data-testid="report-profile-section">
              <div className="flex flex-col">
                <h2 className="text-[12px] leading-[15px] font-semibold text-text">
                  {t('workbench.results.print.profileTitle')}
                </h2>
                <p className="text-[10px] leading-[13px] text-text-3">
                  {t('workbench.results.print.profileCaption')}
                </p>
              </div>
              <CriterionProfileChart
                rows={metrics.criterionProfiles}
                legend={metrics.profileLegend}
                altNames={altNames}
                criterionLabel={(col, restCount) =>
                  col === 'others'
                    ? t('workbench.results.print.othersCount', { count: restCount ?? 0 })
                    : (critNames[col] ?? '')
                }
                formatValue={format3}
                ariaLabel={t('workbench.results.print.profileTitle')}
              />
            </section>
          </div>

          {/* RIGHT (5 cols): Head-to-Head Tornado + Criteria Weights & Stability Band Table */}
          <div className="col-span-5 flex min-w-0 flex-col gap-2.5">
            {metrics.headToHeadPair && (
              <section className="flex flex-col gap-1 rounded-control border border-line p-2" data-testid="report-head-to-head-section">
                <div className="flex flex-col">
                  <h2 className="text-[12px] leading-[15px] font-semibold text-text">
                    {t('workbench.results.print.headToHeadTitle', {
                      a: altNames[metrics.headToHeadPair[0]],
                      b: altNames[metrics.headToHeadPair[1]],
                    })}
                  </h2>
                  <p className="text-[10px] leading-[13px] text-text-3">
                    {t('workbench.results.print.headToHeadCaption', {
                      a: altNames[metrics.headToHeadPair[0]],
                      b: altNames[metrics.headToHeadPair[1]],
                    })}
                  </p>
                </div>
                <HeadToHeadDeltaChart
                  items={metrics.headToHeadDeltas}
                  pairNames={[altNames[metrics.headToHeadPair[0]]!, altNames[metrics.headToHeadPair[1]]!]}
                  critNames={critNames}
                  formatDelta={(v) => `${v > 0 ? '+' : ''}${format3(v)}`}
                  emptyText={t('workbench.results.print.headToHeadEqual')}
                  ariaLabel={t('workbench.results.print.headToHeadTitle', {
                    a: altNames[metrics.headToHeadPair[0]],
                    b: altNames[metrics.headToHeadPair[1]],
                  })}
                />
              </section>
            )}

            <section className="flex flex-col gap-1" data-testid="print-weights-section">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[12px] leading-[16px] font-semibold text-text">
                  {t('workbench.results.print.stabilityTableTitle')}
                </h2>
                {metrics.truncatedStabilityCriteria > 0 && (
                  <span className="num text-[10px] leading-[13px] text-text-3">
                    {t('workbench.results.print.topRowsNote', {
                      shown: metrics.criterionStability.length,
                      total: n,
                    })}
                  </span>
                )}
              </div>
              <div className="overflow-hidden rounded-control border border-line">
                <table className="w-full border-collapse text-[10px] leading-[15px]">
                  <thead>
                    <tr className="border-b border-line bg-surface-2 text-text-2">
                      <th scope="col" className="px-1.5 py-1 text-left font-medium">
                        {t('workbench.weights.columns.criterion')}
                      </th>
                      <th scope="col" className="w-5 px-0.5 py-1 text-center font-medium">
                        {t('workbench.weights.columns.direction')}
                      </th>
                      <th
                        scope="col"
                        className="px-1 py-1 text-right font-mono font-medium whitespace-nowrap"
                        title={t('workbench.weights.columns.weight')}
                      >
                        w
                      </th>
                      <th scope="col" className="px-1.5 py-1 text-right font-medium whitespace-nowrap">
                        {t('workbench.results.print.safeRangeCol')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.criterionStability.map((item, idx) => {
                      const slot = catSlotByCol.get(item.col) ?? 'other'
                      const isCritical = metrics.criticalCriterion?.col === item.col
                      return (
                        <tr
                          key={item.col}
                          className={cn(
                            'border-b border-line last:border-b-0',
                            idx === 0 && 'bg-surface-2/40',
                          )}
                        >
                          <th scope="row" className="max-w-[78px] overflow-hidden px-1.5 py-1 text-left font-medium text-text">
                            <span className="flex min-w-0 items-center gap-1">
                              <span
                                aria-hidden
                                className="inline-block h-2 w-2 shrink-0 rounded-control"
                                style={{ background: catColorVar(slot) }}
                              />
                              <span className="truncate">{critNames[item.col]}</span>
                            </span>
                          </th>
                          <td className="px-0.5 py-1 text-center text-text-2" title={t(`workbench.criterionType.${item.type}`)}>
                            {item.type === 'benefit' ? '↑' : '↓'}
                          </td>
                          <td className="num px-1 py-1 text-right font-mono text-[10px] font-medium whitespace-nowrap text-text">
                            {formatWeight(item.weight)}
                          </td>
                          <td className="num px-1.5 py-1 text-right whitespace-nowrap">
                            <span className="inline-flex items-center justify-end gap-1">
                              <StabilityBandSparkbar
                                weight={item.weight}
                                interval={item.interval}
                                ariaLabel={`${critNames[item.col]} ${t('workbench.results.print.safeRangeCol')}`}
                              />
                              <span
                                className={cn(
                                  'text-right font-mono text-[9.5px] whitespace-nowrap',
                                  isCritical ? 'font-semibold text-warning' : 'text-text-2',
                                )}
                              >
                                {item.interval
                                  ? `[${format2(item.interval.from)}, ${format2(item.interval.to)}]`
                                  : '-'}
                              </span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        <footer className="mt-auto flex items-center justify-between border-t border-line pt-1.5 text-[10px] leading-[13px] text-text-3">
          <span>
            {t('common.wordmark')} · {t('workbench.results.about.precisionNote')}
          </span>
          <span className="num">1 / {totalPagesLabel}</span>
        </footer>
      </section>

      {/* ==================== PAGE 2: METHOD & ROBUSTNESS DASHBOARD ==================== */}
      <ChartTableModeProvider value="screen-reader">
        <section
          aria-label={t('workbench.results.print.page2Badge', { total: totalPagesLabel })}
          className="report-sheet flex flex-col gap-2.5"
          data-testid="report-page-2"
        >
          {/* Compact running header */}
          <header className="flex items-center justify-between gap-4 border-b border-line pb-1.5">
            <div className="flex items-center gap-2">
              <LogoMark size={18} className="shrink-0 text-accent" />
              <span className="text-[11px] leading-[15px] font-semibold text-text">
                {t('common.wordmark')}
              </span>
              <span className="text-[11px] text-text-3">·</span>
              <span className="truncate text-[11px] leading-[15px] text-text-2">
                {weightLabel} + {rankingLabel}
              </span>
            </div>
            <span className="inline-flex items-center rounded-control border border-line-strong bg-surface-2 px-1.5 py-0.5 text-[10px] leading-[13px] font-medium text-text-2">
              {t('workbench.results.print.page2Badge', { total: totalPagesLabel })}
            </span>
          </header>

          {/* Top 2-Column Method Mechanics Grid */}
          <div className="grid grid-cols-2 gap-3" data-testid="report-method-mechanics">
            {/* Ranking Method Stage Panel */}
            <section className="flex max-h-[68mm] min-w-0 flex-col gap-1.5 overflow-hidden rounded-control border border-line p-2.5">
              <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1">
                <h2 className="truncate text-[11.5px] leading-[15px] font-semibold text-text">
                  {t('workbench.results.print.rankingMechanicsTitle', { method: rankingLabel })}
                </h2>
                {rankingConstants.length > 0 && (
                  <span className="num shrink-0 font-mono text-[10px] text-text-2">
                    {rankingConstants.join(', ')}
                  </span>
                )}
              </div>
              <div className="report-stage-slot min-h-0 flex-1 overflow-hidden" data-slot="ranking">
                {RankingPicture ? (
                  <Suspense fallback={<ScoreChart problem={problem} result={result} method={rankingMethod} />}>
                    <RankingPicture
                      problem={coreProblem}
                      weights={weights.weights}
                      params={rankingParams}
                      {...(alternativeJudgements ? { alternativeJudgements } : {})}
                    />
                  </Suspense>
                ) : (
                  <ScoreChart problem={problem} result={result} method={rankingMethod} />
                )}
              </div>
            </section>

            {/* Weighting Method Stage Panel */}
            <section className="flex max-h-[68mm] min-w-0 flex-col gap-1.5 overflow-hidden rounded-control border border-line p-2.5">
              <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1">
                <h2 className="truncate text-[11.5px] leading-[15px] font-semibold text-text">
                  {t('workbench.results.print.weightingMechanicsTitle', { method: weightLabel })}
                </h2>
                {metrics.weightDiagnostics.kind === 'ahp' && metrics.weightDiagnostics.cr !== null && (
                  <span
                    className={cn(
                      'shrink-0 rounded-control px-1.5 py-0.5 text-[10px] leading-[12px] font-semibold',
                      metrics.weightDiagnostics.inconsistent
                        ? 'bg-warning-bg text-warning'
                        : 'bg-ok-bg text-ok',
                    )}
                  >
                    {metrics.weightDiagnostics.inconsistent
                      ? t('workbench.results.print.consistencyReview')
                      : t('workbench.results.print.consistencyOk')}
                  </span>
                )}
                {metrics.weightDiagnostics.kind === 'bwm' && metrics.weightDiagnostics.crInput !== null && (
                  <span
                    className={cn(
                      'shrink-0 rounded-control px-1.5 py-0.5 text-[10px] leading-[12px] font-semibold',
                      metrics.weightDiagnostics.inconsistent
                        ? 'bg-warning-bg text-warning'
                        : 'bg-ok-bg text-ok',
                    )}
                  >
                    {metrics.weightDiagnostics.inconsistent
                      ? t('workbench.results.print.consistencyReview')
                      : t('workbench.results.print.consistencyOk')}
                  </span>
                )}
              </div>

              <div className="report-stage-slot min-h-0 flex-1 overflow-hidden" data-slot="weighting">
                {WeightingPicture ? (
                  <Suspense fallback={<WeightsChart names={critNames} weights={weights.weights} format={formatWeight} />}>
                    <WeightingPicture
                      problem={weightCoreProblem}
                      weights={weights.weights}
                      params={weightParams}
                      judgements={judgements}
                    />
                  </Suspense>
                ) : (
                  <WeightsChart names={critNames} weights={weights.weights} format={formatWeight} />
                )}
              </div>

              {/* Weight Diagnostics Strip */}
              {metrics.weightDiagnostics.kind === 'ahp' && metrics.weightDiagnostics.lambdaMax !== null && (
                <div className="num border-t border-line pt-1 text-[10px] leading-[13px] text-text-2">
                  <p>
                    {t('workbench.results.print.ahpDiagnostics', {
                      lambda: format3(metrics.weightDiagnostics.lambdaMax),
                      ci: format3(metrics.weightDiagnostics.ci ?? 0),
                      cr: format3(metrics.weightDiagnostics.cr ?? 0),
                      threshold: format2(metrics.weightDiagnostics.threshold ?? 0.1),
                    })}
                  </p>
                  {metrics.weightDiagnostics.worstPair && (
                    <p className="truncate text-text">
                      {t('workbench.results.print.ahpWorstPair', {
                        a: critNames[metrics.weightDiagnostics.worstPair.i],
                        b: critNames[metrics.weightDiagnostics.worstPair.k],
                        actual: format2(metrics.weightDiagnostics.worstPair.actual),
                        suggested: format2(metrics.weightDiagnostics.worstPair.suggested),
                      })}
                    </p>
                  )}
                </div>
              )}

              {metrics.weightDiagnostics.kind === 'bwm' && (
                <div className="num border-t border-line pt-1 text-[10px] leading-[13px] text-text-2">
                  <p className="truncate">
                    {t('workbench.results.print.bwmDiagnostics', {
                      best: metrics.weightDiagnostics.best !== null ? critNames[metrics.weightDiagnostics.best] : '-',
                      worst: metrics.weightDiagnostics.worst !== null ? critNames[metrics.weightDiagnostics.worst] : '-',
                      xi: metrics.weightDiagnostics.xi !== null ? format3(metrics.weightDiagnostics.xi) : '-',
                      cr: metrics.weightDiagnostics.crInput !== null ? format3(metrics.weightDiagnostics.crInput) : '-',
                      threshold:
                        metrics.weightDiagnostics.threshold !== null ? format3(metrics.weightDiagnostics.threshold) : '-',
                    })}
                  </p>
                </div>
              )}

              {metrics.weightDiagnostics.kind === 'columns' && metrics.weightDiagnostics.columns.length > 0 && (
                <div className="num flex flex-wrap gap-x-3 gap-y-0.5 border-t border-line pt-1 text-[10px] leading-[13px] text-text-2">
                  {metrics.weightDiagnostics.columns.slice(0, 2).map((col) => (
                    <span key={col.step} className="truncate">
                      <span className="font-medium text-text">{tr(t, col.label)}:</span>{' '}
                      {metrics.criteriaByWeight
                        .slice(0, 3)
                        .map((j) => `${critNames[j]} ${nf.format(col.values[j], col.decimals ?? 3)}`)
                        .join(', ')}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Middle Cross-Method RankLines Band */}
          {comparison.comparable && (
            <section className="flex max-h-[78mm] flex-col gap-1 overflow-hidden rounded-control border border-line p-2.5" data-testid="report-ranklines-section">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[11.5px] leading-[15px] font-semibold text-text">
                    {t('workbench.results.print.rankLinesTitle')}
                  </h2>
                  {rankLinesSubset.length < m && (
                    <span className="num text-[10px] text-text-3">
                      {t('workbench.results.print.rankLinesTopNote', { shown: rankLinesSubset.length, total: m })}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {comparison.echoes.slice(0, 3).map((e) => {
                    const noteKey = `${e.methodId}_${e.of}`
                    const note = ECHO_NOTE_KEYS.has(noteKey) ? tc(`echoNote.${noteKey}` as 'onlyOneRanking') : undefined
                    return (
                      <span
                        key={e.methodId}
                        title={note}
                        className="inline-flex items-center rounded-control border border-line bg-surface-2 px-1.5 py-0.5 text-[9.5px] leading-[12px] font-medium text-text-2"
                      >
                        {tc('echo', {
                          method: tr(t, `workbench.rankingMethod.${e.methodId}`),
                          of:
                            e.of === 'saw'
                              ? tc(e.methodId === 'ahp-ranking' || e.methodId === 'copras' ? 'sawSum' : 'sawLinear')
                              : tr(t, `workbench.rankingMethod.${e.of}`),
                        })}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="report-ranklines-slot min-h-0 flex-1 overflow-hidden">
                <RankLines
                  columns={rankLinesColumns}
                  borda={rankLinesBorda}
                  names={rankLinesSubset.map((i) => altNames[i]!)}
                  selected={rankLinesSelected}
                  onSelectPair={() => {}}
                  labels={{
                    title: t('workbench.results.print.rankLinesTitle'),
                    showTable: t('workbench.chart.showTable'),
                    alternative: t('workbench.alternative'),
                    borda: tc('chart.borda'),
                    notRanked: tc('chart.notRanked'),
                    crossing: (a, b, from, to) => tc('chart.crossing', { a, b, from, to }),
                  }}
                />
              </div>
            </section>
          )}

          {/* Bottom 2-Column Robustness & Automated KDS Synthesis */}
          <section
            aria-label={t('workbench.results.print.summaryTitle')}
            className="grid grid-cols-12 gap-3"
            data-testid="print-robustness-summary"
          >
            {/* Left (7 cols): Weight Perturbation Grid + Agreement Metrics */}
            <div className="col-span-7 flex min-w-0 flex-col gap-1.5 rounded-control border border-line p-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[11.5px] leading-[15px] font-semibold text-text">
                  {t('workbench.results.print.perturbTitle')}
                </h2>
                {metrics.perturbationGrid.truncatedCriteria > 0 && (
                  <span className="num text-[10px] text-text-3">
                    {t('workbench.results.print.topRowsNote', {
                      shown: metrics.perturbationGrid.rows.length,
                      total: n,
                    })}
                  </span>
                )}
              </div>

              {metrics.perturbationGrid.rows.length > 0 && (
                <div className="rounded-control border border-line">
                  <table className="w-full border-collapse text-[10px] leading-[14px]">
                    <thead>
                      <tr className="border-b border-line bg-surface-2 text-text-2">
                        <th scope="col" className="px-1.5 py-1 text-left font-medium">
                          {t('workbench.weights.columns.criterion')}
                        </th>
                        <th scope="col" className="px-1 py-1 text-right font-medium">
                          w
                        </th>
                        {metrics.perturbationGrid.deltas.map((d) => (
                          <th key={d} scope="col" className="num px-1 py-1 text-center font-mono font-medium">
                            {d > 0 ? `+${Math.round(d * 100)}%` : `${Math.round(d * 100)}%`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.perturbationGrid.rows.map((row) => (
                        <tr key={row.col} className="border-b border-line last:border-b-0">
                          <th scope="row" className="max-w-[92px] truncate px-1.5 py-0.5 text-left font-medium text-text">
                            {critNames[row.col]}
                          </th>
                          <td className="num px-1 py-0.5 text-right font-mono text-text-2">
                            {format2(row.weight)}
                          </td>
                          {row.cells.map((cell) => {
                            const leaderLabel =
                              cell.topAlt !== null
                                ? `${altNames[cell.topAlt]}${cell.tiedCount > 1 ? '+' : ''}`
                                : '-'
                            return (
                              <td key={cell.delta} className="px-0.5 py-0.5 text-center">
                                <span
                                  title={leaderLabel}
                                  className={cn(
                                    'inline-flex w-full max-w-[54px] items-center justify-center truncate rounded-control px-1 py-0.5 font-mono text-[9.5px] leading-[12px] font-semibold',
                                    cell.blocked
                                      ? 'bg-surface-2 text-text-3'
                                      : cell.sameTop
                                        ? 'bg-accent-bg text-accent'
                                        : 'bg-warning-bg text-warning',
                                  )}
                                >
                                  {cell.blocked ? '-' : cell.sameTop ? '#1' : leaderLabel}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-[9.5px] leading-[13px] text-text-3">
                {t('workbench.results.print.perturbLegend')}
              </p>

              {/* Canonical cross-method & stability summary lines */}
              <div className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 border-t border-line pt-1 text-[10px] leading-[13px] text-text-2">
                {comparison.comparable && comparison.kendallW !== null && (
                  <span>
                    {t('workbench.results.print.kendallW', {
                      w: format2(comparison.kendallW),
                      count: independentCount,
                    })}
                  </span>
                )}
                {bordaLeaders && <span>{t('workbench.results.print.bordaLeader', { name: bordaLeaders })}</span>}
                {metrics.perturbationGrid.total > 0 && (
                  <span>
                    {t('workbench.results.print.weightStability', {
                      held: metrics.perturbationGrid.held,
                      total: metrics.perturbationGrid.total,
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Right (5 cols): Automated KDS Synthesis + Leave-One-Out + Warnings */}
            <div className="col-span-5 flex min-w-0 flex-col gap-1.5 rounded-control border border-line p-2.5">
              <h2 className="text-[11.5px] leading-[15px] font-semibold text-text">
                {t('workbench.results.print.synthesisTitle')}
              </h2>

              {synthesisSentences.length > 0 && (
                <ul className="flex flex-col gap-1 text-[10.5px] leading-[14px] text-text-2">
                  {synthesisSentences.map((sentence, idx) => (
                    <li key={idx} className="border-l-2 border-line-strong pl-2">
                      {sentence}
                    </li>
                  ))}
                </ul>
              )}

              {metrics.removalSummary.tested > 0 && (
                <p
                  className={cn(
                    'rounded-control border px-2 py-1 text-[10.5px] leading-[14px]',
                    metrics.removalSummary.flippedCols.length === 0
                      ? 'border-line bg-surface-2/60 text-text'
                      : 'border-warning/40 bg-warning-bg text-text',
                  )}
                >
                  {metrics.removalSummary.flippedCols.length === 0
                    ? t('workbench.results.print.removalAllHeld', {
                        held: metrics.removalSummary.held,
                        tested: metrics.removalSummary.tested,
                      })
                    : t('workbench.results.print.removalFlips', {
                        held: metrics.removalSummary.held,
                        tested: metrics.removalSummary.tested,
                        list: listFmt.format(
                          metrics.removalSummary.flippedCols.map((f) => critNames[f.col]!),
                        ),
                      })}
                </p>
              )}

              <div className="mt-auto border-t border-line pt-1 text-[10px] leading-[13.5px]">
                {warningItems.length > 0 ? (
                  <ul className="flex flex-col gap-0.5 text-warning">
                    {warningItems.slice(0, 3).map((msg, idx) => (
                      <li key={idx} className="line-clamp-2">
                        {msg}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-3">{t('workbench.results.print.noWarnings')}</p>
                )}
              </div>
            </div>
          </section>

          <footer className="mt-auto flex items-center justify-between border-t border-line pt-1.5 text-[10px] leading-[13px] text-text-3">
            <span className="truncate">{sourceText}</span>
            <span className="num shrink-0">2 / {totalPagesLabel}</span>
          </footer>
        </section>
      </ChartTableModeProvider>

      {/* ==================== PAGE 3+: OPTIONAL AUDIT APPENDIX ==================== */}
      {includeAppendix && (
        <section
          aria-label={t('workbench.results.print.appendixTitle')}
          className="report-sheet report-appendix-sheet flex flex-col gap-4"
          data-testid="report-page-appendix"
        >
          <header className="flex items-center justify-between gap-4 border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <LogoMark size={18} className="shrink-0 text-accent" />
              <div>
                <h2 className="text-[15px] leading-[20px] font-semibold text-text">
                  {t('workbench.results.print.appendixTitle')}
                </h2>
                <p className="text-[11px] leading-[15px] text-text-2">
                  {weightLabel} · {rankingLabel} · {t('workbench.results.print.problemSize', { m, n })}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-control border border-line-strong bg-surface-2 px-1.5 py-0.5 text-[10px] leading-[13px] font-medium text-text-2">
              {t('workbench.results.print.page3Badge')}
            </span>
          </header>

          {/* Full Untruncated Ranking Table */}
          <section className="flex flex-col gap-1.5">
            <h3 className="text-[12.5px] leading-[16px] font-semibold text-text">
              {t('workbench.results.print.rankingTitle')} ({m})
            </h3>
            <Table density="compact" stickyHeader={false} className="w-full text-[11px]">
              <THead>
                <Tr>
                  <Th numeric>{t('workbench.ranking.columns.rank')}</Th>
                  <Th>{t('workbench.alternative')}</Th>
                  {fullBefore.map((c) => (
                    <Th key={c.step} numeric>
                      {tr(t, c.label)}
                    </Th>
                  ))}
                  <Th numeric>{`${score.name} (${score.symbol})`}</Th>
                  {fullAfter.map((c) => (
                    <Th key={c.step} numeric>
                      {tr(t, c.label)}
                    </Th>
                  ))}
                </Tr>
              </THead>
              <TBody>
                {fullRankOrder.map((i) => {
                  const first = result.ranking[i] === 1
                  return (
                    <Tr key={i} selected={first}>
                      <Td numeric className={cn(first && 'font-semibold')}>
                        {result.ranking[i]}
                      </Td>
                      <Th scope="row" className={cn(first && 'font-semibold')}>
                        {altNames[i]}
                      </Th>
                      {fullBefore.map((c) => (
                        <Td key={c.step} numeric>
                          {nf.format(c.values?.[i], c.decimals)}
                        </Td>
                      ))}
                      <Td numeric className={cn(first ? 'font-semibold' : 'font-medium')}>
                        {formatScore(result.scores[i] ?? 0)}
                      </Td>
                      {fullAfter.map((c) => (
                        <Td key={c.step} numeric>
                          {nf.format(c.values?.[i], c.decimals)}
                        </Td>
                      ))}
                    </Tr>
                  )
                })}
              </TBody>
            </Table>
          </section>

          {/* Full Untruncated Criteria Weights Table */}
          <section className="flex flex-col gap-1.5">
            <h3 className="text-[12.5px] leading-[16px] font-semibold text-text">
              {t('workbench.results.print.weightsTitle')} ({n})
            </h3>
            <Table density="compact" stickyHeader={false} className="w-full text-[11px]">
              <THead>
                <Tr>
                  <Th>{t('workbench.weights.columns.criterion')}</Th>
                  <Th>{t('workbench.weights.columns.direction')}</Th>
                  {allWeightExtra.map((c) => (
                    <Th key={c.step} numeric>
                      {tr(t, c.label)}
                    </Th>
                  ))}
                  <Th numeric>{t('workbench.weights.columns.weight')}</Th>
                </Tr>
              </THead>
              <TBody>
                {problem.criteria.map((c, j) => (
                  <Tr key={j}>
                    <Th scope="row">{critNames[j]}</Th>
                    <Td className="text-text-2">{t(`workbench.criterionType.${c.type}`)}</Td>
                    {allWeightExtra.map((col) => {
                      const v = col.values?.[j]
                      const d =
                        col.decimals === 0 && typeof v === 'number' && !Number.isInteger(v) ? 1 : col.decimals
                      return (
                        <Td key={col.step} numeric>
                          {nf.format(v, d)}
                        </Td>
                      )
                    })}
                    <Td numeric className="font-medium">
                      {formatWeight(weights.weights[j] ?? 0)}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </section>

          {/* Horizontally Chunked Raw Decision Matrix (<= 7 criteria per band) */}
          <section className="flex flex-col gap-2.5" data-testid="report-raw-matrix">
            <h3 className="text-[12.5px] leading-[16px] font-semibold text-text">
              {t('workbench.results.print.rawMatrixTitle')} ({m} x {n})
            </h3>
            {metrics.matrixBands.map((band) => {
              const fromCol = (band.cols[0] ?? 0) + 1
              const toCol = (band.cols[band.cols.length - 1] ?? 0) + 1
              return (
                <div key={band.bandIndex} className="report-matrix-band flex flex-col gap-1">
                  <p className="num text-[10.5px] leading-[14px] text-text-2">
                    {t('workbench.results.print.rawMatrixBand', { from: fromCol, to: toCol, total: n })}
                  </p>
                  <Table density="compact" stickyHeader={false} className="w-full text-[11px]">
                    <THead>
                      <Tr>
                        <Th>{t('workbench.alternative')}</Th>
                        {band.cols.map((col) => (
                          <Th key={col} numeric>
                            {critNames[col]} ({problem.criteria[col]?.type === 'cost' ? '↓' : '↑'})
                          </Th>
                        ))}
                      </Tr>
                    </THead>
                    <TBody>
                      {coreProblem.matrix.map((row, rowIdx) => (
                        <Tr key={rowIdx}>
                          <Th scope="row">{altNames[rowIdx]}</Th>
                          {band.cols.map((col) => {
                            const isBest = metrics.bestMatrixRows[col]?.has(rowIdx) ?? false
                            return (
                              <Td
                                key={col}
                                numeric
                                className={cn(isBest && 'bg-accent-bg font-semibold text-accent')}
                              >
                                {nf.formatRaw(row[col])}
                              </Td>
                            )
                          })}
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )
            })}
          </section>
        </section>
      )}
    </div>
  )
}
