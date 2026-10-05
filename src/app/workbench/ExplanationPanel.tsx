import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { Suspense, use } from 'react'
import { loadMethod } from '../../content/methods/load'
import { localizeMethod } from '../../content/types'
import { doiUrl, getExample, shortCitation } from '../../data/examples'
import { useLang } from '../../i18n'
import { useWorkbench, type Stage } from '../../state/workbench'

/** The methods the workbench runs. Their cards are chunks of their own (shared with the method pages). */
type PanelMethod = 'critic' | 'entropy' | 'equal' | 'topsis'

/** Starts loading the workbench's method cards (WorkbenchPage calls it when its chunk loads). */
export function preloadPanelCards(): void {
  for (const id of ['critic', 'entropy', 'equal', 'topsis'] as const) void loadMethod(id)
}

const linkClass = 'text-accent underline underline-offset-2 hover:no-underline'

/** First sentence of a summary ("vd. (2021)" and "e.g." do not end one: the next word is not capitalized). */
export function firstSentence(text: string): string {
  const m = /^(.+?[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/u.exec(text)
  return m ? m[1]! : text
}

/**
 * "Rank reversal: the winner changes ..." -> its own label and the rest, so the panel does not print
 * "Watch out: Rank reversal: ...". Without a short label before a colon, the panel's "Watch out" is used.
 */
export function splitLabel(text: string): { label?: string; text: string } {
  const m = /^([^:.;]{2,40}):\s+(.+)$/su.exec(text)
  return m ? { label: m[1]!, text: m[2]! } : { text }
}

/**
 * One method in the panel (DESIGN.md §Copy, at most 60 words a stage): the name, one sentence,
 * at most one "Watch out" line, and the method page for the rest.
 */
/** A card still loading shows nothing; the panel is secondary and fills in a moment later. */
function MethodNote(props: { id: PanelMethod; brief?: boolean }) {
  return (
    <Suspense fallback={null}>
      <MethodNoteBody {...props} />
    </Suspense>
  )
}

function MethodNoteBody({ id, brief = false }: { id: PanelMethod; brief?: boolean }) {
  const { t } = useTranslation()
  const [lang] = useLang()
  const m = localizeMethod(use(loadMethod(id)), lang)
  const pitfall = brief || !m.pitfalls[0] ? undefined : splitLabel(m.pitfalls[0])
  return (
    <section className="flex flex-col gap-2" aria-label={m.name}>
      <div>
        <h3 className="text-14 font-semibold text-text">{m.name}</h3>
        {!brief && m.fullName !== m.name && <p className="text-12 text-text-3">{m.fullName}</p>}
      </div>
      <p className="text-14 text-text-2">{firstSentence(m.summary)}</p>
      {pitfall && (
        <p className="text-13 text-text-2">
          <span className="font-medium text-text">{pitfall.label ?? t('workbench.panel.pitfalls')}: </span>
          {pitfall.text}
        </p>
      )}
      <Link href={`/methods/${id}`} className={`${linkClass} text-13`}>
        {t('workbench.panel.methodPage', { method: m.name })}
      </Link>
    </section>
  )
}

function DataNotes() {
  const { t } = useTranslation()
  const [lang] = useLang()
  const exampleId = useWorkbench((s) => s.exampleId)
  const example = exampleId ? getExample(exampleId) : undefined
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h3 className="text-14 font-semibold text-text">{t('workbench.panel.data.title')}</h3>
        <p>{t('workbench.panel.data.body')}</p>
      </section>
      <section className="flex flex-col gap-1">
        <h3 className="text-13 font-medium text-text">{t('workbench.panel.data.importTitle')}</h3>
        <p className="text-13">{t('workbench.panel.data.import')}</p>
      </section>
      {example && (
        <section className="flex flex-col gap-1">
          <h3 className="text-13 font-medium text-text">{t('workbench.panel.data.exampleTitle')}</h3>
          <p className="text-12">
            {shortCitation(example.citation, lang)}. {example.citation.venue}.{' '}
            <a href={doiUrl(example.citation.doi)} target="_blank" rel="noreferrer" className={linkClass}>
              doi:{example.citation.doi}
            </a>
          </p>
        </section>
      )}
    </div>
  )
}

function ManualNotes() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-14 font-semibold text-text">{t('workbench.panel.manual.title')}</h3>
      <p>{t('workbench.panel.manual.body')}</p>
    </section>
  )
}

function RobustnessNotes() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-14 font-semibold text-text">{t('workbench.panel.robustness.title')}</h3>
      <p>{t('workbench.panel.robustness.body')}</p>
      <p className="text-13">{t('workbench.panel.robustness.readOnly')}</p>
    </section>
  )
}

/** Explanation panel content for the current stage: the selected methods from src/content. */
export function ExplanationPanel({ stage }: { stage: Stage }) {
  const weightMethod = useWorkbench((s) => s.weightMethod)
  const rankingMethod = useWorkbench((s) => s.rankingMethod)

  if (stage === 'data') return <DataNotes />
  if (stage === 'weights') return weightMethod === 'manual' ? <ManualNotes /> : <MethodNote id={weightMethod} />
  if (stage === 'ranking') return <MethodNote id={rankingMethod} />
  if (stage === 'robustness') return <RobustnessNotes />
  // Results: one line per method and the links; the details are on the stages before.
  return (
    <div className="flex flex-col gap-5">
      {weightMethod === 'manual' ? <ManualNotes /> : <MethodNote id={weightMethod} brief />}
      <div className="border-t border-line pt-4">
        <MethodNote id={rankingMethod} brief />
      </div>
    </div>
  )
}
