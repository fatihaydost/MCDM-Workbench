import { ArrowDown, ArrowUp } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { SWARA_STEP_RATIOS, type SwaraStepRatio } from '../../core'
import { useWorkbench, type DraftProblem } from '../../state/workbench'
import { Button, IconButton, NumberInput, Table, TBody, Td, Th, THead, Tr } from '../../ui'
import { SectionTitle } from './parts'
import { criterionName, tr } from './shared'

type Props = {
  problem: DraftProblem
  method: 'swara' | 'roc'
}

export function OrdinalWeights({ problem, method }: Props) {
  const { t } = useTranslation()
  const rawParams = useWorkbench((s) => s.methodParams?.[method]) as Readonly<Record<string, unknown>> | undefined
  const setMethodParam = useWorkbench((s) => s.setMethodParam)
  const n = problem.criteria.length
  const names = problem.criteria.map((_, j) => criterionName(problem.criteria, j, t))

  if (n < 2) return null

  if (method === 'swara') {
    const rawOrder = rawParams?.order
    const validOrder =
      Array.isArray(rawOrder) &&
      rawOrder.length === n &&
      rawOrder.every((idx) => typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 && idx < n) &&
      new Set(rawOrder).size === n
    const order: number[] = validOrder ? (rawOrder as number[]) : Array.from({ length: n }, (_, j) => j)

    const stepRatio: SwaraStepRatio =
      rawParams?.stepRatio === 'gentle' || rawParams?.stepRatio === 'steep' ? rawParams.stepRatio : 'moderate'
    const defaultRatio = SWARA_STEP_RATIOS[stepRatio]
    const rawS = rawParams?.s
    const sVec: number[] = (() => {
      if (Array.isArray(rawS)) {
        if (rawS.length === n) {
          return rawS.map((v, r) => (r === 0 ? 0 : typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : defaultRatio))
        }
        if (rawS.length === n - 1) {
          return [0, ...rawS.map((v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : defaultRatio))]
        }
      }
      return Array.from({ length: n }, (_, r) => (r === 0 ? 0 : defaultRatio))
    })()

    const isCustomOrder = order.some((idx, r) => idx !== r)
    const isCustomS = Array.isArray(rawS)
    const isCustom = isCustomOrder || isCustomS

    const moveRow = (rankIdx: number, delta: -1 | 1) => {
      const target = rankIdx + delta
      if (target < 0 || target >= n) return
      const nextOrder = [...order]
      const tmp = nextOrder[rankIdx]!
      nextOrder[rankIdx] = nextOrder[target]!
      nextOrder[target] = tmp
      setMethodParam('swara', 'order', nextOrder)
      if (isCustomS && rankIdx >= 1 && target >= 1) {
        const nextS = [...sVec]
        nextS[0] = 0
        const tmpS = nextS[rankIdx]!
        nextS[rankIdx] = nextS[target]!
        nextS[target] = tmpS
        setMethodParam('swara', 's', nextS)
      }
    }

    const changeS = (rankIdx: number, val: number | null) => {
      if (rankIdx < 1 || val === null || !Number.isFinite(val) || val < 0) return
      const nextS = [...sVec]
      nextS[0] = 0
      nextS[rankIdx] = Math.min(2, Math.max(0, val))
      setMethodParam('swara', 's', nextS)
    }

    const resetSwara = () => {
      setMethodParam('swara', 'order', undefined)
      setMethodParam('swara', 's', undefined)
    }

    return (
      <section className="flex flex-col gap-3" aria-labelledby="wb-ordinal-title">
        <div className="flex flex-wrap items-center justify-between gap-2 max-w-[560px]">
          <SectionTitle>
            <span id="wb-ordinal-title">{tr(t, 'workbench.ordinal.title', { defaultValue: 'Importance order' })}</span>
          </SectionTitle>
          {isCustom && (
            <Button size="sm" variant="ghost" onClick={resetSwara}>
              {tr(t, 'workbench.ordinal.reset', { defaultValue: 'Reset order' })}
            </Button>
          )}
        </div>
        <p className="max-w-[72ch] text-13 text-text-2">
          {tr(t, 'workbench.ordinal.swaraHint', {
            defaultValue: 'Order criteria from most important (rank 1) to least important, and set each step-down ratio s.',
          })}
        </p>
        <div className="min-w-0">
          <Table density="compact" stickyHeader={false} className="w-auto min-w-[min(100%,480px)]" aria-labelledby="wb-ordinal-title">
            <THead>
              <Tr>
                <Th numeric className="w-16">
                  {tr(t, 'workbench.ordinal.rank', { defaultValue: 'Rank' })}
                </Th>
                <Th>{t('workbench.weights.columns.criterion')}</Th>
                <Th className="w-24">{tr(t, 'workbench.ordinal.order', { defaultValue: 'Order' })}</Th>
                <Th numeric className="w-36">
                  {tr(t, 'workbench.ordinal.stepRatio', { defaultValue: 'Comparative ratio s' })}
                </Th>
              </Tr>
            </THead>
            <TBody>
              {order.map((critIdx, rankIdx) => (
                <Tr key={critIdx}>
                  <Td numeric className="font-medium text-text-2">
                    {rankIdx + 1}
                  </Td>
                  <Th scope="row" className="font-medium">
                    {names[critIdx]}
                  </Th>
                  <Td>
                    <div className="inline-flex items-center gap-1">
                      <IconButton
                        size="sm"
                        disabled={rankIdx === 0}
                        aria-label={tr(t, 'workbench.ordinal.moveUp', {
                          criterion: names[critIdx],
                          defaultValue: `Move ${names[critIdx]} up`,
                        })}
                        icon={<ArrowUp />}
                        onClick={() => moveRow(rankIdx, -1)}
                      />
                      <IconButton
                        size="sm"
                        disabled={rankIdx === n - 1}
                        aria-label={tr(t, 'workbench.ordinal.moveDown', {
                          criterion: names[critIdx],
                          defaultValue: `Move ${names[critIdx]} down`,
                        })}
                        icon={<ArrowDown />}
                        onClick={() => moveRow(rankIdx, 1)}
                      />
                    </div>
                  </Td>
                  <Td numeric className="py-1">
                    {rankIdx === 0 ? (
                      <span className="text-text-3">-</span>
                    ) : (
                      <NumberInput
                        id={`wb-swara-s-${rankIdx}`}
                        aria-label={`${tr(t, 'workbench.ordinal.stepRatio', { defaultValue: 'Comparative ratio s' })} ${names[critIdx]}`}
                        value={sVec[rankIdx] ?? defaultRatio}
                        decimals={4}
                        min={0}
                        max={2}
                        step={0.05}
                        controlSize="sm"
                        onValueChange={(v) => changeS(rankIdx, v)}
                        className="w-24"
                      />
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </section>
    )
  }

  // ROC
  const rawRanks = rawParams?.ranks
  const validRanks =
    Array.isArray(rawRanks) &&
    rawRanks.length === n &&
    rawRanks.every((r) => typeof r === 'number' && Number.isFinite(r))
  const ranks: number[] = validRanks ? (rawRanks as number[]) : Array.from({ length: n }, (_, j) => j + 1)
  const isCustom = ranks.some((r, j) => r !== j + 1)
  const ordered = Array.from({ length: n }, (_, j) => j).sort((a, b) => ranks[a]! - ranks[b]! || a - b)

  const moveRoc = (pos: number, delta: -1 | 1) => {
    const target = pos + delta
    if (target < 0 || target >= n) return
    const j = ordered[pos]!
    const b = ordered[target]!
    const nextRanks = ranks.map((rk) => 1 + ranks.filter((other) => other < rk).length)
    const r = nextRanks[j]!
    const rb = nextRanks[b]!
    const tiesAtR = nextRanks.filter((rk) => rk === r)
    if (tiesAtR.length > 1) {
      if (delta === 1) {
        for (let idx = 0; idx < n; idx++) {
          if (nextRanks[idx]! > r) nextRanks[idx] = nextRanks[idx]! + 1
        }
        nextRanks[j] = r + 1
      } else if (rb === r) {
        for (let idx = 0; idx < n; idx++) {
          if (idx !== j && nextRanks[idx]! >= r) nextRanks[idx] = nextRanks[idx]! + 1
        }
      } else {
        for (let idx = 0; idx < n; idx++) {
          if (idx === j) continue
          if (nextRanks[idx]! === rb) nextRanks[idx] = r
          else if (nextRanks[idx]! >= r) nextRanks[idx] = nextRanks[idx]! + 1
        }
        nextRanks[j] = rb
      }
    } else {
      for (let idx = 0; idx < n; idx++) {
        if (nextRanks[idx] === rb) nextRanks[idx] = r
      }
      nextRanks[j] = rb
    }
    const canonical = nextRanks.map((rk) => 1 + nextRanks.filter((other) => other < rk).length)
    setMethodParam('roc', 'ranks', canonical)
  }

  const changeRank = (critIdx: number, val: number | null) => {
    if (val === null || !Number.isFinite(val)) return
    const clamped = Math.min(n, Math.max(1, Math.round(val)))
    const nextRanks = [...ranks]
    nextRanks[critIdx] = clamped
    setMethodParam('roc', 'ranks', nextRanks)
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="wb-ordinal-title">
      <div className="flex flex-wrap items-center justify-between gap-2 max-w-[560px]">
        <SectionTitle>
          <span id="wb-ordinal-title">{tr(t, 'workbench.ordinal.title', { defaultValue: 'Importance order' })}</span>
        </SectionTitle>
        {isCustom && (
          <Button size="sm" variant="ghost" onClick={() => setMethodParam('roc', 'ranks', undefined)}>
            {tr(t, 'workbench.ordinal.reset', { defaultValue: 'Reset order' })}
          </Button>
        )}
      </div>
      <p className="max-w-[72ch] text-13 text-text-2">
        {tr(t, 'workbench.ordinal.rocHint', {
          defaultValue: 'Order criteria by importance or assign integer ranks 1..n (equal ranks share the average weight).',
        })}
      </p>
      <div className="min-w-0">
        <Table density="compact" stickyHeader={false} className="w-auto min-w-[min(100%,480px)]" aria-labelledby="wb-ordinal-title">
          <THead>
            <Tr>
              <Th>{t('workbench.weights.columns.criterion')}</Th>
              <Th className="w-24">{tr(t, 'workbench.ordinal.order', { defaultValue: 'Order' })}</Th>
              <Th numeric className="w-28">
                {tr(t, 'workbench.ordinal.rank', { defaultValue: 'Rank' })}
              </Th>
            </Tr>
          </THead>
          <TBody>
            {ordered.map((critIdx, pos) => (
              <Tr key={critIdx}>
                <Th scope="row" className="font-medium">
                  {names[critIdx]}
                </Th>
                <Td>
                  <div className="inline-flex items-center gap-1">
                    <IconButton
                      size="sm"
                      disabled={pos === 0}
                      aria-label={tr(t, 'workbench.ordinal.moveUp', {
                        criterion: names[critIdx],
                        defaultValue: `Move ${names[critIdx]} up`,
                      })}
                      icon={<ArrowUp />}
                      onClick={() => moveRoc(pos, -1)}
                    />
                    <IconButton
                      size="sm"
                      disabled={pos === n - 1}
                      aria-label={tr(t, 'workbench.ordinal.moveDown', {
                        criterion: names[critIdx],
                        defaultValue: `Move ${names[critIdx]} down`,
                      })}
                      icon={<ArrowDown />}
                      onClick={() => moveRoc(pos, 1)}
                    />
                  </div>
                </Td>
                <Td numeric className="py-1">
                  <NumberInput
                    id={`wb-roc-rank-${critIdx}`}
                    aria-label={`${tr(t, 'workbench.ordinal.rank', { defaultValue: 'Rank' })} ${names[critIdx]}`}
                    value={ranks[critIdx] ?? pos + 1}
                    decimals={0}
                    min={1}
                    max={n}
                    step={1}
                    controlSize="sm"
                    onValueChange={(v) => changeRank(critIdx, v)}
                    className="w-20"
                  />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </section>
  )
}
