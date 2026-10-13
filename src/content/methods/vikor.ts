import type { MethodContent } from '../types'

// Source: docs/research/methods/vikor.md
export const vikor: MethodContent = {
  id: 'vikor',
  name: { en: 'VIKOR', tr: 'VIKOR' },
  fullName: { en: 'VIseKriterijumska Optimizacija I Kompromisno Resenje', tr: 'Çok kriterli optimizasyon ve uzlaşık çözüm' },
  family: 'ranking-distance',
  status: 'available',
  year: 1998,
  origin: {
    authors: 'Opricovic, S.',
    year: 1998,
    title: 'Multicriteria Optimization of Civil Engineering Systems',
    venue: 'Faculty of Civil Engineering, Belgrade',
    note: {
      en: 'Book in Serbian; the English statement used here is Opricovic & Tzeng (2004).',
      tr: 'Sırpça kitap; burada kullanılan İngilizce anlatım Opricovic ve Tzeng (2004).',
    },
  },
  steps: [
    {
      title: { en: 'Best and worst per criterion', tr: 'Kriter başına en iyi ve en kötü' },
      tex: String.raw`f_j^{*} = \begin{cases} \max_i x_{ij} & j \in J^{+} \\ \min_i x_{ij} & j \in J^{-} \end{cases} \qquad f_j^{-} = \begin{cases} \min_i x_{ij} & j \in J^{+} \\ \max_i x_{ij} & j \in J^{-} \end{cases}`,
    },
    {
      title: { en: 'Group utility and individual regret', tr: 'Grup faydası ve bireysel pişmanlık' },
      tex: String.raw`S_i = \sum_{j=1}^{n} w_j \frac{f_j^{*} - x_{ij}}{f_j^{*} - f_j^{-}}, \qquad R_i = \max_j\ w_j \frac{f_j^{*} - x_{ij}}{f_j^{*} - f_j^{-}}`,
    },
    {
      title: { en: 'Compromise index', tr: 'Uzlaşı indeksi' },
      tex: String.raw`Q_i = v\,\frac{S_i - S^{*}}{S^{-} - S^{*}} + (1 - v)\,\frac{R_i - R^{*}}{R^{-} - R^{*}}`,
      note: {
        en: 'S* = min S, S- = max S and the same for R; rank by S, R and Q ascending, lower is better.',
        tr: "S* = min S, S- = maks S, R için de aynısı; S, R ve Q'ya göre küçükten büyüğe sıralanır, küçük olan iyidir.",
      },
    },
    {
      title: { en: 'Acceptable advantage and stability', tr: 'Kabul edilebilir avantaj ve kararlılık' },
      tex: String.raw`C1:\ Q(a'') - Q(a') \ge DQ, \qquad DQ = \frac{1}{m - 1}`,
      note: {
        en: "With a' first and a'' second by Q, and C2 meaning a' also leads by S or R, the compromise set is a' alone if both hold, a' and a'' if only C1 holds, and every alternative within DQ of a' if C1 fails.",
        tr: "Q'ya göre a' birinci, a'' ikinci ve C2 a' alternatifinin S ya da R'ye göre de birinci olması iken uzlaşık küme, ikisi de sağlanırsa yalnız a', yalnız C1 sağlanırsa a' ve a'', C1 sağlanmazsa Q değeri a' alternatifine DQ'dan yakın tüm alternatiflerdir.",
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'ahp',
      text: {
        en: 'AHP then VIKOR, and fuzzy Delphi with AHP then VIKOR, in sustainability and renewable-energy papers (Mardani et al. 2016). 1,753 AHP-VIKOR co-mentions in OpenAlex.',
        tr: "Sürdürülebilirlik ve yenilenebilir enerji makalelerinde AHP ardından VIKOR ve bulanık Delphi ile AHP ardından VIKOR (Mardani vd. 2016). OpenAlex'te 1.753 AHP-VIKOR ortak geçişi.",
      },
    },
    {
      methodId: 'topsis',
      text: {
        en: 'VIKOR together with TOPSIS for comparison (Opricovic & Tzeng 2004).',
        tr: 'Karşılaştırma için TOPSIS ile birlikte VIKOR (Opricovic ve Tzeng 2004).',
      },
    },
    {
      methodId: 'bwm',
      text: {
        en: 'BWM then VIKOR, for example Gupta (2018).',
        tr: 'BWM ardından VIKOR; örneğin Gupta (2018).',
      },
    },
  ],
  reference: {
    source: 'Opricovic, S.; Tzeng, G.-H. (2004). Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS. European Journal of Operational Research 156(2), 445-455',
    doi: '10.1016/S0377-2217(03)00020-1',
    match: 'match',
    note: {
      en: 'Published example (Tables 1-3), reproduced by the tests: in the mountain-climbing example S, R and Q match Table 3 exactly, C1 and C2 hold, the compromise is A2, and the other unit encoding (problem φ) gives the same numbers. The Q ranks also equal the published VIKOR ranks of Keshavarz Ghorabaee et al. (2015) in 7 of 7 weight sets with v = 0.5 (the paper does not state v).',
      tr: "Yayımlanmış örnek (Tablo 1-3), testlerde yeniden üretiliyor: dağ tırmanışı örneğinde S, R ve Q Tablo 3 ile birebir aynı, C1 ve C2 sağlanıyor, uzlaşık çözüm A2 ve öbür birim gösterimi (φ problemi) aynı sayıları veriyor. Q sıraları Keshavarz Ghorabaee vd. (2015) makalesinin yayımlanmış VIKOR sıralarıyla 7 ağırlık setinin 7'sinde aynı; v = 0,5 ile (makale v'yi belirtmiyor).",
    },
  },
  sources: [
    { label: 'Opricovic (1998), Multicriteria Optimization of Civil Engineering Systems, Belgrade' },
    { label: 'Opricovic & Tzeng (2004), European Journal of Operational Research 156(2), 445-455', doi: '10.1016/S0377-2217(03)00020-1' },
    { label: 'Keshavarz Ghorabaee, Zavadskas, Olfat & Turskis (2015), Informatica 26(3), 435-451', doi: '10.15388/Informatica.2015.57' },
    { label: 'Mardani et al. (2016), VIKOR Technique: A Systematic Review, Sustainability 8(1), 37', doi: '10.3390/su8010037' },
    { label: 'pyDecision 5.1.1, vikor_method', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'VIKOR picks the compromise that is best overall (S) while keeping the worst single-criterion regret small (R). If the winner is not clearly ahead, it returns a short list of compromises.',
    whenToUse: [
      'Conflicting criteria and decision makers who want a compromise.',
      'An explicit test of whether the winner is stable (C1, C2).',
      'Units may change: linear normalization is unaffected, unlike TOPSIS.',
    ],
    whenNot: [
      'Few alternatives: DQ = 1/(m-1) is 0.5 at m = 3, C1 rarely holds.',
      'The alternative set will change: best and worst values move with it.',
    ],
    inputs: [
      'Decision matrix, criterion type per column, weights summing to 1.',
      'Parameter v between 0 and 1, default 0.5 (weight of the "majority of criteria" strategy). Above 0.5 leans to majority, below to veto; set it with the slider.',
      'Output: S, R, Q (lower is better), three rankings, conditions C1 and C2, and the compromise set.',
    ],
    pitfalls: [
      'If all S (or all R) are equal, that term of Q is undefined; it is set to 0, with a notice.',
      'With 2 alternatives DQ = 1, so C1 needs a Q gap of 1.',
      'Q is relative to this alternative set (0 best, 1 worst); do not compare it across problems.',
    ],
  },
  tr: {
    summary:
      'VIKOR genel toplamda en iyi olan (S) ve tek bir kriterdeki en büyük pişmanlığı küçük tutan (R) uzlaşık alternatifi seçer. Kazanan açık ara önde değilse kısa bir uzlaşık seçenek listesi döndürür.',
    whenToUse: [
      'Çelişen kriterler ve uzlaşı arayan karar vericiler.',
      'Kazananın kararlı olup olmadığını açıkça sınamak istiyorsunuz (C1, C2).',
      "Birimler değişebilir: doğrusal normalizasyon TOPSIS'in aksine etkilenmez.",
    ],
    whenNot: [
      'Alternatif az: DQ = 1/(m-1), m = 3 için 0,5; C1 nadiren sağlanır.',
      'Alternatif kümesi değişecek: en iyi ve en kötü değerler onunla kayar.',
    ],
    inputs: [
      'Karar matrisi, her sütun için kriter türü, toplamı 1 olan ağırlıklar.',
      '0 ile 1 arasında v parametresi, varsayılan 0,5 ("kriterlerin çoğunluğu" stratejisinin ağırlığı). 0,5\'in üstü çoğunluğa, altı vetoya yaklaşır; kaydırıcıyla ayarlanır.',
      'Çıktı: S, R, Q (küçük olan iyi), üç sıralama, C1 ve C2 koşulları ve uzlaşık çözüm kümesi.',
    ],
    pitfalls: [
      'Bütün S (ya da bütün R) değerleri eşitse Q\'nun o terimi tanımsızdır; 0 alınır ve uyarı gösterilir.',
      '2 alternatifte DQ = 1 olur; C1 için Q farkının 1 olması gerekir.',
      'Q bu alternatif kümesine göredir (0 en iyi, 1 en kötü); problemler arasında karşılaştırmayın.',
    ],
  },
}
