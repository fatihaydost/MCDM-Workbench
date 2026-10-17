import { flowIndex } from './geometry'
import s from './illustrations.module.css'

export type StepFlowStep = {
  /** Returned by `onSelect`; use the first core step key of the node (see the flow in src/content/steps/topsis.ts). */
  key: string
  label: string
  /** Core step keys this node stands for; `active` may be any of them. */
  stepKeys?: readonly string[] | undefined
}

export type StepFlowProps = {
  steps: readonly StepFlowStep[]
  /** Current step: a node key or any key in a node's `stepKeys`. */
  active?: string | undefined
  /** Without it the map is a static picture of the steps. */
  onSelect?: ((key: string) => void) | undefined
  labels?: { nav?: string }
  className?: string | undefined
}

/**
 * Map of a worked calculation: small numbered nodes on a hairline, the current one in the accent.
 * Each node is a button (`aria-current="step"` on the active one) that reports its key. Wider
 * than the container it scrolls sideways inside itself.
 */
export function StepFlow({ steps, active, onSelect, labels, className }: StepFlowProps) {
  const current = flowIndex(steps, active)
  return (
    <nav className={[s.flowWrap, className].filter(Boolean).join(' ')} aria-label={labels?.nav ?? 'Calculation steps'}>
      <ol className={s.flow}>
        {steps.map((step, i) => (
          <li key={step.key} className={s.flowItem}>
            <button
              type="button"
              className={s.flowBtn}
              aria-current={i === current ? 'step' : undefined}
              disabled={!onSelect}
              onClick={() => onSelect?.(step.key)}
            >
              <span className={s.node} aria-hidden="true">
                {i + 1}
              </span>
              <span className={s.flowLabel}>{step.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
