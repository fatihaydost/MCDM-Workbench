import type { MethodSteps } from './types'

/** WASPAS: the steps src/core/methods/waspas.ts emits, with the formulas the code follows. */
export const waspas = {
  /** WASPAS in four nodes: Normalize, Sum and product, Blend, λ sweep. */
  flow: [
    { key: 'waspas.normalized', stepKeys: ['waspas.normalized'] },
    { key: 'waspas.wsm', stepKeys: ['waspas.wsm', 'waspas.wpm'] },
    { key: 'waspas.scores', stepKeys: ['waspas.scores'] },
    { key: 'waspas.lambdaSweep', stepKeys: ['waspas.lambdaSweep'] },
  ],
  steps: {
    'waspas.normalized': {
      en: 'Linear max normalized matrix: the best value of each column becomes 1.',
      tr: 'Doğrusal maks normalize matris: her sütunun en iyi değeri 1 olur.',
      tex: String.raw`\bar x_{ij} = \begin{cases} \dfrac{x_{ij}}{\max_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\min_i x_{ij}}{x_{ij}} & j \in J^{-} \end{cases}, \qquad x_{ij} > 0`,
    },
    'waspas.wsm': {
      en: 'Weighted sum: each normalized value times its weight, added up.',
      tr: 'Ağırlıklı toplam: her normalize değer ağırlığıyla çarpılıp toplanır.',
      tex: String.raw`Q_i^{(1)} = \sum_{j=1}^{n} w_j\, \bar x_{ij}`,
      symbol: 'Q1',
      texSymbol: '$Q^{(1)}_i$',
    },
    'waspas.wpm': {
      en: 'Weighted product: each normalized value raised to its weight, multiplied.',
      tr: 'Ağırlıklı çarpım: her normalize değerin ağırlık kuvveti alınıp çarpılır.',
      tex: String.raw`Q_i^{(2)} = \prod_{j=1}^{n} \bar x_{ij}^{\,w_j}`,
      symbol: 'Q2',
      texSymbol: '$Q^{(2)}_i$',
    },
    'waspas.scores': {
      en: 'Score Q: the sum and the product blended by λ; higher ranks better.',
      tr: 'Skor Q: toplam ile çarpım λ ile karıştırılır; yüksek olan önde sıralanır.',
      tex: String.raw`Q_i = \lambda\, Q_i^{(1)} + (1 - \lambda)\, Q_i^{(2)}, \qquad 0 \le \lambda \le 1`,
      symbol: 'Q',
      texSymbol: '$Q_i$',
    },
    'waspas.lambdaSweep': {
      en: 'Score Q at every λ from 0 to 1 in steps of 0.1.',
      tr: "λ'nın 0'dan 1'e 0,1 adımlı her değerinde skor Q.",
      tex: String.raw`Q_i(\lambda) = \lambda\, Q_i^{(1)} + (1 - \lambda)\, Q_i^{(2)}, \qquad \lambda = 0, 0.1, \dots, 1`,
    },
  },
} satisfies MethodSteps
