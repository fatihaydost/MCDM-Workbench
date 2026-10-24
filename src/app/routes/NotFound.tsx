import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { buttonClasses } from '../../ui/Button'
import { usePageMeta } from '../landing/usePageMeta'

/** Any unknown path. */
export function NotFound() {
  const { t } = useTranslation()
  usePageMeta(t('common.notFound.metaTitle'), t('common.notFound.body'))
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[960px] px-4 py-16 outline-none md:px-8">
      <h1 className="text-24 font-semibold text-text">{t('common.notFound.title')}</h1>
      <p className="mt-2 max-w-[560px] text-14 text-text-2">{t('common.notFound.body')}</p>
      <Link href="/" className={buttonClasses({ className: 'mt-6' })}>
        {t('common.notFound.action')}
      </Link>
    </main>
  )
}
