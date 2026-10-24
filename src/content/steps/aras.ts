import type { MethodSteps } from './types'

/** ARAS: the steps src/core/methods/aras.ts emits, with the formulas the code follows. */
export const aras = {
  /** ARAS in four nodes: Optimal row, Normalize & weight, Optimality S, Utility degree K. */
  flow: [
    { key: 'aras.optimalRow', stepKeys: ['aras.optimalRow'] },
    { key: 'aras.normalized', stepKeys: ['aras.normalized', 'aras.weighted'] },
    { key: 'aras.optimalScore', stepKeys: ['aras.optimalScore', 'aras.optimality'] },
    { key: 'aras.utilityDegree', stepKeys: ['aras.utilityDegree'] },
  ],
  steps: {
    'aras.optimalRow': {
      en: 'Optimal row A0: each criterion best value, maximum for benefit, minimum for cost.',
      tr: 'Optimal satır A0: her kriterin en iyisi; faydada maksimum, maliyette minimum değer.',
      tex: String.raw`x_{0j} = \begin{cases} \max_{1 \le i \le m} x_{ij} & j \in J^{+} \\ \min_{1 \le i \le m} x_{ij} & j \in J^{-} \end{cases}`,
      symbol: 'A0',
      texSymbol: '$x_{0j}$',
    },
    'aras.normalized': {
      en: 'Cost values are inverted with 1/x, then each extended column sums to 1.',
      tr: 'Maliyet değerleri 1/x ile ters çevrilir; ardından genişletilmiş her sütunun toplamı 1 olur.',
      tex: String.raw`\bar{x}_{ij} = \frac{x^{*}_{ij}}{\sum_{k=0}^{m} x^{*}_{kj}}, \qquad x^{*}_{ij} = \begin{cases} x_{ij} & j \in J^{+} \\[1ex] \dfrac{1}{x_{ij}} & j \in J^{-} \end{cases}`,
    },
    'aras.weighted': {
      en: 'Weighted normalized values: each normalized share multiplied by its criterion weight.',
      tr: 'Ağırlıklı normalize değerler: her normalize pay kendi kriter ağırlığıyla çarpılır.',
      tex: String.raw`\hat{x}_{ij} = w_j\, \bar{x}_{ij}`,
    },
    'aras.optimalScore': {
      en: 'Optimality score S0 of the optimal row A0, the benchmark total.',
      tr: 'Optimal satır A0 için optimallik skoru S0; kıyas alınan toplam.',
      tex: String.raw`S_0 = \sum_{j=1}^{n} w_j\, \bar{x}_{0j}`,
      symbol: 'S0',
      texSymbol: '$S_0$',
    },
    'aras.optimality': {
      en: 'Optimality function S of each alternative: the row sum of weighted values.',
      tr: 'Her alternatifin optimallik fonksiyonu S: ağırlıklı değerlerin satır toplamı.',
      tex: String.raw`S_i = \sum_{j=1}^{n} \hat{x}_{ij}`,
      symbol: 'S',
      texSymbol: '$S_i$',
    },
    'aras.utilityDegree': {
      en: 'Utility degree K: each alternative score S divided by S0; higher ranks better.',
      tr: 'Fayda derecesi K: her alternatifin S skorunun S0 değerine oranı; yüksek olan öndedir.',
      tex: String.raw`K_i = \frac{S_i}{S_0}`,
      symbol: 'K',
      texSymbol: '$K_i$',
    },
  },
} satisfies MethodSteps
