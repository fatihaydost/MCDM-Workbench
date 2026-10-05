import { ArrowsDownUp, Check } from '@phosphor-icons/react'
import { useId, useMemo, useState } from 'react'
import { removeCriteria, type RemovalRow } from '../../../core/robustness'
import type { MethodParams, Problem, RankingMethod, WeightingMethod } from '../../../core/types'
import { useNumberFormat } from '../../../i18n'
import { cn, Notice, SegmentedControl, Table, TBody, Td, Th, THead, Tr } from '../../../ui'
import s from './robustness.module.css'
import { SectionHead, SourcesDisclosure } from './SectionParts'
import { useRobustnessText } from './text'

type Props = {
  problem: Problem
  weights: readonly number[]
  method: RankingMethod
  /** The ranking method's options. */
  params: MethodParams
  /** The objective weighting method (CRITIC, Entropy) when the weights come from one: offers "recompute". */
  weighting: WeightingMethod | undefined
  /** Its options, so the recompute runs the same variant. */
  weightingParams: MethodParams
  weightingName: string
  names: string[]
  criteria: string[]
}

/**
 * D: leave one criterion out. One row per dropped criterion: does first place hold, and how close is the new ranking
 * to yours (Spearman ρ, WS). With objective weights (CRITIC, Entropy) the rest can be rescaled or the method run again
 * without the criterion.
 */
export function RemovalSection({ problem, weights, method, params, weighting, weightingParams, weightingName, names, criteria }: Props) {
  const { t } = useRobustnessText()
  const nf = useNumberFormat(4)
  const uid = useId()
  const [mode, setMode] = useState<RemovalRow['mode']>('renormalize')
  const rows = useMemo(
    () => removeCriteria(problem, weights, method, weighting, { rankingParams: params, weightingParams }),
    [problem, weights, method, params, weighting, weightingParams],
  )
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
              {shown.map((r) => (
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
              ))}
            </TBody>
          </Table>
        </>
      )}
      <SourcesDisclosure part="removal" recompute={weighting ? weightingName : undefined} />
    </section>
  )
}
