import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { Problem } from '../../core/types'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { ChartFigure, type ChartTable } from '../charts/ChartFigure'
import { estimateTextWidth, truncate } from '../charts/layout'
import { useAnimateValues, useElementWidth } from '../charts/useElementWidth'
import {
  argMax,
  distancePoints,
  fitDistancePlane,
  fitPlot,
  ISO_C_DEFAULT,
  isoClosenessEnd,
  placeLabels,
  linePath,
  pointCss,
  referenceGuides,
  topsisProjection,
  type PlotBox,
  type Point,
  type TopsisProjection,
} from './geometry'
import s from './illustrations.module.css'

export type TopsisGeometryView = 'distances' | 'criteria'

export type TopsisGeometryLabels = {
  title: string
  /** One line under the criterion-plane picture, e.g. "Closer to A+ and farther from A- gives a higher C." */
  caption: string
  /** Criterion plane only, with more than two criteria: the plot is a projection, the numbers are not. */
  projectionNote: string
  ideal: string
  antiIdeal: string
  dPlus: string
  dMinus: string
  /** The closeness formula as printed in the readout. */
  formula: string
  /** Accessible name of the group of points ("Choose an alternative"). */
  select: string
  /** Accessible name of one point, from its name and formatted closeness. */
  point: (name: string, closeness: string) => string
  showTable: string
  /** Header of the first table column. */
  alternative: string
  /** Header of the closeness column. */
  closeness: string
  /** Accessible name of the view switch. */
  viewLabel: string
  viewDistances: string
  viewCriteria: string
  /** Distance plane axes: the label says which direction is better. */
  axisDPlus: string
  axisDMinus: string
  /** Label of a ray of constant closeness, from the formatted value ("C 0.75"). */
  isoC: (c: string) => string
  /** One line under the distance plane. */
  planeCaption: string
  /** Criterion axis names with their direction. */
  higherBetter: (name: string) => string
  lowerBetter: (name: string) => string
}

/** Development defaults only: the pages pass translated labels. */
export const TOPSIS_GEOMETRY_LABELS_EN: TopsisGeometryLabels = {
  title: 'Distance to the ideal and the anti-ideal',
  caption: 'Closer to A+ and farther from A− gives a higher C.',
  projectionNote: 'Drawn on the two heaviest criteria; D and C are computed on all criteria.',
  ideal: 'A+',
  antiIdeal: 'A−',
  dPlus: 'D+',
  dMinus: 'D−',
  formula: 'C = D− / (D+ + D−)',
  select: 'Choose an alternative',
  point: (name, c) => `${name}, C ${c}`,
  showTable: 'Show as table',
  alternative: 'Alternative',
  closeness: 'C',
  viewLabel: 'View',
  viewDistances: 'Distances',
  viewCriteria: 'Two criteria',
  axisDPlus: 'D+ to the ideal, lower is better',
  axisDMinus: 'D− to the anti-ideal, higher is better',
  isoC: (c) => `C ${c}`,
  planeCaption: 'Top left is best. C is the same along each ray.',
  higherBetter: (name) => `${name}, higher is better`,
  lowerBetter: (name) => `${name}, lower is better`,
}

export type TopsisGeometryProps = {
  problem: Problem
  weights: readonly number[]
  /** Criterion indices on the x and y axis of the criterion plane; default the two with the largest weight. */
  axes?: [number, number] | undefined
  /** First view: the D+ / D- plane (exact for any number of criteria, the default) or two criteria. */
  defaultView?: TopsisGeometryView | undefined
  /** Selected alternative (controlled). Default: the best ranked one. */
  selected?: number | undefined
  onSelectedChange?: ((index: number) => void) | undefined
  /** Number format for the readout and the table (the active locale, 3 or 4 decimals). */
  format?: ((value: number) => string) | undefined
  labels?: Partial<TopsisGeometryLabels>
  /**
   * Step through the idea (IdeaSteps): null or undefined draws the full picture; 0 .. TOPSIS_IDEA_STEPS - 1 draws that
   * step. The last step is the full distance-plane picture. While stepping, the view follows the step and the points
   * and the view switch are inert.
   */
  step?: number | null | undefined
  /** Move at the explain pace (--dur-explain), for a step change and the frame the stepping ends. */
  explain?: boolean | undefined
  className?: string | undefined
}

/**
 * The steps of the TOPSIS idea: 0 alternatives as points on two criteria, 1 A+ and A- from the best and worst value
 * of each criterion, 2 the selected alternative's D+ and D-, 3 every alternative at (D+, D-) (the lines become its
 * coordinates), 4 the rays of equal C (the full picture).
 */
export const TOPSIS_IDEA_STEPS = 5

/** What a drawing shows at the current step. */
type Show = { refs: boolean; refGuides: boolean; rays: boolean }

const MARGIN = { left: 20, right: 36, top: 28, bottom: 36 }
const PLANE_MARGIN = { left: 16, right: 52, top: 44, bottom: 28 }
const defaultFormat = (v: number) => v.toFixed(3)
/** "0,500" -> "0,5", "0.000" -> "0": a fixed-decimals format made short for ticks and ray labels. */
const trimZeros = (text: string) => text.replace(/([.,]\d*?)0+$/, '$1').replace(/[.,]$/, '')

type Screen = { x: number; y: number }

/**
 * TOPSIS as a picture, in two views.
 * - Distances (default): every alternative at (D+, D-), the core's n-criteria distances, with the
 *   rays of constant closeness C = D- / (D+ + D-). Exact for any number of criteria.
 * - Two criteria: the weighted normalized values of two criteria with A+ and A- and the selected
 *   alternative's distance lines. Values grow right and up on both axes; the axis label says which
 *   direction is better. Exact for two criteria, a projection for more.
 * Points are a radio group: click, or Tab to it and use the arrow keys / Home / End.
 * Motion (docs/design/MOTION.md): switching the view moves each alternative's dot and label to its place in the other
 * view (object constancy), and the selected point's D+ and D- lines turn from distances to A+ and A- into its two
 * coordinates; what belongs to one view only (axes, rays, A+ and A-) crossfades. Both views are drawn, the hidden one
 * invisible. A new selection moves the lines. Nothing moves on first render or on resize.
 */
export function TopsisGeometry({
  problem,
  weights,
  axes,
  defaultView = 'distances',
  selected,
  onSelectedChange,
  format = defaultFormat,
  labels,
  step,
  explain = false,
  className,
}: TopsisGeometryProps) {
  const l = { ...TOPSIS_GEOMETRY_LABELS_EN, ...labels }
  const uid = useId()
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const animate = useAnimateValues(width)
  // The render that switches the view moves the D+ / D- lines with the dots (--dur-data); a new selection moves them
  // faster (--dur-slow). Transitions take the duration of the style they change to, so a class on this render is enough.
  const prevView = useRef(defaultView)
  const proj = useMemo(() => topsisProjection(problem, weights, axes), [problem, weights, axes])
  const [own, setOwn] = useState<number | null>(null)
  const [view, setView] = useState<TopsisGeometryView>(defaultView)
  const pointRefs = useRef<(SVGGElement | null)[]>([])
  const stepping = step !== null && step !== undefined
  const stage = stepping ? Math.min(Math.max(step, 0), TOPSIS_IDEA_STEPS - 1) : TOPSIS_IDEA_STEPS - 1
  const stepView: TopsisGeometryView = stage < 3 ? 'criteria' : 'distances'
  const shownView = stepping ? stepView : view
  useLayoutEffect(() => {
    prevView.current = shownView
  })
  // The steps drive the view without touching the reader's own (`view`). Leaving from the last step (Finish) keeps
  // the distance plane it shows; closing earlier goes back to the view the reader had. Derived in render, so the
  // frame that ends the steps already shows the right view.
  const [lastStage, setLastStage] = useState<number | null>(null)
  if (stepping && lastStage !== stage) setLastStage(stage)
  if (!stepping && lastStage !== null) {
    setLastStage(null)
    if (lastStage === TOPSIS_IDEA_STEPS - 1) setView('distances')
  }

  const m = problem.alternatives.length
  const best = proj ? argMax(proj.closeness) : 0
  const current = Math.min(Math.max(selected ?? own ?? best, 0), Math.max(m - 1, 0))

  const choose = useCallback(
    (i: number, focus = false) => {
      if (selected === undefined) setOwn(i)
      onSelectedChange?.(i)
      if (focus) pointRefs.current[i]?.focus()
    },
    [selected, onSelectedChange],
  )

  if (!proj) return null
  const [ax, ay] = proj.axes
  const xName = problem.criteria[ax]?.name ?? ''
  const yName = problem.criteria[ay]?.name ?? ''
  const dirName = (j: number, name: string) => (problem.criteria[j]?.type === 'cost' ? l.lowerBetter(name) : l.higherBetter(name))

  const onKey = (e: KeyboardEvent<SVGGElement>, i: number) => {
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % m
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + m) % m
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = m - 1
    else if (e.key === ' ' || e.key === 'Enter') next = i
    if (next < 0) return
    e.preventDefault()
    choose(next, true)
  }

  const distanceCells = (i: number) => [format(proj.dPlus[i]!), format(proj.dMinus[i]!), format(proj.closeness[i]!)]
  const table: ChartTable =
    shownView === 'distances'
      ? {
          corner: l.alternative,
          columns: [l.dPlus, l.dMinus, l.closeness],
          rows: problem.alternatives.map((name, i) => ({ label: name, cells: distanceCells(i) })),
        }
      : {
          corner: l.alternative,
          columns: [xName, yName, l.dPlus, l.dMinus, l.closeness],
          rows: [
            ...problem.alternatives.map((name, i) => ({
              label: name,
              cells: [format(proj.points[i]!.x), format(proj.points[i]!.y), ...distanceCells(i)],
            })),
            { label: l.ideal, cells: [format(proj.ideal.x), format(proj.ideal.y), '', '', ''] },
            { label: l.antiIdeal, cells: [format(proj.antiIdeal.x), format(proj.antiIdeal.y), '', '', ''] },
          ],
        }

  const w = Math.max(width, 240)
  // Both views share one height, the larger of the two, so switching never resizes the figure (the old view would
  // paint over the text below while it fades, and the readout would jump). The shorter view keeps its equal scale
  // and gets more room inside its axes: the data is centred in the criterion plane, the rays run on in the plane.
  const show: Show = { refs: stage >= 1, refGuides: stepping && stage === 1, rays: stage >= 4 }
  const draw = (v: TopsisGeometryView, height = 0): Drawing =>
    v === 'distances'
      ? planeDrawing(proj, w, l, uid, format, height, show)
      : criteriaDrawing(proj, w, l, uid, xName, yName, dirName(ax, xName), dirName(ay, yName), height, show)
  const natural = { distances: draw('distances'), criteria: draw('criteria') }
  const height = Math.max(natural.distances.height, natural.criteria.height)
  const drawings: Record<TopsisGeometryView, Drawing> = {
    distances: natural.distances.height < height ? draw('distances', height) : natural.distances,
    criteria: natural.criteria.height < height ? draw('criteria', height) : natural.criteria,
  }
  const drawing = drawings[shownView]
  const viewChanged = prevView.current !== shownView
  // From step 2 on, the selected alternative is the one the story follows; before that every point is alike.
  const selectOn = stage >= 2
  const pts = drawing.points
  const nameMax = Math.max(40, Math.min(120, (drawing.box.right - drawing.box.left) / 3))
  const shortNames = problem.alternatives.map((name) => truncate(name, nameMax, 12))
  // Labels that would cover each other or another dot move to a free side of their own dot. Best
  // ranked first, and the same for any selection (a bold label is about 10% wider), so they never jump.
  const labelSpots = placeLabels(
    pts,
    shortNames.map((n) => estimateTextWidth(n, 12) * 1.1),
    { width, height },
    proj.closeness.map((_, i) => i).sort((a, b) => proj.closeness[b]! - proj.closeness[a]! || a - b),
    drawing.obstacles ? { obstacles: drawing.obstacles } : undefined,
  )

  const caption = shownView === 'distances' ? l.planeCaption : l.caption
  const note = shownView === 'criteria' && !proj.exact ? l.projectionNote : null

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
      <SegmentedControl<TopsisGeometryView>
        aria-label={l.viewLabel}
        size="sm"
        className={s.viewSwitch}
        value={shownView}
        onValueChange={setView}
        options={[
          { value: 'distances', label: l.viewDistances, disabled: stepping },
          { value: 'criteria', label: l.viewCriteria, disabled: stepping },
        ]}
      />
      <svg
        className={[s.svg, animate && s.animate, viewChanged && s.viewChange, explain && s.explain].filter(Boolean).join(' ')}
        data-select-off={selectOn ? undefined : ''}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-table`}
      >
        <defs>
          <marker id={`${uid}-head`} viewBox="0 0 8 8" refX={7} refY={4} markerWidth={8} markerHeight={8} orient="auto-start-reverse">
            <path className={s.axisHead} d="M0 0.5 8 4 0 7.5z" />
          </marker>
        </defs>
        {VIEWS.map((v) => (
          <g key={v} className={s.layer} data-view={v} data-hidden={v === shownView ? undefined : ''}>
            {drawings[v].background}
          </g>
        ))}
        <Distances
          ends={{ from: pts[current] ?? pts[0]!, ...drawing.distances(pts[current] ?? pts[0]!) }}
          dPlus={l.dPlus}
          dMinus={l.dMinus}
          off={!selectOn}
        />

        {/* Alternatives: a radio group, one tab stop, arrows move the selection. */}
        <g role="radiogroup" aria-label={l.select} aria-disabled={stepping || undefined}>
          {pts.map((p, i) => {
            const on = i === current
            const name = problem.alternatives[i] ?? ''
            const short = shortNames[i] ?? ''
            const spot = labelSpots[i]!
            return (
              <g
                key={i}
                ref={(el) => {
                  pointRefs.current[i] = el
                }}
                className={s.point}
                style={{ transform: pointCss(p) }}
                role="radio"
                aria-checked={on}
                aria-label={l.point(name, format(proj.closeness[i]!))}
                tabIndex={on && !stepping ? 0 : -1}
                onClick={stepping ? undefined : () => choose(i)}
                onKeyDown={stepping ? undefined : (e) => onKey(e, i)}
              >
                <circle className={s.hit} r={14} />
                <circle className={s.focusRing} r={10} />
                <circle className={s.dot} r={on && selectOn ? 6 : 5} />
                <text className={s.pointLabel} textAnchor={spot.anchor} style={{ transform: pointCss({ x: spot.x - p.x, y: spot.y - p.y }) }}>
                  {name !== short ? <title>{name}</title> : null}
                  {short}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      <div className={`${s.readout} ${s.stageItem}`} data-off={selectOn ? undefined : ''} aria-live="polite">
        <span className={s.readoutName}>{problem.alternatives[current]}</span>
        <span>
          {l.dPlus} {format(proj.dPlus[current]!)}
        </span>
        <span>
          {l.dMinus} {format(proj.dMinus[current]!)}
        </span>
        <span className={s.readoutC}>
          {l.formula} = <b>{format(proj.closeness[current]!)}</b>
        </span>
      </div>
      {/* While stepping, the step's own sentence (IdeaSteps) says what the picture shows; the projection note stays,
          since the drawn lines are then not the real D+ and D-. */}
      <p className={s.caption}>
        <span className={s.stageItem} data-off={stepping ? '' : undefined}>
          {caption}
        </span>
        {note ? (
          <>
            {' '}
            <span className={s.note}>{note}</span>
          </>
        ) : null}
      </p>
    </ChartFigure>
  )
}

const VIEWS: readonly TopsisGeometryView[] = ['distances', 'criteria']

/**
 * A straight line whose geometry is also the CSS `d` property, so a new selection slides it where `d` transitions
 * (Chromium, Firefox) and it jumps elsewhere (the attribute). Not a unit line stretched by transform: a composited
 * transform animation scales the painted stroke, which smears dashes and caps while it moves.
 */
function Segment({ className, from, to, ...rest }: { className: string | undefined; from: Point; to: Point; 'data-dist'?: string }) {
  const d = linePath(from, to)
  return <path className={className} d={d} style={{ d: `path('${d}')` }} {...rest} />
}

type Drawing = {
  height: number
  box: { left: number; right: number; top: number; bottom: number }
  points: Screen[]
  obstacles?: PlotBox[] | undefined
  background: ReactNode
  /** Where the selected point's D+ and D- lines end: A+ and A- in the criterion plane, the axes in the distance plane. */
  distances: (sel: Screen) => { plus: Screen; minus: Screen }
}

/**
 * The selected point's D+ and D- as two lines that belong to both views. In the criterion plane they run to A+ and
 * A-; in the distance plane the same lines are the point's coordinates: D+ runs level to the D- axis (its length is
 * D+), D- runs down to the D+ axis (its length is D-). Each starts at the dot and moves with it, so a view switch
 * turns the two distances into the two coordinates. Labels ride at the middle of their line.
 */
function Distances({ ends, dPlus, dMinus, off }: { ends: { from: Screen; plus: Screen; minus: Screen }; dPlus: string; dMinus: string; off: boolean }) {
  const mid = (a: Screen, b: Screen) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  return (
    <g aria-hidden="true" className={s.stageItem} data-off={off ? '' : undefined}>
      <Segment className={s.dist} from={ends.from} to={ends.plus} data-dist="plus" />
      <Segment className={`${s.dist} ${s.distMinus}`} from={ends.from} to={ends.minus} data-dist="minus" />
      <text className={s.distLabel} x={0} y={0} dx={6} dy={-6} style={{ transform: pointCss(mid(ends.from, ends.plus)) }}>
        {dPlus}
      </text>
      <text className={s.distLabel} x={0} y={0} dx={6} dy={-6} style={{ transform: pointCss(mid(ends.from, ends.minus)) }}>
        {dMinus}
      </text>
    </g>
  )
}

/** The D+ / D- plane: origin bottom left, rays of constant C; the selected point's D+ and D- run to the axes. */
/** `height`: the drawing's total height when it must be taller than the data needs (0: as the data needs). */
function planeDrawing(
  proj: TopsisProjection,
  width: number,
  l: TopsisGeometryLabels,
  uid: string,
  format: (v: number) => string,
  height: number,
  show: Show,
): Drawing {
  const data = distancePoints(proj)
  const minPlotHeight = Math.max(160, height - PLANE_MARGIN.top - PLANE_MARGIN.bottom)
  const fit = fitDistancePlane(data, width, { margin: PLANE_MARGIN, minPlotHeight, maxPlotHeight: 300 })
  const { box } = fit
  const P = (p: Point): Screen => ({ x: fit.x(p.x), y: fit.y(p.y) })
  const short = (v: number) => trimZeros(format(v))
  const xLabelW = box.right + 12
  return {
    height: fit.height,
    box,
    points: data.map(P),
    background: (
      <>
        {/* Rays of constant closeness through the origin. */}
        <g aria-hidden="true" className={s.stageItem} data-off={show.rays ? undefined : ''}>
          {ISO_C_DEFAULT.map((c, k) => {
            const end = isoClosenessEnd(c, fit.xMax, fit.yMax)
            const e = P(end)
            return (
              <g key={c}>
                <line className={s.iso} x1={box.left} y1={box.bottom} x2={e.x} y2={e.y} />
                <text
                  className={s.isoLabel}
                  x={end.side === 'top' ? e.x : e.x + 6}
                  y={end.side === 'top' ? e.y - 6 : e.y}
                  textAnchor={end.side === 'top' ? 'middle' : 'start'}
                  dominantBaseline={end.side === 'top' ? 'auto' : 'central'}
                >
                  {k === ISO_C_DEFAULT.length - 1 ? l.isoC(short(c)) : short(c)}
                </text>
              </g>
            )
          })}
        </g>
        {/* Axes from the origin; arrowheads point to larger distances. */}
        <path className={s.axis} data-axis="d-plus" d={`M${box.left} ${box.bottom}H${box.right + 12}`} markerEnd={`url(#${uid}-head)`} />
        <path className={s.axis} data-axis="d-minus" d={`M${box.left} ${box.bottom}V${box.top - 14}`} markerEnd={`url(#${uid}-head)`} />
        <text className={s.axisName} x={box.right + 12} y={box.bottom + 20} textAnchor="end">
          <title>{l.axisDPlus}</title>
          {truncate(l.axisDPlus, xLabelW, 12)}
        </text>
        <text className={s.axisName} x={box.left - 4} y={box.top - 32} dominantBaseline="central">
          <title>{l.axisDMinus}</title>
          {truncate(l.axisDMinus, width - box.left, 12)}
        </text>
      </>
    ),
    // The point's coordinates: D+ level to the D- axis, D- down to the D+ axis.
    distances: (sel) => ({ plus: { x: box.left, y: sel.y }, minus: { x: sel.x, y: box.bottom } }),
  }
}

/** Two criteria: weighted normalized values, A+ and A-, distance lines of the selected alternative. */
function criteriaDrawing(
  proj: TopsisProjection,
  width: number,
  l: TopsisGeometryLabels,
  uid: string,
  xName: string,
  yName: string,
  xLabel: string,
  yLabel: string,
  height: number,
  show: Show,
): Drawing {
  const minPlotHeight = Math.max(120, height - MARGIN.top - MARGIN.bottom)
  const fit = fitPlot(proj, width, { margin: MARGIN, minPlotHeight, maxPlotHeight: 300 })
  const { box } = fit
  const P = (p: Point): Screen => ({ x: fit.x(p.x), y: fit.y(p.y) })
  const ideal = P(proj.ideal)
  const anti = P(proj.antiIdeal)
  const idealLabelW = estimateTextWidth(l.ideal, 12)
  const antiLabelW = estimateTextWidth(l.antiIdeal, 12)
  const refLabelW = Math.max(idealLabelW, antiLabelW)
  const idealEnd = ideal.x + 10 + refLabelW > width
  const idealX = idealEnd ? ideal.x - 10 : ideal.x + 10
  const idealY = ideal.y - 10
  const antiEnd = anti.x + 10 + refLabelW > width
  const antiX = antiEnd ? anti.x - 10 : anti.x + 10
  const antiY = anti.y + 18
  const textBox = (x: number, y: number, w: number, end: boolean): PlotBox => {
    const left = end ? x - w : x
    return { left, right: left + w, top: y - 12 * 0.8, bottom: y + 12 * 0.25 }
  }
  const obstacles: PlotBox[] = [
    { left: ideal.x - 6, right: ideal.x + 6, top: ideal.y - 6, bottom: ideal.y + 6 },
    textBox(idealX, idealY, idealLabelW, idealEnd),
    { left: anti.x - 6, right: anti.x + 6, top: anti.y - 6, bottom: anti.y + 6 },
    textBox(antiX, antiY, antiLabelW, antiEnd),
  ]
  const labelW = box.right - box.left
  return {
    height: fit.height,
    box,
    points: proj.points.map(P),
    obstacles,
    background: (
      <>
        {/* Axes: values grow right and up; the labels say which direction is better. */}
        <path className={s.axis} d={`M${box.left - 8} ${box.bottom + 8}H${box.right + 16}`} markerEnd={`url(#${uid}-head)`} />
        <path className={s.axis} d={`M${box.left - 8} ${box.bottom + 8}V${box.top - 16}`} markerEnd={`url(#${uid}-head)`} />
        <text className={s.axisName} x={box.right + 16} y={box.bottom + 26} textAnchor="end">
          <title>{xName}</title>
          {truncate(xLabel, labelW, 12)}
        </text>
        <text className={s.axisName} x={box.left} y={box.top - 14} dominantBaseline="central">
          <title>{yName}</title>
          {truncate(yLabel, labelW, 12)}
        </text>
        {/* Where A+ and A- come from: each value is the best (worst) alternative's on that criterion. */}
        <g aria-hidden="true" className={s.stageItem} data-off={show.refGuides ? undefined : ''}>
          {[proj.ideal, proj.antiIdeal].flatMap((ref, r) =>
            referenceGuides(proj.points, ref).map((g, k) => <path key={`${r}-${k}`} className={s.refGuide} d={linePath(P(g.from), P(g.to))} />),
          )}
        </g>
        <g aria-hidden="true" className={`${s.stageItem} ${s.refMarks}`} data-off={show.refs ? undefined : ''}>
          <path className={s.refMark} d={`M${ideal.x} ${ideal.y - 6}l6 6-6 6-6-6z`} />
          <text
            className={s.refLabel}
            x={idealX}
            y={idealY}
            textAnchor={idealEnd ? 'end' : 'start'}
          >
            {l.ideal}
          </text>
          <path className={s.refMark} d={`M${anti.x} ${anti.y - 6}l6 6-6 6-6-6z`} />
          <text
            className={s.refLabel}
            x={antiX}
            y={antiY}
            textAnchor={antiEnd ? 'end' : 'start'}
          >
            {l.antiIdeal}
          </text>
        </g>
      </>
    ),
    distances: () => ({ plus: ideal, minus: anti }),
  }
}
