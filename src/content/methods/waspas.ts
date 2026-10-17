import type { MethodContent } from '../types'

// Source: docs/research/methods/waspas.md
export const waspas: MethodContent = {
  id: 'waspas',
  name: { en: 'WASPAS', tr: 'WASPAS' },
  fullName: { en: 'Weighted Aggregated Sum Product ASsessment', tr: 'Ağırlıklı toplam ve çarpım birleşik değerlendirmesi' },
  family: 'ranking-utility',
  status: 'available',
  year: 2012,
  origin: {
    authors: 'Zavadskas, E.K.; Turskis, Z.; Antucheviciene, J.; Zakarevicius, A.',
    year: 2012,
    title: 'Optimization of Weighted Aggregated Sum Product Assessment',
    venue: 'Elektronika ir Elektrotechnika 122(6), 3-6',
    doi: '10.5755/j01.eee.122.6.1810',
  },
  steps: [
    {
      title: { en: 'Linear max normalization', tr: 'Doğrusal maks normalizasyonu' },
      tex: String.raw`\bar x_{ij} = \begin{cases} \dfrac{x_{ij}}{\max_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\min_i x_{ij}}{x_{ij}} & j \in J^{-} \end{cases}`,
    },
    {
      title: { en: 'Weighted sum and weighted product', tr: 'Ağırlıklı toplam ve ağırlıklı çarpım' },
      tex: String.raw`Q_i^{(1)} = \sum_{j=1}^{n} w_j\, \bar x_{ij}, \qquad Q_i^{(2)} = \prod_{j=1}^{n} \bar x_{ij}^{\,w_j}`,
    },
    {
      title: { en: 'Blend', tr: 'Karışım' },
      tex: String.raw`Q_i = \lambda\, Q_i^{(1)} + (1 - \lambda)\, Q_i^{(2)}, \qquad \lambda \in [0, 1]`,
      note: {
        en: 'Rank by decreasing Q; λ = 1 is SAW and λ = 0 the weighted product model.',
        tr: 'Q değerine göre büyükten küçüğe sıralanır; λ = 1 SAW, λ = 0 ağırlıklı çarpım modelidir.',
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'entropy',
      text: {
        en: 'The origin example takes its weights from Entropy (Zavadskas et al. 2012).',
        tr: 'Özgün örnek ağırlıklarını Entropi yönteminden alır (Zavadskas vd. 2012).',
      },
    },
    {
      methodId: 'ahp',
      text: {
        en: 'Chakraborty & Zavadskas (2014) use AHP weights in their cutting-fluid and industrial-robot examples.',
        tr: 'Chakraborty ve Zavadskas (2014), kesme sıvısı ve endüstriyel robot örneklerinde AHP ağırlıkları kullanır.',
      },
    },
    {
      methodId: 'swara',
      text: {
        en: 'SWARA then WASPAS for supplier selection in Aytaç Adalı & Tuş Işık (2017), the example used here.',
        tr: 'Aytaç Adalı ve Tuş Işık (2017) tedarikçi seçiminde SWARA ardından WASPAS kullanır; buradaki örnek budur.',
      },
    },
    {
      methodId: 'saw',
      text: {
        en: 'At λ = 1 WASPAS is SAW with linear max normalization; at λ = 0 it is the weighted product model.',
        tr: 'λ = 1 iken WASPAS doğrusal maks normalizasyonlu SAW, λ = 0 iken ağırlıklı çarpım modelidir.',
      },
    },
  ],
  reference: {
    source: 'Aytaç Adalı, E.; Tuş Işık, A. (2017). Bir Tedarikçi Seçim Problemi İçin SWARA ve WASPAS Yöntemlerine Dayanan Karar Verme Yaklaşımı. International Review of Economics and Management 5(4), 56-77',
    doi: '10.18825/iremjournal.335408',
    match: 'match',
    note: {
      en: "Published example, reproduced by the tests: five suppliers, six criteria (three of them cost), SWARA weights (Tables 4-7). The normalized matrix of Table 6 matches to 3 decimals and all 55 scores of Table 7 (λ = 0, 0.1, ..., 1) to 4 decimals; the three rank orders the paper reports over λ are the same. Two more examples are tested: Chakraborty & Zavadskas (2014), industrial robots (Tables 13-15), and the origin (Zavadskas et al. 2012, Table 2), whose Table 1 prints one value of a1 as 1.0000 where every result needs 0.1000; its Table 4 also prints a1's optimal λ as 0.32 for 0.34, and its last column header reads λ = 10 for 1.",
      tr: "Yayımlanmış örnek, testlerde yeniden üretiliyor: beş tedarikçi, altı kriter (üçü maliyet), SWARA ağırlıkları (Tablo 4-7). Tablo 6'nın normalize matrisi 3 basamağa, Tablo 7'nin 55 skorunun tamamı (λ = 0; 0,1; ...; 1) 4 basamağa kadar aynı; makalenin λ boyunca bildirdiği üç sıralama da aynı. İki örnek daha sınanıyor: Chakraborty ve Zavadskas (2014), endüstriyel robotlar (Tablo 13-15) ve özgün makale (Zavadskas vd. 2012, Tablo 2); özgün makalenin Tablo 1'i a1'in bir değerini 1,0000 basmış, bütün sonuçlar 0,1000 gerektiriyor; Tablo 4 a1'in optimal λ değerini 0,34 yerine 0,32, son sütun başlığını da 1 yerine λ = 10 basmış.",
    },
  },
  sources: [
    { label: 'Zavadskas, Turskis, Antucheviciene & Zakarevicius (2012), Elektronika ir Elektrotechnika 122(6), 3-6', doi: '10.5755/j01.eee.122.6.1810' },
    { label: 'Chakraborty & Zavadskas (2014), Applications of WASPAS method in manufacturing decision making, Informatica 25(1), 1-20', doi: '10.15388/Informatica.2014.01' },
    { label: 'Aytaç Adalı & Tuş Işık (2017), SWARA-WASPAS supplier selection, International Review of Economics and Management 5(4), 56-77', doi: '10.18825/iremjournal.335408' },
    { label: 'pyDecision 5.1.1, waspas_method (1 + min-max normalization; not the origin)', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'WASPAS scores each alternative as a weighted sum and as a weighted product, then blends the two with λ (1 = sum only, 0 = product only). The product punishes a very weak value harder.',
    whenToUse: [
      'Every value is a positive measurement or score.',
      'You want a blend of compensating and weakness-sensitive scoring.',
      'You want to see whether the order holds as λ moves.',
    ],
    whenNot: [
      'Zeros or negative values in the data (blocked, no shift).',
      'Interval data where zero is arbitrary: x / max depends on it.',
      'You need one parameter-free answer and will not show λ.',
    ],
    inputs: [
      'Decision matrix, every value above 0.',
      'Criterion type per column, weights summing to 1.',
      'Parameter λ between 0 and 1 in steps of 0.1, default 0.5.',
    ],
    pitfalls: [
      'Close alternatives swap places as λ moves; check the λ chart before trusting the order.',
      'A zero would make the product 0 (benefit) or divide 0 by 0 (cost), so values of 0 or below are blocked.',
      'Max and min come from the current alternatives, so adding or removing one can reverse ranks.',
    ],
  },
  tr: {
    summary:
      'WASPAS her alternatifi ağırlıklı toplamla ve ağırlıklı çarpımla puanlar, ikisini λ ile karıştırır (1 = yalnız toplam, 0 = yalnız çarpım). Çarpım çok zayıf bir değeri daha sert cezalandırır.',
    whenToUse: [
      'Tüm değerler pozitif bir ölçüm ya da puan.',
      'Telafi eden ile zayıflığa duyarlı puanlama arasında bir karışım istiyorsunuz.',
      'λ değiştikçe sıralamanın korunup korunmadığını görmek istiyorsunuz.',
    ],
    whenNot: [
      'Veride sıfır ya da negatif değer var (engellenir, kaydırma yok).',
      'Sıfırın keyfi olduğu aralık verisi: x / maks ona bağlı.',
      'Parametresiz tek bir cevap gerekiyor ve λ gösterilmeyecek.',
    ],
    inputs: [
      "Karar matrisi, her değer 0'dan büyük.",
      'Her sütun için kriter türü, toplamı 1 olan ağırlıklar.',
      '0 ile 1 arasında, 0,1 adımlı λ parametresi, varsayılan 0,5.',
    ],
    pitfalls: [
      'Birbirine yakın alternatifler λ değiştikçe yer değiştirir; sıralamaya güvenmeden önce λ grafiğine bakın.',
      'Sıfır, çarpımı 0 yapar (fayda) ya da 0 / 0 verir (maliyet); bu yüzden 0 ve altındaki değerler engellenir.',
      'Maks ve min mevcut alternatiflerden gelir; bir alternatif eklemek ya da çıkarmak sıralamayı tersine çevirebilir.',
    ],
  },
}
