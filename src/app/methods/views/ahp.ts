import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./ahp.pictures')

/** Saaty (2008), Table 3: eigenvector weights for the five job criteria (saaty-2008-job). */
const W = [0.0360501, 0.1219027, 0.2618926, 0.0745529, 0.5056017]

export const ahp: MethodView<'weighting'> = {
  kind: 'weighting',
  judgementIdea: {
    example: 'saaty-2008-job',
    Picture: preloadable(() => pictures().then((m) => ({ default: m.Idea }))),
  },
  thumb: ({ geometry }) => ({ kind: 'bars', values: W, highlight: geometry.argMax(W) }),
  stage: preloadable(() => pictures().then((m) => ({ default: m.Stage }))),
  ledger: { example: 'saaty-2008-job', fixture: 'ahp-saaty2008-job.json#tolerance_vs_published', tolerance: 0.0005 },
}
