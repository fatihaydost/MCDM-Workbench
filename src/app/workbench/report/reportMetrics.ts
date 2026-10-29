import {
  ahpProgress,
  bwmProgress,
  rankerFor,
  type AhpParams,
  type Problem,
  type RankingResult,
} from '../../../core'
import { DEFAULT_DELTAS, perturbWeights, removeCriteria, sweepWeight } from '../../../core/robustness'
import { runFor } from '../../../state/workbench'
import { methodViews } from '../../methods/views'
import { rankOrder } from '../RankingStage'
import { heldCount, perturbGrid } from '../robustness/helpers'
import { findStep } from '../shared'
import type {
  CatSlot,
  ComputeExecutiveMetricsInput,
  CriteriaBand,
  CriterionDeltaItem,
  CriterionProfileLegendItem,
  CriterionProfileRow,
  CriterionStabilityItem,
  CriticalCriterion,
  ExecutiveReportMetrics,
  PerturbGridRow,
  WeightDiagnostics,
  WinnerSummary,
} from './types'

const EPS = 1e-12

/** Splits `0..n-1` into horizontal column bands of at most `maxCols` columns each for A4 tables. */
export function chunkCriteria(n: number, maxCols = 7): CriteriaBand[] {
  if (n <= 0) return []
  const step = Math.max(1, Math.floor(maxCols))
  const totalBands = Math.ceil(n / step)
  const bands: CriteriaBand[] = []
  for (let bandIndex = 0; bandIndex < totalBands; bandIndex++) {
    const start = bandIndex * step
    const end = Math.min(n, start + step)
    const cols: number[] = []
    for (let c = start; c < end; c++) cols.push(c)
    bands.push({ bandIndex, totalBands, cols })
  }
  return bands
}

/**
 * Returns one Set of row indices per criterion achieving the best raw value
 * (maximum for `'benefit'`, minimum for `'cost'`). Constant columns yield an empty Set.
 */
export function bestRowsPerCriterion(problem: Problem): Set<number>[] {
  const m = problem.alternatives.length
  const n = problem.criteria.length
  return Array.from({ length: n }, (_, col) => {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (let row = 0; row < m; row++) {
      const v = problem.matrix[row]?.[col]
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (v < min) min = v
        if (v > max) max = v
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || max - min <= EPS) {
      return new Set<number>()
    }
    const target = problem.criteria[col]?.type === 'cost' ? min : max
    const tol = EPS * Math.max(1, Math.abs(target))
    const best = new Set<number>()
    for (let row = 0; row < m; row++) {
      const v = problem.matrix[row]?.[col]
      if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v - target) <= tol) {
        best.add(row)
      }
    }
    return best
  })
}

function computeWinnerSummary(result: RankingResult): WinnerSummary {
  const order = rankOrder(result)
  const leaders: number[] = []
  result.ranking.forEach((r, idx) => {
    if (r === 1) leaders.push(idx)
  })
  const bestIndex = leaders[0] ?? order[0] ?? 0
  const runnerUpIndex = leaders.length === 1 && order.length > 1 ? (order[1] ?? null) : null
  const bestScore = result.scores[bestIndex] ?? 0
  const runnerUpScore = runnerUpIndex !== null ? (result.scores[runnerUpIndex] ?? null) : null

  const rawMargin =
    runnerUpScore !== null && Number.isFinite(bestScore) && Number.isFinite(runnerUpScore)
      ? Math.max(0, result.order === 'asc' ? runnerUpScore - bestScore : bestScore - runnerUpScore)
      : null

  let minScore = Number.POSITIVE_INFINITY
  let maxScore = Number.NEGATIVE_INFINITY
  for (const s of result.scores) {
    if (Number.isFinite(s)) {
      if (s < minScore) minScore = s
      if (s > maxScore) maxScore = s
    }
  }
  const span = maxScore - minScore
  const relativeMarginPct =
    rawMargin !== null && Number.isFinite(span) && span > EPS
      ? Math.min(100, Math.max(0, (rawMargin / span) * 100))
      : null

  return {
    leaders,
    bestIndex,
    runnerUpIndex,
    bestScore,
    runnerUpScore,
    rawMargin,
    relativeMarginPct,
    order: result.order,
  }
}

function computeWeightDiagnostics(input: ComputeExecutiveMetricsInput): WeightDiagnostics {
  const { problem, weights, weightMethod, methodParams, judgements } = input
  const n = problem.criteria.length

  if (weightMethod === 'ahp') {
    const prog = ahpProgress(problem, judgements, methodParams?.ahp as AhpParams | undefined)
    const diag = weights.diagnostics
    const lambdaMax = prog.lambdaMax ?? (typeof diag?.lambdaMax === 'number' ? diag.lambdaMax : null)
    const ci = prog.ci ?? (typeof diag?.ci === 'number' ? diag.ci : null)
    const cr = prog.cr ?? (typeof diag?.cr === 'number' ? diag.cr : null)
    const threshold = prog.threshold ?? (n >= 3 ? 0.1 : null)
    const inconsistent =
      prog.inconsistent || Boolean(weights.warnings?.some((w) => w.code === 'ahp.inconsistent'))
    return {
      kind: 'ahp',
      lambdaMax,
      ci,
      cr,
      threshold,
      inconsistent,
      worstPair: prog.worstPair
        ? {
            i: prog.worstPair.i,
            k: prog.worstPair.k,
            actual: prog.worstPair.actual,
            suggested: prog.worstPair.suggested,
          }
        : null,
    }
  }

  if (weightMethod === 'bwm') {
    const prog = bwmProgress(judgements ?? { best: null, worst: null, pairs: [] }, n)
    const diag = weights.diagnostics
    const xiFromDiag = typeof diag?.xiL === 'number' && Number.isFinite(diag.xiL) ? diag.xiL : null
    const xiFromStep = findStep(weights.steps, 'bwm.xi')?.scalar ?? null
    const xi = xiFromDiag ?? xiFromStep
    const crInput =
      prog.crInput ??
      (typeof diag?.crInput === 'number' && Number.isFinite(diag.crInput) ? diag.crInput : null)
    const threshold =
      prog.threshold?.value ??
      (typeof diag?.crThreshold === 'number' && Number.isFinite(diag.crThreshold)
        ? diag.crThreshold
        : null)
    const approximate = Boolean(
      prog.threshold?.approximate ||
        weights.warnings?.some((w) => w.code === 'bwm.threshold-approximate'),
    )
    const inconsistent = Boolean(
      prog.flagged !== null || weights.warnings?.some((w) => w.code === 'bwm.inconsistent'),
    )
    const flagged =
      prog.flagged ??
      (typeof diag?.mostInconsistent === 'number' && inconsistent ? diag.mostInconsistent : null)

    return {
      kind: 'bwm',
      best: judgements?.best ?? null,
      worst: judgements?.worst ?? null,
      xi,
      crInput,
      threshold,
      approximate,
      inconsistent,
      flagged,
    }
  }

  if (weightMethod !== 'manual') {
    const viewCols = methodViews[weightMethod]?.columns
    if (viewCols && viewCols.length > 0) {
      const columns = viewCols
        .map((col) => ({
          step: col.step,
          label: col.label,
          ...(col.decimals !== undefined ? { decimals: col.decimals } : {}),
          values: findStep(weights.steps, col.step)?.vector ?? [],
        }))
        .filter((c) => c.values.length > 0)
      if (columns.length > 0) {
        return { kind: 'columns', columns }
      }
    }
  }

  return { kind: 'none' }
}

/**
 * Computes all synchronous executive and method dashboard metrics for Page 1, Page 2, and Page 3+.
 */
export function computeExecutiveMetrics(input: ComputeExecutiveMetricsInput): ExecutiveReportMetrics {
  const { problem, weights, result, rankingMethod, methodParams, alternativeJudgements } = input
  const m = problem.alternatives.length
  const n = problem.criteria.length

  const winner = computeWinnerSummary(result)
  const order = rankOrder(result)

  const headToHeadPair: [number, number] | null =
    m < 2
      ? null
      : winner.leaders.length >= 2
        ? [winner.leaders[0]!, winner.leaders[1]!]
        : winner.runnerUpIndex !== null
          ? [winner.bestIndex, winner.runnerUpIndex]
          : [order[0] ?? 0, order[1] ?? 1]

  const criteriaByWeight = Array.from({ length: n }, (_, j) => j).sort(
    (a, b) => (weights.weights[b] ?? 0) - (weights.weights[a] ?? 0) || a - b,
  )

  // Normalized benefit/cost-oriented profile matrix: c[i][j] = w_j * r_tilde_{ij}
  const c: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0))
  for (let j = 0; j < n; j++) {
    const w = weights.weights[j] ?? 0
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (let i = 0; i < m; i++) {
      const v = problem.matrix[i]?.[j]
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (v < min) min = v
        if (v > max) max = v
      }
    }
    const span = max - min
    const isConst = !Number.isFinite(span) || span <= EPS
    const isCost = problem.criteria[j]?.type === 'cost'
    for (let i = 0; i < m; i++) {
      if (isConst) {
        c[i]![j] = w * 0.5
      } else {
        const raw = problem.matrix[i]?.[j] ?? min
        const rTilde = isCost ? (max - raw) / span : (raw - min) / span
        c[i]![j] = w * Math.min(1, Math.max(0, rTilde))
      }
    }
  }

  // Profile legend & stacked bar rows (cap at top 8 alternatives and 8 segments)
  const profileLegend: CriterionProfileLegendItem[] =
    n <= 8
      ? criteriaByWeight.map((col, idx) => ({
          key: String(col),
          col,
          catSlot: ((idx % 8) + 1) as CatSlot,
          weight: weights.weights[col] ?? 0,
        }))
      : [
          ...criteriaByWeight.slice(0, 7).map((col, idx) => ({
            key: String(col),
            col,
            catSlot: (idx + 1) as CatSlot,
            weight: weights.weights[col] ?? 0,
          })),
          {
            key: 'others',
            col: 'others',
            catSlot: 'other',
            weight: criteriaByWeight
              .slice(7)
              .reduce((acc, col) => acc + (weights.weights[col] ?? 0), 0),
            restCount: n - 7,
          },
        ]

  const tailCols = n > 8 ? criteriaByWeight.slice(7) : []
  const topAltOrder = order.slice(0, 8)
  const truncatedAlternatives = Math.max(0, m - 8)
  const criterionProfiles: CriterionProfileRow[] = topAltOrder.map((altIndex) => {
    const rowC = c[altIndex] ?? []
    const totalProfile = rowC.reduce((acc, v) => acc + v, 0)
    const segments = profileLegend.map((leg) => ({
      key: leg.key,
      col: leg.col,
      catSlot: leg.catSlot,
      value:
        leg.col === 'others'
          ? tailCols.reduce((acc, col) => acc + (rowC[col] ?? 0), 0)
          : (rowC[leg.col] ?? 0),
    }))
    return {
      altIndex,
      rank: result.ranking[altIndex] ?? 1,
      totalProfile,
      segments,
    }
  })

  // Head-to-Head #1 vs #2 deltas
  let headToHeadDeltas: CriterionDeltaItem[] = []
  let topAdvantageA: CriterionDeltaItem | null = null
  let topAdvantageB: CriterionDeltaItem | null = null
  if (headToHeadPair !== null) {
    const [pairA, pairB] = headToHeadPair
    const allDeltas: CriterionDeltaItem[] = Array.from({ length: n }, (_, col) => {
      const aShare = c[pairA]?.[col] ?? 0
      const bShare = c[pairB]?.[col] ?? 0
      return {
        col,
        type: problem.criteria[col]?.type ?? 'benefit',
        weight: weights.weights[col] ?? 0,
        aShare,
        bShare,
        delta: aShare - bShare,
      }
    })
    topAdvantageA =
      allDeltas
        .filter((d) => d.delta > 1e-9)
        .sort((x, y) => y.delta - x.delta || x.col - y.col)[0] ?? null
    topAdvantageB =
      allDeltas
        .filter((d) => d.delta < -1e-9)
        .sort((x, y) => x.delta - y.delta || x.col - y.col)[0] ?? null
    headToHeadDeltas = allDeltas
      .slice()
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || x.col - y.col)
      .slice(0, 6)
  }

  // Stability intervals, Perturbation grid, and Leave-One-Out removal
  const run = runFor({ methodParams, alternativeJudgements }, rankingMethod)
  const ranker = rankerFor(run)

  const topStabilityCols = criteriaByWeight.slice(0, 8)
  const truncatedStabilityCriteria = Math.max(0, n - 8)
  const sweepSteps = m * n > 400 ? 25 : 50

  const criterionStability: CriterionStabilityItem[] = topStabilityCols.map((col) => {
    const weight = weights.weights[col] ?? 0
    const type = problem.criteria[col]?.type ?? 'benefit'
    try {
      const sw = sweepWeight(problem, weights.weights, ranker, col, { steps: sweepSteps })
      const iv = { from: sw.baseTopInterval.from, to: sw.baseTopInterval.to }
      const leftMargin = iv.from > 1e-4 ? Math.max(0, weight - iv.from) : Number.POSITIVE_INFINITY
      const rightMargin =
        iv.to < 1 - 1e-4 ? Math.max(0, iv.to - weight) : Number.POSITIVE_INFINITY
      const minMargin = Math.min(leftMargin, rightMargin)
      const headroom = Number.isFinite(minMargin) ? minMargin : null
      return { col, type, weight, interval: iv, headroom }
    } catch {
      return { col, type, weight, interval: null, headroom: null }
    }
  })

  let criticalCriterion: CriticalCriterion | null = null
  for (const item of criterionStability) {
    if (item.interval !== null && item.headroom !== null) {
      if (criticalCriterion === null || item.headroom < criticalCriterion.headroom - 1e-9) {
        criticalCriterion = {
          col: item.col,
          weight: item.weight,
          from: item.interval.from,
          to: item.interval.to,
          headroom: item.headroom,
        }
      }
    }
  }

  const allSweepStable =
    criterionStability.some((x) => x.interval !== null) &&
    criterionStability.every((x) => x.interval === null || x.headroom === null)

  let perturbRows: ReturnType<typeof perturbWeights> = []
  try {
    perturbRows = perturbWeights(problem, weights.weights, ranker, DEFAULT_DELTAS)
  } catch {
    perturbRows = []
  }
  const { held: perturbHeld, total: perturbTotal } = heldCount(perturbRows, weights.weights)
  const rawGrid = perturbGrid(perturbRows, n, DEFAULT_DELTAS)
  const topPerturbCols = criteriaByWeight.slice(0, 7)
  const perturbGridRows: PerturbGridRow[] = topPerturbCols.map((col) => ({
    col,
    weight: weights.weights[col] ?? 0,
    cells: DEFAULT_DELTAS.map((delta, dIdx) => {
      const cell = rawGrid[col]?.[dIdx]
      if (!cell || cell.blocked) {
        return {
          delta,
          topAlt: null,
          tiedCount: 0,
          sameTop: false,
          blocked: Boolean(cell?.blocked),
        }
      }
      const cellLeaders: number[] = []
      cell.ranking.forEach((r, idx) => {
        if (r === 1) cellLeaders.push(idx)
      })
      return {
        delta,
        topAlt: cellLeaders[0] ?? null,
        tiedCount: cellLeaders.length,
        sameTop: cell.sameTop,
        blocked: false,
      }
    }),
  }))

  let removalRows: ReturnType<typeof removeCriteria> = []
  try {
    removalRows = removeCriteria(problem, weights.weights, ranker)
  } catch {
    removalRows = []
  }
  const unblockedRemovals = removalRows.filter((r) => !r.blocked)
  const removalHeld = unblockedRemovals.filter((r) => r.sameTop).length
  const flippedCols = unblockedRemovals
    .filter((r) => !r.sameTop)
    .map((r) => {
      const newLeaderIndices: number[] = []
      r.ranking.forEach((rk, idx) => {
        if (rk === 1) newLeaderIndices.push(idx)
      })
      return { col: r.j, newLeaderIndices }
    })

  return {
    winner,
    headToHeadPair,
    headToHeadDeltas,
    topAdvantageA,
    topAdvantageB,
    criterionProfiles,
    profileLegend,
    truncatedAlternatives,
    criterionStability,
    truncatedStabilityCriteria,
    criticalCriterion,
    allSweepStable,
    criteriaByWeight,
    weightDiagnostics: computeWeightDiagnostics(input),
    perturbationGrid: {
      deltas: DEFAULT_DELTAS,
      held: perturbHeld,
      total: perturbTotal,
      rows: perturbGridRows,
      truncatedCriteria: Math.max(0, n - 7),
    },
    removalSummary: {
      tested: unblockedRemovals.length,
      held: removalHeld,
      flippedCols,
    },
    matrixBands: chunkCriteria(n, 7),
    bestMatrixRows: bestRowsPerCriterion(problem),
  }
}
