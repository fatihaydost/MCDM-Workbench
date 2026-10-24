import type { MethodSteps } from './types'

/** AHP: the steps src/core/methods/ahp.ts emits, with the formulas the code follows. */
export const ahp = {
  flow: [
    { key: 'ahp.pairwiseMatrix', stepKeys: ['ahp.pairwiseMatrix'] },
    { key: 'ahp.lambdaMax', stepKeys: ['ahp.lambdaMax', 'ahp.consistencyIndex', 'ahp.consistencyRatio'] },
    { key: 'ahp.weights', stepKeys: ['ahp.weights'] },
  ],
  steps: {
    'ahp.pairwiseMatrix': {
      en: 'Pairwise comparison matrix: upper-triangle answers with reciprocal lower half and unit diagonal.',
      tr: 'İkili karşılaştırma matrisi: üst üçgende yanıtlarınız, alt üçgende tersleri ve köşegende 1 bulunur.',
      tex: String.raw`A = \left(a_{ik}\right)_{n \times n}, \qquad a_{ii} = 1, \qquad a_{ki} = \frac{1}{a_{ik}}`,
    },
    'ahp.lambdaMax': {
      en: 'Principal eigenvalue: the average ratio of each weighted row sum to its weight.',
      tr: 'Temel özdeğer: ağırlıklı satır toplamının ilgili ağırlığa oranlarının ortalamasıdır.',
      tex: String.raw`\lambda_{\max} = \frac{1}{n} \sum_{i=1}^{n} \frac{(A\,w)_i}{w_i}`,
      symbol: 'λmax',
      texSymbol: '$\\lambda_{\\max}$',
    },
    'ahp.consistencyIndex': {
      en: 'Consistency index: the excess of the principal eigenvalue over the criterion count.',
      tr: 'Tutarlılık indeksi: temel özdeğerin kriter sayısını aşan kısmının (n - 1) değerine oranıdır.',
      tex: String.raw`CI = \frac{\lambda_{\max} - n}{n - 1}`,
      edgeCase: {
        en: 'With 2 criteria, CI is 0 because one comparison cannot contradict itself.',
        tr: '2 kriterde tek karşılaştırma kendisiyle çelişemeyeceği için CI değeri 0 olur.',
      },
      symbol: 'CI',
      texSymbol: '$CI$',
    },
    'ahp.consistencyRatio': {
      en: 'Consistency ratio: the consistency index divided by the Saaty random index.',
      tr: 'Tutarlılık oranı: tutarlılık indeksinin Saaty rastgele indeks değerine bölümüdür.',
      tex: String.raw`CR = \frac{CI}{RI_n}`,
      edgeCase: {
        en: 'With 2 criteria, RI is 0 and CR is reported as 0.',
        tr: '2 kriterde RI değeri 0 olduğu için CR değeri 0 verilir.',
      },
      symbol: 'CR',
      texSymbol: '$CR$',
    },
    'ahp.weights': {
      en: 'Criterion weights: normalized priority vector from the principal eigenvector or geometric mean.',
      tr: 'Kriter ağırlıkları: temel özvektör veya satır geometrik ortalamasından gelen normalize öncelik vektörüdür.',
      tex: String.raw`A\,w = \lambda_{\max}\,w, \qquad g_i = \left(\prod_{k=1}^{n} a_{ik}\right)^{1/n}, \qquad \sum_{j=1}^{n} w_j = 1`,
      symbol: 'w',
      texSymbol: '$w_j$',
    },
    'ahpRanking.local': {
      en: 'Local priorities per criterion: from pairwise alternative comparisons or sum-normalized table values.',
      tr: 'Kriter başına yerel öncelikler: ikili alternatif karşılaştırmalarından veya toplam normalize tablo değerlerinden.',
      tex: String.raw`A_j\, p_j = \lambda_{\max}\, p_j \quad \vee \quad p_{ij} = r_{ij}, \qquad \sum_{i=1}^{m} p_{ij} = 1`,
      symbol: 'p',
      texSymbol: '$p_{ij}$',
    },
    'ahpRanking.weighted': {
      en: 'Weighted priorities: each local priority multiplied by its criterion weight.',
      tr: 'Ağırlıklı öncelikler: her yerel öncelik kendi kriter ağırlığıyla çarpılır.',
      tex: String.raw`v_{ij} = w_j \cdot p_{ij}`,
      symbol: 'v',
      texSymbol: '$v_{ij}$',
    },
    'ahpRanking.scores': {
      en: 'Global priorities S: the row sum of weighted priorities; higher ranks better.',
      tr: 'Genel öncelikler S: ağırlıklı önceliklerin satır toplamı; yüksek olan önde sıralanır.',
      tex: String.raw`S_i = \sum_{j=1}^{n} w_j\, p_{ij}`,
      symbol: 'S',
      texSymbol: '$S_i$',
    },
  },
} satisfies MethodSteps
