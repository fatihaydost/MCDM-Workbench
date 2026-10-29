import { GithubLogo } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { REPO_URL } from '../shell/TopBar'
import { textLink } from './usePageMeta'

/**
 * Footer of the landing and method pages: source, licence, author and (where data is entered or
 * shown) the privacy note. The source
 * link matters most on phones, where the top bar hides its GitHub icon.
 */
export function SiteFooter({ privacy = true }: { privacy?: boolean }) {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-8 text-13 text-text-2 md:flex-row md:items-center md:justify-between md:px-8">
        {privacy ? <p className="max-w-[60ch]">{t('landing.footer.privacy')}</p> : <span />}
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <li className="inline-flex items-center">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 ${textLink}`}>
              <GithubLogo aria-hidden className="size-4 shrink-0" />
              <span>{t('landing.footer.source')}</span>
            </a>
          </li>
          <li className="inline-flex items-center">
            <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className={textLink}>
              {t('landing.footer.license')}
            </a>
          </li>
          <li className="inline-flex items-center">{t('landing.footer.author')}</li>
        </ul>
      </div>
    </footer>
  )
}
