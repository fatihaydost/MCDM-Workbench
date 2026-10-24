import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AHP_MAX_PAIRWISE_ALTERNATIVES,
  ahpProgress,
  emptyJudgements,
  type AhpAggregation,
  type AlternativeJudgements,
  type Ratio,
} from '../../core'
import {
  ahpQuestions,
  answerOf,
  JudgementPanel,
  nextUnanswered,
  PairList,
  PairwiseCard,
  withinCap,
  type Consistency,
  type JudgementPanelLabels,
  type Mode,
  type PairListLabels,
  type PairwiseLabels,
  type Question,
  type ScaleWords,
} from '../../features/pairwise'
import { useNumberFormat } from '../../i18n'
import { useWorkbench, type DraftProblem } from '../../state/workbench'
import { Button, Notice, SegmentedControl } from '../../ui'
import { useWorkbenchNav } from './nav'
import { SectionTitle } from './parts'
import { alternativeName, criterionName, DECIMALS, ids } from './shared'

const AHP_MODE: Mode = { kind: 'ahp' }

function CriterionPairwise({
  criterionIndex,
  criterionLabel,
  altNames,
  pairs,
  aggregation,
}: {
  criterionIndex: number
  criterionLabel: string
  altNames: readonly string[]
  pairs: readonly (readonly (Ratio | null)[])[]
  aggregation: AhpAggregation
}) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const setAlternativeJudgement = useWorkbench((s) => s.setAlternativeJudgement)
  const m = altNames.length
  const judgements = useMemo(
    () => (pairs.length === m ? { pairs: pairs.map((r) => [...r]), best: null, worst: null } : emptyJudgements(m)),
    [pairs, m],
  )
  const questions = useMemo(() => ahpQuestions(m), [m])
  const prog = useMemo(() => ahpProgress(judgements, m, { aggregation }), [judgements, m, aggregation])
  const complete = !prog.provisional && prog.weights !== null

  const key = `ahp-alt-${criterionIndex}-${m}`
  const [at, setAt] = useState<{ key: string; index: number | null }>({ key, index: null })
  if (at.key !== key) setAt({ key, index: null })
  const chosen = at.key === key && at.index !== null && at.index < questions.length ? at.index : null
  const index = chosen ?? (complete ? null : nextUnanswered(questions, judgements.pairs, () => AHP_MODE, -1))
  const question = index === null ? undefined : questions[index]

  const worstPair = prog.inconsistent ? prog.worstPair : null
  const isFlagged = (q: Question) => {
    const ans = judgements.pairs[q.a]?.[q.b] ?? null
    return (
      worstPair !== null &&
      q.a === worstPair.i &&
      q.b === worstPair.k &&
      withinCap(worstPair.suggested, AHP_MODE) !== null &&
      Math.abs(worstPair.suggested - (ans ?? 0)) > 1e-9
    )
  }
  const flaggedIndex = questions.findIndex(isFlagged)
  const value = question ? (judgements.pairs[question.a]?.[question.b] ?? null) : null
  const flag =
    question &&
    worstPair !== null &&
    isFlagged(question) &&
    withinCap(worstPair.suggested, AHP_MODE) !== null &&
    Math.abs(worstPair.suggested - (value ?? 0)) > 1e-9
      ? { suggestion: worstPair.suggested }
      : null

  const answer = (v: Ratio) => {
    if (!question || index === null) return
    setAlternativeJudgement(criterionIndex, question.a, question.b, v)
    const nextMat = useWorkbench.getState().alternativeJudgements?.[criterionIndex] ?? judgements.pairs
    setAt({ key, index: nextUnanswered(questions, nextMat, () => AHP_MODE, index) })
  }

  const fillAllEqual = () => {
    for (const q of questions) setAlternativeJudgement(criterionIndex, q.a, q.b, 1)
    setAt({ key, index: null })
  }

  const words: ScaleWords = {
    1: t('workbench.pairwise.words.1'),
    3: t('workbench.pairwise.words.3'),
    5: t('workbench.pairwise.words.5'),
    7: t('workbench.pairwise.words.7'),
    9: t('workbench.pairwise.words.9'),
  }
  const cardLabels: PairwiseLabels = {
    question: t('workbench.ranking.ahp.question', { criterion: criterionLabel }),
    fixed: (a, b) => t('workbench.pairwise.fixed', { a, b }),
    sides: t('workbench.ranking.ahp.sides'),
    values: t('workbench.pairwise.values'),
    equal: t('workbench.ranking.ahp.equal'),
    words,
    valueName: (v) => {
      const word = words[v as keyof ScaleWords]
      return word ? t('workbench.pairwise.valueNameWord', { value: v, word }) : t('workbench.pairwise.valueName', { value: v })
    },
    progress: (i, total) => t('workbench.pairwise.progress', { index: i, total }),
    back: t('workbench.pairwise.back'),
    atMost: (cap) => t('workbench.pairwise.atMost', { cap }),
    suggest: (a) => t('workbench.pairwise.suggest', { answer: a }),
    use: (v) => t('workbench.pairwise.use', { value: v }),
  }
  const panelLabels: JudgementPanelLabels = {
    title: t('workbench.ranking.ahp.localPriorities'),
    provisional: t('workbench.pairwise.panel.provisional'),
    consistency: t('workbench.pairwise.panel.consistency'),
    notApplicable: t('workbench.pairwise.panel.notApplicable'),
    value: (c) => {
      const val = nf.format(c.value, 2)
      if (c.threshold === null) return t('workbench.pairwise.panel.valueNoThreshold', { value: val })
      const threshold = nf.format(c.threshold, 2)
      return c.approximate
        ? t('workbench.pairwise.panel.valueApproximate', { value: val, threshold })
        : t('workbench.pairwise.panel.value', { value: val, threshold })
    },
    ok: t('workbench.pairwise.panel.ok'),
    warning: (name) => (name ? t('workbench.pairwise.panel.warning', { criterion: name }) : t('workbench.pairwise.panel.warningUnnamed')),
    format: (v) => nf.format(v),
  }
  const listLabels: PairListLabels = {
    title: t('workbench.pairwise.list.title'),
    pair: (a, b) => t('workbench.pairwise.list.pair', { a, b }),
    flagged: t('workbench.pairwise.list.flagged'),
  }

  const consistency: Consistency | null =
    prog.cr !== null && prog.threshold !== null
      ? { value: prog.cr, threshold: prog.threshold, approximate: false, inclusive: true }
      : null
  const shown = prog.weights?.map((w) => (Number.isFinite(w) ? w : undefined)) ?? null
  const flaggedLabel = worstPair ? t('workbench.pairwise.list.pair', { a: altNames[worstPair.i], b: altNames[worstPair.k] }) : null

  const jump = (i: number) => setAt({ key, index: i })
  const list = (className?: string) => (
    <PairList
      questions={questions}
      answers={questions.map((q) => answerOf(q, judgements.pairs, AHP_MODE))}
      current={index ?? -1}
      flagged={flaggedIndex < 0 ? null : flaggedIndex}
      names={altNames}
      onJump={jump}
      labels={listLabels}
      className={className}
    />
  )

  return (
    <div
      id={ids.altPairwise(criterionIndex)}
      tabIndex={-1}
      aria-label={criterionLabel}
      className="flex flex-col gap-4 border-l-2 border-line pl-4 outline-none"
    >
      {prog.answered === 0 && (
        <Button variant="ghost" size="sm" className="self-start" onClick={fillAllEqual}>
          {t('workbench.ranking.ahp.allEqual')}
        </Button>
      )}
      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="min-w-0">
          {question ? (
            <PairwiseCard
              question={question}
              mode={AHP_MODE}
              names={altNames}
              value={value}
              position={{ index: index!, total: questions.length }}
              flag={flag}
              onAnswer={answer}
              onBack={() => jump(Math.max(0, index! - 1))}
              labels={cardLabels}
            />
          ) : (
            list('max-w-[420px]')
          )}
        </div>
        {(prog.weights || question) && (
          <div className="flex max-w-[480px] min-w-0 flex-col gap-6">
            {prog.weights && (
              <JudgementPanel
                names={altNames}
                weights={shown}
                provisional={prog.provisional}
                consistency={consistency}
                flagged={worstPair ? worstPair.i : null}
                flaggedLabel={flaggedLabel}
                onFlagClick={flaggedIndex >= 0 ? () => jump(flaggedIndex) : undefined}
                labels={panelLabels}
              />
            )}
            {question && <div className="max-lg:hidden">{list()}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

export function AhpRankingSources({
  problem,
  alternativeJudgements,
  aggregation,
}: {
  problem: DraftProblem
  alternativeJudgements: AlternativeJudgements | undefined
  aggregation: AhpAggregation
}) {
  const { t } = useTranslation()
  const weightMethod = useWorkbench((s) => s.weightMethod)
  const setWeightMethod = useWorkbench((s) => s.setWeightMethod)
  const setCriterionSource = useWorkbench((s) => s.setCriterionSource)
  const { goTo } = useWorkbenchNav()
  const m = problem.alternatives.length
  const altNames = useMemo(() => problem.alternatives.map((_, i) => alternativeName(problem, i, t)), [problem, t])
  const critNames = useMemo(() => problem.criteria.map((_, j) => criterionName(problem.criteria, j, t)), [problem.criteria, t])
  const hasStoredPairwise = Boolean(alternativeJudgements?.some((mat) => mat != null))

  return (
    <div className="flex flex-col gap-5">
      {weightMethod !== 'ahp' && (
        <Notice tone="info">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>{t('workbench.ranking.ahp.otherWeightsNotice')}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setWeightMethod('ahp')
                goTo('weights')
              }}
            >
              {t('workbench.ranking.ahp.switchToAhpWeights')}
            </Button>
          </div>
        </Notice>
      )}

      {m > AHP_MAX_PAIRWISE_ALTERNATIVES ? (
        hasStoredPairwise ? (
          <Notice tone="info">{t('workbench.ranking.ahp.capNotice', { max: AHP_MAX_PAIRWISE_ALTERNATIVES })}</Notice>
        ) : null
      ) : (
        <section className="flex flex-col gap-4" aria-labelledby="wb-ahp-sources-title">
          <div className="flex flex-col gap-1">
            <SectionTitle>
              <span id="wb-ahp-sources-title">{t('workbench.ranking.ahp.sourcesTitle')}</span>
            </SectionTitle>
            <p className="max-w-[72ch] text-13 text-text-2">{t('workbench.ranking.ahp.sourcesHint')}</p>
          </div>
          <div className="flex flex-col gap-4">
            {problem.criteria.map((c, j) => {
              const mat = alternativeJudgements?.[j] ?? null
              const source: 'table' | 'pairwise' = mat != null ? 'pairwise' : 'table'
              return (
                <div key={j} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 max-w-[560px]">
                    <div className="flex items-center gap-2">
                      <span className="text-14 font-medium text-text">{critNames[j]}</span>
                      <span className="text-12 text-text-3">{t(`workbench.criterionType.${c.type}`)}</span>
                    </div>
                    <SegmentedControl<'table' | 'pairwise'>
                      aria-label={t('workbench.ranking.ahp.sourceFor', { criterion: critNames[j] })}
                      value={source}
                      onValueChange={(next) => setCriterionSource(j, next)}
                      options={[
                        { value: 'table', label: t('workbench.ranking.ahp.sourceTable') },
                        { value: 'pairwise', label: t('workbench.ranking.ahp.sourcePairwise') },
                      ]}
                      size="sm"
                    />
                  </div>
                  {mat != null && (
                    <CriterionPairwise
                      criterionIndex={j}
                      criterionLabel={critNames[j]!}
                      altNames={altNames}
                      pairs={mat}
                      aggregation={aggregation}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
