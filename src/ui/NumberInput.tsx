import { useState, type ComponentPropsWithRef } from 'react'
import { useNumberFormat } from '../i18n'
import { cn } from './cn'
import { useFieldProps } from './Field'
import { controlClasses, type ControlSize } from './TextInput'

export type NumberInputChange = {
  /** The text as typed. */
  text: string
  /** False when the text is not empty and is not one number. `value` is null then. */
  valid: boolean
  /** True for `1,234` style input that reads differently in TR and EN (see parseLocaleNumber). */
  ambiguous: boolean
}

export type NumberInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'size' | 'value' | 'defaultValue' | 'onChange' | 'type'
> & {
  /** null = empty. */
  value: number | null
  /** Called on every keystroke with the parsed value (null when empty or invalid). */
  onValueChange: (value: number | null, change: NumberInputChange) => void
  /**
   * Fixed decimals when the field is not being edited (weights: 4). Omit to show the value as
   * entered (raw matrix input).
   */
  decimals?: number | undefined
  controlSize?: ControlSize | undefined
  invalid?: boolean | undefined
}

/**
 * Locale-aware number input. Accepts `0,25` and `0.25` in both languages, right-aligned with
 * tabular figures. While focused it keeps the text as typed; on blur it re-formats a valid value
 * and keeps invalid text so the user can fix it (aria-invalid is set meanwhile).
 */
export function NumberInput({
  value,
  onValueChange,
  decimals,
  controlSize,
  invalid,
  className,
  id,
  required,
  onFocus,
  onBlur,
  ...rest
}: NumberInputProps) {
  const nf = useNumberFormat(decimals ?? 4)
  const display = (v: number | null) => (decimals === undefined ? nf.formatRaw(v) : nf.format(v, decimals))
  // Draft text while editing; null means "show the formatted value".
  const [draft, setDraft] = useState<string | null>(null)
  const [prevValue, setPrevValue] = useState(value)
  const parsed = draft === null ? value : nf.parse(draft)
  if (prevValue !== value) {
    setPrevValue(value)
    if (draft !== null && value !== parsed) {
      setDraft(null)
    }
  }
  const activeDraft = prevValue !== value && draft !== null && value !== parsed ? null : draft
  const text = activeDraft ?? display(value)
  const draftInvalid = activeDraft !== null && activeDraft.trim() !== '' && (activeDraft === null ? value : nf.parse(activeDraft)) === null

  const f = useFieldProps({
    id,
    required,
    invalid: invalid || draftInvalid || undefined,
    'aria-describedby': rest['aria-describedby'],
    'aria-invalid': rest['aria-invalid'],
  })

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      {...rest}
      id={f.id}
      required={f.required}
      aria-describedby={f['aria-describedby']}
      aria-invalid={f['aria-invalid']}
      value={text}
      onFocus={(e) => {
        // Show the full-precision value while editing. The text is swapped in the DOM right here
        // and selected, like a spreadsheet cell: Tab, select() and Playwright's fill select the
        // old text around this focus, and swapping the value collapses that selection, so typing
        // appended to it ("0.5" + "0.45" = "0.50.45"). A mouse click still places the caret.
        const el = e.currentTarget
        const next = nf.formatRaw(value)
        if (el.value !== next) {
          el.value = next
          el.select()
        }
        setDraft(next)
        onFocus?.(e)
      }}
      onChange={(e) => {
        const t = e.target.value
        setDraft(t)
        const v = t.trim() === '' ? null : nf.parse(t)
        onValueChange(v, { text: t, valid: t.trim() === '' || v !== null, ambiguous: nf.isAmbiguous(t) })
      }}
      onBlur={(e) => {
        if (!draftInvalid) setDraft(null)
        onBlur?.(e)
      }}
      className={controlClasses({ size: controlSize, invalid: f.invalid, className: cn('num text-right read-only:bg-surface-2', className) })}
    />
  )
}
