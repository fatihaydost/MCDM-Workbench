/**
 * Motion tokens for the Web Animations API (docs/design/MOTION.md): durations and easing come from tokens.css, read
 * as the page resolves them, so reduced motion (all durations 0ms) turns every animation off in one place.
 */

export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A duration token ("320ms", "0.32s") in milliseconds; 0 when it cannot be read. */
export function tokenMs(el: Element, name: string): number {
  const raw = getComputedStyle(el).getPropertyValue(name).trim()
  const v = Number.parseFloat(raw)
  if (!Number.isFinite(v)) return 0
  return raw.endsWith('ms') ? v : raw.endsWith('s') ? v * 1000 : v
}

export function tokenEase(el: Element): string {
  return getComputedStyle(el).getPropertyValue('--ease').trim() || 'ease'
}

/** The vertical offset an element is painted at right now (a running animation's transform included). */
export function paintedOffsetY(el: Element): number {
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  return new DOMMatrixReadOnly(t).m42
}
