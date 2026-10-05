import { describe, expect, it } from 'vitest'
import { movedAlternatives, rankOrder, snapWeight, stepWeight } from './order'

describe('orders', () => {
  it('rankOrder sorts by rank and keeps input order on ties', () => {
    expect(rankOrder([3, 1, 2])).toEqual([1, 2, 0])
    expect(rankOrder([1, 3, 1])).toEqual([0, 2, 1])
  })

  it('movedAlternatives lists the rows that changed place', () => {
    expect(movedAlternatives([0, 1, 2, 3], [0, 2, 1, 3])).toEqual([2, 1])
    expect(movedAlternatives([0, 1, 2], [0, 1, 2])).toEqual([])
  })
})

describe('weight steps', () => {
  it('snapWeight rounds to 0.01 inside [0, 1]', () => {
    expect(snapWeight(0.1872)).toBe(0.19)
    expect(snapWeight(-0.3)).toBe(0)
    expect(snapWeight(1.2)).toBe(1)
    expect(snapWeight(Number.NaN)).toBe(0)
  })

  it('stepWeight lands on the grid first, then moves 0.01 at a time', () => {
    expect(stepWeight(0.1872, 1)).toBe(0.19)
    expect(stepWeight(0.1872, -1)).toBe(0.18)
    expect(stepWeight(0.19, 1)).toBe(0.2)
    expect(stepWeight(0.3, -1)).toBe(0.29)
    expect(stepWeight(0.1 + 0.2, 1)).toBe(0.31)
    expect(stepWeight(0.1872, 10)).toBe(0.28)
    expect(stepWeight(0.995, 1)).toBe(1)
    expect(stepWeight(0.004, -1)).toBe(0)
    expect(stepWeight(0.42, 0)).toBe(0.42)
  })
})
