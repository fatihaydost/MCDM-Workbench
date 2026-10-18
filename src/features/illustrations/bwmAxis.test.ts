import { describe, expect, it } from 'vitest'
import { bwmAxis } from './BwmRulers'

describe('bwmAxis', () => {
  it('the method page axis follows the drawn values', () => {
    expect(bwmAxis([1, 8, 2])).toEqual([0.75, 8])
    expect(bwmAxis([1, 4])).toEqual([0.75, 4])
  })

  it('the workbench axis keeps its maximum across answer states', () => {
    const states = [[1, 8, 2], [1, 12 / 2, 3], [1, 8, 9, 2.4]]
    expect(states.map((d) => bwmAxis(d, true)[1])).toEqual([9, 9, 9])
    expect(bwmAxis([1, 12], true)[1]).toBe(12)
  })
})
