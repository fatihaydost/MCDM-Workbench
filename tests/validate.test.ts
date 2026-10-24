import { describe, expect, it } from 'vitest'
import { getMethod, listMethods, rankScores, validateProblem, validateRequirements, validateWeights, type Problem } from '../src/core'
import { makeProblem } from './helpers'

const codes = (xs: { code: string }[]) => xs.map((x) => x.code)

describe('validateProblem', () => {
  it('accepts a clean problem', () => {
    expect(validateProblem(makeProblem([[1, 2], [3, 4]], ['benefit', 'cost']))).toEqual([])
  })

  it('reports empty / NaN cells with their position', () => {
    const p = makeProblem([[1, NaN], [3, 4], [5, 6]], ['benefit', 'cost'])
    ;(p.matrix[2] as unknown[])[0] = null // empty cell from untyped input
    const issues = validateProblem(p)
    expect(issues).toContainEqual({ code: 'invalid-cell', severity: 'error', row: 0, col: 1 })
    expect(issues).toContainEqual({ code: 'invalid-cell', severity: 'error', row: 2, col: 0 })
  })

  it('flags a constant column as a warning', () => {
    expect(validateProblem(makeProblem([[1, 7], [2, 7], [3, 7]], ['benefit', 'cost']))).toEqual([
      { code: 'constant-column', severity: 'warning', col: 1 },
    ])
  })

  it('needs at least 2 alternatives and 2 criteria', () => {
    expect(codes(validateProblem(makeProblem([[1, 2]], ['benefit', 'cost'])))).toContain('too-few-alternatives')
    expect(codes(validateProblem(makeProblem([[1], [2]], ['benefit'])))).toContain('too-few-criteria')
  })

  it('reports row length mismatch', () => {
    const issues = validateProblem(makeProblem([[1, 2], [3], [4, 5]], ['benefit', 'cost']))
    expect(issues).toContainEqual({ code: 'row-length-mismatch', severity: 'error', row: 1, value: 1 })
  })

  it('reports alternatives/matrix count mismatch', () => {
    expect(codes(validateProblem(makeProblem([[1, 2], [3, 4]], ['benefit', 'cost'], ['only one'])))).toContain(
      'alternatives-count-mismatch',
    )
  })

  it("rejects criterion types other than 'benefit' | 'cost' (legacy read 'Max' as cost)", () => {
    const p = { ...makeProblem([[1, 2], [3, 4]], ['benefit', 'cost']) } as Problem
    p.criteria = [{ name: 'C1', type: 'Max' as never }, { name: 'C2', type: 'cost' }]
    expect(validateProblem(p)).toContainEqual({ code: 'invalid-criterion-type', severity: 'error', col: 0 })
  })
})

describe('validateWeights', () => {
  it('accepts weights summing to 1', () => expect(validateWeights([0.25, 0.75], 2)).toEqual([]))
  it('flags sum != 1', () => expect(codes(validateWeights([0.5, 0.6], 2))).toEqual(['weights-sum']))
  it('flags negative weights', () => expect(codes(validateWeights([1.2, -0.2], 2))).toEqual(['negative-weight']))
  it('flags length mismatch', () => expect(codes(validateWeights([1], 2))).toContain('weights-length-mismatch'))
  it('flags NaN weights', () => expect(codes(validateWeights([NaN, 1], 2))).toEqual(['invalid-weight']))
})

describe('validateRequirements', () => {
  it('flags non-positive values when a method requires positive data', () => {
    const p = makeProblem([[1, 0], [3, -2]], ['benefit', 'cost'])
    expect(codes(validateRequirements(p, { requires: { positiveValues: true } }))).toEqual(['non-positive-value', 'non-positive-value'])
    expect(validateRequirements(p, {})).toEqual([])
  })
})

describe('rankScores', () => {
  it('competition ranking with ties', () => {
    expect(rankScores([0.9, 0.7, 0.7, 0.1], 'desc')).toEqual([1, 2, 2, 4])
    expect(rankScores([0.5, 0.5, 0.2], 'desc')).toEqual([1, 1, 3])
    expect(rankScores([3, 1, 2, 1], 'asc')).toEqual([4, 1, 3, 1])
  })
  it('treats floating-point noise as a tie', () => {
    expect(rankScores([0.1 + 0.2, 0.3, 0.1], 'desc')).toEqual([1, 1, 3])
  })
})

describe('registry', () => {
  it('lists methods by id and kind', () => {
    expect(listMethods().map((m) => m.id)).toEqual(['critic', 'entropy', 'sd', 'merec', 'lopcow', 'cilos', 'equal', 'bwm', 'ahp', 'roc', 'swara', 'topsis', 'saw', 'vikor', 'edas', 'waspas', 'copras', 'marcos', 'cocoso', 'mabac', 'moora', 'aras', 'codas', 'promethee-ii'])
    expect(listMethods('ranking').map((m) => m.id)).toEqual(['topsis', 'saw', 'vikor', 'edas', 'waspas', 'copras', 'marcos', 'cocoso', 'mabac', 'moora', 'aras', 'codas', 'promethee-ii'])
    expect(listMethods('weighting').map((m) => m.id)).toEqual(['critic', 'entropy', 'sd', 'merec', 'lopcow', 'cilos', 'equal', 'bwm', 'ahp', 'roc', 'swara'])
    expect(getMethod('topsis')?.kind).toBe('ranking')
    expect(getMethod('swara')?.kind).toBe('weighting')
    expect(getMethod('nope')).toBeUndefined()
  })
})

describe('equal weights', () => {
  it('gives every criterion 1/n and ignores the matrix values', async () => {
    const { equal } = await import('../src/core')
    const p: Problem = {
      alternatives: ['A', 'B'],
      criteria: [
        { name: 'x', type: 'benefit' },
        { name: 'y', type: 'cost' },
        { name: 'z', type: 'benefit' },
        { name: 'w', type: 'cost' },
      ],
      matrix: [
        [1, 2, 3, 4],
        [1, 2, 3, 4],
      ],
    }
    const r = equal.compute(p, {})
    expect(r.weights).toEqual([0.25, 0.25, 0.25, 0.25])
    expect(r.steps[0]?.key).toBe('equal.weights')
  })
})
