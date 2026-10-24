import type { MethodSteps } from './types'

/** LOPCOW: the steps src/core/methods/lopcow.ts emits, with the formulas the code follows. */
export const lopcow = {
  /** LOPCOW in four nodes: Normalize, RMS & spread, Percentage value, Weights. */
  flow: [
    { key: 'lopcow.normalized', stepKeys: ['lopcow.normalized'] },
    { key: 'lopcow.rms', stepKeys: ['lopcow.rms', 'lopcow.stdDev'] },
    { key: 'lopcow.pv', stepKeys: ['lopcow.pv'] },
    { key: 'lopcow.weights', stepKeys: ['lopcow.weights'] },
  ],
  steps: {
    'lopcow.normalized': {
      en: 'Min-max normalized matrix: each column scaled to 0-1, 1 is best (cost reversed).',
      tr: 'Min-maks normalize matris: her sütun 0-1 aralığına iner, 1 en iyidir (maliyet ters).',
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
      edgeCase: {
        en: 'A constant column (max ≈ min, relative 1e-12) is 0 in every row.',
        tr: 'Sabit bir sütun (maks ≈ min, göreli 1e-12) her satırda 0 alınır.',
      },
    },
    'lopcow.rms': {
      en: 'Root-mean-square of each normalized column: typical magnitude on the 0-1 scale.',
      tr: 'Her normalize sütunun karesel ortalaması: 0-1 ölçeğindeki tipik büyüklük.',
      tex: String.raw`RMS_j = \sqrt{\frac{1}{m}\sum_{i=1}^{m} r_{ij}^2}`,
      symbol: 'RMS',
      texSymbol: '$RMS_j$',
    },
    'lopcow.stdDev': {
      en: 'Spread of each criterion: sample standard deviation (divisor m - 1) of its column.',
      tr: 'Her kriterin yayılımı: normalize sütununun örneklem standart sapması (payda m - 1).',
      tex: String.raw`\sigma_j = \sqrt{\frac{1}{m-1}\sum_{i=1}^{m} \left(r_{ij} - \bar r_j\right)^2}, \qquad \bar r_j = \frac{1}{m}\sum_{i=1}^{m} r_{ij}`,
      edgeCase: {
        en: 'Sample standard deviation (m - 1) reproduces Keles (2023) within 5e-4.',
        tr: 'Örneklem standart sapması (m - 1), Keleş (2023) sonuçlarını 5e-4 farkla üretir.',
      },
      symbol: 'σ',
      texSymbol: String.raw`$\sigma_j$`,
    },
    'lopcow.pv': {
      en: 'Logarithmic percentage value: absolute log ratio of root-mean-square to spread, times 100.',
      tr: 'Logaritmik yüzde değer: karesel ortalamanın standart sapmaya oranının mutlak logaritmasının 100 katı.',
      tex: String.raw`PV_j = \left|\ln\!\left(\frac{RMS_j}{\sigma_j}\right) \cdot 100\right|`,
      edgeCase: {
        en: 'A constant column or a column with RMS = σ gets PV = 0.',
        tr: 'Sabit veya RMS = σ olan bir sütun için PV = 0 alınır.',
      },
      symbol: 'PV',
      texSymbol: '$PV_j$',
    },
    'lopcow.weights': {
      en: "LOPCOW weights: each criterion's share of the total logarithmic percentage value.",
      tr: 'LOPCOW ağırlıkları: her kriterin toplam logaritmik yüzde değer içindeki payı.',
      tex: String.raw`w_j = \frac{PV_j}{\sum_{k=1}^{n} PV_k}`,
      edgeCase: {
        en: 'When total PV is 0 (all constant or m = 2), weights are 1/n.',
        tr: 'Toplam PV 0 ise (tümü sabit veya m = 2) her ağırlık 1/n olur.',
      },
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
