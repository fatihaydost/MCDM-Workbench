import { ISO_C_DEFAULT, isoClosenessEnd, isoQRegion, isoQSegment, type Point } from './geometry'
import s from './illustrations.module.css'

export type MethodThumbProps =
  | {
      /** Weight bars: CRITIC or equal weights, the largest in the accent. */
      kind: 'bars'
      values: readonly number[]
      highlight?: number | undefined
      className?: string | undefined
    }
  | {
      /** Entropy: the shares of an even criterion and of an uneven one, side by side (the second in the accent). */
      kind: 'shares'
      even: readonly number[]
      uneven: readonly number[]
      className?: string | undefined
    }
  | {
      /** SAW: one stacked bar per alternative (rows of contributions, in rank order), parts split by gaps, the first in the accent. */
      kind: 'stack'
      rows: readonly (readonly number[])[]
      className?: string | undefined
    }
  | {
      /**
       * VIKOR: alternatives at their (S term, R term) in the unit square, the line Q = Q(a') + DQ and the part below
       * it tinted; `inSet` (the compromise set) in the accent.
       */
      kind: 'compromise'
      points: readonly Point[]
      v: number
      /** Q(a') + DQ. */
      q: number
      inSet: readonly number[]
      className?: string | undefined
    }
  | {
      /** EDAS: one bar per alternative in rank order, SN to the left of the average line and SP to the right; the first in the accent. */
      kind: 'diverging'
      rows: readonly { below: number; above: number }[]
      className?: string | undefined
    }
  | {
      /** TOPSIS distance plane: (D+, D-) points and the rays of constant closeness. */
      kind: 'plane'
      points: readonly Point[]
      highlight?: number | undefined
      className?: string | undefined
    }

const W = 132
const H = 72
const PAD = 6

/**
 * A small picture of a method's idea for catalogue cards: no text, no numbers, decorative
 * (aria-hidden). The shapes come from real computed values passed in by the page.
 */
export function MethodThumb(props: MethodThumbProps) {
  const cls = [s.thumb, props.className].filter(Boolean).join(' ')
  if (props.kind === 'bars') {
    const { values, highlight } = props
    const max = Math.max(...values, 1e-12)
    const n = values.length
    const gap = 6
    const bw = (W - 2 * PAD - gap * (n - 1)) / Math.max(n, 1)
    return (
      <svg className={cls} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <line className={s.thumbAxis} x1={PAD - 2} x2={W - PAD + 2} y1={H - PAD} y2={H - PAD} />
        {values.map((v, i) => {
          const h = (v / max) * (H - 2 * PAD - 4)
          return (
            <rect
              key={i}
              className={i === highlight ? s.thumbAccent : s.thumbMark}
              x={PAD + i * (bw + gap)}
              y={H - PAD - h}
              width={bw}
              height={h}
            />
          )
        })}
      </svg>
    )
  }
  if (props.kind === 'shares') {
    const groups = [props.even, props.uneven]
    const max = Math.max(...groups.flat(), 1e-12)
    const gw = (W - 2 * PAD - 12) / 2
    return (
      <svg className={cls} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {groups.map((g, k) => {
          const x0 = PAD + k * (gw + 12)
          const slot = gw / Math.max(g.length, 1)
          return (
            <g key={k}>
              <line className={s.thumbAxis} x1={x0 - 1} x2={x0 + gw + 1} y1={H - PAD} y2={H - PAD} />
              {g.map((v, i) => {
                const h = (v / max) * (H - 2 * PAD - 4)
                return <rect key={i} className={k === 1 ? s.thumbAccent : s.thumbMark} x={x0 + i * slot + slot * 0.15} y={H - PAD - h} width={slot * 0.7} height={h} />
              })}
            </g>
          )
        })}
      </svg>
    )
  }
  if (props.kind === 'stack') {
    const { rows } = props
    const max = Math.max(...rows.map((r) => r.reduce((a, b) => a + b, 0)), 1e-12)
    const gap = 6
    const bh = (H - 2 * PAD - gap * (rows.length - 1)) / Math.max(rows.length, 1)
    return (
      <svg className={cls} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <line className={s.thumbAxis} x1={PAD} x2={PAD} y1={PAD - 2} y2={H - PAD + 2} />
        {rows.map((r, i) => {
          let x = PAD + 1
          return r.map((v, j) => {
            const w = (v / max) * (W - 2 * PAD - 1)
            const seg = <rect key={`${i}-${j}`} className={i === 0 ? s.thumbAccent : s.thumbMark} x={x} y={PAD + i * (bh + gap)} width={Math.max(w - 2, 0)} height={bh} />
            x += w
            return seg
          })
        })}
      </svg>
    )
  }
  if (props.kind === 'diverging') {
    const { rows } = props
    const left = Math.max(...rows.map((r) => r.below), 0)
    const right = Math.max(...rows.map((r) => r.above), 0)
    const span = Math.max(left + right, 1e-12)
    const unit = (W - 2 * PAD) / span
    const cx = PAD + left * unit
    const gap = 3
    const bh = (H - 2 * PAD - gap * (rows.length - 1)) / Math.max(rows.length, 1)
    return (
      <svg className={cls} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rows.map((r, i) => (
          <g key={i} className={i === 0 ? s.thumbAccent : s.thumbMark}>
            <rect x={cx - r.below * unit} y={PAD + i * (bh + gap)} width={r.below * unit} height={bh} />
            <rect x={cx} y={PAD + i * (bh + gap)} width={r.above * unit} height={bh} />
          </g>
        ))}
        <line className={s.thumbAxis} x1={cx} x2={cx} y1={PAD - 3} y2={H - PAD + 3} />
      </svg>
    )
  }
  if (props.kind === 'compromise') {
    const { points, v, q, inSet } = props
    const side = H - 2 * PAD
    const x0 = (W - side) / 2
    const X = (x: number) => x0 + x * side
    const Y = (y: number) => H - PAD - y * side
    const region = isoQRegion(v, Math.min(q, 1.0000001))
    const seg = q <= 1 ? isoQSegment(v, q) : null
    return (
      <svg className={cls} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {region.length > 2 && <path className={s.vikorBand} d={`M${region.map((p) => `${X(p.x)} ${Y(p.y)}`).join('L')}Z`} />}
        {seg && <line className={s.vikorLine} x1={X(seg[0].x)} y1={Y(seg[0].y)} x2={X(seg[1].x)} y2={Y(seg[1].y)} />}
        <path className={s.thumbAxis} d={`M${X(0)} ${Y(1)}V${Y(0)}H${X(1)}`} fill="none" />
        {points.map((p, i) => (
          <circle key={i} className={inSet.includes(i) ? s.thumbAccent : s.thumbMark} cx={X(p.x)} cy={Y(p.y)} r={inSet.includes(i) ? 4 : 3.5} />
        ))}
      </svg>
    )
  }
  const { points, highlight } = props
  const mx = Math.max(...points.map((p) => p.x), 1e-12) * 1.15
  const my = Math.max(...points.map((p) => p.y), 1e-12) * 1.15
  const k = Math.min((W - 2 * PAD) / mx, (H - 2 * PAD) / my)
  const xMax = (W - 2 * PAD) / k
  const yMax = (H - 2 * PAD) / k
  const X = (v: number) => PAD + v * k
  const Y = (v: number) => H - PAD - v * k
  return (
    <svg className={cls} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {ISO_C_DEFAULT.map((c) => {
        const e = isoClosenessEnd(c, xMax, yMax)
        return <line key={c} className={s.iso} x1={X(0)} y1={Y(0)} x2={X(e.x)} y2={Y(e.y)} />
      })}
      <path className={s.thumbAxis} d={`M${PAD} ${PAD - 2}V${H - PAD}H${W - PAD + 2}`} fill="none" />
      {points.map((p, i) => (
        <circle key={i} className={i === highlight ? s.thumbAccent : s.thumbMark} cx={X(p.x)} cy={Y(p.y)} r={i === highlight ? 4 : 3.5} />
      ))}
    </svg>
  )
}
