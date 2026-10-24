import type { MethodSteps } from './types'

const sawFlow = [
  { key: 'saw.normalized', symbol: 'R', stepKeys: ['saw.normalizedLinearMax', 'saw.normalizedSum'] },
  { key: 'saw.weighted', symbol: 'V', stepKeys: ['saw.weighted'] },
  { key: 'saw.scores', symbol: 'S', stepKeys: ['saw.scores'] },
]

/** SAW: the steps src/core/methods/saw.ts emits, with the formulas the code follows. */
export const saw = {
  flow: sawFlow,
  steps: {
    'saw.normalizedLinearMax': {
      en: 'Linear max normalized matrix: the best value of each column becomes 1.',
      tr: 'Doğrusal maks normalize matris: her sütunun en iyi değeri 1 olur.',
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij}}{\max_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\min_i x_{ij}}{x_{ij}} & j \in J^{-} \end{cases}, \qquad x_{ij} > 0`,
    },
    'saw.normalizedSum': {
      en: 'Sum normalized matrix: each column becomes shares that add up to 1.',
      tr: 'Toplam normalize matris: her sütun toplamı 1 olan paylara dönüşür.',
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij}}{\sum_{k=1}^{m} x_{kj}} & j \in J^{+} \\[2ex] \dfrac{1 / x_{ij}}{\sum_{k=1}^{m} 1 / x_{kj}} & j \in J^{-} \end{cases}, \qquad x_{ij} > 0`,
    },
    'saw.weighted': {
      en: 'Contributions: each normalized value multiplied by its criterion weight.',
      tr: 'Katkılar: her normalize değer kendi kriter ağırlığıyla çarpılır.',
      tex: String.raw`v_{ij} = w_j\, r_{ij}`,
    },
    'saw.scores': {
      en: 'Score: the sum of the contributions; higher ranks better.',
      tr: 'Skor: katkıların toplamı; yüksek olan önde sıralanır.',
      tex: String.raw`S_i = \sum_{j=1}^{n} v_{ij} = \sum_{j=1}^{n} w_j\, r_{ij}`,
      symbol: 'S',
      texSymbol: '$S_i$',
    },
  },
} satisfies MethodSteps
