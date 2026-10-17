import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { compareRankings, defaultPair, rankingMethods, vikorCompromise, type Comparison } from '../../../core'
import { RankLines, type RankLinesColumn } from '../../../features/illustrations'
import { useNumberFormat } from '../../../i18n'
import { isEmptyProblem, paramsFor, toProblem, useWeights, useWorkbench } from '../../../state/workbench'
import { Button, EmptyState } from '../../../ui'
import { useWorkbenchNav } from '../nav'
import { BlockedByIssues } from '../parts'
import { alternativeName, findStep, placeIssue, tr } from '../shared'
import { useCompareText } from './text'

/**
 * Compare: every ranking method on the same data and weights, each with its own saved options. Read only: nothing
 * here changes the user's choices.
 */
export default function CompareStage() {
  const { t } = useTranslation()
  const { t: tc } = useCompareText()
  const draft = useWorkbench((s) => s.problem)
  const methodParams = useWorkbench((s) => s.methodParams)
  const weights = useWeights()
  const { goTo } = useWorkbenchNav()
  const w = weights.value?.weights

  const comparison = useMemo(
    () =>
      w
        ? compareRankings(
            toProblem(draft),
            w,
            rankingMethods.map((m) => ({ methodId: m.id, params: paramsFor({ methodParams }, m.id) })),
          )
        : null,
    [draft, w, methodParams],
  )

  if (isEmptyProblem(draft)) {
    return (
      <EmptyState
        title={t('workbench.empty.compare.title')}
        description={t('workbench.empty.compare.description')}
        action={<Button onClick={() => goTo('data')}>{t('workbench.empty.weights.action')}</Button>}
      />
    )
  }
  if (!comparison?.comparable) {
    // Why nothing can be compared: the weights, or the issues of every method that could not rank (deduplicated).
    const issues = comparison
      ? [...new Map(comparison.runs.flatMap((r) => r.issues).map((x) => [`${x.code}:${x.row}:${x.col}`, x])).values()]
      : weights.issues
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title={t('workbench.empty.compare.title')}
          description={comparison ? tc('blocked') : tc('weightsBlocked')}
          className="pb-2"
        />
        <BlockedByIssues issues={issues} problem={draft} />
      </div>
    )
  }

  return <CompareReady comparison={comparison} />
}

/** The chart and its summary line; Task 5 adds the "why" panel for the selected pair. */
function CompareReady({ comparison }: { comparison: Comparison }) {
  const { t } = useTranslation()
  const { t: tc } = useCompareText()
  const draft = useWorkbench((s) => s.problem)
  const nf = useNumberFormat()
  // The pair belongs to one comparison: after an edit (other data, weights or options) it starts from the top two again.
  const [pick, setPick] = useState(() => ({ comparison, pair: defaultPair(comparison) }))
  if (pick.comparison !== comparison) setPick({ comparison, pair: defaultPair(comparison) })
  const selected = pick.comparison === comparison ? pick.pair : defaultPair(comparison)
  const setSelected = (pair: [number, number]) => setPick({ comparison, pair })
  const names = draft.alternatives.map((_, i) => alternativeName(draft, i, t))

  const columns: RankLinesColumn[] = comparison.runs.map((r) => {
    const label = tr(t, `workbench.rankingMethod.${r.methodId}`)
    if (!r.result) {
      const issue = r.issues.find((x) => x.severity === 'error')
      return { methodId: r.methodId, label, ranking: null, reason: issue && placeIssue(issue, draft, t, nf.format).message }
    }
    const S = findStep(r.result.steps, 'vikor.groupUtility')?.vector
    const R = findStep(r.result.steps, 'vikor.individualRegret')?.vector
    // VIKOR's column is its Q order; when its own rule gives no single winner, one line says so (decision 6).
    const set = r.methodId === 'vikor' && S && R ? vikorCompromise(S, R, r.result.scores).set : []
    const note = set.length > 1 ? tc('vikorNote', { list: set.map((i) => names[i]).join(', ') }) : undefined
    return { methodId: r.methodId, label, ranking: r.result.ranking, note }
  })
  const { firstPlace, kendallW, ranked, runs } = comparison

  return (
    <div className="flex flex-col gap-3" data-testid="compare-ready">
      <RankLines
        columns={columns}
        borda={comparison.borda?.ranking ?? null}
        names={names}
        selected={selected}
        onSelectPair={setSelected}
        labels={{
          title: tc('chart.title'),
          description: tc('chart.description'),
          showTable: t('workbench.chart.showTable'),
          alternative: t('workbench.alternative'),
          borda: tc('chart.borda'),
          notRanked: tc('chart.notRanked'),
          crossing: (a, b, from, to) => tc('chart.crossing', { a, b, from, to }),
        }}
        className="max-w-[880px]"
      />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-13 text-text-2" data-testid="compare-summary">
        {kendallW !== null && <span>{tc('summary.w', { w: nf.format(kendallW, 2) })}</span>}
        {firstPlace && <span>{tc('summary.first', { n: firstPlace.methods, of: firstPlace.of })}</span>}
        {ranked.length < runs.length && <span>{tc('summary.ranked', { n: ranked.length, of: runs.length })}</span>}
      </p>
    </div>
  )
}
