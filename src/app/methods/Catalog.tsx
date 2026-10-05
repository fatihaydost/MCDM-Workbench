import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { critic, type Problem } from '../../core'
import { allMethods, FAMILY_ORDER, methodsByFamily } from '../../content/methods/catalog'
import { getExample } from '../../data/examples'
import { MethodGlyph } from '../../features/illustrations/MethodGlyph'
import { MethodThumb } from '../../features/illustrations/MethodThumb'
import { argMax, distancePoints, entropyParts, topsisProjection } from '../../features/illustrations/geometry'
import { useLang } from '../../i18n'
import { SiteFooter } from '../landing/SiteFooter'
import { usePageMeta } from '../landing/usePageMeta'
import { Guide } from './Guide'
import { pageContainer } from './shared'

type Available = 'critic' | 'entropy' | 'topsis' | 'equal'
const AVAILABLE: readonly Available[] = ['topsis', 'critic', 'entropy', 'equal']

function exampleProblem(id: string): Problem {
  const ex = getExample(id)!
  return { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
}

/** The pictures on the available methods' cards, computed from the published examples. */
function useThumbs() {
  return useMemo(() => {
    const phones = exampleProblem('krishnan-2021-smartphones')
    const weights = critic.compute(phones, {}).weights
    // TOPSIS on its own reference example: three well spread points (Opricovic and Tzeng 2004).
    const climbing = exampleProblem('opricovic-tzeng-2004-f')
    const proj = topsisProjection(climbing, [0.5, 0.5])
    const plane = proj ? distancePoints(proj) : []
    const n = phones.criteria.length
    // Entropy on its reference example: the most even criterion's shares next to the most uneven one's.
    const vilnius = entropyParts(exampleProblem('zavadskas-2017-vilnius'))
    const sharesOf = (j: number) => vilnius?.shares.map((row) => row[j]!) ?? []
    return {
      critic: { kind: 'bars' as const, values: weights, highlight: argMax(weights) },
      topsis: { kind: 'plane' as const, points: plane, highlight: proj ? argMax(proj.closeness) : undefined },
      entropy: { kind: 'shares' as const, even: sharesOf(vilnius?.pair[0] ?? 0), uneven: sharesOf(vilnius?.pair[1] ?? 1) },
      equal: { kind: 'bars' as const, values: Array.from({ length: n }, () => 1 / n), highlight: undefined },
    }
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
              <h2 id="available-title" className="text-20 font-semibold text-text">
                {t('methods.status.available')}
              </h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                {AVAILABLE.map((id) => {
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
            </section>

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
