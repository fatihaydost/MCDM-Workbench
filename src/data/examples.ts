import type { CriterionType } from '../core'
import type { Lang } from '../i18n/lang'

/** Text in both UI languages. */
export type Localized = Record<Lang, string>

export type Citation = {
  /** As printed in the paper, surname first. */
  authors: string
  year: number
  title: string
  /** Journal, volume(issue), pages or article number. */
  venue: string
  doi: string
  /** Where the data comes from inside the paper, in the UI language ("Table 1 (input)" / "Tablo 1 (girdi)"). */
  tables: Localized
}

export type ExampleDataset = {
  id: string
  /** Short name for menus. */
  name: Localized
  /** Button text where a method page offers several examples ("Ten alternatives"); default "Other units". */
  buttonLabel?: Localized
  /** One sentence on what the example is and what it shows. */
  summary: Localized
  /** Method ids this dataset is a published reference for (see src/core/registry.ts). */
  referenceFor: string[]
  citation: Citation
  /** Alternative names as printed in the paper (also the fixture's), used in English. */
  alternatives: string[]
  /**
   * The same names in another UI language, where they have one (countries); proper names such as neighbourhoods
   * or product codes stay as printed. Read through `alternativeNames(ex, lang)`.
   */
  localAlternatives?: Partial<Record<Lang, string[]>>
  criteria: { name: Localized; type: CriterionType }[]
  matrix: number[][]
  /** Weights given in the paper, when the example starts from fixed weights. */
  weights?: number[]
  /** The paper weighs every criterion equally: the example opens with Equal weights (not a reference for them). */
  equalWeights?: true
  /** Published outputs, as printed (rounded as in the paper). */
  published: { label: string; values: number[] | number[][]; decimals: number }[]
}

const OPRICOVIC_TZENG_2004: Omit<Citation, 'tables'> = {
  authors: 'Opricovic, S.; Tzeng, G.-H.',
  year: 2004,
  title: 'Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS',
  venue: 'European Journal of Operational Research 156(2), 445-455',
  doi: '10.1016/S0377-2217(03)00020-1',
}

/**
 * Published datasets only. Every number below is copied from the cited table and is also a test
 * fixture in tests/fixtures (the core tests check that our methods reproduce the published outputs).
 */
export const examples: readonly ExampleDataset[] = [
  {
    id: 'krishnan-2021-smartphones',
    name: { en: 'Smartphones (Krishnan et al. 2021)', tr: 'Akıllı telefonlar (Krishnan vd. 2021)' },
    summary: {
      en: 'Five smartphones on price, screen size, pixel density, thickness and mass. The paper reports the CRITIC weights.',
      tr: 'Beş akıllı telefon; fiyat, ekran boyutu, piksel yoğunluğu, kalınlık ve kütle. Makale CRITIC ağırlıklarını veriyor.',
    },
    referenceFor: ['critic'],
    citation: {
      authors: 'Krishnan, A.R.; Kasim, M.M.; Hamid, R.; Ghazali, M.F.',
      year: 2021,
      title: 'A Modified CRITIC Method to Estimate the Objective Weights of Decision Criteria',
      venue: 'Symmetry 13(6), 973',
      doi: '10.3390/sym13060973',
      tables: { en: 'Table 1 (input), Tables 2 and 5 (output)', tr: 'Tablo 1 (girdi), Tablo 2 ve 5 (çıktı)' },
    },
    alternatives: ['A', 'B', 'C', 'D', 'E'],
    criteria: [
      { name: { en: 'Price', tr: 'Fiyat' }, type: 'cost' },
      { name: { en: 'Screen size', tr: 'Ekran boyutu' }, type: 'benefit' },
      { name: { en: 'Pixel density', tr: 'Piksel yoğunluğu' }, type: 'benefit' },
      { name: { en: 'Thickness', tr: 'Kalınlık' }, type: 'cost' },
      { name: { en: 'Mass', tr: 'Kütle' }, type: 'cost' },
    ],
    matrix: [
      [649, 4.7, 326, 7.1, 143],
      [749, 5.5, 401, 7.3, 192],
      [740, 5.7, 520, 7.6, 171],
      [400, 5.7, 520, 11.1, 179],
      [600, 5.5, 538, 8.9, 152],
    ],
    published: [
      { label: 'critic.sigma', values: [0.4062, 0.4147, 0.4394, 0.4161, 0.4063], decimals: 4 },
      { label: 'critic.weights', values: [0.1872, 0.1838, 0.1691, 0.2599, 0.2], decimals: 4 },
    ],
  },
  {
    id: 'zavadskas-2017-vilnius',
    name: { en: 'Vilnius neighbourhoods (Zavadskas et al. 2017)', tr: 'Vilnius mahalleleri (Zavadskas vd. 2017)' },
    summary: {
      en: 'Twenty-one Vilnius neighbourhoods on five economic criteria. The paper reports the Entropy weights but prints them on the wrong rows of Table 8; ours follow the data columns.',
      tr: "Yirmi bir Vilnius mahallesi, beş ekonomik kriter. Makale Entropi ağırlıklarını veriyor ama Tablo 8'de yanlış satırlara basıyor; buradakiler veri sütunlarını izler.",
    },
    referenceFor: ['entropy'],
    citation: {
      authors: 'Zavadskas, E.K.; Cavallaro, F.; Podvezko, V.; Ubarte, I.; Kaklauskas, A.',
      year: 2017,
      title: 'MCDM Assessment of a Healthy and Safe Built Environment According to Sustainable Development Principles: A Practical Neighborhood Approach in Vilnius',
      venue: 'Sustainability 9(5), 702',
      doi: '10.3390/su9050702',
      tables: { en: 'Table 4 (input, economic block), Table 8 (output, column Entropy)', tr: 'Tablo 4 (girdi, ekonomik blok), Tablo 8 (çıktı, Entropi sütunu)' },
    },
    alternatives: ['Antakalnis', 'Fabijoniškės', 'Grigiškės', 'Justiniškės', 'Karoliniškės', 'Lazdynai', 'Naujamiestis', 'Naujininkai', 'Naujoji Vilnia', 'Paneriai', 'Pašilaičiai', 'Pilaitė', 'Rasos', 'Senamiestis', 'Šeškinė', 'Verkiai', 'Vilkpėdė', 'Viršuliškės', 'Žirmūnai', 'Žvėrynas', 'Šnipiškės'],
    criteria: [
      { name: { en: 'Housing price (EUR/m²)', tr: 'Konut fiyatı (EUR/m²)' }, type: 'cost' },
      { name: { en: 'Population density (per km²)', tr: 'Nüfus yoğunluğu (km² başına)' }, type: 'cost' },
      { name: { en: 'Single and two-family houses (per km²)', tr: 'Tek ve iki aileli evler (km² başına)' }, type: 'benefit' },
      { name: { en: 'Blocks of flats (per km²)', tr: 'Apartman blokları (km² başına)' }, type: 'cost' },
      { name: { en: 'Jobs per 1000 residents', tr: '1000 kişi başına iş' }, type: 'benefit' },
    ],
    matrix: [
      [1888.34, 504.4, 44.62, 3.6, 18.2],
      [1154.1, 9697.32, 106.59, 42.2, 9.3],
      [676.1, 1580.99, 76.9, 14.79, 2],
      [1080.61, 9215.44, 39.26, 86.58, 4.6],
      [1222.06, 6817.5, 11.5, 12.75, 7.2],
      [1190.3, 3019.13, 54.66, 14.17, 7.2],
      [1711.44, 4840, 116.04, 33.54, 94.6],
      [967.13, 758.42, 40.54, 6.18, 21.5],
      [854.64, 793.16, 89.03, 8.22, 11],
      [950.14, 91.12, 19.11, 1.04, 41.7],
      [1136.8, 4031.22, 74.88, 13.29, 10.7],
      [1243.52, 1472.46, 48.84, 7.68, 6],
      [1601, 834.41, 97.48, 9.37, 7.7],
      [2221.89, 4321.56, 186.22, 40.67, 49.2],
      [1055.02, 7121.14, 55, 41.36, 9.2],
      [1481.19, 757.93, 70.87, 5.03, 22.3],
      [1205.37, 2072.43, 38.54, 11.55, 9.5],
      [1175.03, 5893.2, 22.8, 31.6, 7.3],
      [1582.93, 5455.29, 23.18, 27.65, 37.9],
      [2153.47, 4103.33, 256.3, 72.59, 10.4],
      [1612.65, 4917.31, 188.78, 56.09, 21.5],
    ],
    // Table 8 prints these values on permuted rows (printed row k = data column [2, 4, 0, 1, 3][k]); listed here in
    // the data's column order, which is what the data give (docs/research/methods/entropy.md, Reference example).
    published: [{ label: 'entropy.weights', values: [0.0308, 0.2196, 0.1879, 0.2648, 0.297], decimals: 4 }],
  },
  {
    id: 'diakoulaki-1995-pharma',
    name: { en: 'Greek pharmaceutical firms (Diakoulaki et al. 1995)', tr: 'Yunan ilaç firmaları (Diakoulaki vd. 1995)' },
    summary: {
      en: 'Eight firms on three criteria, with negative profitability values. The paper that introduced CRITIC computes SD weights on the same data as its baseline.',
      tr: 'Sekiz firma, üç kriter; kârlılıkta negatif değerler var. CRITIC yöntemini tanıtan makale, aynı veride karşılaştırma tabanı olarak SD ağırlıklarını hesaplar.',
    },
    referenceFor: ['sd'],
    citation: {
      authors: 'Diakoulaki, D.; Mavrotas, G.; Papayannakis, L.',
      year: 1995,
      title: 'Determining objective weights in multiple criteria problems: The CRITIC method',
      venue: 'Computers & Operations Research 22(7), 763-770',
      doi: '10.1016/0305-0548(94)00059-H',
      tables: { en: 'Table 1 (input), Table 3 (output, row SD)', tr: 'Tablo 1 (girdi), Tablo 3 (çıktı, SD satırı)' },
    },
    alternatives: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    criteria: [
      { name: { en: 'Profitability (%)', tr: 'Kârlılık (%)' }, type: 'benefit' },
      { name: { en: 'Market share (%)', tr: 'Pazar payı (%)' }, type: 'benefit' },
      { name: { en: 'Productivity (million $)', tr: 'Verimlilik (milyon $)' }, type: 'benefit' },
    ],
    matrix: [
      [61.0, 1.08, 4.33],
      [20.7, 0.26, 4.34],
      [16.3, 1.98, 2.53],
      [9.0, 3.29, 1.65],
      [5.4, 2.77, 2.33],
      [4.0, 4.12, 1.21],
      [-6.1, 3.52, 2.1],
      [-34.6, 3.31, 0.98],
    ],
    // Sec. 5 also prints σ = 0.263, 0.321, 0.358, the population SD; the workbench shows the sample SD (n - 1).
    published: [{ label: 'sd.weights', values: [0.279, 0.341, 0.38], decimals: 3 }],
  },
  {
    id: 'keshavarz-2021-merec',
    name: { en: 'Five alternatives, four criteria (Keshavarz-Ghorabaee et al. 2021)', tr: 'Beş alternatif, dört kriter (Keshavarz-Ghorabaee vd. 2021)' },
    buttonLabel: { en: 'Illustrative example', tr: 'Açıklayıcı örnek' },
    summary: {
      en: 'The worked example of the paper that introduced MEREC: two benefit and two cost criteria, every value above 0. C1 runs from 5 to 450, so it takes most of the weight.',
      tr: "MEREC'i tanıtan makalenin çözümlü örneği: iki fayda ve iki maliyet kriteri, her değer 0'dan büyük. C1 5 ile 450 arasında değiştiği için ağırlığın çoğunu alır.",
    },
    referenceFor: ['merec'],
    citation: {
      authors: 'Keshavarz-Ghorabaee, M.; Amiri, M.; Zavadskas, E.K.; Turskis, Z.; Antucheviciene, J.',
      year: 2021,
      title: 'Determination of Objective Weights Using a New Method Based on the Removal Effects of Criteria (MEREC)',
      venue: 'Symmetry 13(4), 525',
      doi: '10.3390/sym13040525',
      tables: { en: 'Table 2 (input), Tables 3-4 and Steps 3-6 (output)', tr: 'Tablo 2 (girdi), Tablo 3-4 ve Adım 3-6 (çıktı)' },
    },
    // The paper names them A1 to A5 and C1 to C4 (Table 2); C1 and C2 are benefit, C3 and C4 cost.
    alternatives: ['A1', 'A2', 'A3', 'A4', 'A5'],
    criteria: [
      { name: { en: 'C1', tr: 'C1' }, type: 'benefit' },
      { name: { en: 'C2', tr: 'C2' }, type: 'benefit' },
      { name: { en: 'C3', tr: 'C3' }, type: 'cost' },
      { name: { en: 'C4', tr: 'C4' }, type: 'cost' },
    ],
    matrix: [
      [450, 8000, 54, 145],
      [10, 9100, 2, 160],
      [100, 8200, 31, 153],
      [220, 9300, 1, 162],
      [5, 8400, 23, 158],
    ],
    // S, S' and E are printed to 2 decimals (rounded from the exact values); the weights to 4.
    published: [
      { label: 'merec.performance', values: [0.77, 0.71, 0.65, 1.09, 0.21], decimals: 2 },
      { label: 'merec.removalEffect', values: [1.71, 0.04, 1.19, 0.03], decimals: 2 },
      { label: 'merec.weights', values: [0.5752, 0.0141, 0.4016, 0.0091], decimals: 4 },
    ],
  },
  {
    id: 'keles-2023-cities',
    name: { en: 'Power-centre cities (Keleş 2023)', tr: 'Güç merkezi şehirleri (Keleş 2023)' },
    summary: {
      en: 'Fifteen G7 and Turkish cities on six Global Power City Index benefit criteria. The paper computes LOPCOW weights with the sample standard deviation.',
      tr: 'On beş G7 ve Türkiye şehri, Küresel Güç Şehri Endeksi kapsamındaki altı fayda kriteri. Makale LOPCOW ağırlıklarını örneklem standart sapmasıyla hesaplar.',
    },
    referenceFor: ['lopcow'],
    citation: {
      authors: 'Keleş, N.',
      year: 2023,
      title: "Lopcow ve Cradis yöntemleriyle G7 ülkelerinin ve Türkiye'nin yaşanabilir güç merkezi şehirlerinin değerlendirilmesi",
      venue: 'Ömer Halisdemir Üniversitesi İİBF Dergisi 16(3), 727-747',
      doi: '10.25287/ohuiibf.1239201',
      tables: { en: 'Table 6 (GPCI input and LOPCOW weights)', tr: 'Tablo 6 (GPCI girdisi ve LOPCOW ağırlıkları)' },
    },
    alternatives: [
      'New York',
      'London',
      'Tokyo',
      'San Francisco',
      'Washington',
      'Paris',
      'Toronto',
      'Los Angeles',
      'Boston',
      'Chicago',
      'Vancouver',
      'Frankfurt',
      'Berlin',
      'Milan',
      'Istanbul',
    ],
    localAlternatives: {
      tr: [
        'New York',
        'Londra',
        'Tokyo',
        'San Francisco',
        'Washington',
        'Paris',
        'Toronto',
        'Los Angeles',
        'Boston',
        'Chicago',
        'Vancouver',
        'Frankfurt',
        'Berlin',
        'Milano',
        'İstanbul',
      ],
    },
    criteria: [
      { name: { en: 'Economy', tr: 'Ekonomi' }, type: 'benefit' },
      { name: { en: 'Research and development', tr: 'Araştırma ve geliştirme' }, type: 'benefit' },
      { name: { en: 'Cultural interaction', tr: 'Kültürel etkileşim' }, type: 'benefit' },
      { name: { en: 'Livability', tr: 'Yaşanabilirlik' }, type: 'benefit' },
      { name: { en: 'Environment', tr: 'Çevre' }, type: 'benefit' },
      { name: { en: 'Accessibility', tr: 'Erişilebilirlik' }, type: 'benefit' },
    ],
    matrix: [
      [362.5, 207.4, 254.3, 304, 157.1, 220.6],
      [324.5, 181.3, 338.9, 358.3, 192.9, 196.6],
      [292, 145.4, 210.6, 353.1, 181, 185.1],
      [281.3, 118.2, 95.5, 300.6, 136.8, 133.8],
      [264.4, 85.9, 75.9, 273.7, 142.4, 132.9],
      [253.1, 103.1, 235.5, 383.4, 156.3, 225.4],
      [245.9, 61, 94.7, 352.9, 173, 145.5],
      [239.3, 155.8, 113.3, 302.9, 144.2, 146.1],
      [238.2, 135.4, 65.7, 289.1, 159.5, 145.4],
      [228.3, 109.5, 106.9, 287.2, 133.7, 192.8],
      [236.7, 45.8, 59.4, 322.8, 198.7, 113.2],
      [220.9, 30.6, 78.1, 346.8, 179.4, 217.8],
      [222.8, 80.9, 171.6, 359, 195.2, 153.5],
      [177.1, 27.8, 118.7, 362.5, 159.2, 171.8],
      [132.4, 37.3, 195.7, 318.4, 146.8, 166.7],
    ],
    published: [{ label: 'lopcow.weights', values: [0.241, 0.142, 0.105, 0.18, 0.151, 0.181], decimals: 3 }],
  },
  {
    id: 'opricovic-tzeng-2004-f',
    name: { en: 'Mountain climbing (Opricovic and Tzeng 2004)', tr: 'Dağ tırmanışı (Opricovic ve Tzeng 2004)' },
    summary: {
      en: 'Three climbing routes on risk and altitude, with equal weights. The paper reports the TOPSIS distances and closeness and the VIKOR S, R and Q.',
      tr: 'Üç tırmanış rotası; risk ve yükseklik, eşit ağırlıkla. Makale TOPSIS uzaklıklarını ve yakınlık katsayılarını, VIKOR için S, R ve Q değerlerini veriyor.',
    },
    referenceFor: ['topsis', 'vikor'],
    citation: {
      ...OPRICOVIC_TZENG_2004,
      tables: { en: 'Tables 1 and 2 (input, problem f), Table 3 (output)', tr: 'Tablo 1 ve 2 (girdi, f problemi), Tablo 3 (çıktı)' },
    },
    alternatives: ['A1', 'A2', 'A3'],
    criteria: [
      { name: { en: 'Risk (1 to 5)', tr: 'Risk (1 ile 5 arası)' }, type: 'cost' },
      { name: { en: 'Altitude (m above sea level)', tr: 'Yükseklik (deniz seviyesinden m)' }, type: 'benefit' },
    ],
    matrix: [
      [1, 3000],
      [2, 3750],
      [5, 4500],
    ],
    weights: [0.5, 0.5],
    published: [
      { label: 'topsis.distanceBest', values: [0.114, 0.108, 0.365], decimals: 3 },
      { label: 'topsis.distanceWorst', values: [0.365, 0.28, 0.114], decimals: 3 },
      { label: 'topsis.closeness', values: [0.762, 0.722, 0.238], decimals: 3 },
      { label: 'vikor.groupUtility', values: [0.5, 0.375, 0.5], decimals: 3 },
      { label: 'vikor.individualRegret', values: [0.5, 0.25, 0.5], decimals: 2 },
      { label: 'vikor.q', values: [1, 0, 1], decimals: 0 },
    ],
  },
  {
    id: 'opricovic-tzeng-2004-phi',
    name: {
      en: 'Mountain climbing, other units (Opricovic and Tzeng 2004)',
      tr: 'Dağ tırmanışı, başka birimler (Opricovic ve Tzeng 2004)',
    },
    summary: {
      en: 'The same routes with risk shifted by 5 and altitude in km above the foothill. TOPSIS ranks them differently, which the paper uses to show rank reversal; VIKOR gives the same S, R and Q.',
      tr: "Aynı rotalar; risk 5 kaydırılmış, yükseklik etekten km cinsinden. TOPSIS bu kez farklı sıralıyor, makale bunu sıra değişimini göstermek için kullanıyor; VIKOR aynı S, R ve Q'yu veriyor.",
    },
    referenceFor: ['topsis', 'vikor'],
    citation: {
      ...OPRICOVIC_TZENG_2004,
      tables: { en: 'Tables 1 and 2 (input, problem φ), Table 3 (output)', tr: 'Tablo 1 ve 2 (girdi, φ problemi), Tablo 3 (çıktı)' },
    },
    alternatives: ['A1', 'A2', 'A3'],
    criteria: [
      { name: { en: 'Risk (6 to 10)', tr: 'Risk (6 ile 10 arası)' }, type: 'cost' },
      { name: { en: 'Altitude (km above foothill)', tr: 'Yükseklik (etekten km)' }, type: 'benefit' },
    ],
    matrix: [
      [6, 2.0],
      [7, 2.75],
      [10, 3.5],
    ],
    weights: [0.5, 0.5],
    published: [
      { label: 'topsis.distanceBest', values: [0.154, 0.085, 0.147], decimals: 3 },
      { label: 'topsis.distanceWorst', values: [0.147, 0.134, 0.154], decimals: 3 },
      { label: 'topsis.closeness', values: [0.489, 0.612, 0.511], decimals: 3 },
      { label: 'vikor.groupUtility', values: [0.5, 0.375, 0.5], decimals: 3 },
      { label: 'vikor.individualRegret', values: [0.5, 0.25, 0.5], decimals: 2 },
      { label: 'vikor.q', values: [1, 0, 1], decimals: 0 },
    ],
  },
  {
    id: 'podvezko-2011-baltic',
    name: { en: 'Baltic economies (Podvezko 2011)', tr: 'Baltık ekonomileri (Podvezko 2011)' },
    summary: {
      en: 'Four countries on five economic indicators, with expert weights. The paper reports the SAW scores; its Table 2 misprints one value for Lithuania, which changes S in the third decimal, so the scores here are the corrected ones.',
      tr: "Dört ülke, beş ekonomik gösterge, uzman ağırlıklarıyla. Makale SAW skorlarını veriyor; Tablo 2 Litvanya için bir değeri yanlış basmış, bu S'yi üçüncü basamakta değiştiriyor, bu yüzden buradaki skorlar düzeltilmiş olanlar.",
    },
    referenceFor: ['saw'],
    citation: {
      authors: 'Podvezko, V.',
      year: 2011,
      title: 'The Comparative Analysis of MCDA Methods SAW and COPRAS',
      venue: 'Inžinerinė ekonomika - Engineering Economics 22(2), 134-146',
      doi: '10.5755/j01.ee.22.2.310',
      tables: { en: 'Table 1 (input), Table 2 (weights), Tables 3 and 6 (output)', tr: 'Tablo 1 (girdi), Tablo 2 (ağırlıklar), Tablo 3 ve 6 (çıktı)' },
    },
    alternatives: ['Estonia', 'Latvia', 'Lithuania', 'Poland'],
    localAlternatives: { tr: ['Estonya', 'Letonya', 'Litvanya', 'Polonya'] },
    criteria: [
      { name: { en: 'GDP growth (%)', tr: 'GSYH büyümesi (%)' }, type: 'benefit' },
      { name: { en: 'Production growth (%)', tr: 'Üretim artışı (%)' }, type: 'benefit' },
      { name: { en: 'Average annual salary (EUR)', tr: 'Ortalama yıllık maaş (EUR)' }, type: 'benefit' },
      { name: { en: 'Unemployment rate (%)', tr: 'İşsizlik oranı (%)' }, type: 'cost' },
      { name: { en: 'Export / import ratio', tr: 'İhracat / ithalat oranı' }, type: 'benefit' },
    ],
    matrix: [
      [5.1, 9.8, 430, 9.3, 0.7],
      [7.5, 6.5, 298, 10.3, 0.55],
      [9.7, 16.1, 306, 11.6, 0.73],
      [3.8, 8.4, 501, 19.3, 0.79],
    ],
    weights: [0.35, 0.1, 0.17, 0.25, 0.13],
    // Table 3 prints S(Lithuania) = 0.872 from the misprinted 0.599 in Table 2; 306 / 501 = 0.611 gives 0.874
    // (docs/research/methods/saw.md, Reference example). Linear max, the default; Table 6 (sum) needs no correction.
    published: [{ label: 'saw.scores', values: [0.756, 0.728, 0.874, 0.61], decimals: 3 }],
  },
  {
    id: 'keshavarz-2015-inventory',
    name: { en: 'Inventory of 47 items (Keshavarz Ghorabaee et al. 2015)', tr: '47 kalemlik stok (Keshavarz Ghorabaee vd. 2015)' },
    buttonLabel: { en: '47 items', tr: '47 kalem' },
    summary: {
      en: 'The worked example that introduced EDAS: 47 stock items on unit cost, annual dollar usage and lead time, equal weights. The paper prints every distance and score.',
      tr: 'EDAS yöntemini tanıtan çözümlü örnek: 47 stok kalemi; birim maliyet, yıllık parasal kullanım ve tedarik süresi, eşit ağırlık. Makale her uzaklığı ve skoru veriyor.',
    },
    referenceFor: ['edas'],
    citation: {
      authors: 'Keshavarz Ghorabaee, M.; Zavadskas, E.K.; Olfat, L.; Turskis, Z.',
      year: 2015,
      title: 'Multi-Criteria Inventory Classification Using a New Method of Evaluation Based on Distance from Average Solution (EDAS)',
      venue: 'Informatica 26(3), 435-451',
      doi: '10.15388/Informatica.2015.57',
      tables: { en: 'Table 1 (input), Table 2 (output)', tr: 'Tablo 1 (girdi), Tablo 2 (çıktı)' },
    },
    // The paper numbers the items 1 to 47 (Table 1); all three criteria are benefit (a higher value matters more).
    alternatives: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'],
    criteria: [
      { name: { en: 'Average unit cost ($)', tr: 'Ortalama birim maliyet ($)' }, type: 'benefit' },
      { name: { en: 'Annual dollar usage ($)', tr: 'Yıllık parasal kullanım ($)' }, type: 'benefit' },
      { name: { en: 'Lead time (weeks)', tr: 'Tedarik süresi (hafta)' }, type: 'benefit' },
    ],
    matrix: [
      [49.92, 5840.64, 2],
      [210, 5670, 5],
      [23.76, 5037.12, 4],
      [27.73, 4769.56, 1],
      [57.98, 3478.8, 3],
      [31.24, 2936.67, 3],
      [28.2, 2820, 3],
      [55, 2640, 4],
      [73.44, 2423.52, 6],
      [160.5, 2407.5, 4],
      [5.12, 1075.2, 2],
      [20.87, 1043.5, 5],
      [86.5, 1038, 7],
      [110.4, 883.2, 5],
      [71.2, 854.4, 3],
      [45, 810, 3],
      [14.66, 703.68, 4],
      [49.5, 594, 6],
      [47.5, 570, 5],
      [58.45, 467.6, 4],
      [24.4, 463.6, 4],
      [65, 455, 4],
      [86.5, 432.5, 4],
      [33.2, 398.4, 3],
      [37.05, 370.5, 1],
      [33.84, 338.4, 3],
      [84.03, 336.12, 1],
      [78.4, 313.6, 6],
      [134.34, 268.68, 7],
      [56, 224, 1],
      [72, 216, 5],
      [53.02, 212.08, 2],
      [49.48, 197.92, 5],
      [7.07, 190.89, 7],
      [60.6, 181.8, 3],
      [40.82, 163.28, 3],
      [30, 150, 5],
      [67.4, 134.8, 3],
      [59.6, 119.2, 5],
      [51.68, 103.36, 6],
      [19.8, 79.2, 2],
      [37.7, 75.4, 2],
      [29.89, 59.78, 5],
      [48.3, 48.3, 3],
      [34.4, 34.4, 7],
      [28.8, 28.8, 3],
      [8.46, 25.38, 5],
    ],
    equalWeights: true,
    // As printed: rounded to 3 and then 2 decimals (docs/research/methods/edas.md, Reference example).
    published: [{ label: 'edas.scores', values: [0.66, 1, 0.61, 0.43, 0.6, 0.45, 0.43, 0.6, 0.64, 0.72, 0.16, 0.36, 0.58, 0.54, 0.41, 0.34, 0.24, 0.4, 0.37, 0.37, 0.23, 0.37, 0.39, 0.19, 0.08, 0.18, 0.19, 0.39, 0.47, 0.13, 0.35, 0.18, 0.3, 0.14, 0.25, 0.18, 0.2, 0.25, 0.31, 0.3, 0, 0.08, 0.18, 0.18, 0.23, 0.09, 0.08], decimals: 2 }],
  },
  {
    id: 'keshavarz-2015-ten-alternatives',
    name: { en: 'Ten alternatives, seven criteria (Keshavarz Ghorabaee et al. 2015)', tr: 'On alternatif, yedi kriter (Keshavarz Ghorabaee vd. 2015)' },
    buttonLabel: { en: 'Ten alternatives', tr: 'On alternatif' },
    summary: {
      en: 'A comparison example with three benefit and four cost criteria, weight set 1 of 7. The paper reports the EDAS and VIKOR ranks; no leader is clearly ahead by VIKOR, so it returns a compromise set.',
      tr: 'Üç fayda ve dört maliyet kriterli bir karşılaştırma örneği, 7 ağırlık setinin 1.si. Makale EDAS ve VIKOR sıralarını veriyor; VIKOR\'a göre hiçbir alternatif açık ara önde değil, bu yüzden VIKOR bir uzlaşık küme döndürüyor.',
    },
    referenceFor: ['vikor', 'edas'],
    citation: {
      authors: 'Keshavarz Ghorabaee, M.; Zavadskas, E.K.; Olfat, L.; Turskis, Z.',
      year: 2015,
      title: 'Multi-Criteria Inventory Classification Using a New Method of Evaluation Based on Distance from Average Solution (EDAS)',
      venue: 'Informatica 26(3), 435-451',
      doi: '10.15388/Informatica.2015.57',
      tables: { en: 'Table 5 (input), Table 6 (weight set 1), Table 7 (EDAS and VIKOR ranks)', tr: 'Tablo 5 (girdi), Tablo 6 (1. ağırlık seti), Tablo 7 (EDAS ve VIKOR sıraları)' },
    },
    // The paper names them A1 to A10 and C1 to C7 (Table 5); C1 to C3 are benefit, C4 to C7 cost.
    alternatives: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'],
    criteria: [
      { name: { en: 'C1', tr: 'C1' }, type: 'benefit' },
      { name: { en: 'C2', tr: 'C2' }, type: 'benefit' },
      { name: { en: 'C3', tr: 'C3' }, type: 'benefit' },
      { name: { en: 'C4', tr: 'C4' }, type: 'cost' },
      { name: { en: 'C5', tr: 'C5' }, type: 'cost' },
      { name: { en: 'C6', tr: 'C6' }, type: 'cost' },
      { name: { en: 'C7', tr: 'C7' }, type: 'cost' },
    ],
    matrix: [
      [23, 264, 2.37, 0.05, 167, 8900, 8.71],
      [20, 220, 2.2, 0.04, 171, 9100, 8.23],
      [17, 231, 1.98, 0.15, 192, 10800, 9.91],
      [12, 210, 1.73, 0.2, 195, 12300, 10.21],
      [15, 243, 2, 0.14, 187, 12600, 9.34],
      [14, 222, 1.89, 0.13, 180, 13200, 9.22],
      [21, 262, 2.43, 0.06, 160, 10300, 8.93],
      [20, 256, 2.6, 0.07, 163, 11400, 8.44],
      [19, 266, 2.1, 0.06, 157, 11200, 9.04],
      [8, 218, 1.94, 0.11, 190, 13400, 10.11],
    ],
    weights: [0.25, 0.214, 0.179, 0.143, 0.107, 0.071, 0.036],
    // Ranks only: the paper prints no AS or Q and does not state v (0.5 reproduces all seven weight sets).
    published: [
      { label: 'vikor.rank', values: [2, 5, 7, 9, 6, 8, 1, 3, 4, 10], decimals: 0 },
      { label: 'edas.rank', values: [1, 4, 6, 10, 7, 8, 2, 3, 5, 9], decimals: 0 },
    ],
  },
  {
    id: 'adali-2017-suppliers',
    name: { en: 'Textile suppliers (Aytaç Adalı and Tuş Işık 2017)', tr: 'Tekstil tedarikçileri (Aytaç Adalı ve Tuş Işık 2017)' },
    summary: {
      en: 'Five suppliers of a textile firm in Denizli on six criteria, three of them cost, with SWARA weights. The paper reports the WASPAS score at every λ from 0 to 1; the order changes twice as λ moves.',
      tr: "Denizli'deki bir tekstil işletmesinin beş tedarikçisi, üçü maliyet olmak üzere altı kriter, SWARA ağırlıklarıyla. Makale WASPAS skorunu 0'dan 1'e her λ için veriyor; λ değiştikçe sıralama iki kez değişiyor.",
    },
    referenceFor: ['waspas'],
    citation: {
      authors: 'Aytaç Adalı, E.; Tuş Işık, A.',
      year: 2017,
      title: 'Bir Tedarikçi Seçim Problemi İçin SWARA ve WASPAS Yöntemlerine Dayanan Karar Verme Yaklaşımı',
      venue: 'International Review of Economics and Management 5(4), 56-77',
      doi: '10.18825/iremjournal.335408',
      tables: { en: 'Table 5 (input), Table 4 (SWARA weights), Tables 6 and 7 (output)', tr: 'Tablo 5 (girdi), Tablo 4 (SWARA ağırlıkları), Tablo 6 ve 7 (çıktı)' },
    },
    // The paper names them A1 to A5 (Table 5); quality and reliability are scored 1 to 5 (5: excellent).
    alternatives: ['A1', 'A2', 'A3', 'A4', 'A5'],
    criteria: [
      { name: { en: 'Product quality (1-5)', tr: 'Ürün kalitesi (1-5)' }, type: 'benefit' },
      { name: { en: 'Product cost (YTL)', tr: 'Ürün maliyeti (YTL)' }, type: 'cost' },
      { name: { en: 'Delivery time (days)', tr: 'Teslimat süresi (gün)' }, type: 'cost' },
      { name: { en: 'Production capacity (units/day)', tr: 'Üretim kapasitesi (adet/gün)' }, type: 'benefit' },
      { name: { en: 'Geographic location (km)', tr: 'Coğrafi konum (km)' }, type: 'cost' },
      { name: { en: 'Reliability (1-5)', tr: 'Güvenilirlik (1-5)' }, type: 'benefit' },
    ],
    matrix: [
      [3, 12.5, 2, 120, 14, 3],
      [5, 15, 3, 110, 38, 4],
      [3, 13, 2, 120, 19, 3],
      [4, 14, 2, 100, 31, 4],
      [3, 15, 1.5, 125, 40, 4],
    ],
    weights: [0.221, 0.159, 0.175, 0.127, 0.117, 0.201],
    // Table 7 at λ = 0.5, the slider's default; the paper prints every λ from 0 to 1 (tests/fixtures/waspas-adali2017.json).
    published: [{ label: 'waspas.scores', values: [0.805, 0.7751, 0.7702, 0.7964, 0.7882], decimals: 4 }],
  },
  {
    id: 'ozcan-celik-2021-separators',
    name: { en: 'Cream separators (Özcan and Çelik 2021)', tr: 'Krema separatörleri (Özcan ve Çelik 2021)' },
    buttonLabel: { en: 'Cream separators', tr: 'Krema separatörleri' },
    summary: {
      en: 'Seven cream separators for a dairy on seven criteria, four of them cost, weighted by Entropy. The paper reports the COPRAS Q; its rank row swaps A2 and A3, so the ranks here follow the printed Q.',
      tr: 'Bir süt işletmesi için yedi krema separatörü, dördü maliyet olmak üzere yedi kriter, Entropi ağırlıklarıyla. Makale COPRAS Q değerlerini veriyor; sıra satırı A2 ile A3\'ü yer değiştirmiş, bu yüzden buradaki sıralar basılı Q\'yu izliyor.',
    },
    // The paper's chain: Entropy weights from Table 1 (our Entropy reproduces Table 2 within 5e-5), then COPRAS. The
    // printed weights sum to 0.9999, so the example opens with Entropy instead of typing them in.
    referenceFor: ['entropy', 'copras'],
    citation: {
      authors: 'Özcan, S.; Çelik, A.K.',
      year: 2021,
      title: 'A comparison of TOPSIS, grey relational analysis and COPRAS methods for machine selection problem in the food industry of Turkey',
      venue: 'International Journal of Production Management and Engineering 9(2), 81-92',
      doi: '10.4995/ijpme.2021.14734',
      tables: { en: 'Table 1 (input), Table 2 (Entropy weights), Tables 10 and 11 (output)', tr: 'Tablo 1 (girdi), Tablo 2 (Entropi ağırlıkları), Tablo 10 ve 11 (çıktı)' },
    },
    alternatives: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'],
    criteria: [
      { name: { en: 'Separation performance', tr: 'Ayırma performansı' }, type: 'benefit' },
      { name: { en: 'Drum discharge volume', tr: 'Tambur boşaltma hacmi' }, type: 'benefit' },
      { name: { en: 'Drum turnover', tr: 'Tambur devri' }, type: 'benefit' },
      { name: { en: 'Energy consumption', tr: 'Enerji tüketimi' }, type: 'cost' },
      { name: { en: 'Weight', tr: 'Ağırlık' }, type: 'cost' },
      { name: { en: 'Price', tr: 'Fiyat' }, type: 'cost' },
      { name: { en: 'Number of separators', tr: 'Separatör sayısı' }, type: 'cost' },
    ],
    matrix: [
      [10, 3.5, 7.7, 15, 1.3, 39, 2],
      [20, 6, 6.8, 20, 1.6, 65, 1],
      [15, 9, 5.05, 30, 1.6, 60, 2],
      [18, 15, 6.2, 18.5, 1.3, 68, 1],
      [10, 15, 5.7, 18.5, 1.5, 87, 2],
      [20, 18, 6.2, 18.5, 1.8, 120, 1],
      [12.5, 15, 5.1, 15, 1.1, 42, 2],
    ],
    published: [
      { label: 'entropy.weights', values: [0.1186, 0.3442, 0.0323, 0.086, 0.0368, 0.2148, 0.1672], decimals: 4 },
      { label: 'copras.significance', values: [0.1137, 0.134, 0.1206, 0.1702, 0.1377, 0.1615, 0.1623], decimals: 4 },
    ],
  },
  {
    id: 'stevic-brkovic-2020-drivers',
    name: { en: 'Truck drivers (Stević and Brković 2020)', tr: 'Kamyon şoförleri (Stević ve Brković 2020)' },
    buttonLabel: { en: 'Truck drivers', tr: 'Kamyon şoförleri' },
    summary: {
      en: 'Twenty-three drivers of a transport company on five criteria, two of them cost, with FUCOM weights. "No damage" is entered as 0.001, as in the paper, because MARCOS needs every value above 0.',
      tr: 'Bir taşımacılık şirketinin yirmi üç şoförü, ikisi maliyet olmak üzere beş kriter, FUCOM ağırlıklarıyla. MARCOS her değerin 0\'dan büyük olmasını istediği için "hasar yok", makaledeki gibi 0,001 olarak girildi.',
    },
    referenceFor: ['marcos'],
    citation: {
      authors: 'Stević, Ž.; Brković, N.',
      year: 2020,
      title: 'A Novel Integrated FUCOM-MARCOS Model for Evaluation of Human Resources in a Transport Company',
      venue: 'Logistics 4(1), 4',
      doi: '10.3390/logistics4010004',
      tables: { en: 'Table 2 (input), Table 4 (weights as applied), Table 5 (output)', tr: 'Tablo 2 (girdi), Tablo 4 (uygulanan ağırlıklar), Tablo 5 (çıktı)' },
    },
    alternatives: Array.from({ length: 23 }, (_, i) => `A${i + 1}`),
    criteria: [
      { name: { en: 'Fuel consumption (l/100 km)', tr: 'Yakıt tüketimi (l/100 km)' }, type: 'cost' },
      { name: { en: 'Damage per km', tr: 'Km başına hasar' }, type: 'cost' },
      { name: { en: 'Vehicle maintenance', tr: 'Araç bakımı' }, type: 'benefit' },
      { name: { en: 'Information timeliness', tr: 'Bilgi zamanlılığı' }, type: 'benefit' },
      { name: { en: 'Loyalty', tr: 'Sadakat' }, type: 'benefit' },
    ],
    matrix: [
      [33.9, 0.001, 7, 9, 7], [30.0, 0.001, 9, 7, 7], [31.5, 0.001, 9, 7, 9], [33.0, 0.001, 7, 9, 9],
      [31.9, 0.001, 9, 7, 7], [31.1, 0.05, 7, 7, 9], [34.8, 0.001, 7, 7, 7], [25.8, 0.001, 7, 7, 7],
      [31.7, 0.001, 7, 7, 9], [35.7, 0.001, 7, 7, 7], [34.2, 0.001, 7, 7, 9], [29.6, 0.1, 7, 7, 7],
      [30.2, 0.001, 9, 5, 5], [34.3, 0.001, 7, 7, 9], [31.0, 0.001, 5, 7, 7], [34.5, 0.001, 7, 7, 7],
      [33.9, 0.001, 5, 7, 7], [33.1, 0.001, 9, 9, 9], [32.7, 0.001, 9, 9, 9], [35.0, 0.001, 9, 9, 7],
      [31.8, 0.001, 5, 7, 9], [31.0, 0.001, 9, 7, 7], [32.5, 0.001, 7, 7, 3],
    ],
    // As applied in Table 4; the paper's FUCOM result (Figure 2) has C3 and C4 the other way round, which moves 9 ranks.
    weights: [0.434, 0.255, 0.128, 0.096, 0.087],
    published: [
      {
        label: 'marcos.utility',
        values: [0.738, 0.781, 0.783, 0.763, 0.762, 0.544, 0.712, 0.809, 0.756, 0.705, 0.734, 0.541, 0.744, 0.733, 0.722, 0.714, 0.695, 0.786, 0.79, 0.754, 0.73, 0.771, 0.698],
        decimals: 3,
      },
    ],
  },
  {
    id: 'yazdani-2019-logistics',
    name: { en: 'Logistics providers (Yazdani et al. 2019)', tr: 'Lojistik firmaları (Yazdani vd. 2019)' },
    summary: {
      en: 'Seven logistics providers on five criteria, price the only cost, with expert weights: the first example of the CoCoSo paper, whose three readings agree on the order.',
      tr: 'Yedi lojistik firması, yalnız fiyatın maliyet olduğu beş kriter, uzman ağırlıklarıyla: CoCoSo makalesinin ilk örneği; üç okuma da aynı sırayı verir.',
    },
    referenceFor: ['cocoso'],
    citation: {
      authors: 'Yazdani, M.; Zaraté, P.; Zavadskas, E.K.; Turskis, Z.',
      year: 2019,
      title: 'A combined compromise solution (CoCoSo) method for multi-criteria decision-making problems',
      venue: 'Management Decision 57(9), 2501-2519',
      doi: '10.1108/MD-05-2017-0458',
      tables: { en: 'Table I (input and weights), Table VI (output)', tr: 'Tablo I (girdi ve ağırlıklar), Tablo VI (çıktı)' },
    },
    // The paper's company names (Table I); the matrix is the industrial-robot data of CODAS (2016), relabelled.
    alternatives: ['A1 Mathez', 'A2 Bansard', 'A3 GEFCO', 'A4 Schneider', 'A5 LDI Dimotrans', 'A6 SAGA', 'A7 GETMA'],
    criteria: [
      { name: { en: 'Inventory capacity', tr: 'Stok kapasitesi' }, type: 'benefit' },
      { name: { en: 'Offered price', tr: 'Teklif edilen fiyat' }, type: 'cost' },
      { name: { en: 'Batch volume', tr: 'Parti hacmi' }, type: 'benefit' },
      { name: { en: 'Flexibility', tr: 'Esneklik' }, type: 'benefit' },
      { name: { en: 'Technology use', tr: 'Teknoloji kullanımı' }, type: 'benefit' },
    ],
    matrix: [
      [60, 0.4, 2540, 500, 990],
      [6.35, 0.15, 1016, 3000, 1041],
      [6.8, 0.1, 1727.2, 1500, 1676],
      [10, 0.2, 1000, 2000, 965],
      [2.5, 0.1, 560, 500, 915],
      [4.5, 0.08, 1016, 350, 508],
      [3, 0.1, 1778, 1000, 920],
    ],
    weights: [0.036, 0.192, 0.326, 0.326, 0.12],
    // Table VI at λ = 0.5, as printed (trailing zeros dropped); 1.3 and 2.52 are the paper's rounding of 1.2987 and 2.5191.
    published: [{ label: 'cocoso.scores', values: [2.041, 2.788, 2.882, 2.416, 1.3, 1.443, 2.52], decimals: 3 }],
  },
  {
    id: 'pamucar-cirovic-2015-forklifts',
    name: { en: 'Forklifts (Pamučar and Ćirović 2015)', tr: 'Forkliftler (Pamučar ve Ćirović 2015)' },
    summary: {
      en: 'Seven forklifts for a logistics centre on ten criteria, three of them costs, with DEMATEL weights: the example of the MABAC paper. Service network and spare parts are rated from very poor (1) to very good (5).',
      tr: 'Bir lojistik merkezi için yedi forklift, üçü maliyet olan on kriter, DEMATEL ağırlıklarıyla: MABAC makalesinin örneği. Servis ağı ve yedek parça çok kötüden (1) çok iyiye (5) puanlanır.',
    },
    referenceFor: ['mabac'],
    citation: {
      authors: 'Pamučar, D.; Ćirović, G.',
      year: 2015,
      title: 'The selection of transport and handling resources in logistics centers using Multi-Attributive Border Approximation area Comparison (MABAC)',
      venue: 'Expert Systems with Applications 42(6), 3016-3028',
      doi: '10.1016/j.eswa.2014.11.057',
      tables: { en: 'Tables 5 and 7 (input and weights), Table 12 (output)', tr: 'Tablo 5 ve 7 (girdi ve ağırlıklar), Tablo 12 (çıktı)' },
    },
    alternatives: ['Forklift 1', 'Forklift 2', 'Forklift 3', 'Forklift 4', 'Forklift 5', 'Forklift 6', 'Forklift 7'],
    criteria: [
      { name: { en: 'Purchase price', tr: 'Satın alma fiyatı' }, type: 'cost' },
      { name: { en: 'Warranty', tr: 'Garanti' }, type: 'benefit' },
      { name: { en: 'Service network', tr: 'Servis ağı' }, type: 'benefit' },
      { name: { en: 'Spare parts', tr: 'Yedek parça' }, type: 'benefit' },
      { name: { en: 'Maintenance cost', tr: 'Bakım maliyeti' }, type: 'cost' },
      { name: { en: 'Fuel use', tr: 'Yakıt tüketimi' }, type: 'cost' },
      { name: { en: 'Bearing capacity', tr: 'Taşıma kapasitesi' }, type: 'benefit' },
      { name: { en: 'Lifting capacity', tr: 'Kaldırma kapasitesi' }, type: 'benefit' },
      { name: { en: 'Movement speed', tr: 'Hareket hızı' }, type: 'benefit' },
      { name: { en: 'Lifting speed', tr: 'Kaldırma hızı' }, type: 'benefit' },
    ],
    // Service network and spare parts: the paper's terms VG, G, F, P, VP coded 5 to 1 (Table 6, as mabacR and pymcdm do).
    matrix: [
      [22600, 3800, 2, 5, 1.06, 3.0, 3.5, 2.8, 24.5, 6.5],
      [19500, 4200, 3, 2, 0.95, 3.0, 3.4, 2.2, 24, 7.0],
      [21700, 4000, 1, 3, 1.25, 3.2, 3.3, 2.5, 24.5, 7.3],
      [20600, 3800, 2, 5, 1.05, 3.25, 3.2, 2.0, 22.5, 11.0],
      [22500, 3800, 4, 3, 1.35, 3.2, 3.7, 2.1, 23, 6.3],
      [23250, 4210, 3, 5, 1.45, 3.6, 3.5, 2.8, 23.5, 7.0],
      [20300, 3850, 2, 5, 0.9, 3.25, 3.0, 2.6, 21.5, 6.0],
    ],
    weights: [0.146, 0.144, 0.119, 0.121, 0.115, 0.101, 0.088, 0.068, 0.05, 0.048],
    // Table 12 as printed.
    published: [{ label: 'mabac.scores', values: [0.0826, 0.2183, -0.0488, 0.0246, -0.0704, 0.0465, 0.0464], decimals: 4 }],
  },
  {
    id: 'brauers-zavadskas-2010-projects',
    name: { en: 'Transition projects (Brauers and Zavadskas 2010)', tr: 'Geçiş ekonomisi projeleri (Brauers ve Zavadskas 2010)' },
    summary: {
      en: 'Three transition-economy projects on nine objectives, Payback period and Risk the two costs, with equal weights: the worked MOORA example of Brauers and Zavadskas (2010, Appendix C).',
      tr: 'Geçiş ekonomisi için üç proje, Geri ödeme süresi ve Riskin iki maliyet olduğu dokuz amaç, eşit ağırlıkla: Brauers ve Zavadskas (2010, Ek C) çözümlü MOORA örneği.',
    },
    referenceFor: ['moora'],
    citation: {
      authors: 'Brauers, W.K.M.; Zavadskas, E.K.',
      year: 2010,
      title: 'Project management by MULTIMOORA as an instrument for transition economies',
      venue: 'Technological and Economic Development of Economy 16(1), 5-24',
      doi: '10.3846/tede.2010.01',
      tables: { en: 'Appendix C, Table 2 (2a input, 2b-2c output)', tr: 'Ek C, Tablo 2 (2a girdi, 2b-2c çıktı)' },
    },
    alternatives: ['Project A', 'Project B', 'Project C'],
    localAlternatives: { tr: ['Proje A', 'Proje B', 'Proje C'] },
    criteria: [
      { name: { en: 'NPV', tr: 'Net bugünkü değer (NPV)' }, type: 'benefit' },
      { name: { en: 'IRR (%)', tr: 'İç verim oranı (%)' }, type: 'benefit' },
      { name: { en: 'Payback period (yr)', tr: 'Geri ödeme süresi (yıl)' }, type: 'cost' },
      { name: { en: 'Government income', tr: 'Kamu geliri' }, type: 'benefit' },
      { name: { en: 'Employment', tr: 'İstihdam' }, type: 'benefit' },
      { name: { en: 'Value added', tr: 'Katma değer' }, type: 'benefit' },
      { name: { en: 'Risk', tr: 'Risk' }, type: 'cost' },
      { name: { en: 'Balance of payments', tr: 'Ödemeler dengesi' }, type: 'benefit' },
      { name: { en: 'Investment', tr: 'Yatırım' }, type: 'benefit' },
    ],
    matrix: [
      [1, 14, 9, 200, 600, 20, 20, 3.5, 2.5],
      [1.6, 16, 7, 150, 800, 13.5, 25, 4, 1.5],
      [2, 17, 5, 80, 1200, 10, 30, 3.8, 1.25],
    ],
    equalWeights: true,
    // Appendix C Table 2c prints unweighted y* = [2.93480, 2.723, 2.698]; under equal weights w_j = 1/9, y = y* / 9.
    published: [
      { label: 'moora.score', values: [0.3261, 0.3026, 0.2998], decimals: 4 },
      { label: 'moora.unweighted', values: [2.9348, 2.723, 2.698], decimals: 4 },
    ],
  },
  {
    id: 'bakir-atalik-2018-airlines',
    name: { en: 'Airlines (Bakır and Atalık 2018)', tr: 'Havayolları (Bakır ve Atalık 2018)' },
    buttonLabel: { en: 'Airlines', tr: 'Havayolları' },
    summary: {
      en: 'Eleven airlines rated on seven Skytrax Business Class service-quality criteria, weighted by Entropy and ranked with ARAS against the column-best benchmark A0.',
      tr: 'Yedi Skytrax Business Class hizmet kalitesi kriterinde değerlendirilen on bir havayolu; Entropi ile ağırlıklandırılıp sütun en iyisi kıyas satırı A0 üzerinden ARAS ile sıralanır.',
    },
    referenceFor: ['aras'],
    citation: {
      authors: 'Bakır, M.; Atalık, Ö.',
      year: 2018,
      title: 'Entropi ve Aras Yöntemleriyle Havayolu İşletmelerinde Hizmet Kalitesinin Değerlendirilmesi',
      venue: 'İşletme Araştırmaları Dergisi 10(1), 617-638',
      doi: '10.20491/isarder.2018.410',
      tables: {
        en: 'Table 3 (input), Table 7 (Entropy weights), Table 11 (output)',
        tr: 'Tablo 3 (girdi), Tablo 7 (Entropi ağırlıkları), Tablo 11 (çıktı)',
      },
    },
    alternatives: [
      'Air China',
      'Air France',
      'ANA',
      'British Airways',
      'China Southern',
      'Emirates',
      'Hainan',
      'LATAM',
      'Lufthansa',
      'Qantas',
      'THY',
    ],
    criteria: [
      { name: { en: 'Airport services', tr: 'Havalimanı hizmetleri' }, type: 'benefit' },
      { name: { en: 'Lounge physical facilities', tr: 'Lounge fiziksel unsurları' }, type: 'benefit' },
      { name: { en: 'Lounge staff service', tr: 'Lounge hizmet personeli' }, type: 'benefit' },
      { name: { en: 'Cabin comfort', tr: 'Uçak içi konfor' }, type: 'benefit' },
      { name: { en: 'In-flight catering', tr: 'Uçak içi ikramlar' }, type: 'benefit' },
      { name: { en: 'In-flight entertainment', tr: 'Uçak içi eğlence' }, type: 'benefit' },
      { name: { en: 'Cabin crew service', tr: 'Kabin ekibi hizmetleri' }, type: 'benefit' },
    ],
    matrix: [
      [3.1, 2.714, 2.75, 3.5, 3.167, 2.7, 3.219],
      [3.75, 3.929, 4.0, 3.938, 3.667, 3.75, 3.563],
      [4.75, 4.125, 4.0, 4.8, 4.5, 4.625, 4.8],
      [3.5, 3.25, 3.75, 3.3, 3.0, 3.375, 4.2],
      [3.9, 4.071, 4.125, 4.0, 3.667, 3.5, 3.907],
      [3.5, 4.071, 3.75, 3.688, 3.667, 4.417, 3.625],
      [4.25, 3.571, 3.875, 4.875, 4.5, 3.875, 4.187],
      [2.8, 3.0, 3.0, 3.25, 2.667, 3.5, 3.0],
      [3.75, 4.143, 3.375, 4.0, 3.667, 3.8, 3.687],
      [3.9, 4.214, 4.0, 4.125, 4.0, 4.125, 3.969],
      [3.5, 4.429, 3.75, 3.875, 4.0, 4.1, 3.844],
    ],
    weights: [0.146829, 0.166067, 0.111597, 0.128694, 0.179882, 0.146586, 0.120345],
    published: [
      {
        label: 'aras.utilityDegree',
        values: [0.657578, 0.828118, 0.98382, 0.749814, 0.8439, 0.834926, 0.906781, 0.657482, 0.82661, 0.884063, 0.861889],
        decimals: 6,
      },
    ],
  },
  {
    id: 'badi-2018-suppliers',
    name: { en: 'Steelmaking suppliers (Badi et al. 2018)', tr: 'Çelik üretimi tedarikçileri (Badi vd. 2018)' },
    summary: {
      en: 'Six suppliers for a steelmaking company in Libya on quality, direct cost, lead time and logistics service, with expert weights. The paper reports the CODAS distances and assessment scores.',
      tr: "Libya'daki bir çelik üretim işletmesi için kalite, doğrudan maliyet, teslimat süresi ve lojistik hizmetinde altı tedarikçi, uzman ağırlıklarıyla. Makale CODAS uzaklıklarını ve değerlendirme skorlarını veriyor.",
    },
    referenceFor: ['codas'],
    citation: {
      authors: 'Badi, I.; Abdulshahed, A.M.; Shetwan, A.',
      year: 2018,
      title: 'A case study of supplier selection for a steelmaking company in Libya by using the Combinative Distance-based Assessment (CODAS) model',
      venue: 'Decision Making: Applications in Management and Engineering 1(1), 1-12',
      doi: '10.31181/dmame180101b',
      tables: { en: 'Table 1 (input and weights), Tables 3 and 4 (output)', tr: 'Tablo 1 (girdi ve ağırlıklar), Tablo 3 ve 4 (çıktı)' },
    },
    alternatives: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    criteria: [
      { name: { en: 'Quality (points)', tr: 'Kalite (puan)' }, type: 'benefit' },
      { name: { en: 'Direct cost (USD)', tr: 'Doğrudan maliyet (USD)' }, type: 'cost' },
      { name: { en: 'Lead time (days)', tr: 'Teslimat süresi (gün)' }, type: 'benefit' },
      { name: { en: 'Logistics service (points)', tr: 'Lojistik hizmet (puan)' }, type: 'benefit' },
    ],
    matrix: [
      [45, 3600, 45, 0.9],
      [25, 3800, 60, 0.8],
      [23, 3100, 35, 0.9],
      [14, 3400, 50, 0.7],
      [15, 3300, 40, 0.8],
      [28, 3000, 30, 0.6],
    ],
    weights: [0.2857, 0.3036, 0.2321, 0.1786],
    published: [
      { label: 'codas.euclidean', values: [0.2141, 0.1411, 0.1006, 0.0847, 0.0666, 0.1095], decimals: 4 },
      { label: 'codas.taxicab', values: [0.3277, 0.2256, 0.1901, 0.1254, 0.121, 0.1528], decimals: 4 },
      { label: 'codas.score', values: [1.3914, 0.3411, -0.217, -0.5381, -0.7292, -0.2481], decimals: 4 },
    ],
  },
  {
    id: 'goswami-2020-laptops',
    name: {
      en: 'Laptop selection (Goswami 2020)',
      tr: 'Dizüstü bilgisayar seçimi (Goswami 2020)',
    },
    summary: {
      en: 'Six laptop models rated on processor, hard disk, operating system, RAM, screen size, brand and color, with AHP weights. The paper reports the PROMETHEE I and II leaving, entering and net flows.',
      tr: 'İşlemci, sabit disk, işletim sistemi, RAM, ekran boyutu, marka ve renk kriterlerinde değerlendirilen altı dizüstü bilgisayar modeli, AHP ağırlıklarıyla. Makale PROMETHEE I ve II pozitif, negatif ve net akışlarını veriyor.',
    },
    referenceFor: ['promethee-ii'],
    citation: {
      authors: 'Goswami, S.S.',
      year: 2020,
      title: 'Outranking Methods: Promethee I and Promethee II',
      venue: 'Foundations of Management 12(1), 93-110',
      doi: '10.2478/fman-2020-0008',
      tables: {
        en: 'Tables 4 and 7 (weights and input), Tables 13, 15, 16 and 18 (output)',
        tr: 'Tablo 4 ve 7 (ağırlıklar ve girdi), Tablo 13, 15, 16 ve 18 (çıktı)',
      },
    },
    alternatives: ['Model 1', 'Model 2', 'Model 3', 'Model 4', 'Model 5', 'Model 6'],
    criteria: [
      { name: { en: 'Processor (1-9)', tr: 'İşlemci (1-9)' }, type: 'benefit' },
      { name: { en: 'Hard disk capacity (1-9)', tr: 'Sabit disk kapasitesi (1-9)' }, type: 'benefit' },
      { name: { en: 'Operating system (1-9)', tr: 'İşletim sistemi (1-9)' }, type: 'benefit' },
      { name: { en: 'RAM (1-9)', tr: 'RAM (1-9)' }, type: 'benefit' },
      { name: { en: 'Screen size (1-9)', tr: 'Ekran boyutu (1-9)' }, type: 'benefit' },
      { name: { en: 'Brand (1-9)', tr: 'Marka (1-9)' }, type: 'benefit' },
      { name: { en: 'Color (1-9)', tr: 'Renk (1-9)' }, type: 'benefit' },
    ],
    matrix: [
      [3, 5, 3, 5, 3, 9, 3],
      [5, 7, 5, 5, 7, 3, 3],
      [5, 9, 9, 7, 7, 7, 5],
      [7, 9, 9, 9, 9, 2, 9],
      [5, 7, 9, 7, 7, 9, 9],
      [3, 5, 5, 5, 7, 5, 3],
    ],
    weights: [0.37657, 0.09395, 0.04529, 0.21594, 0.16932, 0.07647, 0.02246],
    published: [
      { label: 'promethee-ii.positiveFlow', values: [0.04151, 0.12188, 0.2687, 0.60934, 0.26058, 0.03652], decimals: 5 },
      { label: 'promethee-ii.negativeFlow', values: [0.49889, 0.22204, 0.08527, 0.05025, 0.08933, 0.39276], decimals: 5 },
      { label: 'promethee-ii.netFlow', values: [-0.45738, -0.10015, 0.18343, 0.55909, 0.17125, -0.35624], decimals: 5 },
    ],
  },
]

export const getExample = (id: string): ExampleDataset | undefined => examples.find((x) => x.id === id)

/** The example's alternative names in `lang`: the localized ones when the example has them, else as printed. */
export const alternativeNames = (ex: ExampleDataset, lang: Lang): string[] => ex.localAlternatives?.[lang] ?? ex.alternatives

/** "Krishnan, A.R.; Kasim, M.M.; ... (2021). Title. Venue. doi:..." */
export function formatCitation(c: Citation): string {
  return `${c.authors} (${c.year}). ${c.title}. ${c.venue}. doi:${c.doi}`
}

/** "Krishnan et al. (2021)" / "Krishnan vd. (2021)"; two authors are both named. */
export function shortCitation(c: Pick<Citation, 'authors' | 'year'>, lang: Lang): string {
  const surnames = c.authors.split(';').map((a) => a.trim().split(',')[0]!.trim())
  const and = lang === 'tr' ? 've' : 'and'
  const etal = lang === 'tr' ? 'vd.' : 'et al.'
  const who =
    surnames.length === 1 ? surnames[0] : surnames.length === 2 ? `${surnames[0]} ${and} ${surnames[1]}` : `${surnames[0]} ${etal}`
  return `${who} (${c.year})`
}

export const doiUrl = (doi: string): string => `https://doi.org/${doi}`
