import type { MethodView } from './types'

/** The user's own weights: the Weights stage has its own form for them, no picture and no catalogue card. */
export const manual: MethodView<'weighting'> = { kind: 'weighting' }
