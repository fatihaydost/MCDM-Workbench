import type { MethodSteps } from './types'

/** EDAS: the steps src/core/methods/edas.ts emits, with the formulas the code follows. */
export const edas = {
  flow: [
    { key: 'edas.average', stepKeys: ['edas.average'] },
    { key: 'edas.pda', stepKeys: ['edas.pda', 'edas.nda'] },
    { key: 'edas.weightedPda', stepKeys: ['edas.weightedPda', 'edas.weightedNda'] },
    { key: 'edas.sp', stepKeys: ['edas.sp', 'edas.sn'] },
    { key: 'edas.nsp', stepKeys: ['edas.nsp', 'edas.nsn'] },
    { key: 'edas.scores', stepKeys: ['edas.scores'] },
  ],
  steps: {
    'edas.average': {
      en: 'Average solution: the mean of each criterion over all alternatives.',
      tr: 'Ortalama çözüm: her kriterin bütün alternatifler üzerinden ortalaması.',
      tex: String.raw`AV_j = \frac{1}{m} \sum_{i=1}^{m} x_{ij}`,
      edgeCase: {
        en: 'A varying column with an average of 0 or below is a blocking error.',
        tr: 'Ortalaması 0 ya da altında olan değişken bir sütun engelleyici hatadır.',
      },
      symbol: 'AV',
      texSymbol: '$AV_j$',
    },
    'edas.pda': {
      en: 'Positive distance: how far better than the average, as a share of it.',
      tr: 'Ortalamadan pozitif uzaklık: ortalamadan ne kadar iyi, ortalamanın oranı olarak.',
      tex: String.raw`PDA_{ij} = \begin{cases} \dfrac{\max(0,\ x_{ij} - AV_j)}{AV_j} & j \in J^{+} \\[2ex] \dfrac{\max(0,\ AV_j - x_{ij})}{AV_j} & j \in J^{-} \end{cases}`,
      edgeCase: {
        en: 'A constant column gets exactly 0 in every row.',
        tr: 'Sabit bir sütun her satırda tam 0 alır.',
      },
    },
    'edas.nda': {
      en: 'Negative distance: how far worse than the average, as a share of it.',
      tr: 'Ortalamadan negatif uzaklık: ortalamadan ne kadar kötü, ortalamanın oranı olarak.',
      tex: String.raw`NDA_{ij} = \begin{cases} \dfrac{\max(0,\ AV_j - x_{ij})}{AV_j} & j \in J^{+} \\[2ex] \dfrac{\max(0,\ x_{ij} - AV_j)}{AV_j} & j \in J^{-} \end{cases}`,
      edgeCase: {
        en: 'A constant column gets exactly 0 in every row.',
        tr: 'Sabit bir sütun her satırda tam 0 alır.',
      },
    },
    'edas.weightedPda': {
      en: 'Weighted positive distances: each criterion\'s share of SP.',
      tr: 'Ağırlıklı pozitif uzaklıklar: her kriterin SP içindeki payı.',
      tex: String.raw`w_j\, PDA_{ij}`,
    },
    'edas.weightedNda': {
      en: 'Weighted negative distances: each criterion\'s share of SN.',
      tr: 'Ağırlıklı negatif uzaklıklar: her kriterin SN içindeki payı.',
      tex: String.raw`w_j\, NDA_{ij}`,
    },
    'edas.sp': {
      en: 'SP: the weighted sum of the positive distances.',
      tr: 'SP: pozitif uzaklıkların ağırlıklı toplamı.',
      tex: String.raw`SP_i = \sum_{j=1}^{n} w_j\, PDA_{ij}`,
      symbol: 'SP',
      texSymbol: '$SP_i$',
    },
    'edas.sn': {
      en: 'SN: the weighted sum of the negative distances.',
      tr: 'SN: negatif uzaklıkların ağırlıklı toplamı.',
      tex: String.raw`SN_i = \sum_{j=1}^{n} w_j\, NDA_{ij}`,
      symbol: 'SN',
      texSymbol: '$SN_i$',
    },
    'edas.nsp': {
      en: 'NSP: SP divided by the largest SP; 1 for the furthest above average.',
      tr: 'NSP: SP bölü en büyük SP; ortalamanın en çok üstünde olana 1.',
      tex: String.raw`NSP_i = \frac{SP_i}{\max_k SP_k}`,
      edgeCase: {
        en: 'If every SP is 0, NSP is 0 for all.',
        tr: 'Bütün SP değerleri 0 ise herkesin NSP değeri 0 olur.',
      },
      symbol: 'NSP',
      texSymbol: '$NSP_i$',
    },
    'edas.nsn': {
      en: 'NSN: 1 minus SN over the largest SN; 0 for the furthest below average.',
      tr: 'NSN: 1 eksi SN bölü en büyük SN; ortalamanın en çok altında olana 0.',
      tex: String.raw`NSN_i = 1 - \frac{SN_i}{\max_k SN_k}`,
      edgeCase: {
        en: 'If every SN is 0, NSN is 1 for all.',
        tr: 'Bütün SN değerleri 0 ise herkesin NSN değeri 1 olur.',
      },
      symbol: 'NSN',
      texSymbol: '$NSN_i$',
    },
    'edas.scores': {
      en: 'Appraisal score AS, between 0 and 1; higher ranks better.',
      tr: 'Değerlendirme skoru AS, 0 ile 1 arasında; yüksek olan önde sıralanır.',
      tex: String.raw`AS_i = \tfrac{1}{2}\left(NSP_i + NSN_i\right)`,
      edgeCase: {
        en: 'If no alternative is away from the average, every AS is 0.5.',
        tr: 'Hiçbir alternatif ortalamadan uzak değilse bütün AS değerleri 0,5 olur.',
      },
      symbol: 'AS',
      texSymbol: '$AS_i$',
    },
  },
} satisfies MethodSteps
