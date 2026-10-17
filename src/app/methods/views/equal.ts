import type { MethodView } from './types'

export const equal: MethodView<'weighting'> = {
  kind: 'weighting',
  // As many equal bars as the smartphones example has criteria, none in the accent.
  thumb: ({ problem }) => {
    const n = problem('krishnan-2021-smartphones').criteria.length
    return { kind: 'bars', values: Array.from({ length: n }, () => 1 / n), highlight: undefined }
  },
}
