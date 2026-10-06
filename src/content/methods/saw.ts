import type { MethodContent } from '../types'

// Source: docs/research/methods/saw.md (re-verified 2026-10-06)
export const saw: MethodContent = {
  id: 'saw',
  name: { en: 'SAW', tr: 'SAW' },
  fullName: { en: 'Simple Additive Weighting (Weighted Sum Model)', tr: 'Basit toplamsal ağırlıklandırma (ağırlıklı toplam modeli)' },
  family: 'ranking-utility',
  status: 'available',
  year: 1954,
  origin: {
    authors: 'Churchman, C.W.; Ackoff, R.L.',
    year: 1954,
    title: 'An Approximate Measure of Value',
    venue: 'Journal of the Operations Research Society of America 2(2), 172-187',
    doi: '10.1287/opre.2.2.172',
    note: {
      en: 'A classical method with no single origin paper: first use is credited to Churchman & Ackoff (1954), the textbook statement is Hwang & Yoon (1981), and the formulas and the example here follow Podvezko (2011).',
      tr: 'Tek bir özgün makalesi olmayan klasik bir yöntem: ilk kullanımı Churchman ve Ackoff (1954) kaynağına bağlanır, ders kitabı anlatımı Hwang ve Yoon (1981), buradaki formüller ve örnek Podvezko (2011) anlatımını izler.',
    },
  },
  steps: [
    {
      title: { en: 'Linear max normalization', tr: 'Doğrusal maks normalizasyonu' },
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij}}{\max_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\min_i x_{ij}}{x_{ij}} & j \in J^{-} \end{cases}, \qquad x_{ij} > 0`,
      note: {
        en: 'Default; the sum option uses x / Σx, and 1 / x in place of x for a cost criterion.',
        tr: 'Varsayılan; toplam seçeneği x / Σx kullanır, maliyet kriterinde x yerine 1 / x alınır.',
      },
    },
    {
      title: { en: 'Contributions', tr: 'Katkılar' },
      tex: String.raw`v_{ij} = w_j\, r_{ij}`,
      note: { en: 'Each criterion adds its weight times its normalized value.', tr: 'Her kriter ağırlığı ile normalize değerinin çarpımı kadar ekler.' },
    },
    {
      title: { en: 'Weighted sum', tr: 'Ağırlıklı toplam' },
      tex: String.raw`S_i = \sum_{j=1}^{n} w_j\, r_{ij}`,
      note: { en: 'Rank by decreasing S; equal scores share a rank.', tr: 'S değerine göre büyükten küçüğe sıralanır; eşit skorlar aynı sırayı paylaşır.' },
    },
  ],
  combinedWith: [
    {
      methodId: 'entropy',
      text: {
        en: 'SAW only ranks; published studies take the weights from experts, Entropy or CRITIC (Podvezko 2011; Vujičić et al. 2017).',
        tr: 'SAW yalnız sıralar; yayımlanmış çalışmalar ağırlıkları uzmanlardan, Entropi ya da CRITIC yönteminden alır (Podvezko 2011; Vujičić vd. 2017).',
      },
    },
    {
      methodId: 'waspas',
      text: {
        en: 'SAW is WASPAS with lambda = 1, and COPRAS with only benefit criteria is SAW with sum normalization.',
        tr: "SAW, lambda = 1 olan WASPAS'tır; yalnız fayda kriterli COPRAS da toplam normalizasyonlu SAW'dır.",
      },
    },
    {
      methodId: 'edas',
      text: {
        en: 'The usual yardstick when a new ranking method is tested, as in the EDAS paper (2015).',
        tr: 'Yeni bir sıralama yöntemi denenirken çoğu zaman karşılaştırma ölçütüdür; EDAS makalesinde (2015) olduğu gibi.',
      },
    },
    {
      methodId: 'moora',
      text: {
        en: 'Run side by side with MOORA under six normalizations in an air-conditioner selection (Vujičić et al. 2017).',
        tr: 'Bir klima seçiminde altı normalizasyonla MOORA ile yan yana çalıştırılır (Vujičić vd. 2017).',
      },
    },
  ],
  reference: {
    source: 'Podvezko, V. (2011). The Comparative Analysis of MCDA Methods SAW and COPRAS. Inžinerinė ekonomika - Engineering Economics 22(2), 134-146',
    doi: '10.5755/j01.ee.22.2.310',
    match: 'partial',
    note: {
      en: "Tables 1-3 and 5-6. Four countries, five criteria, weights from the paper. Sum normalization matches Table 5 and the scores of Table 6 to 3 decimals (largest difference 4.1e-4). Linear max matches Table 3 for three countries: Table 2 prints Lithuania's salary ratio as 0.599 instead of 306/501 = 0.611, so the paper has S(Lithuania) = 0.872 and we have 0.8744, with the same ranking; with the misprint our code gives Table 3. Ranks also match Keshavarz Ghorabaee et al. (2015) in 7 of 7 weight sets and Vujičić et al. (2017) for both weightings.",
      tr: "Tablo 1-3 ve 5-6. Dört ülke, beş kriter, ağırlıklar makaleden. Toplam normalizasyonu Tablo 5 ve Tablo 6 skorlarıyla 3 basamakta örtüşüyor (en büyük fark 4,1e-4). Doğrusal maks, Tablo 3 ile üç ülkede örtüşüyor: Tablo 2, Litvanya'nın maaş oranını 306/501 = 0,611 yerine 0,599 basmış, bu yüzden makalede S(Litvanya) = 0,872, bizde 0,8744; sıralama aynı, baskı hatasıyla kodumuz Tablo 3'ü veriyor. Sıralamalar Keshavarz Ghorabaee vd. (2015) ile 7 ağırlık setinin 7'sinde, Vujičić vd. (2017) ile iki ağırlıklandırmada da aynı.",
    },
  },
  sources: [
    { label: 'Churchman & Ackoff (1954), Journal of the Operations Research Society of America 2(2), 172-187', doi: '10.1287/opre.2.2.172' },
    { label: 'Hwang & Yoon (1981), Multiple Attribute Decision Making, Springer', doi: '10.1007/978-3-642-48318-9' },
    { label: 'Podvezko (2011), Engineering Economics 22(2), 134-146', doi: '10.5755/j01.ee.22.2.310' },
    { label: 'Keshavarz Ghorabaee, Zavadskas, Olfat & Turskis (2015), Informatica 26(3), 435-451', doi: '10.15388/Informatica.2015.57' },
    { label: 'Zavadskas, Turskis, Antucheviciene & Zakarevicius (2012), Elektronika ir Elektrotechnika 122(6), 3-6', doi: '10.5755/j01.eee.122.6.1810' },
    { label: 'Vujičić, Papić & Blagojević (2017), Tehnika 72(3), 422-429', doi: '10.5937/tehnika1703422V' },
  ],
  en: {
    summary:
      'SAW rescales every criterion so that the best value gets 1, multiplies each value by the criterion weight and adds the results. Every point of the final score can be traced back to one criterion.',
    whenToUse: [
      'All values are positive measurements: prices, rates, counts.',
      'You want a score anyone can recompute by hand.',
      'A transparent baseline next to TOPSIS, VIKOR or EDAS.',
    ],
    whenNot: [
      'A very poor value must not be offset: SAW compensates fully.',
      'Data with zeros or negatives, or interval scales such as °C.',
    ],
    inputs: [
      'Decision matrix with at least 2 alternatives and every value above 0.',
      'Criterion type per column, weights summing to 1.',
      'Option: normalization, linear x / max (the default) or sum.',
    ],
    pitfalls: [
      'Zero or negative values are blocked, not shifted: a shift changes the ratios and so the result.',
      'The normalization can swap close alternatives: on the EDAS 2015 data, sum normalization ranks differently from linear max in 3 of 7 weight sets.',
      'Rank reversal: adding or removing an alternative changes the column max, min and sum.',
    ],
  },
  tr: {
    summary:
      'SAW her kriteri en iyi değer 1 olacak şekilde ölçekler, her değeri kriter ağırlığıyla çarpar ve sonuçları toplar. Nihai skordaki her puan bir kritere kadar izlenebilir.',
    whenToUse: [
      'Tüm değerler pozitif ölçümler: fiyat, oran, adet.',
      'Herkesin elle yeniden hesaplayabileceği bir skor istiyorsunuz.',
      'TOPSIS, VIKOR ya da EDAS yanında şeffaf bir taban.',
    ],
    whenNot: [
      'Çok kötü bir değer telafi edilmemeli: SAW tam telafi eder.',
      'Sıfır ya da negatif içeren veri, santigrat gibi aralık ölçekleri.',
    ],
    inputs: [
      "En az 2 alternatifli, her değeri 0'dan büyük karar matrisi.",
      'Her sütun için kriter türü, toplamı 1 olan ağırlıklar.',
      'Seçenek: normalizasyon, doğrusal x / maks (varsayılan) ya da toplam.',
    ],
    pitfalls: [
      'Sıfır ya da negatif değer engellenir, kaydırılmaz: kaydırma oranları, dolayısıyla sonucu değiştirir.',
      "Normalizasyon birbirine yakın alternatiflerin yerini değiştirebilir: EDAS 2015 verisinde toplam normalizasyonu, 7 ağırlık setinin 3'ünde doğrusal maks normalizasyonundan farklı sıralıyor.",
      'Sıralamanın tersine dönmesi: alternatif eklemek ya da çıkarmak sütunun maks, min ve toplamını değiştirir.',
    ],
  },
}
