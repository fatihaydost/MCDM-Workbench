import { describe, expect, it } from 'vitest'
import { critic, entropy, moora, ProblemValidationError, rankerFor, type CriterionType } from '../src/core'
import { perturbWeights, removeCriteria, sweepWeight } from '../src/core/robustness'
import bz2010 from './fixtures/moora-brauers-zavadskas2010.json'
import vujicic2017 from './fixtures/moora-vujicic2017.json'
import { expectClose, makeProblem, step } from './helpers'

const vec = (steps: Parameters<typeof step>[0], key: string) => step(steps, key).vector!
const mat = (steps: Parameters<typeof step>[0], key: string) => step(steps, key).matrix!

describe('MOORA (Brauers & Zavadskas 2006, 2010; Vujičić et al. 2017)', () => {
  it('reproduces Brauers & Zavadskas (2010) Appendix C Table 2 norms, normalized ratios, unweighted y* and equal-weight scores', () => {
    const p = makeProblem(bz2010.matrix, bz2010.types as CriterionType[], bz2010.alternatives)
    const n = bz2010.criteria.length
    const res = moora.compute(p, bz2010.weights, {})

    expect(res.order).toBe('desc')
    expect(res.warnings).toEqual([])
    expect(res.ranking).toEqual(bz2010.published.ranking)

    const normMat = mat(res.steps, 'moora.normalized')
    expectClose(normMat, bz2010.published.normalized, 4e-4, 'Table 2c normalized matrix')
    expectClose(normMat, bz2010.expected.normalized, bz2010.expected.tolerance_exact)

    const sPlus = vec(res.steps, 'moora.benefitSum')
    const sMinus = vec(res.steps, 'moora.costSum')
    expectClose(sPlus, bz2010.expected.equalWeights.benefitSum, bz2010.expected.tolerance_exact)
    expectClose(sMinus, bz2010.expected.equalWeights.costSum, bz2010.expected.tolerance_exact)
    expectClose(res.scores, bz2010.expected.equalWeights.scores, bz2010.expected.tolerance_exact)

    // Scaling equal weights (w_j = 1/9) by n = 9 reproduces the unweighted paper values y* = [2.93480, 2.723, 2.698].
    const yStar = res.scores.map((y) => y * n)
    expectClose(yStar, bz2010.published.y_star_unweighted, bz2010.expected.tolerance_vs_published_unweighted, 'Table 2c y*')
    expectClose(yStar, bz2010.expected.unweighted.y_star, bz2010.expected.tolerance_exact)
  })

  it('reproduces both worked examples of the 2006 origin paper (Tables 1 and 5)', () => {
    for (const [label, fx] of [
      ['2006 Table 1 (welfare economy)', bz2010.origin2006_table1],
      ['2006 Table 5 (wellbeing economy)', bz2010.origin2006_table5],
    ] as const) {
      const n = fx.criteria.length
      const p = makeProblem(fx.matrix, fx.types as CriterionType[], fx.alternatives)
      const res = moora.compute(p, fx.weights, {})
      expect(res.ranking, label).toEqual(fx.expected_equal_weights.ranking)
      expectClose(vec(res.steps, 'moora.benefitSum'), fx.expected_equal_weights.benefitSum, 1e-6, label)
      expectClose(vec(res.steps, 'moora.costSum'), fx.expected_equal_weights.costSum, 1e-6, label)
      expectClose(res.scores, fx.expected_equal_weights.scores, 1e-6, label)
      const yStar = res.scores.map((y) => y * n)
      expectClose(yStar, fx.published_unweighted_y_star, 5e-6, label)
    }
  })

  it('reproduces Vujičić et al. (2017) Table 7a (MOORA + Entropy) and Table 7b (MOORA + CRITIC) air-conditioner rankings', () => {
    const p = makeProblem(vujicic2017.matrix, vujicic2017.types as CriterionType[], vujicic2017.alternatives)

    // Variant 1a: Entropy -> MOORA
    const ent = entropy.compute(p, {})
    expectClose(ent.weights, vujicic2017.entropy.weights_recomputed, 1e-5)
    expectClose(ent.weights, vujicic2017.entropy.weights_printed_3dp, 5e-4)
    const resEnt = moora.compute(p, ent.weights, {})
    expect(resEnt.ranking).toEqual(vujicic2017.entropy.published_ranking)
    expectClose(vec(resEnt.steps, 'moora.benefitSum'), vujicic2017.entropy.expected.benefitSum, 1e-6)
    expectClose(vec(resEnt.steps, 'moora.costSum'), vujicic2017.entropy.expected.costSum, 1e-6)
    expectClose(resEnt.scores, vujicic2017.entropy.expected.scores, 1e-6)
    // All net scores are negative because cost criteria carry 82.97% of the weight, yet ranking by descending y holds.
    expect(resEnt.scores.every((y) => y < 0)).toBe(true)

    // Variant 1b: CRITIC (Table 6 weights) -> MOORA (Table 7b Variant 1)
    const resCrt = moora.compute(p, vujicic2017.critic.weights_printed, {})
    expect(resCrt.ranking).toEqual(vujicic2017.critic.published_ranking)
    expectClose(vec(resCrt.steps, 'moora.benefitSum'), vujicic2017.critic.expected.benefitSum, 1e-6)
    expectClose(vec(resCrt.steps, 'moora.costSum'), vujicic2017.critic.expected.costSum, 1e-6)
    expectClose(resCrt.scores, vujicic2017.critic.expected.scores, 1e-6)
    // End-to-end with our core CRITIC weights also places a7 first and a5 last.
    const crt = critic.compute(p, {})
    const chainCrt = moora.compute(p, crt.weights, {})
    expect(chainCrt.ranking[6]).toBe(1)
    expect(chainCrt.ranking[4]).toBe(9)
  })

  it('is invariant to positive column rescaling, reduces to vector-normalized WSM when all criteria are benefit, and is not shift-invariant', () => {
    const p = makeProblem(bz2010.matrix, bz2010.types as CriterionType[])
    const base = moora.compute(p, bz2010.weights, {})

    const scales = [10, 0.01, 5, 2, 0.5, 100, 3, 7, 0.25]
    const scaled = makeProblem(
      bz2010.matrix.map((row) => row.map((x, j) => x * scales[j]!)),
      bz2010.types as CriterionType[],
    )
    const resScaled = moora.compute(scaled, bz2010.weights, {})
    expectClose(resScaled.scores, base.scores, 1e-14)
    expect(resScaled.ranking).toEqual(base.ranking)

    // All benefit criteria: S- = 0 and y = S+.
    const allBenefit = makeProblem(bz2010.matrix, new Array<CriterionType>(9).fill('benefit'))
    const resBen = moora.compute(allBenefit, bz2010.weights, {})
    expect(vec(resBen.steps, 'moora.costSum')).toEqual([0, 0, 0])
    expectClose(resBen.scores, vec(resBen.steps, 'moora.benefitSum'), 1e-15)

    // Adding a constant shift changes vector-normalized ratios.
    const shifted = makeProblem(
      bz2010.matrix.map((row) => row.map((x) => x + 50)),
      bz2010.types as CriterionType[],
    )
    const resShifted = moora.compute(shifted, bz2010.weights, {})
    expect(resShifted.scores).not.toEqual(base.scores)
  })

  it('handles all-zero columns with a warning, negative entries, all-cost problems, ties, validation errors and robustness helpers', () => {
    // All-zero column emits moora.zero-column and keeps ratios at 0.
    const zeroCol = makeProblem(
      [
        [0, 10, 4],
        [0, 20, 2],
        [0, 30, 1],
      ],
      ['benefit', 'benefit', 'cost'],
    )
    const zRes = moora.compute(zeroCol, [0.3, 0.4, 0.3], {})
    expect(zRes.warnings).toEqual([{ code: 'moora.zero-column', col: 0 }])
    expect(mat(zRes.steps, 'moora.normalized').map((r) => r[0])).toEqual([0, 0, 0])
    expect(zRes.ranking).toEqual([3, 2, 1])

    // Negative values work without error and emit moora.negative-values on active varying columns.
    const neg = makeProblem(
      [
        [-5, 10],
        [0, 20],
        [5, 15],
      ],
      ['benefit', 'cost'],
    )
    const negRes = moora.compute(neg, [0.5, 0.5], {})
    expect(negRes.scores.every(Number.isFinite)).toBe(true)
    expect(negRes.ranking).toEqual([3, 2, 1])
    expect(negRes.warnings).toEqual([{ code: 'moora.negative-values', col: 0 }])
    expect(moora.compute(neg, [0, 1], {}).warnings).toEqual([])

    // All-cost criteria: S+ = 0, y = -S-, smallest cost sum ranks 1st.
    const allCost = makeProblem(
      [
        [10, 20],
        [20, 40],
        [30, 60],
      ],
      ['cost', 'cost'],
    )
    const costRes = moora.compute(allCost, [0.5, 0.5], {})
    expect(vec(costRes.steps, 'moora.benefitSum')).toEqual([0, 0, 0])
    expect(costRes.ranking).toEqual([1, 2, 3])

    // Identical rows share rank 1 (competition ranking 1, 1, 3).
    const tied = makeProblem(
      [
        [10, 5],
        [10, 5],
        [6, 9],
      ],
      ['benefit', 'cost'],
    )
    expect(moora.compute(tied, [0.5, 0.5], {}).ranking).toEqual([1, 1, 3])

    // Validation errors on invalid problem or weights.
    expect(() => moora.compute(makeProblem([[1, 2]], ['benefit', 'cost']), [0.5, 0.5], {})).toThrow(ProblemValidationError)
    expect(() => moora.compute(neg, [0.6, 0.6], {})).toThrow(ProblemValidationError)

    // Robustness helpers work with rankerFor({ methodId: 'moora', params: {} }).
    const p = makeProblem(bz2010.matrix, bz2010.types as CriterionType[])
    const rf = rankerFor({ methodId: 'moora', params: {} })
    const sw = sweepWeight(p, bz2010.weights, rf, 0)
    expect(sw.baseRankingInterval.ranking).toEqual(bz2010.published.ranking)
    expect(perturbWeights(p, bz2010.weights, rf).every((r) => !r.blocked)).toBe(true)
    expect(removeCriteria(p, bz2010.weights, rf).every((r) => !r.blocked && r.ranking.length === 3)).toBe(true)
  })
})
