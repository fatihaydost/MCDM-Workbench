import { useEffect, useState } from 'react'
import { parseOklch } from './color'
import type { HeatTokens } from './layout'

/** Reads the heatmap's colour tokens as the active theme (or scoped container) resolves them. Null if one is unreadable. */
function readTokens(target?: Element | null): HeatTokens | null {
  if (typeof document === 'undefined') return null
  const css = getComputedStyle(target ?? document.documentElement)
  const get = (name: string) => parseOklch(css.getPropertyValue(name))
  const heat0 = get('--data-heat-0')
  const heat1 = get('--data-heat-1')
  const negative = get('--data-negative')
  const text = get('--text')
  const bg = get('--bg')
  return heat0 && heat1 && negative && text && bg ? { heat0, heat1, negative, text, bg } : null
}

/**
 * The resolved token colours, kept current when the theme or print media changes (the `data-theme`
 * attribute on <html>, the system scheme, print media, or a scoped paper container).
 */
export function useHeatTokens(target?: Element | null): HeatTokens | null {
  const [tokens, setTokens] = useState<HeatTokens | null>(() => readTokens(target))
  useEffect(() => {
    const update = () => setTokens(readTokens(target))
    update()
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] })
    const mqDark = window.matchMedia?.('(prefers-color-scheme: dark)')
    const mqPrint = window.matchMedia?.('print')
    mqDark?.addEventListener?.('change', update)
    mqPrint?.addEventListener?.('change', update)
    return () => {
      mo.disconnect()
      mqDark?.removeEventListener?.('change', update)
      mqPrint?.removeEventListener?.('change', update)
    }
  }, [target])
  return tokens
}
