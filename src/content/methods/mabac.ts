import type { MethodContent } from '../types'

// Source: docs/research/methods/mabac.md
export const mabac: MethodContent = {
  id: 'mabac',
  name: { en: 'MABAC', tr: 'MABAC' },
  fullName: {
    en: 'Multi-Attributive Border Approximation area Comparison',
    tr: 'Çok nitelikli sınır yaklaşım alanı karşılaştırması',
  },
  family: 'ranking-distance',
  status: 'available',
  year: 2015,
  origin: {
    authors: 'Pamučar, D.; Ćirović, G.',
    year: 2015,
    title: 'The selection of transport and handling resources in logistics centers using Multi-Attributive Border Approximation area Comparison (MABAC)',
    venue: 'Expert Systems with Applications 42(6), 3016-3028',
    doi: '10.1016/j.eswa.2014.11.057',
  },
  steps: [
    {
      title: { en: 'Min-max normalization', tr: 'Min-maks normalizasyonu' },
      tex: String.raw`t_{ij} = \begin{cases} \dfrac{x_{ij} - x_j^{-}}{x_j^{+} - x_j^{-}} & j \in J^{+} \\[2ex] \dfrac{x_{ij} - x_j^{+}}{x_j^{-} - x_j^{+}} & j \in J^{-} \end{cases} \qquad x_j^{+} = \max_i x_{ij},\ x_j^{-} = \min_i x_{ij}`,
      note: {
        en: 'The worst value of each column becomes 0 and the best 1, so zeros and negative values work too.',
        tr: 'Her sütunun en kötü değeri 0, en iyisi 1 olur; bu yüzden sıfır ve negatif değerler de çalışır.',
      },
    },
    {
      title: { en: 'Weighted matrix', tr: 'Ağırlıklı matris' },
      tex: String.raw`v_{ij} = w_j \left(t_{ij} + 1\right)`,
      note: {
        en: 'The +1 keeps every value positive, so the geometric mean in the next step is defined.',
        tr: '+1 tüm değerleri pozitif tutar, böylece sonraki adımdaki geometrik ortalama tanımlıdır.',
      },
    },
    {
      title: { en: 'Border approximation area', tr: 'Sınır yaklaşım alanı' },
      tex: String.raw`g_j = \left(\prod_{i=1}^{m} v_{ij}\right)^{1/m}`,
      note: {
        en: 'Computed as exp of the mean log, which stays exact where the product would underflow (hundreds of alternatives).',
        tr: 'Logaritma ortalamasının üssü olarak hesaplanır; çarpımın sıfıra düştüğü yerde (yüzlerce alternatif) de doğru kalır.',
      },
    },
    {
      title: { en: 'Distance from the border', tr: 'Sınıra uzaklık' },
      tex: String.raw`q_{ij} = v_{ij} - g_j`,
      note: { en: 'Positive: upper area; negative: lower area.', tr: 'Pozitifse üst bölge, negatifse alt bölge.' },
    },
    {
      title: { en: 'Score', tr: 'Skor' },
      tex: String.raw`S_i = \sum_{j=1}^{n} q_{ij}`,
      note: {
        en: 'Rank by decreasing S: the min-max weighted sum minus one constant, so the border only sets the sign.',
        tr: 'S büyükten küçüğe sıralanır: min-maks ağırlıklı toplam eksi tek bir sabit; sınır yalnız işareti belirler.',
      },
    },
  ],
  combinedWith: [
    {
      text: {
        en: 'DEMATEL then MABAC: Pamučar and Ćirović (2015), the forklift example used here.',
        tr: 'DEMATEL ardından MABAC: Pamučar ve Ćirović (2015); buradaki forklift örneği budur.',
      },
    },
    {
      methodId: 'entropy',
      text: {
        en: 'Entropy then MABAC: Biswas and Das (2018), nine hybrid vehicles, a test example.',
        tr: 'Entropi ardından MABAC: Biswas ve Das (2018), dokuz hibrit araç, test örneği.',
      },
    },
    {
      methodId: 'critic',
      text: {
        en: 'CRITIC then MABAC: Çelik (2020), Turkish participation banks, a test example end to end.',
        tr: 'CRITIC ardından MABAC: Çelik (2020), Türk katılım bankaları, uçtan uca test örneği.',
      },
    },
    {
      methodId: 'saw',
      text: {
        en: 'The origin compares MABAC with SAW, COPRAS, TOPSIS, MOORA and VIKOR.',
        tr: "Özgün makale MABAC'ı SAW, COPRAS, TOPSIS, MOORA ve VIKOR ile karşılaştırır.",
      },
    },
  ],
  reference: {
    source: 'Pamučar, D.; Ćirović, G. (2015). The selection of transport and handling resources in logistics centers using Multi-Attributive Border Approximation area Comparison (MABAC). Expert Systems with Applications 42(6), 3016-3028',
    doi: '10.1016/j.eswa.2014.11.057',
    match: 'match',
    note: {
      en: 'Published example, reproduced by the tests: seven forklifts, ten criteria (three costs), DEMATEL weights (Tables 5, 7-12). G and S match the printed 4 decimals (difference below 0.0001) and all seven ranks match. Also tested: Biswas and Das (2018, nine hybrid vehicles, all 9 printed digits) and Çelik (2020, six Turkish participation banks, CRITIC weights computed here), all ranks.',
      tr: 'Yayımlanmış örnek, testlerde yeniden üretiliyor: yedi forklift, on kriter (üçü maliyet), DEMATEL ağırlıkları (Tablo 5, 7-12). G ve S basılı 4 basamakta aynı (fark 0,0001\'in altında), yedi sıranın tamamı da aynı. Ayrıca sınanan: Biswas ve Das (2018, dokuz hibrit araç, basılı 9 basamağın tamamı) ve Çelik (2020, altı Türk katılım bankası, CRITIC ağırlıkları burada hesaplanır), tüm sıralar.',
    },
  },
  sources: [
    { label: 'Pamučar & Ćirović (2015), Expert Systems with Applications 42(6), 3016-3028', doi: '10.1016/j.eswa.2014.11.057' },
    { label: 'Biswas & Das (2018), Management Science Letters 8(2), 121-130', doi: '10.5267/j.msl.2017.11.004' },
    { label: 'Çelik (2020), CRITIC-MABAC, İslam Ekonomisi ve Finansı Dergisi 6(2), 311-334', url: 'https://dergipark.org.tr/tr/download/article-file/1194510' },
    { label: 'pyDecision 5.1.8, mabac_method (ignores the weights; not a reference)', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'MABAC draws a border for every criterion, the geometric mean of all alternatives, and adds up how far each alternative lies above or below it. A positive score is above the border overall.',
    whenToUse: [
      'Your data mix units or contain zeros or negative values.',
      'You want a signed reading: above or below the border.',
      'Results should compare with DEMATEL, Entropy or CRITIC then MABAC studies.',
    ],
    whenNot: [
      'A second opinion to a min-max weighted sum: same order.',
      'A score comparable across problems: the border moves.',
    ],
    inputs: [
      'Decision matrix; zeros and negative values are allowed.',
      'Criterion type per column, weights summing to 1.',
      'No parameters.',
    ],
    pitfalls: [
      'Adding or removing an alternative moves the border, so signs and the order of the others can change.',
      'The border only sets the sign of S: the order is the min-max weighted sum\'s.',
      'A constant column or a weight of 0 adds nothing (q = 0).',
    ],
  },
  tr: {
    summary:
      'MABAC her kriter için bir sınır çizer (tüm alternatiflerin geometrik ortalaması) ve her alternatifin bu sınırın ne kadar üstünde ya da altında kaldığını toplar. Pozitif skor genel olarak sınırın üstü demektir.',
    whenToUse: [
      'Verileriniz farklı birimlerde ya da sıfır veya negatif değer içeriyor.',
      'Sınırın üstü ya da altı olarak işaretli bir okuma istiyorsunuz.',
      'Sonuç DEMATEL, Entropi ya da CRITIC ardından MABAC çalışmalarıyla karşılaştırılmalı.',
    ],
    whenNot: [
      'Min-maks ağırlıklı toplama ikinci görüş: sıra birebir aynı.',
      'Problemler arası karşılaştırılabilir skor: sınır kayar.',
    ],
    inputs: [
      'Karar matrisi; sıfır ve negatif değerlere izin verilir.',
      'Her sütun için kriter türü, toplamı 1 olan ağırlıklar.',
      'Parametre yok.',
    ],
    pitfalls: [
      'Bir alternatif eklemek ya da çıkarmak sınırı kaydırır; işaretler ve diğerlerinin sırası değişebilir.',
      'Sınır yalnız S\'nin işaretini belirler: sıra min-maks ağırlıklı toplamın sırasıdır.',
      'Sabit sütun ya da 0 ağırlık katkı vermez (q = 0).',
    ],
  },
}
