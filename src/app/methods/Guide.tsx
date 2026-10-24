import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import {
  BASIS_LABEL,
  decisionTree,
  decisionTreeIntro,
  decisionTreeSources,
  getGuideNode,
  riskyCombinations,
  type GuideNode,
  type GuideOption,
  type RiskyCombination,
} from '../../content/guide'
import { methodMeta } from '../../content/methods/catalog'
import type { MethodId } from '../../content/types'
import { useLang } from '../../i18n'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { SourceItem, StatusLabel } from './shared'

type Answer = { node: GuideNode; option: GuideOption }

const NON_POSITIVE_OPTIONS = new Set(['negatives', 'zeros', 'rank-negatives', 'rank-zeros'])

/**
 * A risk applies when the path recommends at least two of its methods (a weighting and a ranking
 * method, or two rankers across separate steps), or its only method (or any ratio-based method for ratio-shifted).
 */
export function risksFor(
  picked: Set<MethodId>,
  rankingStages = 1,
  answers?: readonly { option: { id: string } }[],
): RiskyCombination[] {
  const hasNonPositive = answers ? answers.some((a) => NON_POSITIVE_OPTIONS.has(a.option.id)) : true
  return riskyCombinations.filter((r) => {
    if (r.id === 'chaining-rankers') {
      return rankingStages >= 2 && r.methodIds.filter((id) => picked.has(id)).length >= 2
    }
    if (r.id === 'weights-twice') {
      return rankingStages >= 2 && picked.has('ahp')
    }
    if (r.id === 'ratio-shifted') {
      return hasNonPositive && r.methodIds.some((id) => picked.has(id))
    }
    const wIds = r.methodIds.filter((id) => methodMeta[id].family.startsWith('weighting'))
    const rIds = r.methodIds.filter((id) => !methodMeta[id].family.startsWith('weighting'))
    if (wIds.length > 0 && rIds.length > 0) {
      return wIds.some((id) => picked.has(id)) && rIds.some((id) => picked.has(id))
    }
    const hits = r.methodIds.filter((id) => picked.has(id)).length
    return r.methodIds.length === 1 ? hits === 1 : hits >= 2
  })
}

/**
 * "Which method should I choose?": the decision tree from src/content/guide.ts, one question at a
 * time. Answers stay listed and can be changed; recommendations add up along the path.
 */
export function Guide() {
  const { t } = useTranslation()
  const [lang] = useLang()
  const [path, setPath] = useState<Answer[]>([])
  const questionRef = useRef<HTMLHeadingElement>(null)

  const last = path.at(-1)
  const currentId = last ? last.option.next : decisionTree.start
  const current = currentId ? getGuideNode(currentId) : undefined
  const done = path.length > 0 && !current

  const recommendations = useMemo(
    () => path.filter((a) => a.option.recommend).map((a) => ({ stage: a.node.stage, rec: a.option.recommend! })),
    [path],
  )
  const risks = useMemo(() => {
    const picked = new Set<MethodId>(recommendations.flatMap((r) => r.rec.methodIds))
    const rankingStages = recommendations.filter((r) => r.stage === 'ranking').length
    return risksFor(picked, rankingStages, path)
  }, [recommendations, path])

  const answer = (node: GuideNode, option: GuideOption) => {
    setPath((p) => [...p, { node, option }])
    // Keep the keyboard where the next question appears.
    requestAnimationFrame(() => questionRef.current?.focus())
  }
  const changeFrom = (index: number) => {
    setPath((p) => p.slice(0, index))
    requestAnimationFrame(() => questionRef.current?.focus())
  }

  return (
    <section aria-labelledby="guide-title" id="guide" className="flex scroll-mt-20 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 id="guide-title" className="text-20 font-semibold text-text">
          {t('methods.guide.title')}
        </h2>
        <p className="text-14 text-text-2">{t('methods.guide.intro')}</p>
      </div>

      {path.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-13 font-medium text-text-2">{t('methods.guide.answers')}</h3>
          <ol className="flex flex-col border-t border-line">
            {path.map((a, i) => (
              <li key={a.node.id} className="flex items-start justify-between gap-3 border-b border-line py-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-13 text-text-2">{a.node.question[lang]}</span>
                  <span className="text-14 text-text">{a.option.label[lang]}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => changeFrom(i)}
                  aria-label={`${t('methods.guide.change')}: ${a.node.question[lang]}`}
                >
                  {t('methods.guide.change')}
                </Button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {current && (
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="contents">
            <span className="text-12 text-text-2">{t(`methods.guide.stage.${current.stage}`)}</span>
            <h3 ref={questionRef} tabIndex={-1} className="mt-1 text-16 font-medium text-text outline-none">
              {current.question[lang]}
            </h3>
          </legend>
          {current.help && <p className="text-13 text-text-2">{current.help[lang]}</p>}
          <div className="flex flex-col gap-2">
            {current.options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => answer(current, o)}
                className="rounded-control border border-line-strong bg-surface px-3 py-2 text-left text-14 text-text transition-colors hover:bg-surface-2 active:translate-y-px"
              >
                {o.label[lang]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {done && (
        <h3 ref={questionRef} tabIndex={-1} className="text-16 font-medium text-text outline-none">
          {t('methods.guide.suggestions')}
        </h3>
      )}

      {recommendations.length > 0 && (
        <div className="flex flex-col gap-3" aria-live="polite">
          {!done && <h3 className="text-13 font-medium text-text-2">{t('methods.guide.suggestionsSoFar')}</h3>}
          <ul className="flex flex-col gap-4">
            {recommendations.map(({ stage, rec }, i) => (
              <li key={i} className="flex flex-col gap-2 border-t border-line pt-3">
                <span className="text-12 text-text-2">{t(`methods.guide.stage.${stage}`)}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {rec.methodIds.map((id) => {
                    const m = methodMeta[id]
                    return (
                      <span key={id} className="inline-flex items-center gap-2">
                        <Link
                          href={`/methods/${id}`}
                          className="text-14 font-semibold text-text underline decoration-line-strong underline-offset-2 hover:decoration-text"
                        >
                          {m.name[lang]}
                        </Link>
                        <StatusLabel status={m.status} />
                      </span>
                    )
                  })}
                </div>
                <p className="text-14 text-text-2">{rec.reason[lang]}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {done && risks.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-14 font-semibold text-text">{t('methods.guide.risks')}</h3>
          <ul className="flex flex-col gap-3">
            {risks.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 rounded-control bg-warning-bg px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-14 font-medium text-text">{r.title[lang]}</span>
                  <span
                    className={cn(
                      'inline-flex h-5 items-center rounded-control border px-1.5 text-12',
                      r.basis === 'analysis' ? 'border-warning font-medium text-text' : 'border-line-strong text-text-2',
                    )}
                  >
                    {BASIS_LABEL[r.basis][lang]}
                  </span>
                </div>
                <p className="text-13 text-text-2">{r.text[lang]}</p>
                {r.sources.length > 0 && (
                  <details className="text-13 text-text-2">
                    <summary className="cursor-pointer text-text-2 hover:text-text">{t('methods.guide.riskSources')}</summary>
                    <ul className="mt-1 flex flex-col gap-1 pl-4">
                      {r.evidence && <li>{r.evidence[lang]}</li>}
                      {r.sources.map((s) => (
                        <li key={s.label}>
                          <SourceItem source={s} />
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {path.length > 0 && (
          <Button variant="secondary" size="sm" icon={<ArrowCounterClockwise aria-hidden />} onClick={() => changeFrom(0)}>
            {t('methods.guide.restart')}
          </Button>
        )}
      </div>

      <details className="text-13 text-text-2">
        <summary className="cursor-pointer hover:text-text">{t('methods.guide.treeSources')}</summary>
        <p className="mt-2">{decisionTreeIntro[lang]}</p>
        <ul className="mt-2 flex flex-col gap-1 pl-4">
          {decisionTreeSources.map((s) => (
            <li key={s.label}>
              <SourceItem source={s} />
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
