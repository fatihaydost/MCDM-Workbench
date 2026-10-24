import { describe, expect, it } from 'vitest'
import { critic } from '../../core/methods/critic'
import { topsis } from '../../core/methods/topsis'
import type { Problem } from '../../core/types'
import { topsis as topsisSteps } from '../../content/steps/topsis'
import { getExample } from '../../data/examples'
import {
  argMax,
  arasParts,
  coprasParts,
  marcosParts,
  divergingSegments,
  edasParts,
  isoQRegion,
  isoQSegment,
  vikorParts,
  closenessAt,
  criticParts,
  defaultAxes,
  sdParts,
  merecParts,
  entropyParts,
  distancePoints,
  fitDistancePlane,
  placeLabels,
  type PlotBox,
  fitPlot,
  isoClosenessEnd,
  flowIndex,
  planarDistance,
  linePath,
  referenceGuides,
  pointCss,
  topsisProjection,
  lineCrossings,
} from './geometry'

const problemOf = (id: string): Problem => {
  const x = getExample(id)
  if (!x) throw new Error(id)
  return { alternatives: [...x.alternatives], criteria: x.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: x.matrix.map((r) => [...r]) }
}

const vec = (steps: { key: string; vector?: number[] }[], key: string) => steps.find((s) => s.key === key)!.vector!

describe('defaultAxes', () => {
  it('takes the two largest weights in criterion order', () => {
    expect(defaultAxes([0.1, 0.4, 0.2, 0.3])).toEqual([1, 3])
    expect(defaultAxes([0.5, 0.5])).toEqual([0, 1])
  })
  it('breaks ties by the lower index', () => {
    expect(defaultAxes([0.25, 0.25, 0.25, 0.25])).toEqual([0, 1])
  })
})

describe('topsisProjection', () => {
  it('reproduces the core ideal, anti-ideal and closeness on a two-criterion problem (Opricovic and Tzeng 2004, f)', () => {
    const p = problemOf('opricovic-tzeng-2004-f')
    const w = [0.5, 0.5]
    const proj = topsisProjection(p, w)!
    const core = topsis.compute(p, w, {})
    expect(proj.exact).toBe(true)
    expect(proj.axes).toEqual([0, 1])
    const best = vec(core.steps, 'topsis.idealBest')
    const worst = vec(core.steps, 'topsis.idealWorst')
    expect(proj.ideal).toEqual({ x: best[0], y: best[1] })
    expect(proj.antiIdeal).toEqual({ x: worst[0], y: worst[1] })
    expect(proj.closeness).toEqual(core.scores)

    // With two criteria the plane is the whole space: the drawn distances are the core's.
    proj.points.forEach((pt, i) => {
      const dp = planarDistance(pt, proj.ideal)
      const dm = planarDistance(pt, proj.antiIdeal)
      expect(dp).toBeCloseTo(proj.dPlus[i]!, 12)
      expect(dm).toBeCloseTo(proj.dMinus[i]!, 12)
      expect(dm / (dp + dm)).toBeCloseTo(core.scores[i]!, 12)
    })
    // Published: C = 0.762, 0.722, 0.238.
    expect(proj.closeness.map((c) => Number(c.toFixed(3)))).toEqual([0.762, 0.722, 0.238])
  })

  it('projects the core ideal onto the two heaviest criteria when there are more', () => {
    const p = problemOf('krishnan-2021-smartphones')
    const w = critic.compute(p, {}).weights
    const proj = topsisProjection(p, w)!
    const core = topsis.compute(p, w, {})
    expect(proj.exact).toBe(false)
    expect(proj.axes).toEqual(defaultAxes(w))
    const [a, b] = proj.axes
    expect(proj.ideal.x).toBe(vec(core.steps, 'topsis.idealBest')[a])
    expect(proj.ideal.y).toBe(vec(core.steps, 'topsis.idealBest')[b])
    expect(proj.antiIdeal.x).toBe(vec(core.steps, 'topsis.idealWorst')[a])
    expect(proj.closeness).toEqual(core.scores)
    expect(proj.dPlus).toEqual(vec(core.steps, 'topsis.distanceBest'))
  })

  it('returns null when TOPSIS cannot run', () => {
    const p = problemOf('opricovic-tzeng-2004-f')
    expect(topsisProjection(p, [0.5])).toBeNull()
    expect(topsisProjection({ ...p, criteria: [p.criteria[0]!], matrix: p.matrix.map((r) => [r[0]!]) }, [1])).toBeNull()
  })
})

describe('fitPlot', () => {
  const margin = { left: 10, right: 10, top: 10, bottom: 10 }
  for (const id of ['opricovic-tzeng-2004-f', 'opricovic-tzeng-2004-phi']) {
    it(`draws values growing right and up, also on a cost axis, with one scale on both axes (${id})`, () => {
      const proj = topsisProjection(problemOf(id), [0.5, 0.5])!
      const { x, y, box } = fitPlot(proj, 400, { margin, minPlotHeight: 60, maxPlotHeight: 200 })
      // Risk is a cost criterion: its ideal is the smallest value, so A+ is drawn left of A- (no reversed axis).
      expect(proj.ideal.x).toBeLessThan(proj.antiIdeal.x)
      expect(x(proj.ideal.x)).toBeLessThan(x(proj.antiIdeal.x))
      expect(x(1)).toBeGreaterThan(x(0))
      expect(y(1)).toBeLessThan(y(0))
      // Altitude is a benefit criterion: A+ is above A-.
      expect(y(proj.ideal.y)).toBeLessThan(y(proj.antiIdeal.y))
      for (const pt of [...proj.points, proj.ideal, proj.antiIdeal]) {
        expect(x(pt.x)).toBeGreaterThanOrEqual(box.left)
        expect(x(pt.x)).toBeLessThanOrEqual(box.right)
        expect(y(pt.y)).toBeGreaterThanOrEqual(box.top)
        expect(y(pt.y)).toBeLessThanOrEqual(box.bottom)
      }
      // Same pixels per unit on both axes: screen distance = planar distance times k.
      const k = Math.abs(x(1) - x(0))
      expect(Math.abs(y(1) - y(0))).toBeCloseTo(k, 9)
      const a = proj.points[0]!
      expect(Math.hypot(x(a.x) - x(proj.ideal.x), y(a.y) - y(proj.ideal.y))).toBeCloseTo(planarDistance(a, proj.ideal) * k, 9)
    })
  }
})

describe('distance plane', () => {
  const margin = { left: 10, right: 10, top: 10, bottom: 10 }
  for (const [id, weightsOf] of [
    ['opricovic-tzeng-2004-f', () => [0.5, 0.5]],
    ['krishnan-2021-smartphones', (p: Problem) => critic.compute(p, {}).weights],
  ] as const) {
    it(`places every alternative at the core's (D+, D-), and C = y / (x + y) equals the core (${id})`, () => {
      const p = problemOf(id)
      const w = weightsOf(p)
      const proj = topsisProjection(p, w)!
      const core = topsis.compute(p, [...w], {})
      const pts = distancePoints(proj)
      expect(pts.map((q) => q.x)).toEqual(vec(core.steps, 'topsis.distanceBest'))
      expect(pts.map((q) => q.y)).toEqual(vec(core.steps, 'topsis.distanceWorst'))
      pts.forEach((q, i) => expect(closenessAt(q)).toBeCloseTo(core.scores[i]!, 12))
      // The ranking read from the picture (larger C = further up-left of the rays) is the core's.
      const byPicture = pts.map((q, i) => ({ i, c: closenessAt(q) })).sort((a, b) => b.c - a.c).map((r) => r.i)
      const byCore = core.scores.map((c, i) => ({ i, c })).sort((a, b) => b.c - a.c).map((r) => r.i)
      expect(byPicture).toEqual(byCore)

      const fit = fitDistancePlane(pts, 400, { margin, minPlotHeight: 60, maxPlotHeight: 200 })
      // Origin at the bottom left, one scale on both axes, every point inside the box.
      expect(fit.x(0)).toBe(fit.box.left)
      expect(fit.y(0)).toBe(fit.box.bottom)
      expect(Math.abs(fit.y(1) - fit.y(0))).toBeCloseTo(Math.abs(fit.x(1) - fit.x(0)), 9)
      for (const q of pts) {
        expect(q.x).toBeLessThanOrEqual(fit.xMax)
        expect(q.y).toBeLessThanOrEqual(fit.yMax)
      }
    })
  }

  it('ends each ray of constant C on the box edge, with closeness C along it', () => {
    for (const c of [0.25, 0.5, 0.75]) {
      const e = isoClosenessEnd(c, 2, 1)
      expect(closenessAt(e)).toBeCloseTo(c, 12)
      expect(Math.max(e.x / 2, e.y / 1)).toBeCloseTo(1, 12)
    }
    expect(isoClosenessEnd(0.5, 2, 1)).toMatchObject({ x: 1, y: 1, side: 'top' })
    expect(isoClosenessEnd(0.25, 4, 2)).toMatchObject({ side: 'right' })
  })
})

describe('referenceGuides', () => {
  it('draws where A+ and A- take each coordinate from (Opricovic and Tzeng 2004, problem f)', () => {
    const proj = topsisProjection(problemOf('opricovic-tzeng-2004-f'), [0.5, 0.5])!
    for (const ref of [proj.ideal, proj.antiIdeal]) {
      const guides = referenceGuides(proj.points, ref)
      for (const g of guides) {
        expect(g.to).toEqual(ref)
        // Each guide runs along one axis from an alternative that holds that value.
        expect(g.from.x === ref.x || g.from.y === ref.y).toBe(true)
        expect(proj.points).toContainEqual(g.from)
      }
      // A reference point is not an alternative here, so both of its values come from somewhere.
      expect(guides).toHaveLength(2)
    }
  })
  it('leaves out an axis where the alternative is the corner itself, and picks the nearest holder', () => {
    const pts = [
      { x: 1, y: 5 },
      { x: 1, y: 2 },
      { x: 3, y: 1 },
    ]
    expect(referenceGuides(pts, { x: 1, y: 1 })).toEqual([
      { from: { x: 1, y: 2 }, to: { x: 1, y: 1 } },
      { from: { x: 3, y: 1 }, to: { x: 1, y: 1 } },
    ])
    expect(referenceGuides([{ x: 2, y: 2 }], { x: 2, y: 2 })).toEqual([])
  })
})

describe('linePath and pointCss', () => {
  it('draws a straight line as path data (also the CSS d value the lines transition on)', () => {
    expect(linePath({ x: 10, y: 20 }, { x: 10, y: 50.5 })).toBe('M10 20L10 50.5')
    // Always one M and one L, so any two lines interpolate (CSS d only transitions between matching commands).
    expect(linePath({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe('M3 3L3 3')
  })
  it('moves a point by translate', () => {
    expect(pointCss({ x: 12.5, y: -3 })).toBe('translate(12.5px, -3px)')
  })
})

describe('criticParts', () => {
  it('reads sigma, conflict and weights from the core (Krishnan et al. 2021)', () => {
    const p = problemOf('krishnan-2021-smartphones')
    const parts = criticParts(p)!
    const core = critic.compute(p, {})
    expect(parts.weights).toEqual(core.weights)
    expect(parts.sigma).toEqual(vec(core.steps, 'critic.sigma'))
    expect(parts.conflict).toEqual(vec(core.steps, 'critic.conflict'))
    parts.information.forEach((c, j) => expect(c).toBeCloseTo(parts.sigma[j]! * parts.conflict[j]!, 12))
    expect(parts.sigma.map((s) => Number(s.toFixed(4)))).toEqual([0.4062, 0.4147, 0.4394, 0.4161, 0.4063])
    expect(parts.weights.map((s) => Number(s.toFixed(4)))).toEqual([0.1872, 0.1838, 0.1691, 0.2599, 0.2])
    expect(argMax(parts.weights)).toBe(3)
  })
})

describe('flowIndex', () => {
  it('finds the node of a core step key', () => {
    expect(flowIndex(topsisSteps.flow, 'topsis.idealWorst')).toBe(2)
    expect(flowIndex(topsisSteps.flow, 'topsis.closeness')).toBe(4)
    expect(flowIndex(topsisSteps.flow, 'nope')).toBe(-1)
    expect(flowIndex(topsisSteps.flow, undefined)).toBe(-1)
  })
})

describe('placeLabels', () => {
  const W = 12 // "C" and "A" at 12 px, roughly
  const overlaps = (a: { box: PlotBox }, b: { box: PlotBox }) =>
    a.box.left < b.box.right && b.box.left < a.box.right && a.box.top < b.box.bottom && b.box.top < a.box.bottom

  it('keeps the usual spot (below right) when nothing is in the way', () => {
    const [a] = placeLabels([{ x: 50, y: 50 }], [W], { width: 200, height: 200 })
    expect(a).toMatchObject({ x: 59, y: 64, anchor: 'start' })
  })

  it('moves a label off a neighbour that sits almost on the same spot (Krishnan: C and A)', () => {
    // About 12 px apart, as C and A in the workbench's Krishnan example at 1440 px.
    const pts = [
      { x: 100, y: 107 },
      { x: 110, y: 100 },
    ]
    const [a, c] = placeLabels(pts, [W, W], { width: 300, height: 300 })
    expect(overlaps(a!, c!)).toBe(false)
    // Neither label covers the other dot.
    const dotBox = (p: { x: number; y: number }) => ({ box: { left: p.x - 6, right: p.x + 6, top: p.y - 6, bottom: p.y + 6 } })
    expect(overlaps(a!, dotBox(pts[1]!))).toBe(false)
    expect(overlaps(c!, dotBox(pts[0]!))).toBe(false)
    // Each label is clearly nearer to its own dot than to the other one.
    const centre = (l: { box: PlotBox }) => ({ x: (l.box.left + l.box.right) / 2, y: (l.box.top + l.box.bottom) / 2 })
    const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
    expect(d(centre(a!), pts[0]!)).toBeLessThanOrEqual(0.7 * d(centre(a!), pts[1]!))
    expect(d(centre(c!), pts[1]!)).toBeLessThanOrEqual(0.7 * d(centre(c!), pts[0]!))
  })

  it('keeps clear of an obstacle such as an axis title', () => {
    const title = { left: 40, right: 160, top: 40, bottom: 54 }
    const [a] = placeLabels([{ x: 45, y: 40 }], [W], { width: 200, height: 200 }, [0], { obstacles: [title] })
    expect(overlaps(a!, { box: title })).toBe(false)
  })

  it('stays inside the drawing at the right edge', () => {
    const [a] = placeLabels([{ x: 195, y: 50 }], [40], { width: 200, height: 200 })
    expect(a!.anchor).toBe('end')
    expect(a!.box.right).toBeLessThanOrEqual(200)
  })
})

describe('entropyParts', () => {
  const ex = getExample('zavadskas-2017-vilnius')!
  const problem: Problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }

  it('compares the most even and the most uneven criterion, with the core weights', () => {
    const parts = entropyParts(problem)!
    // Housing price is the most even column (e = 0.986), jobs per 1000 residents the most uneven (e = 0.862).
    expect(parts.pair).toEqual([0, 4])
    expect(parts.weights.map((w) => Number(w.toFixed(4)))).toEqual(ex.published[0]!.values)
    for (let j = 0; j < 5; j++) expect(parts.shares.reduce((a, row) => a + row[j]!, 0)).toBeCloseTo(1, 12)
  })

  it('draws the min-max shares when asked, and nothing when Entropy cannot run', () => {
    const minmax = entropyParts(problem, { normalization: 'minmax' })!
    expect(minmax.result.steps[0]!.key).toBe('entropy.normalized')
    expect(minmax.shares.some((row) => row.some((p) => p === 0))).toBe(true)
    expect(entropyParts({ ...problem, matrix: problem.matrix.map((r, i) => (i === 0 ? [-1, ...r.slice(1)] : r)) })).toBeNull()
  })
})

describe('sdParts', () => {
  const ex = getExample('diakoulaki-1995-pharma')!
  const problem: Problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }

  it('carries the core steps', () => {
    const parts = sdParts(problem)!
    expect(parts.weights).toEqual(parts.result.weights)
    expect(parts.normalized).toHaveLength(8)
  })
  it('is null when SD cannot run', () => {
    expect(sdParts({ ...problem, matrix: [[1, 2, 3]] })).toBeNull()
  })
})

describe('merecParts', () => {
  const ex = getExample('keshavarz-2021-merec')!
  const problem: Problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }

  it('stacks per-alternative drops that add up to E', () => {
    const parts = merecParts(problem)!
    expect(parts.weights).toEqual(parts.result.weights)
    parts.drops.forEach((d, j) => expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(parts.effect[j]!, 12))
  })
  it('is null when MEREC cannot run (a zero cell)', () => {
    expect(merecParts({ ...problem, matrix: problem.matrix.map((r, i) => (i === 0 ? [0, ...r.slice(1)] : r)) })).toBeNull()
  })
})

describe('VIKOR picture data', () => {
  const ex = getExample('keshavarz-2015-ten-alternatives')!
  const problem: Problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }

  it('places every alternative at its two Q terms, so v x + (1 - v) y is the core Q', () => {
    for (const v of [0, 0.3, 0.5, 1]) {
      const p = vikorParts(problem, ex.weights!, { v })!
      p.Q.forEach((q, i) => expect(v * p.sTerm[i]! + (1 - v) * p.rTerm[i]!).toBeCloseTo(q, 14))
      expect(Math.min(...p.sTerm)).toBe(0)
      expect(Math.max(...p.rTerm)).toBe(1)
    }
  })
  it('returns the compromise of the core: A7, A1, A8 within DQ = 1/9 at v = 0.5', () => {
    const p = vikorParts(problem, ex.weights!)!
    expect(p.compromise.set.map((i) => ex.alternatives[i])).toEqual(['A7', 'A1', 'A8'])
    expect(p.order[0]).toBe(6)
  })
  it('puts a flat S at x = 0 when S differs only by rounding (non-dyadic weights), as the core does', () => {
    const flat: Problem = {
      alternatives: ['A', 'B', 'C'],
      criteria: ['C1', 'C2', 'C3', 'C4'].map((name) => ({ name, type: 'benefit' as const })),
      matrix: [[0, 0, 1, 5], [1, 1, 0, 5], [0.5, 0.5, 0.5, 5]],
    }
    const p = vikorParts(flat, [0.1, 0.2, 0.3, 0.4])!
    expect(p.sTerm).toEqual([0, 0, 0])
    p.Q.forEach((q, i) => expect(0.5 * p.sTerm[i]! + 0.5 * p.rTerm[i]!).toBeCloseTo(q, 14))
    expect(p.order).toEqual([2, 0, 1])
  })
  it('returns null when VIKOR cannot run', () => {
    expect(vikorParts({ ...problem, matrix: problem.matrix.slice(0, 1), alternatives: ['A1'] }, ex.weights!)).toBeNull()
  })
  it('draws the line of constant Q inside the unit square, for every v', () => {
    for (const v of [0, 0.25, 0.5, 0.9, 1]) {
      for (const q of [0, 0.2, 0.5, 0.99]) {
        const seg = isoQSegment(v, q)!
        for (const pt of seg) {
          expect(v * pt.x + (1 - v) * pt.y).toBeCloseTo(q, 12)
          expect(pt.x).toBeGreaterThanOrEqual(0)
          expect(pt.y).toBeLessThanOrEqual(1)
        }
      }
    }
    // v = 1: vertical at x = q; v = 0: horizontal at y = q.
    expect(isoQSegment(1, 0.3)).toEqual([{ x: 0.3, y: 1 }, { x: 0.3, y: 0 }])
    expect(isoQSegment(0, 0.3)).toEqual([{ x: 0, y: 0.3 }, { x: 1, y: 0.3 }])
    expect(isoQSegment(0.5, 1.5)).toBeNull()
  })
  it('tints exactly the part of the square below the line', () => {
    const area = (pts: { x: number; y: number }[]) => Math.abs(pts.reduce((a, p, k) => a + p.x * pts[(k + 1) % pts.length]!.y - pts[(k + 1) % pts.length]!.x * p.y, 0)) / 2
    expect(area(isoQRegion(0.5, 0.5))).toBeCloseTo(0.5, 12)
    expect(area(isoQRegion(0.5, 0.25))).toBeCloseTo(0.0625 * 2, 12)
    expect(area(isoQRegion(1, 0.3))).toBeCloseTo(0.3, 12)
    expect(area(isoQRegion(0.5, 2))).toBeCloseTo(1, 12)
  })
})

describe('EDAS parts', () => {
  const ex = getExample('keshavarz-2015-ten-alternatives')!
  const p: Problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  it('reads the weighted distances, SP, SN and AS from the core, rows in rank order (Table 7, set 1)', () => {
    const parts = edasParts(p, ex.weights!)!
    expect(parts.order.map((i) => ex.alternatives[i])).toEqual(['A1', 'A7', 'A8', 'A2', 'A9', 'A3', 'A5', 'A6', 'A10', 'A4'])
    parts.above.forEach((row, i) => expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(parts.sp[i]!, 12))
    parts.below.forEach((row, i) => expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(parts.sn[i]!, 12))
    // A cell is above or below the average, never both.
    parts.above.forEach((row, i) => row.forEach((a, j) => expect(a > 0 && parts.below[i]![j]! > 0).toBe(false)))
  })
  it('is null when EDAS cannot run', () => {
    expect(edasParts({ ...p, matrix: p.matrix.map((r) => [r[0]! - 30, ...r.slice(1)]) }, ex.weights!)).toBeNull()
  })
  it('stacks distances above the line to the right and below it to the left, outward in criterion order', () => {
    const segs = divergingSegments([0.2, 0, 0, 0.1], [0, 0.3, 0, 0], 100, 10)
    expect(segs).toEqual([
      { col: 0, side: 'above', value: 0.2, x: 100, width: 2 },
      { col: 1, side: 'below', value: 0.3, x: 97, width: 3 },
      { col: 2, side: 'at', value: 0, x: 100, width: 0 },
      { col: 3, side: 'above', value: 0.1, x: 102, width: 1 },
    ])
  })
})

describe('COPRAS parts', () => {
  const ex = getExample('ozcan-celik-2021-separators')!
  const p: Problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const w = [0.1186, 0.3442, 0.0323, 0.086, 0.0368, 0.2148, 0.1672].map((x) => x / 0.9999)
  it('splits each Q into S+ and the cost bonus, rows in rank order', () => {
    const parts = coprasParts(p, w)!
    expect(parts.order.map((i) => ex.alternatives[i])).toEqual(['A4', 'A7', 'A6', 'A5', 'A2', 'A3', 'A1'])
    parts.scores.forEach((q, i) => expect(parts.sPlus[i]! + parts.bonus[i]!).toBeCloseTo(q, 15))
    expect(parts.bonus.reduce((a, b) => a + b, 0)).toBeCloseTo(w.slice(3).reduce((a, b) => a + b, 0), 12)
    expect(parts.utility[parts.order[0]!]).toBe(100)
  })
  it('is null when COPRAS cannot run', () => {
    expect(coprasParts({ ...p, matrix: p.matrix.map((r, i) => (i === 0 ? [0, ...r.slice(1)] : r)) }, w)).toBeNull()
  })
})

describe('MARCOS parts', () => {
  const ex = getExample('stevic-brkovic-2020-drivers')!
  const p: Problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  it('puts every alternative on f(K) = c x SAW (Linear), the ideal total at 1, rows in rank order', () => {
    const parts = marcosParts(p, ex.weights!)!
    parts.scores.forEach((f, i) => expect(f).toBeCloseTo(parts.c * parts.saw[i]!, 14))
    parts.s.forEach((x, i) => expect(x).toBeCloseTo(parts.saw[i]!, 15))
    expect(parts.sAi).toBeCloseTo(1, 12)
    expect(parts.sAai).toBeCloseTo(0.469642, 6)
    expect(ex.alternatives[parts.order[0]!]).toBe('A8')
  })
  it('is null when MARCOS cannot run', () => {
    expect(marcosParts({ ...p, matrix: p.matrix.map((r, i) => (i === 0 ? [0, ...r.slice(1)] : r)) }, ex.weights!)).toBeNull()
  })
})

describe('ARAS parts', () => {
  const ex = getExample('bakir-atalik-2018-airlines')!
  const p: Problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  it('places every alternative at K = S / S₀ under the optimal row, rows in rank order', () => {
    const parts = arasParts(p, ex.weights!)!
    parts.scores.forEach((k, i) => expect(k).toBeCloseTo(parts.optimality[i]! / parts.optimalScore, 14))
    expect(parts.optimalScore).toBeCloseTo(0.099651, 6)
    expect(ex.alternatives[parts.order[0]!]).toBe('ANA')
  })
  it('is null when ARAS cannot run', () => {
    expect(arasParts({ ...p, matrix: p.matrix.map((r, i) => (i === 0 ? [0, ...r.slice(1)] : r)) }, ex.weights!)).toBeNull()
  })
})

describe('lineCrossings', () => {
  const xs = [0, 0.1, 0.2, 0.3]
  it('a sign change inside a cell is one crossing, linear in the cell', () => {
    const c = lineCrossings(xs, [0, 1, 2, 3], [1, 1.5, 1, 0])
    expect(c).toHaveLength(1)
    expect(c[0]!.x).toBeCloseTo(0.1 + 0.1 * (0.5 / 1.5), 12)
  })
  it('an exact 0 at an interior grid point is one crossing there', () => {
    expect(lineCrossings(xs, [0, 1, 2, 3], [2, 1.5, 2, 2.5])).toEqual([{ x: 0.2, y: 2 }])
    expect(lineCrossings(xs, [0, 1, 2, 3], [2, 1, 0, -1])).toEqual([{ x: 0.1, y: 1 }])
    // A touch: 0 at a grid point with the same sign on both sides.
    expect(lineCrossings(xs, [0, 1, 2, 3], [2, 1, 3, 4])).toEqual([])
    // Two zeros in a row between a − and a +: one crossing, at the first.
    expect(lineCrossings(xs, [0, 1, 2, 3], [2, 1, 2, 1])).toEqual([{ x: 0.1, y: 1 }])
  })
  it('a 0 at an end is not a crossing', () => {
    expect(lineCrossings(xs, [1, 2, 3, 4], [1, 1, 1, 1])).toEqual([])
    expect(lineCrossings(xs, [1, 2, 3, 0], [0, 0, 0, 0])).toEqual([])
  })
})
