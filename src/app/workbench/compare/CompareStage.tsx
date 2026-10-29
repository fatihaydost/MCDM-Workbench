import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { COMPARE_ORDER, compareRankings, defaultPair, identicalRankings, pairFacts, rankCorrelationMatrix, type Comparison } from '../../../core'
import { Heatmap } from '../../../features/charts'
import { RankLines, type RankLinesColumn } from '../../../features/illustrations/RankLines'
import { useNumberFormat } from '../../../i18n'
import { isEmptyProblem, runFor, toProblem, useWeights, useWorkbench } from '../../../state/workbench'
import { Button, cn, EmptyState } from '../../../ui'
import { viewOf } from '../../methods/views'
import { useWorkbenchNav } from '../nav'
import { BlockedByIssues } from '../parts'
import { alternativeName, criterionName, placeIssue, tr } from '../shared'
import { useCompareText } from './text'
import { whySentences } from './why'

export const ECHO_NOTE_KEYS = new Set([
  'copras_saw',
  'copras_ahp-ranking',
  'ahp-ranking_copras',
  'ahp-ranking_saw',
  'saw_ahp-ranking',
  'vikor_mabac',
  'mabac_vikor',
  'promethee-ii_mabac',
  'mabac_promethee-ii',
  'vikor_promethee-ii',
  'promethee-ii_vikor',
  'waspas_saw',
  'waspas_marcos',
  'marcos_saw',
])

/**
 * Compare: every ranking method on the same data and weights, each with its own saved options. Read only: nothing
 * here changes the user's choices.
 */
export default function CompareStage() {
  const { t } = useTranslation()
  const { t: tc } = useCompareText()
  const draft = useWorkbench((s) => s.problem)
  const methodParams = useWorkbench((s) => s.methodParams)
  const alternativeJudgements = useWorkbench((s) => s.alternativeJudgements)
  const weights = useWeights()
  const { goTo } = useWorkbenchNav()
  const w = weights.value?.weights

  const comparison = useMemo(
    () =>
      w
        ? compareRankings(
            toProblem(draft),
            w,
            COMPARE_ORDER.map((id) => runFor({ methodParams, alternativeJudgements }, id)),
          )
        : null,
    [draft, w, methodParams, alternativeJudgements],
  )

  if (isEmptyProblem(draft)) {
    return (
      <EmptyState
        title={t('workbench.empty.compare.title')}
        description={t('workbench.empty.compare.description')}
        action={<Button onClick={() => goTo('data')}>{t('workbench.empty.weights.action')}</Button>}
      />
    )
  }
  if (!comparison?.comparable) {
    // Why nothing can be compared: the weights, or the issues of every method that could not rank (deduplicated).
    const issues = comparison
      ? [...new Map(comparison.runs.flatMap((r) => r.issues).map((x) => [`${x.code}:${x.row}:${x.col}`, x])).values()]
      : weights.issues
    // Only one independent ranking and its echoes ranked: one ranking, not a blocked comparison.
    const firstEcho = comparison?.echoes[0]
    const onlyEcho = !!comparison && !!firstEcho && comparison.ranked.length - comparison.echoes.length === 1
    const echoSummary = comparison
      ? comparison.echoes
          .map((e) => {
            if (e.methodId === 'marcos' && e.of === 'saw' && comparison.echoes.length === 1) return tc('onlyOneRanking')
            const noteKey = `${e.methodId}_${e.of}`
            if (ECHO_NOTE_KEYS.has(noteKey)) return tc(`echoNote.${noteKey}` as 'onlyOneRanking')
            return tc('onlyOneRankingEcho', {
              method: tr(t, `workbench.rankingMethod.${e.methodId}`),
              of:
                e.of === 'saw'
                  ? tc(e.methodId === 'ahp-ranking' || e.methodId === 'copras' ? 'sawSum' : 'sawLinear')
                  : tr(t, `workbench.rankingMethod.${e.of}`),
            })
          })
          .join(' ')
      : ''
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title={t('workbench.empty.compare.title')}
          description={comparison ? (onlyEcho ? echoSummary : tc('blocked')) : tc('weightsBlocked')}
          className="pb-2"
        />
        <BlockedByIssues issues={issues} problem={draft} />
      </div>
    )
  }

  return <CompareReady comparison={comparison} weights={w!} />
}

/** The chart, its summary line and the "why" panel for the selected pair. */
function CompareReady({ comparison, weights }: { comparison: Comparison; weights: number[] }) {
  const { t } = useTranslation()
  const { t: tc, i18n } = useCompareText()
  const draft = useWorkbench((s) => s.problem)
  const nf = useNumberFormat()
  // The pair belongs to one comparison: after an edit (other data, weights or options) it starts from the top two again.
  const [pick, setPick] = useState(() => ({ comparison, pair: defaultPair(comparison) }))
  if (pick.comparison !== comparison) setPick({ comparison, pair: defaultPair(comparison) })
  const selected = pick.comparison === comparison ? pick.pair : defaultPair(comparison)
  const setSelected = (pair: [number, number]) => setPick({ comparison, pair })
  const names = draft.alternatives.map((_, i) => alternativeName(draft, i, t))

  const hasCrossings = useMemo(() => {
    const rs = comparison.runs.flatMap((r) => (r.result ? [r.result.ranking] : []))
    const m = draft.alternatives.length
    for (let p = 0; p < m; p++) {
      for (let q = p + 1; q < m; q++) {
        let aWins = false
        let bWins = false
        for (const r of rs) {
          if (r[p]! < r[q]!) aWins = true
          else if (r[p]! > r[q]!) bWins = true
          if (aWins && bWins) return true
        }
      }
    }
    return false
  }, [comparison, draft.alternatives.length])

  const columns: RankLinesColumn[] = comparison.runs.map((r) => {
    const label = tr(t, `workbench.rankingMethod.${r.methodId}`)
    if (!r.result) {
      const issue = r.issues.find((x) => x.severity === 'error')
      return { methodId: r.methodId, label, ranking: null, reason: issue && placeIssue(issue, draft, t, nf.format).message }
    }
    // A column is the method's score order; when its answer is a set (VIKOR's compromise set), a line says so (decision 6).
    const set = viewOf(r.methodId)?.verdict?.(r.result, names, t, nf.format)?.set ?? []
    const note = set.length > 1 ? tc('vikorNote', { list: set.map((i) => names[i]).join(', ') }) : undefined
    return { methodId: r.methodId, label, ranking: r.result.ranking, note }
  })
  const { echoes, firstPlace, kendallW, ranked, runs } = comparison
  const correlation = useMemo(() => rankCorrelationMatrix(comparison), [comparison])
  const correlationLabels = useMemo(
    () => correlation.methods.map((id) => tr(t, `workbench.rankingMethod.${id}`)),
    [correlation.methods, t],
  )

  return (
    <div className="flex flex-col gap-3" data-testid="compare-ready">
      <RankLines
        columns={columns}
        borda={comparison.borda?.ranking ?? null}
        names={names}
        selected={selected}
        onSelectPair={setSelected}
        labels={{
          title: tc('chart.title'),
          description: tc('chart.description'),
          showTable: t('workbench.chart.showTable'),
          alternative: t('workbench.alternative'),
          borda: tc('chart.borda'),
          notRanked: tc('chart.notRanked'),
          crossing: (a, b, from, to) => tc('chart.crossing', { a, b, from, to }),
        }}
        className="max-w-[1040px]"
      />
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-13 text-text-2" data-testid="compare-summary">
        {/* MARCOS = c x SAW (Linear): one order, counted once in Borda, W and the first place (decision 4, 18.10). */}
        {echoes.map((e) => {
          const noteKey = `${e.methodId}_${e.of}`
          const note = ECHO_NOTE_KEYS.has(noteKey) ? tc(`echoNote.${noteKey}` as 'onlyOneRanking') : undefined
          return (
            <span
              key={e.methodId}
              title={note}
              className="inline-flex h-5 items-center rounded-control border border-line-strong px-1.5 text-12 font-medium whitespace-nowrap text-text"
              data-testid={`${e.methodId}-badge`}
            >
              {tc('echo', {
                method: tr(t, `workbench.rankingMethod.${e.methodId}`),
                of:
                  e.of === 'saw'
                    ? tc(e.methodId === 'ahp-ranking' || e.methodId === 'copras' ? 'sawSum' : 'sawLinear')
                    : tr(t, `workbench.rankingMethod.${e.of}`),
              })}
            </span>
          )
        })}
        {kendallW !== null && <span>{tc('summary.w', { w: nf.format(kendallW, 2) })}</span>}
        {firstPlace && <span>{tc('summary.first', { name: names[firstPlace.alternative]!, n: firstPlace.methods, of: firstPlace.of })}</span>}
        {ranked.length < runs.length && <span>{tc('summary.ranked', { n: ranked.length, of: runs.length })}</span>}
      </p>
      {selected && names.length >= 2 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-13 text-text-2">
          <span className="font-medium text-text">{tc('pair.label')}:</span>
          <select
            aria-label={`${tc('pair.label')} A`}
            value={selected[0]}
            onChange={(e) => {
              const nextA = Number(e.target.value)
              const nextB = nextA === selected[1] ? selected[0] : selected[1]
              setSelected([nextA, nextB])
            }}
            className="h-7 rounded-control border border-line-strong bg-surface px-2 text-13 font-medium text-text"
          >
            {names.map((name, idx) => (
              <option key={idx} value={idx}>
                {name}
              </option>
            ))}
          </select>
          <span>{tc('pair.vs')}</span>
          <select
            aria-label={`${tc('pair.label')} B`}
            value={selected[1]}
            onChange={(e) => {
              const nextB = Number(e.target.value)
              const nextA = nextB === selected[0] ? selected[1] : selected[0]
              setSelected([nextA, nextB])
            }}
            className="h-7 rounded-control border border-line-strong bg-surface px-2 text-13 font-medium text-text"
          >
            {names.map((name, idx) => (
              <option key={idx} value={idx}>
                {name}
              </option>
            ))}
          </select>
          <span className="text-12 text-text-3">{tc('pair.hint')}</span>
        </div>
      )}
      {selected && (() => {
        const facts = pairFacts(toProblem(draft), weights, comparison, selected[0], selected[1])
        const sentences = whySentences(facts, {
          names,
          criteria: draft.criteria.map((_, j) => criterionName(draft.criteria, j, t)),
          methodLabel: (id) => tr(t, `workbench.rankingMethod.${id}`),
          t: tc,
          lang: i18n.language,
          identical: identicalRankings(comparison),
          hasCrossings,
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
      })()}
      {correlation.methods.length >= 2 && (
        <section className="mt-3 max-w-[1040px]" data-testid="compare-correlation">
          <Heatmap
            title={tc('correlation.title')}
            description={tc('correlation.description')}
            rowLabels={correlationLabels}
            colLabels={correlationLabels}
            values={correlation.matrix}
            scale="diverging"
            domain={[-1, 1]}
            format={(v) => nf.format(v, 2)}
            tableLabels={{ show: t('workbench.chart.showTable'), corner: t('workbench.rankingMethod.label') }}
          />
        </section>
      )}
      <CompareRankMatrix
        columns={columns}
        borda={comparison.borda?.ranking ?? null}
        names={names}
        selected={selected}
        onSelectRow={(altIdx) => {
          if (!selected) return
          if (altIdx === selected[0] || altIdx === selected[1]) return
          setSelected([selected[0], altIdx])
        }}
      />
    </div>
  )
}

function CompareRankMatrix({
  columns,
  borda,
  names,
  selected,
  onSelectRow,
}: {
  columns: RankLinesColumn[]
  borda: number[] | null
  names: string[]
  selected: [number, number] | null
  onSelectRow: (altIdx: number) => void
}) {
  const { t } = useTranslation()
  const { t: tc } = useCompareText()
  const rankedCols = columns.filter((c) => c.ranking !== null)
  const order = borda
    ? names.map((_, i) => i).sort((p, q) => borda[p]! - borda[q]! || p - q)
    : names.map((_, i) => i)

  return (
    <section className="mt-3 flex max-w-[1040px] flex-col gap-2" data-testid="compare-matrix">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-14 font-semibold text-text">{tc('matrix.title')}</h2>
        <p className="text-13 text-text-2">{tc('matrix.description')}</p>
      </div>
      <div className="max-w-full overflow-x-auto rounded-control border border-line">
        <table className="w-full border-separate border-spacing-0 text-13">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 h-8 border-b border-line bg-surface-2 px-3 text-left text-12 font-medium whitespace-nowrap text-text-2">
                {t('workbench.alternative')}
              </th>
              {rankedCols.map((c) => (
                <th key={c.methodId} scope="col" className="h-8 border-b border-line bg-surface-2 px-2.5 text-center text-12 font-medium whitespace-nowrap text-text-2">
                  {c.label}
                </th>
              ))}
              {borda && (
                <th scope="col" className="h-8 border-b border-l border-line bg-surface-2 px-3 text-center text-12 font-semibold whitespace-nowrap text-text">
                  {tc('matrix.borda')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {order.map((altIdx) => {
              const isSelected = selected !== null && (selected[0] === altIdx || selected[1] === altIdx)
              return (
                <tr
                  key={altIdx}
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => onSelectRow(altIdx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectRow(altIdx)
                    }
                  }}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                    isSelected && 'bg-accent-bg/35',
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-[1] h-8 border-b border-line px-3 text-left font-medium whitespace-nowrap',
                      isSelected ? 'bg-accent-bg text-text font-semibold' : 'bg-bg text-text',
                    )}
                  >
                    {names[altIdx]}
                  </th>
                  {rankedCols.map((c) => {
                    const r = c.ranking![altIdx]!
                    return (
                      <td key={c.methodId} className="num h-8 border-b border-line px-2 text-center font-mono">
                        <span
                          className={cn(
                            'inline-flex min-w-5 items-center justify-center rounded-xs px-1 py-0.5 text-12',
                            r === 1
                              ? 'bg-accent-bg font-semibold text-accent'
                              : r <= 3
                                ? 'font-medium text-text'
                                : 'text-text-3',
                          )}
                        >
                          {r}
                        </span>
                      </td>
                    )
                  })}
                  {borda && (
                    <td className="num h-8 border-b border-l border-line bg-surface/50 px-3 text-center font-mono font-semibold text-text">
                      {borda[altIdx]}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
