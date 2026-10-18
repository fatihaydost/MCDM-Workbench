import type { MethodView } from './types'

/** BWM: the Weights stage asks the questions itself (judgements, not data), so no picture and no catalogue card yet. */
export const bwm: MethodView<'weighting'> = { kind: 'weighting' }
