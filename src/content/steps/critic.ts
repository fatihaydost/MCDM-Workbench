import type { MethodSteps } from './types'

/** CRITIC: the steps src/core/methods/critic.ts emits, with the formulas the code follows. */
export const critic = {
  /** CRITIC in five nodes: Normalize, Contrast, Correlation, Information, Weights. */
  flow: [
    { key: 'critic.normalized', stepKeys: ['critic.normalized'] },
    { key: 'critic.sigma', stepKeys: ['critic.sigma'] },
    { key: 'critic.correlation', stepKeys: ['critic.correlation', 'critic.conflict'] },
    { key: 'critic.information', stepKeys: ['critic.information', 'critic.informationTotal'] },
    { key: 'critic.weights', stepKeys: ['critic.weights'] },
  ],
  steps: {
    'critic.normalized': {
      en: 'Min-max normalized matrix: each column scaled to 0-1, 1 is best (cost reversed).',
      tr: 'Min-maks normalize matris: her sütun 0-1 aralığına iner, 1 en iyidir (maliyet ters).',
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
      edgeCase: {
        en: 'A constant column (max ≈ min, relative 1e-12) is 0 in every row.',
        tr: 'Sabit bir sütun (maks ≈ min, göreli 1e-12) her satırda 0 alınır.',
      },
    },
    'critic.sigma': {
      en: 'Contrast of each criterion: sample standard deviation of its normalized column.',
      tr: 'Her kriterin kontrastı: normalize sütununun örneklem standart sapması.',
      tex: String.raw`\sigma_j = \sqrt{\frac{1}{m-1}\sum_{i=1}^{m} \left(r_{ij} - \bar r_j\right)^2}, \qquad \bar r_j = \frac{1}{m}\sum_{i=1}^{m} r_{ij}`,
      symbol: 'σ',
      texSymbol: String.raw`$\sigma_j$`,
    },
    'critic.correlation': {
      en: 'Pearson correlation between every pair of normalized columns.',
      tr: 'Normalize sütunların her çifti arasındaki Pearson korelasyonu.',
      tex: String.raw`\rho_{jk} = \frac{\sum_{i=1}^{m} (r_{ij} - \bar r_j)(r_{ik} - \bar r_k)}{\sqrt{\sum_{i=1}^{m} (r_{ij} - \bar r_j)^2 \sum_{i=1}^{m} (r_{ik} - \bar r_k)^2}}, \qquad \rho_{jj} = 1`,
      edgeCase: {
        en: 'A pair with a constant column has no correlation; the table shows n/a.',
        tr: 'Sabit sütun içeren çiftin korelasyonu tanımsızdır; tabloda yok yazar.',
      },
    },
    'critic.conflict': {
      en: 'Conflict of each criterion with the others: the sum of 1 minus its correlations.',
      tr: 'Her kriterin diğerleriyle çatışması: 1 eksi korelasyonlarının toplamı.',
      tex: String.raw`\sum_{k=1}^{n} \left(1 - \rho_{jk}\right)`,
      edgeCase: {
        en: 'Constant columns are left out; their own conflict is 0.',
        tr: 'Sabit sütunlar toplama katılmaz; kendi çatışmaları 0 olur.',
      },
      symbol: 'Σ(1 − ρ)',
      texSymbol: String.raw`$\sum_k (1 - \rho_{jk})$`,
    },
    'critic.information': {
      en: 'Information content: contrast times conflict.',
      tr: 'Bilgi miktarı: kontrast ile çatışmanın çarpımı.',
      tex: String.raw`C_j = \sigma_j \sum_{k=1}^{n} \left(1 - \rho_{jk}\right)`,
      symbol: 'C',
      texSymbol: '$C_j$',
    },
    'critic.informationTotal': {
      en: 'Total information over all criteria, the denominator of the weights.',
      tr: 'Tüm kriterlerin toplam bilgi miktarı: ağırlıkların paydası.',
      tex: String.raw`\sum_{k=1}^{n} C_k`,
      symbol: 'ΣC',
      texSymbol: String.raw`$\sum_k C_k$`,
    },
    'critic.weights': {
      en: 'CRITIC weights: each criterion\'s share of the total information.',
      tr: 'CRITIC ağırlıkları: her kriterin toplam bilgi içindeki payı.',
      tex: String.raw`w_j = \frac{C_j}{\sum_{k=1}^{n} C_k}`,
      edgeCase: {
        en: 'If the total is 0 (every column constant), every weight is 1/n.',
        tr: 'Toplam 0 ise (bütün sütunlar sabit) her ağırlık 1/n olur.',
      },
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
