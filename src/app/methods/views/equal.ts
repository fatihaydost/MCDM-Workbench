import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

export const equal: MethodView<'weighting'> = {
  kind: 'weighting',
  // As many equal bars as the rank-weights example has criteria, none in the accent.
  thumb: ({ problem }) => {
    const n = problem('roszkowska-2013-rank-weights').criteria.length
    return { kind: 'bars', values: Array.from({ length: n }, () => 1 / n), highlight: undefined }
  },
  idea: {
    example: 'roszkowska-2013-rank-weights',
    Picture: preloadable(() => import('./equal.pictures').then((m) => ({ default: m.Idea }))),
  },
  stage: preloadable(() => import('./equal.pictures').then((m) => ({ default: m.Stage }))),
}
