import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { allMethods, FAMILY_ORDER, methodsByFamily } from '../../content/methods/catalog'
import { MethodGlyph } from '../../features/illustrations/MethodGlyph'
import { useLang } from '../../i18n'

/**
 * Methods catalogue preview on the landing page, grouped by family, with the honest status of
 * each method. Loaded lazily: it is the only landing section that needs the method content.
 */
export default function CataloguePreview() {
  const { t } = useTranslation()
  const [lang] = useLang()
  const available = allMethods.filter((m) => m.status === 'available').length
  const allAvailable = available === allMethods.length

  return (
    <section aria-labelledby="catalogue-title" className="flex flex-col gap-6">
      <div className="flex max-w-[65ch] flex-col gap-2">
        <h2 id="catalogue-title" className="text-24 font-semibold text-text">
          {t('landing.catalogue.title')}
        </h2>
        <p className="text-16 text-text-2">{t('landing.catalogue.lead', { available, total: allMethods.length })}</p>
      </div>
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
        {FAMILY_ORDER.map((family) => {
          const items = methodsByFamily(family)
          if (items.length === 0) return null
          const groups = (['available', 'research'] as const)
            .map((status) => ({ status, items: items.filter((m) => m.status === status) }))
            .filter((g) => g.items.length > 0)
          return (
            <div key={family} className="flex flex-col gap-3 border-t border-line-strong pt-3">
              <h3 className="flex items-center gap-2 text-14 font-semibold text-text">
                <MethodGlyph family={family} size={20} className="text-text-2" />
                {t(`methods.families.${family}`)}
              </h3>
              {allAvailable ? (
                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-14">
                  {items.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/methods/${m.id}`}
                        className="font-medium text-text underline decoration-line-strong underline-offset-2 hover:decoration-text"
                      >
                        {m.name[lang]}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <dl className="flex flex-col gap-2 text-14">
                  {groups.map((g) => (
                    <div key={g.status} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                      <dt className={g.status === 'available' ? 'text-13 font-medium text-text' : 'text-13 text-text-2'}>
                        {t(`landing.catalogue.${g.status}`)}
                      </dt>
                      <dd className="flex flex-wrap gap-x-3 gap-y-1">
                        {g.items.map((m) => (
                          <Link
                            key={m.id}
                            href={`/methods/${m.id}`}
                            className={
                              g.status === 'available'
                                ? 'font-medium text-text underline decoration-line-strong underline-offset-2 hover:decoration-text'
                                : 'text-text-2 no-underline hover:text-text hover:underline'
                            }
                          >
                            {m.name[lang]}
                          </Link>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
