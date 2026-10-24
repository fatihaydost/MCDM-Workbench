import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { critic, topsis, type Problem } from '../../core'
import { reweight } from '../../core/reweight'
import { doiUrl, getExample, shortCitation } from '../../data/examples'
import { BarChart } from '../../features/charts'
import { formatNumber, useLang } from '../../i18n'
import { Button } from '../../ui/Button'
import { LiveRanking } from '../ranking/LiveRanking'
import { rankOrder } from '../ranking/order'
import { WeightRange } from '../ranking/WeightRange'
import { textLink } from './usePageMeta'

const EXAMPLE_ID = 'krishnan-2021-smartphones'
/** Price, the first criterion: over its weight first place passes from C (best screen) to E to D (cheapest). */
const PRICE = 0

/**
 * The hero's right side: the published Krishnan et al. (2021) smartphone data, weighted with
 * CRITIC and ranked with TOPSIS by the same core the workbench uses. Nothing here is a mock:
 * the numbers are computed on every render from src/data/examples.ts.
 *
 * The reader can move the weight of price (the others keep their proportions, as in the workbench's
 * robustness stage): the rows slide to their new places and the weight bars follow.
 */
export function HeroResult() {
  const { t } = useTranslation()
  const [lang] = useLang()
  const uid = useId()
  const sliderId = `${uid}-price`
  const example = getExample(EXAMPLE_ID)!
  // null: the CRITIC weight, untouched.
  const [price, setPrice] = useState<number | null>(null)
  // The first-place sentence is said only after the reader has moved the slider, not on load.
  const [touched, setTouched] = useState(false)
  // Set by the key handler just before the weight changes: a held-down key makes the rows jump instead of slide.
  const keyRepeat = useRef(false)

  const base = useMemo(() => {
    const problem: Problem = {
      alternatives: example.alternatives,
      criteria: example.criteria.map((c) => ({ name: c.name[lang], type: c.type })),
      matrix: example.matrix,
    }
    return { problem, weights: critic.compute(problem, {}).weights }
  }, [example, lang])

  const result = useMemo(() => {
    const weights = price === null ? base.weights : reweight(base.weights, PRICE, price)
    const ranking = topsis.compute(base.problem, weights, {})
    return { weights, ranking, order: rankOrder(ranking.ranking) }
  }, [base, price])

  const fmt4 = useCallback((v: number) => formatNumber(v, lang, 4), [lang])
  const moved = price !== null
  const baseWeight = base.weights[PRICE]!
  const weight = price ?? baseWeight
  const bestWeight = base.weights.indexOf(Math.max(...base.weights))
  const criterionNames = useMemo(() => base.problem.criteria.map((c) => c.name), [base])
  const names = base.problem.alternatives
  const leaders = result.order.filter((i) => result.ranking.ranking[i] === 1)

  const setWeight = (v: number | null, repeat = false) => {
    keyRepeat.current = repeat
    setTouched(true)
    setPrice(v)
  }
  // The reset button goes away with the change it undoes: focus returns to the slider, not to the page.
  const reset = () => {
    setWeight(null)
    document.getElementById(sliderId)?.focus()
  }

  return (
    <section
      aria-labelledby="hero-result-title"
      className="flex min-w-0 flex-col gap-5 rounded-control border border-line bg-surface p-4 md:p-6"
    >
      <header className="flex flex-col gap-0.5">
        <h2 id="hero-result-title" className="text-16 font-semibold text-text">
          {t('landing.result.title')}
        </h2>
        <p className="text-13 text-text-2">{t(moved ? 'landing.result.subtitleMoved' : 'landing.result.subtitle')}</p>
      </header>

      <LiveRanking
        order={result.order}
        ranking={result.ranking.ranking}
        scores={result.ranking.scores}
        names={names}
        format={fmt4}
        labelledBy="hero-result-title"
        instant={keyRepeat.current}
        density="compact"
        columns={{
          rank: t('landing.result.rank'),
          alternative: t('landing.result.alternative'),
          closeness: t('landing.result.closeness'),
        }}
      />
      {/* Said when first place changes; the table itself is not a live region (it changes on every step). */}
      <p aria-live="polite" className="sr-only">
        {touched ? t('landing.result.leader', { name: leaders.map((i) => names[i]).join(', ') }) : ''}
      </p>

      <div className="flex flex-col gap-1">
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-14 text-text-2">
            <label htmlFor={sliderId}>{t('landing.result.priceWeight')}</label>{' '}
            <output htmlFor={sliderId} className="num font-semibold text-text" data-testid="hero-price-weight">
              {fmt4(weight)}
            </output>
          </p>
          {moved ? (
            <Button size="sm" variant="ghost" icon={<ArrowCounterClockwise aria-hidden />} onClick={reset}>
              {t('landing.result.reset')}
            </Button>
          ) : (
            <p className="text-13 text-text-2">{t('landing.result.invite')}</p>
          )}
        </div>
        <WeightRange id={sliderId} value={weight} base={baseWeight} valueText={fmt4(weight)} onChange={setWeight} />
      </div>

      <BarChart
        title={t(moved ? 'landing.result.weightsTitleMoved' : 'landing.result.weightsTitle')}
        labels={criterionNames}
        values={result.weights}
        highlight={moved ? PRICE : bestWeight}
        format={fmt4}
        instant={keyRepeat.current}
        tableLabels={{ show: t('landing.result.showTable'), label: t('landing.result.criterion'), value: t('landing.result.weight') }}
      />

      <footer className="flex flex-col gap-1 border-t border-line pt-3 text-12 text-text-2">
        <p>
          {t('landing.result.data', { citation: shortCitation(example.citation, lang) })}{' '}
          <a href={doiUrl(example.citation.doi)} className={textLink} target="_blank" rel="noreferrer">
            doi:{example.citation.doi}
          </a>
        </p>
        <p>{t('landing.result.check')}</p>
      </footer>
    </section>
  )
}
