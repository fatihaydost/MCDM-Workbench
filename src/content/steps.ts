import type { Bilingual } from './types'

/**
 * One-line explanation and formula for every intermediate step the core returns
 * (Step.key in src/core/methods/*.ts). Formulas follow the code, including its edge cases:
 * src/core/methods/critic.ts, src/core/methods/entropy.ts and src/core/methods/topsis.ts.
 * Notation: i = alternative (1..m), j, k = criterion (1..n), J+ benefit and J- cost criteria.
 */
export type StepContent = Bilingual & {
  tex: string
  /** What the code does in the degenerate case, when it differs from the plain formula. */
  edgeCase?: Bilingual
}

export type StepKey =
  | 'critic.normalized'
  | 'critic.sigma'
  | 'critic.correlation'
  | 'critic.conflict'
  | 'critic.information'
  | 'critic.informationTotal'
  | 'critic.weights'
  | 'entropy.normalized'
  | 'entropy.proportionsSum'
  | 'entropy.proportionsMinmax'
  | 'entropy.entropy'
  | 'entropy.diversification'
  | 'entropy.weights'
  | 'topsis.normalized'
  | 'topsis.weighted'
  | 'topsis.idealBest'
  | 'topsis.idealWorst'
  | 'topsis.distanceBest'
  | 'topsis.distanceWorst'
  | 'topsis.closeness'

export const stepContent: Readonly<Record<StepKey, StepContent>> = {
  'critic.normalized': {
    en: 'Min-max normalized matrix: each column scaled to 0-1, 1 is best (cost reversed).',
    tr: 'Min-maks normalize matris: her sütun 0-1 aralığına iner, 1 en iyidir (maliyet ters).',
    tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
    edgeCase: {
      en: 'A constant column (max = min) is set to 0 in every row.',
      tr: 'Sabit bir sütun (maks = min) her satırda 0 alınır.',
    },
  },
  'critic.sigma': {
    en: 'Contrast of each criterion: sample standard deviation of its normalized column.',
    tr: 'Her kriterin kontrastı: normalize sütununun örneklem standart sapması.',
    tex: String.raw`\sigma_j = \sqrt{\frac{1}{m-1}\sum_{i=1}^{m} \left(r_{ij} - \bar r_j\right)^2}, \qquad \bar r_j = \frac{1}{m}\sum_{i=1}^{m} r_{ij}`,
  },
  'critic.correlation': {
    en: 'Pearson correlation between every pair of normalized columns.',
    tr: 'Normalize sütunların her çifti arasındaki Pearson korelasyonu.',
    tex: String.raw`\rho_{jk} = \frac{\sum_{i=1}^{m} (r_{ij} - \bar r_j)(r_{ik} - \bar r_k)}{\sqrt{\sum_{i=1}^{m} (r_{ij} - \bar r_j)^2 \sum_{i=1}^{m} (r_{ik} - \bar r_k)^2}}, \qquad \rho_{jj} = 1`,
    edgeCase: {
      en: 'A pair that involves a constant column gets correlation 0.',
      tr: 'Sabit bir sütun içeren çiftin korelasyonu 0 alınır.',
    },
  },
  'critic.conflict': {
    en: 'Conflict of each criterion with the others: the sum of 1 minus its correlations.',
    tr: 'Her kriterin diğerleriyle çatışması: 1 eksi korelasyonlarının toplamı.',
    tex: String.raw`\sum_{k=1}^{n} \left(1 - \rho_{jk}\right)`,
  },
  'critic.information': {
    en: 'Information content: contrast times conflict.',
    tr: 'Bilgi miktarı: kontrast ile çatışmanın çarpımı.',
    tex: String.raw`C_j = \sigma_j \sum_{k=1}^{n} \left(1 - \rho_{jk}\right)`,
  },
  'critic.informationTotal': {
    en: 'Total information over all criteria, the denominator of the weights.',
    tr: 'Tüm kriterlerin toplam bilgi miktarı: ağırlıkların paydası.',
    tex: String.raw`\sum_{k=1}^{n} C_k`,
  },
  'critic.weights': {
    en: 'CRITIC weights: each criterion\'s share of the total information.',
    tr: 'CRITIC ağırlıkları: her kriterin toplam bilgi içindeki payı.',
    tex: String.raw`w_j = \frac{C_j}{\sum_{k=1}^{n} C_k}`,
    edgeCase: {
      en: 'If the total is 0 (every column constant), every weight is 1/n.',
      tr: 'Toplam 0 ise (bütün sütunlar sabit) her ağırlık 1/n olur.',
    },
  },
  'entropy.normalized': {
    en: 'Min-max normalized matrix: each column scaled to 0-1, 1 is best (cost reversed).',
    tr: 'Min-max normalize matris: her sütun 0-1 aralığına iner, 1 en iyidir (maliyet ters).',
    tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
    edgeCase: {
      en: 'A constant column (max = min) is set to 0 and never divided.',
      tr: 'Sabit bir sütun (maks = min) 0 alınır, hiç bölünmez.',
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
  },
  'entropy.diversification': {
    en: 'Degree of diversification: the information the criterion carries.',
    tr: 'Çeşitlenme derecesi: kriterin taşıdığı bilgi.',
    tex: String.raw`d_j = \max\left(0,\ 1 - e_j\right)`,
    edgeCase: {
      en: 'A constant column gets d = 0.',
      tr: 'Sabit bir sütun d = 0 alır.',
    },
  },
  'entropy.weights': {
    en: "Entropy weights: each criterion's share of the total diversification.",
    tr: 'Entropi ağırlıkları: her kriterin toplam çeşitlenme içindeki payı.',
    tex: String.raw`w_j = \frac{d_j}{\sum_{k=1}^{n} d_k}`,
    edgeCase: {
      en: 'If the total is 0 (every column constant), every weight is 1/n.',
      tr: 'Toplam 0 ise (bütün sütunlar sabit) her ağırlık 1/n olur.',
    },
  },
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
  },
  'topsis.idealWorst': {
    en: 'Negative-ideal solution: the worst weighted value of each criterion.',
    tr: 'Negatif ideal çözüm: her kriterin en kötü ağırlıklı değeri.',
    tex: String.raw`A_j^{-} = \begin{cases} \min_i v_{ij} & j \in J^{+} \\ \max_i v_{ij} & j \in J^{-} \end{cases}`,
  },
  'topsis.distanceBest': {
    en: 'Euclidean distance of each alternative to the ideal solution.',
    tr: 'Her alternatifin ideal çözüme Öklid uzaklığı.',
    tex: String.raw`D_i^{+} = \sqrt{\sum_{j=1}^{n} \left(v_{ij} - A_j^{+}\right)^2}`,
  },
  'topsis.distanceWorst': {
    en: 'Euclidean distance of each alternative to the negative-ideal solution.',
    tr: 'Her alternatifin negatif ideal çözüme Öklid uzaklığı.',
    tex: String.raw`D_i^{-} = \sqrt{\sum_{j=1}^{n} \left(v_{ij} - A_j^{-}\right)^2}`,
  },
  'topsis.closeness': {
    en: 'Relative closeness to the ideal solution, between 0 and 1; higher ranks better.',
    tr: 'İdeal çözüme göreli yakınlık, 0 ile 1 arasında; yüksek olan önde sıralanır.',
    tex: String.raw`C_i = \frac{D_i^{-}}{D_i^{+} + D_i^{-}}`,
    edgeCase: {
      en: 'If both distances are 0, the alternative gets 0.5: a tie, not last.',
      tr: 'İki uzaklık da 0 ise alternatif 0,5 alır: sonuncu değil, eşitlik.',
    },
  },
}

export const STEP_KEYS = Object.keys(stepContent) as StepKey[]

export const isStepKey = (key: string): key is StepKey => Object.hasOwn(stepContent, key)
