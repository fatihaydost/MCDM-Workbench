import type { MethodSteps } from './types'

/** ROC: the steps src/core/methods/roc.ts emits, with the formulas the code follows. */
export const roc = {
  flow: [
    { key: 'roc.ranks', stepKeys: ['roc.ranks'] },
    { key: 'roc.weights', stepKeys: ['roc.weights'] },
  ],
  steps: {
    'roc.ranks': {
      en: 'Importance rank of each criterion, where 1 is the most important.',
      tr: 'Her kriterin önem sırası; 1 en önemli kriteri gösterir.',
      tex: String.raw`r_j \in \{1, \dots, n\}`,
      edgeCase: {
        en: 'Tied criteria share the average of their occupied rank positions.',
        tr: 'Eşit önemdeki kriterler kapladıkları sıra konumlarının ortalamasını paylaşır.',
      },
      symbol: 'r',
      texSymbol: '$r_j$',
    },
    'roc.weights': {
      en: 'Criterion weights from the chosen rank formula: ROC, Rank Sum or Rank Reciprocal.',
      tr: 'Seçilen sıra formülünden kriter ağırlıkları: ROC, sıra toplamı veya ters sıra.',
      tex: String.raw`w_j = \frac{1}{n}\sum_{k=r_j}^{n}\frac{1}{k}, \qquad w_j = \frac{2(n + 1 - r_j)}{n(n + 1)}, \qquad w_j = \frac{1 / r_j}{\sum_{k=1}^{n} 1 / k}`,
      edgeCase: {
        en: 'Tied criteria receive the mean weight of their shared rank positions.',
        tr: 'Eşit sıradaki kriterler paylaştıkları konumların ortalama ağırlığını alır.',
      },
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
