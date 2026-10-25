import type { MethodSteps } from './types'

/** Entropy: the steps src/core/methods/entropy.ts emits, with the formulas the code follows. */
export const entropy = {
  /** Normalize (min-max only), Shares, Entropy, Diversification, Weights; nodes the variant does not emit drop out. */
  flow: [
    { key: 'entropy.normalized', stepKeys: ['entropy.normalized'] },
    { key: 'entropy.proportionsSum', stepKeys: ['entropy.proportionsSum'] },
    { key: 'entropy.proportionsMinmax', stepKeys: ['entropy.proportionsMinmax'] },
    { key: 'entropy.entropy', stepKeys: ['entropy.entropy'] },
    { key: 'entropy.diversification', stepKeys: ['entropy.diversification'] },
    { key: 'entropy.weights', stepKeys: ['entropy.weights'] },
  ],
  steps: {
    'entropy.normalized': {
      en: 'Min-max normalized matrix: each column scaled to 0-1, 1 is best (cost reversed).',
      tr: 'Min-maks normalize matris: her sütun 0-1 aralığına iner, 1 en iyidir (maliyet ters).',
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
      edgeCase: {
        en: 'A constant column (max = min) is set to 0 and never divided.',
        tr: 'Sabit bir sütun (max = min) 0 alınır, hiç bölünmez.',
      },
    },
    'entropy.proportionsSum': {
      en: 'Shares of the raw values: each value over its column total.',
      tr: 'Ham değerlerin payları: her değer sütun toplamına bölünür.',
      tex: String.raw`p_{ij} = \frac{x_{ij}}{\sum_{i=1}^{m} x_{ij}}, \qquad x_{ij} \ge 0`,
      edgeCase: {
        en: 'A constant column, also all zeros, gets p = 1/m.',
        tr: 'Sabit bir sütun, tamamı sıfır olan da, p = 1/m alır.',
      },
    },
    'entropy.proportionsMinmax': {
      en: 'Shares of the normalized values: each value over its column total.',
      tr: 'Normalize değerlerin payları: her değer sütun toplamına bölünür.',
      tex: String.raw`p_{ij} = \frac{r_{ij}}{\sum_{i=1}^{m} r_{ij}}`,
      edgeCase: {
        en: 'A constant column gets p = 1/m.',
        tr: 'Sabit bir sütun p = 1/m alır.',
      },
    },
    'entropy.entropy': {
      en: 'Entropy per criterion: 1 for equal shares, lower when uneven.',
      tr: 'Kriter başına entropi: eşit paylarda 1, dengesizleştikçe düşer.',
      tex: String.raw`e_j = -\frac{1}{\ln m} \sum_{i=1}^{m} p_{ij} \ln p_{ij}, \qquad 0 \ln 0 = 0`,
      symbol: 'e',
      texSymbol: '$e_j$',
    },
    'entropy.diversification': {
      en: 'Degree of diversification: the information the criterion carries.',
      tr: 'Çeşitlenme derecesi: kriterin taşıdığı bilgi.',
      tex: String.raw`d_j = \max\left(0,\ 1 - e_j\right)`,
      edgeCase: {
        en: 'A constant column gets d = 0.',
        tr: 'Sabit bir sütun d = 0 alır.',
      },
      symbol: 'd',
      texSymbol: '$d_j$',
    },
    'entropy.weights': {
      en: "Entropy weights: each criterion's share of the total diversification.",
      tr: 'Entropi ağırlıkları: her kriterin toplam çeşitlenme içindeki payı.',
      tex: String.raw`w_j = \frac{d_j}{\sum_{k=1}^{n} d_k}`,
      edgeCase: {
        en: 'If the total is 0, varying columns share the weight equally (or 1/n).',
        tr: 'Toplam 0 ise değişen sütunlar ağırlığı eşit paylaşır (tümü sabitse 1/n).',
      },
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
