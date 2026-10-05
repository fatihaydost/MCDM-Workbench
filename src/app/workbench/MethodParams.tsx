import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParamDescriptor } from '../../core'
import { useMethodParams, useWorkbench } from '../../state/workbench'
import { NumberInput, SegmentedControl } from '../../ui'
import { paramLabel, paramOptionLabel, tr } from './shared'

/**
 * The options of the selected method, rendered from its descriptor (ADDING-A-METHOD.md §11): a choice of two to four
 * options as a segmented control, a number as a number input. Labels come from workbench.params.<id>.<key>; an
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
