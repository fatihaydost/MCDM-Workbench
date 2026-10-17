import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Problem } from '../../core'
import type { MethodContent } from '../../content/types'
import { alternativeNames, getExample, type ExampleDataset } from '../../data/examples'
import { MethodGlyph } from '../../features/illustrations/MethodGlyph'
import { useLang, type Lang } from '../../i18n'
import { viewOf } from './views'

function toProblem(ex: ExampleDataset, lang: Lang): Problem {
  return { alternatives: alternativeNames(ex, lang), criteria: ex.criteria.map((c) => ({ name: c.name[lang], type: c.type })), matrix: ex.matrix }
}

/** Starts loading the idea picture of a method page (App's preloadRoute, so a prerendered page is replaced at once). */
export function preloadIdea(id: string): Promise<unknown> | undefined {
  return viewOf(id)?.idea?.Picture.preload()
}

/**
 * The picture at the top of a method page: the method view's `idea` (src/app/methods/views), drawn on its published
 * example, in a chunk of its own; every other method shows its family glyph (no illustration for methods in research
 * yet). Until the picture's chunk has loaded the page suspends as a whole, as it does for its card.
 */
export function MethodIdea({ m }: { m: MethodContent }) {
  const { t } = useTranslation()
  const [lang] = useLang()
  const idea = viewOf(m.id)?.idea
  const example = idea ? getExample(idea.example) : undefined
  const problem = useMemo(() => (example ? toProblem(example, lang) : null), [example, lang])

  if (idea && example && problem) return <idea.Picture.Component example={example} problem={problem} />

  return (
    <div className="flex items-center gap-3 text-text-2">
      <MethodGlyph family={m.family} size={40} />
      <span className="text-14">{t(`methods.families.${m.family}`)}</span>
    </div>
  )
}
