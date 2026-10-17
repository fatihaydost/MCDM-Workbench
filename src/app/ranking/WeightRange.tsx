import type { CSSProperties, KeyboardEvent } from 'react'
import { snapWeight, stepWeight } from './order'
import s from './ranking.module.css'

/** Thumb of the range input (ranking.module.css --thumb): its centre runs from thumb/2 to width - thumb/2. */
export const THUMB = 16

const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }

export type WeightRangeProps = {
  id: string
  value: number
  /** The starting weight, marked on the track. */
  base: number
  /** The exact value for assistive technology (aria-valuetext). */
  valueText: string
  /** Grid of the slider (default 0.01; WASPAS λ 0.1). */
  step?: number
  /** Called with the weight on the grid; `repeat` is true for a held-down key (key repeat). */
  onChange: (v: number, repeat: boolean) => void
  /** Name, when no `<label htmlFor>` points at the input. */
  label?: string
  className?: string
  style?: CSSProperties
}

/**
 * A weight as a native range input, 0..1 in 0.01 steps (or `step`), with a tick at the starting weight. Keys step from a value
 * off the grid onto the next grid point first (stepWeight), so the starting weight 0.1872 goes to 0.19 or 0.18.
 */
export function WeightRange({ id, value, base, valueText, step = 0.01, onChange, label, className, style }: WeightRangeProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key in KEY_STEPS) {
      e.preventDefault()
      onChange(stepWeight(value, KEY_STEPS[e.key]!, step), e.repeat)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      onChange(e.key === 'Home' ? 0 : 1, e.repeat)
    }
  }

  return (
    <div className={className ? `${s.slider} ${className}` : s.slider} style={style}>
      <input
        id={id}
        type="range"
        className={s.range}
        min={0}
        max={1}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(e) => onChange(snapWeight(Number(e.target.value), step), false)}
        onKeyDown={onKeyDown}
      />
      <span aria-hidden className={s.baseTick} style={{ left: `calc(${THUMB / 2}px + ${base} * (100% - ${THUMB}px))` }} />
    </div>
  )
}
