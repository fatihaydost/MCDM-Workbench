import { useId, useState, type KeyboardEvent } from 'react'
import { maxOf } from '../../core/math'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useElementWidth } from '../charts/useElementWidth'
import s from './illustrations.module.css'
import { SAW_CATEGORY_COLOURS } from './SawContributions'

export type RankLinesLabels = {
  title: string
  /** One sentence under the title. */
  description?: string | undefined
  showTable: string
  /** Header of the table's first column. */
  alternative: string
  /** Header of the last column: "Borda". */
  borda: string
  /** Table cell of a method that could not rank. */
  notRanked: string
  /** Accessible name of a crossing: two alternatives swap order between two methods. */
  crossing: (a: string, b: string, from: string, to: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const RANK_LINES_LABELS_EN: RankLinesLabels = {
  title: 'Rank under each method',
  showTable: 'Show as table',
  alternative: 'Alternative',
  borda: 'Borda',
  notRanked: 'Not ranked',
  crossing: (a, b, from, to) => `${a} and ${b} swap places between ${from} and ${to}`,
}

export type RankLinesColumn = {
  methodId: string
  label: string
  /** Competition ranks per alternative (1 = best, ties shared); null when the method could not rank. */
  ranking: number[] | null
  /** One line under the chart about this method (VIKOR's own rule). */
  note?: string | undefined
  /** Why the method could not rank, shown in its column. */
  reason?: string | undefined
}

export type RankLinesProps = {
  columns: RankLinesColumn[]
  borda: number[] | null
  names: string[]
  selected: [number, number] | null
  onSelectPair: (pair: [number, number]) => void
  labels?: Partial<RankLinesLabels>
  className?: string | undefined
}

const FONT = 13
const HEAD_FONT = 12
const HEAD = 30
const ROW = 28
const GAP = 8
const PAD = 12
const HIT = 7

type Crossing = { i: number; k: number; from: number; to: number; x: number; y: number }

/**
 * Rank lines: one column per method, one line per alternative across them, y = its rank in that method (ties share a
 * y). Where two lines cross, two methods order that pair differently; each crossing is a button that selects the pair
 * (click, Enter or Space; arrow keys move between crossings). The Borda rank closes each line on the right, next to the
 * individual rankings, never instead of them. The selected pair takes two fixed contrasting colours (a blue, b ochre), the other lines step back.
 */
export function RankLines({ columns: rawColumns, borda, names, selected, onSelectPair, labels, className }: RankLinesProps) {
  const l = { ...RANK_LINES_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const [focusKey, setFocusKey] = useState(0)
  const [hoverAlt, setHoverAlt] = useState<number | null>(null)

  const columns = [
    ...rawColumns.filter((c) => c.ranking !== null),
    ...rawColumns.filter((c) => c.ranking === null),
  ]
  const n = names.length
  const W = Math.max(width, 280)
  const ranked = columns.map((c, j) => (c.ranking ? j : -1)).filter((j) => j >= 0)
  const colour = (i: number) => (i < SAW_CATEGORY_COLOURS ? String(i + 1) : 'other')
  const inPair = (i: number) => selected !== null && (selected[0] === i || selected[1] === i)
  const on = (i: number) => (hoverAlt !== null ? hoverAlt === i || inPair(i) : inPair(i))
  // The selected pair is coloured by slot, not by alternative (two category colours can be near twins): a and b.
  const pair = (i: number) => (selected === null ? undefined : selected[0] === i ? 'a' : selected[1] === i ? 'b' : undefined)

  // Names that share a rank share one label, so tied alternatives never print over each other.
  const groups = (ranking: number[]) => {
    const by = new Map<number, number[]>()
    ranking.forEach((r, i) => by.set(r, [...(by.get(r) ?? []), i]))
    return [...by.entries()].map(([rank, alts]) => ({ rank, alts, text: alts.map((i) => names[i]!).join(', ') }))
  }
  const first = ranked.length > 0 ? columns[ranked[0]!]!.ranking! : null
  const leftGroups = first ? groups(first) : []
  const rightGroups = borda ? groups(borda) : []
  const rankWidth = estimateTextWidth(String(n), FONT)
  const leftW = Math.ceil(Math.min(maxOf(leftGroups.map((g) => estimateTextWidth(g.text, FONT))) + GAP, W * 0.2))
  const rightW = borda
    ? Math.ceil(Math.min(rankWidth + 6 + maxOf(rightGroups.map((g) => estimateTextWidth(g.text, FONT))) + GAP, W * 0.24))
    : 0
  const slots = columns.length + (borda ? 1 : 0)
  const x0 = leftW + PAD
  const x1 = W - rightW - PAD
  const step = slots > 1 ? (x1 - x0) / (slots - 1) : 0
  const xOf = (slot: number) => x0 + slot * step
  const bordaX = xOf(columns.length)
  // Heads wider than a column step stagger across two or three lines so neighbours never touch.
  const heads = [...columns.map((c) => c.label), ...(borda ? [l.borda] : [])]
  const maxHeadW = maxOf(heads.map((h) => estimateTextWidth(h, HEAD_FONT)))
  const headRows = maxHeadW <= step - 4 ? 1 : maxHeadW <= 2 * step - 6 ? 2 : 3
  const headH = headRows === 1 ? HEAD : headRows === 2 ? 42 : 56
  const height = headH + n * ROW + 6
  const yOf = (rank: number) => headH + (rank - 1) * ROW + ROW / 2
  const headY = (slot: number) => (headRows === 1 ? headH / 2 - 2 : headRows === 2 ? (slot % 2 === 0 ? 9 : 25) : 9 + (slot % 3) * 15)
  const showPointRanks = step >= 30
  const compactReason = step < 44
  const reasonW = compactReason ? Math.max(step - 2, 18) : Math.max(step - 4, 40)

  const crossings: Crossing[] = []
  for (let c = 0; c + 1 < ranked.length; c++) {
    const a = columns[ranked[c]!]!.ranking!
    const b = columns[ranked[c + 1]!]!.ranking!
    for (let i = 0; i < n; i++) {
      for (let k = i + 1; k < n; k++) {
        const da = a[i]! - a[k]!
        const db = b[i]! - b[k]!
        if (da * db >= 0) continue
        const t = da / (da - db)
        const xa = xOf(ranked[c]!)
        const xb = xOf(ranked[c + 1]!)
        crossings.push({ i, k, from: ranked[c]!, to: ranked[c + 1]!, x: xa + t * (xb - xa), y: yOf(a[i]! + t * (b[i]! - a[i]!)) })
      }
    }
  }
  crossings.sort((p, q) => p.x - q.x || p.y - q.y)
  for (let a = 0; a < crossings.length; ) {
    let b = a + 1
    while (
      b < crossings.length &&
      Math.abs(crossings[b]!.x - crossings[a]!.x) < 2 &&
      Math.abs(crossings[b]!.y - crossings[a]!.y) < 2
    ) {
      b++
    }
    const count = b - a
    if (count > 1) {
      const baseX = crossings[a]!.x
      for (let m = 0; m < count; m++) {
        crossings[a + m]!.x = baseX + (m - (count - 1) / 2) * 10
      }
    }
    a = b
  }
  const focus = Math.min(focusKey, Math.max(0, crossings.length - 1))

  const move = (e: KeyboardEvent<SVGGElement>) => {
    let next = focus
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(crossings.length - 1, focus + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, focus - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = crossings.length - 1
    else return
    e.preventDefault()
    setFocusKey(next)
    e.currentTarget.querySelector<SVGElement>(`[data-index="${next}"]`)?.focus()
  }
  const select = (x: Crossing) => onSelectPair([x.i, x.k])

  const rankText = (r: number | undefined) => (r === undefined ? l.notRanked : String(r))
  const order = borda ? names.map((_, i) => i).sort((p, q) => borda[p]! - borda[q]! || p - q) : names.map((_, i) => i)
  const table: ChartTable = {
    corner: l.alternative,
    columns: [...columns.map((c) => c.label), ...(borda ? [l.borda] : [])],
    rows: order.map((i) => ({
      label: names[i]!,
      cells: [...columns.map((c) => rankText(c.ranking?.[i])), ...(borda ? [String(borda[i])] : [])],
    })),
  }

  // The selected pair is drawn last, so its lines stay on top of the others.
  const lineOrder = names.map((_, i) => i).sort((p, q) => Number(on(p)) - Number(on(q)))
  const notes = columns.filter((c) => c.note)

  return (
    <ChartFigure
      titleId={`${uid}-title`}
      tableId={`${uid}-table`}
      title={l.title}
      description={l.description}
      showTable={l.showTable}
      table={table}
      plotRef={plotRef}
      className={className}
    >
      <svg
        className={s.svg}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="group"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-testid="rank-lines"
      >
        <g className={s.rankPlot} data-dimmed={selected || hoverAlt !== null ? '' : undefined} onMouseLeave={() => setHoverAlt(null)}>
          {Array.from({ length: n }, (_, idx) => (
            <line
              key={`row-${idx}`}
              className={s.rankRowGuide}
              x1={x0}
              x2={borda ? bordaX : x1}
              y1={yOf(idx + 1)}
              y2={yOf(idx + 1)}
              aria-hidden
            />
          ))}
          {columns.map((_, j) => (
            <line key={j} className={s.rankAxis} x1={xOf(j)} x2={xOf(j)} y1={headY(j) + 8} y2={height - 4} aria-hidden />
          ))}
          {borda && <line className={s.rankAxis} x1={bordaX} x2={bordaX} y1={headY(columns.length) + 8} y2={height - 4} aria-hidden />}
          <g aria-hidden>
            {lineOrder.map((i) => {
              const pts = ranked.map((j) => `${xOf(j)},${yOf(columns[j]!.ranking![i]!)}`).join(' ')
              const last = ranked.at(-1)
              return (
                <g
                  key={i}
                  className={s.rankLine}
                  data-cat={colour(i)}
                  data-on={on(i) || undefined}
                  data-pair={pair(i)}
                  data-testid="rank-line"
                  onMouseEnter={() => setHoverAlt(i)}
                >
                  <polyline points={pts} />
                  {borda && last !== undefined && (
                    <line
                      className={s.rankToBorda}
                      x1={xOf(last)}
                      y1={yOf(columns[last]!.ranking![i]!)}
                      x2={bordaX}
                      y2={yOf(borda[i]!)}
                    />
                  )}
                </g>
              )
            })}
          </g>
          {columns.map((c, j) => (
            <g key={c.methodId} data-testid="rank-column" data-method={c.methodId} data-label={c.label}>
              <text className={s.rankHead} x={xOf(j)} y={headY(j)} textAnchor="middle" dominantBaseline="central">
                {c.label}
              </text>
              {c.ranking
                ? c.ranking.map((r, i) => {
                    const active = on(i)
                    return (
                      <g key={i} onMouseEnter={() => setHoverAlt(i)}>
                        <circle
                          className={s.rankPoint}
                          data-cat={colour(i)}
                          data-on={active || undefined}
                          data-pair={pair(i)}
                          data-rank={r}
                          data-name={names[i]}
                          cx={xOf(j)}
                          cy={yOf(r)}
                          r={active && showPointRanks ? 7.5 : 3.25}
                          aria-hidden
                        />
                        {active && showPointRanks && (
                          <text
                            className={s.rankPointNum}
                            x={xOf(j)}
                            y={yOf(r)}
                            textAnchor="middle"
                            dominantBaseline="central"
                            aria-hidden
                          >
                            {r}
                          </text>
                        )}
                      </g>
                    )
                  })
                : c.reason && (
                    <foreignObject x={xOf(j) - reasonW / 2} y={headH} width={reasonW} height={height - headH}>
                      <p className={s.rankReason} data-compact={compactReason || undefined}>
                        {c.reason}
                      </p>
                    </foreignObject>
                  )}
            </g>
          ))}
          {borda && (
            <text className={s.rankHead} x={bordaX} y={headY(columns.length)} textAnchor="middle" dominantBaseline="central">
              {l.borda}
            </text>
          )}
          {first &&
            leftGroups.map((g) => {
              const short = truncate(g.text, leftW - GAP, FONT)
              return (
                <text
                  key={g.rank}
                  className={s.rankName}
                  data-on={g.alts.some(on) || undefined}
                  x={x0 - GAP}
                  y={yOf(g.rank)}
                  textAnchor="end"
                  dominantBaseline="central"
                  onMouseEnter={() => setHoverAlt(g.alts[0] ?? null)}
                >
                  {short !== g.text ? <title>{g.text}</title> : null}
                  {short}
                </text>
              )
            })}
          {borda &&
            rightGroups.map((g) => {
              const short = truncate(g.text, rightW - rankWidth - 6 - GAP, FONT)
              return (
                <g key={g.rank} className={s.rankName} data-on={g.alts.some(on) || undefined} onMouseEnter={() => setHoverAlt(g.alts[0] ?? null)}>
                  {/* One rank per alternative for lookups; tied ones share the first one's place and ink. */}
                  {g.alts.map((i, k) => (
                    <text
                      key={i}
                      className={s.rankNum}
                      data-testid="borda-rank"
                      data-name={names[i]}
                      visibility={k > 0 ? 'hidden' : undefined}
                      x={bordaX + GAP + rankWidth}
                      y={yOf(g.rank)}
                      textAnchor="end"
                      dominantBaseline="central"
                    >
                      {g.rank}
                    </text>
                  ))}
                  <text x={bordaX + GAP + rankWidth + 6} y={yOf(g.rank)} dominantBaseline="central">
                    {short !== g.text ? <title>{g.text}</title> : null}
                    {short}
                  </text>
                </g>
              )
            })}
          <g onKeyDown={move}>
            {crossings.map((x, idx) => {
              const pressed = inPair(x.i) && inPair(x.k)
              return (
                <circle
                  key={`${x.from}-${x.i}-${x.k}`}
                  className={s.rankHit}
                  data-testid="crossing"
                  data-pair={`${x.i}-${x.k}`}
                  data-index={idx}
                  cx={x.x}
                  cy={x.y}
                  r={HIT}
                  role="button"
                  aria-pressed={pressed}
                  aria-label={l.crossing(names[x.i]!, names[x.k]!, columns[x.from]!.label, columns[x.to]!.label)}
                  tabIndex={idx === focus ? 0 : -1}
                  onFocus={() => setFocusKey(idx)}
                  onClick={() => select(x)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    select(x)
                  }}
                />
              )
            })}
          </g>
        </g>
      </svg>
      {notes.map((c) => (
        <p key={c.methodId} className={s.caption} data-testid={`${c.methodId}-note`}>
          {c.note}
        </p>
      ))}
    </ChartFigure>
  )
}
