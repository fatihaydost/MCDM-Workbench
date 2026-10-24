import { useTranslation } from 'react-i18next'
import type { MethodStatus, Origin, Source } from '../../content/types'
import type { Lang } from '../../i18n'
import { cn } from '../../ui/cn'
import { textLink } from '../landing/usePageMeta'

/** Status as text in a hairline box: "Available" reads stronger than "In research", never colour alone. */
export function StatusLabel({ status, className }: { status: MethodStatus; className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-control border px-1.5 text-12 whitespace-nowrap',
        status === 'available' ? 'border-line-strong font-medium text-text' : 'border-line text-text-2',
        className,
      )}
    >
      {t(`methods.status.${status}`)}
    </span>
  )
}

/** First sentence of a summary, for one-line lists. Splits at ". " followed by a capital letter. */
export function firstSentence(text: string): string {
  const m = text.match(/^.+?[.!?](?=\s+[A-ZÇĞİÖŞÜ(])/u)
  return m ? m[0] : text
}

/** "Hwang and Yoon (1981)", "Diakoulaki et al. (1995)" / "... vd. (1995)". */
export function shortOrigin(o: Pick<Origin, 'authors' | 'year'>, lang: Lang): string {
  const surnames = o.authors.split(';').map((a) => a.trim().split(',')[0]!.trim())
  const and = lang === 'tr' ? 've' : 'and'
  const etal = lang === 'tr' ? 'vd.' : 'et al.'
  const who = surnames.length === 1 ? surnames[0] : surnames.length === 2 ? `${surnames[0]} ${and} ${surnames[1]}` : `${surnames[0]} ${etal}`
  return `${who} (${o.year})`
}

export const doiHref = (doi: string): string => `https://doi.org/${doi}`

/** A source line: its label, then a DOI or URL link when there is one. */
export function SourceItem({ source }: { source: Source }) {
  return (
    <>
      <span>{source.label}</span>
      {source.doi ? (
        <>
          {' '}
          <a href={doiHref(source.doi)} target="_blank" rel="noreferrer" className={cn(textLink, '[overflow-wrap:anywhere]')}>
            doi:{source.doi}
          </a>
        </>
      ) : source.url ? (
        <>
          {' '}
          <a href={source.url} target="_blank" rel="noreferrer" className={cn(textLink, '[overflow-wrap:anywhere]')}>
            {source.url.replace(/^https?:\/\//, '')}
          </a>
        </>
      ) : null}
    </>
  )
}

export const pageContainer = 'mx-auto w-full max-w-[1200px] px-4 md:px-8'

/** Sentences of a summary, split at ". " before a capital letter (keeps "e.g." and "vd." inside). */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ(])/u).filter(Boolean)
}
