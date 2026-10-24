export type CriterionType = 'benefit' | 'cost'

export type Criterion = { name: string; type: CriterionType }

/** matrix[i][j] = value of alternative i on criterion j. */
export type Problem = {
  alternatives: string[]
  criteria: Criterion[]
  matrix: number[][]
}

/** What a dimension of a step runs over ('lambda': the WASPAS and CoCoSo λ grid 0, 0.1, ..., 1). */
export type Axis = 'alternatives' | 'criteria' | 'lambda'

/**
 * One intermediate result for the step-by-step view.
 * `key` is a stable id (later an i18n key), e.g. 'topsis.normalized'.
 * `axes` says what the rows and columns of a matrix ([rows, cols]) or the entries of a vector run over,
 * so a square problem (m = n) is still laid out correctly.
 */
export type Step =
  | { key: string; matrix: number[][]; axes: readonly [Axis, Axis]; vector?: never; scalar?: never }
  | { key: string; vector: number[]; axes: Exclude<Axis, 'lambda'>; matrix?: never; scalar?: never }
  | { key: string; scalar: number; matrix?: never; vector?: never; axes?: never }

/** A non-fatal note produced while computing (the result is still usable). */
export type MethodWarning = {
  code: string
  /** Criterion index, when the warning is about one column. */
  col?: number
  /** Alternative index, when the warning is about one row. */
  row?: number
  /** Optional numeric diagnostics (e.g. CR, threshold, worst pair indices and ratios). */
  extra?: Record<string, number>
}

export type WeightingResult = {
  weights: number[]
  steps: Step[]
  diagnostics?: Record<string, number>
  warnings?: MethodWarning[]
}

/** Value of one method option (a choice is a string, a number parameter a number). */
export type MethodParamValue = string | number

/** The options a method was run with, by key; a missing key means the method's default. */
export type MethodParams = Readonly<Record<string, MethodParamValue>>

/**
 * One option of a method, described as data so one generic control can render it (ADDING-A-METHOD.md §11).
 * 'choice': one of a few named options (Entropy normalization); 'number': a value in [min, max] (VIKOR v, WASPAS λ).
 */
export type ParamDescriptor =
  | { key: string; kind: 'choice'; options: readonly string[]; default: string }
  | { key: string; kind: 'number'; min: number; max: number; step: number; default: number }

/** Saaty's scale as stored: 1/9 … 1/2, 1, 2 … 9 (17 values). */
export type Ratio = number

/**
 * The user's answers about the criteria, index-aligned with problem.criteria (like the store's manualWeights).
 * pairs[i][j]: how many times criterion i matters more than j; null = not answered.
 * Invariants (kept by every writer and re-established on load): pairs is n × n, pairs[i][i] = 1,
 * pairs[j][i] = 1 / pairs[i][j], every value one of the 17 scale values.
 */
export type Judgements = {
  pairs: (Ratio | null)[][]
  /** BWM anchors, criterion indices; null until picked. AHP ignores them. */
  best: number | null
  worst: number | null
}

export interface WeightingMethod<P = {}> {
  id: string
  kind: 'weighting'
  /** What the method reads: the decision matrix (default) or the user's judgements. */
  reads?: 'data' | 'judgements'
  /** Options the method takes; absent when it has none. */
  params?: readonly ParamDescriptor[]
  compute(problem: Problem, params: P, judgements?: Judgements): WeightingResult
}

export type RankingResult = {
  scores: number[]
  /** Whether a higher ('desc') or lower ('asc') score is better. */
  order: 'desc' | 'asc'
  /** ranking[i] = 1-based rank of alternative i; ties share the rank (competition ranking: 1, 1, 3). */
  ranking: number[]
  steps: Step[]
  diagnostics?: Record<string, number>
  warnings?: MethodWarning[]
}

/**
 * Optional pairwise alternative comparison matrices per criterion (length n).
 * Entry j is `null` when criterion j takes its local priorities from the decision matrix,
 * or an m×m upper-triangular matrix of Saaty ratios when criterion j is compared pairwise.
 */
export type AlternativeJudgements = readonly ((Ratio | null)[][] | null)[]

export interface RankingMethod<P = {}> {
  id: string
  kind: 'ranking'
  requires?: { positiveValues?: boolean }
  /** Options the method takes; absent when it has none. */
  params?: readonly ParamDescriptor[]
  compute(problem: Problem, weights: number[], params: P, judgements?: AlternativeJudgements): RankingResult
}

export type Method = WeightingMethod | RankingMethod
