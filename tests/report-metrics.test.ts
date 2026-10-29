import { describe, expect, it } from 'vitest'
import { ahp, bwm, critic, equal, topsis, vikor } from '../src/core'
import type { Judgements, Problem } from '../src/core'
import { bestRowsPerCriterion, chunkCriteria, computeExecutiveMetrics } from '../src/app/workbench/report/reportMetrics'

const mixedProblem: Problem = {
  alternatives: ['A1', 'A2', 'A3', 'A4'],
  criteria: [
    { name: 'C1', type: 'benefit' },
    { name: 'C2', type: 'cost' },
    { name: 'C3', type: 'benefit' },
    { name: 'C4', type: 'cost' },
  ],
  matrix: [
    [90, 20, 80, 15],
    [75, 10, 85, 25],
    [60, 30, 70, 20],
    [50, 40, 60, 35],
  ],
}

describe('reportMetrics', () => {
  it('computes desc winner margin, normalized criterion profiles, head-to-head deltas, stability intervals, and bestMatrixRows for TOPSIS + CRITIC', () => {
    const weights = critic.compute(mixedProblem, {})
    const result = topsis.compute(mixedProblem, weights.weights, {})
    const metrics = computeExecutiveMetrics({
      problem: mixedProblem,
      weights,
      result,
      weightMethod: 'critic',
      rankingMethod: 'topsis',
    })

    expect(metrics.winner.order).toBe('desc')
    expect(metrics.winner.leaders.length).toBe(1)
    expect(metrics.winner.runnerUpIndex).not.toBeNull()
    expect(metrics.winner.rawMargin).not.toBeNull()
    expect(metrics.winner.rawMargin!).toBeGreaterThan(0)
    expect(metrics.winner.rawMargin!).toBeCloseTo(
      metrics.winner.bestScore - metrics.winner.runnerUpScore!,
      10,
    )
    expect(metrics.winner.relativeMarginPct).not.toBeNull()
    expect(metrics.winner.relativeMarginPct!).toBeGreaterThan(0)
    expect(metrics.winner.relativeMarginPct!).toBeLessThanOrEqual(100)

    // Verify each row's totalProfile equals sum of segments and sum_j w_j * r_tilde_{ij}
    for (const row of metrics.criterionProfiles) {
      const segSum = row.segments.reduce((acc, s) => acc + s.value, 0)
      expect(row.totalProfile).toBeCloseTo(segSum, 9)
    }

    // With n = 4 <= 6, headToHeadDeltas covers all criteria and sums to profile(#1) - profile(#2)
    expect(metrics.headToHeadPair).toEqual([metrics.winner.bestIndex, metrics.winner.runnerUpIndex!])
    const [pairA, pairB] = metrics.headToHeadPair!
    const profileA = metrics.criterionProfiles.find((r) => r.altIndex === pairA)!.totalProfile
    const profileB = metrics.criterionProfiles.find((r) => r.altIndex === pairB)!.totalProfile
    const deltaSum = metrics.headToHeadDeltas.reduce((acc, d) => acc + d.delta, 0)
    expect(deltaSum).toBeCloseTo(profileA - profileB, 9)

    // Stability intervals contain base weight w_j
    expect(metrics.criterionStability).toHaveLength(4)
    for (const item of metrics.criterionStability) {
      expect(item.interval).not.toBeNull()
      expect(item.interval!.from).toBeLessThanOrEqual(item.weight + 1e-6)
      expect(item.interval!.to).toBeGreaterThanOrEqual(item.weight - 1e-6)
    }

    // Leave-One-Out removal summary
    expect(metrics.removalSummary.tested).toBe(4)
    expect(metrics.removalSummary.held + metrics.removalSummary.flippedCols.length).toBe(4)

    // bestMatrixRows marks max for benefit (cols 0, 2) and min for cost (cols 1, 3)
    const bestSets = bestRowsPerCriterion(mixedProblem)
    expect([...bestSets[0]!]).toEqual([0]) // max of [90, 75, 60, 50] is row 0
    expect([...bestSets[1]!]).toEqual([1]) // min of [20, 10, 30, 40] is row 1
    expect([...bestSets[2]!]).toEqual([1]) // max of [80, 85, 70, 60] is row 1
    expect([...bestSets[3]!]).toEqual([0]) // min of [15, 25, 20, 35] is row 0
    expect(metrics.bestMatrixRows).toEqual(bestSets)
  })

  it('computes non-negative ascending margin for VIKOR (order: asc)', () => {
    const weights = critic.compute(mixedProblem, {})
    const result = vikor.compute(mixedProblem, weights.weights, {})
    const metrics = computeExecutiveMetrics({
      problem: mixedProblem,
      weights,
      result,
      weightMethod: 'critic',
      rankingMethod: 'vikor',
    })

    expect(metrics.winner.order).toBe('asc')
    expect(metrics.winner.runnerUpScore).not.toBeNull()
    expect(metrics.winner.bestScore).toBeLessThanOrEqual(metrics.winner.runnerUpScore!)
    expect(metrics.winner.rawMargin).toBeCloseTo(
      metrics.winner.runnerUpScore! - metrics.winner.bestScore,
      10,
    )
    expect(metrics.winner.rawMargin!).toBeGreaterThanOrEqual(0)
  })

  it('handles tied #1 leaders and constant criterion columns without NaN', () => {
    const tiedProblem: Problem = {
      alternatives: ['T1', 'T2', 'T3'],
      criteria: [
        { name: 'BenefitCol', type: 'benefit' },
        { name: 'ConstantCol', type: 'cost' },
        { name: 'ThirdCol', type: 'benefit' },
      ],
      matrix: [
        [100, 50, 80],
        [100, 50, 80],
        [40, 50, 20],
      ],
    }
    const weights = equal.compute(tiedProblem, {})
    const result = topsis.compute(tiedProblem, weights.weights, {})
    const metrics = computeExecutiveMetrics({
      problem: tiedProblem,
      weights,
      result,
      weightMethod: 'equal',
      rankingMethod: 'topsis',
    })

    expect(metrics.winner.leaders).toEqual([0, 1])
    expect(metrics.headToHeadPair).toEqual([0, 1])

    // Constant column (col 1) yields finite r_tilde = 0.5 -> segment value = 0.5 * w_1
    for (const row of metrics.criterionProfiles) {
      expect(Number.isFinite(row.totalProfile)).toBe(true)
      const constSeg = row.segments.find((s) => s.col === 1)
      expect(constSeg).toBeDefined()
      expect(Number.isFinite(constSeg!.value)).toBe(true)
      expect(constSeg!.value).toBeCloseTo(0.5 * weights.weights[1]!, 9)
    }

    // Constant column produces an empty Set in bestMatrixRows
    expect(metrics.bestMatrixRows[1]!.size).toBe(0)
    expect([...metrics.bestMatrixRows[0]!]).toEqual([0, 1])
  })

  it('enforces row/column caps and groups tail criteria into others when m=12, n=10', () => {
    const m = 12
    const n = 10
    const largeProblem: Problem = {
      alternatives: Array.from({ length: m }, (_, i) => `A${i + 1}`),
      criteria: Array.from({ length: n }, (_, j) => ({
        name: `C${j + 1}`,
        type: j % 2 === 0 ? 'benefit' : 'cost',
      })),
      matrix: Array.from({ length: m }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i + 1) * 10 + ((i * 7 + j * 13) % 19)),
      ),
    }
    const customWeights = Array.from({ length: n }, (_, j) => (n - j) / ((n * (n + 1)) / 2))
    const weights = {
      weights: customWeights,
      steps: [{ key: 'manual.weights', vector: customWeights, axes: 'criteria' as const }],
    }
    const result = topsis.compute(largeProblem, weights.weights, {})
    const metrics = computeExecutiveMetrics({
      problem: largeProblem,
      weights,
      result,
      weightMethod: 'manual',
      rankingMethod: 'topsis',
    })

    expect(metrics.criterionProfiles).toHaveLength(8)
    expect(metrics.truncatedAlternatives).toBe(4)

    expect(metrics.profileLegend).toHaveLength(8)
    const othersItem = metrics.profileLegend[7]!
    expect(othersItem.col).toBe('others')
    expect(othersItem.catSlot).toBe('other')
    expect(othersItem.restCount).toBe(3)
    expect(othersItem.weight).toBeCloseTo(
      customWeights[7]! + customWeights[8]! + customWeights[9]!,
      9,
    )

    expect(metrics.criterionStability).toHaveLength(8)
    expect(metrics.truncatedStabilityCriteria).toBe(2)

    expect(metrics.perturbationGrid.rows).toHaveLength(7)
    expect(metrics.perturbationGrid.truncatedCriteria).toBe(3)

    const bands = chunkCriteria(10, 7)
    expect(bands).toEqual([
      { bandIndex: 0, totalBands: 2, cols: [0, 1, 2, 3, 4, 5, 6] },
      { bandIndex: 1, totalBands: 2, cols: [7, 8, 9] },
    ])
    expect(metrics.matrixBands).toEqual(bands)
  })

  it('extracts weightDiagnostics for ahp, bwm, critic (columns), and equal (none)', () => {
    const ahpJudgements: Judgements = {
      best: null,
      worst: null,
      pairs: [
        [null, 3, 5, 7],
        [null, null, 3, 5],
        [null, null, null, 3],
        [null, null, null, null],
      ],
    }
    const ahpWeights = ahp.compute(mixedProblem, {}, ahpJudgements)
    const ahpResult = topsis.compute(mixedProblem, ahpWeights.weights, {})
    const ahpMetrics = computeExecutiveMetrics({
      problem: mixedProblem,
      weights: ahpWeights,
      result: ahpResult,
      weightMethod: 'ahp',
      rankingMethod: 'topsis',
      judgements: ahpJudgements,
    })
    expect(ahpMetrics.weightDiagnostics.kind).toBe('ahp')
    if (ahpMetrics.weightDiagnostics.kind === 'ahp') {
      expect(ahpMetrics.weightDiagnostics.cr).not.toBeNull()
      expect(ahpMetrics.weightDiagnostics.worstPair).not.toBeNull()
    }

    const bwmJudgements: Judgements = {
      best: 0,
      worst: 3,
      pairs: [
        [1, 2, 4, 8],
        [null, 1, null, 4],
        [null, null, 1, 2],
        [null, null, null, 1],
      ],
    }
    const bwmWeights = bwm.compute(mixedProblem, {}, bwmJudgements)
    const bwmResult = topsis.compute(mixedProblem, bwmWeights.weights, {})
    const bwmMetrics = computeExecutiveMetrics({
      problem: mixedProblem,
      weights: bwmWeights,
      result: bwmResult,
      weightMethod: 'bwm',
      rankingMethod: 'topsis',
      judgements: bwmJudgements,
    })
    expect(bwmMetrics.weightDiagnostics.kind).toBe('bwm')
    if (bwmMetrics.weightDiagnostics.kind === 'bwm') {
      expect(bwmMetrics.weightDiagnostics.xi).not.toBeNull()
      expect(bwmMetrics.weightDiagnostics.crInput).not.toBeNull()
      expect(bwmMetrics.weightDiagnostics.best).toBe(0)
      expect(bwmMetrics.weightDiagnostics.worst).toBe(3)
    }

    const criticWeights = critic.compute(mixedProblem, {})
    const criticMetrics = computeExecutiveMetrics({
      problem: mixedProblem,
      weights: criticWeights,
      result: topsis.compute(mixedProblem, criticWeights.weights, {}),
      weightMethod: 'critic',
      rankingMethod: 'topsis',
    })
    expect(criticMetrics.weightDiagnostics.kind).toBe('columns')
    if (criticMetrics.weightDiagnostics.kind === 'columns') {
      expect(criticMetrics.weightDiagnostics.columns.length).toBeGreaterThan(0)
    }

    const equalWeights = equal.compute(mixedProblem, {})
    const equalMetrics = computeExecutiveMetrics({
      problem: mixedProblem,
      weights: equalWeights,
      result: topsis.compute(mixedProblem, equalWeights.weights, {}),
      weightMethod: 'equal',
      rankingMethod: 'topsis',
    })
    expect(equalMetrics.weightDiagnostics.kind).toBe('none')
  })
})
