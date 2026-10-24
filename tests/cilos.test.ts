import { describe, expect, it } from 'vitest'
import { cilos, ProblemValidationError, type CriterionType, type Step } from '../src/core'
import fixture from './fixtures/cilos-zavadskas2017.json'
import { expectClose, makeProblem, step } from './helpers'

const types = fixture.types as CriterionType[]
const econTypes = fixture.economic.types as CriterionType[]
const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const run = (matrix: number[][], cTypes: CriterionType[]) => cilos.compute(makeProblem(matrix, cTypes), {})

function assertAllFinite(steps: Step[], weights: number[]) {
  expect(weights.every((w) => Number.isFinite(w))).toBe(true)
  for (const s of steps) {
    if (s.scalar !== undefined) expect(Number.isFinite(s.scalar), s.key).toBe(true)
    if (s.vector) expect(s.vector.every((v) => Number.isFinite(v)), s.key).toBe(true)
    if (s.matrix) expect(s.matrix.every((row) => row.every((v) => Number.isFinite(v))), s.key).toBe(true)
  }
}

describe('CILOS: Zavadskas et al. 2017 Social block (Table 4 & Table 10, 21 elderates x 5 criteria)', () => {
  const res = run(fixture.matrix, types)
  const tol = fixture.expected.tolerance

  it('matches the published Table 10 weights to 1e-4 once the row 1-2 label swap is restored', () => {
    expectClose(res.weights, fixture.expected.weights, tol)
    const unswapped = fixture.published_as_printed.perm.map((idx) => fixture.published_as_printed.weights[idx]!)
    expect(unswapped).toEqual(fixture.expected.weights)
    expectClose(res.weights, unswapped, 5e-5)
  })

  it('matches the recomputed square matrix A, relative loss matrix P, system matrix F, and weights', () => {
    expectClose(step(res.steps, 'cilos.squareMatrix').matrix!, fixture.expected.squareMatrix, 1e-5)
    expectClose(step(res.steps, 'cilos.lossMatrix').matrix!, fixture.expected.lossMatrix, 1e-5)
    expectClose(step(res.steps, 'cilos.systemMatrix').matrix!, fixture.expected.systemMatrix, 1e-5)
    expectClose(res.weights, fixture.expected.weights_recomputed, 1e-6)
  })

  it('satisfies column-sum normalization, winner selection, zero-column-sum F, and F w = 0', () => {
    const Xbar = step(res.steps, 'cilos.normalized').matrix!
    const A = step(res.steps, 'cilos.squareMatrix').matrix!
    const P = step(res.steps, 'cilos.lossMatrix').matrix!
    const F = step(res.steps, 'cilos.systemMatrix').matrix!

    for (let j = 0; j < 5; j++) {
      expect(Xbar.reduce((acc, row) => acc + row[j]!, 0)).toBeCloseTo(1, 14)
      expect(P[j]![j]).toBe(0)
      expect(F.reduce((acc, row) => acc + row[j]!, 0)).toBeCloseTo(0, 14)
    }
    fixture.expected.winners.forEach((winIdx, i) => {
      expectClose(A[i]!, Xbar[winIdx]!, 1e-15)
    })
    for (let i = 0; i < 5; i++) {
      const rowDot = F[i]!.reduce((acc, fij, j) => acc + fij * res.weights[j]!, 0)
      expect(Math.abs(rowDot)).toBeLessThan(1e-12)
    }
  })

  it('emits shared-optimum warning because Senamiestis (row 13) wins both x6 and x9', () => {
    expect(res.warnings).toContainEqual({ code: 'cilos.shared-optimum' })
    expect(res.diagnostics?.sharedOptimum).toBe(1)
  })

  it('emits normalized, squareMatrix, lossMatrix, systemMatrix, totalLoss, and weights steps in order', () => {
    expect(res.steps.map((s) => s.key)).toEqual([
      'cilos.normalized',
      'cilos.squareMatrix',
      'cilos.lossMatrix',
      'cilos.systemMatrix',
      'cilos.totalLoss',
      'cilos.weights',
    ])
  })
})

describe('CILOS: Zavadskas et al. 2017 Economic block (Table 4 & Table 8, 21 elderates x 5 criteria)', () => {
  const res = run(fixture.economic.matrix, econTypes)

  it('matches the published Table 8 weights to 1e-4 once the row label permutation [2, 4, 0, 1, 3] is restored', () => {
    const asPrinted = fixture.economic.published_as_printed.perm.map((idx) => fixture.economic.expected.weights[idx]!)
    expect(asPrinted).toEqual(fixture.economic.published_as_printed.weights)
    expectClose(res.weights, fixture.economic.expected.weights, fixture.economic.expected.tolerance)
    expectClose(res.weights, fixture.economic.expected.weights_recomputed, 1e-6)
  })

  it('satisfies F w = 0 to 1e-12 and flags shared optimum (Paneriai wins x2 and x4)', () => {
    const F = step(res.steps, 'cilos.systemMatrix').matrix!
    for (let i = 0; i < 5; i++) {
      const rowDot = F[i]!.reduce((acc, fij, j) => acc + fij * res.weights[j]!, 0)
      expect(Math.abs(rowDot)).toBeLessThan(1e-12)
    }
    expect(res.warnings).toContainEqual({ code: 'cilos.shared-optimum' })
  })
})

describe('CILOS: Pala 2021 (Tables 3 & 7-10, 2019 BIST transportation firms, 8 criteria)', () => {
  it('reproduces Table 10 diagonal entries of F and stationary weights q to 3 decimals from the Table 3 winning firms', () => {
    // Pala (2021) Table 3 (2019): the 3 firms that win at least one criterion are BEYAZ (wins K4, K6), RYSAS (wins K5),
    // and TLMAN (wins K1, K2, K3, K7, K8), all strictly positive on all 8 criteria. Because the column sum cancels in
    // p_ij = 1 - a_ij / a_jj = 1 - x_tilde[k_i, j] / x_tilde[k_j, j], running CILOS on the winning firms reproduces
    // the exact 8x8 P, F, and q of Tables 9-10.
    const pala2019Winners = [
      [1.677, 0.282, 0.587, 0.049, 6.445, 2.661, 0.019, 0.12], // BEYAZ
      [0.319, 0.197, 0.956, 7.194, 10.447, 0.464, 0.01, 0.101], // RYSAS
      [2.735, 2.307, 0.334, 0.31, 0.651, 0.434, 0.866, 0.564], // TLMAN
    ]
    const palaTypes: CriterionType[] = ['benefit', 'benefit', 'cost', 'cost', 'benefit', 'benefit', 'benefit', 'benefit']
    const res = run(pala2019Winners, palaTypes)
    const F = step(res.steps, 'cilos.systemMatrix').matrix!
    const diagF = F.map((row, j) => row[j]!)
    expectClose(diagF, [-1.657, -2.67, -1.513, -5.203, -5.455, -5.01, -2.945, -2.395], 5e-4)
    expectClose(res.weights, [0.171, 0.106, 0.187, 0.092, 0.134, 0.095, 0.096, 0.118], 5e-4)
  })
})

describe('CILOS: mathematical properties and edge cases', () => {
  const base = run(fixture.matrix, types)

  it('weights lie in [0, 1] and sum to 1', () => {
    for (const w of base.weights) {
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
    }
    expect(Math.abs(sumOf(base.weights) - 1)).toBeLessThan(1e-15)
  })

  it('is strictly invariant under positive column rescaling c_j > 0 for both benefit and cost criteria', () => {
    const scales = [0.05, 12.5, 300, 0.007, 42]
    const scaled = fixture.matrix.map((row) => row.map((x, j) => x * scales[j]!))
    const res = run(scaled, types)
    expectClose(step(res.steps, 'cilos.normalized').matrix!, step(base.steps, 'cilos.normalized').matrix!, 1e-14)
    expectClose(step(res.steps, 'cilos.squareMatrix').matrix!, step(base.steps, 'cilos.squareMatrix').matrix!, 1e-14)
    expectClose(step(res.steps, 'cilos.lossMatrix').matrix!, step(base.steps, 'cilos.lossMatrix').matrix!, 1e-14)
    expectClose(step(res.steps, 'cilos.systemMatrix').matrix!, step(base.steps, 'cilos.systemMatrix').matrix!, 1e-14)
    expectClose(res.weights, base.weights, 1e-14)
  })

  it('inverts cost criteria via min_k x_kj / x_ij so smaller raw values get larger normalized shares', () => {
    const res = run(
      [
        [10, 20],
        [20, 40],
        [30, 80],
      ],
      ['benefit', 'cost'],
    )
    const Xbar = step(res.steps, 'cilos.normalized').matrix!
    // On cost col 1, raw [20, 40, 80] -> min/x = [1, 0.5, 0.25] -> sum = 1.75 -> shares [4/7, 2/7, 1/7].
    expectClose(
      Xbar.map((r) => r[1]!),
      [4 / 7, 2 / 7, 1 / 7],
      1e-15,
    )
    assertAllFinite(res.steps, res.weights)
  })

  it('averages tied winning rows for a criterion maximum so row permutations leave CILOS weights invariant', () => {
    const m1 = [
      [10, 4, 2],
      [10, 8, 5],
      [6, 5, 9],
    ]
    const m2 = [
      [10, 8, 5],
      [10, 4, 2],
      [6, 5, 9],
    ]
    const res1 = run(m1, ['benefit', 'benefit', 'benefit'])
    const res2 = run(m2, ['benefit', 'benefit', 'benefit'])
    const Xbar = step(res1.steps, 'cilos.normalized').matrix!
    const A = step(res1.steps, 'cilos.squareMatrix').matrix!
    // Criterion 0 ties at rows 0 and 1 (both 10); row 0 of A is the average of rows 0 and 1 of Xbar.
    expectClose(
      A[0]!,
      Xbar[0]!.map((v, j) => (v + Xbar[1]![j]!) / 2),
      1e-15,
    )
    expectClose(res1.weights, res2.weights, 1e-15)
    assertAllFinite(res1.steps, res1.weights)
  })

  it('rejects zero and negative cells with ProblemValidationError (non-positive-value)', () => {
    expect(() =>
      run(
        [
          [10, 0],
          [20, 5],
        ],
        ['benefit', 'benefit'],
      ),
    ).toThrow(ProblemValidationError)

    try {
      run(
        [
          [10, 5],
          [-2, 8],
        ],
        ['benefit', 'cost'],
      )
      expect.unreachable('should have thrown ProblemValidationError')
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemValidationError)
      expect((err as ProblemValidationError).issues).toContainEqual({
        code: 'non-positive-value',
        severity: 'error',
        row: 1,
        col: 0,
        value: -2,
      })
    }
  })

  it('assigns weight 0 to a constant column, zeroes its P and F row/col, and preserves active criteria weights', () => {
    const activeOnly = run(
      [
        [10, 2, 8],
        [6, 9, 4],
        [4, 5, 12],
      ],
      ['benefit', 'benefit', 'cost'],
    )
    const withConst = run(
      [
        [10, 7, 2, 8],
        [6, 7, 9, 4],
        [4, 7, 5, 12],
      ],
      ['benefit', 'benefit', 'benefit', 'cost'],
    )
    expect(withConst.weights[1]).toBe(0)
    expectClose([withConst.weights[0]!, withConst.weights[2]!, withConst.weights[3]!], activeOnly.weights, 1e-14)
    expect(withConst.warnings).toContainEqual({ code: 'cilos.constant-column', col: 1 })
    expect(withConst.diagnostics?.constantColumns).toBe(1)

    const Xbar = step(withConst.steps, 'cilos.normalized').matrix!
    const P = step(withConst.steps, 'cilos.lossMatrix').matrix!
    const F = step(withConst.steps, 'cilos.systemMatrix').matrix!
    expectClose(
      Xbar.map((r) => r[1]!),
      [1 / 3, 1 / 3, 1 / 3],
      1e-15,
    )
    for (let k = 0; k < 4; k++) {
      expect(P[1]![k]).toBe(0)
      expect(P[k]![1]).toBe(0)
      expect(F[1]![k]).toBe(0)
      expect(F[k]![1]).toBe(0)
    }
    assertAllFinite(withConst.steps, withConst.weights)
  })

  it('gives weight 1 to the sole active criterion when all other criteria are constant', () => {
    const res = run(
      [
        [5, 10, 3],
        [5, 25, 3],
        [5, 40, 3],
      ],
      ['benefit', 'benefit', 'cost'],
    )
    expect(res.weights).toEqual([0, 1, 0])
    expect(res.warnings).toContainEqual({ code: 'cilos.constant-column', col: 0 })
    expect(res.warnings).toContainEqual({ code: 'cilos.constant-column', col: 2 })
    assertAllFinite(res.steps, res.weights)
  })

  it('returns equal weights 1/n and a warning when every criterion is constant', () => {
    const res = run(
      [
        [4, 9, 2],
        [4, 9, 2],
        [4, 9, 2],
      ],
      ['benefit', 'cost', 'benefit'],
    )
    expectClose(res.weights, [1 / 3, 1 / 3, 1 / 3], 1e-15)
    expect(res.warnings?.map((w) => w.code)).toContain('cilos.all-constant-equal-weights')
    expect(res.diagnostics?.allConstant).toBe(1)
    assertAllFinite(res.steps, res.weights)
  })

  it('warns on a near-constant column (relative range <= 1e-9)', () => {
    const res = run(
      [
        [100, 10],
        [100 + 1e-8, 20],
        [100 + 2e-8, 35],
      ],
      ['benefit', 'benefit'],
    )
    expect(res.warnings).toContainEqual({ code: 'cilos.near-constant-column', col: 0 })
    assertAllFinite(res.steps, res.weights)
  })

  it('handles partial shared optimum (two criteria share a winner, third differs) with a unique rank-(n-1) solution', () => {
    const res = run(
      [
        [10, 20, 2],
        [6, 12, 9],
        [4, 8, 5],
      ],
      ['benefit', 'benefit', 'benefit'],
    )
    expect(res.warnings).toContainEqual({ code: 'cilos.shared-optimum' })
    expect(res.warnings?.map((w) => w.code)).not.toContain('cilos.zero-loss-equal-weights')
    const F = step(res.steps, 'cilos.systemMatrix').matrix!
    for (let i = 0; i < 3; i++) {
      const rowDot = F[i]!.reduce((acc, fij, j) => acc + fij * res.weights[j]!, 0)
      expect(Math.abs(rowDot)).toBeLessThan(1e-12)
    }
    assertAllFinite(res.steps, res.weights)
  })

  it('handles total shared optimum (one alternative wins every active criterion so P = 0, F = 0, rank(F) = 0) without NaN by assigning equal weights to active criteria', () => {
    // Alternative 0 has the maximum on benefit criteria 0 and 1, and the minimum on cost criterion 2.
    // Thus k_0 = k_1 = k_2 = 0, all rows of A coincide, P = 0, and F = 0 (rank(F) = 0).
    const res = run(
      [
        [20, 50, 2],
        [10, 30, 5],
        [5, 10, 10],
      ],
      ['benefit', 'benefit', 'cost'],
    )
    const P = step(res.steps, 'cilos.lossMatrix').matrix!
    const F = step(res.steps, 'cilos.systemMatrix').matrix!
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(P[i]![j]).toBe(0)
        expect(F[i]![j]).toBe(0)
      }
    }
    expectClose(res.weights, [1 / 3, 1 / 3, 1 / 3], 1e-15)
    expect(res.warnings).toContainEqual({ code: 'cilos.shared-optimum' })
    expect(res.warnings).toContainEqual({ code: 'cilos.zero-loss-equal-weights' })
    expect(res.diagnostics?.sharedOptimum).toBe(1)
    expect(res.diagnostics?.zeroLoss).toBe(1)
    assertAllFinite(res.steps, res.weights)

    // With a constant column alongside two active criteria that share their winner:
    const withConst = run(
      [
        [20, 7, 2],
        [10, 7, 5],
        [5, 7, 10],
      ],
      ['benefit', 'benefit', 'cost'],
    )
    expectClose(withConst.weights, [0.5, 0, 0.5], 1e-15)
    expect(withConst.warnings).toContainEqual({ code: 'cilos.constant-column', col: 1 })
    expect(withConst.warnings).toContainEqual({ code: 'cilos.shared-optimum' })
    expect(withConst.warnings).toContainEqual({ code: 'cilos.zero-loss-equal-weights' })
    expect(withConst.diagnostics?.zeroLoss).toBe(1)
    assertAllFinite(withConst.steps, withConst.weights)
  })

  it('prevents absorbing criterion collapse (f_jj = 0 on one active criterion) by assigning equal weights across active criteria', () => {
    // C2 is tied at the top on rows 0 and 1, which are the unique winners of C0 and C1.
    // Thus column 2 of P has 0 loss (f_22 = 0), which would otherwise absorb all weight into C2.
    const res3 = run(
      [
        [10, 4, 10],
        [4, 10, 10],
        [2, 2, 2],
      ],
      ['benefit', 'benefit', 'benefit'],
    )
    expectClose(res3.weights, [1 / 3, 1 / 3, 1 / 3], 1e-15)
    expect(res3.warnings).toContainEqual({ code: 'cilos.shared-optimum' })
    expect(res3.warnings).toContainEqual({ code: 'cilos.zero-loss-equal-weights' })
    expect(res3.diagnostics?.zeroLoss).toBe(1)

    const res2 = run(
      [
        [10, 10],
        [8, 10],
        [2, 2],
      ],
      ['benefit', 'benefit'],
    )
    expectClose(res2.weights, [0.5, 0.5], 1e-15)
    expect(res2.warnings).toContainEqual({ code: 'cilos.shared-optimum' })
    expect(res2.warnings).toContainEqual({ code: 'cilos.zero-loss-equal-weights' })
    expect(res2.diagnostics?.zeroLoss).toBe(1)
  })
})
