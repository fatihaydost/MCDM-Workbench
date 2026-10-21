import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { bwmAnswers, bwmProgress, emptyJudgements, type Ratio, type WeightingResult } from '../../core'
import {
  AnchorPicker,
  answerOf,
  bwmQuestions,
  JudgementPanel,
  modeFor,
  nextUnanswered,
  PairList,
  PairwiseCard,
  withinCap,
  type Consistency,
  type JudgementPanelLabels,
  type PairListLabels,
  type PairwiseLabels,
  type Question,
  type ScaleWords,
} from '../../features/pairwise'
import { useNumberFormat } from '../../i18n'
import { toProblem, useMethodParams, useWorkbench, type Computed, type DraftProblem } from '../../state/workbench'
import { Button } from '../../ui'
import { methodViews } from '../methods/views'
import { criterionName, DECIMALS, ids } from './shared'
import { ComputedWeights } from './WeightsStage'

type Props = { problem: DraftProblem; method: 'bwm'; result: Computed<WeightingResult> }

/**
 * BWM on the Weights stage: pick the anchors, then one question at a time with the live weights and consistency next
 * to it. Once every answer is in, the card area becomes the list of all pairs (tap one to edit) and the usual table.
 */
export function JudgementWeights({ problem, method, result }: Props) {
  const { t } = useTranslation()
  const nf = useNumberFormat(DECIMALS.weight)
  const stored = useWorkbench((s) => s.judgements)
  const setJudgement = useWorkbench((s) => s.setJudgement)
  const setAnchors = useWorkbench((s) => s.setAnchors)
  const setWeightMethod = useWorkbench((s) => s.setWeightMethod)
  const params = useMethodParams(method)
  const core = useMemo(() => toProblem(problem), [problem])
  const n = problem.criteria.length
  const names = problem.criteria.map((_, j) => criterionName(problem.criteria, j, t))
  const judgements = stored && stored.pairs.length === n ? stored : emptyJudgements(n)
  const { best, worst } = judgements
  const anchored = best !== null && worst !== null && best !== worst && best < n && worst < n
  const questions = useMemo(() => (anchored ? bwmQuestions(n, best, worst) : []), [anchored, n, best, worst])
  const progress = bwmProgress(judgements, n)
  const complete = result.value !== null
  // A criterion with neither answer yet is left out of the provisional weights: the panel shows "—", not 0.
  const answers = bwmAnswers(judgements)
  const shown = progress.weights?.map((w, j) => (answers?.bestToOthers[j] === null && answers.othersToWorst[j] === null ? undefined : w)) ?? null

  // The question on screen, valid only for these anchors; null: the first unanswered one (or the summary when complete).
  const key = `${n}-${best}-${worst}`
  const [at, setAt] = useState<{ key: string; index: number | null }>({ key, index: null })
  // New anchors start over at the first unanswered question (A, B, then A again does not reopen A's old card).
  if (at.key !== key) setAt({ key, index: null })
  const chosen = at.key === key && at.index !== null && at.index < questions.length ? at.index : null
  const index = chosen ?? (complete ? null : nextUnanswered(questions, judgements.pairs, (q) => modeFor(q, judgements), -1))
  const question = index === null ? undefined : questions[index]
  const mode = question ? modeFor(question, judgements) : undefined

  // The card for criterion `flagged` on the suggestion's side.
  const { flagged, suggestion } = progress
  const isFlagged = (q: Question) =>
    flagged !== null &&
    suggestion !== null &&
    (suggestion.side === 'bestToOthers' ? q.a === best && q.b === flagged : q.a === flagged && q.b === worst)
  const flaggedIndex = questions.findIndex(isFlagged)
  const value = question ? (judgements.pairs[question.a]?.[question.b] ?? null) : null
  // Only a suggestion the card can take (within a_BW) and that changes the answer.
  const flag =
    question && mode && suggestion && isFlagged(question) && withinCap(suggestion.value, mode) !== null && suggestion.value !== value
      ? { suggestion: suggestion.value }
      : null

  // Answers commit synchronously: the card arms its focus move for this frame only.
  const answer = (v: Ratio) => {
    if (!question || index === null) return
    setJudgement(question.a, question.b, v)
    const next = useWorkbench.getState().judgements ?? judgements
    setAt({ key, index: nextUnanswered(questions, next.pairs, (q) => modeFor(q, next), index) })
  }

  // Between the card and the summary list the focused element unmounts: hand focus to the one that replaces it.
  const slot = useRef<HTMLDivElement>(null)
  const summary = complete && index === null
  const wasSummary = useRef(summary)
  useEffect(() => {
    if (wasSummary.current === summary) return
    wasSummary.current = summary
    const el = slot.current
    const target = summary
      ? el?.querySelector<HTMLElement>('button')
      : (el?.querySelector<HTMLElement>('[data-values] [aria-checked="true"]') ?? el?.querySelector<HTMLElement>('[data-values] button:not(:disabled)'))
    target?.focus()
  }, [summary])

  const words: ScaleWords = {
    1: t('workbench.pairwise.words.1'),
    3: t('workbench.pairwise.words.3'),
    5: t('workbench.pairwise.words.5'),
    7: t('workbench.pairwise.words.7'),
    9: t('workbench.pairwise.words.9'),
  }
  const cardLabels: PairwiseLabels = {
    question: t('workbench.pairwise.question'),
    fixed: (a, b) => t('workbench.pairwise.fixed', { a, b }),
    sides: t('workbench.pairwise.sides'),
    values: t('workbench.pairwise.values'),
    equal: t('workbench.pairwise.equal'),
    words,
    valueName: (v) => {
      const word = words[v as keyof ScaleWords]
      return word ? t('workbench.pairwise.valueNameWord', { value: v, word }) : t('workbench.pairwise.valueName', { value: v })
    },
    progress: (i, total) => t('workbench.pairwise.progress', { index: i, total }),
    back: t('workbench.pairwise.back'),
    atMost: (cap) => t('workbench.pairwise.atMost', { cap }),
    suggest: (a) => t('workbench.pairwise.suggest', { answer: a }),
    use: (value) => t('workbench.pairwise.use', { value }),
  }
  const panelLabels: JudgementPanelLabels = {
    title: t('workbench.pairwise.panel.title'),
    provisional: t('workbench.pairwise.panel.provisional'),
    consistency: t('workbench.pairwise.panel.consistency'),
    notApplicable: t('workbench.pairwise.panel.notApplicable'),
    value: (c) => {
      const value = nf.format(c.value, 2)
      if (c.threshold === null) return t('workbench.pairwise.panel.valueNoThreshold', { value })
      const threshold = nf.format(c.threshold, 2)
      return c.approximate
        ? t('workbench.pairwise.panel.valueApproximate', { value, threshold })
        : t('workbench.pairwise.panel.value', { value, threshold })
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

  // n = 2 has no consistency (Liang's thresholds start at 3 criteria).
  const consistency: Consistency | null =
    progress.crInput !== null && progress.threshold
      ? { value: progress.crInput, threshold: progress.threshold.value, approximate: progress.threshold.approximate }
      : null
  const jump = (i: number) => setAt({ key, index: i })
  const list = (className?: string) => (
    <PairList
      questions={questions}
      answers={questions.map((q) => answerOf(q, judgements.pairs, modeFor(q, judgements)))}
      current={index ?? -1}
      flagged={flaggedIndex < 0 ? null : flaggedIndex}
      names={names}
      onJump={jump}
      labels={listLabels}
      className={className}
    />
  )
  const Picture = methodViews[method].stage?.Component

  return (
    <>
      <section id={ids.pairwise} tabIndex={-1} aria-label={t('workbench.weightMethod.bwm')} className="flex flex-col gap-6 outline-none">
        <AnchorPicker
          names={names}
          best={best}
          worst={worst}
          onChange={setAnchors}
          labels={{ best: t('workbench.pairwise.anchors.best'), worst: t('workbench.pairwise.anchors.worst') }}
        />
        {!anchored && (
          <Button variant="ghost" className="self-start" onClick={() => setWeightMethod('equal')}>
            {t('workbench.pairwise.allEqual')}
          </Button>
        )}
        {anchored && Picture && progress.weights && (
          <Suspense fallback={null}>
            <Picture problem={core} weights={progress.weights} params={params} judgements={judgements} />
          </Suspense>
        )}
        {anchored && (
          <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div ref={slot} className="min-w-0">
              {question && mode ? (
                <PairwiseCard
                  question={question}
                  mode={mode}
                  names={names}
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
            {(progress.weights || question) && (
              <div className="flex max-w-[480px] min-w-0 flex-col gap-8">
                {progress.weights && (
                  <JudgementPanel
                    names={names}
                    weights={shown}
                    provisional={progress.provisional}
                    consistency={consistency}
                    flagged={flagged}
                    labels={panelLabels}
                  />
                )}
                {/* Mid-flow the list is the desktop's jump list; on phones it appears as the summary once complete. */}
                {question && <div className="max-lg:hidden">{list()}</div>}
              </div>
            )}
          </div>
        )}
      </section>
      {result.value && <ComputedWeights problem={problem} method={method} result={result.value} />}
    </>
  )
}
