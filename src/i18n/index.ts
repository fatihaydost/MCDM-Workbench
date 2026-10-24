import i18n from 'i18next'
import { useCallback, useMemo } from 'react'
import { initReactI18next, useTranslation } from 'react-i18next'
import type en from './en.json'
import type compare from './compare.en.json'
import type robustness from './robustness.en.json'
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

const bundles: Partial<Record<Lang, typeof en>> = {}
const loading: Partial<Record<Lang, Promise<typeof en>>> = {}

/** Loads a language bundle on demand so the initial page load fetches only the active language. */
export function loadLanguage(lang: Lang): Promise<typeof en> {
  if (bundles[lang]) return Promise.resolve(bundles[lang]!)
  loading[lang] ??= (lang === 'tr' ? import('./tr.json') : import('./en.json')).then((m) => {
    const data = m.default as typeof en
    bundles[lang] = data
    if (i18n.isInitialized) i18n.addResourceBundle(lang, 'translation', data, true, true)
    return data
  })
  return loading[lang]!
}

/** Starts loading both language bundles in the background (e.g. when pointing at the language switch). */
export function preloadLanguages(): void {
  void loadLanguage('en')
  void loadLanguage('tr')
}

/** Registers preloaded language bundles synchronously (used by the build-time SSR prerender). */
export function registerLanguages(resources: Partial<Record<Lang, typeof en>>): void {
  for (const [l, data] of Object.entries(resources) as [Lang, typeof en][]) {
    if (!data) continue
    bundles[l] = data
    if (i18n.isInitialized) i18n.addResourceBundle(l, 'translation', data, true, true)
  }
}

function applyToDocument(lang: Lang): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
}

/** Initializes i18next once. Called from main.tsx before the first render. */
export function initI18n(lang: Lang = detectLanguage()): typeof i18n {
  if (!i18n.isInitialized) {
    const resources: Record<string, { translation: typeof en }> = {}
    if (bundles.en) resources.en = { translation: bundles.en }
    if (bundles.tr) resources.tr = { translation: bundles.tr }
    void i18n
      .use({
        type: 'backend' as const,
        read(language: string, _ns: string, cb: (err: unknown, data: unknown) => void) {
          if (isLang(language)) loadLanguage(language).then((d) => cb(null, d), (e) => cb(e, null))
          else cb(null, {})
        },
      })
      .use(initReactI18next)
      .init({
        resources,
        partialBundledLanguages: true,
        lng: lang,
        fallbackLng: false,
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
  if (bundles[lang] || i18n.hasResourceBundle(lang, 'translation')) {
    void i18n.changeLanguage(lang)
  } else {
    void loadLanguage(lang).then(() => i18n.changeLanguage(lang))
  }
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
