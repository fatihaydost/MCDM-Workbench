import i18n from 'i18next'
import { useCallback, useMemo } from 'react'
import { initReactI18next, useTranslation } from 'react-i18next'
import en from './en.json'
import type compare from './compare.en.json'
import type robustness from './robustness.en.json'
import tr from './tr.json'
import { detectLanguage, isLang, LANG_STORAGE_KEY, type Lang } from './lang'
import { formatNumber, formatRaw, isAmbiguousNumber, parseLocaleNumber } from './number'

export { LANGS, detectLanguage, isLang, type Lang } from './lang'
export { formatNumber, formatRaw, isAmbiguousNumber, numberFormatter, parseLocaleNumber } from './number'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    // `robustness` and `compare` are added by their stage's own chunk (src/app/workbench/<stage>/text.ts).
    resources: { translation: typeof en; robustness: typeof robustness; compare: typeof compare }
  }
}

function applyToDocument(lang: Lang): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
}

/** Initializes i18next once. Called from main.tsx before the first render. */
export function initI18n(lang: Lang = detectLanguage()): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, tr: { translation: tr } },
      lng: lang,
      fallbackLng: 'en',
      supportedLngs: ['en', 'tr'],
      interpolation: { escapeValue: false },
      returnNull: false,
      initAsync: false,
    })
    applyToDocument(lang)
    i18n.on('languageChanged', (l) => {
      if (isLang(l)) applyToDocument(l)
    })
  }
  return i18n
}

/** Switches the UI language, saves it and updates `<html lang>`. */
export function setLanguage(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
  void i18n.changeLanguage(lang)
}

/** Active language and a setter. Re-renders on change. */
export function useLang(): [Lang, (lang: Lang) => void] {
  const { i18n: inst } = useTranslation()
  const lang: Lang = isLang(inst.resolvedLanguage) ? inst.resolvedLanguage : 'en'
  return [lang, setLanguage]
}

export type NumberFormat = {
  lang: Lang
  /** Fixed decimals (default from the hook argument). null/NaN give ''. */
  format: (value: number | null | undefined, decimals?: number) => string
  /** Raw input as entered: shortest digits, locale separator, no grouping. */
  formatRaw: (value: number | null | undefined) => string
  /** Accepts both `0,25` and `0.25`; the active language breaks the `1,234` tie. */
  parse: (text: string) => number | null
  isAmbiguous: (text: string) => boolean
}

/**
 * Number formatting for the active language (TR `0,2345`, EN `0.2345`).
 * `decimals` is the default for `format`; weights and scores use 4.
 */
export function useNumberFormat(decimals = 4): NumberFormat {
  const [lang] = useLang()
  const format = useCallback(
    (value: number | null | undefined, d: number = decimals) => formatNumber(value, lang, d),
    [lang, decimals],
  )
  return useMemo(
    () => ({
      lang,
      format,
      formatRaw: (value) => formatRaw(value, lang),
      parse: (text) => parseLocaleNumber(text, lang),
      isAmbiguous: isAmbiguousNumber,
    }),
    [lang, format],
  )
}

export default i18n
