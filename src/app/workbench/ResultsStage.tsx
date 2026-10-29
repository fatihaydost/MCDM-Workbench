import { DownloadSimple, Printer } from '@phosphor-icons/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doiUrl, formatCitation, getExample, shortCitation } from '../../data/examples'
import { Heatmap } from '../../features/charts'
import { buildWorkbook, exportCsv, lambdaLabels, writeWorkbook, type WorkbookLabels } from '../../features/io'
import { useNumberFormat } from '../../i18n'
import { isEmptyProblem, useRanking, useWeights, useWorkbench } from '../../state/workbench'
import { Button, EmptyState, Notice } from '../../ui'
import { methodViews } from '../methods/views'
import { useWorkbenchNav } from './nav'
import { BlockedByIssues, CalculationToggle, ContinueBar, MethodWarnings, SectionTitle } from './parts'
import { PrintReport } from './PrintReport'
import { bestIndex, leaders, RankingTable } from './RankingStage'
import { alternativeName, criterionName, DECIMALS, downloadBlob, findStep, rankingMethodFullLabel, scoreWords, stepName, weightMethodFullLabel } from './shared'
import { WeightsChart } from './WeightsStage'

type Busy = 'xlsx' | null

export function ResultsStage() {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.score)
  const format4 = useCallback((v: number) => nf.format(v), [nf])
  const format2 = useCallback((v: number) => nf.format(v, DECIMALS.correlation), [nf])
  const problem = useWorkbench((s) => s.problem)
  const weightMethod = useWorkbench((s) => s.weightMethod)
  const weightParams = useWorkbench((s) => s.methodParams?.[s.weightMethod])
  const rankingMethod = useWorkbench((s) => s.rankingMethod)
  const rankingParams = useWorkbench((s) => s.methodParams?.[s.rankingMethod])
  const judgements = useWorkbench((s) => s.judgements)
  const alternativeJudgements = useWorkbench((s) => s.alternativeJudgements)
  const exampleId = useWorkbench((s) => s.exampleId)
  const importedFrom = useWorkbench((s) => s.importedFrom ?? null)
  const weights = useWeights()
  const ranking = useRanking()
  const { goTo } = useWorkbenchNav()
  const [busy, setBusy] = useState<Busy>(null)
  const [failed, setFailed] = useState(false)
  const names = useMemo(() => problem.criteria.map((_, j) => criterionName(problem.criteria, j, t)), [problem, t])

  const result = ranking.value
  const w = weights.value
  if (isEmptyProblem(problem)) {
    // A first visit: one sentence and one way forward, no list of problems yet.
    return (
      <EmptyState
        title={t('workbench.empty.results.title')}
        description={t('workbench.empty.results.body')}
        action={<Button onClick={() => goTo('data')}>{t('workbench.empty.weights.action')}</Button>}
      />
    )
  }
  if (!result || !w) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState title={t('workbench.empty.results.title')} description={t('workbench.empty.results.blocked')} className="pb-2" />
        <BlockedByIssues issues={ranking.issues} problem={problem} />
      </div>
    )
  }

  const best = bestIndex(result)
  const example = exampleId ? getExample(exampleId) : undefined
  const weightLabel = weightMethodFullLabel(weightMethod, weightParams, t)
  const rankingLabel = rankingMethodFullLabel(rankingMethod, rankingParams, t)
  const score = scoreWords(rankingMethod, t)
  const altNames = problem.alternatives.map((_, i) => alternativeName(problem, i, t))
  const firsts = leaders(result)
  // A method's own answer (VIKOR: a compromise set when C1 or C2 fails): the summary and the file say so.
  const verdict = methodViews[rankingMethod].verdict?.(result, altNames, t, format4) ?? null
  const correlation = weightMethod === 'critic' ? findStep(w.steps, 'critic.correlation')?.matrix : undefined

  const workbookLabels = (): Partial<WorkbookLabels> => ({
    sheets: {
      data: t('workbench.results.workbook.data'),
      weights: t('workbench.results.workbook.weights'),
      ranking: t('workbench.results.workbook.ranking'),
      calculation: t('workbench.results.workbook.calculation'),
      judgements: t('workbench.results.workbook.judgements'),
    },
    alternative: t('workbench.alternative'),
    criterion: t('workbench.criterion'),
    type: t('workbench.results.workbook.type'),
    typeWords: { benefit: t('workbench.results.workbook.benefit'), cost: t('workbench.results.workbook.cost') },
    method: t('workbench.results.workbook.method'),
    weight: t('workbench.results.workbook.weight'),
    score: score.name,
    rank: t('workbench.results.workbook.rank'),
    best: t('workbench.visual.bwm.best'),
    worst: t('workbench.visual.bwm.worst'),
    step: (key) => stepName(key, t),
    lambda: lambdaLabels((v) => nf.format(v, 1)),
  })

  /** Provenance for the About sheet: a downloaded file on its own still says where it came from. */
  const aboutRows = (): (readonly [string, string])[] => {
    const rows: (readonly [string, string])[] = [
      [t('workbench.results.about.tool'), t('common.wordmark')],
      [t('workbench.results.about.address'), `${window.location.origin}${import.meta.env.BASE_URL}app`],
      [t('workbench.results.about.created'), new Date().toISOString().slice(0, 10)],
      [
        t('workbench.results.about.source'),
        example
          ? `${formatCitation(example.citation)}; ${example.citation.tables[nf.lang]}`
          : importedFrom
            ? t('workbench.results.sourceFile', { name: importedFrom })
            : t('workbench.results.sourceManual'),
      ],
      [t('workbench.results.about.weighting'), weightLabel],
      [t('workbench.results.about.ranking'), rankingLabel],
      [t('workbench.results.about.precision'), t('workbench.results.about.precisionNote')],
    ]
    if (verdict) rows.push(...verdict.about)
    return rows
  }

  const downloadXlsx = async () => {
    setBusy('xlsx')
    setFailed(false)
    try {
      const X = await import('xlsx')
      const wb = buildWorkbook(X, {
        problem,
        weighting: { method: weightLabel, result: w },
        ranking: { method: rankingLabel, result },
        ...((weightMethod === 'ahp' || weightMethod === 'bwm') && judgements ? { judgements } : {}),
        ...(rankingMethod === 'ahp-ranking' && alternativeJudgements ? { alternativeJudgements } : {}),
        labels: workbookLabels(),
        about: { sheet: t('workbench.results.workbook.about'), rows: aboutRows() },
      })
      const bytes = writeWorkbook(X, wb)
      downloadBlob(
        new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        t('workbench.results.file.xlsx'),
      )
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  const downloadCsv = () => {
    const text = exportCsv(problem, {
      decimal: nf.lang === 'tr' ? ',' : '.',
      corner: t('workbench.alternative'),
      typeLabel: t('workbench.results.workbook.type'),
      typeWords: { benefit: t('workbench.results.workbook.benefit'), cost: t('workbench.results.workbook.cost') },
    })
    downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), t('workbench.results.file.csv'))
  }

  const source = example ? (
    <>
      {shortCitation(example.citation, nf.lang)}.{' '}
      <a href={doiUrl(example.citation.doi)} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2 hover:no-underline">
        doi:{example.citation.doi}
      </a>
    </>
  ) : importedFrom ? (
    t('workbench.results.sourceFile', { name: importedFrom })
  ) : (
    t('workbench.results.sourceManual')
  )

  return (
    <div className="flex flex-col gap-10 pt-4 print:gap-4 print:pt-0">
      <MethodWarnings warnings={[...(w.warnings ?? []), ...(result.warnings ?? [])]} problem={problem} />
      <PrintReport
        problem={problem}
        weights={w}
        result={result}
        weightLabel={weightLabel}
        rankingLabel={rankingLabel}
        rankingMethod={rankingMethod}
        verdict={verdict}
      />
      <section aria-labelledby="wb-results-headline" className="no-print flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p id="wb-results-headline" className="text-24 font-semibold text-text">
            {(() => {
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
              return t('workbench.results.headline', { name: altNames[best], symbol: score.symbol, value: nf.format(result.scores[best]) })
            })()}
          </p>
          {verdict && (verdict.failed.length > 0 || Boolean((verdict as { summary?: string }).summary || verdict.result)) && (
            <p className="max-w-[70ch] text-16 text-text" data-testid="results-vikor-verdict">
              {verdict.failed.length > 0 ? (
                <>
                  {verdict.failed.join(' ')} <span className="font-semibold">{verdict.result}.</span>
                </>
              ) : (
                <span className="font-semibold">{(verdict as { summary?: string }).summary ?? `${verdict.result}.`}</span>
              )}
            </p>
          )}
          <p className="text-13 text-text-2">
            {t('workbench.results.byline', {
              weights: weightLabel,
              ranking: rankingLabel,
              m: problem.alternatives.length,
              n: problem.criteria.length,
            })}{' '}
            {source}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button variant="primary" icon={<DownloadSimple aria-hidden />} onClick={() => void downloadXlsx()} disabled={busy !== null}>
            {busy === 'xlsx' ? t('workbench.results.preparing') : t('workbench.results.downloadXlsx')}
          </Button>
          <Button icon={<DownloadSimple aria-hidden />} onClick={downloadCsv}>
            {t('workbench.results.downloadCsv')}
          </Button>
          <Button icon={<Printer aria-hidden />} onClick={() => window.print()} data-testid="print-report-button">
            {t('workbench.results.print.button')}
          </Button>
          <span aria-live="polite" className="sr-only">
            {busy ? t('workbench.results.preparing') : ''}
          </span>
        </div>
        {failed && (
          <Notice tone="danger" role="alert">
            {t('workbench.results.downloadFailed')}
          </Notice>
        )}
      </section>

      {/* Results is the summary: the score bars and the method's picture stay on Ranking. */}
      <section className="no-print flex flex-col gap-3">
        <SectionTitle>
          <span id="wb-results-ranking">{t('workbench.results.rankingTitle')}</span>
        </SectionTitle>
        <RankingTable problem={problem} result={result} method={rankingMethod} id="wb-results-ranking" compact />
      </section>

      <section className="no-print grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
        <WeightsChart names={names} weights={w.weights} format={format4} className="min-w-0" />
        {correlation && (
          <Heatmap
            title={t('workbench.results.correlationTitle')}
            description={t('workbench.results.correlationHint')}
            scale="diverging"
            rowLabels={names}
            colLabels={names}
            values={correlation}
            format={format2}
            emptyText={t('workbench.calc.undefined')}
            tableLabels={{ show: t('workbench.chart.showTable'), corner: t('workbench.criterion') }}
            className="min-w-0"
          />
        )}
      </section>

      <section aria-labelledby="wb-calculation" className="no-print flex flex-col gap-3">
        <SectionTitle>
          <span id="wb-calculation">{t('workbench.results.calculationTitle')}</span>
        </SectionTitle>
        <CalculationToggle
          problem={problem}
          headingLevel="h4"
          groups={[
            { title: t('workbench.results.weightingPart', { method: weightLabel }), steps: w.steps },
            { title: t('workbench.results.rankingPart', { method: rankingLabel }), steps: result.steps },
          ]}
        />
      </section>

      <ContinueBar to="robustness" onContinue={() => goTo('robustness')} />
    </div>
  )
}
