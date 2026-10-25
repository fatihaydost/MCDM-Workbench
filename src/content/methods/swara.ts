import type { MethodContent } from '../types'

// Source: docs/research/methods/swara.md
export const swara: MethodContent = {
  id: 'swara',
  name: { en: 'SWARA', tr: 'SWARA' },
  fullName: { en: 'Step-wise Weight Assessment Ratio Analysis', tr: 'Adım adım ağırlık değerlendirme oran analizi' },
  family: 'weighting-subjective',
  status: 'available',
  year: 2010,
  origin: {
    authors: 'Keršulienė, V.; Zavadskas, E.K.; Turskis, Z.',
    year: 2010,
    title: 'Selection of rational dispute resolution method by applying new step-wise weight assessment ratio analysis (SWARA)',
    venue: 'Journal of Business Economics and Management 11(2), 243-258',
    doi: '10.3846/jbem.2010.12',
  },
  steps: [
    {
      title: { en: 'Sort and state the steps', tr: 'Sıralama ve adımlar' },
      tex: String.raw`k_1 = 1, \qquad k_j = s_j + 1 \quad (j \ge 2)`,
      note: {
        en: 'Criteria sorted from most to least important, and s_j says how much more important criterion j-1 is than criterion j, as a ratio (0.15 = 15%).',
        tr: 'Kriterler en önemliden en önemsize sıralıdır; s_j, j-1. kriterin j. kriterden ne kadar önemli olduğunu oran olarak söyler (0,15 = %15).',
      },
    },
    {
      title: { en: 'Recalculated weights', tr: 'Yeniden hesaplanan ağırlıklar' },
      tex: String.raw`q_1 = 1, \qquad q_j = \frac{q_{j-1}}{k_j} \quad (j \ge 2)`,
      note: {
        en: 'The origin paper calls this w and the final weight q; the letters are swapped here to match the other methods.',
        tr: 'Özgün makale buna w, nihai ağırlığa q der; diğer yöntemlerle uyum için harfler burada yer değiştirdi.',
      },
    },
    {
      title: { en: 'Final weights', tr: 'Nihai ağırlıklar' },
      tex: String.raw`w_j = \frac{q_j}{\sum_{k=1}^{n} q_k}`,
      note: {
        en: 'Weights come out in the sorted order and are mapped back to the input order.',
        tr: 'Ağırlıklar sıralı düzende çıkar ve girdi düzenine geri eşlenir.',
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'entropy',
      text: {
        en: 'SWARA with Entropy as combined subjective and objective weights, groundwater vulnerability: Torkashvand et al. (2020), as listed in Keshavarz-Ghorabaee et al. (2021).',
        tr: 'Yeraltı suyu kırılganlığı için öznel ve nesnel ağırlıkları birleştiren SWARA ile Entropi: Torkashvand vd. (2020), Keshavarz-Ghorabaee vd. (2021) listesinde.',
      },
    },
    {
      methodId: 'waspas',
      text: {
        en: 'SWARA then WASPAS is the largest SWARA pairing in OpenAlex (224 co-mentions, more than SWARA and TOPSIS); a Lithuanian-school pattern.',
        tr: "SWARA ardından WASPAS, OpenAlex'teki en büyük SWARA eşleşmesidir (224 ortak geçiş, SWARA ile TOPSIS'ten fazla); Litvanya okuluna özgü bir kalıp.",
      },
    },
    {
      methodId: 'saw',
      text: {
        en: 'The origin paper derives SWARA weights for six dispute-resolution criteria (Table 1); the workbench pairs them with an illustrative 4 x 6 rating matrix to demonstrate ranking.',
        tr: 'Özgün makale altı uyuşmazlık çözümü kriteri için SWARA ağırlıklarını türetir (Tablo 1); çalışma alanı sıralama gösterimi için bunları ilüstratif 4 x 6 puan matrisiyle eşleştirir.',
      },
    },
  ],
  reference: {
    source: 'Keršulienė, V.; Zavadskas, E.K.; Turskis, Z. (2010). Selection of rational dispute resolution method by applying new step-wise weight assessment ratio analysis (SWARA). Journal of Business Economics and Management 11(2), 243-258',
    doi: '10.3846/jbem.2010.12',
    match: 'match',
    note: {
      en: 'Published example (Table 1): six criteria for choosing a dispute resolution method. k, q and w match the printed 2 decimals (largest gap 0.0028 on w); the 4 x 6 alternative matrix in the workbench is illustrative.',
      tr: 'Yayımlanmış örnek (Tablo 1): uyuşmazlık çözüm yöntemi seçimi için altı kriter. k, q ve w basılı 2 basamakta örtüşüyor (w üzerinde en büyük fark 0,0028); çalışma alanındaki 4 x 6 alternatif matrisi ilüstratiftir.',
    },
  },
  sources: [
    { label: 'Keršulienė, Zavadskas & Turskis (2010), Journal of Business Economics and Management 11(2), 243-258', doi: '10.3846/jbem.2010.12' },
    { label: 'Keshavarz-Ghorabaee et al. (2021), Symmetry 13(4), 525', doi: '10.3390/sym13040525' },
    { label: 'Torkashvand, Neshat, Javadi & Yousefi (2021), Environmental Science and Pollution Research 28, 46704-46724', doi: '10.1007/s11356-020-11406-7' },
  ],
  en: {
    summary:
      'SWARA sorts the criteria by importance, then asks how much less important each one is than the one above (0.15 = 15% less). It chains these steps into weights with only n - 1 judgements.',
    whenToUse: [
      'Experts agree on a ranking and on the step sizes.',
      'Ranking plus "a bit or much less" is easier than pairwise.',
      'No consistency check needed: SWARA is consistent by construction.',
    ],
    whenNot: [
      'The ranking itself is disputed: SWARA takes it as given.',
      'You need a consistency indicator: use AHP or BWM.',
    ],
    inputs: [
      'Criteria sorted by decreasing importance.',
      'For each criterion after the first, a comparative importance s of 0 or more (0.15 = 15%). With several experts, average s first.',
    ],
    pitfalls: [
      'Order matters: the same s values in another order give other weights, so sort first.',
      'A negative s would make a lower-ranked criterion more important and contradicts the ranking; it is rejected (s = 0 is allowed).',
      'Large steps compound quickly (s = 1 means "twice as important"); show q.',
    ],
  },
  tr: {
    summary:
      'SWARA kriterleri önem sırasına dizer, sonra her kriterin üstündekinden ne kadar daha az önemli olduğunu sorar (0,15 = %15 daha az). Bu adımları zincirleyerek yalnız n - 1 yargıyla ağırlık üretir.',
    whenToUse: [
      'Uzmanlar sıralamada ve adım büyüklüklerinde uzlaşabiliyor.',
      'Sıralama ve "biraz ya da çok daha az" demek ikili karşılaştırmadan kolay.',
      'Tutarlılık denetimi gerekmiyor: SWARA yapısı gereği tutarlıdır.',
    ],
    whenNot: [
      'Sıralamanın kendisi tartışmalı: SWARA onu veri kabul eder.',
      'Tutarlılık göstergesi gerekiyor: AHP ya da BWM kullanın.',
    ],
    inputs: [
      'Önem sırasına göre azalan biçimde dizilmiş kriterler.',
      'İlkinden sonraki her kriter için 0 ya da daha büyük bir karşılaştırmalı önem s (0,15 = %15). Birden çok uzman varsa önce s değerlerinin ortalaması alınır.',
    ],
    pitfalls: [
      'Sıra önemlidir: aynı s değerleri başka bir sırada başka ağırlıklar verir, önce sıralayın.',
      'Negatif s alt sıradaki kriteri daha önemli yapar ve sıralamayla çelişir; reddedilir (s = 0 serbesttir).',
      'Büyük adımlar hızla katlanır (s = 1 "iki kat önemli" demektir); q değerlerini gösterin.',
    ],
  },
}
