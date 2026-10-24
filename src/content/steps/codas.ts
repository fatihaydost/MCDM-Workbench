import type { MethodSteps } from './types'

/** CODAS: the steps src/core/methods/codas.ts emits, with the formulas the code follows. */
export const codas = {
  flow: [
    { key: 'codas.normalized', stepKeys: ['codas.normalized'] },
    { key: 'codas.weighted', stepKeys: ['codas.weighted'] },
    { key: 'codas.negativeIdeal', stepKeys: ['codas.negativeIdeal'] },
    { key: 'codas.euclidean', stepKeys: ['codas.euclidean', 'codas.taxicab'] },
    { key: 'codas.relativeAssessment', stepKeys: ['codas.relativeAssessment'] },
    { key: 'codas.score', stepKeys: ['codas.score'] },
  ],
  steps: {
    'codas.normalized': {
      en: 'Linear max normalized matrix: the best value of each column becomes 1.',
      tr: 'Doğrusal maks normalize matris: her sütunun en iyi değeri 1 olur.',
      tex: String.raw`n_{ij} = \begin{cases} \dfrac{x_{ij}}{\max_k x_{kj}} & j \in J^{+} \\[2ex] \dfrac{\min_k x_{kj}}{x_{ij}} & j \in J^{-} \end{cases}, \qquad x_{ij} > 0`,
      edgeCase: {
        en: 'A constant positive column gets 1 in every row.',
        tr: 'Sabit pozitif bir sütun her satırda 1 alır.',
      },
      symbol: 'N',
      texSymbol: '$N$',
    },
    'codas.weighted': {
      en: 'Weighted normalized matrix: each normalized value multiplied by its criterion weight.',
      tr: 'Ağırlıklı normalize matris: her normalize değer kriter ağırlığıyla çarpılır.',
      tex: String.raw`r_{ij} = w_j\, n_{ij}, \qquad \sum_{j=1}^{n} w_j = 1, \quad w_j > 0`,
      symbol: 'R',
      texSymbol: '$R$',
    },
    'codas.negativeIdeal': {
      en: 'Negative-ideal solution: the smallest weighted value in each criterion column.',
      tr: 'Negatif-ideal çözüm: her kriter sütunundaki en küçük ağırlıklı değer.',
      tex: String.raw`ns_j = \min_{1 \le i \le m} r_{ij}`,
      symbol: 'ns',
      texSymbol: '$ns_j$',
    },
    'codas.euclidean': {
      en: 'Euclidean distance: the straight-line distance from the negative-ideal point.',
      tr: 'Öklid uzaklığı: alternatifin negatif-ideal noktaya düz çizgi uzaklığı.',
      tex: String.raw`E_i = \sqrt{\sum_{j=1}^{n} \left(r_{ij} - ns_j\right)^2}`,
      symbol: 'E',
      texSymbol: '$E_i$',
    },
    'codas.taxicab': {
      en: 'Taxicab distance: the sum of absolute gaps from the negative-ideal point.',
      tr: 'Taksi uzaklığı: negatif-ideal noktaya mutlak farkların toplamı.',
      tex: String.raw`T_i = \sum_{j=1}^{n} \left|r_{ij} - ns_j\right|`,
      symbol: 'T',
      texSymbol: '$T_i$',
    },
    'codas.relativeAssessment': {
      en: 'Relative assessment matrix: pairwise Euclidean gaps, plus Taxicab gaps above τ.',
      tr: 'Göreli değerlendirme matrisi: ikili Öklid farkları ve τ üstünde Taksi farkları.',
      tex: String.raw`h_{ik} = (E_i - E_k) + \psi(E_i - E_k)\,(T_i - T_k), \qquad \psi(x) = \begin{cases} 1 & |x| \ge \tau \\ 0 & |x| < \tau \end{cases}`,
      symbol: 'Ra',
      texSymbol: '$R_a$',
    },
    'codas.score': {
      en: 'Assessment score H: the row sum of relative assessments; higher ranks better.',
      tr: 'Değerlendirme skoru H: göreli değerlendirme satır toplamı; yüksek olan önde sıralanır.',
      tex: String.raw`H_i = \sum_{k=1}^{m} h_{ik}`,
      edgeCase: {
        en: 'Because h is antisymmetric, the sum of all H scores is 0.',
        tr: 'h ters simetrik olduğundan bütün H skorlarının toplamı 0 olur.',
      },
      symbol: 'H',
      texSymbol: '$H_i$',
    },
  },
} satisfies MethodSteps
