import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { compareRankings, rankingMethods } from '../../../core'
import { isEmptyProblem, paramsFor, toProblem, useWeights, useWorkbench } from '../../../state/workbench'
import { Button, EmptyState } from '../../../ui'
import { useWorkbenchNav } from '../nav'
import { BlockedByIssues } from '../parts'
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

  // Tasks 4 and 5 put the rank-line chart and the "why" panel here.
  return <div data-testid="compare-ready" />
}
