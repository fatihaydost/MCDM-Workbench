import { describe, expect, it } from 'vitest'
import { critic, entropy, equal, rankScores, saw, topsis, type MethodParams, type Problem, type RankingMethod } from '../src/core'
import {
  createRng,
  DEFAULT_DELTAS,
  kendallTauB,
  midRanks,
  monteCarlo,
  perturbWeights,
  removeCriteria,
  reweight,
  sampleDirichlet,
  spearman,
  sweepWeight,
  wsCoefficient,
  type Sweep,
} from '../src/core/robustness'
import { examples } from '../src/data/examples'
import { expectClose, makeProblem } from './helpers'

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)

const krishnanExample = examples.find((e) => e.id === 'krishnan-2021-smartphones')!
const krishnan: Problem = {
  alternatives: krishnanExample.alternatives,
  criteria: krishnanExample.criteria.map((c) => ({ name: c.name.en, type: c.type })),
  matrix: krishnanExample.matrix,
}
const krishnanW = critic.compute(krishnan, {}).weights

/** A ranking method whose scores are an explicit function of the weights (higher is better). */
const fakeMethod = (f: (w: number[]) => number[]): RankingMethod => ({
  id: 'fake',
  kind: 'ranking',
  compute: (_p, w) => {
    const scores = f(w)
    return { scores, order: 'desc', ranking: rankScores(scores, 'desc'), steps: [] }
  },
})
const dummy2 = makeProblem([[1, 2], [3, 4]], ['benefit', 'benefit'])
const dummy3 = makeProblem([[1, 2], [3, 4], [5, 6]], ['benefit', 'benefit'])

// ---------- reweight ----------

describe('reweight', () => {
  const w = [0.1, 0.2, 0.3, 0.4]

  it('sets w_k and keeps the sum at 1', () => {
    for (const t of [0, 0.05, 0.25, 0.5, 0.99, 1]) {
      const r = reweight(w, 2, t)
      expect(r[2]).toBe(t)
      expect(Math.abs(sum(r) - 1)).toBeLessThanOrEqual(1e-12)
    }
  })

  it('keeps the ratios of the other weights (w_j (1 − wk\') / (1 − w_k))', () => {
    const r = reweight(w, 2, 0.5)
    // others 0.1, 0.2, 0.4 (sum 0.7) scaled by 0.5 / 0.7
    expectClose(r, [0.1 * (0.5 / 0.7), 0.2 * (0.5 / 0.7), 0.5, 0.4 * (0.5 / 0.7)], 1e-15)
    expect(r[1]! / r[0]!).toBeCloseTo(2, 12)
    expect(r[3]! / r[0]!).toBeCloseTo(4, 12)
  })

  it('clamps w_k to [0, 1]', () => {
    expect(reweight(w, 0, -0.3)).toEqual(reweight(w, 0, 0))
    expect(reweight(w, 0, 1.7)).toEqual([1, 0, 0, 0])
  })

  it('w_k = 1: the others share 1 − wk\' equally', () => {
    expectClose(reweight([0, 1, 0], 1, 0.4), [0.3, 0.4, 0.3], 1e-15)
    expectClose(reweight([0, 1, 0], 1, 0), [0.5, 0, 0.5], 1e-15)
  })

  it('base weight returns the base vector; one criterion gives [1]; bad k throws', () => {
    expectClose(reweight(w, 3, 0.4), w, 1e-15)
    expect(reweight([1], 0, 0.3)).toEqual([1])
    expect(() => reweight(w, 4, 0.2)).toThrow(RangeError)
  })

  it('sum is 1 within 1e-12 for random weights and targets', () => {
    const rng = createRng(7)
    for (let r = 0; r < 500; r++) {
      const raw = Array.from({ length: 6 }, () => rng())
      const ww = raw.map((x) => x / sum(raw))
      const out = reweight(ww, r % 6, rng() * 1.4 - 0.2)
      expect(Math.abs(sum(out) - 1)).toBeLessThanOrEqual(1e-12)
      expect(out.every((x) => x >= 0 && x <= 1)).toBe(true)
    }
  })
})

// ---------- sweepWeight ----------

const key = (r: readonly number[]) => r.join(',')
const tops = (r: readonly number[]) => key(r.map((x, i) => (x === 1 ? i : -1)).filter((i) => i >= 0))

function expectContiguous(sw: Sweep): void {
  for (const ivs of [sw.rankingIntervals, sw.topIntervals]) {
    expect(ivs[0]!.from).toBe(0)
    expect(ivs[ivs.length - 1]!.to).toBe(1)
    for (let i = 0; i + 1 < ivs.length; i++) {
      expect(ivs[i]!.to).toBe(ivs[i + 1]!.from)
      expect(ivs[i]!.from).toBeLessThan(ivs[i]!.to)
    }
  }
  for (let i = 0; i + 1 < sw.rankingIntervals.length; i++) {
    expect(key(sw.rankingIntervals[i]!.ranking)).not.toBe(key(sw.rankingIntervals[i + 1]!.ranking))
  }
  for (let i = 0; i + 1 < sw.topIntervals.length; i++) {
    expect(key(sw.topIntervals[i]!.top)).not.toBe(key(sw.topIntervals[i + 1]!.top))
  }
}

/**
 * Every change of `f(ranking)` on a dense grid t = j / N, as the cell [t_j, t_j+1] that contains it.
 * The end points t = 0 and t = 1 are left out: there the other weights (or w_k) are exactly 0, which can tie
 * alternatives at that single point; a single point is not an interval (see sweepWeight's doc).
 */
function bruteChanges(p: Problem, w: number[], k: number, f: (r: number[]) => string, N = 10000) {
  const pts = Array.from({ length: N - 1 }, (_, j0) => {
    const t = (j0 + 1) / N
    return { t, ranking: topsis.compute(p, reweight(w, k, t), {}).ranking }
  })
  const cells: { lo: number; hi: number }[] = []
  for (let j = 0; j + 1 < pts.length; j++) if (f(pts[j]!.ranking) !== f(pts[j + 1]!.ranking)) cells.push({ lo: pts[j]!.t, hi: pts[j + 1]!.t })
  return { pts, cells }
}

describe('sweepWeight: Krishnan et al. 2021 smartphones, CRITIC weights, TOPSIS, vs. a 1e-4 brute-force scan', () => {
  let totalSwitches = 0
  for (let k = 0; k < krishnan.criteria.length; k++) {
    it(`criterion ${k} (${krishnan.criteria[k]!.name}): switch points and rankings match the dense scan`, () => {
      const sw = sweepWeight(krishnan, krishnanW, topsis, k)
      expect(sw.k).toBe(k)
      expect(sw.points).toHaveLength(101)
      expectContiguous(sw)

      for (const [ivs, f] of [
        [sw.rankingIntervals, key],
        [sw.topIntervals, tops],
      ] as const) {
        const { pts, cells } = bruteChanges(krishnan, krishnanW, k, f)
        const allCuts = ivs.slice(1).map((iv) => iv.from)
        // Cuts within 1e-4 of an end are finer than the scan; check them directly (the ranking differs 1e-6
        // either side). Criterion 2 has one: C and D (equal pixel density) tie within TIE_TOLERANCE for
        // w_k > 1 − 2e-6, where the other criteria's weights have almost vanished.
        const cuts = allCuts.filter((c) => c > 1e-4 && c < 1 - 1e-4)
        for (const c of allCuts.filter((x) => !cuts.includes(x))) {
          const at = (t: number) => f(topsis.compute(krishnan, reweight(krishnanW, k, t), {}).ranking)
          expect(at(c - 1e-6)).not.toBe(at(Math.min(1, c + 1e-6)))
        }
        expect(cuts.length, `cuts ${cuts.join(' ')} vs cells ${cells.map((c) => c.lo).join(' ')}`).toBe(cells.length)
        cuts.forEach((c, i) => {
          expect(c).toBeGreaterThanOrEqual(cells[i]!.lo - 1e-6)
          expect(c).toBeLessThanOrEqual(cells[i]!.hi + 1e-6)
        })
        // every dense point away from a cut has the interval's ranking / top set
        for (const p of pts) {
          if (cuts.some((c) => Math.abs(c - p.t) < 2e-6)) continue
          const iv = ivs.find((x) => x.from <= p.t && p.t <= x.to)!
          if (f === key) expect(key(iv.ranking)).toBe(key(p.ranking))
          else expect(key(iv.top)).toBe(tops(p.ranking))
        }
      }
      totalSwitches += sw.rankingIntervals.length - 1

      // base interval contains w_k and carries the base ranking
      const base = topsis.compute(krishnan, krishnanW, {}).ranking
      expect(sw.baseRankingInterval.from).toBeLessThanOrEqual(krishnanW[k]!)
      expect(sw.baseRankingInterval.to).toBeGreaterThanOrEqual(krishnanW[k]!)
      expect(sw.baseRankingInterval.ranking).toEqual(base)
      expect(sw.baseTopInterval.from).toBeLessThanOrEqual(krishnanW[k]!)
      expect(sw.baseTopInterval.to).toBeGreaterThanOrEqual(krishnanW[k]!)
      expect(key(sw.baseTopInterval.top)).toBe(tops(base))
      expect(sw.rankingIntervals).toContain(sw.baseRankingInterval)
      expect(sw.topIntervals).toContain(sw.baseTopInterval)
    })
  }
  it('the example is not trivial: the ranking switches somewhere', () => expect(totalSwitches).toBeGreaterThan(0))

  it('w_screen = 1 exactly: price, thickness and mass weigh 0, equal screens tie on the grid end point only', () => {
    const sw = sweepWeight(krishnan, krishnanW, topsis, 1)
    // screen sizes 4.7, 5.5, 5.7, 5.7, 5.5 → (5, 3, 1, 1, 3) at w = 1; just below 1 the other criteria break the ties
    expect(sw.points[100]!.ranking).toEqual([5, 3, 1, 1, 3])
    expect(sw.rankingIntervals[sw.rankingIntervals.length - 1]!.ranking).not.toEqual([5, 3, 1, 1, 3])
  })
})

describe('sweepWeight: a tie that exists only at w_k = 1 is not an interval', () => {
  it('Krishnan 2021, k = 2 (pixel density, C and D both 520): the sweep ends on the ranking that holds below 1', () => {
    const sw = sweepWeight(krishnan, krishnanW, topsis, 2)
    const last = sw.rankingIntervals[sw.rankingIntervals.length - 1]!
    expect(last.to).toBe(1)
    expect(last.from).toBeLessThan(0.9)
    expect(new Set(last.ranking).size).toBe(last.ranking.length) // no tie in the last interval
  })
})

describe('sweepWeight: several switches inside one grid cell (synthetic methods)', () => {
  it('one pair crossing twice inside [0.50, 0.51]: both crossings found (0.503 and 0.507)', () => {
    // B − A = 10 (t − 0.503)(t − 0.507): B ahead at both grid points 0.50 and 0.51, A ahead in between.
    const m = fakeMethod((w) => [0.5, 0.5 + 10 * (w[0]! - 0.503) * (w[0]! - 0.507)])
    const sw = sweepWeight(dummy2, [0.3, 0.7], m, 0)
    expectContiguous(sw)
    expect(sw.rankingIntervals.map((iv) => iv.ranking)).toEqual([[2, 1], [1, 2], [2, 1]])
    expectClose(sw.rankingIntervals.map((iv) => [iv.from, iv.to]), [[0, 0.503], [0.503, 0.507], [0.507, 1]], 1e-6)
    expect(sw.topIntervals.map((iv) => iv.top)).toEqual([[1], [0], [1]])
    expect(sw.baseRankingInterval.ranking).toEqual([2, 1])
    expect(sw.baseRankingInterval.from).toBe(0)
  })

  it('two different pairs switching inside [0.50, 0.51] (A passes B at 0.5023, C at 0.5067)', () => {
    const m = fakeMethod((w) => [w[0]!, 0.5023, 0.5067])
    const sw = sweepWeight(dummy3, [0.3, 0.7], m, 0)
    expect(sw.rankingIntervals.map((iv) => iv.ranking)).toEqual([[3, 2, 1], [2, 3, 1], [1, 3, 2]])
    expectClose(sw.rankingIntervals.slice(1).map((iv) => iv.from), [0.5023, 0.5067], 1e-6)
    expect(sw.topIntervals.map((iv) => iv.top)).toEqual([[2], [0]])
    expectClose(sw.topIntervals[1]!.from, 0.5067, 1e-6)
    // topIntervals[0] spans two rankings; its `ranking` is the one at its start
    expect(sw.topIntervals[0]!.ranking).toEqual([3, 2, 1])
  })

  it('a near-touch that never crosses gives no switch', () => {
    const m = fakeMethod((w) => [0.5, 0.5 + 10 * (w[0]! - 0.505) ** 2 + 1e-9])
    const sw = sweepWeight(dummy2, [0.3, 0.7], m, 0)
    expect(sw.rankingIntervals).toHaveLength(1)
    expect(sw.topIntervals).toHaveLength(1)
  })

  it('a crossing exactly on a grid point is one switch, not a sliver interval', () => {
    const m = fakeMethod((w) => [w[0]!, 0.5])
    const sw = sweepWeight(dummy2, [0.3, 0.7], m, 0)
    expect(sw.rankingIntervals.map((iv) => iv.ranking)).toEqual([[2, 1], [1, 2]])
    expectClose(sw.rankingIntervals[1]!.from, 0.5, 1e-6)
    expect(sw.points[50]!.ranking).toEqual([1, 1]) // the tie itself is visible on the grid
  })

  it('switch points are bisected, not grid values; steps option sets the grid', () => {
    const m = fakeMethod((w) => [w[0]!, 0.123456])
    const sw = sweepWeight(dummy2, [0.3, 0.7], m, 0, { steps: 10 })
    expect(sw.points).toHaveLength(11)
    expect(sw.points.map((p) => p.wk)).toEqual(Array.from({ length: 11 }, (_, i) => i / 10))
    expect(Math.abs(sw.rankingIntervals[1]!.from - 0.123456)).toBeLessThanOrEqual(5e-7)
    expect(sw.baseTopInterval.top).toEqual([0]) // base w_0 = 0.3 > 0.123456
  })

  it('base weight exactly on a switch point picks the interval with the base ranking', () => {
    const m = fakeMethod((w) => [w[0]! >= 0.25 ? 1 : 0, 0.5])
    const sw = sweepWeight(dummy2, [0.25, 0.75], m, 0)
    expect(sw.rankingIntervals).toHaveLength(2)
    expect(sw.baseRankingInterval.ranking).toEqual([1, 2])
  })

  it('rejects a bad criterion index or step count', () => {
    expect(() => sweepWeight(krishnan, krishnanW, topsis, 5)).toThrow(RangeError)
    expect(() => sweepWeight(krishnan, krishnanW, topsis, 0, { steps: 0 })).toThrow(RangeError)
  })
})

// ---------- perturbWeights ----------

describe('perturbWeights', () => {
  it('one row per criterion × δ, criterion-major, weights from reweight', () => {
    const rows = perturbWeights(krishnan, krishnanW, topsis)
    expect(rows).toHaveLength(krishnan.criteria.length * DEFAULT_DELTAS.length)
    expect(rows.map((r) => [r.k, r.delta])).toEqual(
      krishnan.criteria.flatMap((_, k) => DEFAULT_DELTAS.map((d) => [k, d])),
    )
    const base = topsis.compute(krishnan, krishnanW, {}).ranking
    for (const r of rows) {
      expect(r.weights).toEqual(reweight(krishnanW, r.k, krishnanW[r.k]! * (1 + r.delta)))
      expect(Math.abs(sum(r.weights) - 1)).toBeLessThanOrEqual(1e-12)
      expect(r.ranking).toEqual(topsis.compute(krishnan, r.weights, {}).ranking)
      expect(r.spearman).toBe(spearman(base, r.ranking))
      expect(r.ws).toBe(wsCoefficient(base, r.ranking))
      expect(r.sameTop).toBe(tops(r.ranking) === tops(base))
    }
  })

  it('clamps: w_k (1 + δ) above 1 becomes 1, below 0 becomes 0', () => {
    const p = makeProblem([[1, 2], [2, 1], [3, 3]], ['benefit', 'benefit'])
    const rows = perturbWeights(p, [0.9, 0.1], topsis, [0.5, -2])
    expect(rows[0]!.weights).toEqual([1, 0])
    expect(rows[1]!.weights).toEqual([0, 1])
    expectClose(rows[2]!.weights, [0.85, 0.15], 1e-15)
    expect(rows[3]!.weights).toEqual([1, 0])
  })
})

// ---------- agreement coefficients ----------

describe('perturbWeights: all the weight on one criterion (combinations.md §C.1, w_k = 1 -> skip)', () => {
  it('skips that criterion instead of inventing an equal split, so no row repeats the base vector', () => {
    const p = makeProblem([[10, 1, 1], [9, 9, 9], [8, 5, 9]], ['benefit', 'benefit', 'benefit'])
    const rows = perturbWeights(p, [1, 0, 0], topsis)
    expect(rows.some((r) => r.k === 0)).toBe(false)
    // The zero-weight criteria keep their rows (they equal the base and the stage marks them n/a).
    expect(rows.every((r) => r.weights[0] === 1)).toBe(true)
  })
})

describe('agreement: Sałabun & Urbaniak 2020 (ICCS 2020, LNCS 12138:632), Tables 1–4', () => {
  // Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC7302865/ (open-access copy; the ranking columns and the
  // coefficient rows) and https://link.springer.com/content/pdf/10.1007/978-3-030-50417-5_47.pdf (the WS rows).
  // Reference ranking Rx = (1, 2, 3, 4, 5) for alternatives A1..A5 in every table; values printed to 4 decimals.
  const rx = [1, 2, 3, 4, 5]

  it('Table 1: adjacent swaps at positions 1–2, 2–3, 3–4, 4–5', () => {
    const ys = [[2, 1, 3, 4, 5], [1, 3, 2, 4, 5], [1, 2, 4, 3, 5], [1, 2, 3, 5, 4]]
    // WS by hand, swap 1–2: 2^-1·1/4 + 2^-2·1/3 = 0.125 + 0.08333 → 1 − 0.20833 = 0.79167
    expectClose(ys.map((y) => wsCoefficient(rx, y)), [0.7917, 0.8542, 0.9167, 0.9714], 5e-5)
    expectClose(ys.map((y) => spearman(rx, y)), [0.9, 0.9, 0.9, 0.9], 1e-12)
    expectClose(ys.map((y) => kendallTauB(rx, y)), [0.8, 0.8, 0.8, 0.8], 1e-12)
  })

  it('Table 2: one tied pair (mid-ranks, e.g. 1.5, 1.5), competition ranks give the same', () => {
    const mid = [[1.5, 1.5, 3, 4, 5], [1, 2.5, 2.5, 4, 5], [1, 2, 3.5, 3.5, 5], [1, 2, 3, 4.5, 4.5]]
    const comp = [[1, 1, 3, 4, 5], [1, 2, 2, 4, 5], [1, 2, 3, 3, 5], [1, 2, 3, 4, 4]]
    // Spearman by hand (mid-ranks, Pearson): Σdxdy = 9.5, Σdx² = 10, Σdy² = 9.5 → 9.5 / √95 = 0.97468
    // τ_b: 9 concordant, 0 discordant, one pair tied in y → 9 / √(10 · 9) = 0.94868
    for (const ys of [mid, comp]) {
      expectClose(ys.map((y) => wsCoefficient(rx, y)), [0.8958, 0.9271, 0.9583, 0.9857], 5e-5)
      expectClose(ys.map((y) => spearman(rx, y)), [0.9747, 0.9747, 0.9747, 0.9747], 5e-5)
      expectClose(ys.map((y) => kendallTauB(rx, y)), [0.9487, 0.9487, 0.9487, 0.9487], 5e-5)
    }
  })

  it('Table 3: the best alternative moved to places 2..5', () => {
    // The ranking columns did not render in the open copy; these four are the only ones consistent with
    // the printed r_s (0.9, 0.6, 0.1, −0.6) and τ (0.8, 0.4, 0, −0.4) where A1 moves down and the rest stay.
    const ys = [[2, 1, 3, 4, 5], [3, 2, 1, 4, 5], [4, 2, 3, 1, 5], [5, 2, 3, 4, 1]]
    expectClose(ys.map((y) => spearman(rx, y)), [0.9, 0.6, 0.1, -0.6], 1e-12)
    expectClose(ys.map((y) => kendallTauB(rx, y)), [0.8, 0.4, 0, -0.4], 1e-12)
    // R4 by hand: 2^-1·4/4 + 2^-5·4/4 = 0.5 + 0.03125 = 0.53125 → WS = 0.46875 (printed 0.4688)
    expectClose(ys.map((y) => wsCoefficient(rx, y)), [0.7917, 0.625, 0.5625, 0.4688], 5e-5)
  })

  it('Table 4: as printed, except R2 (printed 0.3225, the formula gives 0.3255)', () => {
    const ys = [[2, 3, 4, 5, 1], [5, 1, 2, 3, 4], [2, 3, 5, 4, 1], [4, 2.5, 1, 5, 2.5]]
    expectClose(ys.map((y) => spearman(rx, y)), [0, 0, -0.1, -0.0513], 5e-5)
    expectClose(ys.map((y) => kendallTauB(rx, y)), [0.2, 0.2, 0, -0.1054], 5e-5)
    // R2: 2^-1·4/4 + 2^-2·1/3 + 2^-3·1/2 + 2^-4·1/3 + 2^-5·1/4 = 0.67448 → 0.32552. The paper prints 0.3225
    //     (two digits swapped, a print error); we test the formula value.
    // R4 (mid-ranks): 2^-1·3/4 + 2^-2·0.5/3 + 2^-3·2/2 + 2^-4·1/3 + 2^-5·2.5/4
    //     = 0.375 + 0.041667 + 0.125 + 0.020833 + 0.019531 = 0.582031 → 0.417969 (printed 0.4180)
    expectClose(ys.map((y) => wsCoefficient(rx, y)), [0.6771, 0.32552, 0.6354, 0.418], 5e-5)
  })
})

describe('agreement: properties and degenerate cases', () => {
  it('identical rankings give 1; reversed give Spearman −1, Kendall −1', () => {
    const x = [3, 1, 4, 2, 5]
    const rev = x.map((r) => 6 - r)
    expect(spearman(x, x)).toBe(1)
    expect(kendallTauB(x, x)).toBe(1)
    expect(wsCoefficient(x, x)).toBe(1)
    expect(spearman(x, rev)).toBeCloseTo(-1, 14)
    expect(kendallTauB(x, rev)).toBe(-1)
  })

  it('reversed 5-ranking WS by hand: 1 − (0.5 + 0.16667 + 0 + 0.041667 + 0.03125) = 0.260417', () => {
    expectClose(wsCoefficient([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]), 1 - (0.5 + 2 / 12 + 0 + 2 / 48 + 1 / 32), 1e-12)
  })

  it('WS is asymmetric: x = (1,2,3,4), y = (2,3,1,4) → 0.58333; swapped → 0.47917', () => {
    // ws(x, y): 2^-1·1/3 + 2^-2·1/2 + 2^-3·2/2 = 0.16667 + 0.125 + 0.125 = 0.41667 → 0.58333
    // ws(y, x): 2^-2·1/2 + 2^-3·1/2 + 2^-1·2/3 = 0.125 + 0.0625 + 0.33333 = 0.52083 → 0.47917
    expectClose(wsCoefficient([1, 2, 3, 4], [2, 3, 1, 4]), 7 / 12, 1e-12)
    expectClose(wsCoefficient([2, 3, 1, 4], [1, 2, 3, 4]), 1 - 25 / 48, 1e-12)
    // Spearman and Kendall are symmetric
    expect(spearman([1, 2, 3, 4], [2, 3, 1, 4])).toBeCloseTo(spearman([2, 3, 1, 4], [1, 2, 3, 4]), 15)
    expect(kendallTauB([1, 2, 3, 4], [2, 3, 1, 4])).toBe(kendallTauB([2, 3, 1, 4], [1, 2, 3, 4]))
  })

  it('Spearman with ties is the Pearson correlation of mid-ranks (competition input converted)', () => {
    // y = (1, 1, 3, 4) → mid-ranks (1.5, 1.5, 3, 4); x − 2.5 = (−1.5, −0.5, 0.5, 1.5), y − 2.5 = (−1, −1, 0.5, 1.5)
    // Σdxdy = 1.5 + 0.5 + 0.25 + 2.25 = 4.5; Σdx² = 5; Σdy² = 4.5 → ρ = 4.5 / √22.5 = 0.948683
    expectClose(spearman([1, 2, 3, 4], [1, 1, 3, 4]), 4.5 / Math.sqrt(22.5), 1e-12)
    // the tie-free shortcut 1 − 6Σd²/(n(n²−1)) would give 1 − 6·1/60 = 0.9 here; we must not use it with ties
    expect(Math.abs(spearman([1, 2, 3, 4], [1, 1, 3, 4]) - 0.9)).toBeGreaterThan(0.04)
    // without ties it equals the shortcut: d = (0, 1, −1, 0) → 1 − 6·2/60 = 0.8
    expectClose(spearman([1, 2, 3, 4], [1, 3, 2, 4]), 0.8, 1e-12)
  })

  it('Kendall τ_b by hand with ties in both: x = (1,1,3,4), y = (1,2,2,4)', () => {
    // pairs: (1,2) tied x; (1,3) c; (1,4) c; (2,3) tied y; (2,4) c; (3,4) c → n_c = 4, n_d = 0,
    // n0 = 6, n1 = 1, n2 = 1 → 4 / √(5 · 5) = 0.8
    expectClose(kendallTauB([1, 1, 3, 4], [1, 2, 2, 4]), 0.8, 1e-12)
  })

  it('degenerate: n = 1 → 1; all tied in both → 1; all tied in one → 0 (Spearman, Kendall)', () => {
    for (const f of [spearman, kendallTauB, wsCoefficient]) {
      expect(f([1], [1])).toBe(1)
      expect(f([], [])).toBe(1)
    }
    expect(spearman([1, 1, 1], [1, 1, 1])).toBe(1)
    expect(kendallTauB([1, 1, 1], [1, 1, 1])).toBe(1)
    expect(wsCoefficient([1, 1, 1], [1, 1, 1])).toBe(1)
    expect(spearman([1, 2, 3], [1, 1, 1])).toBe(0)
    expect(kendallTauB([1, 2, 3], [1, 1, 1])).toBe(0)
    expect(Number.isFinite(wsCoefficient([1, 1, 1], [1, 2, 3]))).toBe(true)
    expect(() => spearman([1, 2], [1])).toThrow(RangeError)
  })

  it('midRanks: competition ranks → mid-ranks; idempotent', () => {
    expect(midRanks([1, 1, 3, 4, 4])).toEqual([1.5, 1.5, 3, 4.5, 4.5])
    expect(midRanks([1.5, 1.5, 3, 4.5, 4.5])).toEqual([1.5, 1.5, 3, 4.5, 4.5])
    expect(midRanks([3, 1, 2])).toEqual([3, 1, 2])
  })
})

// ---------- Dirichlet ----------

describe('createRng (mulberry32)', () => {
  it('same seed, same sequence; different seed, different sequence; values in [0, 1)', () => {
    const a = createRng(42)
    const b = createRng(42)
    const c = createRng(43)
    const xa = Array.from({ length: 1000 }, a)
    expect(Array.from({ length: 1000 }, b)).toEqual(xa)
    expect(Array.from({ length: 1000 }, c)).not.toEqual(xa)
    expect(xa.every((x) => x >= 0 && x < 1)).toBe(true)
  })

  it('mean ≈ 1/2 and variance ≈ 1/12 over 100 000 draws (5 standard errors)', () => {
    const r = createRng(1)
    const N = 100000
    const xs = Array.from({ length: N }, r)
    const mean = sum(xs) / N
    const v = sum(xs.map((x) => (x - mean) ** 2)) / (N - 1)
    // SE(mean) = √(1/12 / N) ≈ 0.00091; SE(var) = √((1/80 − 1/144) / N) ≈ 0.00024
    expect(Math.abs(mean - 0.5)).toBeLessThan(5 * Math.sqrt(1 / 12 / N))
    expect(Math.abs(v - 1 / 12)).toBeLessThan(5 * Math.sqrt((1 / 80 - 1 / 144) / N))
  })
})

describe('sampleDirichlet', () => {
  /**
   * Mean α_j/α0 and variance α_j(α0 − α_j)/(α0²(α0 + 1)) of each component over N seeded draws.
   * Tolerance: 5 standard errors, SE(mean) = √(Var/N), SE(sample variance) ≈ √((m4 − s⁴)/N) with the sample's
   * own fourth central moment m4. A correct sampler fails this with probability ≈ 6e-7 per check; the seed is
   * fixed, so the test is deterministic.
   */
  function checkMoments(alpha: number[], seed: number, N = 20000) {
    const rng = createRng(seed)
    const draws = Array.from({ length: N }, () => sampleDirichlet(alpha, rng))
    const a0 = sum(alpha)
    alpha.forEach((a, j) => {
      const xs = draws.map((d) => d[j]!)
      const mean = sum(xs) / N
      const m2 = sum(xs.map((x) => (x - mean) ** 2)) / N
      const m4 = sum(xs.map((x) => (x - mean) ** 4)) / N
      const eMean = a / a0
      const eVar = (a * (a0 - a)) / (a0 * a0 * (a0 + 1))
      expect(Math.abs(mean - eMean), `mean[${j}]`).toBeLessThanOrEqual(5 * Math.sqrt(eVar / N) + 1e-15)
      expect(Math.abs(m2 - eVar), `var[${j}]`).toBeLessThanOrEqual(5 * Math.sqrt(Math.max(m4 - m2 * m2, 0) / N) + 1e-15)
    })
    for (const d of draws) {
      expect(Math.abs(sum(d) - 1)).toBeLessThan(1e-12)
      expect(d.every((x) => x >= 0 && Number.isFinite(x))).toBe(true)
    }
  }

  it('α ≥ 1: moments match (α = 2, 5, 1, 3)', () => checkMoments([2, 5, 1, 3], 11))
  it('α < 1: moments match (α = 0.3, 0.7, 2.5) — the U^(1/α) boost', () => checkMoments([0.3, 0.7, 2.5], 12))
  it('κ·w̄ around base weights (κ = 50, w̄ = CRITIC weights of the Krishnan example)', () =>
    checkMoments(krishnanW.map((w) => 50 * w), 13))
  it('uniform Dirichlet(1,1,1): each marginal has mean 1/3, variance 1/18', () => checkMoments([1, 1, 1], 14))

  it('a zero α component is always 0; the rest still sum to 1', () => {
    const rng = createRng(3)
    for (let i = 0; i < 2000; i++) {
      const d = sampleDirichlet([1, 0, 2], rng)
      expect(d[1]).toBe(0)
      expect(Math.abs(sum(d) - 1)).toBeLessThan(1e-12)
    }
  })

  it('tiny α (U^(1/α) underflows) never gives NaN', () => {
    const rng = createRng(5)
    for (let i = 0; i < 2000; i++) {
      const d = sampleDirichlet([1e-3, 1e-3, 1e-3], rng)
      expect(d.every(Number.isFinite)).toBe(true)
      expect(Math.abs(sum(d) - 1)).toBeLessThan(1e-12)
    }
  })

  it('rejects negative, non-finite or all-zero α', () => {
    const rng = createRng(1)
    expect(() => sampleDirichlet([1, -1], rng)).toThrow(RangeError)
    expect(() => sampleDirichlet([1, NaN], rng)).toThrow(RangeError)
    expect(() => sampleDirichlet([0, 0], rng)).toThrow(RangeError)
  })
})

// ---------- monteCarlo ----------

describe('monteCarlo', () => {
  it('is deterministic for a seed and changes with the seed', () => {
    const a = monteCarlo(krishnan, krishnanW, topsis, { concentration: 'uniform', n: 2000, seed: 9 })
    const b = monteCarlo(krishnan, krishnanW, topsis, { concentration: 'uniform', n: 2000, seed: 9 })
    const c = monteCarlo(krishnan, krishnanW, topsis, { concentration: 'uniform', n: 2000, seed: 10 })
    expect(b).toEqual(a)
    expect(c).not.toEqual(a)
  })

  it('defaults: n = 10 000, seed = 1', () => {
    const d = monteCarlo(krishnan, krishnanW, topsis, { concentration: 20 })
    expect(d.n).toBe(10000)
    expect(monteCarlo(krishnan, krishnanW, topsis, { concentration: 20, n: 10000, seed: 1 })).toEqual(d)
  })

  it('uniform: acceptability rows sum to 1, mean ranks sum to m(m+1)/2, intervals bracket the mean', () => {
    const r = monteCarlo(krishnan, krishnanW, topsis, { concentration: 'uniform', n: 4000, seed: 2 })
    const m = krishnan.alternatives.length
    expect(r.acceptability).toHaveLength(m)
    for (const row of r.acceptability) {
      expect(row).toHaveLength(m)
      expect(Math.abs(sum(row) - 1)).toBeLessThan(1e-12)
    }
    expect(sum(r.meanRank)).toBeCloseTo((m * (m + 1)) / 2, 10) // no ties in TOPSIS here
    r.rankInterval.forEach(([lo, hi], i) => {
      expect(lo).toBeLessThanOrEqual(r.meanRank[i]!)
      expect(hi).toBeGreaterThanOrEqual(r.meanRank[i]!)
      expect(lo).toBeGreaterThanOrEqual(1)
      expect(hi).toBeLessThanOrEqual(m)
    })
    expect(r.sameTop).toBeGreaterThan(0)
    expect(r.sameTop).toBeLessThan(1)
    expect(r.meanSpearman).toBeGreaterThanOrEqual(-1)
    expect(r.meanSpearman).toBeLessThanOrEqual(1)
    expect(r.meanWs).toBeGreaterThanOrEqual(0)
    expect(r.meanWs).toBeLessThanOrEqual(1)
  })

  it('very large κ: almost every run reproduces the base ranking', () => {
    const base = topsis.compute(krishnan, krishnanW, {}).ranking
    const r = monteCarlo(krishnan, krishnanW, topsis, { concentration: 1e7, n: 2000, seed: 4 })
    expect(r.sameTop).toBeGreaterThan(0.99)
    expect(r.meanSpearman).toBeGreaterThan(0.99)
    expect(r.meanWs).toBeGreaterThan(0.99)
    base.forEach((b, i) => {
      expect(r.acceptability[i]![b - 1]).toBeGreaterThan(0.99)
      expect(r.rankInterval[i]).toEqual([b, b])
      expect(r.meanRank[i]).toBeCloseTo(b, 1)
    })
    const u = monteCarlo(krishnan, krishnanW, topsis, { concentration: 'uniform', n: 2000, seed: 4 })
    expect(u.sameTop).toBeLessThan(r.sameTop)
  })

  it('uniform, two mirror-image alternatives: each first in ≈ 50 % of runs, interval [1, 2]', () => {
    // A = (3, 1), B = (1, 3), both benefit: A is first iff w1 > w2, and w1 ~ U(0, 1) under Dirichlet(1, 1).
    // SE of a share at N = 10 000 is ≤ 0.005; tolerance 4 SE.
    const p = makeProblem([[3, 1], [1, 3]], ['benefit', 'benefit'])
    const r = monteCarlo(p, [0.5, 0.5], topsis, { concentration: 'uniform' })
    expect(Math.abs(r.acceptability[0]![0]! - 0.5)).toBeLessThan(0.02)
    expect(r.rankInterval).toEqual([[1, 2], [1, 2]])
    expectClose(r.meanRank, [1.5, 1.5], 0.02)
  })

  it('uniform: an alternative dominated on every criterion is never first', () => {
    const p = makeProblem([[5, 1, 4], [1, 5, 4], [0.5, 0.5, 3]], ['benefit', 'benefit', 'benefit'])
    const r = monteCarlo(p, [1 / 3, 1 / 3, 1 / 3], topsis, { concentration: 'uniform', n: 3000 })
    expect(r.acceptability[2]![0]).toBe(0)
    expect(r.acceptability[2]![2]).toBe(1)
    expect(r.rankInterval[2]).toEqual([3, 3])
  })

  it('ties share the competition rank (1, 1, 3): acceptability rows still sum to 1', () => {
    // alternatives 0 and 1 identical → always tied: ranks (1, 1, 3) or (2, 2, 1). So 0 and 1 are never 3rd
    // and alternative 2 is never 2nd.
    const p = makeProblem([[3, 1], [3, 1], [1, 3]], ['benefit', 'benefit'])
    const r = monteCarlo(p, [0.5, 0.5], topsis, { concentration: 'uniform', n: 1000 })
    expect(r.acceptability[0]![2]).toBe(0)
    expect(r.acceptability[2]![1]).toBe(0)
    expect(r.acceptability[0]![0]! + r.acceptability[0]![1]!).toBe(1)
    expect(r.acceptability[0]).toEqual(r.acceptability[1])
    expect(r.acceptability[0]![0]).toBeCloseTo(r.acceptability[2]![2]!, 12)
    for (const row of r.acceptability) expect(Math.abs(sum(row) - 1)).toBeLessThan(1e-12)
  })

  it('a zero base weight stays 0 under κ (no Gamma(0) draw)', () => {
    const calls: number[][] = []
    const spy: RankingMethod = { ...topsis, compute: (p, w, x) => (calls.push(w), topsis.compute(p, w, x)) }
    monteCarlo(krishnan, [0.4, 0, 0.2, 0.2, 0.2], spy, { concentration: 30, n: 200 })
    expect(calls.slice(1).every((w) => w[1] === 0)).toBe(true)
  })

  it('rejects a non-positive concentration or n', () => {
    expect(() => monteCarlo(krishnan, krishnanW, topsis, { concentration: 0 })).toThrow(RangeError)
    expect(() => monteCarlo(krishnan, krishnanW, topsis, { concentration: 'uniform', n: 0 })).toThrow(RangeError)
  })
})

// ---------- removeCriteria ----------

const drop = (p: Problem, j: number): Problem => ({
  alternatives: p.alternatives,
  criteria: p.criteria.filter((_, c) => c !== j),
  matrix: p.matrix.map((r) => r.filter((_, c) => c !== j)),
})

describe('removeCriteria', () => {
  const base = topsis.compute(krishnan, krishnanW, {}).ranking

  it('renormalize: w_k / (1 − w_j), ranking = TOPSIS on the reduced matrix', () => {
    const rows = removeCriteria(krishnan, krishnanW, topsis)
    expect(rows).toHaveLength(5)
    rows.forEach((r, j) => {
      expect(r.j).toBe(j)
      expect(r.mode).toBe('renormalize')
      expect(r.weights).toHaveLength(5)
      expect(r.weights[j]).toBe(0)
      const expected = krishnanW.map((w, k) => (k === j ? 0 : w / (1 - krishnanW[j]!)))
      expectClose(r.weights, expected, 1e-15)
      const reducedW = r.weights.filter((_, k) => k !== j)
      expect(r.ranking).toEqual(topsis.compute(drop(krishnan, j), reducedW, {}).ranking)
      expect(r.spearman).toBe(spearman(base, r.ranking))
      expect(r.ws).toBe(wsCoefficient(base, r.ranking))
      expect(r.sameTop).toBe(tops(r.ranking) === tops(base))
    })
  })

  it('recompute with CRITIC: weights are exactly critic.compute on the reduced matrix', () => {
    const rows = removeCriteria(krishnan, krishnanW, topsis, critic)
    expect(rows.map((r) => [r.j, r.mode])).toEqual(
      [0, 1, 2, 3, 4].flatMap((j) => [
        [j, 'renormalize'],
        [j, 'recompute'],
      ]),
    )
    for (const r of rows.filter((x) => x.mode === 'recompute')) {
      const reduced = drop(krishnan, r.j)
      const w = critic.compute(reduced, {}).weights
      expect(r.weights.filter((_, k) => k !== r.j)).toEqual(w)
      expect(r.weights[r.j]).toBe(0)
      expect(r.ranking).toEqual(topsis.compute(reduced, w, {}).ranking)
    }
    // recompute really differs from renormalize for CRITIC (correlations change when a column goes)
    const r0 = rows.filter((x) => x.j === 0)
    expect(r0[0]!.weights).not.toEqual(r0[1]!.weights)
  })

  it('recompute with equal weights gives 1 / (n − 1)', () => {
    const rows = removeCriteria(krishnan, krishnanW, topsis, equal).filter((r) => r.mode === 'recompute')
    for (const r of rows) expectClose(r.weights.filter((_, k) => k !== r.j), [0.25, 0.25, 0.25, 0.25], 1e-15)
  })

  it('n ≤ 2 → no rows; a criterion carrying all the weight → the others share equally', () => {
    expect(removeCriteria(dummy2, [0.5, 0.5], topsis, critic)).toEqual([])
    const p = makeProblem([[1, 2, 3], [3, 1, 2], [2, 3, 1]], ['benefit', 'benefit', 'benefit'])
    const rows = removeCriteria(p, [1, 0, 0], topsis)
    expectClose(rows[0]!.weights, [0, 0.5, 0.5], 1e-15)
  })
})

describe('method options reach the methods', () => {
  it('removeCriteria recomputes with the weighting options it is given', () => {
    const minmax = { normalization: 'minmax' } as const
    const w = entropy.compute(krishnan, minmax).weights
    const rows = removeCriteria(krishnan, w, topsis, entropy, { weightingParams: minmax }).filter((r) => r.mode === 'recompute')
    const reduced: Problem = {
      alternatives: krishnan.alternatives,
      criteria: krishnan.criteria.slice(1),
      matrix: krishnan.matrix.map((r) => r.slice(1)),
    }
    expectClose(rows[0]!.weights.slice(1), entropy.compute(reduced, minmax).weights, 1e-15)
    expect(Math.abs(rows[0]!.weights[1]! - entropy.compute(reduced, {}).weights[0]!)).toBeGreaterThan(1e-3)
  })

  it('sweep, nudges and Monte Carlo pass the ranking options on', () => {
    const seen: MethodParams[] = []
    const spy: RankingMethod = { ...topsis, compute: (p, w, params) => (seen.push(params), topsis.compute(p, w, {})) }
    const params = { probe: 'x' }
    sweepWeight(krishnan, krishnanW, spy, 0, { steps: 4, params })
    perturbWeights(krishnan, krishnanW, spy, [0.1], params)
    monteCarlo(krishnan, krishnanW, spy, { concentration: 'uniform', n: 3, params })
    removeCriteria(krishnan, krishnanW, spy, undefined, { rankingParams: params })
    expect(seen.length).toBeGreaterThan(10)
    expect(seen.every((x) => x === params)).toBe(true)
  })
})

describe('sweepWeight with SAW (a second ranking method): Podvezko 2011, both normalizations', () => {
  const ex = examples.find((e) => e.id === 'podvezko-2011-baltic')!
  const p: Problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const w = ex.weights!
  for (const params of [{}, { normalization: 'sum' }] as const) {
    it(`${JSON.stringify(params)}: S is linear in w_k, so every switch point is where two straight lines cross`, () => {
      for (let k = 0; k < w.length; k++) {
        const sw = sweepWeight(p, w, saw, k, { params })
        // Scores along the grid are the method's own scores at those weights, with these options.
        for (const pt of sw.points) expect(pt.scores).toEqual(saw.compute(p, pt.weights, params).scores)
        // S_i(t) = a_i + b_i t: from the two ends, every crossing of a pair inside (0, 1) is known exactly.
        const s0 = sw.points[0]!.scores
        const s1 = sw.points[sw.points.length - 1]!.scores
        const crossings: number[] = []
        for (let a = 0; a < s0.length; a++)
          for (let b = a + 1; b < s0.length; b++) {
            const d0 = s0[a]! - s0[b]!
            const d1 = s1[a]! - s1[b]!
            if (d0 * d1 < 0) crossings.push(d0 / (d0 - d1))
          }
        const switches = sw.rankingIntervals.slice(1).map((iv) => iv.from)
        expect(switches.length, `criterion ${k}`).toBe(new Set(crossings.map((c) => c.toFixed(5))).size)
        for (const x of switches) expect(Math.min(...crossings.map((c) => Math.abs(c - x))), `criterion ${k}`).toBeLessThan(2e-6)
      }
    })
  }
})
