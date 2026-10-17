import type { MethodSteps } from './types'

/** TOPSIS: the steps src/core/methods/topsis.ts emits, with the formulas the code follows. */
export const topsis = {
  /** TOPSIS in five nodes: Normalize, Weight, Ideal points, Distances, Closeness. */
  flow: [
    { key: 'topsis.normalized', stepKeys: ['topsis.normalized'] },
    { key: 'topsis.weighted', stepKeys: ['topsis.weighted'] },
    { key: 'topsis.idealBest', stepKeys: ['topsis.idealBest', 'topsis.idealWorst'] },
    { key: 'topsis.distanceBest', stepKeys: ['topsis.distanceBest', 'topsis.distanceWorst'] },
    { key: 'topsis.closeness', stepKeys: ['topsis.closeness'] },
  ],
  steps: {
    'topsis.normalized': {
      en: 'Vector normalized matrix: each value divided by the length of its column.',
      tr: 'Vektör normalize matris: her değer kendi sütununun uzunluğuna bölünür.',
      tex: String.raw`r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{i=1}^{m} x_{ij}^2}}`,
      edgeCase: {
        en: 'An all-zero column stays 0.',
        tr: 'Tamamı sıfır olan sütun 0 kalır.',
      },
    },
    'topsis.weighted': {
      en: 'Weighted normalized matrix: each column multiplied by its criterion weight.',
      tr: 'Ağırlıklı normalize matris: her sütun kendi kriter ağırlığıyla çarpılır.',
      tex: String.raw`v_{ij} = w_j\, r_{ij}`,
    },
    'topsis.idealBest': {
      en: 'Ideal solution: the best weighted value per criterion (benefit max, cost min).',
      tr: 'İdeal çözüm: her kriterin en iyi ağırlıklı değeri (faydada maks, maliyette min).',
      tex: String.raw`A_j^{+} = \begin{cases} \max_i v_{ij} & j \in J^{+} \\ \min_i v_{ij} & j \in J^{-} \end{cases}`,
      symbol: 'A+',
      texSymbol: '$A^{+}_j$',
    },
    'topsis.idealWorst': {
      en: 'Negative-ideal solution: the worst weighted value of each criterion.',
      tr: 'Negatif ideal çözüm: her kriterin en kötü ağırlıklı değeri.',
      tex: String.raw`A_j^{-} = \begin{cases} \min_i v_{ij} & j \in J^{+} \\ \max_i v_{ij} & j \in J^{-} \end{cases}`,
      symbol: 'A−',
      texSymbol: '$A^{-}_j$',
    },
    'topsis.distanceBest': {
      en: 'Euclidean distance of each alternative to the ideal solution.',
      tr: 'Her alternatifin ideal çözüme Öklid uzaklığı.',
      tex: String.raw`D_i^{+} = \sqrt{\sum_{j=1}^{n} \left(v_{ij} - A_j^{+}\right)^2}`,
      symbol: 'D+',
      texSymbol: '$D^{+}_i$',
    },
    'topsis.distanceWorst': {
      en: 'Euclidean distance of each alternative to the negative-ideal solution.',
      tr: 'Her alternatifin negatif ideal çözüme Öklid uzaklığı.',
      tex: String.raw`D_i^{-} = \sqrt{\sum_{j=1}^{n} \left(v_{ij} - A_j^{-}\right)^2}`,
      symbol: 'D−',
      texSymbol: '$D^{-}_i$',
    },
    'topsis.closeness': {
      en: 'Relative closeness to the ideal solution, between 0 and 1; higher ranks better.',
      tr: 'İdeal çözüme göreli yakınlık, 0 ile 1 arasında; yüksek olan önde sıralanır.',
      tex: String.raw`C_i = \frac{D_i^{-}}{D_i^{+} + D_i^{-}}`,
      edgeCase: {
        en: 'If both distances are 0, the alternative gets 0.5: a tie, not last.',
        tr: 'İki uzaklık da 0 ise alternatif 0,5 alır: sonuncu değil, eşitlik.',
      },
      symbol: 'C',
      texSymbol: '$C_i$',
    },
  },
} satisfies MethodSteps
