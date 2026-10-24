/**
 * Build-time prerender (vite.config.ts `spaFallback`): the home page, /methods and every method page
 * in both languages, so the first paint shows the page before any script has run, and crawlers read
 * the content and a title and description of their own. Runs in Node from an SSR build; the
 * browser build never imports this file.
 */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { methodContent } from '../content/methods'
import type { MethodId } from '../content/types'
import { initI18n, registerLanguages, type Lang } from '../i18n'
import i18n from '../i18n'
import en from '../i18n/en.json'
import tr from '../i18n/tr.json'
import { App, preloadRoute, ROUTER_BASE } from './App'

registerLanguages({ en, tr })

/** A static route: its path (without the base), its title and description, and whether its body is prerendered. */
export type RouteMeta = { path: string; title: string; description: string; prerender: boolean }

/**
 * Every route that gets its own `index.html`, with the English title and description (the pages
 * set the Turkish ones at runtime, as they do now). The workbench is not prerendered: what it shows
 * depends on the visitor's saved matrix.
 */
export function routes(): RouteMeta[] {
  initI18n('en')
  const t = i18n.getFixedT('en')
  return [
    { path: '/', title: t('landing.meta.title'), description: t('landing.meta.description'), prerender: true },
    { path: '/app', title: t('workbench.meta.title'), description: t('workbench.meta.description'), prerender: false },
    { path: '/methods', title: t('methods.meta.title'), description: t('methods.meta.description'), prerender: true },
    ...(Object.keys(methodContent) as MethodId[]).map((id) => ({
      path: `/methods/${id}`,
      title: t('methods.meta.methodTitle', { name: methodContent[id].name.en }),
      description: methodContent[id].en.summary,
      prerender: true,
    })),
  ]
}

/** Title of the 404 page (unknown addresses). */
export function notFoundTitle(): string {
  initI18n('en')
  return i18n.getFixedT('en')('common.notFound.metaTitle')
}

export async function render(lang: Lang, path = '/'): Promise<string> {
  initI18n(lang)
  await i18n.changeLanguage(lang)
  if (!(await preloadRoute(path))) throw new Error(`prerender: ${path} is not a prerendered route`)
  const html = renderToString(
    <StrictMode>
      <App ssrPath={`${ROUTER_BASE}${path}`} />
    </StrictMode>,
  )
  // A page that suspended would come out as the loading fallback: fail the build instead.
  if (html.includes('aria-busy="true"')) throw new Error(`prerender: ${path} (${lang}) rendered its loading state`)
  return html
}
