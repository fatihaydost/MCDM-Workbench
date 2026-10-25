import { ArrowsDownUp, Check, Prohibit } from '@phosphor-icons/react'
import { useId, useMemo, useState } from 'react'
import { removeCriteria, type RemovalRow } from '../../../core/robustness'
import { rankerFor, type RankingRun } from '../../../core/run'
import type { MethodParams, Problem, WeightingMethod } from '../../../core/types'
import { useNumberFormat } from '../../../i18n'
import { useWorkbench } from '../../../state/workbench'
import { cn, Notice, SegmentedControl, Table, TBody, Td, Th, THead, Tr } from '../../../ui'
import { blockedNames } from './helpers'
import s from './robustness.module.css'
import { SectionHead, SourcesDisclosure } from './SectionParts'
import { useRobustnessText } from './text'

type Props = {
  problem: Problem
  weights: readonly number[]
  /** The ranking method and options. */
  run: RankingRun
  /** The objective weighting method when the weights come from one: offers "recompute". */
  weighting: WeightingMethod | undefined
  /** Its options, so the recompute runs the same variant. */
  weightingParams: MethodParams
  weightingName: string
  names: string[]
  criteria: string[]
}

/**
 * D: leave one criterion out. One row per dropped criterion: does first place hold, and how close is the new ranking
 * to yours (Spearman ρ, WS). With weights from an objective weighting method the rest can be rescaled or the method run again
 * without the criterion.
 */
export function RemovalSection({ problem, weights, run, weighting, weightingParams, weightingName, names, criteria }: Props) {
  const { t } = useRobustnessText()
  const nf = useNumberFormat(4)
  const uid = useId()
  const [mode, setMode] = useState<RemovalRow['mode']>('renormalize')
  const judgements = useWorkbench((st) => st.judgements)
  const rawWeightingParams = useWorkbench((st) => (weighting ? st.methodParams?.[weighting.id] : undefined))
  const effectiveWeightingParams = useMemo(
    () => ({ ...rawWeightingParams, ...weightingParams }),
    [rawWeightingParams, weightingParams],
  )
  const rows = useMemo(() => {
    const opts = { weightingParams: effectiveWeightingParams, ...(judgements ? { judgements } : {}) }
    return removeCriteria(problem, weights, rankerFor(run), weighting, opts)
  }, [problem, weights, run, weighting, effectiveWeightingParams, judgements])
  const shown = rows.filter((r) => r.mode === (weighting ? mode : 'renormalize'))
  const leader = (ranking: readonly number[]) =>
    ranking
      .map((r, i) => (r === 1 ? names[i] : null))
      .filter((x): x is string => x !== null)
      .join(', ')

  return (
    <section aria-labelledby={`${uid}-title`} className="flex flex-col gap-4">
      <SectionHead id={`${uid}-title`} title={t('removal.title')} lead={t('removal.lead')} />
      {rows.length === 0 ? (
        <Notice tone="info">{t('removal.tooFew')}</Notice>
      ) : (
        <>
          {weighting && (
            <div className="flex flex-col gap-1.5">
              <span className="text-13 font-medium text-text-2">{t('removal.mode')}</span>
              <SegmentedControl<RemovalRow['mode']>
                aria-label={t('removal.mode')}
                value={mode}
                onValueChange={setMode}
                options={[
                  { value: 'renormalize', label: t('removal.renormalize') },
                  { value: 'recompute', label: t('removal.recompute', { method: weightingName }) },
                ]}
                size="md"
                className="self-start"
              />
            </div>
          )}
          <Table density="regular" aria-labelledby={`${uid}-title`} className="w-auto min-w-[min(100%,520px)]" containerClassName="max-w-[720px]">
            <THead>
              <Tr>
                <Th>{t('removal.without')}</Th>
                <Th>{t('removal.firstPlace')}</Th>
                <Th numeric>{t('removal.rho')}</Th>
                <Th numeric>{t('removal.ws')}</Th>
              </Tr>
            </THead>
            <TBody>
              {shown.map((r) => {
                if (r.blocked) {
                  const who = blockedNames(r.blocked, names)
                  return <BlockedRow key={`${r.j}-${r.mode}`} criterion={criteria[r.j] ?? ''} label={t('removal.cantRank')} reason={who && t('blockedBy', { name: who })} />
                }
                return (
                  <tr key={`${r.j}-${r.mode}`} className={cn(!r.sameTop && s.changedRow)} data-testid="removal-row" data-changed={!r.sameTop || undefined}>
                    <Th scope="row">{criteria[r.j]}</Th>
                    <Td>
                      <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', r.sameTop ? 'text-text-2' : 'font-medium text-text')}>
                        {r.sameTop ? <Check aria-hidden className="size-3.5 shrink-0" /> : <ArrowsDownUp aria-hidden className="size-3.5 shrink-0" />}
                        {r.sameTop ? t('removal.same', { name: leader(r.ranking) }) : t('removal.changed', { name: leader(r.ranking) })}
                      </span>
                    </Td>
                    <Td numeric>{nf.format(r.spearman, 3)}</Td>
                    <Td numeric>{nf.format(r.ws, 3)}</Td>
                  </tr>
                )
              })}
            </TBody>
          </Table>
        </>
      )}
      <SourcesDisclosure part="removal" recompute={weighting ? weightingName : undefined} />
    </section>
  )
}

/** A removal the method cannot rank (CoCoSo: an alternative is then the worst on every remaining criterion). */
function BlockedRow({ criterion, label, reason }: { criterion: string; label: string; reason: string }) {
  return (
    <tr data-testid="removal-row" data-blocked="">
      <Th scope="row">{criterion}</Th>
      <Td>
        <span className="inline-flex items-center gap-1.5 text-text-2">
          <Prohibit aria-hidden className="size-3.5 shrink-0" />
          {label}
          {reason && <span className="text-13">({reason})</span>}
        </span>
      </Td>
      <Td numeric>—</Td>
      <Td numeric>—</Td>
    </tr>
  )
}
