import type { MethodContent } from '../types'

// Source: docs/research/methods/moora.md
export const moora: MethodContent = {
  id: 'moora',
  name: { en: 'MOORA', tr: 'MOORA' },
  fullName: {
    en: 'Multi-Objective Optimization on the basis of Ratio Analysis',
    tr: 'Oran analizine dayalı çok amaçlı optimizasyon',
  },
  family: 'ranking-ratio',
  status: 'available',
  year: 2006,
  origin: {
    authors: 'Brauers, W.K.M.; Zavadskas, E.K.',
    year: 2006,
    title: 'The MOORA method and its application to privatization in a transition economy',
    venue: 'Control and Cybernetics 35(2), 445-469',
    url: 'https://bibliotekanauki.pl/articles/969961.pdf',
    note: {
      en: "No DOI. The ratio system first appeared in Brauers (2004, book); the reference example is from the method authors' open-access paper Brauers & Zavadskas (2010).",
      tr: 'DOI yok. Oran sistemi ilk kez Brauers (2004, kitap) içinde yer aldı; referans örnek, yazarların açık erişimli Brauers ve Zavadskas (2010) makalesinden alındı.',
    },
  },
  steps: [
    {
      title: { en: 'Vector normalization', tr: 'Vektör normalizasyonu' },
      tex: String.raw`x^{*}_{ij} = \frac{x_{ij}}{\sqrt{\sum_{i=1}^{m} x_{ij}^2}}`,
    },
    {
      title: { en: 'Weighted normalized ratio', tr: 'Ağırlıklı normalize oran' },
      tex: String.raw`v_{ij} = w_j\, x^{*}_{ij}`,
    },
    {
      title: { en: 'Benefit and cost sums', tr: 'Fayda ve maliyet toplamları' },
      tex: String.raw`S^{+}_{i} = \sum_{j \in J^{+}} v_{ij} \qquad S^{-}_{i} = \sum_{j \in J^{-}} v_{ij}`,
    },
    {
      title: { en: 'Net assessment score', tr: 'Net değerlendirme skoru' },
      tex: String.raw`y_i = S^{+}_{i} - S^{-}_{i}`,
      note: {
        en: 'Rank by decreasing y; the unweighted origin sets w = 1.',
        tr: 'Azalan y değerine göre sıralanır; ağırlıksız özgün yöntemde w = 1 alınır.',
      },
    },
  ],
  combinedWith: [
    {
      text: {
        en: 'The origin splits an important objective into sub-objectives instead of using weights (Brauers & Zavadskas 2006, 2010).',
        tr: 'Özgün yöntem, ağırlık kullanmak yerine önemli bir amacı alt amaçlara böler (Brauers ve Zavadskas 2006, 2010).',
      },
    },
    {
      methodId: 'entropy',
      text: {
        en: 'Entropy and CRITIC weights with MOORA for air-conditioner selection in Vujičić et al. (2017).',
        tr: 'Vujičić vd. (2017) klima seçimi uygulamasında Entropi ve CRITIC ağırlıklarıyla MOORA.',
      },
    },
    {
      methodId: 'sd',
      text: {
        en: 'SD then MULTIMOORA for EDM process parameters, as reviewed in Keshavarz-Ghorabaee et al. (2021).',
        tr: 'EDM süreç parametreleri için SD ardından MULTIMOORA, Keshavarz-Ghorabaee vd. (2021) incelemesinde olduğu gibi.',
      },
    },
    {
      methodId: 'mabac',
      text: {
        en: 'Used as a comparison method in the MABAC (2015) and CoCoSo (2019) papers.',
        tr: 'MABAC (2015) ve CoCoSo (2019) makalelerinde karşılaştırma yöntemi olarak kullanılır.',
      },
    },
  ],
  reference: {
    source: 'Brauers, W.K.M.; Zavadskas, E.K. (2010). Project management by MULTIMOORA as an instrument for transition economies. Technological and Economic Development of Economy 16(1), 5-24',
    doi: '10.3846/tede.2010.01',
    match: 'match',
    note: {
      en: 'Published example (Appendix C, Table 2; brauers-zavadskas-2010-projects) reproduced by the tests: three projects and nine objectives match to 0.00015 (the paper prints B and C to 3 decimals). The tests also reproduce both 2006 origin examples (Tables 1 and 5) and Vujičić et al. (2017, Tables 7a-7b) with Entropy and CRITIC weights.',
      tr: 'Yayımlanmış örnek (Ek C, Tablo 2; brauers-zavadskas-2010-projects) testlerle yeniden üretiliyor: üç proje ve dokuz amaç 0,00015 hassasiyetle örtüşüyor (makale B ve C için 3 basamak basıyor). Testler ayrıca 2006 özgün makalesindeki iki örneği (Tablo 1 ve 5) ve Vujičić vd. (2017, Tablo 7a-7b) Entropi ve CRITIC ağırlıklı örneklerini doğruluyor.',
    },
  },
  sources: [
    { label: 'Brauers & Zavadskas (2010), Technological and Economic Development of Economy 16(1), 5-24', doi: '10.3846/tede.2010.01' },
    { label: 'Brauers & Zavadskas (2009), Technological and Economic Development of Economy 15(2), 352-375', doi: '10.3846/1392-8619.2009.15.352-375' },
    { label: 'Vujičić, Papić & Blagojević (2017), Tehnika 72(3), 422-429', doi: '10.5937/tehnika1703422V' },
    { label: 'Hafezalkotob et al. (2019), Information Fusion 51, 145-177', doi: '10.1016/j.inffus.2018.12.002' },
    { label: 'pyDecision 5.1.1, moora_method and multimoora_method', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'MOORA divides each value by its column length, adds the weighted benefit ratios and subtracts the weighted cost ratios. It is quick, needs no reference point, and handles positive or negative values.',
    whenToUse: [
      'Many objectives, quick screening.',
      'TOPSIS normalization with an additive score.',
    ],
    whenNot: [
      'Users would be confused by a negative net score.',
      'Scales may shift: vector normalization is unit-dependent, as in TOPSIS.',
    ],
    inputs: [
      'Decision matrix, criterion type per column.',
      'Criterion weights summing to 1 (equal weights reproduce the unweighted origin ranking).',
      'No parameters.',
    ],
    pitfalls: [
      'Negative net scores are fine for ranking when cost weights exceed benefit weights.',
      'An all-zero column has norm 0; its ratios stay 0.',
      'MULTIMOORA adds a reference point and multiplicative form; this card implements the Ratio System.',
    ],
  },
  tr: {
    summary:
      'MOORA her değeri sütun uzunluğuna böler, ağırlıklı fayda oranlarını toplayıp ağırlıklı maliyet oranlarını çıkarır. Hızlıdır, referans nokta gerektirmez ve pozitif ya da negatif değerlerle çalışır.',
    whenToUse: [
      'Çok sayıda amaç, hızlı ön eleme.',
      'TOPSIS normalizasyonu, ama toplamsal bir skor istiyorsunuz.',
    ],
    whenNot: [
      'Negatif net skor kullanıcıların kafasını karıştırır.',
      "Ölçekler kayabilir: TOPSIS'teki gibi vektör normalizasyonu birime bağlıdır.",
    ],
    inputs: [
      'Karar matrisi, her sütun için kriter türü.',
      'Toplamı 1 olan kriter ağırlıkları (eşit ağırlıklar özgün ağırlıksız sıralamayı verir).',
      'Parametre yok.',
    ],
    pitfalls: [
      'Maliyet ağırlıkları baskın olduğunda negatif net skor normaldir ve sıralamayı bozmaz.',
      "Tamamı sıfır olan sütunun normu 0'dır; oranları 0 kalır.",
      'MULTIMOORA referans nokta ve çarpımsal biçim ekler; burada Oran Sistemi uygulanmıştır.',
    ],
  },
}
