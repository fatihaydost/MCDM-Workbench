import type { TFunction } from 'i18next'
import type { MethodId } from '../../../content/types'
import type { AlternativeJudgements, Judgements, MethodParams, Problem, RankingResult } from '../../../core'
import type { ExampleDataset } from '../../../data/examples'
import type { JudgementExample } from '../../../data/judgementExamples'
import type * as Geometry from '../../../features/illustrations/geometry'
import type { MethodThumbProps } from '../../../features/illustrations/MethodThumb'
import type { Preloadable } from '../../preloadable'

/** A method's picture on the Weights or Ranking stage, drawn on the current problem (the store's, as the core reads it). */
export type StagePictureProps = {
  problem: Problem
  weights: readonly number[]
  params: MethodParams
  judgements?: Judgements
  alternativeJudgements?: AlternativeJudgements
  className?: string
}

/** A method's picture at the top of its method page, drawn on its published example. */
export type IdeaPictureProps = { example: ExampleDataset; problem: Problem }

/** A judgement method's picture at the top of its method page, drawn on published answers (criterion names in the UI language). */
export type JudgementIdeaProps = { example: JudgementExample; criteria: readonly string[] }

/** What a catalogue thumbnail is computed with (passed in, so the view registry does not import the geometry). */
export type ThumbKit = {
  problem: (exampleId: string) => Problem
  weights: (exampleId: string) => number[]
  geometry: typeof Geometry
}

/** A method's own answer when it is more than "the first by score" (VIKOR: C1, C2 and the compromise set). */
export type Verdict = {
  /** The alternatives the method answers with, in its order (more than one: a set, not a single winner). */
  set: readonly number[]
  /** The conditions that fail, in words (empty when the answer is one alternative by the method's own rules). */
  failed: string[]
  /** The answer in words: "Compromise set: A7, A1, A8". */
  result: string
  /** Rows for the About sheet of the downloaded workbook. */
  about: (readonly [string, string])[]
}

/**
 * What the UI shows for one method id: one module per method in this folder. Every field but `kind` is optional;
 * a missing one means the generic part only (no picture, no extra columns, the first by score is the answer).
 */
export type MethodView<K extends 'weighting' | 'ranking' = 'weighting' | 'ranking'> = {
  kind: K
  /** Shared method card/page id when one method spans both weighting and ranking (`ahp-ranking` -> `'ahp'`). */
  page?: MethodId | undefined
  /** The picture on the method page and the published example it is drawn on. */
  idea?: { example: string; Picture: Preloadable<IdeaPictureProps> }
  /** The same for a method that reads judgements, not a matrix (BWM): drawn on a published judgement example. */
  judgementIdea?: { example: string; Picture: Preloadable<JudgementIdeaProps> }
  /** The picture on the method's catalogue card. */
  thumb?: (kit: ThumbKit) => MethodThumbProps
  /**
   * Intermediate results shown as table columns before the weight or score: step key and header key; ranking: `after`
   * puts one after the score (COPRAS's N), `decimals` overrides the score's 4.
   */
  columns?: readonly { step: string; label: string; after?: true; decimals?: number }[]
  /** Ranking: scalar steps that are one number for the whole table (MARCOS's f(K-), f(K+)), shown once above it. */
  constants?: readonly { step: string; symbol: string }[]
  /** Ranking: hide those columns below 640 px, so the score that decides the rank is never the one scrolled off. */
  columnsFromSm?: true
  /** The method's idea drawn on the current problem, on the Weights or Ranking stage. */
  stage?: Preloadable<StagePictureProps>
  /** Ranking: the stage picture shows every score as a bar in rank order, so it takes the score chart's place. */
  pictureShowsScores?: true
  /** Ranking: the method's own answer (Results headline and workbook, the rail, Compare's note). */
  verdict?: (result: RankingResult, names: readonly string[], t: TFunction, format: (v: number) => string) => Verdict | null
  /**
   * The landing page's "checked against published results" row: the example, and the tolerance its test uses with
   * where it is (`<file in tests/fixtures>#<path>`). The number is repeated so the page does not bundle the fixture;
   * views.test.ts keeps the two equal.
   */
  ledger?: { example: string; fixture: string; tolerance: number }
}
