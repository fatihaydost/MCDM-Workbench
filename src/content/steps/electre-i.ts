import type { MethodSteps } from './types'

/** ELECTRE I: the steps src/core/methods/electre-i.ts emits, with the formulas the code follows. */
export const electreI = {
  flow: [
    { key: 'electre-i.oriented', stepKeys: ['electre-i.oriented'] },
    { key: 'electre-i.concordance', stepKeys: ['electre-i.concordance', 'electre-i.discordance'] },
    { key: 'electre-i.outranking', stepKeys: ['electre-i.outranking', 'electre-i.kernel'] },
    { key: 'electre-i.netScore', stepKeys: ['electre-i.netConcordance', 'electre-i.netDiscordance', 'electre-i.netScore'] },
  ],
  steps: {
    'electre-i.oriented': {
      en: 'Keep benefit criteria as given and negate cost criteria so larger is better.',
      tr: 'Daha büyük değer daha iyi olacak şekilde maliyet kriterlerinin işaretini ters çevirir.',
      tex: String.raw`g_j(a) = \begin{cases} x_{aj}, & j \in J^{+} \\ -x_{aj}, & j \in J^{-} \end{cases}`,
      symbol: 'g',
      texSymbol: '$g_{ij}$',
    },
    'electre-i.concordance': {
      en: 'Sum the weight shares of all criteria where alternative a matches or beats b.',
      tr: 'Alternatif a değerinin b değerine eşit veya üstün olduğu kriter ağırlık paylarını toplar.',
      tex: String.raw`C(a,b) = \frac{1}{W} \sum_{j:\, g_j(a) \ge g_j(b)} w_j, \qquad W = \sum_{j=1}^{n} w_j`,
      symbol: 'C',
      texSymbol: '$C(a,b)$',
    },
    'electre-i.discordance': {
      en: 'Find the largest scaled deficit where alternative a falls behind b on any criterion.',
      tr: 'Alternatif a değerinin b gerisinde kaldığı en büyük ölçekli kriter farkını bulur.',
      tex: String.raw`D(a,b) = \max_{j=1,\dots,n} \frac{\max(0,\, g_j(b) - g_j(a))}{\delta_j}`,
      edgeCase: {
        en: 'A zero span contributes zero discordance so constant criteria never trigger a veto.',
        tr: 'Sıfır açıklık sıfır uyumsuzluk üretir; sabit kriterler hiçbir zaman veto tetiklemez.',
      },
      symbol: 'D',
      texSymbol: '$D(a,b)$',
    },
    'electre-i.outranking': {
      en: 'Mark outranking when concordance meets its threshold and discordance stays within the veto limit.',
      tr: 'Uyum eşiği aşılıp uyumsuzluk veto sınırında kaldığında üstünlük bağı kurulur.',
      tex: String.raw`S(a,b) = 1 \iff C(a,b) \ge \hat{c} \;\land\; D(a,b) \le \hat{d}, \qquad a \ne b`,
      symbol: 'S',
      texSymbol: '$S(a,b)$',
    },
    'electre-i.kernel': {
      en: 'Condense mutual outranking cycles and select alternatives not outranked by any other kernel member.',
      tr: 'Karşılıklı üstünlük döngülerini daraltır ve başka çekirdek üyesince bastırılmayan alternatifleri seçer.',
      tex: String.raw`a \in K \iff \forall b \in K,\, S^*(b,a) = 0`,
      symbol: 'K',
      texSymbol: '$K_a$',
    },
    'electre-i.netConcordance': {
      en: 'Subtract incoming concordance from outgoing concordance across all rival alternatives.',
      tr: 'Diğer tüm alternatiflere karşı giden uyum toplamından gelen uyum toplamını çıkarır.',
      tex: String.raw`C_a = \sum_{b \ne a} \bigl(C(a,b) - C(b,a)\bigr), \qquad \sum_{a=1}^{m} C_a = 0`,
      symbol: 'C_a',
      texSymbol: '$C_a$',
      signed: true,
    },
    'electre-i.netDiscordance': {
      en: 'Subtract incoming discordance from outgoing discordance; lower values indicate fewer veto weaknesses.',
      tr: 'Giden uyumsuzluk toplamından gelen uyumsuzluğu çıkarır; düşük değer az zayıflık gösterir.',
      tex: String.raw`D_a = \sum_{b \ne a} \bigl(D(a,b) - D(b,a)\bigr), \qquad \sum_{a=1}^{m} D_a = 0`,
      symbol: 'D_a',
      texSymbol: '$D_a$',
      signed: true,
    },
    'electre-i.netScore': {
      en: 'Combine net concordance advantage and net discordance penalty into a normalized ranking score.',
      tr: 'Net uyum üstünlüğü ile net uyumsuzluk cezasını normalize edilmiş sıralama skorunda birleştirir.',
      tex: String.raw`\Phi(a) = \frac{C_a - D_a}{2(m - 1)} \in [-1, 1]`,
      symbol: 'Φ',
      texSymbol: '$\\Phi_a$',
      signed: true,
    },
  },
} satisfies MethodSteps
