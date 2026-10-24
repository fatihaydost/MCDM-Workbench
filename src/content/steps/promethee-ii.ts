import type { MethodSteps } from './types'

/** PROMETHEE II: the steps src/core/methods/promethee-ii.ts emits, with the formulas the code follows. */
export const prometheeII = {
  flow: [
    { key: 'promethee-ii.preferenceMatrix', stepKeys: ['promethee-ii.preferenceMatrix'] },
    { key: 'promethee-ii.positiveFlow', stepKeys: ['promethee-ii.positiveFlow', 'promethee-ii.negativeFlow'] },
    { key: 'promethee-ii.netFlow', stepKeys: ['promethee-ii.netFlow'] },
  ],
  steps: {
    'promethee-ii.preferenceMatrix': {
      en: 'Aggregated preference matrix: weighted sum of pairwise preference degrees across all criteria.',
      tr: 'Toplam tercih matrisi: tüm kriterlerdeki ikili üstünlük derecelerinin ağırlıklı toplamı.',
      tex: String.raw`\pi(a, b) = \sum_{j=1}^{n} w_j\, P_j\!\left(\sigma_j(x_{aj} - x_{bj})\right), \qquad \pi(a, a) = 0, \quad \sum_{j=1}^{n} w_j = 1`,
      edgeCase: {
        en: 'A constant criterion column produces 0 pairwise differences and adds 0 to π.',
        tr: 'Sabit bir kriter sütunu 0 ikili fark üretir ve π matrisine 0 ekler.',
      },
      symbol: 'π',
      texSymbol: '$\\pi$',
    },
    'promethee-ii.positiveFlow': {
      en: 'Leaving flow: row average of π showing how strongly an alternative outranks others.',
      tr: 'Pozitif akış: alternatifin diğerlerine ortalama ne kadar üstün geldiğini gösteren satır ortalaması.',
      tex: String.raw`\phi^+(a) = \frac{1}{m - 1}\sum_{b \ne a} \pi(a, b)`,
      symbol: 'φ⁺',
      texSymbol: '$\\phi^+_a$',
    },
    'promethee-ii.negativeFlow': {
      en: 'Entering flow: column average of π showing how strongly others outrank an alternative.',
      tr: 'Negatif akış: diğerlerinin alternatife ortalama ne kadar üstün geldiğini gösteren sütun ortalaması.',
      tex: String.raw`\phi^-(a) = \frac{1}{m - 1}\sum_{b \ne a} \pi(b, a)`,
      symbol: 'φ⁻',
      texSymbol: '$\\phi^-_a$',
    },
    'promethee-ii.netFlow': {
      en: 'Net outranking flow: leaving flow minus entering flow; higher values rank better.',
      tr: 'Net üstünlük akışı: pozitif akış eksi negatif akış; yüksek değerler önde sıralanır.',
      tex: String.raw`\phi(a) = \phi^+(a) - \phi^-(a) \in [-1, 1], \qquad \sum_{a=1}^{m} \phi(a) = 0`,
      edgeCase: {
        en: 'Leaving and entering totals match, so the sum of net flows is 0.',
        tr: 'Pozitif ve negatif toplamlar eşit olduğundan tüm net akışların toplamı 0 olur.',
      },
      symbol: 'φ',
      texSymbol: '$\\phi_a$',
      signed: true,
    },
  },
} satisfies MethodSteps
