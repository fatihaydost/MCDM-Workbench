import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParamDescriptor } from '../../core'
import { useNumberFormat } from '../../i18n'
import { snapWeight } from '../ranking/order'
import { WeightRange } from '../ranking/WeightRange'
import { useMethodParams, useWorkbench } from '../../state/workbench'
import { NumberInput, SegmentedControl } from '../../ui'
import { paramLabel, paramOptionLabel, tr } from './shared'

/**
 * The options of the selected method, rendered from its descriptor (ADDING-A-METHOD.md §11): a choice of two to four
 * options as a segmented control, a number in [0, 1] as a slider on the 0.01 grid (VIKOR v; the tick marks the
 * default, the optional words under its ends come from workbench.params.<id>.<key>Ends.min / .max), any other number
 * as a number input. Labels come from workbench.params.<id>.<key>; an
 * optional one-line hint per choice from workbench.params.<id>.<key>Hints.<option>. Renders nothing for a method
 * without options.
 */
export function MethodParams({ methodId, descriptors }: { methodId: string; descriptors: readonly ParamDescriptor[] | undefined }) {
  if (!descriptors || descriptors.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-x-8 gap-y-3">
      {descriptors.map((d) => (
        <MethodParam key={d.key} methodId={methodId} d={d} />
      ))}
    </div>
  )
}

function MethodParam({ methodId, d }: { methodId: string; d: ParamDescriptor }) {
  const { t, i18n } = useTranslation()
  const params = useMethodParams(methodId)
  const setMethodParam = useWorkbench((s) => s.setMethodParam)
  const labelId = useId()
  const label = paramLabel(methodId, d, t)
  const value = params[d.key]

  if (d.kind === 'number' && d.min === 0 && d.max === 1) {
    return <UnitSlider methodId={methodId} d={d} label={label} value={typeof value === 'number' ? value : d.default} onChange={(v) => setMethodParam(methodId, d.key, v)} />
  }

  if (d.kind === 'number') {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={labelId} className="text-13 font-medium text-text-2">
          {label}
        </label>
        <NumberInput
          id={labelId}
          value={typeof value === 'number' ? value : d.default}
          controlSize="sm"
          className="w-28"
          onValueChange={(v) => {
            if (v !== null && v >= d.min && v <= d.max) setMethodParam(methodId, d.key, v)
          }}
        />
      </div>
    )
  }

  const current = typeof value === 'string' ? value : d.default
  const hintKey = `workbench.params.${methodId}.${d.key}Hints.${current}`
  return (
    <div className="flex flex-col gap-1">
      <span id={labelId} className="text-13 font-medium text-text-2">
        {label}
      </span>
      <SegmentedControl<string>
        aria-label={label}
        value={current}
        onValueChange={(v) => setMethodParam(methodId, d.key, v)}
        options={d.options.map((o) => ({ value: o, label: paramOptionLabel(methodId, d, o, t) }))}
        size="sm"
        className="self-start"
      />
      {i18n.exists(hintKey) && <p className="text-13 text-text-3">{tr(t, hintKey)}</p>}
    </div>
  )
}

function UnitSlider({
  methodId,
  d,
  label,
  value,
  onChange,
}: {
  methodId: string
  d: ParamDescriptor & { kind: 'number' }
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const { t, i18n } = useTranslation()
  const { format } = useNumberFormat(2)
  const id = useId()
  const ends = `workbench.params.${methodId}.${d.key}Ends`
  const text = format(value, 2)
  return (
    <div className="flex w-full max-w-[360px] flex-col gap-1" data-testid={`param-${methodId}-${d.key}`}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-13 font-medium text-text-2">
          {label}
        </label>
        <output htmlFor={id} className="text-14 font-semibold text-text tabular-nums" data-testid="param-value">
          {text}
        </output>
      </div>
      <WeightRange id={id} value={value} base={d.default} valueText={text} onChange={(v) => onChange(snapWeight(v))} />
      {i18n.exists(`${ends}.min`) && (
        <div className="flex justify-between gap-4 text-12 text-text-3">
          <span>{tr(t, `${ends}.min`)}</span>
          <span className="text-right">{tr(t, `${ends}.max`)}</span>
        </div>
      )}
    </div>
  )
}
