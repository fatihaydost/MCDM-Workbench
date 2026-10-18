import type { MethodSteps } from './types'

/** CoCoSo: the steps src/core/methods/cocoso.ts emits, with the formulas the code follows. */
export const cocoso = {
  /** CoCoSo in five nodes: Normalize, S and P, Three readings, k, λ sweep. */
  flow: [
    { key: 'cocoso.normalized', stepKeys: ['cocoso.normalized'] },
    { key: 'cocoso.s', stepKeys: ['cocoso.s', 'cocoso.p'] },
    { key: 'cocoso.ka', stepKeys: ['cocoso.ka', 'cocoso.kb', 'cocoso.kc'] },
    { key: 'cocoso.scores', stepKeys: ['cocoso.scores'] },
    { key: 'cocoso.lambdaSweep', stepKeys: ['cocoso.lambdaSweep'] },
  ],
  steps: {
    'cocoso.normalized': {
      en: 'Min-max normalized matrix: the worst value of each column becomes 0, the best 1.',
      tr: 'Min-maks normalize matris: her sütunun en kötü değeri 0, en iyisi 1 olur.',
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
      edgeCase: { en: 'A constant column stays 0, as if it were left out.', tr: 'Sabit sütun 0 kalır, çıkarılmış gibi.' },
    },
    'cocoso.s': {
      en: 'Weighted sum: each normalized value times its weight, added up.',
      tr: 'Ağırlıklı toplam: her normalize değer ağırlığıyla çarpılıp toplanır.',
      tex: String.raw`S_i = \sum_{j=1}^{n} w_j\, r_{ij}`,
      symbol: 'S',
      texSymbol: '$S_i$',
    },
    'cocoso.p': {
      en: 'Power sum: each normalized value raised to its weight, added up.',
      tr: 'Üs toplamı: her normalize değerin ağırlık kuvveti alınıp toplanır.',
      tex: String.raw`P_i = \sum_{j:\, w_j > 0} r_{ij}^{\,w_j}`,
      edgeCase: { en: 'A criterion with weight 0 is left out (0⁰ = 1).', tr: 'Ağırlığı 0 olan kriter katılmaz (0⁰ = 1).' },
      symbol: 'P',
      texSymbol: '$P_i$',
    },
    'cocoso.ka': {
      en: 'First reading: the share of S + P in the column total.',
      tr: 'Birinci okuma: S + P değerinin sütun toplamındaki payı.',
      tex: String.raw`k_{ia} = \frac{P_i + S_i}{\sum_{i=1}^{m} (P_i + S_i)}`,
      symbol: 'ka',
      texSymbol: '$k_{ia}$',
    },
    'cocoso.kb': {
      en: 'Second reading: S and P against the weakest alternative.',
      tr: 'İkinci okuma: S ve P en zayıf alternatife oranlanır.',
      tex: String.raw`k_{ib} = \frac{S_i}{\min_i S_i} + \frac{P_i}{\min_i P_i}`,
      symbol: 'kb',
      texSymbol: '$k_{ib}$',
    },
    'cocoso.kc': {
      en: 'Third reading: S and P mixed by λ, against the best mix.',
      tr: 'Üçüncü okuma: S ve P λ ile karıştırılır, en iyi karışıma oranlanır.',
      tex: String.raw`k_{ic} = \frac{\lambda S_i + (1 - \lambda) P_i}{\lambda \max_i S_i + (1 - \lambda) \max_i P_i}`,
      symbol: 'kc',
      texSymbol: '$k_{ic}$',
    },
    'cocoso.scores': {
      en: 'Combined score k from the three readings; higher ranks better.',
      tr: 'Üç okumadan birleşik puan k; yüksek olan önde sıralanır.',
      tex: String.raw`k_i = \left(k_{ia}\, k_{ib}\, k_{ic}\right)^{1/3} + \frac{1}{3}\left(k_{ia} + k_{ib} + k_{ic}\right)`,
      symbol: 'k',
      texSymbol: '$k_i$',
    },
    'cocoso.lambdaSweep': {
      en: 'Combined score k at every λ from 0 to 1 in steps of 0.1.',
      tr: "λ'nın 0'dan 1'e 0,1 adımlı her değerinde birleşik puan k.",
      tex: String.raw`k_i(\lambda), \qquad \lambda = 0, 0.1, \dots, 1`,
    },
  },
} satisfies MethodSteps
