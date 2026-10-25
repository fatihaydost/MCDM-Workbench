import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import {
  electreI,
  ELECTRE_I_DEFAULT_C_HAT,
  ELECTRE_I_DEFAULT_D_HAT,
  type ElectreIDiscordanceScale,
} from '../../core/methods/electre-i'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import s from './illustrations.module.css'
import b from './mabac.module.css'

export type ElectreIParts = {
  netConcordance: number[]
  netDiscordance: number[]
  kernel: number[]
  scores: number[]
  order: number[]
}

/** ELECTRE I net indices, kernel membership, and scores for the pictures, or null when the core cannot rank this problem. */
export function electreIParts(
  problem: Problem,
  weights: readonly number[],
  cHat: number = ELECTRE_I_DEFAULT_C_HAT,
  dHat: number = ELECTRE_I_DEFAULT_D_HAT,
  discordanceScale: ElectreIDiscordanceScale = 'global',
): ElectreIParts | null {
  let res
  try {
    res = electreI.compute(problem, [...weights], { cHat, dHat, discordanceScale })
  } catch {
    return null
  }
  const netConcordance = res.steps.find((x) => x.key === 'electre-i.netConcordance')!.vector!
  const netDiscordance = res.steps.find((x) => x.key === 'electre-i.netDiscordance')!.vector!
  const kernel = res.steps.find((x) => x.key === 'electre-i.kernel')!.vector!
  const order = res.scores.map((_, i) => i).sort((x, y) => res.ranking[x]! - res.ranking[y]! || x - y)
  return { netConcordance, netDiscordance, kernel, scores: res.scores, order }
}

const defaultFormat = (v: number, d: number) => v.toFixed(d)
const signed = (format: (v: number, d: number) => string, v: number, d: number) =>
  v > 0 ? `+${format(v, d)}` : format(v, d)
const sign = (v: number) => (v > 0 ? 'up' : v < 0 ? 'down' : undefined)

export type ElectreIIdeaLabels = {
  title: string
  caption?: string | undefined
  showTable: string
  alternative: string
  netConcordance: string
  netDiscordance: string
  kernel: string
  score: string
  inKernel: string
  outKernel: string
  row: (alternative: string, netC: string, netD: string, kernel: string, score: string) => string
}

export const ELECTRE_I_IDEA_LABELS_EN: ElectreIIdeaLabels = {
  title: 'Net concordance, net discordance, kernel membership, and net outranking score',
  showTable: 'Show as table',
  alternative: 'Alternative',
  netConcordance: 'Cₐ',
  netDiscordance: 'Dₐ',
  kernel: 'K',
  score: 'Φ',
  inKernel: '1',
  outKernel: '0',
  row: (a, netC, netD, k, sc) => `${a}: Cₐ = ${netC}, Dₐ = ${netD}, K = ${k}, Φ = ${sc}`,
}

export type ElectreIIdeaProps = {
  problem: Problem
  weights: readonly number[]
  cHat?: number | undefined
  dHat?: number | undefined
  discordanceScale?: ElectreIDiscordanceScale | undefined
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<ElectreIIdeaLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. ELECTRE_I_IDEA_STEPS - 1 draws that
   * step, the last one being the full picture.
   */
  step?: number | null | undefined
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The 3 steps of the ELECTRE I idea:
 * 0: Net concordance C_a and net discordance D_a across rival alternatives.
 * 1: Kernel K membership after condensing mutual outranking cycles at thresholds (ĉ, d̂).
 * 2: Normalized net outranking score Φ(a) = (C_a - D_a) / (2(m - 1)) around zero.
 */
export const ELECTRE_I_IDEA_STEPS = 3

const FONT = 13
const HEAD = 22
const ROW = 38
const NAME_LINE = 20
const STACK_BELOW = 380
const GAP = 8

export function ElectreIIdea({
  problem,
  weights,
  cHat = ELECTRE_I_DEFAULT_C_HAT,
  dHat = ELECTRE_I_DEFAULT_D_HAT,
  discordanceScale = 'global',
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: ElectreIIdeaProps) {
  const l = { ...ELECTRE_I_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const parts = useMemo(
    () => electreIParts(problem, weights, cHat, dHat, discordanceScale),
    [problem, weights, cHat, dHat, discordanceScale],
  )
  const [activeRow, setActive] = useState<number | null>(null)
  const [focusRow, setFocusRow] = useState(0)
  if (!parts) return null

  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), ELECTRE_I_IDEA_STEPS - 1) : ELECTRE_I_IDEA_STEPS - 1
  const active = stepping ? null : activeRow
  const scoreOff = stage >= 2 ? undefined : ''

  const { netConcordance, netDiscordance, kernel, scores, order } = parts
  const names = problem.alternatives
  const m = names.length
  const W = Math.max(width, 240)
  const stacked = W < STACK_BELOW

  const cTexts = netConcordance.map((v) => signed(format, v, 3))
  const dTexts = netDiscordance.map((v) => signed(format, v, 2))
  const kTexts = kernel.map((v) => (v > 0 ? l.inKernel : l.outKernel))
  const sTexts = scores.map((v) => signed(format, v, 4))
  const rowText = (i: number) => l.row(names[i]!, cTexts[i]!, dTexts[i]!, kTexts[i]!, sTexts[i]!)

  const valueWidth = Math.ceil(Math.max(...sTexts.map((t) => estimateTextWidth(t, FONT)))) + GAP
  const scoreWidth = Math.round(Math.min(150, Math.max(64, W * 0.24)))
  const maxName = Math.max(...names.map((x) => estimateTextWidth(`${x} [${l.kernel}]`, FONT)))
  const labelWidth = stacked ? 0 : Math.ceil(Math.min(maxName + GAP * 2, Math.max(W * 0.24, 56)))

  const flowLeft = labelWidth
  const flowRight = Math.max(flowLeft + 40, W - valueWidth - scoreWidth - GAP * 3)
  const flowMid = (flowLeft + flowRight) / 2
  const maxIndexAbs = Math.max(
    1e-12,
    ...netConcordance.map((v) => Math.abs(v)),
    ...netDiscordance.map((v) => Math.abs(v)),
  )
  const unitIndex = (flowRight - flowLeft) / (2 * maxIndexAbs)

  const sLeft = flowRight + GAP * 3
  const neg = Math.max(-Math.min(...scores), 0)
  const pos = Math.max(Math.max(...scores), 0)
  const unitS = scoreWidth / Math.max(neg + pos, 1e-12)
  const zero = sLeft + (neg + pos > 0 ? neg * unitS : scoreWidth / 2)

  const rowStep = stacked ? NAME_LINE + ROW : ROW
  const mid = (stacked ? NAME_LINE : 0) + ROW / 2
  const height = HEAD + m * rowStep
  const focus = Math.min(focusRow, m - 1)

  const table: ChartTable = {
    corner: l.alternative,
    columns: [l.kernel, l.netConcordance, l.netDiscordance, l.score],
    rows: order.map((i) => ({ label: names[i]!, cells: [kTexts[i]!, cTexts[i]!, dTexts[i]!, sTexts[i]!] })),
  }

  const move = (e: KeyboardEvent<SVGGElement>) => {
    let next = focus
    if (e.key === 'ArrowDown') next = Math.min(m - 1, focus + 1)
    else if (e.key === 'ArrowUp') next = Math.max(0, focus - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = m - 1
    else if (e.key === 'Escape') {
      setActive(null)
      return
    } else return
    e.preventDefault()
    setFocusRow(next)
    setActive(next)
    e.currentTarget.querySelector<SVGElement>(`[data-row="${next}"]`)?.focus()
  }

  const shown = active === null ? null : order[active]!

  return (
    <ChartFigure
      titleId={`${uid}-title`}
      tableId={`${uid}-table`}
      title={l.title}
      showTable={l.showTable}
      table={table}
      plotRef={plotRef}
      className={className}
    >
      <svg
        className={[s.svg, animate && `${s.animate} ${b.animate}`, explain && `${s.explain} ${b.explain}`]
          .filter(Boolean)
          .join(' ')}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="group"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-testid="electre-i-idea"
      >
        <g aria-hidden>
          <text className={b.head} x={flowMid} y={HEAD / 2} textAnchor="middle" dominantBaseline="central">
            {`${l.netConcordance} / ${l.netDiscordance}`}
          </text>
          <line className={b.zero} x1={flowMid} x2={flowMid} y1={HEAD} y2={height} />
          <text
            className={`${b.head} ${s.stageItem}`}
            data-off={scoreOff}
            x={zero}
            y={HEAD / 2}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {l.score}
          </text>
          <line className={`${b.zero} ${s.stageItem}`} data-off={scoreOff} x1={zero} x2={zero} y1={HEAD} y2={height} />
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)}>
          {order.map((i, row) => {
            const inK = kernel[i]! > 0
            const rawLabel = stage >= 1 && inK ? `${names[i]!} [${l.kernel}]` : names[i]!
            const short = truncate(rawLabel, stacked ? W : labelWidth - GAP, FONT)
            const cVal = netConcordance[i]!
            const dVal = netDiscordance[i]!
            const cLen = Math.max(Math.abs(cVal) * unitIndex, 0.001)
            const dLen = Math.max(Math.abs(dVal) * unitIndex, 0.001)
            const end = scores[i]! * unitS
            return (
              <g
                key={i}
                className={s.sawRow}
                style={{ transform: `translate(0px, ${HEAD + row * rowStep}px)` }}
                data-highlight={(stage >= 1 ? inK : row === 0) || undefined}
                data-off={stage === 1 && !inK ? '' : undefined}
                data-testid="electre-i-row"
              >
                <text className={s.sawName} x={0} y={stacked ? NAME_LINE / 2 : mid} dominantBaseline="central">
                  {short !== rawLabel ? <title>{rawLabel}</title> : null}
                  {short}
                </text>
                {/* Net concordance bar C_a (top bar from flowMid) */}
                <rect
                  className={b.score}
                  data-sign={sign(cVal)}
                  x={cVal >= 0 ? flowMid : flowMid - cLen}
                  y={mid - 8}
                  width={cLen}
                  height={6}
                  aria-hidden
                />
                {/* Net discordance bar -D_a (bottom bar from flowMid: lower D_a extends right, higher D_a extends left) */}
                <rect
                  className={b.stick}
                  data-sign={sign(-dVal)}
                  x={-dVal >= 0 ? flowMid : flowMid - dLen}
                  y={mid + 2}
                  width={dLen}
                  height={5}
                  opacity={0.65}
                  aria-hidden
                />
                {/* Net outranking score bar Φ from zero */}
                <rect
                  className={b.score}
                  data-sign={sign(scores[i]!)}
                  data-off={scoreOff}
                  x={0}
                  y={mid - 7}
                  width={1}
                  height={14}
                  style={{ transform: `translate(${zero}px, 0px) scale(${(stage >= 2 && end) || 0.001}, 1)` }}
                  aria-hidden
                />
                <text
                  className={`${s.sawValue} ${s.stageItem}`}
                  data-off={scoreOff}
                  x={W}
                  y={mid}
                  textAnchor="end"
                  dominantBaseline="central"
                  data-testid="electre-i-phi"
                >
                  {sTexts[i]}
                </text>
                <rect
                  className={b.hit}
                  data-on={active === row || undefined}
                  data-row={row}
                  x={0}
                  y={stacked ? 0 : 1}
                  width={W}
                  height={rowStep - 2}
                  rx={2}
                  tabIndex={stepping ? undefined : row === focus ? 0 : -1}
                  role={stepping ? undefined : 'img'}
                  aria-label={stepping ? undefined : rowText(i)}
                  onMouseEnter={stepping ? undefined : () => setActive(row)}
                  onFocus={
                    stepping
                      ? undefined
                      : () => {
                          setFocusRow(row)
                          setActive(row)
                        }
                  }
                  onBlur={stepping ? undefined : () => setActive(null)}
                />
              </g>
            )
          })}
        </g>
      </svg>
      {(shown !== null || l.caption) && (
        <p className={s.caption} aria-live="polite">
          {shown !== null ? rowText(shown) : l.caption}
        </p>
      )}
    </ChartFigure>
  )
}
