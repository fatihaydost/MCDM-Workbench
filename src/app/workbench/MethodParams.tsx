import { useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParamDescriptor } from '../../core'
import { useNumberFormat } from '../../i18n'
import { snapWeight } from '../ranking/order'
import s from '../ranking/ranking.module.css'
import { THUMB, WeightRange } from '../ranking/WeightRange'
import { useMethodParams, useWorkbench } from '../../state/workbench'
import { NumberInput, SegmentedControl } from '../../ui'
import { paramLabel, paramOptionLabel, tr } from './shared'

/**
 * The options of the selected method, rendered from its descriptor (ADDING-A-METHOD.md §11): a choice of two to four
 * options as a segmented control, a number in [0, 1] as a slider on the descriptor's grid (VIKOR v 0.01, WASPAS λ 0.1; the tick marks the
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
  const rawParams = useWorkbench((s) => s.methodParams?.[methodId])
  const setMethodParam = useWorkbench((s) => s.setMethodParam)
  const labelId = useId()
  const label = paramLabel(methodId, d, t)
  const value = params[d.key]

  if (d.kind === 'number' && d.min !== undefined && d.max !== undefined) {
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

  const hasCustomSwaraS = methodId === 'swara' && d.key === 'stepRatio' && Array.isArray(rawParams?.s)
  const hasCustomElectreThresholds =
    methodId === 'electre-iii' &&
    d.key === 'thresholdPreset' &&
    (Array.isArray(rawParams?.q) || Array.isArray(rawParams?.p) || Array.isArray(rawParams?.v))
  const hasCustomPrometheeFuncs =
    methodId === 'promethee-ii' && d.key === 'preferenceFunction' && Array.isArray(rawParams?.criteriaFunctions)
  const hasCustomOverride = hasCustomSwaraS || hasCustomElectreThresholds || hasCustomPrometheeFuncs
  const current = hasCustomOverride ? '' : typeof value === 'string' ? value : d.default
  const hintKey = `workbench.params.${methodId}.${d.key}Hints.${current}`
  return (
    <div className="flex flex-col gap-1">
      <span id={labelId} className="text-13 font-medium text-text-2">
        {label}
      </span>
      <SegmentedControl<string>
        aria-label={label}
        value={current}
        onValueChange={(v) => {
          if (hasCustomElectreThresholds) {
            setMethodParam(methodId, 'q', undefined)
            setMethodParam(methodId, 'p', undefined)
            setMethodParam(methodId, 'v', undefined)
            setMethodParam(methodId, 'mode', undefined)
          } else if (hasCustomPrometheeFuncs) {
            setMethodParam(methodId, 'criteriaFunctions', undefined)
          } else if (hasCustomSwaraS) {
            setMethodParam(methodId, 's', undefined)
          }
          setMethodParam(methodId, d.key, v)
        }}
        options={d.options.map((o) => ({ value: o, label: paramOptionLabel(methodId, d, o, t) }))}
        size="sm"
        className="self-start"
      />
      {hasCustomSwaraS ? (
        <p className="text-13 text-text-3">
          {tr(t, 'workbench.params.swara.stepRatioHints.custom', {
            defaultValue: i18n.language?.startsWith('tr')
              ? 'Özel adım oranları s etkin; ön ayara dönmek için bir seçenek seçin.'
              : 'Custom step ratios s active; pick a preset to replace them.',
          })}
        </p>
      ) : hasCustomElectreThresholds ? (
        <p className="text-13 text-text-3">
          {tr(
            t,
            i18n.exists('workbench.params.electre-iii.thresholdPresetHints.custom')
              ? 'workbench.params.electre-iii.thresholdPresetHints.custom'
              : 'workbench.params.thresholdPresetHints.custom',
            {
              defaultValue: i18n.language?.startsWith('tr')
                ? 'Özel kriter eşikleri (q, p, v) etkin; ön ayara dönmek için bir seçenek seçin.'
                : 'Custom per-criterion thresholds (q, p, v) active; pick a preset to replace them.',
            },
          )}
        </p>
      ) : hasCustomPrometheeFuncs ? (
        <p className="text-13 text-text-3">
          {tr(
            t,
            i18n.exists('workbench.params.promethee-ii.preferenceFunctionHints.custom')
              ? 'workbench.params.promethee-ii.preferenceFunctionHints.custom'
              : 'workbench.params.preferenceFunctionHints.custom',
            {
              defaultValue: i18n.language?.startsWith('tr')
                ? 'Özel kriter tercih fonksiyonları etkin; ön ayara dönmek için bir seçenek seçin.'
                : 'Custom per-criterion preference functions active; pick a preset to replace them.',
            },
          )}
        </p>
      ) : (
        i18n.exists(hintKey) && <p className="text-13 text-text-3">{tr(t, hintKey)}</p>
      )}
    </div>
  )
}

function snapRange(v: number, min: number, max: number, step = 0.01): number {
  if (!Number.isFinite(v)) return min
  const k = Math.round(1 / step)
  return Math.min(max, Math.max(min, Math.round(v * k) / k))
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
  const isUnit = d.min === 0 && d.max === 1
  // An off-grid saved value (older state, a hand-edited one) is shown on the grid and written back, so the readout, the
  // ranking and the pictures all use the same value.
  const snapped = isUnit ? snapWeight(value, d.step) : snapRange(value, d.min, d.max, d.step)
  useEffect(() => {
    if (snapped !== value) onChange(snapped)
  }, [snapped, value, onChange])
  const decimals = d.step >= 1 ? 0 : d.step >= 0.1 ? 1 : d.step >= 0.01 ? 2 : 3
  const text = format(snapped, isUnit ? 2 : Math.max(2, decimals))
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
      {isUnit ? (
        <WeightRange id={id} value={snapped} base={d.default} valueText={text} step={d.step} onChange={(v) => onChange(snapWeight(v, d.step))} />
      ) : (
        <div className="flex items-center gap-3">
          <div className={`${s.slider} flex-1`}>
            <input
              id={id}
              type="range"
              className={s.range}
              min={d.min}
              max={d.max}
              step={d.step}
              value={snapped}
              aria-valuetext={text}
              onChange={(e) => onChange(snapRange(Number(e.target.value), d.min, d.max, d.step))}
            />
            {d.max > d.min && (
              <span
                aria-hidden
                className={s.baseTick}
                style={{ left: `calc(${THUMB / 2}px + ${(d.default - d.min) / (d.max - d.min)} * (100% - ${THUMB}px))` }}
              />
            )}
          </div>
          <NumberInput
            aria-label={label}
            value={snapped}
            decimals={Math.max(2, decimals)}
            controlSize="sm"
            className="w-24"
            onValueChange={(v) => {
              if (v !== null && v >= d.min && v <= d.max) onChange(v)
            }}
          />
        </div>
      )}
      {i18n.exists(`${ends}.min`) && (
        <div className="flex justify-between gap-4 text-12 text-text-3">
          <span>{tr(t, `${ends}.min`)}</span>
          <span className="text-right">{tr(t, `${ends}.max`)}</span>
        </div>
      )}
    </div>
  )
}
