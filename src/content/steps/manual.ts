import type { MethodSteps } from './types'

/** Manual weights: a step the store adds itself (src/state/workbench.ts); its text lives in i18n steps.manual.weights. */
export const manual = {
  steps: {
    'manual.weights': {
      tex: String.raw`w_j \ge 0, \qquad \sum_{j=1}^{n} w_j = 1`,
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
