import type { MethodSteps } from './types'

/** MEREC: the steps src/core/methods/merec.ts emits, with the formulas the code follows. */
export const merec = {
  /** MEREC in five nodes: Normalize, Performance, Without j, Removal effect, Weights. */
  flow: [
    { key: 'merec.normalized', stepKeys: ['merec.normalized', 'merec.absLog'] },
    { key: 'merec.performance', stepKeys: ['merec.performance'] },
    { key: 'merec.performanceRemoved', stepKeys: ['merec.performanceRemoved'] },
    { key: 'merec.removalEffect', stepKeys: ['merec.removalEffect'] },
    { key: 'merec.weights', stepKeys: ['merec.weights'] },
  ],
  steps: {
    'merec.normalized': {
      en: 'Normalized matrix n: the worst value of each column is 1, the best smallest.',
      tr: 'Normalize matris n: her sütunun en kötü değeri 1, en iyisi en küçüktür.',
      tex: String.raw`n_{ij} = \begin{cases} \dfrac{\min_k x_{kj}}{x_{ij}} & j \in J^{+} \\[2ex] \dfrac{x_{ij}}{\max_k x_{kj}} & j \in J^{-} \end{cases}`,
      edgeCase: {
        en: 'A constant column is set to 1 in every row, so it adds nothing.',
        tr: 'Sabit bir sütun her satırda 1 alınır; hiçbir şey eklemez.',
      },
    },
    'merec.absLog': {
      en: 'Absolute logarithm of each normalized value: 0 for the worst value.',
      tr: 'Her normalize değerin mutlak logaritması: en kötü değer için 0.',
      tex: String.raw`L_{ij} = \left|\ln n_{ij}\right| = -\ln n_{ij}`,
    },
    'merec.performance': {
      en: 'Overall performance of each alternative over all n criteria.',
      tr: 'Her alternatifin n kriterin tümü üzerinden genel performansı.',
      tex: String.raw`S_i = \ln\!\left(1 + \frac{1}{n}\sum_{j=1}^{n} L_{ij}\right)`,
      symbol: 'S',
      texSymbol: '$S_i$',
    },
    'merec.performanceRemoved': {
      en: 'Performance of each alternative with one criterion removed; the divisor stays n.',
      tr: 'Bir kriter çıkarılınca her alternatifin performansı; payda n kalır.',
      tex: String.raw`S'_{ij} = \ln\!\left(1 + \frac{1}{n}\sum_{k \ne j} L_{ik}\right)`,
    },
    'merec.removalEffect': {
      en: 'Removal effect: how much the performances drop when the criterion is removed.',
      tr: 'Çıkarma etkisi: kriter çıkarılınca performansların ne kadar düştüğü.',
      tex: String.raw`E_j = \sum_{i=1}^{m} \left|S'_{ij} - S_i\right|`,
      edgeCase: {
        en: 'Each term is computed as ln((n + R) / (n + R - L)), R = Σ L.',
        tr: 'Her terim ln((n + R) / (n + R - L)) olarak hesaplanır, R = Σ L.',
      },
      symbol: 'E',
      texSymbol: '$E_j$',
    },
    'merec.weights': {
      en: "MEREC weights: each criterion's share of the total removal effect.",
      tr: 'MEREC ağırlıkları: her kriterin toplam çıkarma etkisi içindeki payı.',
      tex: String.raw`w_j = \frac{E_j}{\sum_{k=1}^{n} E_k}`,
      edgeCase: {
        en: 'If the total is 0 (every column constant), every weight is 1/n.',
        tr: 'Toplam 0 ise (bütün sütunlar sabit) her ağırlık 1/n olur.',
      },
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
