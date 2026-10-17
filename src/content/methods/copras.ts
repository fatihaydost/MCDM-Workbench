import type { MethodContent } from '../types'

// Source: docs/research/methods/copras.md
export const copras: MethodContent = {
  id: 'copras',
  name: { en: 'COPRAS', tr: 'COPRAS' },
  fullName: { en: 'COmplex PRoportional ASsessment', tr: 'Karmaşık oransal değerlendirme' },
  family: 'ranking-utility',
  status: 'available',
  year: 1994,
  origin: {
    authors: 'Zavadskas, E.K.; Kaklauskas, A.; Šarka, V.',
    year: 1994,
    title: 'The new method of multicriteria complex proportional assessment of projects',
    venue: 'Technological and Economic Development of Economy 1(3), 131-139',
    note: {
      en: 'The origin the authors cite themselves; no DOI and no copy online, so it was not opened. The formulas follow their own restatement (Zavadskas, Kaklauskas, Peldschus & Turskis 2007, Eqs. 1-6), checked against Podvezko (2011).',
      tr: 'Yazarların kendilerinin atıf yaptığı kaynak; DOI yok, çevrimiçi kopyası da yok, bu yüzden açılmadı. Formüller yazarların kendi yeniden anlatımını (Zavadskas, Kaklauskas, Peldschus ve Turskis 2007, Denklem 1-6) izler, Podvezko (2011) ile karşılaştırıldı.',
    },
  },
  steps: [
    {
      title: { en: 'Weighted shares of the column total', tr: 'Sütun toplamındaki ağırlıklı paylar' },
      tex: String.raw`d_{ij} = \frac{w_j\, x_{ij}}{\sum_{k=1}^{m} x_{kj}}`,
      note: {
        en: 'Benefit and cost columns alike; nothing is inverted.',
        tr: 'Fayda ve maliyet sütunlarında aynı; hiçbir şey ters çevrilmez.',
      },
    },
    {
      title: { en: 'Benefit and cost sums', tr: 'Fayda ve maliyet toplamları' },
      tex: String.raw`S_{+i} = \sum_{j \in J^{+}} d_{ij}, \qquad S_{-i} = \sum_{j \in J^{-}} d_{ij}`,
    },
    {
      title: { en: 'Relative significance', tr: 'Göreli önem' },
      tex: String.raw`Q_i = S_{+i} + W_C\, \frac{1 / S_{-i}}{\sum_{k=1}^{m} 1 / S_{-k}}, \qquad W_C = \sum_{j \in J^{-}} w_j`,
      note: {
        en: 'With no cost criteria, or cost weights that are all 0, Q equals S+ (SAW with the sum option).',
        tr: 'Maliyet kriteri yoksa ya da maliyet ağırlıklarının hepsi 0 ise Q, S+ olur (toplam seçenekli SAW).',
      },
    },
    {
      title: { en: 'Utility degree', tr: 'Fayda derecesi' },
      tex: String.raw`N_i = 100\% \cdot \frac{Q_i}{\max_k Q_k}`,
      note: {
        en: 'Rank by decreasing Q; the best alternative has N = 100 %.',
        tr: "Q değerine göre büyükten küçüğe sıralanır; en iyi alternatifin N değeri %100'dür.",
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'entropy',
      text: {
        en: 'Entropy weights, then COPRAS: Özcan & Çelik (2021), the example used here.',
        tr: 'Entropi ağırlıkları, ardından COPRAS: Özcan ve Çelik (2021); buradaki örnek budur.',
      },
    },
    {
      methodId: 'ahp',
      text: {
        en: 'AHP weights, then COPRAS (Aytaç Adalı & Tuş Işık 2016); the 2007 restatement uses expert weights.',
        tr: 'AHP ağırlıkları, ardından COPRAS (Aytaç Adalı ve Tuş Işık 2016); 2007 anlatımı uzman ağırlıkları kullanır.',
      },
    },
    {
      methodId: 'swara',
      text: {
        en: 'SWARA and COPRAS co-occur in 154 OpenAlex records, more than SWARA and TOPSIS.',
        tr: "SWARA ile COPRAS OpenAlex'te 154 kayıtta birlikte geçer; SWARA ile TOPSIS'ten fazla.",
      },
    },
    {
      methodId: 'saw',
      text: {
        en: 'With at most one cost criterion COPRAS gives exactly SAW with the sum option; they differ from two cost criteria on.',
        tr: 'En fazla bir maliyet kriteriyle COPRAS, toplam seçenekli SAW ile birebir aynıdır; iki maliyet kriterinden itibaren ayrışırlar.',
      },
    },
  ],
  reference: {
    source: 'Özcan, S.; Çelik, A.K. (2021). A comparison of TOPSIS, grey relational analysis and COPRAS methods for machine selection problem in the food industry of Turkey. International Journal of Production Management and Engineering 9(2), 81-92',
    doi: '10.4995/ijpme.2021.14734',
    match: 'match',
    note: {
      en: "Published example, reproduced by the tests: seven cream separators, seven criteria (four of them cost), Entropy weights (Tables 1, 2, 10, 11). All 49 cells of Table 10 match to 4 decimals and the seven Q values of Table 11 to 0.0001; our Entropy reproduces the weights of Table 2. The printed rank row swaps A2 and A3 (it copies the TOPSIS column); the ranks here follow the printed Q. Also tested: Podvezko (2011, Tables 7-8), and Zavadskas et al. (2007), whose Table 2 prints Q = S+ + S- instead of its own Eq. 5, so only its S+ and S- are used.",
      tr: "Yayımlanmış örnek, testlerde yeniden üretiliyor: yedi krema separatörü, yedi kriter (dördü maliyet), Entropi ağırlıkları (Tablo 1, 2, 10, 11). Tablo 10'un 49 hücresinin tamamı 4 basamağa, Tablo 11'in yedi Q değeri 0,0001'e kadar aynı; bizim Entropi yöntemimiz Tablo 2'nin ağırlıklarını veriyor. Basılı sıra satırı A2 ile A3'ü yer değiştirmiş (TOPSIS sütununu kopyalıyor); buradaki sıralar basılı Q'yu izliyor. Ayrıca sınananlar: Podvezko (2011, Tablo 7-8) ve Zavadskas vd. (2007); bu makalenin Tablo 2'si kendi Denklem 5'i yerine Q = S+ + S- basmış, bu yüzden yalnız S+ ve S- değerleri kullanıldı.",
    },
  },
  sources: [
    { label: 'Zavadskas, Kaklauskas & Šarka (1994), Technological and Economic Development of Economy 1(3), 131-139 (not opened)' },
    { label: 'Zavadskas, Kaklauskas, Peldschus & Turskis (2007), Multi-attribute assessment of road design solutions by using the COPRAS method, The Baltic Journal of Road and Bridge Engineering 2(4), 195-203' },
    { label: 'Podvezko (2011), The Comparative Analysis of MCDA Methods SAW and COPRAS, Engineering Economics 22(2), 134-146', doi: '10.5755/j01.ee.22.2.310' },
    { label: 'Özcan & Çelik (2021), International Journal of Production Management and Engineering 9(2), 81-92', doi: '10.4995/ijpme.2021.14734' },
    { label: 'Keshavarz Ghorabaee, Zavadskas, Olfat & Turskis (2015), Informatica 26(3), 435-451', doi: '10.15388/Informatica.2015.57' },
    { label: 'pyDecision 5.1.1, copras_method (returns only N / 100)', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'COPRAS adds up each alternative\'s weighted benefit shares, adds a bonus that grows as its cost share shrinks, and shows every alternative as a percentage of the best.',
    whenToUse: [
      'Every value is a positive amount: prices, durations, counts.',
      'Benefit and cost criteria are mixed.',
      'Costs should stay in their own term, not flipped first.',
    ],
    whenNot: [
      'Zeros or negative values in the data (blocked, no shift).',
      'Cost criteria dominate and alternatives are close.',
      'Interval data where zero is arbitrary: shares depend on it.',
    ],
    inputs: [
      'Decision matrix, every value above 0.',
      'Criterion type per column, weights summing to 1.',
      'No parameters.',
    ],
    pitfalls: [
      'Unlike SAW, a constant cost column can change the ranking: it raises every cost sum by the same amount, which shifts the bonuses.',
      'A very small cost total gets a large bonus, and two small cost changes reversed ranks in Podvezko (2011).',
      'Check: the Q values add up to the sum of the weights.',
    ],
  },
  tr: {
    summary:
      'COPRAS her alternatifin ağırlıklı fayda paylarını toplar, maliyet payı küçüldükçe büyüyen bir puan ekler ve her alternatifi en iyisinin yüzdesi olarak gösterir.',
    whenToUse: [
      'Tüm değerler pozitif miktarlar: fiyat, süre, adet.',
      'Fayda ve maliyet kriterleri karışık.',
      'Maliyetler önce çevrilmeden kendi teriminde kalmalı.',
    ],
    whenNot: [
      'Veride sıfır ya da negatif değer var (engellenir, kaydırma yok).',
      'Maliyet kriterleri baskın ve alternatifler birbirine yakın.',
      'Sıfırın keyfi olduğu aralık verisi: paylar ona bağlı.',
    ],
    inputs: [
      "Karar matrisi, her değer 0'dan büyük.",
      'Her sütun için kriter türü, toplamı 1 olan ağırlıklar.',
      'Parametre yok.',
    ],
    pitfalls: [
      "SAW'dan farklı olarak sabit bir maliyet sütunu sıralamayı değiştirebilir: her maliyet toplamını aynı miktar artırır, bu da puanları kaydırır.",
      'Maliyet toplamı çok küçük olan büyük puan alır; Podvezko (2011) iki küçük maliyet değişikliğiyle sıralamayı tersine çevirdi.',
      'Kontrol: Q değerlerinin toplamı ağırlıkların toplamına eşittir.',
    ],
  },
}
