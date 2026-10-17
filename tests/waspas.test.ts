import { describe, expect, it } from 'vitest'
import {
  ProblemValidationError,
  rankScores,
  rankerFor,
  saw,
  waspas,
  WASPAS_LAMBDA_GRID,
  type CriterionType,
  type Problem,
} from '../src/core'
import adali from './fixtures/waspas-adali2017.json'
import robot from './fixtures/waspas-chakraborty2014-robot.json'
import origin from './fixtures/waspas-zavadskas2012.json'
import { expectClose, makeProblem, step } from './helpers'

const sumOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
const vec = (res: { steps: Parameters<typeof step>[0] }, key: string) => step(res.steps, key).vector!
/** The error issues a call throws with, or [] when it does not throw. */
function thrown(f: () => unknown) {
  try {
    f()
  } catch (e) {
    if (e instanceof ProblemValidationError) return e.issues.filter((x) => x.severity === 'error')
    throw e
  }
  return []
}

/** Independent restatement of Eqs. 1-6 (no shared code with the method). */
function recompute(matrix: number[][], types: readonly string[], weights: readonly number[], lambda: number) {
  const r = matrix.map((row) =>
    row.map((x, j) => {
      const col = matrix.map((rw) => rw[j]!)
      return types[j] === 'cost' ? Math.min(...col) / x : x / Math.max(...col)
    }),
  )
  const q1 = r.map((row) => sumOf(row.map((x, j) => x * weights[j]!)))
  const q2 = r.map((row) => row.reduce((a, x, j) => a * x ** weights[j]!, 1))
  return { r, q1, q2, q: q1.map((a, i) => lambda * a + (1 - lambda) * q2[i]!) }
}

/** Seeded generator (mulberry32), so the random checks are reproducible. */
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('WASPAS: Aytaç Adalı & Tuş Işık 2017 (IREM 5(4):56, Tables 4-7), the main example', () => {
  const p = makeProblem(adali.matrix, adali.types as CriterionType[], adali.alternatives)
  const ex = adali.expected
  const res = waspas.compute(p, adali.weights, {})

  it('reproduces the normalized matrix of Table 6', () => {
    expectClose(step(res.steps, 'waspas.normalized').matrix!, ex.normalized_table6, ex.tolerance.normalized)
  })
  it('reproduces all 55 scores of Table 7, as the λ sweep step and one λ at a time', () => {
    expect(WASPAS_LAMBDA_GRID).toEqual(ex.lambda_grid)
    expectClose(step(res.steps, 'waspas.lambdaSweep').matrix!, ex.Q_table7, ex.tolerance.Q)
    ex.lambda_grid.forEach((lambda, k) => {
      const q = waspas.compute(p, adali.weights, { lambda }).scores
      expectClose(q, ex.Q_table7.map((row) => row[k]!), ex.tolerance.Q, `λ = ${lambda}`)
    })
  })
  it('gives the three orders the paper reports over λ (p. 71), at all 11 λ', () => {
    for (const lambda of ex.lambda_grid) {
      const expected = lambda <= 0.3 ? ex.ranking['lambda_0_to_0.3'] : lambda <= 0.8 ? ex.ranking['lambda_0.4_to_0.8'] : ex.ranking['lambda_0.9_to_1']
      expect(waspas.compute(p, adali.weights, { lambda }).ranking, `λ = ${lambda}`).toEqual(expected)
    }
  })
  it('emits x̄, WSM, WPM, Q and the sweep, each equal to an independent recomputation', () => {
    expect(res.steps.map((s) => s.key)).toEqual(['waspas.normalized', 'waspas.wsm', 'waspas.wpm', 'waspas.scores', 'waspas.lambdaSweep'])
    const ref = recompute(adali.matrix, adali.types, adali.weights, 0.5)
    expectClose(step(res.steps, 'waspas.normalized').matrix!, ref.r, 1e-15)
    expectClose(vec(res, 'waspas.wsm'), ref.q1, 1e-15)
    expectClose(vec(res, 'waspas.wpm'), ref.q2, 1e-15)
    expectClose(res.scores, ref.q, 1e-15)
    expect(vec(res, 'waspas.scores')).toEqual(res.scores)
    expect(step(res.steps, 'waspas.lambdaSweep').axes).toEqual(['alternatives', 'lambda'])
    expect(res.order).toBe('desc')
  })
  it('is the default: {} and { lambda: 0.5 } agree; the descriptor is the slider (0 to 1, step 0.1)', () => {
    expect(waspas.compute(p, adali.weights, { lambda: 0.5 }).scores).toEqual(res.scores)
    expect(waspas.params).toEqual([{ key: 'lambda', kind: 'number', min: 0, max: 1, step: 0.1, default: 0.5 }])
    expect(waspas.requires).toEqual({ positiveValues: true })
  })
})

describe('WASPAS: Chakraborty & Zavadskas 2014 (Informatica 25(1):1, Tables 13-15), industrial robots', () => {
  const p = makeProblem(robot.matrix, robot.types as CriterionType[], robot.alternatives)
  const ex = robot.expected
  const res = waspas.compute(p, robot.weights, {})

  it('reproduces Q1, Q2 and Q at λ = 0.5 of Table 14', () => {
    expectClose(vec(res, 'waspas.wsm'), ex.Q1, ex.tolerance)
    expectClose(vec(res, 'waspas.wpm'), ex.Q2, ex.tolerance)
    expectClose(res.scores, ex['Q_lambda_0.5'], ex.tolerance)
  })
  it('gives the ranks of Table 15 at all 11 λ (robots 1 and 4 swap from λ = 0.8)', () => {
    for (const lambda of WASPAS_LAMBDA_GRID) {
      const expected = lambda <= 0.7 ? ex['ranking_lambda_0_to_0.7'] : ex['ranking_lambda_0.8_to_1']
      expect(waspas.compute(p, robot.weights, { lambda }).ranking, `λ = ${lambda}`).toEqual(expected)
    }
  })
})

describe('WASPAS: the origin, Zavadskas et al. 2012 (Tables 1-2), already normalized and misprinted', () => {
  const ex = origin.expected
  const types = origin.types as CriterionType[]
  // Printed weights sum to 1.0001: run with w / t, then undo it exactly (Q1 is linear in w, Q2(w) = Q2(w / t)^t).
  const t = sumOf(origin.weights_as_printed)
  const unit = origin.weights_as_printed.map((w) => w / t)
  const table2 = (matrix: number[][]) => {
    const res = waspas.compute(makeProblem(matrix, types, origin.alternatives), unit, {})
    const q1 = vec(res, 'waspas.wsm').map((q) => q * t)
    const q2 = vec(res, 'waspas.wpm').map((q) => q ** t)
    return q1.map((a, i) => WASPAS_LAMBDA_GRID.map((l) => l * a + (1 - l) * q2[i]!))
  }

  it('reproduces all 44 values of Table 2 with a1 x̄5 = 0.1000, and its ranks on both sides of λ = 0.45', () => {
    expect(Math.abs(t - 1)).toBeGreaterThan(5e-5)
    const q = table2(origin.matrix_corrected)
    expectClose(q, ex.Q_table2, ex.tolerance)
    WASPAS_LAMBDA_GRID.forEach((l, k) => {
      const expected = l <= 0.4 ? ex['ranking_lambda_0_to_0.4'] : ex['ranking_lambda_0.5_to_1']
      expect(rankScores(q.map((row) => row[k]!), 'desc'), `λ = ${l}`).toEqual(expected)
    })
  })
  it('as printed (a1 x̄5 = 1.0000) row a1 is off by more than 0.05; rows a2 to a4 still match', () => {
    const q = table2(origin.matrix_printed)
    expect(Math.max(...q[0]!.map((v, k) => Math.abs(v - ex.Q_table2[0]![k]!)))).toBeGreaterThan(0.05)
    expectClose(q.slice(1), ex.Q_table2.slice(1), ex.tolerance)
  })
})

describe('WASPAS: λ ends, invariants and guards', () => {
  const p = makeProblem(adali.matrix, adali.types as CriterionType[])

  it('λ = 1 is SAW with linear max normalization, bit for bit', () => {
    const s = saw.compute(p, adali.weights, {})
    const w = waspas.compute(p, adali.weights, { lambda: 1 })
    expect(w.scores).toEqual(s.scores)
    expect(step(w.steps, 'waspas.normalized').matrix).toEqual(step(s.steps, 'saw.normalizedLinearMax').matrix)
    expect(w.ranking).toEqual(s.ranking)
  })
  it('λ = 0 is the weighted product model', () => {
    const w = waspas.compute(p, adali.weights, { lambda: 0 })
    expect(w.scores).toEqual(vec(w, 'waspas.wpm'))
  })
  it('on random positive problems: Q2 <= Q1 (weighted AM-GM), Q never falls as λ grows, Q2 <= Q <= Q1 <= 1', () => {
    const next = rng(20121018)
    for (let k = 0; k < 300; k++) {
      const m = 2 + Math.floor(next() * 6)
      const n = 2 + Math.floor(next() * 6)
      const matrix = Array.from({ length: m }, () => Array.from({ length: n }, () => 0.01 + next() * 100))
      const types = Array.from({ length: n }, (): CriterionType => (next() < 0.5 ? 'benefit' : 'cost'))
      const raw = Array.from({ length: n }, () => next())
      const weights = raw.map((x) => x / sumOf(raw))
      const res = waspas.compute(makeProblem(matrix, types), weights, { lambda: Math.round(next() * 10) / 10 })
      const q1 = vec(res, 'waspas.wsm')
      const q2 = vec(res, 'waspas.wpm')
      const sweep = step(res.steps, 'waspas.lambdaSweep').matrix!
      q1.forEach((a, i) => {
        expect(q2[i]!).toBeLessThanOrEqual(a + 1e-12)
        expect(a).toBeLessThanOrEqual(1 + 1e-12)
        expect(res.scores[i]!).toBeGreaterThanOrEqual(q2[i]! - 1e-12)
        expect(res.scores[i]!).toBeLessThanOrEqual(a + 1e-12)
        for (let c = 1; c < sweep[i]!.length; c++) expect(sweep[i]![c]!).toBeGreaterThanOrEqual(sweep[i]![c - 1]! - 1e-12)
      })
    }
  })
  it('blocks a zero cost cell, a zero benefit cell and a negative cell as non-positive-value with the cell', () => {
    const w = [0.5, 0.5]
    expect(thrown(() => waspas.compute(makeProblem([[1, 0], [2, 3]], ['benefit', 'cost']), w, {}))).toEqual([
      { code: 'non-positive-value', severity: 'error', row: 0, col: 1, value: 0 },
    ])
    expect(thrown(() => waspas.compute(makeProblem([[0, 1], [2, 3]], ['benefit', 'cost']), w, {}))).toEqual([
      { code: 'non-positive-value', severity: 'error', row: 0, col: 0, value: 0 },
    ])
    expect(thrown(() => waspas.compute(makeProblem([[1, 2], [-2, 3]], ['benefit', 'cost']), w, {}))).toEqual([
      { code: 'non-positive-value', severity: 'error', row: 1, col: 0, value: -2 },
    ])
  })
  it('a constant column is a warning, adds w_j to every WSM and 1 to every WPM factor, and leaves the ranks', () => {
    const base = makeProblem([[1, 2], [3, 1], [2, 4]], ['benefit', 'cost'])
    const withConst: Problem = makeProblem([[1, 2, 7], [3, 1, 7], [2, 4, 7]], ['benefit', 'cost', 'benefit'])
    const prepared = rankerFor({ methodId: 'waspas', params: {} })
    expect(() => prepared(withConst)).not.toThrow()
    const a = waspas.compute(base, [0.5, 0.5], {})
    const b = waspas.compute(withConst, [0.4, 0.4, 0.2], {})
    expect(b.ranking).toEqual(a.ranking)
    expect(step(b.steps, 'waspas.normalized').matrix!.map((r) => r[2])).toEqual([1, 1, 1])
  })
  it('one alternative is blocked (m >= 2)', () => {
    expect(thrown(() => waspas.compute(makeProblem([[1, 2]], ['benefit', 'cost']), [0.5, 0.5], {})).map((x) => x.code)).toContain(
      'too-few-alternatives',
    )
  })
  it('equal rows share a rank (competition ranking)', () => {
    const res = waspas.compute(makeProblem([[2, 3], [2, 3], [1, 4]], ['benefit', 'cost']), [0.5, 0.5], {})
    expect(res.ranking).toEqual([1, 1, 3])
  })
  it('throws a RangeError for λ outside [0, 1] or not a number, called directly', () => {
    const q = makeProblem([[1, 2], [3, 1]], ['benefit', 'cost'])
    for (const lambda of [-0.1, 1.5, Number.NaN]) expect(() => waspas.compute(q, [0.5, 0.5], { lambda })).toThrow(RangeError)
  })
})

describe('WASPAS in robustness: λ travels inside the RankingRun', () => {
  it('the worker sweep with λ = 0 ranks with λ = 0, not the default 0.5', async () => {
    const { runRequest } = await import('../src/app/workbench/robustness/robustness.worker')
    const p = makeProblem(adali.matrix, adali.types as CriterionType[], adali.alternatives)
    const res = runRequest({ id: 1, kind: 'sweep', problem: p, weights: adali.weights, run: { methodId: 'waspas', params: { lambda: 0 } }, k: 0 })
    if (!('result' in res) || res.kind !== 'sweep') throw new Error('sweep failed')
    const pt = res.result.sweep.points[Math.floor(res.result.sweep.points.length / 2)]!
    expect(pt.scores).toEqual(waspas.compute(p, pt.weights, { lambda: 0 }).scores)
    expect(pt.scores).not.toEqual(waspas.compute(p, pt.weights, {}).scores)
  })
})
