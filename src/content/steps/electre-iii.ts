import type { MethodSteps } from './types'

/** ELECTRE III: the steps src/core/methods/electre-iii.ts emits, with the formulas the code follows. */
export const electreIII = {
  flow: [
    { key: 'electre-iii.concordance', stepKeys: ['electre-iii.concordance'] },
    { key: 'electre-iii.credibility', stepKeys: ['electre-iii.credibility'] },
    { key: 'electre-iii.descending', stepKeys: ['electre-iii.descending', 'electre-iii.ascending'] },
    { key: 'electre-iii.netCredibility', stepKeys: ['electre-iii.netCredibility'] },
  ],
  steps: {
    'electre-iii.concordance': {
      en: 'Weighted share of criteria supporting that alternative a is at least as good.',
      tr: 'Alternatif a’nın en az b kadar iyi olduğunu destekleyen ağırlıklı kriter payı.',
      tex: String.raw`C(a,b) = \frac{\sum_{j=1}^{n} w_j c_j(a,b)}{\sum_{j=1}^{n} w_j}, \qquad C(a,a) = 0`,
      edgeCase: {
        en: 'Advantage below q gives full support 1; advantage above p gives 0.',
        tr: 'Fark q altında ise tam destek 1, p üstünde ise 0 verir.',
      },
      symbol: 'C',
      texSymbol: '$C$',
    },
    'electre-iii.credibility': {
      en: 'Outranking credibility after attenuating global concordance by any stronger single-criterion discordance.',
      tr: 'Küresel uyumun, daha yüksek tek kriterli uyumsuzluklarla zayıflatılması sonrasındaki geçiş güvenilirliği.',
      tex: String.raw`\sigma(a,b) = C(a,b) \prod_{j:\, d_j(a,b) > C(a,b)} \frac{1 - d_j(a,b)}{1 - C(a,b)}`,
      edgeCase: {
        en: 'Full veto on any criterion reduces the credibility of outranking to 0.',
        tr: 'Herhangi bir kriterde tam veto oluştuğunda geçiş güvenilirliği 0 değerine düşer.',
      },
      symbol: 'σ',
      texSymbol: '$\\sigma$',
    },
    'electre-iii.descending': {
      en: 'Competition rank from top-down distillation, extracting highest-qualification alternatives at successively lower cutoffs.',
      tr: 'Kesim düzeyini düşürerek en yüksek nitelikli alternatifleri yukarıdan aşağıya ayıklayan damıtma sırası.',
      tex: String.raw`Q(a) = |\{b \in D : a \mathrel{S^{\lambda}} b\}| - |\{b \in D : b \mathrel{S^{\lambda}} a\}|`,
      symbol: 'r↓',
      texSymbol: '$r_D$',
    },
    'electre-iii.ascending': {
      en: 'Competition rank from bottom-up distillation, extracting lowest-qualification alternatives first from the bottom.',
      tr: 'En düşük nitelikli alternatifleri aşağıdan yukarıya doğru önce ayıklayan artan damıtma sırası.',
      tex: String.raw`D_{\uparrow} = \arg\min_{a \in D} Q(a)`,
      edgeCase: {
        en: 'When descending and ascending ranks reverse two alternatives, that pair is incomparable.',
        tr: 'Azalan ve artan sıralar iki alternatifi ters sıraladığında bu çift kıyaslanamaz.',
      },
      symbol: 'r↑',
      texSymbol: '$r_A$',
    },
    'electre-iii.netCredibility': {
      en: 'Average outgoing minus incoming credibility across all other alternatives, summing to zero.',
      tr: 'Diğer tüm alternatiflere karşı giden eksi gelen ortalama güvenilirlik akışı; toplamı sıfırdır.',
      tex: String.raw`\Phi(a) = \frac{1}{m - 1}\sum_{b \ne a}\bigl(\sigma(a,b) - \sigma(b,a)\bigr) \in [-1, 1]`,
      edgeCase: {
        en: 'Outgoing and incoming credibilities balance across pairs, so net credibilities sum to 0.',
        tr: 'Giden ve gelen güvenilirlikler dengelendiğinden tüm net akışların toplamı 0 olur.',
      },
      symbol: 'Φ',
      texSymbol: '$\\Phi_a$',
      signed: true,
    },
  },
} satisfies MethodSteps
