import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { cocoso } from '../../core/methods/cocoso'
import { waspas, WASPAS_LAMBDA_GRID } from '../../core/methods/waspas'
import { rankScores } from '../../core/rank'
import type { Problem } from '../../core/types'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import r from '../charts/robustness.module.css'
import { stepDecimals } from '../charts/scale'
import { layoutSweep } from '../charts/sweep'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import { lineCrossings } from './geometry'
import s from './illustrations.module.css'

export type WaspasLambdaLabels = {
  title: string
  /** Line under the figure while nothing is hovered or focused (when two lines cross). */
  caption?: string | undefined
  /** The same line when no two lines cross. */
  noSwaps: string
  /** x axis title: "λ: share of the weighted sum". */
  axis: string
  /** Name of the vertical line at the current λ: "Your λ". */
  current: string
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Accessible name of one point, from formatted numbers. */
  point: (alternative: string, lambda: string, value: string, rank: number) => string
  /** Readout for the hovered or focused point: the order at that λ ("A1 > A4 > A5"). */
  readout: (lambda: string, order: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const WASPAS_LAMBDA_LABELS_EN: WaspasLambdaLabels = {
  title: 'Score Q as λ moves',
  caption: 'Each line is one alternative; where two lines cross, they swap places. The vertical line is your λ.',
  noSwaps: 'No two lines cross: the order is the same at every λ.',
  axis: 'λ: share of the weighted sum',
  current: 'Your λ',
  showTable: 'Show as table',
  alternative: 'Alternative',
  point: (a, l, v, k) => `${a}, λ = ${l}: Q = ${v}, rank ${k}`,
  readout: (l, o) => `At λ = ${l}: ${o}`,
}

export type WaspasLambdaProps = {
  /** Whose score to draw against λ: WASPAS's Q (straight lines) or CoCoSo's k (λ moves only k_c). */
  method?: 'waspas' | 'cocoso' | undefined
  problem: Problem
  weights: readonly number[]
  /** The λ the ranking uses (the cursor). */
  lambda: number
  /** Number in the active locale with the given decimals. */
  format?: ((value: number, decimals: number) => string) | undefined
  labels?: Partial<WaspasLambdaLabels>
  /** Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. WASPAS_IDEA_STEPS - 1 that step, the last being the full picture. */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/** The steps of the WASPAS idea: 0 the linear Q(λ) sweep from WPM (λ = 0) to WSM (λ = 1), 1 the crossing marks where two alternatives swap ranks, 2 the vertical cursor at the chosen λ. */
export const WASPAS_IDEA_STEPS = 3

const defaultFormat = (v: number, d: number) => v.toFixed(d)
const HIT = 6

type Active = { i: number; k: number }

/**
 * WASPAS as a picture: Q of every alternative against λ = 0, 0.1, ..., 1 (the core's `waspas.lambdaSweep` step). Q is
 * linear in λ, from the weighted product (λ = 0) to the weighted sum (λ = 1), so each line is straight and every rank
 * swap is where two lines cross (marked). The vertical line is the current λ, with
 * each alternative's Q on it; the first there in the accent. Hover or focus a grid point to read the order at that λ;
 * arrow keys move along λ (left / right) and between alternatives (up / down). A λ change is a state change: the
 * cursor jumps, the lines stay (they do not depend on λ); a weight change moves the lines (object constancy).
 * `method="cocoso"` draws CoCoSo's k the same way: λ moves only k_c, so k bends a little between grid points.
 */
export function WaspasLambda({
  method = 'waspas',
  problem,
  weights,
  lambda,
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: WaspasLambdaProps) {
  const l = { ...WASPAS_LAMBDA_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  const [active, setActive] = useState<Active | null>(null)
  const [focusKey, setFocusKey] = useState<Active>({ i: 0, k: 5 })
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), WASPAS_IDEA_STEPS - 1) : WASPAS_IDEA_STEPS - 1
  const off = (from: number) => (stage >= from ? undefined : '')
  const shownActive = stepping ? null : active
  const names = problem.alternatives
  const res = useMemo(() => {
    try {
      return (method === 'cocoso' ? cocoso : waspas).compute(problem, [...weights], { lambda })
    } catch {
      return null
    }
  }, [method, problem, weights, lambda])
  const sweep = useMemo(() => res?.steps.find((x) => x.key === `${method}.lambdaSweep`)?.matrix ?? null, [method, res])
  const xs = WASPAS_LAMBDA_GRID as number[]
  const layout = useMemo(
    () => (sweep ? layoutSweep({ width, plotHeight: width < 480 ? 200 : 240, xs, series: sweep, labels: names }) : null),
    [width, sweep, xs, names],
  )
  if (!res || !sweep || !layout) return null

  const m = names.length
  const { x, y, left, right, top, bottom } = layout
  const tickY = bottom + 16
  const titleY = tickY + 20
  const height = titleY + 10
  const leaders = new Set(res.ranking.flatMap((rk, i) => (rk === 1 ? [i] : [])))
  const ranksAt = WASPAS_LAMBDA_GRID.map((_, k) => rankScores(sweep.map((row) => row[k]!), 'desc'))
  const grid = (k: number) => format(WASPAS_LAMBDA_GRID[k]!, 1)

  // A pair whose difference changes sign swaps there; linear inside a grid cell (exact for WASPAS, where
  // Q_i(λ) = a_i + b_i λ is one straight line; CoCoSo's k is drawn through the grid points the same way).
  const last = WASPAS_LAMBDA_GRID.length - 1
  const swaps: { x: number; y: number }[] = []
  for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) swaps.push(...lineCrossings(xs, sweep[a]!, sweep[b]!))

  const table: ChartTable = {
    corner: l.alternative,
    columns: WASPAS_LAMBDA_GRID.map((_, k) => `λ = ${grid(k)}`),
    rows: names.map((name, i) => ({ label: name, cells: sweep[i]!.map((q) => format(q, 4)) })),
  }

  // Up / down follow the order at the focused λ, so the next point is the next line on screen.
  const byRank = (k: number) => names.map((_, i) => i).sort((a, b) => ranksAt[k]![a]! - ranksAt[k]![b]! || a - b)
  const focus = { i: Math.min(focusKey.i, m - 1), k: focusKey.k }
  const move = (e: KeyboardEvent<SVGGElement>) => {
    if (stepping) return
    const next = { ...focus }
    const order = byRank(focus.k)
    const pos = order.indexOf(focus.i)
    if (e.key === 'ArrowRight') next.k = Math.min(last, focus.k + 1)
    else if (e.key === 'ArrowLeft') next.k = Math.max(0, focus.k - 1)
    else if (e.key === 'ArrowDown') next.i = order[Math.min(m - 1, pos + 1)]!
    else if (e.key === 'ArrowUp') next.i = order[Math.max(0, pos - 1)]!
    else if (e.key === 'Home') next.k = 0
    else if (e.key === 'End') next.k = last
    else if (e.key === 'Escape') {
      setActive(null)
      return
    } else return
    e.preventDefault()
    setFocusKey(next)
    setActive(next)
    e.currentTarget.querySelector<SVGElement>(`[data-i="${next.i}"][data-k="${next.k}"]`)?.focus()
  }

  const yDecimals = stepDecimals((layout.yTicks[1] ?? 1) - (layout.yTicks[0] ?? 0))
  const drawOrder = names.map((_, i) => i).sort((a, b) => Number(leaders.has(a)) - Number(leaders.has(b)) || a - b)
  const cx = x(lambda)
  const order = (k: number) => byRank(k).map((i) => names[i]).join(' > ')

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
        className={[s.svg, animate && r.animate, explain && s.explain].filter(Boolean).join(' ')}
        width={layout.width}
        height={height}
        viewBox={`0 0 ${layout.width} ${height}`}
        role="group"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
        data-testid={`${method}-lambda`}
      >
        <g aria-hidden>
          {layout.yTicks.map((v) => (
            <g key={`y${v}`}>
              <line className={r.grid} x1={left} x2={right} y1={y(v)} y2={y(v)} />
              <text className={r.tick} x={left - 8} y={y(v)} textAnchor="end" dominantBaseline="central">
                {format(v, yDecimals)}
              </text>
            </g>
          ))}
          <line className={r.axis} x1={left} x2={right} y1={bottom} y2={bottom} />
          {[0, 2, 4, 6, 8, 10].map((k) => (
            <text key={`x${k}`} className={r.tick} x={x(WASPAS_LAMBDA_GRID[k]!)} y={tickY} textAnchor="middle" dominantBaseline="central">
              {grid(k)}
            </text>
          ))}
          <text className={r.axisTitle} x={(left + right) / 2} y={titleY} textAnchor="middle" dominantBaseline="central">
            {l.axis}
          </text>
          {drawOrder.map((i) => (
            <path
              key={i}
              className={`${r.sweepLine} ${s.lambdaLine}`}
              data-highlight={leaders.has(i) || undefined}
              data-on={shownActive?.i === i || undefined}
              data-testid={`${method}-line`}
              d={layout.paths[i]}
              style={{ d: `path("${layout.paths[i]}")` }}
            />
          ))}
          {swaps.map((p, k) => (
            <circle
              key={k}
              className={`${r.switchMark} ${s.stageItem}`}
              data-off={off(1)}
              data-testid={`${method}-swap`}
              cx={x(p.x)}
              cy={y(p.y)}
              r={3.5}
            />
          ))}
          {/* The current λ: a state, so it jumps (no transition). */}
          <line
            className={`${r.cursor} ${s.stageItem}`}
            data-off={off(2)}
            data-testid={`${method}-cursor`}
            data-lambda={lambda}
            x1={cx}
            x2={cx}
            y1={top - 4}
            y2={bottom}
          />
          <text
            className={`${r.tick} ${s.stageItem}`}
            data-off={off(2)}
            x={Math.min(Math.max(cx, left + 30), right - 30)}
            y={top - 12}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {l.current}
          </text>
          {res.scores.map((q, i) => (
            <circle
              key={i}
              className={`${r.cursorDot} ${s.stageItem}`}
              data-off={off(2)}
              data-highlight={leaders.has(i) || undefined}
              cx={cx}
              cy={y(q)}
              r={3.5}
            />
          ))}
          {layout.ends.map((e) => (
            <g key={e.index} className={r.endLabel} style={{ transform: `translate(0px, ${e.y}px)` }} data-highlight={leaders.has(e.index) || undefined}>
              <text x={right + 8} y={0} dominantBaseline="central">
                {e.text !== e.full ? <title>{e.full}</title> : null}
                {e.text}
              </text>
            </g>
          ))}
        </g>
        <g onKeyDown={move} onMouseLeave={() => setActive(null)} style={stepping ? { pointerEvents: 'none' } : undefined}>
          {sweep.map((row, i) =>
            row.map((q, k) => (
              <circle
                key={`${i}-${k}`}
                className={s.lambdaHit}
                data-on={(shownActive?.i === i && shownActive.k === k) || undefined}
                data-i={i}
                data-k={k}
                cx={x(WASPAS_LAMBDA_GRID[k]!)}
                cy={y(q)}
                r={HIT}
                tabIndex={focus.i === i && focus.k === k && !stepping ? 0 : -1}
                role="img"
                aria-label={l.point(names[i]!, grid(k), format(q, 4), ranksAt[k]![i]!)}
                onMouseEnter={() => setActive({ i, k })}
                onFocus={() => {
                  setFocusKey({ i, k })
                  setActive({ i, k })
                }}
                onBlur={() => setActive(null)}
              />
            )),
          )}
        </g>
      </svg>
      {/* The focused point's own name says the same to a screen reader, so the readout is for the eyes only. */}
      <p className={s.readout}>
        {shownActive ? (
          <span className={s.readoutC} aria-hidden>
            {l.readout(grid(shownActive.k), order(shownActive.k))}
          </span>
        ) : (
          <span>{swaps.length > 0 ? (l.caption ?? ' ') : l.noSwaps}</span>
        )}
      </p>
    </ChartFigure>
  )
}
