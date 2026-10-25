import { Check, X } from '@phosphor-icons/react'
import { useId, useMemo } from 'react'
import { maxOf } from '../../core/math'
import { vikorFlat, type VikorParams } from '../../core/methods/vikor'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { isoQRegion, isoQSegment, placeLabels, vikorParts, type Point } from './geometry'
import s from './illustrations.module.css'

export type VikorIdeaLabels = {
  title: string
  /** Optional line under the verdict. */
  caption?: string | undefined
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Axis names of the plane: "S, group utility" and "R, largest regret" (0 is best on both). */
  axisS: string
  axisR: string
  /** Corner where both terms are 0: "Ideal". */
  ideal: string
  /** Title of the Q bars: "Compromise index Q". */
  barsTitle: string
  /** Label of the threshold line / band: "Q(a') + DQ". */
  threshold: string
  /** Table headers. */
  s: string
  r: string
  q: string
  inSet: string
  yes: string
  no: string
  /** C1 sentence: met or not, the leader, the runner-up, the gap and DQ (formatted). */
  c1: (ok: boolean, first: string, second: string, gap: string, dq: string) => string
  /** C2 sentence: met or not, the leader, and whether it is also first by S and by R. */
  c2: (ok: boolean, first: string, byS: boolean, byR: boolean) => string
  /** The compromise: one alternative, or the set (names joined). */
  result: (names: string[]) => string
}

/** Development defaults only: the pages pass translated labels. */
export const VIKOR_IDEA_LABELS_EN: VikorIdeaLabels = {
  title: 'Group utility against individual regret',
  showTable: 'Show as table',
  alternative: 'Alternative',
  axisS: 'S, group utility',
  axisR: 'R, individual regret',
  ideal: 'Ideal',
  barsTitle: 'Compromise index Q',
  threshold: "Q(a') + DQ",
  s: 'S',
  r: 'R',
  q: 'Q',
  inSet: 'Compromise',
  yes: 'yes',
  no: 'no',
  c1: (ok, a, b, gap, dq) => (ok ? `Acceptable advantage: ${a} leads ${b} by ${gap}, at least DQ = ${dq}.` : `No acceptable advantage: ${a} leads ${b} by only ${gap}, less than DQ = ${dq}.`),
  c2: (ok, a, byS, byR) => (ok ? `Acceptable stability: ${a} is also first by ${byS && byR ? 'S and R' : byS ? 'S' : 'R'}.` : `No acceptable stability: ${a} is first by neither S nor R.`),
  result: (names) => (names.length === 1 ? `Compromise solution: ${names[0]}` : `Compromise set: ${names.join(', ')}`),
}

export type VikorIdeaProps = {
  problem: Problem
  weights: readonly number[]
  /** The VIKOR options (v); default v = 0.5. */
  params?: VikorParams | undefined
  /** Number format for S, R, Q, the gap and DQ (active locale, 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<VikorIdeaLabels>
  /** Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. VIKOR_IDEA_STEPS - 1 that step, the last being the full picture. */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/** The steps of the VIKOR idea: 0 the (S, R) plane and the ideal corner, 1 the iso-Q threshold line and compromise region, 2 the ranked Q bars and C1/C2 verdict. */
export const VIKOR_IDEA_STEPS = 3

const FONT = 12
const NAME_FONT = 13
/** Side by side from this width; below it the plane sits above the bars. */
const SIDE_BY_SIDE = 600
const GAP = 32
const PLANE_MAX = 300
const ROW = 26
const BAR = 14
const VALUE_GAP = 6
/** A bar of Q = 0 (the leader, very often) keeps this width, so it is still a mark. */
const MIN_BAR = 2
/** Above this many alternatives only the compromise set is named in the plane. */
const NAME_ALL_UP_TO = 12
const defaultFormat = (v: number) => v.toFixed(4)

/**
 * VIKOR as a picture, two panels on the core's numbers.
 * Left, the plane of the two terms of Q: x = (S - S*) / (S- - S*) (group utility), y = (R - R*) / (R- - R*) (largest
 * regret), 0 best on both, so the ideal is the bottom left corner. Q = v x + (1 - v) y is constant along straight
 * lines; the dashed line is Q = Q(a') + DQ, and the tinted part below it holds the alternatives "in closeness" with
 * the leader. Moving v turns the line: v = 1 counts only S (vertical), v = 0 only R (horizontal).
 * Right, Q itself in rank order with the same band from Q(a') to Q(a') + DQ. The compromise set is in the accent.
 * Under both, C1 (acceptable advantage) and C2 (acceptable stability) in words, then the compromise.
 * Static at first paint; a new v or new data turns the line and moves the bars (MOTION.md, --dur-data).
 */
export function VikorIdea({
  problem,
  weights,
  params,
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: VikorIdeaProps) {
  const l = { ...VIKOR_IDEA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const v = params?.v
  const parts = useMemo(() => vikorParts(problem, weights, v === undefined ? {} : { v }), [problem, weights, v])
  if (!parts) return null

  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), VIKOR_IDEA_STEPS - 1) : VIKOR_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')

  const { S, R, Q, sTerm, rTerm, compromise, order } = parts
  const names = problem.alternatives
  const m = names.length
  const inSet = new Set(compromise.set)
  const W = Math.max(width, 240)
  const wide = W >= SIDE_BY_SIDE
  const thr = Q[compromise.first]! + compromise.dq

  // ---- Plane ----
  const plane = Math.min(PLANE_MAX, wide ? Math.floor((W - GAP) * 0.45) : W - 24)
  const padL = 40
  const padT = 22
  const padB = 38
  const side = Math.max(120, plane - padL - 8)
  const planeH = padT + side + padB
  const px = (x: number) => padL + x * side
  const py = (y: number) => padT + (1 - y) * side
  const screen: Point[] = names.map((_, i) => ({ x: px(sTerm[i]!), y: py(rTerm[i]!) }))
  const named = names.map((_, i) => m <= NAME_ALL_UP_TO || inSet.has(i))
  const labelText = names.map((n, i) => (named[i] ? truncate(n, 120, FONT) : ''))
  // The axis titles and the ideal's name are text too: point labels keep off them.
  const textBox = (x: number, y: number, text: string, anchor: 'start' | 'end') => {
    const w = estimateTextWidth(text, FONT)
    const left = anchor === 'start' ? x : x - w
    return { left, right: left + w, top: y - FONT * 0.8, bottom: y + FONT * 0.25 }
  }
  const obstacles = [
    textBox(px(0), padT - 10, l.axisR, 'start'),
    textBox(px(1), py(0) + 32, l.axisS, 'end'),
    textBox(px(0) - 8, py(0) + 18, l.ideal, 'end'),
    textBox(px(0) - 6, py(1) + 4, `${l.r}−`, 'end'),
    textBox(px(1) - 8, py(0) + 18, `${l.s}−`, 'start'),
  ]
  const placements = placeLabels(
    screen,
    labelText.map((t) => (t ? estimateTextWidth(t, FONT) : 0)),
    { width: padL + side + 8, height: planeH },
    order,
    { fontSize: FONT, dotRadius: 5, obstacles },
  )
  const sFlat = vikorFlat(S)
  const rFlat = vikorFlat(R)
  const noSpread = (sFlat && rFlat) || (sFlat && parts.v === 1) || (rFlat && parts.v === 0)
  const effV = sFlat && !rFlat ? 0 : rFlat && !sFlat ? 1 : parts.v
  const seg = noSpread ? null : isoQSegment(effV, Math.min(thr, 1))
  const region = noSpread ? [] : thr >= 1 ? isoQRegion(effV, 1.0000001) : isoQRegion(effV, thr)
  const regionPath = region.length > 2 ? `M${region.map((p) => `${px(p.x)} ${py(p.y)}`).join('L')}Z` : ''
  const linePathD = seg && thr <= 1 ? `M${px(seg[0].x)} ${py(seg[0].y)}L${px(seg[1].x)} ${py(seg[1].y)}` : ''

  // ---- Bars ----
  const barsLeft = wide ? plane + GAP : 0
  const barsTop = wide ? 0 : planeH + 16
  const barsW = wide ? W - barsLeft : W
  const qTexts = Q.map((q) => format(q))
  const valueWidth = Math.ceil(maxOf(qTexts.map((t) => estimateTextWidth(t, FONT)))) + VALUE_GAP + 2
  const maxName = maxOf(names.map((a) => estimateTextWidth(a, NAME_FONT)))
  const nameW = Math.ceil(Math.min(maxName + 12, Math.max(barsW * 0.3, 56)))
  const plotL = barsLeft + nameW
  const plotR = Math.max(plotL + 40, barsLeft + barsW - valueWidth)
  const domain = Math.max(1, thr)
  const bx = (q: number) => plotL + (q / domain) * (plotR - plotL)
  const head = 22
  const barsH = head + m * ROW + 22
  const height = Math.max(wide ? planeH : 0, barsTop + barsH)
  const bandX0 = bx(Q[compromise.first]!)
  const bandX1 = bx(Math.min(thr, domain))

  const table: ChartTable = {
    corner: l.alternative,
    columns: [l.s, l.r, l.q, l.inSet],
    rows: order.map((i) => ({ label: names[i]!, cells: [format(S[i]!), format(R[i]!), qTexts[i]!, inSet.has(i) ? l.yes : l.no] })),
  }

  const first = names[compromise.first]!
  const second = names[compromise.second]!
  const verdict = [
    { ok: compromise.c1, text: l.c1(compromise.c1, first, second, format(compromise.advantage), format(compromise.dq)), id: 'c1' },
    { ok: compromise.c2, text: l.c2(compromise.c2, first, compromise.bestByS, compromise.bestByR), id: 'c2' },
  ]

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
        className={[s.svg, animate && s.animate, explain && s.explain].filter(Boolean).join(' ')}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-testid="vikor-idea"
        data-v={parts.v}
      >
        {/* Plane of the two terms of Q. */}
        <g data-testid="vikor-plane">
          {regionPath && (
            <path
              className={`${s.vikorBand} ${s.stageItem}`}
              data-off={off(1)}
              d={regionPath}
              style={{ d: `path('${regionPath}')` }}
            />
          )}
          <path className={s.axis} d={`M${px(0)} ${py(1)}V${py(0)}H${px(1)}`} />
          <path className={s.vikorFrame} d={`M${px(0)} ${py(1)}H${px(1)}V${py(0)}`} />
          {linePathD && (
            <path
              className={`${s.vikorLine} ${s.stageItem}`}
              data-off={off(1)}
              d={linePathD}
              style={{ d: `path('${linePathD}')` }}
              data-testid="vikor-threshold-line"
            />
          )}
          {/* The plane is the rescaled terms: the far ends are the worst S and R (S-, R-), the corner the ideal. */}
          <text className={s.isoLabel} x={px(0) - 6} y={py(1)} textAnchor="end" dominantBaseline="central">
            {l.r}−
          </text>
          <text className={s.isoLabel} x={px(1)} y={py(0) + 14} textAnchor="middle" dominantBaseline="central">
            {l.s}−
          </text>
          <text className={s.axisName} x={px(0)} y={padT - 10}>
            {l.axisR}
          </text>
          <text className={s.axisName} x={px(1)} y={py(0) + 32} textAnchor="end">
            {l.axisS}
          </text>
          {/* The ideal corner, named outside the square so no point label can sit on it. */}
          <circle className={s.refMark} cx={px(0)} cy={py(0)} r={3} />
          <text className={s.refLabel} x={px(0) - 8} y={py(0) + 14} textAnchor="end" dominantBaseline="central">
            {l.ideal}
          </text>
          {names.map((_, i) => (
            <g key={i} data-testid="vikor-point" data-in-set={inSet.has(i) || undefined}>
              <circle className={s.vikorDot} data-on={inSet.has(i) || undefined} cx={screen[i]!.x} cy={screen[i]!.y} r={inSet.has(i) ? 5 : 4} />
              {labelText[i] && placements[i] && (
                <text className={s.pointLabel} data-on={inSet.has(i) || undefined} x={placements[i]!.x} y={placements[i]!.y} textAnchor={placements[i]!.anchor}>
                  {labelText[i]}
                </text>
              )}
            </g>
          ))}
        </g>

        {/* Q in rank order, with the same band. */}
        <g className={s.stageItem} data-off={off(2)} data-testid="vikor-bars">
          <text className={s.axisName} x={barsLeft} y={barsTop + 12}>
            {l.barsTitle}
          </text>
          <rect
            className={s.vikorBand}
            x={0}
            y={barsTop + head - 2}
            width={1}
            height={m * ROW}
            style={{ transform: `translate(${bandX0}px, 0px) scale(${Math.max(bandX1 - bandX0, 0.01)}, 1)` }}
          />
          <line className={s.axis} x1={plotL} x2={plotL} y1={barsTop + head - 2} y2={barsTop + head + m * ROW} />
          {thr <= domain && (
            <g className={s.vikorMove} style={{ transform: `translate(${bandX1}px, 0px)` }}>
              <line className={s.vikorLine} x1={0} x2={0} y1={barsTop + head - 2} y2={barsTop + head + m * ROW + 4} />
              <text className={s.vikorThrLabel} x={0} y={barsTop + head + m * ROW + 16} textAnchor={bandX1 > plotR - 40 ? 'end' : 'start'}>
                {l.threshold}
              </text>
            </g>
          )}
          {order.map((i, row) => {
            const on = inSet.has(i)
            const w = Math.max(bx(Q[i]!) - plotL, MIN_BAR)
            const name = names[i]!
            const short = truncate(name, nameW - 10, NAME_FONT)
            return (
              <g
                key={i}
                className={s.vikorMove}
                style={{ transform: `translate(0px, ${barsTop + head + row * ROW}px)` }}
                data-testid="vikor-bar"
                data-q={Q[i]}
                data-in-set={on || undefined}
              >
                <text className={s.sawName} x={barsLeft} y={ROW / 2} dominantBaseline="central" data-on={on || undefined}>
                  {short !== name ? <title>{name}</title> : null}
                  {short}
                </text>
                <rect
                  className={s.vikorBar}
                  data-on={on || undefined}
                  x={0}
                  y={(ROW - BAR) / 2}
                  width={1}
                  height={BAR}
                  style={{ transform: `translate(${plotL}px, 0px) scale(${w}, 1)` }}
                />
                <text className={`${s.barValue} ${s.halo}`} data-highlight={on || undefined} x={0} y={ROW / 2} dominantBaseline="central" style={{ transform: `translate(${plotL + w + VALUE_GAP}px, 0px)` }}>
                  {qTexts[i]}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      <ul className={`${s.vikorVerdict} ${s.stageItem}`} data-off={off(2)} data-testid="vikor-verdict">
        {verdict.map((x) => (
          <li key={x.id} data-ok={x.ok || undefined} data-testid={`vikor-${x.id}`}>
            {x.ok ? <Check aria-hidden className={s.vikorIcon} weight="bold" /> : <X aria-hidden className={s.vikorIcon} weight="bold" />}
            <span>{x.text}</span>
          </li>
        ))}
      </ul>
      <p className={`${s.vikorResult} ${s.stageItem}`} data-off={off(2)} data-testid="vikor-result">
        {l.result(compromise.set.map((i) => names[i]!))}
      </p>
      {l.caption && <p className={s.caption}>{l.caption}</p>}
    </ChartFigure>
  )
}
