import type { MethodContent } from '../types'

// Source: docs/research/methods/topsis.md
export const topsis: MethodContent = {
  id: 'topsis',
  name: { en: 'TOPSIS', tr: 'TOPSIS' },
  fullName: {
    en: 'Technique for Order Preference by Similarity to Ideal Solution',
    tr: 'İdeal çözüme benzerlik yoluyla sıralama tekniği',
  },
  family: 'ranking-distance',
  status: 'available',
  year: 1981,
  origin: {
    authors: 'Hwang, C.L.; Yoon, K.',
    year: 1981,
    title: 'Multiple Attribute Decision Making: Methods and Applications',
    venue: 'Lecture Notes in Economics and Mathematical Systems 186, Springer',
    doi: '10.1007/978-3-642-48318-9',
    note: {
      en: 'The steps follow the English statement in Opricovic & Tzeng (2004), section 3, which cites Hwang & Yoon (1981).',
      tr: 'Adımlar, Hwang ve Yoon (1981) kaynağını veren Opricovic ve Tzeng (2004) 3. bölümdeki İngilizce anlatımı izler.',
    },
  },
  steps: [
    {
      title: { en: 'Vector normalization', tr: 'Vektör normalizasyonu' },
      tex: String.raw`r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{i=1}^{m} x_{ij}^2}}`,
    },
    {
      title: { en: 'Weighted normalized matrix', tr: 'Ağırlıklı normalize matris' },
      tex: String.raw`v_{ij} = w_j\, r_{ij}`,
    },
    {
      title: { en: 'Ideal and anti-ideal solution', tr: 'İdeal ve negatif ideal çözüm' },
      tex: String.raw`A_j^{+} = \begin{cases} \max_i v_{ij} & j \in J^{+} \\ \min_i v_{ij} & j \in J^{-} \end{cases} \qquad A_j^{-} = \begin{cases} \min_i v_{ij} & j \in J^{+} \\ \max_i v_{ij} & j \in J^{-} \end{cases}`,
      note: {
        en: 'J+ are benefit and J- cost criteria; A+ and A- are imaginary alternatives built from the best and worst value of each column.',
        tr: 'J+ fayda, J- maliyet kriterleridir; A+ ve A-, her sütunun en iyi ve en kötü değerinden kurulan hayali alternatiflerdir.',
      },
    },
    {
      title: { en: 'Distances to both', tr: 'İkisine olan uzaklıklar' },
      tex: String.raw`D_i^{+} = \sqrt{\sum_{j=1}^{n} \left(v_{ij} - A_j^{+}\right)^2} \qquad D_i^{-} = \sqrt{\sum_{j=1}^{n} \left(v_{ij} - A_j^{-}\right)^2}`,
      note: { en: 'Euclidean distance.', tr: 'Öklid uzaklığı.' },
    },
    {
      title: { en: 'Relative closeness and ranking', tr: 'Göreli yakınlık ve sıralama' },
      tex: String.raw`C_i = \frac{D_i^{-}}{D_i^{+} + D_i^{-}}, \qquad 0 \le C_i \le 1`,
      note: {
        en: 'Alternatives are ranked by decreasing C.',
        tr: 'Alternatifler C değerine göre büyükten küçüğe sıralanır.',
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'critic',
      text: {
        en: "CRITIC then TOPSIS is this project's original pipeline. Deng, Yeh & Willis (2000) is an early example of objective weights feeding TOPSIS.",
        tr: "CRITIC ardından TOPSIS bu projenin ilk boru hattıdır. Deng, Yeh ve Willis (2000), nesnel ağırlıkların TOPSIS'e verildiği erken bir örnektir.",
      },
    },
    {
      methodId: 'ahp',
      text: {
        en: 'AHP then TOPSIS is the most common pipeline in the literature (10,451 title or abstract co-mentions in OpenAlex; first partner of AHP every year in Çebi et al. 2022).',
        tr: "AHP ardından TOPSIS literatürdeki en yaygın boru hattıdır (OpenAlex'te başlık ya da özette birlikte geçtiği 10.451 çalışma; Çebi vd. 2022'ye göre her yıl AHP'nin ilk ortağı).",
      },
    },
    {
      methodId: 'entropy',
      text: {
        en: 'Entropy then TOPSIS recurs in Turkish financial-performance papers, for example Ersoy & Orçun 2022 (BIST); no source counts how often.',
        tr: 'Entropi ardından TOPSIS Türkçe finansal performans makalelerinde tekrar eder, örneğin Ersoy ve Orçun 2022 (BIST); ne sıklıkta olduğunu sayan bir kaynak yok.',
      },
    },
    {
      text: {
        en: 'Used as the comparison method in the papers that introduced EDAS (2015), CODAS (2016) and CoCoSo (2019).',
        tr: "EDAS (2015), CODAS (2016) ve CoCoSo'yu (2019) tanıtan makalelerde karşılaştırma yöntemi olarak kullanılır.",
      },
    },
  ],
  reference: {
    source: 'Opricovic, S.; Tzeng, G.-H. (2004). Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS. European Journal of Operational Research 156(2), 445-455',
    doi: '10.1016/S0377-2217(03)00020-1',
    match: 'match',
    note: {
      en: 'Tables 1, 2 (input) and 3 (output). Mountain-climber example in two equivalent units (f and phi). Closeness values match to the printed 3 decimals and the winner switches from A1 to A2 between the two encodings, as the paper reports. Ranks also match Keshavarz Ghorabaee et al. (2015) in 7 of 7 weight sets.',
      tr: "Tablo 1, 2 (girdi) ve 3 (çıktı). Dağcı örneği, iki eşdeğer birimde (f ve phi). Yakınlık değerleri basılı 3 basamakta örtüşüyor; makalede olduğu gibi iki gösterim arasında birinci A1'den A2'ye geçiyor. Sıralamalar Keshavarz Ghorabaee vd. (2015) ile 7 ağırlık setinin 7'sinde aynı.",
    },
  },
  sources: [
    { label: 'Opricovic & Tzeng (2004), European Journal of Operational Research 156(2), 445-455', doi: '10.1016/S0377-2217(03)00020-1' },
    { label: 'Keshavarz Ghorabaee, Zavadskas, Olfat & Turskis (2015), Informatica 26(3), 435-451', doi: '10.15388/Informatica.2015.57' },
    { label: 'Podvezko (2011), Engineering Economics 22(2), 134-146', doi: '10.5755/j01.ee.22.2.310' },
    { label: 'Behzadian, Khanmohammadi Otaghsara, Yazdani & Ignatius (2012), A state-of the-art survey of TOPSIS applications, Expert Systems with Applications 39(17), 13051-13069', doi: '10.1016/j.eswa.2012.05.056' },
    { label: 'Deng, Yeh & Willis (2000), Computers & Operations Research 27, 963-973', doi: '10.1016/S0305-0548(99)00069-6' },
  ],
  en: {
    summary:
      'TOPSIS ranks alternatives by closeness to an imaginary best option and distance from an imaginary worst. Pick it for numeric criteria where strength can offset weakness and one 0-1 score is wanted.',
    whenToUse: [
      'Quantitative criteria, a moderate number of alternatives.',
      'Compensation is acceptable: a weak value can be made up elsewhere.',
      'You need a closeness score that is easy to explain.',
    ],
    whenNot: [
      'A scale may shift (C vs F): vector normalization can reorder ranks.',
      'A very bad value must not be offset: use ELECTRE III, PROMETHEE.',
      'Ranks must survive adding or removing alternatives: the ideals move.',
    ],
    inputs: [
      'Decision matrix with m alternatives and n criteria, real numbers. Zeros are fine, an all-zero column is not.',
      'Criterion type per column: benefit or cost.',
      'Weights, one per criterion, non-negative. Scaling all weights by the same factor does not change the result.',
    ],
    pitfalls: [
      'Rank reversal: the winner changes with the unit encoding (reference example) or when an alternative is added or removed.',
      'An all-zero column stays 0 with a warning; an alternative equal to both ideals gets C = 0.5, a tie.',
      'Negative values are computable, but distances then depend on where zero is; min-max is safer for mixed signs.',
    ],
  },
  tr: {
    summary:
      'TOPSIS alternatifleri hayali en iyi seçeneğe yakınlığa ve hayali en kötüden uzaklığa göre sıralar. Sayısal kriterlerde, güçlü yanın zayıf yanı telafi edebildiği ve tek bir 0-1 skoru istediğiniz durumlarda seçin.',
    whenToUse: [
      'Sayısal kriterler, orta büyüklükte bir alternatif kümesi.',
      'Telafi kabul edilebilir: zayıf bir değer başka kriterde kapanabilir.',
      'Kolay anlatılan bir yakınlık skoru gerekiyor.',
    ],
    whenNot: [
      'Ölçek kayabilir (santigrat ve fahrenhayt): vektör normalizasyonu sıralamayı değiştirebilir.',
      'Çok kötü bir değer telafi edilmemeli: ELECTRE III ya da PROMETHEE kullanın.',
      'Alternatif eklenip çıkarılınca sıralar korunmalı: ideal noktalar kayar.',
    ],
    inputs: [
      'm alternatif ve n kriterden oluşan karar matrisi, gerçek sayılar. Sıfır olabilir, tamamı sıfır olan sütun olamaz.',
      'Her sütun için kriter türü: fayda ya da maliyet.',
      'Her kriter için negatif olmayan bir ağırlık. Tüm ağırlıkları aynı çarpanla ölçeklemek sonucu değiştirmez.',
    ],
    pitfalls: [
      'Sıralama tersine dönebilir: birinci, birim gösterimiyle (referans örnek) ya da alternatif eklenip çıkarılınca değişir.',
      'Tamamı sıfır olan sütun 0 kalır ve uyarı gösterilir; iki ideale de eşit alternatif C = 0,5 alır, yani eşitlik.',
      'Negatif değerlerle hesap yapılabilir, ama uzaklıklar sıfırın yerine bağlı kalır; karışık işaretlerde min-maks daha güvenlidir.',
    ],
  },
}
