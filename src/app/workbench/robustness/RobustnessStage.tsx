import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_DELTAS, perturbWeights } from '../../../core/robustness'
import { getRankingMethod } from '../../../core/registry'
import { rankerFor, type RankingRun } from '../../../core/run'
import { isEmptyProblem, runFor, toProblem, useMethodParams, useRanking, useWeights, useWorkbench } from '../../../state/workbench'
import { Button, EmptyState } from '../../../ui'
import { useWorkbenchNav } from '../nav'
import { BlockedByIssues, ContinueBar } from '../parts'
import { registerRobustnessSummary } from '../robustnessSummary'
import { alternativeName, criterionName, weightMethodFullLabel } from '../shared'
import { heldCount, recomputable } from './helpers'
import { MonteCarloSection } from './MonteCarloSection'
import { PerturbSection } from './PerturbSection'
import { RemovalSection } from './RemovalSection'
import { SweepSection } from './SweepSection'

// The rail's status line for this stage: first place held in how many of the ±5/10/20 % nudges.
registerRobustnessSummary((problem, weights, run) =>
  heldCount(perturbWeights(problem, weights, rankerFor(run), DEFAULT_DELTAS), weights),
)

/**
 * Robustness: how much the ranking of the stages before depends on the weights. Four checks, each a short title, one
 * sentence and a picture: move one weight, nudge each weight, random weights, drop a criterion. Read only: nothing
 * here changes the user's weights.
 */
export default function RobustnessStage() {
  const { t } = useTranslation()
  const draft = useWorkbench((s) => s.problem)
  const weightMethod = useWorkbench((s) => s.weightMethod)
  const rankingMethod = useWorkbench((s) => s.rankingMethod)
  const methodParams = useWorkbench((s) => s.methodParams)
  const alternativeJudgements = useWorkbench((s) => s.alternativeJudgements)
  const weightingParams = useMethodParams(weightMethod)
  const weightRaw = useWorkbench((s) => s.methodParams?.[s.weightMethod])
  const weights = useWeights()
  const ranking = useRanking()
  const { goTo } = useWorkbenchNav()

  const problem = useMemo(() => toProblem(draft), [draft])
  const names = useMemo(() => draft.alternatives.map((_, i) => alternativeName(draft, i, t)), [draft, t])
  const criteria = useMemo(() => draft.criteria.map((_, j) => criterionName(draft.criteria, j, t)), [draft, t])
  const method = getRankingMethod(rankingMethod)
  // One run for the four checks below, built once from the store.
  const run = useMemo(
    (): RankingRun => runFor({ methodParams, alternativeJudgements }, rankingMethod),
    [rankingMethod, methodParams, alternativeJudgements],
  )
  const w = weights.value?.weights

  if (isEmptyProblem(draft)) {
    return (
      <EmptyState
        title={t('workbench.empty.robustness.title')}
        description={t('workbench.empty.robustness.body')}
        action={<Button onClick={() => goTo('data')}>{t('workbench.empty.weights.action')}</Button>}
      />
    )
  }
  if (!ranking.value || !w || !method) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState title={t('workbench.empty.robustness.title')} description={t('workbench.empty.results.blocked')} className="pb-2" />
        <BlockedByIssues issues={ranking.issues} problem={draft} />
      </div>
    )
  }

  const weighting = recomputable(weightMethod)
  return (
    <div className="flex flex-col gap-12 pt-4">
      <SweepSection problem={problem} weights={w} run={run} baseRanking={ranking.value.ranking} names={names} criteria={criteria} />
      <PerturbSection problem={problem} weights={w} run={run} names={names} criteria={criteria} />
      <MonteCarloSection problem={problem} weights={w} run={run} names={names} baseRanking={ranking.value.ranking} />
      <RemovalSection
        problem={problem}
        weights={w}
        run={run}
        weighting={weighting}
        weightingParams={weightingParams}
        weightingName={weightMethodFullLabel(weightMethod, weightRaw, t)}
        names={names}
        criteria={criteria}
      />
      <ContinueBar to="compare" onContinue={() => goTo('compare')} />
    </div>
  )
}
