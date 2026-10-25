import type { MethodSteps } from './types'

/** VIKOR: the steps src/core/methods/vikor.ts emits, with the formulas the code follows. */
export const vikor = {
  /** VIKOR in five nodes: Best and worst, Distances, S and R, Q, Threshold. */
  flow: [
    { key: 'vikor.best', stepKeys: ['vikor.best', 'vikor.worst'] },
    { key: 'vikor.weightedDistance', stepKeys: ['vikor.weightedDistance'] },
    { key: 'vikor.groupUtility', stepKeys: ['vikor.groupUtility', 'vikor.individualRegret'] },
    { key: 'vikor.q', stepKeys: ['vikor.q'] },
    { key: 'vikor.threshold', stepKeys: ['vikor.threshold'] },
  ],
  steps: {
    'vikor.best': {
      en: 'Best value of each criterion: largest for benefit, smallest for cost.',
      tr: 'Her kriterin en iyi değeri: faydada en büyük, maliyette en küçük.',
      tex: String.raw`f_j^{*} = \begin{cases} \max_i x_{ij} & j \in J^{+} \\ \min_i x_{ij} & j \in J^{-} \end{cases}`,
      symbol: 'f*',
      texSymbol: '$f^{*}_j$',
    },
    'vikor.worst': {
      en: 'Worst value of each criterion: the opposite end of its column.',
      tr: 'Her kriterin en kötü değeri: sütununun öbür ucu.',
      tex: String.raw`f_j^{-} = \begin{cases} \min_i x_{ij} & j \in J^{+} \\ \max_i x_{ij} & j \in J^{-} \end{cases}`,
      symbol: 'f−',
      texSymbol: '$f^{-}_j$',
    },
    'vikor.weightedDistance': {
      en: 'Weighted distance to the best: 0 at the best, the weight at the worst.',
      tr: 'En iyiye ağırlıklı uzaklık: en iyi değerde 0, en kötüde ağırlığın kendisi.',
      tex: String.raw`d_{ij} = w_j\, \frac{f_j^{*} - x_{ij}}{f_j^{*} - f_j^{-}}`,
      edgeCase: {
        en: 'A constant column (best = worst) gets 0 in every row.',
        tr: 'Sabit bir sütun (en iyi = en kötü) her satırda 0 alır.',
      },
    },
    'vikor.groupUtility': {
      en: 'Group utility S: the sum of the distances; lower is better.',
      tr: 'Grup faydası S: uzaklıkların toplamı; küçük olan iyidir.',
      tex: String.raw`S_i = \sum_{j=1}^{n} d_{ij}`,
      symbol: 'S',
      texSymbol: '$S_i$',
    },
    'vikor.individualRegret': {
      en: 'Individual regret R: the largest single distance; lower is better.',
      tr: 'Bireysel pişmanlık R: en büyük tek uzaklık; küçük olan iyidir.',
      tex: String.raw`R_i = \max_{j} d_{ij}`,
      symbol: 'R',
      texSymbol: '$R_i$',
    },
    'vikor.q': {
      en: 'Compromise index Q, between 0 and 1; lower ranks better.',
      tr: 'Uzlaşı indeksi Q, 0 ile 1 arasında; küçük olan önde sıralanır.',
      tex: String.raw`Q_i = v\, \frac{S_i - S^{*}}{S^{-} - S^{*}} + (1 - v)\, \frac{R_i - R^{*}}{R^{-} - R^{*}}, \qquad S^{*} = \min_i S_i,\ S^{-} = \max_i S_i`,
      edgeCase: {
        en: 'If every S (or R) is equal, Q rescales the other to 0-1.',
        tr: 'Bütün S (ya da R) eşitse Q diğer terimi 0-1 aralığına ölçekler.',
      },
      symbol: 'Q',
      texSymbol: '$Q_i$',
    },
    'vikor.threshold': {
      en: 'Advantage threshold DQ: the Q gap the leader needs over the runner-up.',
      tr: 'Avantaj eşiği DQ: liderin ikinciye karşı gereken Q farkı.',
      tex: String.raw`DQ = \frac{1}{m - 1}, \qquad Q(a'') - Q(a') \ge DQ`,
      symbol: 'DQ',
      texSymbol: '$DQ$',
    },
  },
} satisfies MethodSteps
