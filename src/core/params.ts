import type { MethodParams, MethodParamValue, ParamDescriptor } from './types'

/** Whether `value` is a valid setting for the descriptor (a listed option, or a finite number in range). */
export function isValidParam(d: ParamDescriptor, value: unknown): value is MethodParamValue {
  if (d.kind === 'choice') return typeof value === 'string' && d.options.includes(value)
  return typeof value === 'number' && Number.isFinite(value) && value >= d.min && value <= d.max
}

/**
 * The options a method is run with: every declared key, from `raw` when valid, else the default. Unknown keys
 * and invalid values (an old or hand-edited saved state) are dropped, so a method never sees them.
 */
export function resolveParams(
  descriptors: readonly ParamDescriptor[] | undefined,
  raw: Readonly<Record<string, unknown>> | undefined,
): MethodParams {
  const out: Record<string, MethodParamValue> = {}
  for (const d of descriptors ?? []) {
    const v = raw?.[d.key]
    out[d.key] = isValidParam(d, v) ? v : d.default
  }
  return out
}

/** The options that differ from their defaults, in declaration order (for labels like "Entropy (min-max)"). */
export function changedParams(
  descriptors: readonly ParamDescriptor[] | undefined,
  raw: Readonly<Record<string, unknown>> | undefined,
): [ParamDescriptor, MethodParamValue][] {
  const resolved = resolveParams(descriptors, raw)
  return (descriptors ?? []).filter((d) => resolved[d.key] !== d.default).map((d) => [d, resolved[d.key]!])
}
