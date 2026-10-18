import type { Bilingual } from '../types'

/** A node of the step map: its key is the first core step key it covers. */
export type FlowNode = { key: string; stepKeys: readonly string[] }

/**
 * What the worked calculation shows for one core step (Step.key in src/core/methods/*.ts).
 * `en` / `tr`: one-line explanation, absent only where the text lives in i18n steps.* (equal, manual).
 * Formulas follow the code, including its edge cases.
 * Notation: i = alternative (1..m), j, k = criterion (1..n), J+ benefit and J- cost criteria.
 */
export type StepContent = {
  tex: string
  /** What the code does in the degenerate case, when it differs from the plain formula. */
  edgeCase?: Bilingual
  /** Row label of a vector or scalar step in the table and in TSV (plain text); the step name when absent. */
  symbol?: string
  /** The same label in TeX math for the LaTeX copy (pdfLaTeX has no σ in text mode). */
  texSymbol?: string
  /** Cells marked by sign (MABAC's Q: above the border or below it), with a glyph as well as a colour. */
  signed?: true
} & (Bilingual | { en?: never; tr?: never })

/** One method's steps, keyed by step key, and its optional step map. */
export type MethodSteps = {
  flow?: readonly FlowNode[]
  steps: Readonly<Record<string, StepContent>>
}
