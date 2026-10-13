import type { Bilingual, MethodId, Source } from './types'

/**
 * Data for the "which method should I use?" guide.
 * Source of truth: docs/research/combinations.md (sections A-D, F) and the method cards.
 * Claims the research note marks "(analysis)" are our own reasoning and carry basis: 'analysis';
 * the page must label them as such and not present them as established results.
 */

/** 'sourced' = backed by the cited literature; 'analysis' = our reasoning from the formulas. */
export type Basis = 'sourced' | 'analysis'

export const BASIS_LABEL: Readonly<Record<Basis, Bilingual>> = {
  sourced: { en: 'From the literature', tr: 'Literatürden' },
  analysis: { en: 'Our analysis', tr: 'Bizim analizimiz' },
}

// ---------------------------------------------------------------------------
// A. Common pipelines
// ---------------------------------------------------------------------------

export type Pipeline = {
  id: string
  weighting: MethodId
  ranking: MethodId
  /** OpenAlex works whose title or abstract mentions both methods (see coMentionQuery). */
  coMentions: number
  /** 'top' = the five most common pipelines; 'growing' = newer pipelines with fast uptake. */
  tier: 'top' | 'growing'
  evidence: Bilingual
  examples: Source[]
}

export const coMentionQuery = {
  date: '2026-09-29',
  source: 'OpenAlex title_and_abstract.search, all years, all document types',
  caveat: {
    en: 'A count is the number of works whose title or abstract mentions both methods. It includes comparisons and reviews, not only pipelines, so read it as a measure of how often the two appear together.',
    tr: 'Sayı, başlığında ya da özetinde iki yöntemin birlikte geçtiği çalışma sayısıdır. Yalnız boru hatlarını değil karşılaştırma ve incelemeleri de içerir; iki yöntemin ne sıklıkla birlikte anıldığının ölçüsü olarak okuyun.',
  },
} as const

const CEBI_2022: Source = {
  label: 'Çebi, Onar, Öztayşi & Kahraman (2022), Integration of AHP with other MCDM methods: a literature review, ISAHP 2022',
  url: 'https://isahp.org/uploads/36_001.pdf',
}
const MI_2019: Source = { label: 'Mi, Tang, Liao, Shen & Lev (2019), Omega 87, 205-225', doi: '10.1016/j.omega.2019.01.009' }

export const pipelines: readonly Pipeline[] = [
  {
    id: 'ahp-topsis',
    weighting: 'ahp',
    ranking: 'topsis',
    coMentions: 10451,
    tier: 'top',
    evidence: {
      en: 'The most common pipeline, crisp and fuzzy. TOPSIS is the first partner of AHP every year in the review by Çebi et al. (2022), and the two are the top methods in Turkish counts.',
      tr: 'Klasik ve bulanık biçimleriyle en yaygın boru hattı. Çebi vd. (2022) incelemesinde TOPSIS her yıl AHP\'nin ilk ortağı; Türkçe sayımlarda da ilk iki yöntem bunlar.',
    },
    examples: [
      CEBI_2022,
      { label: 'Dağdeviren, Yavuz & Kılınç (2009), weapon selection, fuzzy AHP-TOPSIS, Expert Systems with Applications 36, 8143-8151', doi: '10.1016/j.eswa.2008.10.016' },
      { label: 'Önüt & Soner (2008), Waste Management 28, 1552-1559', doi: '10.1016/j.wasman.2007.05.019' },
    ],
  },
  {
    id: 'entropy-topsis',
    weighting: 'entropy',
    ranking: 'topsis',
    coMentions: 4639,
    tier: 'top',
    evidence: {
      en: 'Entropy is the second partner of AHP in crisp studies (Çebi et al. 2022), and Entropy then TOPSIS recurs in the Turkish financial-performance papers we found (our reading of examples, not a count).',
      tr: 'Entropi, klasik çalışmalarda AHP\'nin ikinci ortağıdır (Çebi vd. 2022); Entropi ardından TOPSIS, bulduğumuz Türkçe finansal performans makalelerinde tekrar eder (örneklerden okumamız, sayım değil).',
    },
    examples: [
      { label: 'Deng, Yeh & Willis (2000), Computers & Operations Research 27, 963-973', doi: '10.1016/S0305-0548(99)00069-6' },
      { label: 'Ersoy & Orçun (2022), Entropi-TOPSIS, BIST financial performance', doi: '10.47138/jeaa.1187426' },
    ],
  },
  {
    id: 'ahp-vikor',
    weighting: 'ahp',
    ranking: 'vikor',
    coMentions: 1753,
    tier: 'top',
    evidence: {
      en: 'VIKOR is the second partner of fuzzy AHP (Çebi et al. 2022).',
      tr: 'VIKOR, bulanık AHP\'nin ikinci ortağıdır (Çebi vd. 2022).',
    },
    examples: [
      CEBI_2022,
      { label: 'Kaya & Kahraman (2010), fuzzy VIKOR and AHP, Istanbul energy planning, Energy 35, 2517-2527', doi: '10.1016/j.energy.2010.02.051' },
    ],
  },
  {
    id: 'ahp-promethee',
    weighting: 'ahp',
    ranking: 'promethee-ii',
    coMentions: 1484,
    tier: 'top',
    evidence: {
      en: 'Çebi et al. (2022) date the first AHP-PROMETHEE paper to 1995. The count covers PROMETHEE in general, not only PROMETHEE II.',
      tr: 'Çebi vd. (2022) ilk AHP-PROMETHEE makalesini 1995\'e tarihler. Sayı yalnız PROMETHEE II\'yi değil genel olarak PROMETHEE\'yi kapsar.',
    },
    examples: [CEBI_2022, { label: 'Dağdeviren (2008), Journal of Intelligent Manufacturing 19, 397-406', doi: '10.1007/s10845-008-0091-7' }],
  },
  {
    id: 'ahp-electre',
    weighting: 'ahp',
    ranking: 'electre-i',
    coMentions: 817,
    tier: 'top',
    evidence: {
      en: 'The count covers every ELECTRE version. The Turkish example uses the Hwang-Yoon variant of ELECTRE I.',
      tr: 'Sayı tüm ELECTRE sürümlerini kapsar. Türkçe örnek, ELECTRE I\'in Hwang-Yoon varyantını kullanır.',
    },
    examples: [{ label: 'Soner & Önüt (2006), Çok kriterli tedarikçi seçimi: bir ELECTRE-AHP uygulaması, Sigma 24(4), 110-120' }],
  },
  {
    id: 'bwm-topsis',
    weighting: 'bwm',
    ranking: 'topsis',
    coMentions: 585,
    tier: 'growing',
    evidence: {
      en: 'Of 124 BWM publications up to January 2019, 83 integrate BWM with other methods; TOPSIS and VIKOR are the recurring partners (Mi et al. 2019).',
      tr: "Ocak 2019'a kadarki 124 BWM yayınının 83'ü BWM'yi başka yöntemlerle birleştirir; en sık ortaklar TOPSIS ve VIKOR'dur (Mi vd. 2019).",
    },
    examples: [MI_2019, { label: 'You et al. (2017), BWM-TOPSIS, Sustainability 9(12), 2329', doi: '10.3390/su9122329' }],
  },
  {
    id: 'bwm-vikor',
    weighting: 'bwm',
    ranking: 'vikor',
    coMentions: 232,
    tier: 'growing',
    evidence: {
      en: 'The second recurring BWM partner (Mi et al. 2019).',
      tr: 'BWM\'nin ikinci sık ortağı (Mi vd. 2019).',
    },
    examples: [MI_2019, { label: 'Gupta (2018), BWM-VIKOR, Journal of Air Transport Management 68, 35-47', doi: '10.1016/j.jairtraman.2017.06.001' }],
  },
  {
    id: 'critic-topsis',
    weighting: 'critic',
    ranking: 'topsis',
    coMentions: 540,
    tier: 'growing',
    evidence: {
      en: 'The pipeline this project started from.',
      tr: 'Bu projenin çıkış noktası olan boru hattı.',
    },
    examples: [{ label: 'Lakshmi, Mathew & Kinol (2022), CRITIC-TOPSIS and Entropy-TOPSIS, Environmental Science and Pollution Research 29, 61370-61382', doi: '10.1007/s11356-022-20219-9' }],
  },
  {
    id: 'swara-waspas',
    weighting: 'swara',
    ranking: 'waspas',
    coMentions: 224,
    tier: 'growing',
    evidence: {
      en: 'Larger than SWARA-TOPSIS; a Lithuanian-school pattern.',
      tr: 'SWARA-TOPSIS\'ten büyük; Litvanya okuluna özgü bir kalıp.',
    },
    examples: [],
  },
  {
    id: 'entropy-edas',
    weighting: 'entropy',
    ranking: 'edas',
    coMentions: 104,
    tier: 'growing',
    evidence: {
      en: 'Seen in recent Turkish papers (the examples below, not a count). EDAS is also an ordinary word or other acronym, so this count is an upper bound.',
      tr: 'Son dönem Türkçe makalelerde görülüyor (aşağıdaki örnekler, sayım değil). EDAS başka bir sözcük ya da kısaltma olarak da geçtiği için bu sayı bir üst sınırdır.',
    },
    examples: [
      { label: 'Aydın Ünal (2019), Entropi-EDAS, BIST insurers', doi: '10.29106/fesa.649946' },
      { label: 'Sarıhan & Aydın (2023), Entropi-EDAS, exporters', doi: '10.46928/iticusbe.1263122' },
    ],
  },
  {
    id: 'critic-edas',
    weighting: 'critic',
    ranking: 'edas',
    coMentions: 94,
    tier: 'growing',
    evidence: {
      en: 'Part of the Turkish CRITIC and EDAS wave. Upper bound, as for every EDAS count.',
      tr: 'Türkçe CRITIC ve EDAS dalgasının parçası. Her EDAS sayısı gibi bir üst sınır.',
    },
    examples: [{ label: 'Bayram (2021), CRITIC-EDAS, participation banks', doi: '10.14784/marufacd.879171' }],
  },
  {
    id: 'critic-waspas',
    weighting: 'critic',
    ranking: 'waspas',
    coMentions: 93,
    tier: 'growing',
    evidence: { en: 'Fast-growing newer pairing.', tr: 'Hızla yayılan yeni bir eşleşme.' },
    examples: [],
  },
  {
    id: 'critic-cocoso',
    weighting: 'critic',
    ranking: 'cocoso',
    coMentions: 91,
    tier: 'growing',
    evidence: {
      en: 'Fast-growing newer pairing. Turkish example with LOPCOW as a second weighting.',
      tr: 'Hızla yayılan yeni bir eşleşme. İkinci ağırlıklandırma olarak LOPCOW kullanan Türkçe bir örnek var.',
    },
    examples: [{ label: 'Yılmaz Özekenci (2024), LOPCOW-CRITIC-CoCoSo, BIST energy', doi: '10.29249/selcuksbmyd.1400056' }],
  },
]

/** Full co-occurrence table (combinations.md A.3). null = not collected. */
export const coMentionTable: {
  rows: MethodId[]
  columns: { label: string; methodIds: MethodId[]; upperBound?: boolean }[]
  counts: (number | null)[][]
} = {
  rows: ['ahp', 'entropy', 'bwm', 'critic', 'swara', 'merec'],
  columns: [
    { label: 'TOPSIS', methodIds: ['topsis'] },
    { label: 'VIKOR', methodIds: ['vikor'] },
    { label: 'PROMETHEE', methodIds: ['promethee-ii'] },
    { label: 'ELECTRE', methodIds: ['electre-i', 'electre-iii'] },
    { label: 'GRA', methodIds: [] },
    { label: 'MOORA/MULTIMOORA', methodIds: ['moora'] },
    { label: 'COPRAS', methodIds: ['copras'] },
    { label: 'WASPAS', methodIds: ['waspas'] },
    { label: 'EDAS', methodIds: ['edas'], upperBound: true },
    { label: 'CoCoSo', methodIds: ['cocoso'] },
    { label: 'MABAC', methodIds: ['mabac'] },
  ],
  counts: [
    [10451, 1753, 1484, 817, 789, 434, 344, 284, 223, 127, 108],
    [4639, 435, 143, 81, 598, 120, 116, 90, 104, 65, 63],
    [585, 232, 90, 44, 51, 84, 62, 83, 67, 96, 81],
    [540, 128, 60, 18, 95, 55, 66, 93, 94, 91, 59],
    [201, 91, 29, 34, 12, 92, 154, 224, 94, 94, 41],
    [130, 30, 22, 8, null, 28, 31, 58, 45, null, null],
  ],
}

export type Finding = { text: Bilingual; basis: Basis; sources: Source[] }

/** What the Turkish literature uses (combinations.md A.2). */
export const turkishLiterature: readonly Finding[] = [
  {
    text: {
      en: 'In 739 TR Dizin social-science articles up to May 2025, AHP, TOPSIS and Entropy are common and interest in PROMETHEE, EDAS and ARAS has grown recently; financial performance is the dominant theme.',
      tr: "Mayıs 2025'e kadarki 739 TR Dizin sosyal bilimler makalesinde AHP, TOPSIS ve Entropi yaygın; son dönemde PROMETHEE, EDAS ve ARAS'a ilgi artmış. Baskın tema finansal performans.",
    },
    basis: 'sourced',
    sources: [{ label: 'Polatgıl (2025), in Sosyal Bilimlerde Stratejik Karar Verme, Özgür Yayınları', doi: '10.58830/ozgur.pub768.c3164' }],
  },
  {
    text: {
      en: 'In 196 Turkish multi-criteria decision articles from 2021 (EBSCO), TOPSIS is mentioned 58 times (18.7%), AHP 56 (18.1%) and CRITIC 14 (4.5%), ahead of grey relational analysis, PROMETHEE, VIKOR, DEMATEL, SWARA, MOORA, EDAS, WASPAS and COPRAS.',
      tr: "2021'de yayımlanan 196 Türkçe çok kriterli karar verme makalesinde (EBSCO) TOPSIS 58 kez (%18,7), AHP 56 kez (%18,1), CRITIC 14 kez (%4,5) geçiyor; gri ilişkisel analiz, PROMETHEE, VIKOR, DEMATEL, SWARA, MOORA, EDAS, WASPAS ve COPRAS'ın önünde.",
    },
    basis: 'sourced',
    sources: [{ label: 'Kocatürk Çetin (2023), SDÜ İİBF Dergisi 28(3), 365-385, Tablo 8', url: 'https://dergipark.org.tr/tr/download/article-file/3209445' }],
  },
  {
    text: {
      en: 'In 47 studies from 2006-2020, among methods used more than once: TOPSIS 35%, AHP 21%, VIKOR 17%.',
      tr: "2006-2020 arasındaki 47 çalışmada, birden çok kez kullanılan yöntemler içinde: TOPSIS %35, AHP %21, VIKOR %17.",
    },
    basis: 'sourced',
    sources: [{ label: 'Dalbudak & Rençber (2022), Gaziantep Üniv. İİBF Dergisi 4(1), 1-17', doi: '10.55769/gauniibf.1068692' }],
  },
  {
    text: {
      en: 'Reading the examples above, the dominant Turkish template is objective weights (Entropy, CRITIC, MEREC, LOPCOW) on a matrix of financial ratios, ranked with a compensatory method. This is the same template as this project\'s original CRITIC-TOPSIS app.',
      tr: 'Yukarıdaki örneklerden çıkan okuma: baskın Türkçe kalıp, finansal oranlardan oluşan bir matris üzerinde nesnel ağırlıklar (Entropi, CRITIC, MEREC, LOPCOW) ve telafi edici bir sıralama yöntemidir. Bu, projenin ilk CRITIC-TOPSIS uygulamasıyla aynı kalıptır.',
    },
    basis: 'analysis',
    sources: [],
  },
]

// ---------------------------------------------------------------------------
// B. Compatibility rules
// ---------------------------------------------------------------------------

export type Support = 'yes' | 'no' | 'conditional'

export type RankingRequirement = {
  label: string
  /** Empty when the method has no page here (WPM, GRA). */
  methodIds: MethodId[]
  normalization: Bilingual
  negatives: Support
  zeros: Support
  /** Explains every 'conditional' and any caveat. */
  note: Bilingual
  params: Bilingual | null
  output: Bilingual
}

/**
 * What each ranking method needs from the decision matrix (combinations.md B.1; CODAS from its card).
 * When a method is marked 'no', the site must block it or apply a declared shift (x - min + eps) and say so,
 * because a shift changes the result of ratio-based methods (analysis).
 */
export const rankingRequirements: readonly RankingRequirement[] = [
  {
    label: 'SAW / WSM',
    methodIds: ['saw'],
    normalization: { en: 'Linear max (x/max, min/x) or sum (x/Σx, cost 1/x)', tr: 'Doğrusal maks (x/maks, min/x) ya da toplam (x/Σx, maliyette 1/x)' },
    negatives: 'no',
    zeros: 'no',
    note: {
      en: 'Every value must be above 0: both normalizations are ratios, and a shift would change the result. Zero or negative values are a blocking error here.',
      tr: 'Her değer 0\'dan büyük olmalı: iki normalizasyon da orandır ve kaydırma sonucu değiştirir. Sıfır ya da negatif değer burada engelleyici hatadır.',
    },
    params: { en: 'Normalization, linear max by default', tr: 'Normalizasyon, varsayılan doğrusal maks' },
    output: { en: 'Score S, higher is better', tr: 'Skor S, yüksek olan daha iyi' },
  },
  {
    label: 'WPM',
    methodIds: [],
    normalization: { en: 'Ratios raised to the weights', tr: 'Ağırlık üslü oranlar' },
    negatives: 'no',
    zeros: 'no',
    note: { en: 'Weighted product model; the multiplicative half of WASPAS.', tr: 'Ağırlıklı çarpım modeli; WASPAS\'ın çarpımsal yarısı.' },
    params: null,
    output: { en: 'Score', tr: 'Skor' },
  },
  {
    label: 'WASPAS',
    methodIds: ['waspas'],
    normalization: { en: 'Linear max', tr: 'Doğrusal maks' },
    negatives: 'no',
    zeros: 'conditional',
    note: { en: 'A zero makes the product part 0 for that alternative.', tr: 'Sıfır, o alternatif için çarpım kısmını 0 yapar.' },
    params: { en: 'lambda in [0, 1], default 0.5', tr: 'lambda [0, 1] aralığında, varsayılan 0,5' },
    output: { en: 'Score', tr: 'Skor' },
  },
  {
    label: 'TOPSIS',
    methodIds: ['topsis'],
    normalization: { en: 'Vector', tr: 'Vektör' },
    negatives: 'conditional',
    zeros: 'conditional',
    note: {
      en: 'Negatives are computable, but vector normalization is not shift-invariant, so the result depends on where zero is. An all-zero column gives 0/0.',
      tr: 'Negatif değerlerle hesap yapılabilir, ama vektör normalizasyonu kaydırmaya duyarlıdır; sonuç sıfırın nerede olduğuna bağlıdır. Tamamı sıfır olan sütun 0/0 verir.',
    },
    params: { en: 'Distance, Euclidean by default', tr: 'Uzaklık, varsayılan Öklid' },
    output: { en: 'Closeness in [0, 1]', tr: '[0, 1] aralığında yakınlık' },
  },
  {
    label: 'VIKOR',
    methodIds: ['vikor'],
    normalization: { en: 'Linear (f* - f) / (f* - f-)', tr: 'Doğrusal (f* - f) / (f* - f-)' },
    negatives: 'yes',
    zeros: 'yes',
    note: {
      en: 'Divides by the column range, so any sign works; a constant column adds 0 to S and R here, with a notice.',
      tr: 'Sütun aralığına böler, bu yüzden her işaret olur; sabit bir sütun burada S ve R\'ye 0 ekler, uyarıyla.',
    },
    params: { en: 'v in [0, 1], default 0.5 (a slider); conditions C1 and C2', tr: 'v [0, 1] aralığında, varsayılan 0,5 (kaydırıcı); C1 ve C2 koşulları' },
    output: { en: 'S, R, Q (lower is better) and a compromise set', tr: 'S, R, Q (küçük olan daha iyi) ve uzlaşık çözüm kümesi' },
  },
  {
    label: 'EDAS',
    methodIds: ['edas'],
    normalization: { en: 'Distance from the column average, divided by the average', tr: 'Sütun ortalamasından uzaklık, ortalamaya bölünmüş' },
    negatives: 'conditional',
    zeros: 'yes',
    note: {
      en: 'Divides by the column average: a varying column whose average is 0 or below is a blocking error. Negative values compute with a notice, and a second one when the average is near 0.',
      tr: 'Sütun ortalamasına böler: ortalaması 0 ya da altında olan değişken bir sütun engelleyici hatadır. Negatif değerler uyarıyla hesaplanır; ortalama 0\'a yakınsa ikinci bir uyarı gelir.',
    },
    params: null,
    output: { en: 'Appraisal score AS in [0, 1], higher is better', tr: '[0, 1] aralığında değerlendirme skoru AS, yüksek olan daha iyi' },
  },
  {
    label: 'CODAS',
    methodIds: ['codas'],
    normalization: { en: 'Linear max (x/max, min/x)', tr: 'Doğrusal maks (x/maks, min/x)' },
    negatives: 'no',
    zeros: 'conditional',
    note: {
      en: 'From the method card: values must be 0 or more, and cost criteria strictly positive.',
      tr: 'Yöntem kartından: değerler 0 ya da daha büyük olmalı, maliyet kriterleri kesinlikle pozitif.',
    },
    params: { en: 'Threshold tau, default 0.02', tr: 'Eşik tau, varsayılan 0,02' },
    output: { en: 'Assessment score H (sums to 0)', tr: 'Değerlendirme skoru H (toplamı 0)' },
  },
  {
    label: 'COPRAS',
    methodIds: ['copras'],
    normalization: { en: 'Sum (x / sum x)', tr: 'Toplam (x / toplam x)' },
    negatives: 'no',
    zeros: 'conditional',
    note: { en: 'An alternative with S- = 0 divides by zero.', tr: 'S- = 0 olan alternatif sıfıra böler.' },
    params: null,
    output: { en: 'Q and utility degree in %', tr: 'Q ve yüzde olarak fayda derecesi' },
  },
  {
    label: 'MOORA',
    methodIds: ['moora'],
    normalization: { en: 'Vector', tr: 'Vektör' },
    negatives: 'yes',
    zeros: 'yes',
    note: {
      en: 'For the ratio system. The multiplicative form of MULTIMOORA accepts neither negatives nor zeros.',
      tr: 'Oran sistemi için. MULTIMOORA\'nın çarpımsal biçimi ne negatif ne sıfır kabul eder.',
    },
    params: null,
    output: { en: 'Score', tr: 'Skor' },
  },
  {
    label: 'ARAS',
    methodIds: ['aras'],
    normalization: { en: 'Sum, with an added optimal alternative; cost via 1/x', tr: 'Toplam, eklenen optimal alternatifle; maliyet 1/x ile' },
    negatives: 'no',
    zeros: 'conditional',
    note: { en: 'Zeros are impossible in cost criteria (1/x).', tr: 'Maliyet kriterlerinde sıfır olamaz (1/x).' },
    params: null,
    output: { en: 'Utility degree', tr: 'Fayda derecesi' },
  },
  {
    label: 'MARCOS',
    methodIds: ['marcos'],
    normalization: { en: 'Ratio to the ideal and anti-ideal', tr: 'İdeal ve anti-ideale oran' },
    negatives: 'no',
    zeros: 'no',
    note: { en: 'Ratio-based: needs positive data.', tr: 'Orana dayalı: pozitif veri ister.' },
    params: null,
    output: { en: 'Utility', tr: 'Fayda' },
  },
  {
    label: 'CoCoSo',
    methodIds: ['cocoso'],
    normalization: { en: 'Min-max, then sums of r^w', tr: 'Min-maks, ardından r^w toplamları' },
    negatives: 'yes',
    zeros: 'conditional',
    note: {
      en: 'Fails when one alternative is worst on every criterion (min S = 0, so k_b divides by zero).',
      tr: 'Bir alternatif her kriterde en kötüyse bozulur (min S = 0 olur, k_b sıfıra böler).',
    },
    params: { en: 'lambda, default 0.5', tr: 'lambda, varsayılan 0,5' },
    output: { en: 'Score', tr: 'Skor' },
  },
  {
    label: 'MABAC',
    methodIds: ['mabac'],
    normalization: { en: 'Min-max, then v = w (r + 1)', tr: 'Min-maks, ardından v = w (r + 1)' },
    negatives: 'yes',
    zeros: 'yes',
    note: { en: 'Divides by the column range: a constant column needs a guard.', tr: 'Sütun aralığına böler: sabit sütun için önlem gerekir.' },
    params: null,
    output: { en: 'Distance to the border area', tr: 'Sınır alanına uzaklık' },
  },
  {
    label: 'GRA',
    methodIds: [],
    normalization: { en: 'Min-max', tr: 'Min-maks' },
    negatives: 'yes',
    zeros: 'yes',
    note: { en: 'Grey relational analysis; no page here yet.', tr: 'Gri ilişkisel analiz; burada henüz sayfası yok.' },
    params: { en: 'rho, default 0.5', tr: 'rho, varsayılan 0,5' },
    output: { en: 'Grey relational grade', tr: 'Gri ilişkisel derece' },
  },
  {
    label: 'PROMETHEE II',
    methodIds: ['promethee-ii'],
    normalization: { en: 'None (raw differences)', tr: 'Yok (ham farklar)' },
    negatives: 'yes',
    zeros: 'yes',
    note: { en: 'Only differences are used.', tr: 'Yalnız farklar kullanılır.' },
    params: {
      en: 'Preference function and q, p, s per criterion',
      tr: 'Kriter başına tercih fonksiyonu ve q, p, s',
    },
    output: { en: 'Net flow in [-1, 1]', tr: '[-1, 1] aralığında net akış' },
  },
  {
    label: 'ELECTRE I / III',
    methodIds: ['electre-i', 'electre-iii'],
    normalization: {
      en: 'None (raw differences); the Roy variant of ELECTRE I needs a common scale',
      tr: 'Yok (ham farklar); ELECTRE I\'in Roy varyantı ortak ölçek ister',
    },
    negatives: 'yes',
    zeros: 'yes',
    note: { en: 'Weights act as voting powers.', tr: 'Ağırlıklar oy gücü işlevi görür.' },
    params: {
      en: 'ELECTRE I: thresholds c and d. ELECTRE III: q, p, v per criterion and s(lambda)',
      tr: 'ELECTRE I: c ve d eşikleri. ELECTRE III: kriter başına q, p, v ve s(lambda)',
    },
    output: { en: 'Kernel (I) or partial pre-order (III)', tr: 'Çekirdek (I) ya da kısmi ön sıralama (III)' },
  },
]

export const constantColumnRule: Bilingual = {
  en: 'Every method with min-max or linear (f* - f) / (f* - f-) normalization divides by the column range, so a constant column must be dropped or given zero contribution, with a warning.',
  tr: 'Min-maks ya da doğrusal (f* - f) / (f* - f-) normalizasyonu kullanan her yöntem sütun aralığına böler; sabit bir sütunu çıkarın ya da katkısını sıfır alıp uyarı gösterin.',
}

export type WeightingRequirement = {
  methodId: MethodId
  data: Bilingual
  normalization: Bilingual | null
  degenerate: Bilingual
  sources: Source[]
}

/** What each weighting method needs (combinations.md B.2; LOPCOW, CILOS, ROC and equal weights from their cards). */
export const weightingRequirements: readonly WeightingRequirement[] = [
  {
    methodId: 'entropy',
    data: {
      en: 'Raw data (sum): values of 0 or more, with 0 ln 0 = 0; min-max accepts any sign',
      tr: 'Ham veri (toplam): 0 ya da daha büyük değerler, 0 ln 0 = 0; Min-maks her işareti kabul eder',
    },
    normalization: {
      en: 'Unchanged by pure rescaling (sum, vector and max normalization give the same weights); changes under min-max, which also creates zeros.',
      tr: 'Salt yeniden ölçeklemeden etkilenmez (toplam, vektör ve maks normalizasyonu aynı ağırlığı verir); Min-maks altında değişir ve Min-maks sıfır da üretir.',
    },
    degenerate: {
      en: 'Constant column, also all zeros: weight 0; every column constant: 1/n',
      tr: 'Sabit sütun, tamamı sıfır olan da: ağırlık 0; bütün sütunlar sabit: 1/n',
    },
    sources: [
      { label: 'Roszkowska & Wachowicz (2024), Entropy 26(5), 365', doi: '10.3390/e26050365' },
      { label: 'Chen (2019), Expert Systems with Applications 136, 33-41', doi: '10.1016/j.eswa.2019.06.035' },
    ],
  },
  {
    methodId: 'critic',
    data: { en: 'Any sign (min-max first)', tr: 'Herhangi bir işaret (önce min-maks)' },
    normalization: {
      en: 'The weights depend on the normalization; Mukhametzyanov (2021) argues the method is only correct with min-max.',
      tr: 'Ağırlıklar normalizasyona bağlıdır; Mukhametzyanov (2021) yöntemin yalnız min-maks ile doğru olduğunu savunur.',
    },
    degenerate: {
      en: 'Constant column: correlation undefined (0/0); must be removed or neutralized first',
      tr: 'Sabit sütun: korelasyon tanımsız (0/0); önce çıkarılmalı ya da etkisizleştirilmeli',
    },
    sources: [{ label: 'Mukhametzyanov (2021), DMAME 4(2), 76-105', doi: '10.31181/dmame210402076i' }],
  },
  {
    methodId: 'sd',
    data: { en: 'Any sign', tr: 'Herhangi bir işaret' },
    normalization: { en: 'Depends on the normalization (Mukhametzyanov 2021).', tr: 'Normalizasyona bağlıdır (Mukhametzyanov 2021).' },
    degenerate: {
      en: 'Constant column, also all zeros: weight 0; every column constant: 1/n',
      tr: 'Sabit sütun, tamamı sıfır olan da: ağırlık 0; bütün sütunlar sabit: 1/n',
    },
    sources: [{ label: 'Mukhametzyanov (2021), DMAME 4(2), 76-105', doi: '10.31181/dmame210402076i' }],
  },
  {
    methodId: 'merec',
    data: { en: 'Strictly positive (uses ln, min/x and x/max)', tr: 'Kesinlikle pozitif (ln, min/x ve x/maks kullanır)' },
    normalization: null,
    degenerate: { en: 'Zeros break the logarithm', tr: 'Sıfırlar logaritmayı bozar' },
    sources: [{ label: 'Keshavarz-Ghorabaee et al. (2021), Symmetry 13(4), 525', doi: '10.3390/sym13040525' }],
  },
  {
    methodId: 'lopcow',
    data: { en: 'Any real values (min-max first)', tr: 'Herhangi gerçek değerler (önce min-maks)' },
    normalization: {
      en: 'Built-in min-max; sample or population standard deviation changes the weights.',
      tr: 'Yerleşik min-maks; örneklem ya da anakütle standart sapması ağırlıkları değiştirir.',
    },
    degenerate: { en: 'Constant column: standard deviation 0, PV undefined', tr: 'Sabit sütun: standart sapma 0, PV tanımsız' },
    sources: [{ label: 'Keleş (2023), Ömer Halisdemir Üniversitesi İİBF Dergisi 16(3), 727-747', doi: '10.25287/ohuiibf.1239201' }],
  },
  {
    methodId: 'cilos',
    data: { en: 'Positive values; no zeros in cost criteria', tr: 'Pozitif değerler; maliyet kriterlerinde sıfır yok' },
    normalization: { en: 'Built-in sum normalization.', tr: 'Yerleşik toplam normalizasyonu.' },
    degenerate: { en: 'Constant column: the linear system becomes singular', tr: 'Sabit sütun: doğrusal sistem tekilleşir' },
    sources: [{ label: 'Zavadskas et al. (2017), Sustainability 9(5), 702', doi: '10.3390/su9050702' }],
  },
  {
    methodId: 'ahp',
    data: { en: 'Pairwise judgements on the 1-9 scale', tr: '1-9 ölçeğinde ikili yargılar' },
    normalization: null,
    degenerate: { en: 'CR of 0.10 or more: ask to revise', tr: 'CR 0,10 ya da üstü: yargıların gözden geçirilmesini isteyin' },
    sources: [{ label: 'Saaty (2008), International Journal of Services Sciences 1(1), 83-98', doi: '10.1504/IJSSCI.2008.017590' }],
  },
  {
    methodId: 'bwm',
    data: { en: 'Best-to-others and others-to-worst vectors', tr: 'En iyiden diğerlerine ve diğerlerinden en kötüye vektörleri' },
    normalization: null,
    degenerate: {
      en: 'Needs a linear program (linear model) or a non-linear solver; the non-linear model can have many optima',
      tr: 'Doğrusal program (doğrusal model) ya da doğrusal olmayan çözücü gerekir; doğrusal olmayan modelin birden çok en iyi çözümü olabilir',
    },
    sources: [
      { label: 'Rezaei (2015), Omega 53, 49-57', doi: '10.1016/j.omega.2014.11.009' },
      { label: 'Rezaei (2016), Omega 64, 126-130', doi: '10.1016/j.omega.2015.12.001' },
    ],
  },
  {
    methodId: 'swara',
    data: { en: 'Criteria ranked, plus a comparative importance s for each step', tr: 'Sıralanmış kriterler ve her adım için karşılaştırmalı önem s' },
    normalization: null,
    degenerate: { en: 'None known', tr: 'Bilinen yok' },
    sources: [{ label: 'Keršulienė, Zavadskas & Turskis (2010), JBEM 11(2), 243-258', doi: '10.3846/jbem.2010.12' }],
  },
  {
    methodId: 'roc',
    data: { en: 'A strict ranking of the criteria', tr: 'Kriterlerin kesin bir sıralaması' },
    normalization: null,
    degenerate: { en: 'Ties are undefined in the formulas', tr: 'Formüllerde eşitlik tanımsızdır' },
    sources: [{ label: 'Roszkowska (2013), Optimum. Studia Ekonomiczne 5(65), 14-33', doi: '10.15290/ose.2013.05.65.02' }],
  },
  {
    methodId: 'equal',
    data: { en: 'Only the number of criteria', tr: 'Yalnız kriter sayısı' },
    normalization: null,
    degenerate: { en: 'None', tr: 'Yok' },
    sources: [],
  },
]

export const reportNormalizationRule: Bilingual = {
  en: 'Whenever the weights depend on the normalization, report the normalization together with the weighting method (Mukhametzyanov 2021).',
  tr: 'Ağırlıklar normalizasyona bağlıysa, normalizasyonu ağırlıklandırma yöntemiyle birlikte raporlayın (Mukhametzyanov 2021).',
}

export type RiskyCombination = {
  id: string
  title: Bilingual
  text: Bilingual
  /** How the claim is backed. 'analysis' items must be shown as our reading, not as fact. */
  basis: Basis
  /** Supporting evidence, when the item has any. */
  evidence?: Bilingual
  siteRule?: Bilingual
  methodIds: MethodId[]
  sources: Source[]
}

/** combinations.md B.3. */
export const riskyCombinations: readonly RiskyCombination[] = [
  {
    id: 'dispersion-twice',
    title: {
      en: 'Dispersion may be counted twice: objective dispersion weights with a distance-based ranking',
      tr: 'Yayılım iki kez sayılabilir: yayılıma dayalı nesnel ağırlık ile uzaklığa dayalı sıralama',
    },
    text: {
      en: 'Our reading of the formulas: Entropy, SD and CRITIC give more weight to criteria whose values are more spread out, and TOPSIS (vector normalization), VIKOR and GRA also let a criterion with a larger normalized spread contribute more to the distances. In Entropy or SD then TOPSIS, the spread of a noisy criterion may therefore enter twice, once as an explicit weight and once implicitly. This is our analysis, not a published result.',
      tr: 'Formüllerden bizim okumamız: Entropi, SD ve CRITIC değerleri daha çok yayılan kriterlere daha çok ağırlık verir; TOPSIS (vektör normalizasyonu), VIKOR ve GRA da normalize yayılımı büyük olan kriterin uzaklıklara daha çok katkı yapmasına izin verir. Bu yüzden Entropi ya da SD ardından TOPSIS kullanıldığında gürültülü bir kriterin yayılımı iki kez devreye girebilir: bir kez açık ağırlık olarak, bir kez örtük olarak. Bu yayımlanmış bir sonuç değil, bizim yorumumuz.',
    },
    basis: 'analysis',
    evidence: {
      en: 'Related findings: weights only have meaning relative to the normalization and ranges used (Choo, Schoner & Wedley 1999). Entropy weights are very sensitive: Mukhametzyanov (2021) prints that changing one value from 85 to 72 raised a criterion\'s weight from 0.146 to 0.231 and changed the ranking, while SD weights moved by 0.1%; recomputed from the paper\'s data, that change gives 0.196 (+34%) and an SD weight that falls by 0.3%, still far more movement for Entropy. The normalization changes Entropy-TOPSIS outcomes (Chen 2019).',
      tr: "İlgili bulgular: ağırlıklar ancak kullanılan normalizasyon ve aralıklara göre anlam taşır (Choo, Schoner ve Wedley 1999). Entropi ağırlıkları çok duyarlıdır: Mukhametzyanov (2021) tek bir değeri 85'ten 72'ye değiştirmenin bir kriterin ağırlığını 0,146'dan 0,231'e çıkardığını ve sıralamayı değiştirdiğini, SD ağırlıklarının ise %0,1 oynadığını yazar; makalenin verisiyle yeniden hesaplandığında bu değişiklik 0,196 (+%34) verir ve SD ağırlığı %0,3 düşer, yani Entropi yine çok daha fazla oynar. Normalizasyon Entropi-TOPSIS sonuçlarını değiştirir (Chen 2019).",
    },
    siteRule: {
      en: 'With objective weights, always show an equal-weights run and the Monte Carlo panel next to the main result, and warn when one criterion takes more than half of the weight.',
      tr: 'Nesnel ağırlık kullanıldığında ana sonucun yanında her zaman eşit ağırlıklı bir çalıştırma ve Monte Carlo paneli gösterilir; bir kriter ağırlığın yarısından fazlasını alırsa uyarı çıkar.',
    },
    methodIds: ['entropy', 'sd', 'critic', 'topsis', 'vikor'],
    sources: [
      { label: 'Choo, Schoner & Wedley (1999), Computers & Industrial Engineering 37, 527-541', doi: '10.1016/S0360-8352(00)00019-X' },
      { label: 'Mukhametzyanov (2021), DMAME 4(2), 76-105', doi: '10.31181/dmame210402076i' },
      { label: 'Chen (2019), Expert Systems with Applications 136, 33-41', doi: '10.1016/j.eswa.2019.06.035' },
    ],
  },
  {
    id: 'minmax-before-entropy',
    title: { en: 'Min-max normalization before Entropy', tr: 'Entropi öncesinde Min-maks normalizasyonu' },
    text: {
      en: 'Min-max creates zeros (the column minimum) and changes the Entropy weights; Chen (2019) advises against it. Use raw non-negative data or sum normalization for Entropy.',
      tr: 'Min-maks sıfırlar üretir (sütun minimumu) ve Entropi ağırlıklarını değiştirir; Chen (2019) bunu önermez. Entropi için ham, negatif olmayan veri ya da toplam normalizasyonu kullanın.',
    },
    basis: 'sourced',
    methodIds: ['entropy'],
    sources: [{ label: 'Chen (2019), Expert Systems with Applications 136, 33-41', doi: '10.1016/j.eswa.2019.06.035' }],
  },
  {
    id: 'critic-degenerate',
    title: {
      en: 'CRITIC with a constant or near-constant column, or with a normalization other than min-max',
      tr: 'Sabit ya da neredeyse sabit sütunlu, ya da min-maks dışı normalizasyonlu CRITIC',
    },
    text: {
      en: 'The correlation is undefined for a constant column, and the weights are driven by the normalization when it is not min-max.',
      tr: 'Sabit sütunda korelasyon tanımsızdır; normalizasyon min-maks değilse ağırlıkları normalizasyon belirler.',
    },
    basis: 'sourced',
    methodIds: ['critic'],
    sources: [{ label: 'Mukhametzyanov (2021), DMAME 4(2), 76-105', doi: '10.31181/dmame210402076i' }],
  },
  {
    id: 'weights-twice',
    title: { en: 'Weights applied twice', tr: 'Ağırlıkların iki kez uygulanması' },
    text: {
      en: 'Our analysis: feeding an already weighted matrix (AHP global priorities, or a weighted normalized matrix exported from another tool) into a ranking method that applies weights again squares the weights.',
      tr: 'Bizim yorumumuz: zaten ağırlıklandırılmış bir matrisi (AHP genel öncelikleri ya da başka bir araçtan alınmış ağırlıklı normalize matris) ağırlıkları yeniden uygulayan bir sıralama yöntemine vermek ağırlıkların karesini almak demektir.',
    },
    basis: 'analysis',
    siteRule: {
      en: 'The import screen asks whether the values are raw performances or weighted scores.',
      tr: 'İçe aktarma ekranı değerlerin ham performans mı yoksa ağırlıklı skor mu olduğunu sorar.',
    },
    methodIds: ['ahp'],
    sources: [],
  },
  {
    id: 'chaining-rankers',
    title: { en: 'Chaining ranking methods', tr: 'Sıralama yöntemlerini zincirlemek' },
    text: {
      en: 'Our analysis: using the scores of one ranking method as the decision matrix of another (TOPSIS closeness into VIKOR, SMART then ELECTRE then TOPSIS) has no decision-theoretic meaning beyond "a second aggregation". If the aim is robustness, use the sensitivity panel and rank aggregation instead.',
      tr: 'Bizim yorumumuz: bir sıralama yönteminin skorlarını başka bir yöntemin karar matrisi olarak kullanmanın (TOPSIS yakınlığını VIKOR\'a vermek, SMART ardından ELECTRE ardından TOPSIS) "ikinci bir birleştirme" olmanın ötesinde karar kuramı açısından bir anlamı yoktur. Amaç sağlamlıksa bunun yerine duyarlılık panelini ve sıralama birleştirmeyi kullanın.',
    },
    basis: 'analysis',
    methodIds: ['topsis', 'vikor', 'electre-i'],
    sources: [],
  },
  {
    id: 'dispersion-in-outranking',
    title: { en: 'Dispersion-based weights in outranking methods', tr: 'Üstünlük (outranking) yöntemlerinde yayılıma dayalı ağırlıklar' },
    text: {
      en: 'In ELECTRE, weights are voting powers that do not depend on the scales, not trade-off coefficients (Figueira, Mousseau & Roy 2005). Entropy or CRITIC weights computed on a normalized matrix, combined with thresholds in raw units, mix two meanings. Allowed, but label it.',
      tr: "ELECTRE'de ağırlıklar ödünleşim katsayısı değil, ölçeklerden bağımsız oy gücüdür (Figueira, Mousseau ve Roy 2005). Normalize matris üzerinde hesaplanan Entropi ya da CRITIC ağırlıklarını ham birimdeki eşiklerle birlikte kullanmak iki farklı anlamı karıştırır. Kullanabilirsiniz, ama bunu belirtin.",
    },
    basis: 'sourced',
    methodIds: ['electre-i', 'electre-iii', 'promethee-ii', 'entropy', 'critic'],
    sources: [{ label: 'Figueira, Mousseau & Roy (2005), ELECTRE methods', doi: '10.1007/0-387-23081-5_4' }],
  },
  {
    id: 'ratio-shifted',
    title: { en: 'Ratio-based methods on shifted data', tr: 'Kaydırılmış veride orana dayalı yöntemler' },
    text: {
      en: 'WPM, WASPAS, COPRAS, ARAS, MARCOS and MEREC need positive data. Our analysis: silently shifting the data (x - min + 1) changes their rankings, so the site blocks them or requires an explicit, displayed shift.',
      tr: 'WPM, WASPAS, COPRAS, ARAS, MARCOS ve MEREC pozitif veri ister. Bizim yorumumuz: veriyi sessizce kaydırmak (x - min + 1) bu yöntemlerin sıralamasını değiştirir; bu yüzden site bunları engeller ya da açıkça gösterilen bir kaydırma ister.',
    },
    basis: 'analysis',
    methodIds: ['waspas', 'copras', 'aras', 'marcos', 'merec'],
    sources: [],
  },
  {
    id: 'agreement-as-validation',
    title: { en: 'Reading agreement between methods as validation', tr: 'Yöntemler arası uyumu doğrulama sanmak' },
    text: {
      en: 'A high Spearman correlation between TOPSIS and MOORA (both vector-normalized and compensatory) says little: methods of the same family agree by construction, and similarity depends on the normalization and weighting choices (Sałabun, Wątróbski & Shekhovtsov 2020). Compare across families (compensatory and outranking) and report WS as well as rho.',
      tr: "TOPSIS ile MOORA arasındaki yüksek Spearman korelasyonu (ikisi de vektör normalizasyonlu ve telafi edici) pek bir şey söylemez: aynı ailedeki yöntemler yapıları gereği uyuşur ve benzerlik normalizasyon ile ağırlıklandırma seçimlerine bağlıdır (Sałabun, Wątróbski ve Shekhovtsov 2020). Aileler arasında karşılaştırın (telafi edici ve üstünlük) ve rho'nun yanında WS'yi de raporlayın.",
    },
    basis: 'sourced',
    methodIds: ['topsis', 'moora'],
    sources: [{ label: 'Sałabun, Wątróbski & Shekhovtsov (2020), Symmetry 12(9), 1549', doi: '10.3390/sym12091549' }],
  },
]

// ---------------------------------------------------------------------------
// C-D. Robustness and rank aggregation
// ---------------------------------------------------------------------------

export type RobustnessTechnique = {
  id: string
  title: Bilingual
  summary: Bilingual
  tex: string[]
  sources: Source[]
}

export const robustnessTechniques: readonly RobustnessTechnique[] = [
  {
    id: 'oat',
    title: { en: 'One-at-a-time weight change', tr: 'Tek seferde bir ağırlık değişimi' },
    summary: {
      en: 'Change one weight by a relative step (default -20%, -10%, -5%, +5%, +10%, +20%) and rescale the others so the sum stays 1. Sweeping the weight from 0 to 1 finds the interval over which the first place or the whole ranking stays the same (weight stability interval); the smallest change that swaps two alternatives is the criticality measure.',
      tr: 'Bir ağırlığı göreli bir adımla değiştirin (varsayılan %-20, %-10, %-5, %+5, %+10, %+20) ve toplam 1 kalsın diye diğerlerini ölçekleyin. Ağırlığı 0\'dan 1\'e taramak, birincinin ya da tüm sıralamanın değişmediği aralığı bulur (ağırlık kararlılık aralığı); iki alternatifin yerini değiştiren en küçük değişim kritiklik ölçüsüdür.',
    },
    tex: [String.raw`w_k' = \min\{1, \max\{0, w_k(1+\delta)\}\}, \qquad w_j' = w_j\,\frac{1 - w_k'}{1 - w_k} \quad (j \ne k)`],
    sources: [
      { label: 'Mareschal (1988), EJOR 33, 54-64', doi: '10.1016/0377-2217(88)90254-8' },
      { label: 'Triantaphyllou & Sánchez (1997), Decision Sciences 28(1), 151-194', doi: '10.1111/j.1540-5915.1997.tb01306.x' },
    ],
  },
  {
    id: 'monte-carlo',
    title: { en: 'Monte Carlo weight sampling', tr: 'Monte Carlo ağırlık örneklemesi' },
    summary: {
      en: 'Draw many weight vectors, either uniformly over all weightings (the SMAA setting) or around the user\'s weights with a concentration kappa, rerun the ranking each time and report how often each alternative takes each rank (rank acceptability), its mean rank and a 95% rank interval. With 10,000 runs every share has a standard error of at most 0.005.',
      tr: 'Çok sayıda ağırlık vektörü çekin: ya tüm ağırlıklandırmalar üzerinde düzgün dağılımla (SMAA ayarı) ya da kullanıcının ağırlıkları etrafında kappa yoğunluğuyla. Her seferinde sıralamayı yeniden hesaplayın; her alternatifin her sırayı ne sıklıkla aldığını (sıra kabul edilebilirliği), ortalama sırasını ve %95 sıra aralığını raporlayın. 10.000 çalıştırmada her oranın standart hatası en fazla 0,005 olur.',
    },
    tex: [
      String.raw`w \sim \operatorname{Dirichlet}(\kappa \bar w), \qquad \operatorname{Var}(w_j) = \frac{\bar w_j (1 - \bar w_j)}{\kappa + 1}`,
      String.raw`b_i^{r} = \frac{\#\{t \le N : \operatorname{rank}_t(i) = r\}}{N}`,
    ],
    sources: [
      { label: 'Lahdelma, Hokkanen & Salminen (1998), EJOR 106, 137-143', doi: '10.1016/S0377-2217(97)00163-X' },
      { label: 'Tervonen & Lahdelma (2007), EJOR 178, 500-513', doi: '10.1016/j.ejor.2005.12.037' },
    ],
  },
  {
    id: 'leave-one-criterion-out',
    title: { en: 'Leave one criterion out', tr: 'Bir kriteri dışarıda bırakma' },
    summary: {
      en: 'Drop each criterion in turn, renormalize the remaining weights or recompute objective weights on the reduced matrix, rerun, and report whether the top alternative changes, plus rho and WS against the base ranking. Removing a criterion that does not discriminate should not change the ranking.',
      tr: 'Her kriteri sırayla çıkarın; kalan ağırlıkları yeniden normalize edin ya da nesnel ağırlıkları küçülen matriste yeniden hesaplayın, yeniden çalıştırın ve birincinin değişip değişmediğini, temel sıralamaya göre rho ve WS değerlerini raporlayın. Ayırt edici olmayan bir kriteri çıkarmak sıralamayı değiştirmemelidir.',
    },
    tex: [String.raw`w_k' = \frac{w_k}{1 - w_j} \quad (k \ne j)`],
    sources: [
      { label: 'Aires & Ferreira (2018), Pesquisa Operacional 38(2), 331-362', doi: '10.1590/0101-7438.2018.038.02.0331' },
      { label: 'Więckowski, Kołodziejczyk & Sałabun (2025), ISD 2025', doi: '10.62036/ISD.2025.34' },
    ],
  },
  {
    id: 'rank-reversal',
    title: { en: 'Rank-reversal tests', tr: 'Sıralamanın tersine dönmesi testleri' },
    summary: {
      en: 'Remove or add an alternative (leave one out, or add a dominated copy of the worst), replace a non-optimal alternative by a worse one (the best should not change), and rank every pair alone to check transitivity. In PROMETHEE II, removing one alternative cannot swap two whose net flows differ by more than 2/(m-1).',
      tr: 'Bir alternatif çıkarın ya da ekleyin (birini dışarıda bırakma ya da en kötünün baskın olunan bir kopyasını ekleme), en iyi olmayan bir alternatifi daha kötüsüyle değiştirin (en iyi değişmemeli) ve geçişliliği denetlemek için her çifti tek başına sıralayın. PROMETHEE II\'de bir alternatif çıkarmak, net akışları 2/(m-1)\'den fazla farklı olan iki alternatifin yerini değiştiremez.',
    },
    tex: [],
    sources: [
      { label: 'Aires & Ferreira (2018), Pesquisa Operacional 38(2), 331-362', doi: '10.1590/0101-7438.2018.038.02.0331' },
      { label: 'Wang & Triantaphyllou (2008), Omega 36(1), 45-63', doi: '10.1016/j.omega.2005.12.003' },
    ],
  },
  {
    id: 'parameters',
    title: { en: 'Parameter sensitivity', tr: 'Parametre duyarlılığı' },
    summary: {
      en: 'One slider per method parameter with the same outputs as the weight change: PROMETHEE q, p and s; VIKOR v; WASPAS and CoCoSo lambda; ELECTRE thresholds; TOPSIS normalization and distance.',
      tr: 'Her yöntem parametresi için bir kaydırıcı, ağırlık değişimiyle aynı çıktılar: PROMETHEE q, p ve s; VIKOR v; WASPAS ve CoCoSo lambda; ELECTRE eşikleri; TOPSIS normalizasyonu ve uzaklığı.',
    },
    tex: [],
    sources: [{ label: 'Więckowski & Sałabun (2023), Applied Soft Computing 148, 110915', doi: '10.1016/j.asoc.2023.110915' }],
  },
  {
    id: 'agreement',
    title: { en: 'Agreement between rankings', tr: 'Sıralamalar arası uyum' },
    summary: {
      en: 'Spearman and Kendall correlations, the top-weighted Spearman r_w, the WS coefficient (asymmetric, top positions dominate; low below 0.234, high above 0.808) and Kendall\'s W for several rankings. Always also show whether the first place is the same, because that is what users care about.',
      tr: 'Spearman ve Kendall korelasyonları, üst sıralara ağırlık veren Spearman r_w, WS katsayısı (asimetrik, üst sıralar baskın; 0,234 altı düşük, 0,808 üstü yüksek) ve birden çok sıralama için Kendall W. Birincinin aynı olup olmadığını da her zaman gösterin, çünkü kullanıcıların baktığı budur.',
    },
    tex: [
      String.raw`\rho = 1 - \frac{6\sum_i (x_i - y_i)^2}{n(n^2 - 1)}`,
      String.raw`r_w = 1 - \frac{6\sum_i (x_i - y_i)^2\left[(n - x_i + 1) + (n - y_i + 1)\right]}{n^4 + n^3 - n^2 - n}`,
      String.raw`WS = 1 - \sum_{i=1}^{n} 2^{-x_i}\,\frac{|x_i - y_i|}{\max\{|x_i - 1|,\ |x_i - n|\}}`,
      String.raw`W = \frac{12\sum_i (R_i - \bar R)^2}{m^2 (n^3 - n)}`,
    ],
    sources: [
      { label: 'Pinto da Costa & Soares (2005), Australian & New Zealand Journal of Statistics 47(4), 515-529', doi: '10.1111/j.1467-842X.2005.00413.x' },
      { label: 'Sałabun & Urbaniak (2020), ICCS 2020, LNCS 12138, 632-645', doi: '10.1007/978-3-030-50417-5_47' },
      { label: 'Kendall & Babington Smith (1939), Annals of Mathematical Statistics 10, 275-287', doi: '10.1214/aoms/1177732186' },
    ],
  },
  {
    id: 'aggregation',
    title: { en: 'Rank aggregation (Borda, Copeland)', tr: 'Sıralama birleştirme (Borda, Copeland)' },
    summary: {
      en: 'Use it when you deliberately ran 3 or more methods from different families and have no principled reason to prefer one. Show the combined ranking next to the individual ones with Kendall\'s W, never instead of them. Do not use it to hide disagreement, with several near-duplicate methods, or with a partial order mixed in. In 500,000 simulated aggregations a complete consensus was not reached in about 78% of cases.',
      tr: 'Farklı ailelerden bilinçli olarak 3 ya da daha fazla yöntem çalıştırdıysanız ve birini tercih etmek için ilkeli bir nedeniniz yoksa kullanın. Birleşik sıralamayı tek tek sıralamaların yerine değil, yanlarında Kendall W ile gösterin. Uyuşmazlığı gizlemek için, birbirinin neredeyse kopyası birkaç yöntemle ya da araya karışmış kısmi bir sıralamayla kullanmayın. 500.000 benzetim birleştirmesinin yaklaşık %78\'inde tam bir uzlaşıya ulaşılamadı.',
    },
    tex: [
      String.raw`B_i = \sum_{k} (n - r_{ik})`,
      String.raw`C_i = \sum_{j \ne i} \operatorname{sign}\left(\#\{k : r_{ik} < r_{jk}\} - \#\{k : r_{ik} > r_{jk}\}\right)`,
    ],
    sources: [
      { label: 'Orakçı & Özdemir (2024), Alphanumeric Journal 12(1), 21-38', doi: '10.17093/alphanumeric.1426694' },
      { label: 'Pereira, Basílio & Yiğit (2026), IJITDM', doi: '10.1142/S0219622026500525' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Decision tree: "which method should I use?"
// ---------------------------------------------------------------------------

export type Recommendation = {
  methodIds: MethodId[]
  reason: Bilingual
}

export type GuideOption = {
  id: string
  label: Bilingual
  /** Methods this answer points to. A path collects the recommendations of every answer on it. */
  recommend?: Recommendation
  /** Next question; absent = end of the path. */
  next?: string
}

export type GuideNode = {
  id: string
  /** 'weighting' questions pick the weights, 'ranking' questions pick the ranking method. */
  stage: 'weighting' | 'ranking'
  question: Bilingual
  help?: Bilingual
  options: GuideOption[]
}

export const decisionTreeIntro: Bilingual = {
  en: 'A few questions narrow the list to methods that fit your data and your question. The tree is a starting point; read the method page before you rely on a result.',
  tr: 'Birkaç soru, listeyi verinize ve sorunuza uyan yöntemlere indirir. Ağaç bir başlangıç noktasıdır; bir sonuca güvenmeden önce yöntemin sayfasını okuyun.',
}

export const decisionTreeSources: readonly Source[] = [
  { label: 'Cinelli et al. (2020), MCDA-MSS, Omega 96, 102261', doi: '10.1016/j.omega.2020.102261' },
  { label: 'Roy & Słowiński (2013), EURO Journal on Decision Processes 1, 69-97', doi: '10.1007/s40070-013-0004-7' },
  { label: 'Wątróbski et al. (2019), Generalised framework for multi-criteria method selection, Omega 86, 107-124', doi: '10.1016/j.omega.2018.07.004' },
]

const RANKING_START = 'result-type'

export const decisionTree: { start: string; nodes: readonly GuideNode[] } = {
  start: 'weights-source',
  nodes: [
    {
      id: 'weights-source',
      stage: 'weighting',
      question: {
        en: 'Who should decide how important each criterion is: experts or the data?',
        tr: 'Kriter önemini kim belirleyecek: uzmanlar mı, veri mi?',
      },
      options: [
        { id: 'experts', label: { en: 'Experts or the decision maker', tr: 'Uzmanlar ya da karar verici' }, next: 'expert-detail' },
        { id: 'data', label: { en: 'The data in the decision matrix', tr: 'Karar matrisindeki veri' }, next: 'data-correlated' },
        {
          id: 'nobody',
          label: { en: 'Nobody; I have no information about importance', tr: 'Hiçbiri; önem hakkında bilgim yok' },
          recommend: {
            methodIds: ['equal'],
            reason: {
              en: 'With no information about importance, equal weights are the neutral start, but the number of criteria per theme quietly weights the themes.',
              tr: 'Önem bilgisi yoksa eşit ağırlık tarafsız bir başlangıçtır, ama tema başına kriter sayısı temaları sessizce ağırlıklandırır.',
            },
          },
          next: RANKING_START,
        },
      ],
    },
    {
      id: 'expert-detail',
      stage: 'weighting',
      question: {
        en: 'What can the experts give you?',
        tr: 'Uzmanlar size ne verebilir?',
      },
      options: [
        {
          id: 'order-only',
          label: { en: 'Only an order: most important, second, and so on', tr: 'Yalnız bir sıra: en önemli, ikinci, vb.' },
          recommend: {
            methodIds: ['roc'],
            reason: {
              en: 'Rank-order weights turn a ranking into weights with a closed formula; ROC is the usual default.',
              tr: 'Sıraya dayalı ağırlıklar bir sıralamayı kapalı bir formülle ağırlığa çevirir; genelde varsayılan ROC\'tur.',
            },
          },
          next: RANKING_START,
        },
        {
          id: 'order-and-steps',
          label: {
            en: 'An order, plus how much less important each criterion is than the one above',
            tr: 'Bir sıra ve her kriterin üstündekinden ne kadar daha az önemli olduğu',
          },
          recommend: {
            methodIds: ['swara'],
            reason: {
              en: 'SWARA needs only n - 1 step judgements and is consistent by construction.',
              tr: 'SWARA yalnız n - 1 adım yargısı ister ve yapısı gereği tutarlıdır.',
            },
          },
          next: RANKING_START,
        },
        {
          id: 'pairwise',
          label: {
            en: 'Pairwise comparisons of every two criteria (up to about 9 criteria)',
            tr: 'Her iki kriterin ikili karşılaştırması (en fazla 9 civarında kriter)',
          },
          recommend: {
            methodIds: ['ahp'],
            reason: {
              en: 'AHP turns pairwise judgements into weights and reports a consistency ratio; n(n-1)/2 questions, 36 at n = 9.',
              tr: 'AHP ikili yargıları ağırlığa çevirir ve bir tutarlılık oranı verir; n(n-1)/2 soru, n = 9 için 36.',
            },
          },
          next: RANKING_START,
        },
        {
          id: 'best-worst',
          label: {
            en: 'A best and a worst criterion, compared with all the others',
            tr: 'Bir en iyi ve bir en kötü kriter, diğer hepsiyle karşılaştırılmış',
          },
          recommend: {
            methodIds: ['bwm'],
            reason: {
              en: 'BWM needs only 2n - 3 judgements and still reports consistency.',
              tr: 'BWM yalnız 2n - 3 yargı ister ve yine de tutarlılığı raporlar.',
            },
          },
          next: RANKING_START,
        },
      ],
    },
    {
      id: 'data-correlated',
      stage: 'weighting',
      question: {
        en: 'Do some criteria measure nearly the same thing (strongly correlated)?',
        tr: 'Bazı kriterler neredeyse aynı şeyi mi ölçüyor (yüksek korelasyon)?',
      },
      options: [
        {
          id: 'correlated',
          label: { en: 'Yes, or probably', tr: 'Evet ya da muhtemelen' },
          recommend: {
            methodIds: ['critic'],
            reason: {
              en: 'CRITIC lowers the weight of criteria that tell the same story but does not merge them: on the Krishnan 2021 data the two copies of a duplicated criterion together still get 1.3 to 1.5 times its single weight (stable correlations need 4 or more alternatives).',
              tr: 'CRITIC aynı bilgiyi taşıyan kriterlerin ağırlığını düşürür ama onları birleştirmez: Krishnan 2021 verisinde kopyalanan bir kriterin iki kopyası birlikte yine tek başına aldığı ağırlığın 1,3-1,5 katını alır (kararlı korelasyon için en az 4 alternatif gerekir).',
            },
          },
          next: RANKING_START,
        },
        { id: 'not-correlated', label: { en: 'No, or I do not know', tr: 'Hayır ya da bilmiyorum' }, next: 'data-sign' },
      ],
    },
    {
      id: 'data-sign',
      stage: 'weighting',
      question: {
        en: 'Are there zeros or negative values in the data?',
        tr: 'Veride sıfır ya da negatif değer var mı?',
      },
      options: [
        {
          id: 'negatives',
          label: { en: 'Yes, negative values', tr: 'Evet, negatif değerler' },
          recommend: {
            methodIds: ['lopcow', 'sd'],
            reason: {
              en: 'Both start with min-max normalization, which accepts any sign; LOPCOW gives flatter weights than Entropy, and SD is the simplest baseline.',
              tr: 'İkisi de her işareti kabul eden min-maks normalizasyonuyla başlar; LOPCOW Entropiden daha düz ağırlık verir, SD ise en basit karşılaştırma tabanıdır.',
            },
          },
          next: RANKING_START,
        },
        {
          id: 'zeros',
          label: { en: 'Zeros, but no negatives', tr: 'Sıfırlar var, negatif yok' },
          recommend: {
            methodIds: ['sd', 'entropy'],
            reason: {
              en: 'SD takes zeros as they are; Entropy computes with them (0 ln 0 = 0) but a column with only a few non-zero values can take most of the weight, and MEREC is excluded because it takes the logarithm of every value.',
              tr: 'SD sıfırları olduğu gibi alır; Entropi de sıfırlarla hesaplar (0 ln 0 = 0) ama yalnız birkaç değeri sıfırdan farklı olan bir sütun ağırlığın çoğunu alabilir, MEREC ise her değerin logaritmasını aldığı için dışarıda kalır.',
            },
          },
          next: RANKING_START,
        },
        {
          id: 'positive',
          label: { en: 'No, every value is positive', tr: 'Hayır, her değer pozitif' },
          recommend: {
            methodIds: ['entropy', 'merec'],
            reason: {
              en: 'Entropy weights by dispersion and turns erratic on very homogeneous data; MEREC weights by how much removing a criterion changes the scores and is sensitive to single outliers.',
              tr: 'Entropi yayılıma göre ağırlık verir ve çok homojen veride oynaklaşır; MEREC bir kriteri çıkarmanın puanları ne kadar değiştirdiğine bakar ve tek tek uç değerlere duyarlıdır.',
            },
          },
          next: RANKING_START,
        },
      ],
    },
    {
      id: 'result-type',
      stage: 'ranking',
      question: {
        en: 'Which result do you need: full ranking, shortlist or partial order?',
        tr: 'Nasıl bir sonuç gerekiyor: tam sıralama, kısa liste ya da kısmi sıralama?',
      },
      options: [
        { id: 'full', label: { en: 'A full ranking', tr: 'Tam sıralama' }, next: 'compensation' },
        {
          id: 'shortlist',
          label: { en: 'A shortlist of candidates', tr: 'Adaylardan kısa bir liste' },
          recommend: {
            methodIds: ['electre-i'],
            reason: {
              en: 'ELECTRE I returns the kernel: the alternatives that no other alternative convincingly beats.',
              tr: 'ELECTRE I çekirdeği döndürür: başka hiçbir alternatifin ikna edici biçimde geçemediği alternatifler.',
            },
          },
        },
        { id: 'partial', label: { en: 'A partial order, some pairs left incomparable', tr: 'Kısmi sıralama, bazı çiftler kıyaslanamaz kalabilir' }, next: 'veto' },
      ],
    },
    {
      id: 'veto',
      stage: 'ranking',
      question: {
        en: 'Should one very bad value block an otherwise good alternative (veto)?',
        tr: 'Çok kötü tek bir değer, iyi bir alternatifi elemeli mi (veto)?',
      },
      options: [
        {
          id: 'veto-yes',
          label: { en: 'Yes', tr: 'Evet' },
          recommend: {
            methodIds: ['electre-iii'],
            reason: {
              en: 'ELECTRE III has indifference, preference and veto thresholds and shows incomparable pairs explicitly.',
              tr: 'ELECTRE III farksızlık, tercih ve veto eşiklerine sahiptir ve kıyaslanamaz çiftleri açıkça gösterir.',
            },
          },
        },
        {
          id: 'veto-no',
          label: { en: 'No', tr: 'Hayır' },
          recommend: {
            methodIds: ['promethee-ii'],
            reason: {
              en: 'PROMETHEE I shows the partial order (incomparable pairs) and PROMETHEE II adds a complete ranking from the same flows, without a veto.',
              tr: 'PROMETHEE I kısmi sıralamayı (kıyaslanamaz çiftleri) gösterir, PROMETHEE II aynı akışlardan vetosuz tam bir sıralama ekler.',
            },
          },
        },
      ],
    },
    {
      id: 'compensation',
      stage: 'ranking',
      question: {
        en: 'Can strength on one criterion make up for weakness on another?',
        tr: 'Bir kriterdeki güç, başka bir kriterdeki zayıflığı telafi edebilir mi?',
      },
      options: [
        { id: 'compensate-yes', label: { en: 'Yes', tr: 'Evet' }, next: 'small-differences' },
        {
          id: 'compensate-limited',
          label: { en: 'No, or only up to a point', tr: 'Hayır ya da ancak bir noktaya kadar' },
          recommend: {
            methodIds: ['promethee-ii'],
            reason: {
              en: 'Bounded preference functions cap what one large advantage can buy while the net flow still ranks fully; if a weakness must never be compensated and a partial order is fine, see ELECTRE III.',
              tr: 'Sınırlı tercih fonksiyonları tek bir büyük üstünlüğün etkisini sınırlar, net akış yine tam sıralama verir; zayıflık hiç telafi edilmemeliyse ve kısmi sıralama yeterliyse ELECTRE III\'e bakın.',
            },
          },
        },
      ],
    },
    {
      id: 'small-differences',
      stage: 'ranking',
      question: {
        en: 'Are differences below a threshold you can name meaningless?',
        tr: 'Belirleyebileceğiniz bir eşiğin altındaki farklar anlamsız mı?',
      },
      options: [
        {
          id: 'threshold-yes',
          label: { en: 'Yes', tr: 'Evet' },
          recommend: {
            methodIds: ['promethee-ii'],
            reason: {
              en: 'PROMETHEE lets you set per criterion which difference is negligible (q) and which is decisive (p), in the units of the criterion.',
              tr: 'PROMETHEE her kriter için hangi farkın önemsiz (q), hangisinin belirleyici (p) olduğunu kriterin kendi biriminde belirlemenize izin verir.',
            },
          },
        },
        { id: 'threshold-no', label: { en: 'No, every difference counts', tr: 'Hayır, her fark sayılır' }, next: 'ranking-sign' },
      ],
    },
    {
      id: 'ranking-sign',
      stage: 'ranking',
      question: {
        en: 'Does the decision matrix contain zeros or negative values?',
        tr: 'Karar matrisinde sıfır ya da negatif değer var mı?',
      },
      options: [
        {
          id: 'rank-negatives',
          label: { en: 'Yes, negative values', tr: 'Evet, negatif değerler' },
          recommend: {
            methodIds: ['vikor', 'mabac', 'cocoso'],
            reason: {
              en: 'Their min-max or linear normalization accepts any sign; TOPSIS also computes with negatives, but its result then depends on where zero is.',
              tr: 'Min-maks ya da doğrusal normalizasyonları her işareti kabul eder; TOPSIS negatif değerlerle de hesap yapar, ama sonucu sıfırın nerede olduğuna bağlı kalır.',
            },
          },
        },
        {
          id: 'rank-zeros',
          label: { en: 'Zeros, but no negatives', tr: 'Sıfırlar var, negatif yok' },
          recommend: {
            methodIds: ['topsis', 'vikor', 'mabac'],
            reason: {
              en: 'These accept zeros (TOPSIS as long as no column is all zero), while ratio-based methods (WASPAS, COPRAS, ARAS, MARCOS) are excluded.',
              tr: 'Bunlar sıfırı kabul eder (TOPSIS, tamamı sıfır olan sütun olmadıkça); orana dayalı yöntemler (WASPAS, COPRAS, ARAS, MARCOS) dışarıda kalır.',
            },
          },
        },
        { id: 'rank-positive', label: { en: 'No, every value is positive', tr: 'Hayır, her değer pozitif' }, next: 'score-type' },
      ],
    },
    {
      id: 'score-type',
      stage: 'ranking',
      question: {
        en: 'Which kind of score will your readers understand best?',
        tr: 'Okuyucularınız hangi tür skoru en iyi anlar?',
      },
      options: [
        {
          id: 'closeness',
          label: { en: 'Closeness to an ideal option, from 0 to 1', tr: 'İdeal seçeneğe yakınlık, 0 ile 1 arası' },
          recommend: {
            methodIds: ['topsis'],
            reason: {
              en: 'TOPSIS gives one 0-1 closeness score per alternative and is the most common partner of AHP and Entropy.',
              tr: 'TOPSIS her alternatif için 0-1 arası tek bir yakınlık skoru verir ve AHP ile Entropinin en yaygın ortağıdır.',
            },
          },
        },
        {
          id: 'compromise',
          label: { en: 'A compromise, with a check that the winner is clearly ahead', tr: 'Kazananın açık ara önde olup olmadığını denetleyen bir uzlaşı' },
          recommend: {
            methodIds: ['vikor'],
            reason: {
              en: 'VIKOR tests acceptable advantage and stability, and returns a compromise set when the winner is not clearly ahead.',
              tr: 'VIKOR kabul edilebilir üstünlüğü ve kararlılığı sınar; kazanan açık ara önde değilse bir uzlaşık çözüm kümesi döndürür.',
            },
          },
        },
        {
          id: 'weighted-sum',
          label: { en: 'A weighted sum where every point can be traced', tr: 'Her puanı izlenebilen bir ağırlıklı toplam' },
          recommend: {
            methodIds: ['saw', 'waspas'],
            reason: {
              en: 'SAW is the most transparent method, and WASPAS blends it with the weighted product, which punishes very weak values harder.',
              tr: 'SAW en şeffaf yöntemdir; WASPAS onu çok zayıf değerleri daha sert cezalandıran ağırlıklı çarpımla harmanlar.',
            },
          },
        },
        {
          id: 'average',
          label: { en: 'Better or worse than the average alternative', tr: 'Ortalama alternatiften iyi ya da kötü olmak' },
          recommend: {
            methodIds: ['edas'],
            reason: {
              en: 'EDAS measures positive and negative distance from the average solution and is less sensitive to one extreme alternative.',
              tr: 'EDAS ortalama çözümden pozitif ve negatif uzaklığı ölçer ve tek bir uç alternatife daha az duyarlıdır.',
            },
          },
        },
        {
          id: 'percent-target',
          label: { en: 'A percentage of a target or of the best', tr: 'Bir hedefin ya da en iyinin yüzdesi' },
          recommend: {
            methodIds: ['aras', 'copras'],
            reason: {
              en: 'ARAS reports each alternative as a percentage of an optimal alternative you can define; COPRAS as a percentage of the best, with benefits and costs summed separately.',
              tr: 'ARAS her alternatifi tanımlayabileceğiniz optimal bir alternatifin yüzdesi olarak verir; COPRAS ise fayda ve maliyetleri ayrı toplayarak en iyinin yüzdesi olarak.',
            },
          },
        },
      ],
    },
  ],
}

export const getGuideNode = (id: string): GuideNode | undefined => decisionTree.nodes.find((n) => n.id === id)
