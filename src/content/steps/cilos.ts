import type { MethodSteps } from './types'

export const cilos = {
  flow: [
    { key: 'cilos.normalized', stepKeys: ['cilos.normalized'] },
    { key: 'cilos.squareMatrix', stepKeys: ['cilos.squareMatrix'] },
    { key: 'cilos.lossMatrix', stepKeys: ['cilos.lossMatrix'] },
    { key: 'cilos.systemMatrix', stepKeys: ['cilos.systemMatrix'] },
    { key: 'cilos.weights', stepKeys: ['cilos.weights'] },
  ],
  steps: {
    'cilos.normalized': {
      en: 'Invert cost criteria by the column minimum, then divide each column by its sum.',
      tr: 'Maliyet kriterlerini sütun minimumuyla ters çevirin, ardından her sütunu toplamına bölün.',
      tex: '\\tilde{x}_{ij} = \\begin{cases} x_{ij}, & j \\in B \\\\ \\dfrac{\\min_r x_{rj}}{x_{ij}}, & j \\in C \\end{cases}, \\qquad \\bar{x}_{ij} = \\frac{\\tilde{x}_{ij}}{\\sum_{r=1}^{m} \\tilde{x}_{rj}}',
      edgeCase: {
        en: 'A constant column gets 1/m in every row and receives weight 0.',
        tr: 'Sabit bir sütun her satırda 1/m alır ve ağırlığı 0 olur.',
      },
    },
    'cilos.squareMatrix': {
      en: 'Take the normalized row of the winning alternative for each criterion.',
      tr: 'Her kriter için en yüksek paylı alternatifin normalize satırını alın.',
      tex: 'a_{ij} = \\bar{x}_{k_i j}, \\qquad k_i = \\arg\\max_{1 \\le r \\le m} \\bar{x}_{ri}, \\qquad a_{ii} = \\max_{1 \\le r \\le m} \\bar{x}_{ri}',
      edgeCase: {
        en: 'Ties for the column maximum use the first matching alternative.',
        tr: 'Sütun maksimumundaki eşitliklerde ilk sıradaki alternatif seçilir.',
      },
    },
    'cilos.lossMatrix': {
      en: 'Measure the relative loss on criterion j when criterion i is at its best.',
      tr: 'Kriter i en iyi değerindeyken kriter j üzerindeki göreli kaybı ölçün.',
      tex: 'p_{ij} = \\frac{a_{jj} - a_{ij}}{a_{jj}}, \\qquad p_{ii} = 0',
    },
    'cilos.systemMatrix': {
      en: 'Place the negative column sums of P on the main diagonal to form F.',
      tr: 'F matrisini kurmak için P sütun toplamlarının negatifini ana köşegene yazın.',
      tex: 'f_{ij} = p_{ij}\\;(i \\neq j), \\qquad f_{jj} = -\\sum_{i \\neq j} p_{ij}',
    },
    'cilos.weights': {
      en: 'Solve the homogeneous linear system F q = 0 with weights summing to 1.',
      tr: 'Ağırlıklar toplamı 1 olacak biçimde F q = 0 doğrusal sistemini çözün.',
      tex: 'F q = 0, \\qquad \\sum_{j=1}^{n} q_j = 1, \\qquad w_j = q_j',
      edgeCase: {
        en: 'If all varying criteria share one winner, they share the weight equally.',
        tr: 'Değişen tüm kriterler aynı kazananı paylaşırsa ağırlığı eşit paylaşırlar.',
      },
    },
  },
} satisfies MethodSteps
