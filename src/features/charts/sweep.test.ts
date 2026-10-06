import { describe, expect, it } from 'vitest'
import { layoutRankIntervals, layoutSweep, linePath, spreadLabels } from './sweep'

describe('spreadLabels', () => {
  it('keeps labels that do not collide where they are', () => {
    expect(spreadLabels([10, 50, 90], 14, 0, 100)).toEqual([10, 50, 90])
  })

  it('pushes colliding labels apart, in input order', () => {
    const out = spreadLabels([50, 50, 52], 14, 0, 200)
    const sorted = out.slice().sort((a, b) => a - b)
    for (let k = 1; k < sorted.length; k++) expect(sorted[k]! - sorted[k - 1]!).toBeGreaterThanOrEqual(14 - 1e-9)
    expect(out[0]).toBeLessThan(out[1]!)
  })

  it('pulls a stack back inside the bottom edge', () => {
    const out = spreadLabels([98, 99, 100], 14, 0, 100)
    expect(Math.max(...out)).toBeLessThanOrEqual(100)
    expect(Math.min(...out)).toBeCloseTo(72)
  })
})

describe('layoutSweep', () => {
  const xs = [0, 0.5, 1]
  const series = [
    [0.2, 0.5, 0.8],
    [0.7, 0.5, 0.3],
  ]
  const l = layoutSweep({ width: 600, xs, series, labels: ['A', 'B'] })

  it('maps 0..1 onto the plot and draws one path per alternative', () => {
    expect(l.x(0)).toBe(l.left)
    expect(l.x(1)).toBe(l.right)
    expect(l.paths).toHaveLength(2)
    expect(l.paths[0]!.startsWith('M')).toBe(true)
    expect(l.paths[0]!.match(/L/g)).toHaveLength(2)
  })

  it('has a y domain around the data, inside 0..1, with the larger value higher', () => {
    expect(l.y.domain[0]).toBeGreaterThanOrEqual(0)
    expect(l.y.domain[1]).toBeLessThanOrEqual(1)
    expect(l.y(0.8)).toBeLessThan(l.y(0.2))
  })

  it('puts the end labels at the right, at the last values', () => {
    expect(l.ends.map((e) => e.index)).toEqual([0, 1])
    expect(l.ends[0]!.y).toBeLessThan(l.ends[1]!.y)
  })

  it('names only the labelled lines, spread inside the plot', () => {
    const many = Array.from({ length: 30 }, (_, i) => [0.5, 0.5, 0.5 + i / 1000])
    const l2 = layoutSweep({ width: 600, xs, series: many, labels: many.map((_, i) => `A${i + 1}`), labelled: [0, 29] })
    expect(l2.ends.map((e) => e.index)).toEqual([0, 29])
    for (const e of l2.ends) expect(e.y).toBeGreaterThanOrEqual(l2.top)
    expect(Math.abs(l2.ends[0]!.y - l2.ends[1]!.y)).toBeGreaterThanOrEqual(14 - 1e-9)
  })

  it('writes short path text', () => {
    expect(linePath([
      [0, 1.234],
      [2.5, 3],
    ])).toBe('M0 1.23L2.5 3')
  })
})

describe('layoutRankIntervals', () => {
  it('orders rows by mean rank and places rank 1 on the left', () => {
    const l = layoutRankIntervals({
      width: 400,
      labels: ['A', 'B', 'C'],
      mean: [2.5, 1.2, 2.3],
      interval: [
        [2, 3],
        [1, 2],
        [1, 3],
      ],
      ranks: 3,
      format: (v) => v.toFixed(2),
    })
    expect(l.rows.map((r) => r.index)).toEqual([1, 2, 0])
    expect(l.x(1)).toBeLessThan(l.x(3))
    expect(l.rows[0]!.lo).toBe(l.x(1))
    expect(l.ticks).toEqual([1, 2, 3])
  })
})

describe('layoutSweep: y axis', () => {
  it('keeps scores inside [0, 1] on a [0, 1] axis and widens it for scores outside', async () => {
    const { layoutSweep } = await import('./sweep')
    const base = { width: 600, xs: [0, 0.5, 1], labels: ['A', 'B'] }
    const inside = layoutSweep({ ...base, series: [[0.1, 0.5, 0.9], [0.2, 0.4, 0.95]] })
    expect(inside.y.domain[0]).toBeGreaterThanOrEqual(0)
    expect(inside.y.domain[1]).toBeLessThanOrEqual(1)
    const outside = layoutSweep({ ...base, series: [[0.4, 1.3, 2.1], [-0.2, 0.5, 0.9]] })
    expect(outside.y.domain[0]).toBeLessThanOrEqual(-0.2)
    expect(outside.y.domain[1]).toBeGreaterThanOrEqual(2.1)
  })
})

describe('layoutBars: a zero value', () => {
  it('is still a 2 px mark when highlighted, and the best of an ascending sort comes first', async () => {
    const { layoutBars } = await import('./layout')
    const l = layoutBars({ labels: ['A', 'B'], values: [0.4, 0], width: 400, format: String, sort: 'asc', highlight: 1 })
    expect(l.rows[0]!.index).toBe(1)
    expect(l.rows[0]!.width).toBe(2)
    expect(l.rows[0]!.x).toBe(l.zeroX)
  })
})
