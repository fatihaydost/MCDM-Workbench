import type { MethodContent } from '../types'

// Source: docs/research/methods/merec.md
export const merec: MethodContent = {
  id: 'merec',
  name: { en: 'MEREC', tr: 'MEREC' },
  fullName: { en: 'Method based on the Removal Effects of Criteria', tr: 'Kriter çıkarma etkisine dayalı yöntem' },
  family: 'weighting-objective',
  status: 'available',
  year: 2021,
  origin: {
    authors: 'Keshavarz-Ghorabaee, M.; Amiri, M.; Zavadskas, E.K.; Turskis, Z.; Antucheviciene, J.',
    year: 2021,
    title: 'Determination of Objective Weights Using a New Method Based on the Removal Effects of Criteria (MEREC)',
    venue: 'Symmetry 13(4), 525',
    doi: '10.3390/sym13040525',
  },
  steps: [
    {
      title: { en: 'Normalize so that smaller is better', tr: 'Küçüğün iyi sayıldığı normalizasyon' },
      tex: String.raw`n_{ij} = \begin{cases} \dfrac{\min_k x_{kj}}{x_{ij}} & j \in J^{+} \\[2ex] \dfrac{x_{ij}}{\max_k x_{kj}} & j \in J^{-} \end{cases} \qquad 0 < n_{ij} \le 1`,
      note: {
        en: 'The best value maps to the smallest n; this is the reverse of the WASPAS normalization.',
        tr: 'En iyi değer en küçük n değerine gider; WASPAS normalizasyonunun tersidir.',
      },
    },
    {
      title: { en: 'Overall performance', tr: 'Genel performans' },
      tex: String.raw`S_i = \ln\!\left(1 + \frac{1}{n}\sum_{j=1}^{n} \left|\ln n_{ij}\right|\right)`,
    },
    {
      title: { en: 'Performance without criterion j', tr: 'j kriteri olmadan performans' },
      tex: String.raw`S'_{ij} = \ln\!\left(1 + \frac{1}{n}\sum_{k \ne j} \left|\ln n_{ik}\right|\right)`,
      note: {
        en: 'The denominator stays n, as in Eq. (4) of the paper.',
        tr: "Makaledeki Denklem (4)'te olduğu gibi payda n kalır.",
      },
    },
    {
      title: { en: 'Removal effect', tr: 'Çıkarma etkisi' },
      tex: String.raw`E_j = \sum_{i=1}^{m} \left|S'_{ij} - S_i\right|`,
      note: {
        en: "S' is never above S, so E is 0 exactly when the column is constant.",
        tr: "S' hiçbir zaman S'den büyük değildir; E yalnız sütun sabitse 0 olur.",
      },
    },
    {
      title: { en: 'Weights', tr: 'Ağırlıklar' },
      tex: String.raw`w_j = \frac{E_j}{\sum_{k=1}^{n} E_k}`,
    },
  ],
  combinedWith: [
    {
      methodId: 'cocoso',
      text: {
        en: 'MEREC only weighs; published studies rank with CoCoSo, EDAS (Bektaş 2022), MARCOS, WASPAS, CODAS, MABAC (Ecer and Ayçın 2022), WISP (Ulutaş et al. 2022) and COBRA (Popović et al. 2022).',
        tr: 'MEREC yalnız ağırlık üretir; yayımlanmış çalışmalar sıralamayı CoCoSo, EDAS (Bektaş 2022), MARCOS, WASPAS, CODAS, MABAC (Ecer ve Ayçın 2022), WISP (Ulutaş vd. 2022) ve COBRA (Popović vd. 2022) ile yapar.',
      },
    },
    {
      methodId: 'lopcow',
      text: {
        en: 'MEREC next to Entropy, LOPCOW, CRITIC and equal weights, then MARA, RAM and PIV for material selection: Dua et al. (2024); their Case 2 and Case 3 MEREC weights match ours to 4 decimals.',
        tr: 'Malzeme seçiminde MEREC, Entropi, LOPCOW, CRITIC ve eşit ağırlıkla yan yana, ardından MARA, RAM ve PIV: Dua vd. (2024); 2. ve 3. vakadaki MEREC ağırlıkları bizimkiyle 4 basamakta örtüşüyor.',
      },
    },
    {
      methodId: 'critic',
      text: {
        en: 'The origin paper compares MEREC with CRITIC, Entropy and SD (section 4.2, correlations 0.85 to 0.98).',
        tr: "Özgün makale MEREC'i CRITIC, Entropi ve SD ile karşılaştırır (4.2 bölümü, korelasyonlar 0,85 ile 0,98 arası).",
      },
    },
  ],
  reference: {
    source: 'Keshavarz-Ghorabaee, M.; Amiri, M.; Zavadskas, E.K.; Turskis, Z.; Antucheviciene, J. (2021). Determination of Objective Weights Using a New Method Based on the Removal Effects of Criteria (MEREC). Symmetry 13(4), 525',
    doi: '10.3390/sym13040525',
    match: 'match',
    note: {
      en: "Illustrative example (Section 4.1, Tables 2-4, 5 x 4): our weights match the printed 4 decimals (largest difference 3.9e-5), and N, S, all 20 values of S' and E match the printed 3 and 2 decimals. The printed E are rounded, so the weights do not follow from them exactly. The comparative example (Section 4.2, Tables 5-6, 10 x 7) matches to 3 decimals, and Dua et al. (2024), Cases 2 and 3, to 4.",
      tr: "Açıklayıcı örnek (Bölüm 4.1, Tablo 2-4, 5 x 4): ağırlıklarımız basılı 4 basamakla örtüşüyor (en büyük fark 3,9e-5); N, S, S' değerlerinin 20'si ve E de basılı 3 ve 2 basamakla örtüşüyor. Basılı E değerleri yuvarlanmış olduğundan ağırlıklar onlardan birebir çıkmaz. Karşılaştırmalı örnek (Bölüm 4.2, Tablo 5-6, 10 x 7) 3 basamakta, Dua vd. (2024) 2. ve 3. vaka 4 basamakta örtüşüyor.",
    },
  },
  sources: [
    { label: 'Keshavarz-Ghorabaee, Amiri, Zavadskas, Turskis & Antucheviciene (2021), Symmetry 13(4), 525', doi: '10.3390/sym13040525' },
    { label: 'Dua, Duc, Bao & Trung (2024), EUREKA: Physics and Engineering (2), 131-148', doi: '10.21303/2461-4262.2024.003171' },
    { label: 'Ulutaş, Stanujkić, Karabašević, Popović & Novaković (2022), Strategic Management 27(4), 23-29', doi: '10.5937/straman2200013u' },
    { label: 'Popović, Pucar & Smarandache (2022), Journal of Process Management and New Technologies 10(3-4), 66-74', doi: '10.5937/jouproman2203066p' },
    { label: 'Bektaş (2022), BDDK Bankacılık ve Finansal Piyasalar Dergisi', doi: '10.46520/bddkdergisi.1178359' },
    { label: 'Ecer & Ayçın (2022), Informatica', doi: '10.15388/22-infor494' },
  ],
  en: {
    summary:
      "MEREC removes each criterion in turn and measures how much the alternatives' overall scores change; criteria whose removal changes the scores most get the largest weights. It needs every value to be above zero.",
    whenToUse: [
      'Weights from the data alone, every value a positive amount.',
      'A comparison next to CRITIC, Entropy and SD.',
    ],
    whenNot: [
      'Zeros or negatives: they are blocked, a shift would change weights.',
      'Interval scales such as 1-9 ratings or temperatures.',
      'One near-zero value: that criterion takes most of the weight.',
    ],
    inputs: [
      'Decision matrix, every value above 0.',
      'Criterion type per column: benefit or cost.',
      'No parameters.',
    ],
    pitfalls: [
      "A wide max/min ratio takes the weight: 5 against 450 gives 0.575 in the paper's example.",
      'A constant column gets weight 0; if every column is constant, the weights fall back to 1/n.',
      'Adding or removing an alternative moves the column minimum and maximum, so the weights change too.',
    ],
  },
  tr: {
    summary:
      'MEREC her kriteri sırayla çıkarır ve alternatiflerin genel puanlarının ne kadar değiştiğini ölçer; çıkarıldığında puanları en çok değiştiren kriter en büyük ağırlığı alır. Her değerin sıfırdan büyük olmasını ister.',
    whenToUse: [
      'Ağırlıklar yalnız veriden gelsin, her değer pozitif bir miktar.',
      'CRITIC, Entropi ve SD yanında bir karşılaştırma.',
    ],
    whenNot: [
      'Sıfır ya da negatif: engellenir, kaydırma ağırlıkları değiştirirdi.',
      '1-9 puanları ya da sıcaklık gibi aralık ölçekleri.',
      'Sıfıra yakın tek değer: ağırlığın çoğunu o kriter alır.',
    ],
    inputs: [
      "Her değeri 0'dan büyük karar matrisi.",
      'Her sütun için kriter türü: fayda ya da maliyet.',
      'Parametre yok.',
    ],
    pitfalls: [
      "Geniş bir maks/min oranı ağırlığı alır: makaledeki örnekte 450'ye karşı 5, 0,575 verir.",
      'Sabit bir sütunun ağırlığı 0 olur; bütün sütunlar sabitse ağırlıklar 1/n olur.',
      'Alternatif eklemek ya da çıkarmak sütunun en küçük ve en büyük değerini kaydırır, ağırlıklar da değişir.',
    ],
  },
}
