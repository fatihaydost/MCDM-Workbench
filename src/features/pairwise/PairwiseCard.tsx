import { CaretLeft, WarningCircle } from '@phosphor-icons/react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Ratio } from '../../core'
import type { Mode, Question } from './pairwiseQueue'
import s from './pairwise.module.css'

/** Words on the odd scale values (1 equal, 3 moderately, 5 strongly, 7 very strongly, 9 extremely). */
export type ScaleWords = Record<1 | 3 | 5 | 7 | 9, string>

export type PairwiseLabels = {
  /** AHP heading: "Which matters more?" */
  question: string
  /** BWM heading, the side is given: "How much more important is Price than Comfort?" */
  fixed: (a: string, b: string) => string
  /** Name of the side row: "Which matters more". */
  sides: string
  /** Name of the value grid: "By how much". */
  values: string
  /** Name of the `=` radio: "Equally important". */
  equal: string
  words: ScaleWords
  /** Full name of a value radio: "5, strongly more important". */
  valueName: (v: number) => string
  /** The group's description: "4 / 10". */
  progress: (n: number, total: number) => string
  back: string
  /** Title of a BWM value above the cap: "At most 3". */
  atMost: (cap: number) => string
  /** "Your other answers suggest Price ▸ 3" (the answer text is passed in). */
  suggest: (answer: string) => string
  /** "Use 3" */
  use: (value: string) => string
}

export type PairwiseCardProps = {
  question: Question
  mode: Mode
  names: readonly string[]
  /** The stored pairs[a][b], or null. */
  value: Ratio | null
  /** 0-based position of the question in its queue. */
  position: { index: number; total: number }
  flag?: { suggestion: Ratio } | null | undefined
  /** v from a's side: v when a wins, 1 / v when b wins, 1 for equal. */
  onAnswer: (v: Ratio) => void
  onBack: () => void
  labels: PairwiseLabels
  className?: string | undefined
}

type Side = 'a' | 'b' | 'eq'

const isOne = (v: number) => Math.abs(v - 1) < 1e-9
const magnitude = (v: number) => Math.round(v >= 1 ? v : 1 / v)
const sideOf = (v: number): Side => (isOne(v) ? 'eq' : v > 1 ? 'a' : 'b')
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

/** "Comfort ▸ 5", "Price = Comfort", or "—" when unanswered. */
export function answerText(q: Question, v: Ratio | null, names: readonly string[]): string {
  if (v === null) return '—'
  if (isOne(v)) return `${names[q.a]} = ${names[q.b]}`
  return `${names[v > 1 ? q.a : q.b]} ▸ ${magnitude(v)}`
}

/** The answer a card shows: BWM values above the cap count as unanswered (asked again, never rewritten). */
function shownValue(v: Ratio | null, mode: Mode): Ratio | null {
  if (v === null || mode.kind === 'ahp') return v
  return Number.isInteger(v) && v >= 1 && v <= mode.cap ? v : null
}

/**
 * One pairwise question: AHP picks a side then a value (two taps, `=` in one), BWM only a value.
 * Keep the same element across questions (no `key`): after an answer or Back it moves focus to the next card.
 */
export function PairwiseCard({
  question,
  mode,
  names,
  value,
  position,
  flag,
  onAnswer,
  onBack,
  labels,
  className,
}: PairwiseCardProps) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const refocus = useRef(false)
  const qKey = `${question.a}-${question.b}`
  const fixed = mode.kind === 'bwm'
  const answer = shownValue(value, mode)
  const storedSide: Side | null = answer === null ? null : fixed ? 'a' : sideOf(answer)
  // A side tapped on this question; it resets when the question changes.
  const [pick, setPick] = useState<{ key: string; side: Side } | null>(null)
  const side: Side | null = fixed ? 'a' : pick?.key === qKey ? pick.side : storedSide
  const cap = mode.kind === 'bwm' ? mode.cap : 9
  const gridOn = side === 'a' || side === 'b'
  const selected = answer !== null && side === storedSide && gridOn ? String(magnitude(answer)) : ''

  useEffect(() => {
    if (!refocus.current || !root.current) return
    refocus.current = false
    const group = root.current.querySelector(fixed ? '[data-values]' : '[data-sides]')
    const target = group?.querySelector<HTMLElement>('[aria-checked="true"]') ?? group?.querySelector<HTMLElement>('button:not(:disabled)')
    target?.focus()
  }, [qKey, fixed])

  const answerWith = (v: Ratio) => {
    refocus.current = true
    onAnswer(v)
  }
  const back = () => {
    if (position.index === 0) return
    refocus.current = true
    onBack()
  }
  const choose = (n: number) => {
    if (!gridOn || n > cap) return
    answerWith(side === 'b' ? 1 / n : n)
  }
  const pickSide = (next: Side) => {
    if (next === 'eq') answerWith(1)
    else setPick({ key: qKey, side: next })
  }

  const onKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const inGrid = (e.target as HTMLElement).closest('[data-values]')
    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault()
      choose(Number(e.key))
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      back()
    } else if (!fixed && e.key === '=') {
      e.preventDefault()
      pickSide('eq')
    } else if (!fixed && !inGrid && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      // Radio semantics: the arrow picks the side and focus follows it (Radix only moves focus).
      e.preventDefault()
      const next = e.key === 'ArrowLeft' ? 'a' : 'b'
      setPick({ key: qKey, side: next })
      root.current?.querySelector<HTMLElement>(`[data-sides] [data-side="${next}"]`)?.focus()
    } else if (inGrid && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      // The grid is 3 x 3: up and down move by a row, skipping disabled cells.
      e.preventDefault()
      const n = Number((e.target as HTMLElement).dataset.value)
      const to = n + (e.key === 'ArrowUp' ? -3 : 3)
      if (to >= 1 && to <= 9) root.current?.querySelector<HTMLElement>(`[data-values] [data-value="${to}"]:not(:disabled)`)?.focus()
    }
  }

  const flagShown = flag && answer !== null && Math.abs(flag.suggestion - answer) > 1e-9
  const word = (n: number) => labels.words[n as keyof ScaleWords] as string | undefined
  const answered = answer === null ? '' : answerText(question, answer, names)
  const answeredWord = answer === null ? undefined : word(magnitude(answer))

  return (
    <div
      ref={root}
      role="group"
      aria-labelledby={`${id}-q`}
      aria-describedby={`${id}-p`}
      className={[s.card, className].filter(Boolean).join(' ')}
      onKeyDownCapture={onKeyDownCapture}
    >
      <div className={s.track} aria-hidden>
        <div className={s.trackFill} style={{ transform: `scaleX(${(position.index + 1) / position.total})` }} />
      </div>
      <div className={s.head}>
        <p id={`${id}-q`} className={s.question}>
          {fixed ? labels.fixed(names[question.a]!, names[question.b]!) : labels.question}
        </p>
        <p id={`${id}-p`} className={s.progress}>
          {labels.progress(position.index + 1, position.total)}
        </p>
      </div>
      <p className={s.answer}>
        {answered}
        {answeredWord && <span className={s.answerWord}> · {answeredWord}</span>}
      </p>

      {!fixed && (
        <ToggleGroup.Root
          type="single"
          orientation="horizontal"
          value={side ?? ''}
          aria-label={labels.sides}
          className={s.sides}
          data-sides=""
        >
          {(['a', 'eq', 'b'] as const).map((k) => (
            <ToggleGroup.Item
              key={k}
              value={k}
              data-side={k}
              aria-label={k === 'eq' ? labels.equal : undefined}
              className={k === 'eq' ? `${s.side} ${s.equal}` : s.side}
              onClick={() => pickSide(k)}
            >
              {k === 'eq' ? '=' : names[k === 'a' ? question.a : question.b]}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      )}

      <ToggleGroup.Root
        type="single"
        orientation="horizontal"
        value={selected}
        disabled={!gridOn}
        aria-label={labels.values}
        className={s.values}
        data-values=""
      >
        {VALUES.map((n) => {
          const over = n > cap
          return (
            <ToggleGroup.Item
              key={n}
              value={String(n)}
              data-value={n}
              disabled={!gridOn || over}
              title={over ? labels.atMost(cap) : undefined}
              aria-label={labels.valueName(n)}
              className={s.value}
              onClick={() => choose(n)}
            >
              <span className={s.digit}>{n}</span>
              {word(n) && <span className={s.word}>{word(n)}</span>}
            </ToggleGroup.Item>
          )
        })}
      </ToggleGroup.Root>

      {flagShown && (
        <div className={s.flag}>
          <WarningCircle aria-hidden className={s.flagIcon} weight="bold" />
          <p className={s.flagText}>{labels.suggest(fixed ? String(magnitude(flag.suggestion)) : answerText(question, flag.suggestion, names))}</p>
          <button type="button" className={s.button} onClick={() => answerWith(flag.suggestion)}>
            {labels.use(String(magnitude(flag.suggestion)))}
          </button>
        </div>
      )}

      <div className={s.foot}>
        <button type="button" className={s.back} onClick={back} disabled={position.index === 0}>
          <CaretLeft aria-hidden weight="bold" />
          {labels.back}
        </button>
      </div>
    </div>
  )
}
