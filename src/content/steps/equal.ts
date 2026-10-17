import type { MethodSteps } from './types'

/** Equal weights: src/core/methods/equal.ts emits this step and the store builds the same one; its text lives in i18n steps.equal.weights. */
export const equal = {
  steps: {
    'equal.weights': {
      tex: String.raw`w_j = \frac{1}{n}, \qquad j = 1, \dots, n`,
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
