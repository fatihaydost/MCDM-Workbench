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
