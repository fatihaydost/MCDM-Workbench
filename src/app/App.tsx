import { lazy, Suspense, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Router, Switch, useLocation } from 'wouter'
import { NotFound } from './routes/NotFound'
import { Workbench } from './routes/Workbench'
import { isMethodId } from '../content/methods/catalog'
import { loadMethod } from '../content/methods/load'
import { preloadable } from './preloadable'
import { TopBar } from './shell/TopBar'

/** Router base without the trailing slash: '' in dev, '/MCDM-Workbench' on GitHub Pages. */
export const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

// Landing and method pages load on demand; each method page loads its own card (content/methods/load.ts).
const LandingPage = preloadable(() => import('./landing/Landing'))
const CatalogPage = preloadable(() => import('./methods/Catalog'))
const MethodPagePage = preloadable<{ id: string }>(() => import('./methods/MethodPage'))
const Landing = LandingPage.Component
const MethodsCatalog = CatalogPage.Component
const MethodPage = MethodPagePage.Component

/** The routes that are prerendered at build time (vite.config.ts): the home page, /methods and every method. */
export const METHOD_PATH = /^\/methods\/([^/]+)\/?$/

/**
 * Loads what the page at `path` (without the base) needs for its first render: its chunk and, on a
 * method page, the method's card. Resolves with false for a path that is not prerendered.
 */
export async function preloadRoute(path: string): Promise<boolean> {
  const p = path.replace(/\/index\.html$/, '/').replace(/(.)\/$/, '$1')
  if (p === '/' || p === '') return LandingPage.preload().then(() => true)
  if (p === '/methods') return CatalogPage.preload().then(() => true)
  const id = METHOD_PATH.exec(p)?.[1]
  // The page, the card and the method's idea picture (a chunk of its own, src/app/methods/views).
  if (id && isMethodId(id)) {
    const page = MethodPagePage.preload().then((m) => (m as typeof import('./methods/MethodPage')).preloadIdea(id))
    return Promise.all([page, loadMethod(id)]).then(() => true)
  }
  return false
}

// Dev-only component gallery; the constant condition drops the chunk from production builds.
const DevUi = import.meta.env.DEV ? lazy(() => import('./dev/DevUi')) : null
const DevIllustrations = import.meta.env.DEV ? lazy(() => import('../features/illustrations/Preview')) : null

/**
 * While a page chunk loads: an empty block of full height, so nothing jumps. It is not `#main`:
 * the page renders its own, and tools that wait for `#main` wait for the real content.
 */
function PageFallback() {
  return <div aria-busy="true" className="min-h-[calc(100dvh-60px)]" />
}

// Back and forward leave the scroll position to the browser; only a link or a pushed route starts at the top.
let poppedTo: string | null = null
if (typeof window !== 'undefined') window.addEventListener('popstate', () => (poppedTo = window.location.pathname))

/**
 * A new page starts at the top (or at its #hash target), as a document load would; wouter keeps the old scroll
 * position. Not on the first load, not when only the query or hash changes, not on back/forward.
 */
function ScrollToTopOnNavigate() {
  const [path] = useLocation()
  const prev = useRef(path)
  useLayoutEffect(() => {
    if (prev.current === path) return
    prev.current = path
    const popped = poppedTo === window.location.pathname
    poppedTo = null
    if (popped) return
    const id = decodeURIComponent(window.location.hash.slice(1))
    const target = id ? document.getElementById(id) : null
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [path])
  return null
}

/** `ssrPath` only for the build-time prerender (src/app/prerender.tsx). */
export function App({ ssrPath }: { ssrPath?: string | undefined } = {}) {
  const { t, i18n } = useTranslation()

  // Layout effect: runs before the pages' own (passive) title effects, so a page title wins.
  useLayoutEffect(() => {
    document.title = t('common.documentTitle')
  }, [t, i18n.resolvedLanguage])

  // The live app has replaced the prerendered page: charts may show (see vite.config.ts).
  useLayoutEffect(() => {
    document.getElementById('root')?.removeAttribute('data-prerender')
  }, [])

  return (
    <Router base={ROUTER_BASE} {...(ssrPath !== undefined && { ssrPath })}>
      <ScrollToTopOnNavigate />
      <div data-print-block className="flex min-h-dvh flex-col">
        <TopBar />
        <Switch>
          <Route path="/">
            <Suspense fallback={<PageFallback />}>
              <Landing />
            </Suspense>
          </Route>
          <Route path="/app" component={Workbench} />
          <Route path="/methods">
            <Suspense fallback={<PageFallback />}>
              <MethodsCatalog />
            </Suspense>
          </Route>
          <Route path="/methods/:id">
            {(params) => (
              <Suspense fallback={<PageFallback />}>
                <MethodPage id={params.id} />
              </Suspense>
            )}
          </Route>
          {DevIllustrations && <Route path="/dev/illustrations"><Suspense fallback={null}><DevIllustrations /></Suspense></Route>}
          {DevUi && (
            <Route path="/dev/ui">
              <Suspense fallback={null}>
                <DevUi />
              </Suspense>
            </Route>
          )}
          <Route component={NotFound} />
        </Switch>
      </div>
    </Router>
  )
}
