import type { MethodSteps } from './types'

/** SWARA: the steps src/core/methods/swara.ts emits, with the formulas the code follows. */
export const swara = {
  flow: [
    { key: 'swara.s', stepKeys: ['swara.s'] },
    { key: 'swara.k', stepKeys: ['swara.k'] },
    { key: 'swara.q', stepKeys: ['swara.q'] },
    { key: 'swara.weights', stepKeys: ['swara.weights'] },
  ],
  steps: {
    'swara.s': {
      en: 'Comparative importance ratio stating how much less important each criterion is than its predecessor.',
      tr: 'Her kriterin sıralamada bir üstündekinden ne kadar daha az önemli olduğunu gösteren oran.',
      tex: String.raw`s_1 = 0,\qquad s_j \ge 0 \quad (j = 2, \dots, n)`,
      symbol: 's',
      texSymbol: '$s_j$',
    },
    'swara.k': {
      en: 'Add one to each comparative importance ratio after the most important criterion.',
      tr: 'En önemli kriterden sonraki her göreceli önem oranına bir eklenerek katsayı bulunur.',
      tex: String.raw`k_j = \begin{cases} 1, & j = 1 \\ s_j + 1, & j > 1 \end{cases}`,
      symbol: 'k',
      texSymbol: '$k_j$',
    },
    'swara.q': {
      en: 'Divide each previous recalculated weight by the current step coefficient starting from one.',
      tr: 'Birden başlayarak bir önceki yeniden hesaplanan ağırlık mevcut adım katsayısına bölünür.',
      tex: String.raw`q_j = \begin{cases} 1, & j = 1 \\ \dfrac{q_{j-1}}{k_j}, & j > 1 \end{cases}`,
      symbol: 'q',
      texSymbol: '$q_j$',
    },
    'swara.weights': {
      en: 'Divide each recalculated weight by their sum so the final weights add to one.',
      tr: 'Her yeniden hesaplanan ağırlık toplama bölünerek toplamı bir olan nihai ağırlıklar elde edilir.',
      tex: String.raw`w_j = \frac{q_j}{\sum_{r=1}^{n} q_r}`,
      edgeCase: {
        en: 'When every step ratio is zero, all criteria receive equal weight 1/n.',
        tr: 'Tüm adım oranları sıfır olduğunda her kritere 1/n eşit ağırlık verilir.',
      },
      symbol: 'w',
      texSymbol: '$w_j$',
    },
  },
} satisfies MethodSteps
