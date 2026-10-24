import { describe, expect, it } from 'vitest'
import { critic, ProblemValidationError, type CriterionType } from '../src/core'
import krishnan from './fixtures/critic-krishnan2021.json'
import xlsx from './fixtures/critic-xlsx.json'
import { expectClose, makeProblem, step } from './helpers'

describe('CRITIC: Krishnan et al. 2021 (Symmetry 13:973, Tables 1, 2, 5)', () => {
  const res = critic.compute(makeProblem(krishnan.matrix, krishnan.types as CriterionType[], krishnan.alternatives), {})
  const tol = krishnan.expected.tolerance

  it('matches published sigma (Table 2)', () => {
    expectClose(step(res.steps, 'critic.sigma').vector!, krishnan.expected.sigma_sample, tol)
  })
  it('matches published weights (Table 5, column CRITIC)', () => {
    expectClose(res.weights, krishnan.expected.weights, tol)
  })
  it('reproduces the published criteria order: thickness > mass > price > screen > pixel density', () => {
    const order = res.weights.map((w, j) => [w, krishnan.criteria[j]] as const).sort((a, b) => b[0] - a[0]).map((x) => x[1])
    expect(order).toEqual(['thickness', 'mass', 'price', 'screen', 'pixel_density'])
  })
})

describe('CRITIC: legacy/CRITIC(2).xlsx hand calculation', () => {
  const res = critic.compute(makeProblem(xlsx.matrix, xlsx.types as CriterionType[], xlsx.alternatives), {})
  const e = xlsx.expected
  const tol = e.tolerance

  it('normalized matrix (B14:G20)', () => expectClose(step(res.steps, 'critic.normalized').matrix!, e.normalized, tol))
  it('sigma (B31:G31)', () => expectClose(step(res.steps, 'critic.sigma').vector!, e.sigma, tol))
  it('correlation matrix (B23:G28)', () => expectClose(step(res.steps, 'critic.correlation').matrix!, e.correlation, tol))
  it('conflict sums (B41:G41)', () => expectClose(step(res.steps, 'critic.conflict').vector!, e.conflict, tol))
  it('information C_j (B44:G44)', () => expectClose(step(res.steps, 'critic.information').vector!, e.information, tol))
  it('weights (B47:G47)', () => expectClose(res.weights, e.weights, tol))
  it('weights sum to 1', () => expect(Math.abs(res.weights.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-15))
})

describe('CRITIC: edge cases', () => {
  it('constant column gets weight 0 and a warning, others still sum to 1', () => {
    const res = critic.compute(makeProblem([[1, 5, 3], [2, 5, 1], [3, 5, 2], [4, 5, 7]], ['benefit', 'benefit', 'cost']), {})
    expect(res.weights[1]).toBe(0)
    expect(res.weights[0]).toBeGreaterThan(0)
    expect(res.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 15)
    expect(res.warnings).toContainEqual({ code: 'critic.constant-column', col: 1 })
    expect(res.diagnostics?.constantColumns).toBe(1)
    // Its correlations are undefined (shown as n/a) and its own conflict is 0, so each row adds up as displayed.
    const rho = step(res.steps, 'critic.correlation').matrix!
    expect(rho[0]![0]).toBe(1)
    expect(rho[0]![1]).toBeNaN()
    expect(rho[1]![2]).toBeNaN()
    expect(rho[1]![1]).toBeNaN()
    const conflict = step(res.steps, 'critic.conflict').vector!
    expect(conflict[1]).toBe(0)
    expect(conflict[0]).toBeCloseTo(1 - rho[0]![2]!, 15)
    expect(step(res.steps, 'critic.information').vector![1]).toBe(0)
    expect(res.weights.every(Number.isFinite)).toBe(true)
  })

  it('a constant column leaves the other weights as they are without it (Krishnan et al. 2021 plus constant columns)', () => {
    const types = krishnan.types as CriterionType[]
    const withConstants = (k: number) =>
      critic.compute(
        makeProblem(
          krishnan.matrix.map((row) => [...row, ...new Array<number>(k).fill(5)]),
          [...types, ...new Array<CriterionType>(k).fill('benefit')],
        ),
        {},
      )
    for (const k of [1, 3]) {
      const res = withConstants(k)
      expectClose(res.weights, [...krishnan.expected.weights, ...new Array<number>(k).fill(0)], krishnan.expected.tolerance)
      const n = types.length
      const alone = critic.compute(makeProblem(krishnan.matrix, types), {})
      expectClose(res.weights.slice(0, n), alone.weights, 1e-15)
      expectClose(step(res.steps, 'critic.conflict').vector!.slice(0, n), step(alone.steps, 'critic.conflict').vector!, 1e-12)
    }
  })

  it('a column constant up to rounding (0.3 and 0.1 + 0.2) is constant: weight 0, warning, no stretched noise', () => {
    const noisy = [[1, 0.3], [4, 0.1 + 0.2], [2, 0.3], [8, 0.1 + 0.2], [3, 0.3]]
    const res = critic.compute(makeProblem(noisy, ['benefit', 'benefit']), {})
    expect(res.weights).toEqual([1, 0])
    expect(res.warnings).toContainEqual({ code: 'critic.constant-column', col: 1 })
    // One varying column has no conflict to measure: it takes the whole weight, with a notice.
    expect(res.warnings?.map((w) => w.code)).toContain('critic.no-conflict-equal-weights')
  })

  it('varying columns with no conflict between them share the weight; constant ones keep 0', () => {
    const res = critic.compute(makeProblem([[1, 2, 5], [2, 4, 5], [3, 6, 5], [4, 8, 5]], ['benefit', 'benefit', 'cost']), {})
    expect(res.weights).toEqual([0.5, 0.5, 0])
    expect(res.warnings?.map((w) => w.code)).toContain('critic.no-conflict-equal-weights')
  })

  it('all columns constant falls back to equal weights with a warning', () => {
    const res = critic.compute(makeProblem([[2, 7], [2, 7], [2, 7]], ['benefit', 'cost']), {})
    expect(res.weights).toEqual([0.5, 0.5])
    expect(res.warnings?.map((w) => w.code)).toContain('critic.all-constant-equal-weights')
  })

  it('cost direction mirrors benefit: same sigma, flipped correlation sign', () => {
    const m = [[1, 10], [4, 30], [2, 20], [8, 5]]
    const b = critic.compute(makeProblem(m, ['benefit', 'benefit']), {})
    const c = critic.compute(makeProblem(m, ['cost', 'benefit']), {})
    expectClose(step(c.steps, 'critic.sigma').vector!, step(b.steps, 'critic.sigma').vector!, 1e-15)
    const rb = step(b.steps, 'critic.correlation').matrix![0]![1]!
    const rc = step(c.steps, 'critic.correlation').matrix![0]![1]!
    expect(rc).toBeCloseTo(-rb, 15)
    expect(step(c.steps, 'critic.normalized').matrix![0]![0]).toBe(1) // min value is best for cost
  })

  it('warns below 4 alternatives', () => {
    const res = critic.compute(makeProblem([[1, 2], [3, 1], [2, 5]], ['benefit', 'benefit']), {})
    expect(res.warnings?.map((w) => w.code)).toContain('critic.few-alternatives')
    const two = critic.compute(makeProblem([[1, 2], [3, 1]], ['benefit', 'benefit']), {})
    expect(two.warnings?.map((w) => w.code)).toContain('critic.two-alternatives')
  })

  it('single alternative is rejected instead of producing NaN', () => {
    expect(() => critic.compute(makeProblem([[1, 2, 3]], ['benefit', 'benefit', 'cost']), {})).toThrow(ProblemValidationError)
  })

  it('empty cell (NaN) is rejected, not read as 0', () => {
    expect(() => critic.compute(makeProblem([[1, 2], [NaN, 3], [4, 5]], ['benefit', 'cost']), {})).toThrow(ProblemValidationError)
  })

  it('zero-crossing and zero-endpoint residuals within tolerance count as constant or near-constant', () => {
    const zeroCrossConst = critic.compute(
      makeProblem(
        [
          [1, -1e-15],
          [2, 1e-15],
          [3, 0],
          [4, 0],
        ],
        ['benefit', 'benefit'],
      ),
      {},
    )
    expect(zeroCrossConst.weights).toEqual([1, 0])
    expect(zeroCrossConst.warnings).toContainEqual({ code: 'critic.constant-column', col: 1 })

    const zeroEndConst = critic.compute(
      makeProblem(
        [
          [1, 0],
          [2, 1e-100],
          [3, 0],
          [4, 0],
        ],
        ['benefit', 'benefit'],
      ),
      {},
    )
    expect(zeroEndConst.weights).toEqual([1, 0])
    expect(zeroEndConst.warnings).toContainEqual({ code: 'critic.constant-column', col: 1 })

    const zeroCrossNear = critic.compute(
      makeProblem(
        [
          [1, -1e-10],
          [2, 1e-10],
          [3, 0],
          [4, 0],
        ],
        ['benefit', 'benefit'],
      ),
      {},
    )
    expect(zeroCrossNear.warnings).toContainEqual({ code: 'critic.near-constant-column', col: 1 })
  })
})
