import { ArrowsDownUp, Check } from '@phosphor-icons/react'
import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_DELTAS, perturbWeights } from '../../../core/robustness'
import { rankerFor, type RankingRun } from '../../../core/run'
import type { Problem } from '../../../core/types'
import { ChartFigure } from '../../../features/charts/ChartFigure'
import { estimateTextWidth } from '../../../features/charts/layout'
import { useElementWidth } from '../../../features/charts/useElementWidth'
import { useNumberFormat } from '../../../i18n'
import { applicable, formatDelta, heldCount, perturbGrid } from './helpers'
import s from './robustness.module.css'
import { SectionHead, SourcesDisclosure } from './SectionParts'
import { useRobustnessText } from './text'

type Props = {
  problem: Problem
  weights: readonly number[]
  /** The ranking method and options, the same the workbench ranked with. */
  run: RankingRun
  names: string[]
  criteria: string[]
}

/** Cell widths: with the new leader's name, or the icon alone on a narrow screen. */
const CELL = 56
const CELL_COMPACT = 34
const GAP = 2

type Cell = { kind: 'same' } | { kind: 'changed'; leader: string } | { kind: 'na' } | null

/**
 * B: small changes. Each weight moved by ±5, 10 and 20 % (the others rescaled): one cell per criterion and change,
 * a plain tick where first place holds, a tinted cell with an icon and the new leader's name where it does not. A
 * criterion with weight 0 is not perturbed at all (n/a, left out of the count). On a narrow screen the cells keep only
 * their icon and the changes are listed under the grid, so nothing hides behind a sideways scroll. WS and ρ are in
 * the table behind "Show as table".
 */
export function PerturbSection({ problem, weights, run, names, criteria }: Props) {
  const { t } = useRobustnessText()
  const { t: tw } = useTranslation()
  const nf = useNumberFormat(4)
  const uid = useId()
  const [boxRef, boxWidth] = useElementWidth<HTMLElement>()
  const rows = useMemo(() => perturbWeights(problem, weights, rankerFor(run), DEFAULT_DELTAS), [problem, weights, run])
  const grid = useMemo(() => perturbGrid(rows, criteria.length, DEFAULT_DELTAS), [rows, criteria.length])
  const { held, total } = heldCount(rows, weights)
  const anyZero = rows.some((r) => !applicable(r, weights))
  const leader = (ranking: readonly number[]) =>
    ranking
      .map((r, i) => (r === 1 ? names[i] : null))
      .filter((x): x is string => x !== null)
      .join(', ')
  const deltaText = DEFAULT_DELTAS.map((d) => formatDelta(d, nf.lang))
  const labelWidth = Math.min(140, Math.max(...criteria.map((c) => estimateTextWidth(c, 13))) + 24)
  const compact = labelWidth + DEFAULT_DELTAS.length * (CELL + GAP) > boxWidth

  const table = {
    corner: t('sweep.criterion'),
    columns: [t('perturb.change'), t('perturb.firstPlace'), t('perturb.ws'), 'ρ'],
    rows: rows.map((r) => {
      const na = !applicable(r, weights)
      return {
        label: criteria[r.k] ?? '',
        cells: [
          formatDelta(r.delta, nf.lang),
          na ? t('perturb.na') : r.sameTop ? t('perturb.same') : t('perturb.changed', { name: leader(r.ranking) }),
          na ? t('perturb.na') : nf.format(r.ws),
          na ? t('perturb.na') : nf.format(r.spearman, 3),
        ],
      }
    }),
  }
  const changes = rows.filter((r) => applicable(r, weights) && !r.sameTop)

  return (
    <section aria-labelledby={`${uid}-title`} className="flex flex-col gap-4" ref={boxRef}>
      <SectionHead id={`${uid}-title`} title={t('perturb.title')} lead={t('perturb.lead')} />
      <p className="text-16 font-medium text-text" data-testid="perturb-summary">
        {total > 0 ? t('perturb.summary', { held, total }) : t('perturb.allOnOne')}
      </p>
      {/* All the weight on one criterion: nothing can be nudged, so no grid of n/a cells and no note about weight 0. */}
      {total > 0 && (
        <ChartFigure
          titleId={`${uid}-chart`}
          tableId={`${uid}-table`}
          title={t('perturb.chartTitle')}
          showTable={tw('workbench.chart.showTable')}
          table={table}
          plotRef={null}
          className="max-w-[720px]"
        >
          <div
            role="img"
            aria-labelledby={`${uid}-chart`}
            aria-describedby={`${uid}-table`}
            className={s.pgrid}
            data-compact={compact || undefined}
            style={{ gridTemplateColumns: `minmax(0, ${labelWidth}px) repeat(${DEFAULT_DELTAS.length}, minmax(${compact ? CELL_COMPACT : CELL}px, auto))` }}
          >
            <span />
            {deltaText.map((d) => (
              <span key={d} className={s.pcol}>
                {d}
              </span>
            ))}
            {grid.map((cells, j) => (
              <PerturbRow
                key={j}
                criterion={criteria[j] ?? ''}
                compact={compact}
                na={t('perturb.na')}
                cells={cells.map((r): Cell => (!r || !applicable(r, weights) ? { kind: 'na' } : r.sameTop ? { kind: 'same' } : { kind: 'changed', leader: leader(r.ranking) }))}
              />
            ))}
          </div>
        </ChartFigure>
      )}
      {compact && changes.length > 0 && (
        <ul className="flex flex-col gap-1 text-13 text-text" data-testid="perturb-changes">
          {changes.map((r) => (
            <li key={`${r.k}-${r.delta}`} className="inline-flex items-center gap-1.5">
              <ArrowsDownUp aria-hidden className="size-3.5 shrink-0 text-text-2" />
              {t('perturb.changedAt', { criterion: criteria[r.k], delta: formatDelta(r.delta, nf.lang), name: leader(r.ranking) })}
            </li>
          ))}
        </ul>
      )}
      {anyZero && total > 0 && <p className="text-13 text-text-2">{t('perturb.zeroNote')}</p>}
      <SourcesDisclosure part="perturb" />
    </section>
  )
}

function PerturbRow({ criterion, cells, compact, na }: { criterion: string; cells: Cell[]; compact: boolean; na: string }) {
  return (
    <>
      <span className={s.prow} title={criterion}>
        {criterion}
      </span>
      {cells.map((c, d) => {
        if (c === null) return <span key={d} className={s.pcell} />
        if (c.kind === 'na')
          return (
            <span key={d} className={s.pcell} data-na="" data-testid="perturb-cell">
              {na}
            </span>
          )
        if (c.kind === 'same')
          return (
            <span key={d} className={s.pcell} data-testid="perturb-cell">
              <Check aria-hidden className="size-3.5" />
            </span>
          )
        return (
          <span key={d} className={s.pcell} data-changed="" data-testid="perturb-cell" title={c.leader}>
            <ArrowsDownUp aria-hidden className="size-3.5 shrink-0" />
            {!compact && <span className={s.pname}>{c.leader}</span>}
          </span>
        )
      })}
    </>
  )
}
