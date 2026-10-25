import { ArrowLeft, CaretRight } from '@phosphor-icons/react'
import { lazy, Suspense, use, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { isMethodId, methodMeta } from '../../content/methods/catalog'
import { loadMethod } from '../../content/methods/load'
import { localizeMethod, type MethodContent } from '../../content/types'
import { examples } from '../../data/examples'
import { useLang } from '../../i18n'
import { buttonClasses } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { Notice } from '../../ui/Notice'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/Tabs'
import { SiteFooter } from '../landing/SiteFooter'
import { textLink, usePageMeta } from '../landing/usePageMeta'
import { MethodIdea } from './MethodIdea'
import { doiHref, pageContainer, shortOrigin, SourceItem, splitSentences, StatusLabel } from './shared'

// App's preloadRoute loads the idea picture through this chunk (it is the page's, not the main chunk's).
export { preloadIdea } from './MethodIdea'

const SECTIONS = ['idea', 'details', 'algorithm', 'combined', 'reference', 'sources'] as const
type SectionId = (typeof SECTIONS)[number]
const DETAIL_TABS = ['when', 'whenNot', 'inputs', 'pitfalls'] as const

const disclosure = 'cursor-pointer text-13 text-text-2 hover:text-text'

function Section({ id, title, children }: { id: SectionId; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-20 flex-col gap-4">
      <h2 id={`${id}-title`} className="text-20 font-semibold text-text">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Bullets({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('flex list-disc flex-col gap-1.5 pl-5 text-16 text-text marker:text-text-3', className)}>
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  )
}

function NotFoundMethod({ id }: { id: string }) {
  const { t } = useTranslation()
  usePageMeta(t('common.notFound.metaTitle'), t('methods.notFound', { id }))
  return (
    <main id="main" tabIndex={-1} className={`${pageContainer} min-h-[60dvh] py-12 outline-none`}>
      <h1 className="text-24 font-semibold text-text">{t('common.notFound.title')}</h1>
      <p className="mt-2 text-16 text-text-2">{t('methods.notFound', { id })}</p>
      <Link href="/methods" className={buttonClasses({ className: 'mt-6' })}>
        {t('methods.backToCatalog')}
      </Link>
    </main>
  )
}

// KaTeX (about 260 kB of script and 30 kB of CSS) loads when the first step is opened, not with the page. Pointing at
// or focusing the list starts the download early; once loaded, lazy() gets a thenable that resolves synchronously
// (as in App.tsx), so the step renders its formula in the same commit instead of a placeholder that React reveals
// 300 ms later. The disclosure then grows once, to its real height, instead of opening and jumping (MOTION.md).
type FormulaModule = typeof import('../../ui/Formula')
let formulaModule: FormulaModule | undefined
const loadFormula = (): Promise<FormulaModule> => import('../../ui/Formula').then((m) => (formulaModule = m))
const Formula = lazy(() =>
  formulaModule
    ? ({ then: (resolve: (m: { default: FormulaModule['Formula'] }) => void) => resolve({ default: formulaModule!.Formula }) } as unknown as Promise<{
        default: FormulaModule['Formula']
      }>)
    : loadFormula().then((m) => ({ default: m.Formula })),
)
const preloadFormula = () => void loadFormula().catch(() => {})

/** `/methods/:id`: one method, picture and short summary first, details behind disclosures. */
export default function MethodPage({ id }: { id: string }) {
  return isMethodId(id) ? <MethodArticle m={use(loadMethod(id))} /> : <NotFoundMethod id={id} />
}

/** One algorithm step: the title always, the formula only once the step has been opened. */
function AlgorithmStep({ n, step }: { n: number; step: { title: string; tex: string; note?: string } }) {
  const [opened, setOpened] = useState(false)
  return (
    <details className="group" onToggle={(e) => e.currentTarget.open && setOpened(true)}>
      <summary className="grid cursor-pointer list-none grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 py-3 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <span className="num pl-1 font-mono text-14 text-text-2">{n}</span>
        <span className="text-16 font-medium text-text">{step.title}</span>
        <CaretRight
          aria-hidden
          className="mr-2 size-4 text-text-2 transition-transform duration-(--dur-slow) group-open:rotate-90"
        />
      </summary>
      <div className="flex flex-col gap-2 pb-4 pl-[40px]">
        {opened && (
          <Suspense fallback={<div aria-busy="true" className="h-12" />}>
            <Formula display tex={step.tex} className="text-16" />
          </Suspense>
        )}
        {step.note && <p className="text-14 text-text-2">{step.note}</p>}
      </div>
    </details>
  )
}

/** "Opricovic, S.; Tzeng, G.-H. (2004). Title..." -> "Opricovic, S.; Tzeng, G.-H. (2004)". */
const sourceHead = (source: string): string => source.match(/^.*?\(\d{4}[a-z]?\)/)?.[0] ?? source

export function MethodArticle({ m }: { m: MethodContent }) {
  const { t } = useTranslation()
  const [lang] = useLang()
  const l = localizeMethod(m, lang)
  usePageMeta(t('methods.meta.methodTitle', { name: l.name }), l.summary)

  const available = m.status === 'available'
  const workbenchExamples = available ? examples.filter((e) => e.referenceFor.includes(m.id)) : []
  const sectionTitle = (s: SectionId) => t(`methods.page.sections.${s}`)
  const tabItems: Record<(typeof DETAIL_TABS)[number], string[]> = {
    when: l.whenToUse,
    whenNot: l.whenNot,
    inputs: l.inputs,
    pitfalls: l.pitfalls,
  }
  const linked = l.combinedWith.filter((c) => c.methodId)

  return (
    <>
      <main id="main" tabIndex={-1} className={`${pageContainer} py-10 outline-none md:py-12`}>
        <Link href="/methods" className="inline-flex items-center gap-1.5 text-13 text-text-2 no-underline hover:text-text">
          <ArrowLeft aria-hidden className="size-3.5" />
          {t('methods.backToCatalog')}
        </Link>

        <div className="mt-6">
          <article className="flex min-w-0 max-w-[760px] flex-col gap-12">
            <header className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-32 font-semibold text-text">{l.name}</h1>
                  <StatusLabel status={m.status} />
                </div>
                <p className="text-14 text-text-2">
                  {l.fullName !== l.name ? `${l.fullName}. ` : ''}
                  {shortOrigin(m.origin, lang)}
                </p>
              </div>
              {!available && <Notice tone="warning" title={t('methods.page.draftTitle')} />}
            </header>

            <Section id="idea" title={sectionTitle('idea')}>
              <MethodIdea m={m} />
              <p className="max-w-[65ch] text-16 text-text">{splitSentences(l.summary)[0]}</p>
            </Section>

            <Section id="details" title={sectionTitle('details')}>
              <Tabs defaultValue="when">
                <TabsList aria-label={sectionTitle('details')} className="overflow-x-auto">
                  {DETAIL_TABS.map((k) => (
                    <TabsTrigger key={k} value={k}>
                      {t(`methods.page.tabs.${k}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {DETAIL_TABS.map((k) => (
                  <TabsContent key={k} value={k} className="pt-4">
                    <Bullets items={tabItems[k]} />
                  </TabsContent>
                ))}
              </Tabs>
            </Section>

            <Section id="algorithm" title={sectionTitle('algorithm')}>
              <ol className="flex flex-col border-t border-line" onPointerEnter={preloadFormula} onFocus={preloadFormula}>
                {l.steps.map((s, i) => (
                  <li key={i} className="border-b border-line">
                    <AlgorithmStep n={i + 1} step={s} />
                  </li>
                ))}
              </ol>
            </Section>

            <Section id="combined" title={sectionTitle('combined')}>
              {linked.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {linked.map((c) => (
                    <li key={c.methodId}>
                      <Link
                        href={`/methods/${c.methodId}`}
                        className="inline-flex h-8 items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-14 font-medium text-text no-underline hover:bg-surface-2"
                      >
                        <span className="text-text-3" aria-hidden>
                          +
                        </span>
                        {methodMeta[c.methodId!].name[lang]}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {l.combinedWith.length === 0 ? (
                <p className="text-14 text-text-2">{t('methods.page.noCombinations')}</p>
              ) : (
                <details>
                  <summary className={disclosure}>{t('methods.page.why')}</summary>
                  <Bullets items={l.combinedWith.map((c) => c.text)} className="mt-2 text-14 text-text-2" />
                </details>
              )}
            </Section>

            <Section id="reference" title={available ? sectionTitle('reference') : t('methods.page.reference.researchTitle')}>
              <div className="flex flex-col gap-3 rounded-control border border-line bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-16 font-medium text-text">{sourceHead(m.reference.source)}</span>
                  <span className="text-14 text-text-2">
                    {t(available ? `methods.page.reference.${m.reference.match}` : `methods.page.reference.research.${m.reference.match}`)}
                  </span>
                </div>
                {workbenchExamples.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {workbenchExamples.map((e, i) => {
                      const other = e.buttonLabel?.[lang] ?? t('methods.page.reference.openOther')
                      return (
                        <Link
                          key={e.id}
                          href={`/app?example=${e.id}&method=${m.id}`}
                          // The visible text starts the accessible name (WCAG 2.5.3, Label in Name).
                          aria-label={
                            i === 0
                              ? `${t('methods.page.reference.open')}: ${e.name[lang]}`
                              : `${other}: ${t('methods.page.reference.open')}, ${e.name[lang]}`
                          }
                          title={e.name[lang]}
                          className={buttonClasses({ variant: i === 0 ? 'primary' : 'secondary' })}
                        >
                          {i === 0 ? t('methods.page.reference.open') : other}
                        </Link>
                      )
                    })}
                  </div>
                )}
                <details>
                  <summary className={disclosure}>{t('methods.page.reference.more')}</summary>
                  <div className="mt-2 flex flex-col gap-2 text-14 text-text-2">
                    <p>
                      {m.reference.source}.{' '}
                      {m.reference.doi && (
                        <a href={doiHref(m.reference.doi)} target="_blank" rel="noreferrer" className={cn(textLink, '[overflow-wrap:anywhere]')}>
                          doi:{m.reference.doi}
                        </a>
                      )}
                    </p>
                    {m.reference.table && <p>{m.reference.table}</p>}
                    <p>{l.referenceNote}</p>
                    <p className="text-13">{t(available ? 'methods.page.reference.tested' : 'methods.page.reference.researchOnly')}</p>
                  </div>
                </details>
              </div>
            </Section>

            <Section id="sources" title={sectionTitle('sources')}>
              <details>
                <summary className={disclosure}>{t('methods.page.showSources', { count: m.sources.length + 1 })}</summary>
                <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-14 text-text marker:text-text-3">
                  <li>
                    {shortOrigin(m.origin, lang)}. {m.origin.title}. {m.origin.venue}.{' '}
                    {m.origin.doi ? (
                      <a href={doiHref(m.origin.doi)} target="_blank" rel="noreferrer" className={cn(textLink, '[overflow-wrap:anywhere]')}>
                        doi:{m.origin.doi}
                      </a>
                    ) : m.origin.url ? (
                      <a href={m.origin.url} target="_blank" rel="noopener noreferrer" className={cn(textLink, '[overflow-wrap:anywhere]')}>
                        {m.origin.url}
                      </a>
                    ) : null}
                    {l.originNote && <span className="mt-0.5 block text-13 text-text-2">{l.originNote}</span>}
                  </li>
                  {m.sources.map((s) => (
                    <li key={s.label}>
                      <SourceItem source={s} />
                    </li>
                  ))}
                </ol>
              </details>
            </Section>
          </article>

        </div>
      </main>
      <SiteFooter privacy={false} />
    </>
  )
}
