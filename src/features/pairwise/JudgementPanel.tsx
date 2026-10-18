import { Check, WarningCircle } from '@phosphor-icons/react'
import { useId } from 'react'
import s from './pairwise.module.css'

export type Consistency = { value: number; threshold: number | null; approximate: boolean }

export type JudgementPanelLabels = {
  /** "Weights" */
  title: string
  /** Shown while the weights are provisional (the bars are hatched): "Provisional, more answers refine them". */
  provisional: string
  /** "Consistency (CR)" */
  consistency: string
  /** "not applicable" (n = 2) */
  notApplicable: string
  /** The number shown in the badge: "CR 0.06", "CR^I 0.14 / threshold 0.30", with "≈" when approximate. */
  value: (c: Consistency) => string
  /** "Consistent" */
  ok: string
  /** "Consistency warning: Price" (null when no criterion is named). */
  warning: (name: string | null) => string
  format: (n: number) => string
}

export type JudgementPanelProps = {
  names: readonly string[]
  weights: readonly number[] | null
  provisional: boolean
  /** null: not applicable (n = 2). */
  consistency: Consistency | null
  /** Criterion that causes the inconsistency, or null. */
  flagged: number | null
  labels: JudgementPanelLabels
  className?: string | undefined
}

/** Live weights (bars relative to the largest) and the consistency badge. */
export function JudgementPanel({ names, weights, provisional, consistency, flagged, labels, className }: JudgementPanelProps) {
  const id = useId()
  const max = weights ? Math.max(...weights, 1e-12) : 1
  const over = consistency !== null && consistency.threshold !== null && consistency.value > consistency.threshold
  const flaggedName = flagged === null ? null : (names[flagged] ?? null)
  // The live region only changes text when the state changes, never with each recomputed number.
  const live = consistency === null ? '' : over ? labels.warning(flaggedName) : labels.ok

  return (
    <div role="group" aria-labelledby={`${id}-t`} className={[s.panel, className].filter(Boolean).join(' ')}>
      <p id={`${id}-t`} className={s.panelTitle}>
        {labels.title}
      </p>
      {provisional && (
        <p className={s.note}>
          <span className={`${s.swatch} ${s.hatched}`} aria-hidden />
          {labels.provisional}
        </p>
      )}
      <ul className={s.bars}>
        {names.map((name, i) => {
          const w = weights?.[i]
          return (
            <li key={i} className={s.barRow}>
              <span className={s.barName}>{name}</span>
              <span className={`${s.barTrack} ${provisional ? s.hatched : s.solid}`} aria-hidden>
                {/* The cover shrinks from the right, so the hatching never stretches. */}
                <span className={s.barCover} style={{ transform: `scaleX(${w === undefined ? 1 : 1 - w / max})` }} />
              </span>
              <span className={s.barValue}>{w === undefined ? '—' : labels.format(w)}</span>
            </li>
          )
        })}
      </ul>
      <div className={s.consistency}>
        <span className={s.consistencyLabel}>{labels.consistency}</span>
        {consistency === null ? (
          <span className={s.badge}>{labels.notApplicable}</span>
        ) : (
          <span className={`${s.badge} ${over ? s.badgeWarning : ''}`}>
            {over ? <WarningCircle aria-hidden weight="bold" /> : <Check aria-hidden weight="bold" />}
            <span className={s.badgeValue}>{labels.value(consistency)}</span>
            <span>{over ? labels.warning(flaggedName) : labels.ok}</span>
          </span>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {live}
      </p>
    </div>
  )
}
