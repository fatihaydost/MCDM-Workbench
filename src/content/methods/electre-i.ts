import type { MethodContent } from '../types'

// Source: docs/research/methods/electre-i.md
export const electreI: MethodContent = {
  id: 'electre-i',
  name: { en: 'ELECTRE I', tr: 'ELECTRE I' },
  fullName: { en: 'ELimination Et Choix Traduisant la REalité I', tr: 'Gerçeği yansıtan eleme ve seçim I' },
  family: 'ranking-outranking',
  status: 'available',
  year: 1968,
  origin: {
    authors: 'Roy, B.',
    year: 1968,
    title: 'Classement et choix en présence de points de vue multiples (la méthode ELECTRE)',
    venue: "Revue française d'informatique et de recherche opérationnelle 2(8), 57-75",
    doi: '10.1051/ro/196802V100571',
    note: {
      en: 'Earlier SEMA report: Benayoun, Roy & Sussmann (1966). The normalized textbook variant common in Turkish papers follows Hwang & Yoon (1981) and Yoon & Hwang (1995).',
      tr: 'Daha önceki SEMA raporu: Benayoun, Roy ve Sussmann (1966). Türkçe makalelerde yaygın olan normalize ders kitabı varyantı Hwang ve Yoon (1981) ile Yoon ve Hwang (1995) kaynaklarını izler.',
    },
  },
  steps: [
    {
      title: { en: 'Orient all criteria', tr: 'Tüm kriterlerin aynı yöne çevrilmesi' },
      tex: String.raw`g_j(a) = \begin{cases} x_{aj} & j \in J^{+} \\ -x_{aj} & j \in J^{-} \end{cases}`,
    },
    {
      title: { en: 'Concordance', tr: 'Uyum' },
      tex: String.raw`C(a,b) = \frac{\sum_{j:\, g_j(a) \ge g_j(b)} w_j}{\sum_{j} w_j}`,
      note: {
        en: 'The weighted share of criteria on which a is at least as good as b; ties count as concordant.',
        tr: "a'nın en az b kadar iyi olduğu kriterlerin ağırlıklı payı; eşitlikler uyumlu sayılır.",
      },
    },
    {
      title: { en: 'Discordance', tr: 'Uyumsuzluk' },
      tex: String.raw`D(a,b) = \frac{\max\left(0,\ \max_j \left[g_j(b) - g_j(a)\right]\right)}{\delta}, \qquad \delta = \max_j \left(\max_i g_{ij} - \min_i g_{ij}\right)`,
      note: {
        en: 'Roy variant: delta is the largest range on the common scale; dividing each difference by its own criterion range is an option that removes the common-scale requirement.',
        tr: 'Roy varyantı: delta ortak ölçekteki en geniş aralıktır; her farkı kendi kriterinin aralığına bölmek ortak ölçek şartını kaldıran bir seçenektir.',
      },
    },
    {
      title: { en: 'Outranking relation', tr: 'Üstünlük ilişkisi' },
      tex: String.raw`a \mathrel{S} b \iff C(a,b) \ge \hat c \ \wedge\ D(a,b) \le \hat d, \qquad a \ne b`,
    },
    {
      title: { en: 'Kernel', tr: 'Çekirdek' },
      tex: String.raw`K \subseteq A: \quad \nexists\, a, b \in K:\ a \mathrel{S} b, \qquad \forall\, b \notin K\ \exists\, a \in K:\ a \mathrel{S} b`,
      note: {
        en: 'Merge every cycle of S into one class, then repeatedly take the classes with no incoming arc and delete what they outrank, so no member outranks another and every non-member is outranked by some member.',
        tr: 'S içindeki her döngü tek sınıfa birleştirilir, sonra kendisine ok gelmeyen sınıflar alınıp üstün geldikleri silinir ve bu tekrarlanır; böylece hiçbir üye diğerine üstün gelmez, üye olmayan her alternatife bir üye üstün gelir.',
      },
    },
    {
      title: { en: 'Net concordance, discordance, and score', tr: 'Net uyum, uyumsuzluk ve skor' },
      tex: String.raw`C_a = \sum_{b \ne a}\bigl(C(a,b) - C(b,a)\bigr), \quad D_a = \sum_{b \ne a}\bigl(D(a,b) - D(b,a)\bigr), \quad \Phi(a) = \frac{C_a - D_a}{2(m - 1)}`,
      note: {
        en: 'Where a complete ranking is needed, following van Delft and Nijkamp (1977) and Hwang and Yoon (1981), net concordance and net discordance indices rank alternatives by higher net concordance and lower net discordance.',
        tr: 'Tam sıralama gerektiğinde van Delft ve Nijkamp (1977) ile Hwang ve Yoon (1981) izlenerek net uyum ve net uyumsuzluk indeksleri alternatifleri yüksek net uyum ve düşük net uyumsuzluğa göre sıralar.',
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'ahp',
      text: {
        en: 'AHP then ELECTRE (Hwang-Yoon variant): Soner & Önüt (2006), supplier selection. ANP then ELECTRE also appears in Turkish supplier-selection work.',
        tr: 'AHP ardından ELECTRE (Hwang-Yoon varyantı): Soner ve Önüt (2006), tedarikçi seçimi. Türkçe tedarikçi seçimi çalışmalarında ANP ardından ELECTRE de görülür.',
      },
    },
    {
      methodId: 'entropy',
      text: {
        en: 'Entropy or CRITIC then ELECTRE for the financial performance of Turkish banks and firms (for example Çağıl 2011).',
        tr: 'Türk banka ve şirketlerinin finansal performansı için Entropi ya da CRITIC ardından ELECTRE (örneğin Çağıl 2011).',
      },
    },
    {
      text: {
        en: 'Chains such as SMART then ELECTRE then TOPSIS (Sayed 2016) re-rank a kernel with a compensatory method without a stated reason; the site discourages them.',
        tr: 'SMART ardından ELECTRE ardından TOPSIS gibi zincirler (Sayed 2016) çekirdeği gerekçe göstermeden telafi edici bir yöntemle yeniden sıralar; site bunları önermez.',
      },
    },
  ],
  reference: {
    source: 'Wang, X.; Triantaphyllou, E. (2008). Ranking irregularities when evaluating alternatives by using some ELECTRE methods. Omega 36(1), 45-63',
    doi: '10.1016/j.omega.2005.12.003',
    match: 'match',
    note: {
      en: 'Published example (Section 3.1, pp. 48-49, concordance and discordance matrices): Galway wastewater plant, 5 alternatives, 7 criteria. Concordance and discordance matrices match to 1e-12. Condensing the mutual outranking cycle between A2 and A3 yields the kernel {A2, A3, A5}. A second check on Soner & Önüt (2006) reproduces the concordance matrix and net concordance indices.',
      tr: 'Yayımlanmış örnek (Bölüm 3.1, s. 48-49, uyum ve uyumsuzluk matrisleri): Galway atık su tesisi, 5 alternatif, 7 kriter. Uyum ve uyumsuzluk matrisleri 1e-12 duyarlıkla örtüşüyor. A2 ile A3 arasındaki karşılıklı üstünlük döngüsü daraltıldığında {A2, A3, A5} çekirdeği elde edilir. Soner ve Önüt (2006) üzerindeki ikinci kontrol uyum matrisini ve net uyum indekslerini birebir üretir.',
    },
  },
  sources: [
    { label: 'Roy (1968), RIRO 2(8), 57-75', doi: '10.1051/ro/196802V100571' },
    { label: 'Hwang & Yoon (1981), Multiple Attribute Decision Making, Springer', doi: '10.1007/978-3-642-48318-9' },
    { label: 'Yoon & Hwang (1995), Sage', doi: '10.4135/9781412985161' },
    { label: 'Figueira, Mousseau & Roy (2005), ELECTRE methods', doi: '10.1007/0-387-23081-5_4' },
    { label: 'Wang & Triantaphyllou (2008), Omega 36(1), 45-63', doi: '10.1016/j.omega.2005.12.003' },
    { label: 'Soner & Önüt (2006), Çok kriterli tedarikçi seçimi: bir ELECTRE-AHP uygulaması, Sigma 24(4), 110-120' },
    { label: 'Govindan & Jepsen (2016), EJOR 250(1), 1-29', doi: '10.1016/j.ejor.2015.07.019' },
  ],
  en: {
    summary:
      'ELECTRE I drops an alternative only if another beats it on enough weighted criteria and is never much worse on any. The result is a shortlist (the kernel), not a full ranking.',
    whenToUse: [
      'The task is choice or screening, not ranking.',
      'You want a transparent majority rule with a veto.',
      'Teaching outranking before ELECTRE III or PROMETHEE.',
    ],
    whenNot: [
      'A complete ranking is required (the Turkish net add-on is another variant).',
      'Roy variant on mixed scales: discordance compares raw differences across criteria.',
      'You cannot justify the thresholds c and d.',
    ],
    inputs: [
      'Decision matrix, criterion directions, positive weights.',
      'Roy variant: concordance threshold c between 0.5 and 1 (default 0.75) and discordance threshold d between 0 and 1 (default 0.50). Criteria must share one scale.',
      'Hwang-Yoon variant: thresholds are the means of C and D; needs a normalization.',
    ],
    pitfalls: [
      'With mixed units the criterion with the largest unit dominates D; check the scale or use per-criterion ranges.',
      'S can contain cycles, and the kernel exists only after merging them.',
      'The kernel changes with c and d; show it on a small grid of thresholds.',
    ],
  },
  tr: {
    summary:
      'ELECTRE I bir alternatifi yalnız başka biri onu yeterince ağırlıklı kriterde geçiyor ve hiçbir kriterde çok geride kalmıyorsa eler. Sonuç tam sıralama değil, kısa bir listedir (çekirdek).',
    whenToUse: [
      'İş sıralama değil, seçim ya da eleme.',
      'Veto hakkı olan şeffaf bir çoğunluk kuralı istiyorsunuz.',
      'ELECTRE III ya da PROMETHEE öncesinde üstünlük mantığını öğretmek.',
    ],
    whenNot: [
      'Tam sıralama gerekiyor (Türkçe literatürdeki net uyum eki ayrı bir varyant).',
      'Ortak ölçek olmadan Roy varyantı: uyumsuzluk ham farkları kriterler arasında karşılaştırır.',
      'c ve d eşiklerini gerekçelendiremiyorsunuz.',
    ],
    inputs: [
      'Karar matrisi, kriter yönleri, pozitif ağırlıklar.',
      'Roy varyantı: 0,5 ile 1 arasında uyum eşiği c (varsayılan 0,75) ve 0 ile 1 arasında uyumsuzluk eşiği d (varsayılan 0,50). Kriterler tek bir ölçeği paylaşmalı.',
      'Hwang-Yoon varyantı: eşikler C ve D ortalamalarıdır; normalizasyon gerekir.',
    ],
    pitfalls: [
      "Karışık birimlerde en büyük birimli kriter D'ye hükmeder; ölçeği denetleyin ya da kriter başına aralık kullanın.",
      'S döngü içerebilir; çekirdek ancak döngüler birleştirildikten sonra tanımlıdır.',
      'Çekirdek c ve d ile değişir; küçük bir eşik ızgarasında gösterin.',
    ],
  },
}
