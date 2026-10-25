import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ahpProgress, bwmAnswers, bwmProgress, emptyJudgements, type AhpParams, type Judgements, type Ratio, type WeightingResult } from '../../core'
import {
  ahpQuestions,
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
  type Mode,
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

type Props = { problem: DraftProblem; method: 'bwm' | 'ahp'; result: Computed<WeightingResult> }

/**
 * AHP and BWM on the Weights stage: for BWM pick the anchors first, then one question at a time with the live weights
 * and consistency next to it. Once every answer is in, the card area becomes the list of all pairs (tap one to edit)
 * and the usual weights table.
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
  const isAhp = method === 'ahp'
  const anchored = isAhp || (best !== null && worst !== null && best !== worst && best < n && worst < n)
  const questions = useMemo(
    () => (isAhp ? ahpQuestions(n) : anchored ? bwmQuestions(n, best!, worst!) : []),
    [isAhp, anchored, n, best, worst],
  )
  const bwmProg = useMemo(() => (isAhp ? null : bwmProgress(judgements, n)), [isAhp, judgements, n])
  const ahpProg = useMemo(
    () => (isAhp ? ahpProgress(core, judgements, params as AhpParams) : null),
    [isAhp, core, judgements, params],
  )
  const complete = result.value !== null

  const answers = isAhp ? null : bwmAnswers(judgements)
  const rawWeights = isAhp ? (ahpProg?.weights ?? null) : (bwmProg?.weights ?? null)
  const provisional = isAhp ? (ahpProg?.provisional ?? true) : (bwmProg?.provisional ?? false)
  // A criterion with no comparison yet is left out of the provisional weights: the panel shows "—", not 0.
  const shown =
    rawWeights?.map((w, j) => {
      if (isAhp) return Number.isFinite(w) ? w : undefined
      return answers?.bestToOthers[j] === null && answers.othersToWorst[j] === null ? undefined : w
    }) ?? null

  const qMode = (q: Question, j: Judgements = judgements): Mode => (isAhp ? { kind: 'ahp' } : modeFor(q, j))

  // The question on screen, valid only for this method and anchor pair; null: the first unanswered one (or summary).
  const key = isAhp ? `ahp-${n}` : `bwm-${n}-${best}-${worst}`
  const [at, setAt] = useState<{ key: string; index: number | null }>({ key, index: null })
  if (at.key !== key) setAt({ key, index: null })
  const chosen = at.key === key && at.index !== null && at.index < questions.length ? at.index : null
  const index = chosen ?? (complete ? null : nextUnanswered(questions, judgements.pairs, (q) => qMode(q), -1))
  const question = index === null ? undefined : questions[index]
  const mode = question ? qMode(question) : undefined

  const worstPair = isAhp && ahpProg?.inconsistent ? ahpProg.worstPair : null
  const bwmFlagged = isAhp ? null : (bwmProg?.flagged ?? null)
  const bwmSuggestion = isAhp ? null : (bwmProg?.suggestion ?? null)

  const isFlagged = (q: Question) => {
    const ans = judgements.pairs[q.a]?.[q.b] ?? null
    if (isAhp) {
      return (
        worstPair !== null &&
        q.a === worstPair.i &&
        q.b === worstPair.k &&
        withinCap(worstPair.suggested, qMode(q)) !== null &&
        Math.abs(worstPair.suggested - (ans ?? 0)) > 1e-9
      )
    }
    return (
      bwmFlagged !== null &&
      bwmSuggestion !== null &&
      withinCap(bwmSuggestion.value, qMode(q)) !== null &&
      Math.abs(bwmSuggestion.value - (ans ?? 0)) > 1e-9 &&
      (bwmSuggestion.side === 'bestToOthers' ? q.a === best && q.b === bwmFlagged : q.a === bwmFlagged && q.b === worst)
    )
  }
  const flaggedIndex = questions.findIndex(isFlagged)
  const value = question ? (judgements.pairs[question.a]?.[question.b] ?? null) : null
  const aBW = !isAhp && worst !== null ? (answers?.bestToOthers[worst] ?? null) : null
  const currentSide =
    !isAhp && question && bwmFlagged !== null
      ? question.a === best && question.b === bwmFlagged
        ? 'bestToOthers'
        : question.a === bwmFlagged && question.b === worst
          ? 'othersToWorst'
          : null
      : null
  const bwmQuestionSuggestion =
    currentSide !== null && bwmFlagged !== null
      ? bwmSuggestion && bwmSuggestion.side === currentSide
        ? bwmSuggestion.value
        : (() => {
            const otherVal =
              currentSide === 'bestToOthers'
                ? (answers?.othersToWorst[bwmFlagged] ?? null)
                : (answers?.bestToOthers[bwmFlagged] ?? null)
            return aBW !== null && otherVal !== null && otherVal > 0
              ? Math.min(aBW, Math.max(1, Math.round(aBW / otherVal)))
              : null
          })()
      : null
  const suggestedValue = isAhp ? (worstPair?.suggested ?? null) : bwmQuestionSuggestion
  const flag =
    question &&
    mode &&
    suggestedValue !== null &&
    (isAhp ? isFlagged(question) : currentSide !== null) &&
    withinCap(suggestedValue, mode) !== null &&
    Math.abs(suggestedValue - (value ?? 0)) > 1e-9
      ? { suggestion: suggestedValue }
      : null

  // Answers commit synchronously: the card arms its focus move for this frame only.
  const answer = (v: Ratio) => {
    if (!question || index === null) return
    setJudgement(question.a, question.b, v)
    if (!isAhp && v === 1 && best !== null && worst !== null && ((question.a === best && question.b === worst) || (question.a === worst && question.b === best))) {
      for (let j = 0; j < n; j++) {
        if (j !== best && j !== worst) {
          setJudgement(best, j, 1)
          setJudgement(j, worst, 1)
        }
      }
    }
    const next = useWorkbench.getState().judgements ?? judgements
    setAt({ key, index: nextUnanswered(questions, next.pairs, (q) => qMode(q, next), index) })
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
      : (el?.querySelector<HTMLElement>('[data-values] [aria-checked="true"]') ??
        el?.querySelector<HTMLElement>('[data-values] button:not(:disabled)'))
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
    use: (v) => t('workbench.pairwise.use', { value: v }),
  }
  const panelLabels: JudgementPanelLabels = {
    title: t('workbench.pairwise.panel.title'),
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

  const consistency: Consistency | null = isAhp
    ? ahpProg && ahpProg.cr !== null && ahpProg.threshold !== null
      ? { value: ahpProg.cr, threshold: ahpProg.threshold, approximate: false, inclusive: true }
      : null
    : bwmProg && bwmProg.crInput !== null && bwmProg.threshold !== null && aBW !== 1
      ? { value: bwmProg.crInput, threshold: bwmProg.threshold.value, approximate: bwmProg.threshold.approximate }
      : null

  const flaggedCriterion = isAhp ? (worstPair ? worstPair.i : null) : bwmFlagged
  const flaggedLabel = isAhp
    ? worstPair
      ? t('workbench.pairwise.list.pair', { a: names[worstPair.i], b: names[worstPair.k] })
      : null
    : undefined

  const jump = (i: number) => setAt({ key, index: i })
  const onSelectCriterion = (c: number) => {
    if (isAhp) return
    const side = c === bwmFlagged && bwmSuggestion ? bwmSuggestion.side : 'bestToOthers'
    const idx = questions.findIndex((q) => (side === 'bestToOthers' ? q.a === best && q.b === c : q.a === c && q.b === worst))
    if (idx >= 0) jump(idx)
  }
  const list = (className?: string) => (
    <PairList
      questions={questions}
      answers={questions.map((q) => answerOf(q, judgements.pairs, qMode(q)))}
      current={index ?? -1}
      flagged={flaggedIndex < 0 ? null : flaggedIndex}
      names={names}
      onJump={jump}
      labels={listLabels}
      className={className}
    />
  )
  const Picture = methodViews[method].stage?.Component
  const showAllEqual = isAhp ? (ahpProg?.answered ?? 0) === 0 : !anchored

  return (
    <>
      <section
        id={ids.pairwise}
        tabIndex={-1}
        aria-label={t(`workbench.weightMethod.${method}`)}
        className="flex flex-col gap-6 outline-none"
      >
        {!isAhp && (
          <AnchorPicker
            names={names}
            best={best}
            worst={worst}
            onChange={setAnchors}
            labels={{ best: t('workbench.pairwise.anchors.best'), worst: t('workbench.pairwise.anchors.worst') }}
          />
        )}
        {showAllEqual && (
          <Button variant="ghost" className="self-start" onClick={() => setWeightMethod('equal')}>
            {t('workbench.pairwise.allEqual')}
          </Button>
        )}
        {anchored && Picture && rawWeights && (
          <Suspense fallback={null}>
            <Picture problem={core} weights={rawWeights} params={params} judgements={judgements} />
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
            {(rawWeights || question) && (
              <div className="flex max-w-[480px] min-w-0 flex-col gap-8">
                {rawWeights && (
                  <JudgementPanel
                    names={names}
                    weights={shown}
                    provisional={provisional}
                    consistency={consistency}
                    flagged={flaggedCriterion}
                    flaggedLabel={flaggedLabel}
                    onFlagClick={
                      flaggedIndex >= 0
                        ? () => jump(flaggedIndex)
                        : bwmFlagged !== null
                          ? () => onSelectCriterion(bwmFlagged)
                          : undefined
                    }
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
