import type { MethodSteps } from './types'

/** COPRAS: the steps src/core/methods/copras.ts emits, with the formulas the code follows. */
export const copras = {
  /** COPRAS in four nodes: Shares, Benefit and cost sums, Relative significance, Utility degree. */
  flow: [
    { key: 'copras.normalizedSum', stepKeys: ['copras.normalizedSum', 'copras.weighted'] },
    { key: 'copras.sPlus', stepKeys: ['copras.sPlus', 'copras.sMinus'] },
    { key: 'copras.significance', stepKeys: ['copras.significance'] },
    { key: 'copras.utility', stepKeys: ['copras.utility'] },
  ],
  steps: {
    'copras.normalizedSum': {
      en: 'Each value as a share of its column total; costs are not inverted.',
      tr: 'Her değer sütun toplamındaki payı olarak; maliyetler ters çevrilmez.',
      tex: String.raw`r_{ij} = \frac{x_{ij}}{\sum_{k=1}^{m} x_{kj}}, \qquad x_{ij} > 0`,
    },
    'copras.weighted': {
      en: 'Weighted shares: each column now adds up to its weight.',
      tr: 'Ağırlıklı paylar: her sütunun toplamı artık ağırlığına eşit.',
      tex: String.raw`d_{ij} = w_j\, r_{ij}, \qquad \sum_{i=1}^{m} d_{ij} = w_j`,
    },
    'copras.sPlus': {
      en: 'Benefit sum S+: the weighted shares of the benefit criteria, added up.',
      tr: 'Fayda toplamı S+: fayda kriterlerinin ağırlıklı payları toplanır.',
      tex: String.raw`S_{+i} = \sum_{j \in J^{+}} d_{ij}`,
      symbol: 'S+',
      texSymbol: '$S_{+i}$',
    },
    'copras.sMinus': {
      en: 'Cost sum S-: the weighted shares of the cost criteria, added up.',
      tr: 'Maliyet toplamı S-: maliyet kriterlerinin ağırlıklı payları toplanır.',
      tex: String.raw`S_{-i} = \sum_{j \in J^{-}} d_{ij}`,
      edgeCase: { en: 'With no cost criteria every S- is 0.', tr: 'Maliyet kriteri yoksa her S- 0 olur.' },
      symbol: 'S-',
      texSymbol: '$S_{-i}$',
    },
    'copras.significance': {
      en: 'Relative significance Q: S+ plus a cost bonus; higher ranks better.',
      tr: 'Göreli önem Q: S+ artı maliyet puanı; yüksek olan önde sıralanır.',
      tex: String.raw`Q_i = S_{+i} + W_C\, \frac{1 / S_{-i}}{\sum_{k=1}^{m} 1 / S_{-k}}, \qquad W_C = \sum_{j \in J^{-}} w_j`,
      edgeCase: { en: 'With no cost weight (W_C = 0), Q equals S+.', tr: 'Maliyet ağırlığı yoksa (W_C = 0) Q, S+ olur.' },
      symbol: 'Q',
      texSymbol: '$Q_i$',
    },
    'copras.utility': {
      en: 'Utility degree N: Q as a percentage of the best Q.',
      tr: "Fayda derecesi N: Q, en iyi Q'nun yüzdesi olarak.",
      tex: String.raw`N_i = 100 \cdot \frac{Q_i}{\max_k Q_k}`,
      symbol: 'N (%)',
      texSymbol: String.raw`$N_i$ (\%)`,
    },
  },
} satisfies MethodSteps
