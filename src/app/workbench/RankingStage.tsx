import { useCallback, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getRankingMethod, type MethodParams as Params, type RankingResult } from '../../core'
import type { SawNormalization } from '../../core/methods/saw'
import { VIKOR_DEFAULT_V } from '../../core/methods/vikor'
import { BarChart } from '../../features/charts'
import { SawContributions, TopsisGeometry, VikorIdea } from '../../features/illustrations'
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
import { MethodParams } from './MethodParams'
import { useVikorLabels } from './vikorLabels'
import { useWorkbenchNav } from './nav'
import { BlockedByIssues, CalculationToggle, ContinueBar, MethodWarnings, SectionTitle } from './parts'
import { alternativeName, DECIMALS, findStep, scoreWords, tr, weightMethodFullLabel } from './shared'

const RANKING_METHODS: readonly RankingMethodId[] = ['topsis', 'saw', 'vikor']

type PictureProps = { problem: DraftProblem; weights: readonly number[]; params: Params; className?: string }

/**
 * What the Ranking stage shows for each ranking method, below the generic parts (score chart, table, calculation).
 * The score's words come from workbench.ranking.score.<id> (`scoreWords`) and its order from `result.order`, so a
 * new method only adds an entry here (and its words). A Record, so a new id does not compile without one.
 */
const RANKING_VIEWS: Readonly<
  Record<
    RankingMethodId,
    {
      /** Intermediate results shown as columns before the score in the full ranking table: step key and header key. */
      columns: readonly { step: string; label: string }[]
      /** The method's idea drawn on the current problem, next to the score chart. */
      Picture: (props: PictureProps) => ReactNode
      /**
       * Whether the picture already shows every score as a bar in rank order, so the score chart would repeat it
       * (SAW: each bar ends at S). Then the picture takes the chart's place.
       */
      pictureShowsScores: boolean
    }
  >
> = {
  topsis: {
    columns: [
      { step: 'topsis.distanceBest', label: 'workbench.ranking.columns.dPlus' },
      { step: 'topsis.distanceWorst', label: 'workbench.ranking.columns.dMinus' },
    ],
    Picture: TopsisPicture,
    pictureShowsScores: false,
  },
  // No columns: the contributions are the picture (each bar ends at S, so it replaces the score chart), and the full
  // matrix is in the calculation.
  saw: { columns: [], Picture: SawPicture, pictureShowsScores: true },
  // S and R before Q in the table; the picture draws every Q as a bar in rank order (with the DQ band), so it takes
  // the score chart's place.
  vikor: {
    columns: [
      { step: 'vikor.groupUtility', label: 'workbench.ranking.columns.groupUtility' },
      { step: 'vikor.individualRegret', label: 'workbench.ranking.columns.individualRegret' },
    ],
    Picture: VikorPicture,
    pictureShowsScores: true,
  },
}

/** Alternatives in rank order (ties keep input order). */
export function rankOrder(result: RankingResult): number[] {
  return result.ranking.map((_, i) => i).sort((a, b) => result.ranking[a]! - result.ranking[b]! || a - b)
}

/** Index of the first-ranked alternative. */
export const bestIndex = (result: RankingResult): number => rankOrder(result)[0] ?? 0

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
  const extra = compact ? [] : RANKING_VIEWS[method].columns.map((c) => ({ ...c, values: findStep(result.steps, c.step)?.vector }))
  const order = rankOrder(result)
  const wide = extra.length > 0
  return (
    <div className="min-w-0">
      <Table density="regular" className={cn('w-auto', wide ? 'min-w-[min(100%,560px)]' : 'min-w-[min(100%,360px)]')} aria-labelledby={id} containerClassName={compact ? 'max-w-[560px]' : undefined}>
        <THead>
          <Tr>
            <Th numeric className="w-16">
              {t('workbench.ranking.columns.rank')}
            </Th>
            <Th>{t('workbench.ranking.columns.alternative')}</Th>
            {extra.map((c) => (
              <Th key={c.step} numeric>
                {tr(t, c.label)}
              </Th>
            ))}
            <Th numeric>{scoreWords(method, t).name}</Th>
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
                {extra.map((c) => (
                  <Td key={c.step} numeric>
                    {nf.format(c.values?.[i])}
                  </Td>
                ))}
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

/** TOPSIS as a picture: alternatives, A+ and A- on the two heaviest criteria (features/illustrations). */
export function TopsisPicture({ problem, weights, className }: PictureProps) {
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

/** SAW as a picture: each alternative's score as a stack of its criteria's contributions (features/illustrations). */
export function SawPicture({ problem, weights, params, className }: PictureProps) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const core = useMemo(() => toProblem(problem), [problem])
  const normalization = params.normalization as SawNormalization | undefined
  return (
    <SawContributions
      problem={core}
      weights={weights}
      params={normalization ? { normalization } : {}}
      format={format}
      labels={{
        title: t('workbench.visual.saw.title'),
        showTable: t('workbench.chart.showTable'),
        alternative: t('workbench.alternative'),
        score: scoreWords('saw', t).name,
        legend: t('workbench.visual.saw.legend'),
        others: t('workbench.visual.saw.others'),
        segment: (alternative, criterion, value, score) => t('workbench.visual.saw.segment', { alternative, criterion, value, score }),
        readout: (alternative, criterion, value, score) => t('workbench.visual.saw.readout', { alternative, criterion, value, score }),
      }}
      className={cn('max-w-[760px]', className)}
    />
  )
}

/** VIKOR as a picture: S against R with the DQ threshold line, Q with the DQ band, C1 and C2 in words. */
export function VikorPicture({ problem, weights, params, className }: PictureProps) {
  const labels = useVikorLabels('workbench.visual.vikor.title')
  const nf = useNumberFormat(DECIMALS.score)
  const format = useCallback((v: number) => nf.format(v), [nf])
  const core = useMemo(() => toProblem(problem), [problem])
  const v = typeof params.v === 'number' ? params.v : VIKOR_DEFAULT_V
  return <VikorIdea problem={core} weights={weights} params={{ v }} format={format} labels={labels} className={cn('max-w-[880px]', className)} />
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
  const { Picture, pictureShowsScores } = RANKING_VIEWS[rankingMethod]

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-col gap-2">
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
        {/* TOPSIS has no options; SAW shows its normalization here, VIKOR its v (later WASPAS its λ). */}
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
            {t('workbench.ranking.best', {
              name: alternativeName(problem, best, t),
              symbol: scoreWords(rankingMethod, t).symbol,
              value: nf.format(result.scores[best]),
            })}
          </p>
          <div className={cn('grid grid-cols-1 items-start gap-8', !pictureShowsScores && 'xl:grid-cols-2')}>
            {!pictureShowsScores && <ScoreChart problem={problem} result={result} method={rankingMethod} className="min-w-0" />}
            {weights.value && <Picture problem={problem} weights={weights.value.weights} params={rankingParams} className="min-w-0" />}
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
