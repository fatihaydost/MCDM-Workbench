import type { MethodSteps } from './types'

/** SD: the steps src/core/methods/sd.ts emits, with the formulas the code follows. */
export const sd = {
  /** SD in three nodes: Normalize, Spread, Weights. */
  flow: [
    { key: 'sd.normalized', stepKeys: ['sd.normalized'] },
    { key: 'sd.sigma', stepKeys: ['sd.sigma'] },
    { key: 'sd.weights', stepKeys: ['sd.sigmaTotal', 'sd.weights'] },
  ],
  steps: {
    'sd.normalized': {
      en: 'Min-max normalized matrix: each column scaled to 0-1, 1 is best (cost reversed).',
      tr: 'Min-maks normalize matris: her sütun 0-1 aralığına iner, 1 en iyidir (maliyet ters).',
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
      edgeCase: {
        en: 'A constant column (max ≈ min, relative 1e-12) is 0 in every row.',
        tr: 'Sabit bir sütun (maks ≈ min, göreli 1e-12) her satırda 0 alınır.',
      },
    },
    'sd.sigma': {
      en: 'Spread of each criterion: sample standard deviation of its normalized column.',
      tr: 'Her kriterin yayılımı: normalize sütununun örneklem standart sapması.',
      tex: String.raw`\sigma_j = \sqrt{\frac{1}{m-1}\sum_{i=1}^{m} \left(r_{ij} - \bar r_j\right)^2}, \qquad \bar r_j = \frac{1}{m}\sum_{i=1}^{m} r_{ij}`,
      edgeCase: {
        en: 'Diakoulaki et al. (1995) print the population value (1/m); the weights are the same.',
        tr: 'Diakoulaki vd. (1995) anakütle değerini (1/m) basar; ağırlıklar aynıdır.',
      },
      symbol: 'σ',
      texSymbol: String.raw`$\sigma_j$`,
    },
    'sd.sigmaTotal': {
      en: 'Total spread over all criteria, the denominator of the weights.',
      tr: 'Tüm kriterlerin toplam yayılımı: ağırlıkların paydası.',
      tex: String.raw`\sum_{k=1}^{n} \sigma_k`,
      symbol: 'Σσ',
      texSymbol: String.raw`$\sum_k \sigma_k$`,
    },
    'sd.weights': {
      en: "SD weights: each criterion's share of the total spread.",
      tr: 'SD ağırlıkları: her kriterin toplam yayılım içindeki payı.',
      tex: String.raw`w_j = \frac{\sigma_j}{\sum_{k=1}^{n} \sigma_k}`,
      edgeCase: {
        en: 'If the total is 0 (every column constant), every weight is 1/n.',
        tr: 'Toplam 0 ise (bütün sütunlar sabit) her ağırlık 1/n olur.',
      },
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
