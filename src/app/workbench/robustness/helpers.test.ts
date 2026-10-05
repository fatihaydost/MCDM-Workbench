import { describe, expect, it } from 'vitest'
import type { PerturbationRow, StableInterval } from '../../../core/robustness'
import {
  CONCENTRATION,
  formatDelta,
  formatShare,
  heldCount,
  largestWeight,
  perturbGrid,
  switchMarks,
  labelledLines,
  topSwitchMarks,
} from './helpers'

describe('orders', () => {
  it('largestWeight picks the first of the largest', () => {
    expect(largestWeight([0.2, 0.4, 0.4])).toBe(1)
  })
})

describe('switchMarks', () => {
  const iv = (from: number, to: number, ranking: number[]): StableInterval => ({ from, to, ranking, top: [ranking.indexOf(1)] })

  it('marks the crossing of the pair that swapped, at its closeness', () => {
    const intervals = [iv(0, 0.3, [1, 2, 3]), iv(0.3, 0.7, [1, 3, 2]), iv(0.7, 1, [2, 3, 1])]
    const scores = (w: number) => (w === 0.3 ? [0.8, 0.5, 0.5] : [0.6, 0.4, 0.6])
    expect(switchMarks(intervals, scores)).toEqual([
      { x: 0.3, y: 0.5 },
      { x: 0.7, y: 0.6 },
    ])
  })

  it('draws nothing for a single interval', () => {
    expect(switchMarks([iv(0, 1, [1, 2])], () => [0.5, 0.4])).toEqual([])
  })
})

describe('topSwitchMarks and labelledLines', () => {
  const iv = (from: number, to: number, ranking: number[]): StableInterval => ({ from, to, ranking, top: ranking.flatMap((r, i) => (r === 1 ? [i] : [])) })

  it('marks only where first place changes hands, between the old and new leader', () => {
    const intervals = [iv(0, 0.3, [1, 2, 3]), iv(0.3, 0.7, [1, 3, 2]), iv(0.7, 1, [2, 3, 1])]
    expect(topSwitchMarks(intervals.filter((_, k) => k !== 1), () => [0.6, 0.1, 0.6])).toEqual([{ x: 0.3, y: 0.6 }])
    expect(topSwitchMarks(intervals, (w) => (w === 0.7 ? [0.5, 0.2, 0.5] : [0.9, 0.9, 0.9]))).toEqual([{ x: 0.7, y: 0.5 }])
  })

  it('labels the leaders and the first k of the base ranking', () => {
    expect(labelledLines([3, 1, 2, 4, 5], [4], 2)).toEqual([1, 2, 4])
  })
})

describe('perturbation grid', () => {
  const row = (k: number, delta: number, sameTop: boolean): PerturbationRow => ({ k, delta, weights: [], ranking: [], sameTop, spearman: 1, ws: 1 })

  it('places rows by criterion and delta', () => {
    const rows = [row(0, -0.2, true), row(1, 0.1, false), row(1, -0.2, true)]
    const grid = perturbGrid(rows, 2, [-0.2, 0.1])
    expect(grid[0]![0]).toBe(rows[0])
    expect(grid[0]![1]).toBeUndefined()
    expect(grid[1]![1]).toBe(rows[1])
    expect(heldCount(rows, [0.5, 0.5])).toEqual({ held: 2, total: 3 })
    // A criterion with weight 0 is not perturbed at all: left out of the count.
    expect(heldCount(rows, [0, 1])).toEqual({ held: 1, total: 2 })
  })
})

describe('share texts', () => {
  it('formats shares as percentages in both languages', () => {
    expect(formatShare(0.62, 'en')).toBe('62%')
    expect(formatShare(0.62, 'tr')).toBe('%62')
    expect(formatShare(0.8734, 'en', 1)).toBe('87.3%')
    expect(formatShare(0.8734, 'tr', 1)).toBe('%87,3')
    expect(formatShare(0, 'en')).toBe('0%')
    expect(formatShare(0.003, 'en')).toBe('<1%')
    expect(formatShare(0.003, 'tr')).toBe('<%1')
  })

  it('formats signed changes', () => {
    expect(formatDelta(0.1, 'en')).toBe('+10%')
    expect(formatDelta(-0.2, 'en')).toBe('-20%')
    expect(formatDelta(-0.05, 'tr')).toBe('-%5')
  })

  it('names the κ presets of combinations.md §C.2', () => {
    expect(CONCENTRATION).toEqual({ uniform: 'uniform', loose: 20, medium: 100, tight: 500 })
  })
})
