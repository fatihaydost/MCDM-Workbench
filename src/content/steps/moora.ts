import type { MethodSteps } from './types'

/** MOORA (Ratio System): the steps src/core/methods/moora.ts emits, with the formulas the code follows. */
export const moora = {
  /** MOORA in four nodes: Normalize, Weight, Benefit and cost sums, Net score. */
  flow: [
    { key: 'moora.normalized', stepKeys: ['moora.normalized'] },
    { key: 'moora.weighted', stepKeys: ['moora.weighted'] },
    { key: 'moora.benefitSum', stepKeys: ['moora.benefitSum', 'moora.costSum'] },
    { key: 'moora.score', stepKeys: ['moora.score'] },
  ],
  steps: {
    'moora.normalized': {
      en: 'Vector normalized matrix: each value divided by the Euclidean norm of its column.',
      tr: 'Vektör normalize matris: her değer kendi sütununun Öklid normuna bölünür.',
      tex: String.raw`x^{*}_{ij} = \frac{x_{ij}}{\sqrt{\sum_{i=1}^{m} x_{ij}^2}}`,
      edgeCase: {
        en: 'An all-zero column stays 0.',
        tr: 'Tamamı sıfır olan sütun 0 kalır.',
      },
    },
    'moora.weighted': {
      en: 'Weighted normalized matrix: each ratio multiplied by its criterion weight.',
      tr: 'Ağırlıklı normalize matris: her oran kendi kriter ağırlığıyla çarpılır.',
      tex: String.raw`v_{ij} = w_j\, x^{*}_{ij}`,
    },
    'moora.benefitSum': {
      en: 'Benefit sum S+: weighted ratios of the benefit criteria added up.',
      tr: 'Fayda toplamı S+: fayda kriterlerinin ağırlıklı oranları toplanır.',
      tex: String.raw`S^{+}_{i} = \sum_{j \in J^{+}} v_{ij}`,
      edgeCase: {
        en: 'With no benefit criteria every S+ is 0.',
        tr: 'Fayda kriteri yoksa her S+ 0 olur.',
      },
      symbol: 'S+',
      texSymbol: '$S^{+}_{i}$',
    },
    'moora.costSum': {
      en: 'Cost sum S-: weighted ratios of the cost criteria added up.',
      tr: 'Maliyet toplamı S-: maliyet kriterlerinin ağırlıklı oranları toplanır.',
      tex: String.raw`S^{-}_{i} = \sum_{j \in J^{-}} v_{ij}`,
      edgeCase: {
        en: 'With no cost criteria every S- is 0.',
        tr: 'Maliyet kriteri yoksa her S- 0 olur.',
      },
      symbol: 'S-',
      texSymbol: '$S^{-}_{i}$',
    },
    'moora.score': {
      en: 'Net assessment y: benefit sum minus cost sum; higher ranks better.',
      tr: 'Net değerlendirme y: fayda toplamı eksi maliyet toplamı; yüksek olan önde sıralanır.',
      tex: String.raw`y_i = S^{+}_{i} - S^{-}_{i}`,
      symbol: 'y',
      texSymbol: '$y_i$',
    },
  },
} satisfies MethodSteps
