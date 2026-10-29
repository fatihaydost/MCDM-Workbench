import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { critic, topsis } from '../../core'
import { reweight } from '../../core/reweight'
import { getExample } from '../../data/examples'
// Direct import, so the landing chunk does not pull in the other illustrations.
import { PipelineDiagram } from '../../features/illustrations/PipelineDiagram'
import { formatNumber, useLang } from '../../i18n'
import { textLink } from './usePageMeta'

const STEPS = 20
const TOP_INDICES = [2, 4, 3] as const // C, E, D in Krishnan (2021)

/** "How it works": the real pipeline, with the CRITIC weights of the hero's example in the weight box, plus a live mini stability preview. */
export function Pipeline() {
  const { t } = useTranslation()
  const [lang] = useLang()
  const { weights, curves, basePrice } = useMemo(() => {
    const ex = getExample('krishnan-2021-smartphones')!
    const problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
    const w = critic.compute(problem, {}).weights
    const grid = Array.from({ length: STEPS + 1 }, (_, i) => i / STEPS)
    const series = TOP_INDICES.map((altIdx) => ({
      name: ex.alternatives[altIdx]!,
      points: grid.map((wk) => ({
        wk,
        score: topsis.compute(problem, reweight(w, 0, wk), {}).scores[altIdx]!,
      })),
    }))
    return { weights: w, curves: series, basePrice: w[0]! }
  }, [])

  return (
    <section aria-labelledby="how-title" className="flex flex-col gap-6">
      <h2 id="how-title" className="text-24 font-semibold text-text">
        {t('landing.how.title')}
      </h2>
      <PipelineDiagram
        methods={{ weights: 'CRITIC', ranking: 'TOPSIS' }}
        weights={weights}
        labels={{
          data: t('landing.how.labels.data'),
          weights: t('landing.how.labels.weights'),
          ranking: t('landing.how.labels.ranking'),
          results: t('landing.how.labels.results'),
          robustness: t('landing.how.labels.robustness'),
        }}
      />

      <div className="grid grid-cols-1 items-center gap-6 rounded-control border border-line bg-surface p-4 md:grid-cols-[minmax(0,1fr)_320px] md:p-5">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-16 font-semibold text-text">{t('landing.how.robustnessCard.title')}</h3>
          <p className="max-w-[62ch] text-14 text-text-2">{t('landing.how.robustnessCard.lead')}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-13">
            <Link href="/app?example=krishnan-2021-smartphones&stage=robustness" className={textLink}>
              {t('landing.how.robustnessCard.openRobustness')}
            </Link>
            <Link href="/app?example=krishnan-2021-smartphones&stage=compare" className={textLink}>
              {t('landing.how.robustnessCard.openCompare')}
            </Link>
          </div>
        </div>

        <figure className="m-0 flex flex-col gap-1" role="img" aria-label={t('landing.how.robustnessCard.aria')}>
          <svg viewBox="0 0 280 84" className="block h-auto w-full overflow-visible" aria-hidden="true">
            <line x1={24} y1={66} x2={264} y2={66} stroke="var(--line-strong)" strokeWidth={1} />
            <line
              x1={24 + basePrice * 240}
              y1={10}
              x2={24 + basePrice * 240}
              y2={66}
              stroke="var(--text-3)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {curves.map((c, idx) => {
              const d = c.points
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${(24 + p.wk * 240).toFixed(1)} ${(64 - p.score * 50).toFixed(1)}`)
                .join(' ')
              const stroke = idx === 1 ? 'var(--data-accent)' : 'var(--data-context)'
              const width = idx === 1 ? 2 : 1.25
              const last = c.points[c.points.length - 1]!
              return (
                <g key={c.name}>
                  <path d={d} fill="none" stroke={stroke} strokeWidth={width} opacity={idx === 1 ? 1 : 0.65} />
                  <text
                    x={267}
                    y={64 - last.score * 50}
                    fill={ idx === 1 ? 'var(--text)' : 'var(--text-2)' }
                    fontSize={10}
                    fontWeight={idx === 1 ? 600 : 400}
                    dominantBaseline="central"
                  >
                    {c.name.replace(/^Phone\s+/i, '')}
                  </text>
                </g>
              )
            })}
            <text x={24} y={78} fill="var(--text-3)" fontSize={10}>
              {formatNumber(0, lang, 1)}
            </text>
            <text x={24 + basePrice * 240} y={78} fill="var(--text-2)" fontSize={10} textAnchor="middle">
              w = {formatNumber(basePrice, lang, 2)}
            </text>
            <text x={264} y={78} fill="var(--text-3)" fontSize={10} textAnchor="end">
              {formatNumber(1, lang, 1)}
            </text>
          </svg>
        </figure>
      </div>
    </section>
  )
}
