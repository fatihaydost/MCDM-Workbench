import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { buttonClasses } from '../../ui/Button'
import { Skeleton } from '../../ui/Skeleton'
import { LogoMark } from '../shell/LogoMark'
import { HeroResult } from './HeroResult'
import { Pipeline } from './Pipeline'
import { SiteFooter } from './SiteFooter'
import { usePageMeta } from './usePageMeta'
import { Verified } from './Verified'

// The only section that needs src/content; it arrives in the chunk the method pages share.
// Requested as soon as this module runs, so it usually arrives before the reader scrolls to it.
const loadCataloguePreview = () => import('./CataloguePreview')
void loadCataloguePreview()
const CataloguePreview = lazy(loadCataloguePreview)

const container = 'mx-auto w-full max-w-[1200px] px-4 md:px-8'

/** Same outline as the catalogue preview (heading, lead, six family groups), so nothing shifts. */
function CatalogueSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Skeleton width={160} height={32} />
      <Skeleton width="min(100%, 560px)" height={48} />
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height={120} />
        ))}
      </div>
    </div>
  )
}

/** `/`: hero with a live result, how it works, verification ledger, catalogue preview, footer. */
export default function Landing() {
  const { t } = useTranslation()
  usePageMeta(t('landing.meta.title'), t('landing.meta.description'))

  return (
    <>
      <main id="main" tabIndex={-1} className="flex flex-col outline-none">
        <div
          className={`${container} grid grid-cols-1 items-start gap-10 py-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16 lg:py-16`}
        >
          <div className="flex flex-col items-start gap-6">
            <LogoMark size={96} className="-ml-2 hidden text-accent lg:block" />
            <h1 className="text-32 font-semibold text-balance text-text md:text-44">{t('landing.title')}</h1>
            <p className="max-w-[48ch] text-16 text-text-2 md:text-20 md:leading-7">{t('landing.lead')}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/app" className={buttonClasses({ variant: 'primary', className: 'h-10 px-4 text-14' })}>
                {t('landing.openWorkbench')}
              </Link>
              <Link href="/methods" className={buttonClasses({ variant: 'secondary', className: 'h-10 px-4 text-14' })}>
                {t('landing.methods')}
              </Link>
            </div>
          </div>
          <HeroResult />
        </div>

        <div className={`${container} flex flex-col gap-20 pt-6 pb-24 md:gap-24`}>
          <Pipeline />
          <Suspense fallback={<CatalogueSkeleton />}>
            <CataloguePreview />
          </Suspense>
          <Verified />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
