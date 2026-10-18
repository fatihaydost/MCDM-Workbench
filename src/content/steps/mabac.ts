import type { MethodSteps } from './types'

/** MABAC: the steps src/core/methods/mabac.ts emits, with the formulas the code follows. */
export const mabac = {
  /** MABAC in four nodes: Normalize and weight, Border, Distance, S. */
  flow: [
    { key: 'mabac.normalized', stepKeys: ['mabac.normalized', 'mabac.weighted'] },
    { key: 'mabac.border', stepKeys: ['mabac.border'] },
    { key: 'mabac.distance', stepKeys: ['mabac.distance'] },
    { key: 'mabac.scores', stepKeys: ['mabac.scores'] },
  ],
  steps: {
    'mabac.normalized': {
      en: 'Min-max normalized matrix: the worst value of each column becomes 0, the best 1.',
      tr: 'Min-maks normalize matris: her sütunun en kötü değeri 0, en iyisi 1 olur.',
      tex: String.raw`t_{ij} = \begin{cases} \dfrac{x_{ij} - x_j^{-}}{x_j^{+} - x_j^{-}} & j \in J^{+} \\[2ex] \dfrac{x_{ij} - x_j^{+}}{x_j^{-} - x_j^{+}} & j \in J^{-} \end{cases}, \qquad x_j^{+} = \max_i x_{ij},\ x_j^{-} = \min_i x_{ij}`,
      edgeCase: { en: 'A constant column stays 0, as if it were left out.', tr: 'Sabit sütun 0 kalır, çıkarılmış gibi.' },
    },
    'mabac.weighted': {
      en: 'Weighted matrix: each value plus 1, times its weight; between w and 2w.',
      tr: 'Ağırlıklı matris: her değere 1 eklenip ağırlıkla çarpılır; sonuç w ile 2w arasındadır.',
      tex: String.raw`v_{ij} = w_j \left(t_{ij} + 1\right)`,
    },
    'mabac.border': {
      en: 'Border G: the geometric mean of each weighted column.',
      tr: 'Sınır G: her ağırlıklı sütunun geometrik ortalaması.',
      tex: String.raw`g_j = \left(\prod_{i=1}^{m} v_{ij}\right)^{1/m} = \exp\!\left(\frac{1}{m}\sum_{i=1}^{m} \ln v_{ij}\right)`,
      edgeCase: {
        en: 'Through logarithms (no underflow); weight 0 gives g = 0.',
        tr: 'Logaritmayla (0\'a düşmez); ağırlık 0 ise g = 0.',
      },
      symbol: 'G',
      texSymbol: '$g_j$',
    },
    'mabac.distance': {
      en: 'Distance Q to the border: positive in the upper area, negative in the lower.',
      tr: 'Sınıra uzaklık Q: üst bölgede pozitif, alt bölgede negatif.',
      tex: String.raw`q_{ij} = v_{ij} - g_j`,
      signed: true,
    },
    'mabac.scores': {
      en: 'Score S: the distances added up; higher ranks better.',
      tr: 'Skor S: uzaklıkların toplamı; yüksek olan önde sıralanır.',
      tex: String.raw`S_i = \sum_{j=1}^{n} q_{ij}`,
      symbol: 'S',
      texSymbol: '$S_i$',
    },
  },
} satisfies MethodSteps
