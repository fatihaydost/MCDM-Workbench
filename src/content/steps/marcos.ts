import type { MethodSteps } from './types'

/** MARCOS: the steps src/core/methods/marcos.ts emits, with the formulas the code follows. */
export const marcos = {
  /** MARCOS in four nodes: Normalize, Reference sums, Utility degrees, Utility f(K). */
  flow: [
    { key: 'marcos.normalized', stepKeys: ['marcos.normalized', 'marcos.weighted'] },
    { key: 'marcos.sAai', stepKeys: ['marcos.sAai', 'marcos.sAi', 'marcos.s'] },
    { key: 'marcos.kMinus', stepKeys: ['marcos.kMinus', 'marcos.kPlus', 'marcos.fKMinus', 'marcos.fKPlus'] },
    { key: 'marcos.utility', stepKeys: ['marcos.utility'] },
  ],
  steps: {
    'marcos.normalized': {
      en: 'Each value against the ideal row AI, the column best: the ideal gets 1.',
      tr: 'Her değer ideal satır AI, yani sütunun en iyisiyle oranlanır: ideal 1 alır.',
      tex: String.raw`n_{ij} = \begin{cases} \dfrac{x_{ij}}{AI_j} & j \in J^{+} \\[2ex] \dfrac{AI_j}{x_{ij}} & j \in J^{-} \end{cases}, \qquad AI_j = \begin{cases} \max_i x_{ij} & j \in J^{+} \\ \min_i x_{ij} & j \in J^{-} \end{cases}`,
    },
    'marcos.weighted': {
      en: 'Weighted values: each normalized value times its weight.',
      tr: 'Ağırlıklı değerler: her normalize değer ağırlığıyla çarpılır.',
      tex: String.raw`v_{ij} = w_j\, n_{ij}`,
    },
    'marcos.sAai': {
      en: 'Weighted total of the anti-ideal row AAI, the column worst.',
      tr: 'Anti-ideal satır AAI, yani sütunun en kötüsü için ağırlıklı toplam.',
      tex: String.raw`S_{aai} = \sum_{j=1}^{n} w_j\, \frac{\min_i x_{ij}}{\max_i x_{ij}}`,
      symbol: 'S_aai',
      texSymbol: '$S_{aai}$',
    },
    'marcos.sAi': {
      en: 'Weighted total of the ideal row AI: the sum of the weights.',
      tr: 'İdeal satır AI için ağırlıklı toplam: ağırlıkların toplamı.',
      tex: String.raw`S_{ai} = \sum_{j=1}^{n} w_j \cdot 1 = 1`,
      symbol: 'S_ai',
      texSymbol: '$S_{ai}$',
    },
    'marcos.s': {
      en: 'Weighted total S of each alternative, the same number as SAW (Linear).',
      tr: 'Her alternatifin ağırlıklı toplamı S; SAW (Doğrusal) ile aynı sayı.',
      tex: String.raw`S_i = \sum_{j=1}^{n} v_{ij}`,
      symbol: 'S',
      texSymbol: '$S_i$',
    },
    'marcos.kMinus': {
      en: 'Utility degree K-: how many anti-ideals the alternative is worth.',
      tr: 'Fayda derecesi K-: alternatif kaç anti-ideal değerinde.',
      tex: String.raw`K_i^{-} = \frac{S_i}{S_{aai}}`,
      symbol: 'K-',
      texSymbol: '$K_i^{-}$',
    },
    'marcos.kPlus': {
      en: 'Utility degree K+: the share of the ideal the alternative reaches.',
      tr: "Fayda derecesi K+: alternatifin ideale ulaştığı pay.",
      tex: String.raw`K_i^{+} = \frac{S_i}{S_{ai}}`,
      symbol: 'K+',
      texSymbol: '$K_i^{+}$',
    },
    'marcos.fKMinus': {
      en: 'Utility function toward the anti-ideal: one number for every alternative.',
      tr: 'Anti-ideale göre fayda fonksiyonu: her alternatif için aynı sayı.',
      tex: String.raw`f(K_i^{-}) = \frac{K_i^{+}}{K_i^{+} + K_i^{-}} = \frac{S_{aai}}{S_{aai} + S_{ai}}`,
      symbol: 'f(K-)',
      texSymbol: '$f(K^{-})$',
    },
    'marcos.fKPlus': {
      en: 'Utility function toward the ideal: one number for every alternative.',
      tr: 'İdeale göre fayda fonksiyonu: her alternatif için aynı sayı.',
      tex: String.raw`f(K_i^{+}) = \frac{K_i^{-}}{K_i^{+} + K_i^{-}} = \frac{S_{ai}}{S_{aai} + S_{ai}}`,
      symbol: 'f(K+)',
      texSymbol: '$f(K^{+})$',
    },
    'marcos.utility': {
      en: 'Utility f(K); higher ranks better, in the same order as S.',
      tr: "Fayda f(K); yüksek olan önde sıralanır, sıra S'ninkiyle aynı.",
      tex: String.raw`f(K_i) = \frac{K_i^{+} + K_i^{-}}{1 + \dfrac{1 - f(K_i^{+})}{f(K_i^{+})} + \dfrac{1 - f(K_i^{-})}{f(K_i^{-})}} = c\, S_i`,
      symbol: 'f(K)',
      texSymbol: '$f(K_i)$',
    },
  },
} satisfies MethodSteps
