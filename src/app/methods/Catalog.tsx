import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { Problem, WeightingId } from '../../core'
import { allMethods, FAMILY_ORDER, methodsByFamily } from '../../content/methods/catalog'
import { getExample } from '../../data/examples'
import { MethodGlyph } from '../../features/illustrations/MethodGlyph'
import * as geometry from '../../features/illustrations/geometry'
import { MethodThumb, type MethodThumbProps } from '../../features/illustrations/MethodThumb'
import { useLang } from '../../i18n'
import { SiteFooter } from '../landing/SiteFooter'
import { usePageMeta } from '../landing/usePageMeta'
import { Guide } from './Guide'
import { pageContainer } from './shared'
import { methodViews, RANKING_VIEW_IDS, WEIGHTING_VIEW_IDS, type ThumbKit } from './views'

function exampleProblem(id: string): Problem {
  const ex = getExample(id)!
  return { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
}

/**
 * The available methods in two rows, weighting first (the order of the workbench), then ranking: a card per view with a
 * thumbnail (every core method; not the store's manual weights).
 */
const AVAILABLE = {
  weighting: WEIGHTING_VIEW_IDS.filter((id): id is WeightingId => methodViews[id].thumb !== undefined),
  ranking: RANKING_VIEW_IDS.filter((id): id is Exclude<(typeof RANKING_VIEW_IDS)[number], 'ahp-ranking'> => methodViews[id].thumb !== undefined),
}

/** The pictures on the available methods' cards, computed from the published examples (each view's `thumb`). */
function useThumbs() {
  return useMemo(() => {
    const kit: ThumbKit = { problem: exampleProblem, weights: (id) => getExample(id)!.weights!, geometry }
    const ids = [...AVAILABLE.weighting, ...AVAILABLE.ranking]
    return Object.fromEntries(ids.map((id) => [id, methodViews[id].thumb!(kit)])) as Record<(typeof ids)[number], MethodThumbProps>
  }, [])
}

/**
 * `/methods`: the methods that compute here as large cards with a picture and one line,
 * the methods in research as names grouped by family, and the method-choice guide.
 */
export default function Catalog() {
  const { t } = useTranslation()
  const [lang] = useLang()
  usePageMeta(t('methods.meta.title'), t('methods.meta.description'))
  const thumbs = useThumbs()
  const available = allMethods.filter((m) => m.status === 'available')
  const research = allMethods.filter((m) => m.status === 'research')

  return (
    <>
      <main id="main" tabIndex={-1} className={`${pageContainer} py-10 outline-none md:py-12`}>
        <div className="flex max-w-[70ch] flex-col gap-3">
          <h1 className="text-32 font-semibold text-text">{t('methods.title')}</h1>
          <p className="text-16 text-text-2">{t('methods.catalog.lead', { available: available.length, total: allMethods.length })}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-16">
          <div className="flex min-w-0 flex-col gap-12">
            <section aria-labelledby="available-title" className="flex flex-col gap-4">
              <h2 id="available-title" className={research.length > 0 ? 'text-20 font-semibold text-text' : 'sr-only'}>
                {t('methods.status.available')}
              </h2>
              {(['weighting', 'ranking'] as const).map((group) => (
                <div key={group} className="flex flex-col gap-2">
                  <h3 id={`available-${group}`} className="text-13 font-medium text-text-2">
                    {t(`methods.catalog.groups.${group}`)}
                  </h3>
                  <ul aria-labelledby={`available-${group}`} className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {AVAILABLE[group].map((id) => {
                      const m = available.find((x) => x.id === id)
                      if (!m) return null
                      return (
                        <li key={id} className="min-w-0">
                          <Link
                            href={`/methods/${id}`}
                            className="group flex h-full flex-row items-center gap-4 rounded-control border border-line bg-surface p-4 no-underline transition-colors hover:border-line-strong hover:bg-surface-2 md:flex-col md:items-start"
                          >
                            <MethodThumb {...thumbs[id]} />
                            <span className="flex min-w-0 flex-col gap-1">
                              <span className="text-20 font-semibold text-text group-hover:underline">{m.name[lang]}</span>
                              <span className="text-14 text-text-2">{t(`methods.catalog.oneLiner.${id}`)}</span>
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </section>

            {research.length > 0 ? (
              <section aria-labelledby="research-title" className="flex flex-col gap-4">
                <h2 id="research-title" className="text-20 font-semibold text-text">
                  {t('methods.status.research')}
                </h2>
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  {FAMILY_ORDER.map((family) => {
                    const items = methodsByFamily(family).filter((m) => m.status === 'research')
                    if (items.length === 0) return null
                    return (
                      <div key={family} className="flex flex-col gap-2 border-t border-line pt-3">
                        <h3 className="flex items-center gap-2 text-13 font-medium text-text-2">
                          <MethodGlyph family={family} size={16} />
                          {t(`methods.families.${family}`)}
                        </h3>
                        <ul className="flex flex-wrap gap-1.5">
                          {items.map((m) => (
                            <li key={m.id}>
                              <Link
                                href={`/methods/${m.id}`}
                                className="inline-flex h-7 items-center rounded-control border border-line px-2 text-13 text-text no-underline transition-colors hover:border-line-strong hover:bg-surface-2"
                              >
                                {m.name[lang]}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="min-w-0">
            <div className="rounded-control border border-line bg-surface p-4 md:p-5 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-96px)] xl:overflow-y-auto">
              <Guide />
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
