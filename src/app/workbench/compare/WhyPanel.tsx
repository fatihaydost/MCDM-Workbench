import { useTranslation } from 'react-i18next'
import { identicalRankings, pairFacts, type Comparison } from '../../../core'
import { toProblem, useWorkbench } from '../../../state/workbench'
import { criterionName, tr } from '../shared'
import { useCompareText } from './text'
import { whySentences } from './why'

type Props = { comparison: Comparison; weights: number[]; pair: [number, number]; names: string[] }

/** Why two alternatives swap places between methods: generated from the pair's facts (see why.ts). */
export function WhyPanel({ comparison, weights, pair, names }: Props) {
  const { t } = useTranslation()
  const { t: tc, i18n } = useCompareText()
  const draft = useWorkbench((s) => s.problem)
  const facts = pairFacts(toProblem(draft), weights, comparison, pair[0], pair[1])
  const sentences = whySentences(facts, {
    names,
    criteria: draft.criteria.map((_, j) => criterionName(draft.criteria, j, t)),
    methodLabel: (id) => tr(t, `workbench.rankingMethod.${id}`),
    t: tc,
    lang: i18n.language,
    identical: identicalRankings(comparison),
  })
  return (
    <section className="flex max-w-[880px] flex-col gap-1.5" data-testid="why-panel" aria-live="polite">
      <h3 className="text-14 font-medium text-text">{tc('why.title', { a: names[facts.a], b: names[facts.b] })}</h3>
      {sentences.map((s, i) => (
        <p key={i} className="text-13 text-text-2">
          {s}
        </p>
      ))}
    </section>
  )
}
