import { WarningCircle } from '@phosphor-icons/react'
import type { Ratio } from '../../core'
import { answerText } from './PairwiseCard'
import type { Question } from './pairwiseQueue'
import s from './pairwise.module.css'

export type PairListLabels = {
  /** Name of the list: "All pairs". */
  title: string
  /** "Price vs Comfort" */
  pair: (a: string, b: string) => string
  /** Hidden text after a flagged pair: "check this answer". */
  flagged: string
}

export type PairListProps = {
  questions: readonly Question[]
  /** The shown answer per question (null = unanswered), from `answerOf`. */
  answers: readonly (Ratio | null)[]
  current: number
  /** Index of the flagged question, or null. */
  flagged: number | null
  names: readonly string[]
  onJump: (index: number) => void
  labels: PairListLabels
  className?: string | undefined
}

/** Every question with its answer or "—"; a tap jumps to it. */
export function PairList({ questions, answers, current, flagged, names, onJump, labels, className }: PairListProps) {
  return (
    <nav aria-label={labels.title} className={[s.list, className].filter(Boolean).join(' ')}>
      <p className={s.panelTitle}>{labels.title}</p>
      <ol className={s.listItems}>
        {questions.map((q, i) => (
          <li key={`${q.a}-${q.b}`}>
            <button
              type="button"
              className={s.listItem}
              aria-current={i === current ? 'step' : undefined}
              onClick={() => onJump(i)}
            >
              <span className={s.listPair}>{labels.pair(names[q.a]!, names[q.b]!)}</span>
              <span className={s.listAnswer}>{answerText(q, answers[i] ?? null, names)}</span>
              {i === flagged && (
                <>
                  <WarningCircle aria-hidden weight="bold" className={s.flagIcon} />
                  <span className="sr-only">{labels.flagged}</span>
                </>
              )}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
