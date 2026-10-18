import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { compareRankings, defaultPair, rankingMethods, type Comparison } from '../../../core'
import { RankLines, type RankLinesColumn } from '../../../features/illustrations/RankLines'
import { useNumberFormat } from '../../../i18n'
import { isEmptyProblem, paramsFor, toProblem, useWeights, useWorkbench } from '../../../state/workbench'
import { Button, EmptyState } from '../../../ui'
import { viewOf } from '../../methods/views'
import { useWorkbenchNav } from '../nav'
import { BlockedByIssues } from '../parts'
import { alternativeName, placeIssue, tr } from '../shared'
import { useCompareText } from './text'
import { WhyPanel } from './WhyPanel'

/** Registry order, but MARCOS next to SAW: it orders like SAW (Linear), so the lines between the two run straight. */
const COMPARE_ORDER = rankingMethods.map((m) => m.id).flatMap((id) => (id === 'marcos' ? [] : id === 'saw' ? ['saw', 'marcos'] : [id]))

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
            COMPARE_ORDER.map((id) => ({ methodId: id, params: paramsFor({ methodParams }, id) })),
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

  return <CompareReady comparison={comparison} weights={w!} />
}

/** The chart, its summary line and the "why" panel for the selected pair. */
function CompareReady({ comparison, weights }: { comparison: Comparison; weights: number[] }) {
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
    // A column is the method's score order; when its answer is a set (VIKOR's compromise set), a line says so (decision 6).
    const set = viewOf(r.methodId)?.verdict?.(r.result, names, t, nf.format)?.set ?? []
    const note = set.length > 1 ? tc('vikorNote', { list: set.map((i) => names[i]).join(', ') }) : undefined
    return { methodId: r.methodId, label, ranking: r.result.ranking, note }
  })
  const { echoes, firstPlace, kendallW, ranked, runs } = comparison

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
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-13 text-text-2" data-testid="compare-summary">
        {/* MARCOS = c x SAW (Linear): one order, counted once in Borda, W and the first place (decision 4, 18.10). */}
        {echoes.map((e) => (
          <span
            key={e.methodId}
            className="inline-flex h-5 items-center rounded-control border border-line-strong px-1.5 text-12 font-medium whitespace-nowrap text-text"
            data-testid={`${e.methodId}-badge`}
          >
            {tc('echo', { method: tr(t, `workbench.rankingMethod.${e.methodId}`), of: tc('sawLinear') })}
          </span>
        ))}
        {kendallW !== null && <span>{tc('summary.w', { w: nf.format(kendallW, 2) })}</span>}
        {firstPlace && <span>{tc('summary.first', { name: names[firstPlace.alternative]!, n: firstPlace.methods, of: firstPlace.of })}</span>}
        {ranked.length < runs.length && <span>{tc('summary.ranked', { n: ranked.length, of: runs.length })}</span>}
      </p>
      {selected && <WhyPanel comparison={comparison} weights={weights} pair={selected} names={names} />}
    </div>
  )
}
