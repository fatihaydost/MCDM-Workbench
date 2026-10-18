import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { useId } from 'react'
import s from './pairwise.module.css'

export type AnchorLabels = {
  /** "Most important (best)" */
  best: string
  /** "Least important (worst)" */
  worst: string
}

export type AnchorPickerProps = {
  names: readonly string[]
  best: number | null
  worst: number | null
  onChange: (best: number | null, worst: number | null) => void
  labels: AnchorLabels
  className?: string | undefined
}

/** BWM's two anchors as radio groups of criterion chips; the best criterion cannot also be the worst. */
export function AnchorPicker({ names, best, worst, onChange, labels, className }: AnchorPickerProps) {
  const id = useId()
  const group = (which: 'best' | 'worst') => {
    const current = which === 'best' ? best : worst
    return (
      <div className={s.anchorGroup}>
        <p id={`${id}-${which}`} className={s.anchorLabel}>
          {labels[which]}
        </p>
        <ToggleGroup.Root
          type="single"
          value={current === null ? '' : String(current)}
          aria-labelledby={`${id}-${which}`}
          className={s.chips}
        >
          {names.map((name, i) => (
            <ToggleGroup.Item
              key={i}
              value={String(i)}
              disabled={which === 'worst' && i === best}
              className={s.chip}
              onClick={() =>
                which === 'best' ? onChange(i, worst === i ? null : worst) : onChange(best, i)
              }
            >
              {name}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>
    )
  }
  return (
    <div className={[s.anchors, className].filter(Boolean).join(' ')}>
      {group('best')}
      {group('worst')}
    </div>
  )
}
