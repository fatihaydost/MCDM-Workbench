import type { MethodContent } from '../types'

// Source: docs/research/methods/lopcow.md
export const lopcow: MethodContent = {
  id: 'lopcow',
  name: { en: 'LOPCOW', tr: 'LOPCOW' },
  fullName: {
    en: 'LOgarithmic Percentage Change-driven Objective Weighting',
    tr: 'Logaritmik yüzde değişime dayalı nesnel ağırlıklandırma',
  },
  family: 'weighting-objective',
  status: 'available',
  year: 2022,
  origin: {
    authors: 'Ecer, F.; Pamucar, D.',
    year: 2022,
    title: 'A novel LOPCOW-DOBI multi-criteria sustainability performance assessment methodology: An application in developing country banking sector',
    venue: 'Omega 112, 102690',
    doi: '10.1016/j.omega.2022.102690',
    note: {
      en: 'The formulas are taken from four open-access papers that quote the origin identically, and confirmed numerically on Keleş (2023).',
      tr: 'Formüller, özgün makaleyi aynı biçimde aktaran dört açık erişimli makaleden alındı ve Keleş (2023) üzerinde sayısal olarak doğrulandı.',
    },
  },
  steps: [
    {
      title: { en: 'Min-max normalization', tr: 'Min-maks normalizasyonu' },
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - x_j^{\min}}{x_j^{\max} - x_j^{\min}} & j \in J^{+} \\[2ex] \dfrac{x_j^{\max} - x_{ij}}{x_j^{\max} - x_j^{\min}} & j \in J^{-} \end{cases}`,
    },
    {
      title: { en: 'Percentage value', tr: 'Yüzde değer' },
      tex: String.raw`PV_j = \left|\, 100 \cdot \ln\!\left(\frac{\sqrt{\frac{1}{m}\sum_{i=1}^{m} r_{ij}^2}}{\sigma_j}\right) \right|`,
      note: {
        en: 'The origin paper gives the RMS-to-standard-deviation ratio; numerical reproduction on Keleş (2023) confirms the sample standard deviation (divisor m - 1).',
        tr: 'Özgün makale karesel ortalamanın standart sapmaya oranını verir; Keleş (2023) üzerindeki sayısal yeniden üretim örneklem standart sapmasını (bölen m - 1) doğrular.',
      },
    },
    {
      title: { en: 'Weights', tr: 'Ağırlıklar' },
      tex: String.raw`w_j = \frac{PV_j}{\sum_{k=1}^{n} PV_k}`,
    },
  ],
  combinedWith: [
    {
      text: {
        en: 'LOPCOW then DOBI (Dombi-Bonferroni) in the origin paper (Ecer & Pamucar 2022).',
        tr: 'Özgün makalede LOPCOW ardından DOBI (Dombi-Bonferroni) (Ecer ve Pamucar 2022).',
      },
    },
    {
      text: {
        en: 'LOPCOW then CRADIS: Keleş (2023), G7 and Turkish power-centre cities.',
        tr: 'LOPCOW ardından CRADIS: Keleş (2023), G7 ve Türkiye güç merkezi şehirleri.',
      },
    },
    {
      methodId: 'topsis',
      text: {
        en: 'LOPCOW then TOPSIS or MARCOS as a benchmark in objective-weighting comparisons (for example Dua et al. 2024).',
        tr: 'Nesnel ağırlıklandırma karşılaştırmalarında kıyas olarak LOPCOW ardından TOPSIS ya da MARCOS (örneğin Dua vd. 2024).',
      },
    },
    {
      methodId: 'edas',
      text: {
        en: 'LOPCOW then EDAS, and LOPCOW with MEREC then CoCoSo or EDAS (insurance sector), as listed in Keleş (2023), Table 1.',
        tr: "LOPCOW ardından EDAS ve LOPCOW ile MEREC ardından CoCoSo ya da EDAS (sigorta sektörü), Keleş (2023) Tablo 1'de listelendiği gibi.",
      },
    },
    {
      methodId: 'cocoso',
      text: {
        en: 'LOPCOW-CRITIC-CoCoSo for BIST energy firms: Yılmaz Özekenci (2024).',
        tr: 'BIST enerji şirketleri için LOPCOW-CRITIC-CoCoSo: Yılmaz Özekenci (2024).',
      },
    },
  ],
  reference: {
    source: "Keleş, N. (2023). Lopcow ve Cradis yöntemleriyle G7 ülkelerinin ve Türkiye'nin yaşanabilir güç merkezi şehirlerinin değerlendirilmesi. Ömer Halisdemir Üniversitesi İİBF Dergisi 16(3), 727-747",
    doi: '10.25287/ohuiibf.1239201',
    match: 'match',
    note: {
      en: 'Published example (Tables 6, 7 and 8): fifteen cities, three criteria sets (6, 8 and 14 criteria). Weights match the printed 3 decimals in all three tables with the sample standard deviation (divisor m - 1); the population form misses by up to 0.0045. LOPCOW weights published by Dua et al. (2024) could not be reproduced with either form.',
      tr: "Yayımlanmış örnek (Tablo 6, 7 ve 8): on beş şehir, üç kriter kümesi (6, 8 ve 14 kriter). Örneklem standart sapmasıyla (payda m - 1) ağırlıklar üç tabloda da basılı 3 basamakta örtüşüyor; anakütle biçimi 0,0045'e kadar sapıyor. Dua vd. (2024) tarafından yayımlanan LOPCOW ağırlıkları iki biçimle de elde edilemedi.",
    },
  },
  sources: [
    { label: 'Ecer & Pamucar (2022), Omega 112, 102690', doi: '10.1016/j.omega.2022.102690' },
    { label: 'Keleş (2023), Ömer Halisdemir Üniversitesi İİBF Dergisi 16(3), 727-747', doi: '10.25287/ohuiibf.1239201' },
    { label: 'Dua, Duc, Bao & Trung (2024), EUREKA: Physics and Engineering', doi: '10.21303/2461-4262.2024.003171' },
    { label: 'Yılmaz Özekenci (2024), LOPCOW-CRITIC-CoCoSo, BIST energy', doi: '10.29249/selcuksbmyd.1400056' },
  ],
  en: {
    summary:
      "LOPCOW compares each criterion's typical size (root mean square) with its spread on a log scale, after min-max scaling. It gives flatter objective weights than Entropy and accepts negative data.",
    whenToUse: [
      'Data include negative values (financial ratios, growth rates).',
      'You want flatter, less extreme objective weights.',
      'Paired with newer ranking methods (EDAS, CRADIS, RAM, DOBI).',
    ],
    whenNot: [
      'Only two alternatives: every varying column gets PV = 0.',
      'A criterion is constant: its standard deviation is 0.',
      'You need a well-studied method: LOPCOW is new, described only empirically.',
    ],
    inputs: [
      'Decision matrix, any real values, at least 2 alternatives.',
      'Criterion type per column: benefit or cost.',
      'No parameters.',
    ],
    pitfalls: [
      'A constant column has undefined PV; weight 0 with a warning is a choice no source covers.',
      'A column with one best alternative and all others tied at worst has RMS equal to standard deviation, so PV = 0 (always true at m = 2).',
      'Sample and population standard deviation differ by 0.3-0.5 percentage points per weight; state which one is used.',
    ],
  },
  tr: {
    summary:
      'LOPCOW her kriteri min-maks ile ölçekledikten sonra tipik büyüklüğünü (karesel ortalama) yayılımıyla logaritmik ölçekte karşılaştırır. Entropiden daha dengeli nesnel ağırlık verir ve negatif veriyle çalışır.',
    whenToUse: [
      'Veride negatif değerler var (finansal oranlar, büyüme oranları).',
      'Daha düz, daha az uç nesnel ağırlıklar istiyorsunuz.',
      'Yeni sıralama yöntemleriyle birlikte (EDAS, CRADIS, RAM, DOBI).',
    ],
    whenNot: [
      'Yalnız iki alternatif var: her değişken sütun PV = 0 alır.',
      "Bir kriter sabit: standart sapması 0'dır.",
      'Çok çalışılmış bir yöntem gerekiyor: LOPCOW yeni, yalnız deneysel olarak anlatılmış.',
    ],
    inputs: [
      'Karar matrisi, herhangi gerçek değerler, en az 2 alternatif.',
      'Her sütun için kriter türü: fayda ya da maliyet.',
      'Parametre yok.',
    ],
    pitfalls: [
      'Sabit sütunda PV tanımsızdır; uyarıyla ağırlık 0 almak hiçbir kaynağın ele almadığı bir tercihtir.',
      'Tek bir en iyi alternatifi olup diğerleri en kötüde eşitlenen sütunda karesel ortalama standart sapmaya eşittir ve PV = 0 olur (m = 2 için her zaman).',
      'Örneklem ve anakütle standart sapması ağırlık başına 0,3-0,5 yüzde puan fark verir; hangisinin kullanıldığını belirtin.',
    ],
  },
}
