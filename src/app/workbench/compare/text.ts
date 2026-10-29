import { useTranslation } from 'react-i18next'
import i18n from '../../../i18n'
import en from '../../../i18n/compare.en.json'
import tr from '../../../i18n/compare.tr.json'

/**
 * The Compare stage's texts are a namespace of their own, added when this chunk loads, so the /app entry does not
 * carry them. Both languages are added at once: switching language needs no load.
 */
export const COMPARE_NS = 'compare'

export const ECHO_NOTE_KEYS = new Set([
  'copras_saw',
  'copras_ahp-ranking',
  'ahp-ranking_copras',
  'ahp-ranking_saw',
  'saw_ahp-ranking',
  'vikor_mabac',
  'mabac_vikor',
  'promethee-ii_mabac',
  'mabac_promethee-ii',
  'vikor_promethee-ii',
  'promethee-ii_vikor',
  'waspas_saw',
  'waspas_marcos',
  'marcos_saw',
])

export function ensureCompareBundle(): void {
  if (i18n.isInitialized && !i18n.hasResourceBundle('en', COMPARE_NS)) {
    i18n.addResourceBundle('en', COMPARE_NS, en)
    i18n.addResourceBundle('tr', COMPARE_NS, tr)
  }
}

ensureCompareBundle()

/** `t` for the compare namespace (typed from compare.en.json). */
export function useCompareText() {
  ensureCompareBundle()
  return useTranslation(COMPARE_NS)
}
