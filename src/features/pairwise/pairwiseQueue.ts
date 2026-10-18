import type { Judgements, Ratio } from '../../core'

export type Question = { a: number; b: number; fixed?: 'a' }
export type Mode = { kind: 'ahp' } | { kind: 'bwm'; cap: number }
type Pairs = Judgements['pairs']

/** Spanning path first (0–1, 1–2, …), then the remaining pairs by distance. */
export function ahpQuestions(n: number): Question[] {
  const out: Question[] = []
  for (let d = 1; d < n; d++) for (let a = 0; a + d < n; a++) out.push({ a, b: a + d })
  return out
}

/** (B, W), then (B, j), then (j, W); the first criterion always wins. */
export function bwmQuestions(n: number, best: number, worst: number): Question[] {
  const rest = Array.from({ length: n }, (_, j) => j).filter((j) => j !== best && j !== worst)
  return [
    { a: best, b: worst },
    ...rest.map((j) => ({ a: best, b: j })),
    ...rest.map((j) => ({ a: j, b: worst })),
  ].map((q): Question => ({ ...q, fixed: 'a' }))
}

/** BWM cap: 9 for the anchor question, else a_BW (9 while unanswered). */
export function modeFor(q: Question, j: Judgements): Mode {
  if (j.best === null || j.worst === null) return { kind: 'bwm', cap: 9 }
  const aBW = j.pairs[j.best]![j.worst]
  const anchor = q.a === j.best && q.b === j.worst
  const ok = aBW !== null && Number.isInteger(aBW) && aBW! >= 1 && aBW! <= 9
  return { kind: 'bwm', cap: anchor || !ok ? 9 : aBW! }
}

export function answerOf(q: Question, pairs: Pairs, mode: Mode): Ratio | null {
  const v = pairs[q.a]?.[q.b] ?? null
  if (mode.kind === 'ahp') return v
  return v !== null && Number.isInteger(v) && v >= 1 && v <= mode.cap ? v : null
}

export function nextUnanswered(
  questions: readonly Question[],
  pairs: Pairs,
  modeOf: (q: Question) => Mode,
  from: number,
): number | null {
  const len = questions.length
  for (let s = 1; s <= len; s++) {
    const i = (from + s) % len
    if (answerOf(questions[i]!, pairs, modeOf(questions[i]!)) === null) return i
  }
  return null
}

export function progress(questions: readonly Question[], pairs: Pairs, modeOf: (q: Question) => Mode) {
  const answered = questions.filter((q) => answerOf(q, pairs, modeOf(q)) !== null).length
  return { answered, total: questions.length }
}
