import type {
  AlternativeJudgements,
  Comparison,
  CriterionType,
  Judgements,
  MethodParams,
  Problem,
  RankingResult,
  WeightingResult,
} from '../../../core'
import type { DraftProblem, RankingMethodId, WeightMethodId } from '../../../state/workbench'
import type { Verdict } from '../../methods/views'

export type CatSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'other'

export type WinnerSummary = {
  /** All alternatives with rank === 1 in input order. */
  leaders: number[]
  /** Primary leader index (`leaders[0]`, or `0`). */
  bestIndex: number
  /** Next alternative in rankOrder when `leaders.length === 1`, or `null` if all alternatives tie for #1. */
  runnerUpIndex: number | null
  bestScore: number
  runnerUpScore: number | null
  /** Oriented non-negative score gap between #1 and #2 (`best - runnerUp` for `desc`, `runnerUp - best` for `asc`). */
  rawMargin: number | null
  /** Margin as percentage (0..100) of total finite score span across all alternatives; `null` when span <= 1e-12. */
  relativeMarginPct: number | null
  order: 'asc' | 'desc'
}

export type CriterionProfileSegment = {
  key: string
  col: number | 'others'
  catSlot: CatSlot
  /** Weighted min-max normalized contribution c_{ij} = w_j * r_tilde_{ij} >= 0. */
  value: number
}

export type CriterionProfileLegendItem = {
  key: string
  col: number | 'others'
  catSlot: CatSlot
  weight: number
  /** Number of grouped tail criteria when `col === 'others'`. */
  restCount?: number
}

export type CriterionProfileRow = {
  altIndex: number
  rank: number
  totalProfile: number
  segments: CriterionProfileSegment[]
}

export type CriterionDeltaItem = {
  col: number
  type: CriterionType
  weight: number
  aShare: number
  bShare: number
  /** Signed weighted contribution gap: `aShare - bShare` (> 0 favors `pairA`, < 0 favors `pairB`). */
  delta: number
}

export type CriterionStabilityItem = {
  col: number
  type: CriterionType
  weight: number
  /** Stability interval `[from, to]` in [0, 1] where the base top-ranked set holds; `null` if sweep is unavailable. */
  interval: { from: number; to: number } | null
  /** Distance from `weight` to nearest genuine switch boundary inside `(0, 1)`; `null` if #1 holds across all `[0, 1]`. */
  headroom: number | null
}

export type CriticalCriterion = {
  col: number
  weight: number
  from: number
  to: number
  headroom: number
}

export type WeightDiagnostics =
  | {
      kind: 'ahp'
      lambdaMax: number | null
      ci: number | null
      cr: number | null
      threshold: number | null
      inconsistent: boolean
      worstPair: { i: number; k: number; actual: number; suggested: number } | null
    }
  | {
      kind: 'bwm'
      best: number | null
      worst: number | null
      xi: number | null
      crInput: number | null
      threshold: number | null
      approximate: boolean
      inconsistent: boolean
      flagged: number | null
    }
  | {
      kind: 'columns'
      columns: { step: string; label: string; decimals?: number; values: (number | undefined)[] }[]
    }
  | {
      kind: 'none'
    }

export type PerturbGridCell = {
  delta: number
  /** Primary top-ranked alternative index at this perturbation, or `null` when blocked. */
  topAlt: number | null
  /** Number of tied #1 alternatives at this perturbation. */
  tiedCount: number
  sameTop: boolean
  blocked: boolean
}

export type PerturbGridRow = {
  col: number
  weight: number
  cells: PerturbGridCell[]
}

export type PerturbationGridSummary = {
  deltas: readonly number[]
  held: number
  total: number
  rows: PerturbGridRow[]
  truncatedCriteria: number
}

export type RemovalSummary = {
  tested: number
  held: number
  flippedCols: { col: number; newLeaderIndices: number[] }[]
}

export type CriteriaBand = {
  bandIndex: number
  totalBands: number
  cols: number[]
}

export type ExecutiveReportMetrics = {
  winner: WinnerSummary
  /** Pair compared in Head-to-Head Tornado (`[bestIndex, runnerUpIndex]` or `[leaders[0], leaders[1]]`), `null` if `m < 2`. */
  headToHeadPair: [number, number] | null
  /** Top 6 criteria sorted by `|delta|` descending for the Tornado chart. */
  headToHeadDeltas: CriterionDeltaItem[]
  /** Largest positive delta (`> 1e-9`) favoring `headToHeadPair[0]`. */
  topAdvantageA: CriterionDeltaItem | null
  /** Most negative delta (`< -1e-9`) favoring `headToHeadPair[1]`. */
  topAdvantageB: CriterionDeltaItem | null
  /** Top 8 alternatives in rank order with normalized weighted criterion profile segments. */
  criterionProfiles: CriterionProfileRow[]
  profileLegend: CriterionProfileLegendItem[]
  truncatedAlternatives: number
  /** Top 8 criteria by descending weight with `[w_min, w_max]` stability intervals. */
  criterionStability: CriterionStabilityItem[]
  truncatedStabilityCriteria: number
  criticalCriterion: CriticalCriterion | null
  /** True when at least one criterion has a valid sweep interval and none switch within `(0, 1)`. */
  allSweepStable: boolean
  /** Full criterion indices sorted by descending weight (ties broken by input index). */
  criteriaByWeight: number[]
  weightDiagnostics: WeightDiagnostics
  perturbationGrid: PerturbationGridSummary
  removalSummary: RemovalSummary
  /** Horizontally chunked criterion column bands (`<= 7` criteria per band) for the Page 3+ Audit Appendix. */
  matrixBands: CriteriaBand[]
  /** Per-criterion set of row indices achieving the best raw value (empty set when column is constant). */
  bestMatrixRows: Set<number>[]
}

export type ComputeExecutiveMetricsInput = {
  problem: Problem
  weights: WeightingResult
  result: RankingResult
  weightMethod: WeightMethodId
  rankingMethod: RankingMethodId
  methodParams?: Partial<Record<string, MethodParams | undefined>> | undefined
  judgements?: Judgements | undefined
  alternativeJudgements?: AlternativeJudgements | undefined
}

export type ReportDocumentProps = {
  problem: DraftProblem
  weights: WeightingResult
  result: RankingResult
  weightMethod: WeightMethodId
  rankingMethod: RankingMethodId
  weightLabel: string
  rankingLabel: string
  verdict: Verdict | null
  includeAppendix?: boolean | undefined
  comparison?: Comparison | undefined
  metrics?: ExecutiveReportMetrics | undefined
}
