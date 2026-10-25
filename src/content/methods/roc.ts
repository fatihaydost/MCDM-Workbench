import type { MethodContent } from '../types'

// Source: docs/research/methods/roc.md
export const roc: MethodContent = {
  id: 'roc',
  name: { en: 'ROC', tr: 'ROC' },
  fullName: {
    en: 'Rank-order weights: Rank Order Centroid, Rank Sum, Rank Reciprocal',
    tr: 'Sıraya dayalı ağırlıklar: sıra merkezi (ROC), sıra toplamı, ters sıra',
  },
  family: 'weighting-subjective',
  status: 'available',
  year: 1996,
  origin: {
    authors: 'Barron, F.H.; Barrett, B.E.',
    year: 1996,
    title: 'Decision Quality Using Ranked Attribute Weights',
    venue: 'Management Science 42(11), 1515-1523',
    doi: '10.1287/mnsc.42.11.1515',
    note: {
      en: 'Roszkowska (2013) also credits Solymosi & Dombi (1986) for centroid weights, and Rank Sum and Rank Reciprocal come from Stillwell, Seaver & Edwards (1981); the formulas follow Roszkowska (2013).',
      tr: 'Roszkowska (2013) merkez ağırlıkları için Solymosi ve Dombi (1986) kaynağını da anar; sıra toplamı ve ters sıra Stillwell, Seaver ve Edwards (1981) kaynaklıdır, formüller Roszkowska (2013) anlatımını izler.',
    },
  },
  steps: [
    {
      title: { en: 'Rank order centroid (default)', tr: 'Sıra merkezi (varsayılan)' },
      tex: String.raw`w(r) = \frac{1}{n}\sum_{k=r}^{n} \frac{1}{k}`,
      note: {
        en: 'r is the rank of the criterion (1 = most important), and each formula sums to 1 without further normalization, with w_j = w(r_j).',
        tr: "r kriterin sırasıdır (1 = en önemli); her formül ek normalizasyon olmadan 1'e toplanır, w_j = w(r_j).",
      },
    },
    {
      title: { en: 'Rank sum', tr: 'Sıra toplamı' },
      tex: String.raw`w(r) = \frac{2\,(n + 1 - r)}{n\,(n + 1)}`,
    },
    {
      title: { en: 'Rank reciprocal', tr: 'Ters sıra' },
      tex: String.raw`w(r) = \frac{1/r}{\sum_{k=1}^{n} 1/k}`,
    },
  ],
  combinedWith: [
    {
      methodId: 'saw',
      text: {
        en: 'ROC, RS or RR then SAW, and a comparison of AHP with rank weights: Roszkowska (2013).',
        tr: 'ROC, RS ya da RR ardından SAW ve AHP ile sıra ağırlıklarının karşılaştırması: Roszkowska (2013).',
      },
    },
    {
      methodId: 'ahp',
      text: {
        en: 'Rank weights as surrogate weights in decision-quality simulations and compared against AHP pairwise weights: Barron & Barrett (1996); Roszkowska (2013).',
        tr: 'Karar kalitesi benzetimlerinde vekil ağırlık olarak sıra ağırlıkları ve AHP ikili ağırlıklarıyla karşılaştırma: Barron ve Barrett (1996); Roszkowska (2013).',
      },
    },
  ],
  reference: {
    source: 'Roszkowska, E. (2013). Rank Ordering Criteria Weighting Methods: a Comparative Overview. Optimum. Studia Ekonomiczne 5(65), 14-33',
    doi: '10.15290/ose.2013.05.65.02',
    match: 'match',
    note: {
      en: 'Published example (Table 4, row n = 4, and Tables 5-6, n = 5). For n = 4, ROC, RS and RR match the printed 2 decimals (0.52, 0.27, 0.15, 0.06; 0.40, 0.30, 0.20, 0.10; 0.48, 0.24, 0.16, 0.12). In the 5 x 5 case study (Tables 5-6), ROC weights give the same SAW ranking A4 > A2 > A5 > A1 > A3.',
      tr: 'Yayımlanmış örnek (Tablo 4, n = 4 satırı ve Tablo 5-6, n = 5). n = 4 için ROC, RS ve RR basılı 2 basamakta örtüşüyor (0,52, 0,27, 0,15, 0,06; 0,40, 0,30, 0,20, 0,10; 0,48, 0,24, 0,16, 0,12). 5 x 5 örnekte (Tablo 5-6) ROC ağırlıkları SAW ile aynı A4 > A2 > A5 > A1 > A3 sıralamasını verir.',
    },
  },
  sources: [
    { label: 'Barron & Barrett (1996), Management Science 42(11), 1515-1523', doi: '10.1287/mnsc.42.11.1515' },
    { label: 'Stillwell, Seaver & Edwards (1981), Organizational Behavior and Human Performance 28(1), 62-77', doi: '10.1016/0030-5073(81)90015-5' },
    { label: 'Solymosi & Dombi (1986), European Journal of Operational Research 26(1), 35-41', doi: '10.1016/0377-2217(86)90157-8' },
    { label: 'Roszkowska (2013), Optimum. Studia Ekonomiczne 5(65), 14-33', doi: '10.15290/ose.2013.05.65.02' },
    { label: 'pyDecision 5.1.1, roc_method and rsw_method', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'ROC, Rank Sum and Rank Reciprocal turn a ranking of criteria into weights. ROC, the usual default, favours the top criterion, Rank Sum falls in equal steps and Rank Reciprocal drops sharply.',
    whenToUse: [
      'Only ordinal information is available or agreed on (groups, time pressure).',
    ],
    whenNot: [
      'Differences can be quantified: use SWARA, AHP or BWM.',
      'Ties are frequent: the formulas assume a strict ranking.',
    ],
    inputs: [
      'A rank per criterion, 1 = most important; ties share the average weight of the positions they span.',
      'Formula: ROC (default), Rank Sum or Rank Reciprocal.',
    ],
    pitfalls: [
      'Tied criteria receive the average weight of the positions they span; if all tie, every weight is 1/n.',
      'n = 1 gives w = 1.',
      'Rank 1 means most important; pyDecision takes an ordered list of labels instead, which is easy to invert by mistake.',
    ],
  },
  tr: {
    summary:
      'ROC, sıra toplamı ve ters sıra, kriterlerin sıralamasını ağırlığa çevirir. Genelde varsayılan olan ROC ilk kritere belirgin pay verir, sıra toplamı eşit adımlarla azalır, ters sıra hızla düşer.',
    whenToUse: [
      'Yalnız sıralama bilgisi var ya da yalnız onda uzlaşılıyor (gruplar, zaman baskısı).',
    ],
    whenNot: [
      'Farklar sayıyla ifade edilebiliyor: SWARA, AHP ya da BWM kullanın.',
      'Eşitlikler sık: formüller kesin bir sıralama varsayar.',
    ],
    inputs: [
      'Her kriter için bir sıra, 1 = en önemli; eşit sıralar kapladıkları konumların ortalama ağırlığını alır.',
      'Formül: ROC (varsayılan), sıra toplamı ya da ters sıra.',
    ],
    pitfalls: [
      'Eşit sıradaki kriterler kapladıkları konumların ortalama ağırlığını alır; tümü eşitse her ağırlık 1/n olur.',
      'n = 1 için w = 1.',
      'Sıra 1 en önemli demektir; pyDecision bunun yerine sıralı etiket listesi alır, yanlışlıkla ters çevirmek kolaydır.',
    ],
  },
}
