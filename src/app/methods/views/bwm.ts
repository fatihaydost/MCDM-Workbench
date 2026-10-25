import { bwmAnswers, bwmSolve } from '../../../core'
import { getJudgementExample } from '../../../data/judgementExamples'
import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./bwm.pictures')

/** BWM reads judgements, not data: its method page draws on published answers (Rezaei 2016, Example 3). */
export const bwm: MethodView<'weighting'> = {
  kind: 'weighting',
  judgementIdea: {
    example: 'rezaei-2016-car',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  // Example 3's weights as bars, the largest in the accent.
  thumb: ({ geometry }) => {
    const a = bwmAnswers(getJudgementExample('rezaei-2016-car')!.judgements)!
    const { weights } = bwmSolve(a.bestToOthers as number[], a.othersToWorst as number[], a.best, a.worst)
    return { kind: 'bars', values: weights, highlight: geometry.argMax(weights) }
  },
  columns: [
    { step: 'bwm.bestToOthers', label: 'workbench.stepNames.bwm.bestToOthers', decimals: 0 },
    { step: 'bwm.othersToWorst', label: 'workbench.stepNames.bwm.othersToWorst', decimals: 0 },
    { step: 'bwm.consistencyLocal', label: 'workbench.stepNames.bwm.consistencyLocal', decimals: 4 },
  ],
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: { example: 'rezaei-2016-car', fixture: 'bwm-rezaei2016-car.json#tolerance_vs_published', tolerance: 6e-5 },
}
