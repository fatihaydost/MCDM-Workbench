import { useTranslation } from 'react-i18next'
import i18n from '../../../i18n'
import en from '../../../i18n/compare.en.json'
import tr from '../../../i18n/compare.tr.json'

/**
 * The Compare stage's texts are a namespace of their own, added when this chunk loads, so the /app entry does not
 * carry them. Both languages are added at once: switching language needs no load.
 */
export const COMPARE_NS = 'compare'

if (!i18n.hasResourceBundle('en', COMPARE_NS)) {
  i18n.addResourceBundle('en', COMPARE_NS, en)
  i18n.addResourceBundle('tr', COMPARE_NS, tr)
}

/** `t` for the compare namespace (typed from compare.en.json). */
export function useCompareText() {
  return useTranslation(COMPARE_NS)
}
