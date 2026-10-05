import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn, Table, TBody, Td, Th, THead, Tr } from '../../ui'
import { movedAlternatives } from './order'
import { paintedOffsetY, reducedMotion, tokenEase, tokenMs } from './motion'
import s from './ranking.module.css'

/**
 * How long the rows that changed place keep their tint. A hold, not a motion: it is the same with reduced motion
 * (where the rows jump instead of sliding, and the tint is what shows the change), like the grid's changed-direction
 * tint. The tint itself comes and goes in --dur.
 */
const MOVED_HOLD_MS = 1200

export type LiveRankingProps = {
  /** Alternative indices in rank order at the current weight. */
  order: number[]
  ranking: readonly number[]
  scores: readonly number[]
  names: readonly string[]
  format: (v: number) => string
  labelledBy: string
  columns: { rank: string; alternative: string; closeness: string }
  /**
   * The change comes from a held-down key (key repeat): rows jump instead of sliding (MOTION.md frequency rule: a
   * high-frequency keyboard action gets no motion); the tint stays.
   */
  instant?: boolean
  density?: 'compact' | 'regular'
}

/**
 * The ranking at the slider's weight. When the order changes, each row slides from where it is painted to its new
 * place (FLIP with the Web Animations API, --dur-data and --ease); a change that comes while rows are still moving
 * starts from their painted position, so dragging never makes a row jump. Rows that changed place take a short accent
 * tint. Closeness values change at once (no counting). With reduced motion the rows jump and the tint remains.
 */
export function LiveRanking({ order, ranking, scores, names, format, labelledBy, columns, instant = false, density = 'regular' }: LiveRankingProps) {
  const rows = useRef(new Map<number, HTMLTableRowElement>())
  const tops = useRef(new Map<number, number>())
  const prevOrder = useRef<number[] | null>(null)
  const [moved, setMoved] = useState<{ ids: Set<number>; n: number } | null>(null)
  const orderKey = order.join(',')

  useLayoutEffect(() => {
    const prev = prevOrder.current
    prevOrder.current = order
    const next = new Map<number, number>()
    for (const [i, el] of rows.current) next.set(i, el.offsetTop)
    if (prev && prev.join(',') !== orderKey) {
      const changed = movedAlternatives(prev, order)
      setMoved((m) => ({ ids: new Set(changed), n: (m?.n ?? 0) + 1 }))
      const any = rows.current.values().next().value
      const duration = any && !instant && !reducedMotion() ? tokenMs(any, '--dur-data') : 0
      const easing = any ? tokenEase(any) : 'ease'
      for (const [i, el] of rows.current) {
        const before = tops.current.get(i)
        const after = next.get(i)
        if (before === undefined || after === undefined) continue
        // Where the row is painted now: its old place plus what a running slide still adds.
        const painted = before + paintedOffsetY(el)
        for (const a of el.getAnimations()) a.cancel()
        el.removeAttribute('data-lifted')
        const dy = painted - after
        if (duration > 0 && Math.abs(dy) > 0.5) {
          const anim = el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0px)' }], { duration, easing })
          if (dy > 0) {
            el.setAttribute('data-lifted', '')
            // Lowered when no slide is left on the row: a cancelled earlier slide reports later and must not.
            const drop = () => {
              if (el.getAnimations().length === 0) el.removeAttribute('data-lifted')
            }
            anim.addEventListener('finish', drop)
            anim.addEventListener('cancel', drop)
          }
        }
      }
    }
    tops.current = next
    // orderKey carries `order`'s content; the array itself is new on every render.
  }, [orderKey])

  useEffect(() => {
    if (!moved) return
    const id = window.setTimeout(() => setMoved(null), MOVED_HOLD_MS)
    return () => window.clearTimeout(id)
  }, [moved])

  return (
    <Table density={density} aria-labelledby={labelledBy} className="w-full" stickyHeader={false}>
      <THead>
        <Tr>
          <Th numeric className="w-16">
            {columns.rank}
          </Th>
          <Th>{columns.alternative}</Th>
          <Th numeric>{columns.closeness}</Th>
        </Tr>
      </THead>
      <TBody>
        {order.map((i) => {
          const first = ranking[i] === 1
          return (
            <tr
              key={i}
              ref={(el) => {
                if (el) rows.current.set(i, el)
                else rows.current.delete(i)
              }}
              className={s.liveRow}
              data-testid="live-row"
              data-alternative={i}
              data-moved={moved?.ids.has(i) || undefined}
            >
              <Td numeric className={cn(first && 'font-semibold')}>
                {ranking[i]}
              </Td>
              <Th scope="row" className={cn(first && 'font-semibold')}>
                {names[i]}
              </Th>
              <Td numeric data-testid="live-closeness" className={cn(first ? 'font-semibold' : 'font-medium')}>
                {format(scores[i]!)}
              </Td>
            </tr>
          )
        })}
      </TBody>
    </Table>
  )
}
