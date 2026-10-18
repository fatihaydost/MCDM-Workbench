import type { MethodSteps } from './types'

/** BWM: the steps src/core/methods/bwm.ts emits, with the formulas the code follows (card steps 1, 3, 5). */
export const bwm = {
  /** BWM in three nodes: the two answer vectors, the consistency check, the fitted weights. */
  flow: [
    { key: 'bwm.bestToOthers', stepKeys: ['bwm.bestToOthers', 'bwm.othersToWorst'] },
    { key: 'bwm.consistencyLocal', stepKeys: ['bwm.consistencyLocal'] },
    { key: 'bwm.weights', stepKeys: ['bwm.xi', 'bwm.weights'] },
  ],
  steps: {
    'bwm.bestToOthers': {
      en: 'Best over others: how much more important the best criterion is than each, 1-9.',
      tr: 'En iyinin diğerlerine üstünlüğü: en iyi kriter her birinden kaç kat önemli, 1-9.',
      tex: String.raw`a_B = (a_{B1}, \dots, a_{Bn}), \qquad a_{BB} = 1`,
    },
    'bwm.othersToWorst': {
      en: 'Others over worst: how much more important each criterion is than the worst, 1-9.',
      tr: 'Diğerlerinin en kötüye üstünlüğü: her kriter en kötüden kaç kat önemli, 1-9.',
      tex: String.raw`a_W = (a_{1W}, \dots, a_{nW}), \qquad a_{WW} = 1`,
    },
    'bwm.consistencyLocal': {
      en: 'Consistency per criterion: how far a_Bj times a_jW is from a_BW.',
      tr: 'Kriter başına tutarlılık: a_Bj ile a_jW çarpımı a_BW değerinden ne kadar uzak.',
      tex: String.raw`CR^{I}_j = \frac{\left|a_{Bj}\, a_{jW} - a_{BW}\right|}{a_{BW}\left(a_{BW} - 1\right)}, \qquad CR^{I} = \max_j CR^{I}_j`,
      edgeCase: {
        en: '0 when a_BW = 1.',
        tr: 'a_BW = 1 ise 0.',
      },
      symbol: 'CR^I_j',
      texSymbol: String.raw`$CR^{I}_j$`,
    },
    'bwm.xi': {
      en: 'Deviation: the largest gap between the answers and the fitted weights.',
      tr: 'Sapma: yanıtlarla uyarlanan ağırlıklar arasındaki en büyük fark.',
      tex: String.raw`\min\ \xi^{L} \quad \text{s.t.}\quad \left|w_B - a_{Bj} w_j\right| \le \xi^{L},\ \ \left|w_j - a_{jW} w_W\right| \le \xi^{L}`,
      symbol: 'ξ^L',
      texSymbol: String.raw`$\xi^{L}$`,
    },
    'bwm.weights': {
      en: 'BWM weights: the linear model, solved in closed form, summing to 1.',
      tr: 'BWM ağırlıkları: doğrusal model, kapalı biçimde çözülür, toplamı 1.',
      tex: String.raw`\sum_j w_j = 1,\quad w_j \ge 0`,
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
