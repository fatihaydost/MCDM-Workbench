import type { MethodContent } from '../types'

// Source: docs/research/methods/bwm.md
export const bwm: MethodContent = {
  id: 'bwm',
  name: { en: 'BWM', tr: 'BWM' },
  fullName: { en: 'Best-Worst Method', tr: 'En iyi-en kötü yöntemi' },
  family: 'weighting-subjective',
  status: 'available',
  year: 2015,
  origin: {
    authors: 'Rezaei, J.',
    year: 2015,
    title: 'Best-worst multi-criteria decision-making method',
    venue: 'Omega 53, 49-57',
    doi: '10.1016/j.omega.2014.11.009',
    note: {
      en: 'The 2015 paper introduces the non-linear minimax model. The linear (LP) model with a unique solution is Rezaei (2016), Omega 64, 126-130, which this site solves in exact closed form without an LP solver via Ratandhara & Kumar (2026). The input-based consistency ratio is from Liang, Brunelli & Rezaei (2020).',
      tr: "2015 makalesi doğrusal olmayan minimaks modeli tanıtır. Tek çözümlü doğrusal (LP) model Rezaei (2016), Omega 64, 126-130'dadır ve bu sitede Ratandhara ve Kumar (2026) kapalı form analitik çözümüyle LP çözücüsüz kesin olarak çözülür. Girdiye dayalı tutarlılık oranı Liang, Brunelli ve Rezaei (2020) kaynaklıdır.",
    },
  },
  steps: [
    {
      title: { en: 'Two comparison vectors', tr: 'İki karşılaştırma vektörü' },
      tex: String.raw`a_B = (a_{B1}, \dots, a_{Bn}), \qquad a_W = (a_{1W}, \dots, a_{nW}), \qquad a_{BB} = a_{WW} = 1, \qquad a_{Bj},\, a_{jW} \in \{1, \dots, a_{BW}\}`,
      note: {
        en: 'B is the best (most important) criterion and W the worst, on a 1‑9 scale; a_BW must be the same number in both vectors.',
        tr: 'B en iyi (en önemli), W en kötü kriterdir, değerler 1‑9 ölçeğindedir; a_BW iki vektörde de aynı sayı olmalı.',
      },
    },
    {
      title: { en: 'Linear model (default)', tr: 'Doğrusal model (varsayılan)' },
      tex: String.raw`\begin{aligned} &\min\ \xi^{L} \\ &\left|w_B - a_{Bj} w_j\right| \le \xi^{L},\ \ \left|w_j - a_{jW} w_W\right| \le \xi^{L}\ \ \forall j, \qquad \sum_j w_j = 1,\ \ w_j \ge 0 \end{aligned}`,
      note: {
        en: 'Rezaei (2016): each absolute value becomes two linear inequalities, giving a linear program with a unique optimal weight vector; solved here in exact closed form via Ratandhara & Kumar (2026) with v_W* = 1 without an external LP solver, and xi close to 0 means high consistency.',
        tr: "Rezaei (2016): her mutlak değer iki doğrusal eşitsizliğe açılır ve tek optimal ağırlık vektörlü bir doğrusal program verir; burada Ratandhara ve Kumar (2026) kapalı form analitik formülüyle (v_W* = 1) harici LP çözücü olmadan kesin çözülür ve 0'a yakın xi yüksek tutarlılık demektir.",
      },
    },
    {
      title: { en: 'Non-linear model (not offered)', tr: 'Doğrusal olmayan model (sunulmuyor)' },
      tex: String.raw`\begin{aligned} &\min\ \xi \\ &\left|\frac{w_B}{w_j} - a_{Bj}\right| \le \xi,\ \ \left|\frac{w_j}{w_W} - a_{jW}\right| \le \xi\ \ \forall j, \qquad \sum_j w_j = 1,\ \ w_j \ge 0 \end{aligned}`,
      note: {
        en: 'Rezaei (2015): the original non-linear minimax model where xi* is unique but inconsistent comparisons produce weight intervals rather than a single vector; this site computes the unique Rezaei (2016) linear model instead.',
        tr: 'Rezaei (2015): en iyi xi* değerinin tek olduğu ancak tutarsız yargılarda tek bir vektör yerine ağırlık aralıkları üreten özgün doğrusal olmayan minimaks modeldir; bu site bunun yerine tek çözümlü Rezaei (2016) doğrusal modelini hesaplar.',
      },
    },
    {
      title: { en: 'Input-based consistency ratio', tr: 'Girdiye dayalı tutarlılık oranı' },
      tex: String.raw`CR^{I} = \max_j \frac{\left|a_{Bj}\, a_{jW} - a_{BW}\right|}{a_{BW}^2 - a_{BW}}`,
      note: {
        en: 'Liang, Brunelli & Rezaei (2020): no optimization needed, CR^I = 0 when a_BW = 1, and full consistency means a_Bj a_jW = a_BW for every j.',
        tr: 'Liang, Brunelli ve Rezaei (2020): optimizasyon gerekmez, a_BW = 1 ise CR^I = 0 olur; tam tutarlılık her j için a_Bj a_jW = a_BW demektir.',
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'topsis',
      text: {
        en: 'BWM then TOPSIS or VIKOR are the recurring partners: of 124 BWM publications up to January 2019, 83 integrate BWM with other methods (Mi et al. 2019). Example: You et al. (2017), BWM-TOPSIS.',
        tr: "BWM ardından TOPSIS ya da VIKOR en sık görülen ortaklardır: Ocak 2019'a kadarki 124 BWM yayınının 83'ü BWM'yi başka yöntemlerle birleştirir (Mi vd. 2019). Örnek: You vd. (2017), BWM-TOPSIS.",
      },
    },
    {
      methodId: 'vikor',
      text: {
        en: 'BWM then VIKOR, for example Gupta (2018) on air transport.',
        tr: 'BWM ardından VIKOR; örneğin Gupta (2018), hava taşımacılığı.',
      },
    },
    {
      methodId: 'cocoso',
      text: {
        en: 'BWM then CoCoSo or MABAC in recent studies.',
        tr: 'Son dönem çalışmalarda BWM ardından CoCoSo ya da MABAC.',
      },
    },
    {
      methodId: 'mabac',
      text: {
        en: 'BWM then MABAC, for example Telli & Ayçin (2021) on teacher selection.',
        tr: 'BWM ardından MABAC; örneğin Telli ve Ayçin (2021), öğretmen seçimi.',
      },
    },
    {
      methodId: 'ahp',
      text: {
        en: 'BWM and AHP are competing subjective methods; Rezaei (2015) compares them.',
        tr: 'BWM ve AHP rakip öznel yöntemlerdir; Rezaei (2015) ikisini karşılaştırır.',
      },
    },
  ],
  reference: {
    source: 'Rezaei, J. (2016). Best-worst multi-criteria decision-making method: Some properties and a linear model. Omega 64, 126-130',
    doi: '10.1016/j.omega.2015.12.001',
    match: 'match',
    note: {
      en: 'Published examples (Tables 2-4 (input), Sections 3 and 4 (output)): car purchase, five criteria, best = price, worst = style. All three examples are verified: consistent (Table 2, xi^L = 0), slightly inconsistent (Table 3, xi^L = 0.0109, largest difference 4.6e-5) and higher-inconsistency (Table 4, xi^L = 0.0615, shown on this page and in the workbench). The site computes the linear model only.',
      tr: 'Yayımlanmış örnekler (Tablo 2-4 (girdi), Bölüm 3 ve 4 (çıktı)): otomobil satın alma, beş kriter, en iyi = fiyat, en kötü = stil. Üç örnek de doğrulandı: tutarlı (Tablo 2, xi^L = 0), az tutarsız (Tablo 3, xi^L = 0,0109, en büyük fark 4,6e-5) ve yüksek tutarsızlıklı (Tablo 4, xi^L = 0,0615; bu sayfada ve çalışma alanında gösterilen örnek). Site yalnız doğrusal modeli hesaplar.',
    },
  },
  sources: [
    { label: 'Rezaei (2015), Omega 53, 49-57', doi: '10.1016/j.omega.2014.11.009' },
    { label: 'Rezaei (2016), Omega 64, 126-130', doi: '10.1016/j.omega.2015.12.001' },
    { label: 'Liang, Brunelli & Rezaei (2020), Omega 96, 102175', doi: '10.1016/j.omega.2019.102175' },
    { label: 'Ratandhara & Kumar (2026), IMA Journal of Management Mathematics, dpag027', doi: '10.1093/imaman/dpag027' },
    { label: 'Mi, Tang, Liao, Shen & Lev (2019), Omega 87, 205-225', doi: '10.1016/j.omega.2019.01.009' },
    { label: 'You et al. (2017), Sustainability 9(12), 2329', doi: '10.3390/su9122329' },
    { label: 'Gupta (2018), Journal of Air Transport Management 68, 35-47', doi: '10.1016/j.jairtraman.2017.06.001' },
    { label: 'Telli & Ayçin (2021), BWM-MABAC teacher selection, TroyAcademy 6(2), 733-750', doi: '10.31454/troyacademy.899397' },
  ],
  en: {
    summary:
      'BWM compares the most important criterion with all others and all others with the least important (1‑9). That is only 2n - 3 judgements instead of n(n-1)/2 in AHP, with a consistency check.',
    whenToUse: [
      'Subjective weights with fewer questions than AHP.',
      'Between 3 and 9 criteria.',
      'One decision maker, or a group agreed on one pair of vectors.',
    ],
    whenNot: [
      'No single best and single worst criterion can be named.',
      'You need comparisons among the middle criteria: BWM skips them.',
    ],
    inputs: [
      'Which criterion is best (B) and which is worst (W).',
      'Best-to-others vector, values 1‑9, with a_BB = 1.',
      'Others-to-worst vector, values 1‑9, with a_WW = 1. a_BW must match in both.',
      'Answers are capped at a_BW.',
    ],
    pitfalls: [
      'With more than about nine criteria the questions get hard to answer well; group the criteria and weigh each group separately.',
      'Linear xi is in weight units and much smaller than non-linear xi* (0.0109 vs 0.1459); never divide it by the CI values of Rezaei (2015).',
      'Two equally best criteria: pick one as B and enter 1 for the other.',
    ],
  },
  tr: {
    summary:
      "BWM en önemli kriteri diğer hepsiyle, diğer hepsini de en önemsiz kriterle karşılaştırır (1‑9). AHP'deki n(n-1)/2 yerine yalnız 2n - 3 yargı gerekir ve tutarlılık da raporlanır.",
    whenToUse: [
      "AHP'den daha az soruyla öznel ağırlık.",
      '3 ile 9 arası kriter.',
      'Tek karar verici ya da tek vektör çiftinde uzlaşmış bir grup.',
    ],
    whenNot: [
      'Tek bir en iyi ve tek bir en kötü kriter gösterilemiyor.',
      'Ortadaki kriterler birbiriyle karşılaştırılmalı: BWM bunları doğrudan karşılaştırmaz.',
    ],
    inputs: [
      'Hangi kriterin en iyi (B), hangisinin en kötü (W) olduğu.',
      'En iyiden diğerlerine vektörü, 1‑9 değerleri, a_BB = 1.',
      'Diğerlerinden en kötüye vektörü, 1‑9 değerleri, a_WW = 1. a_BW iki vektörde aynı olmalı.',
      'Yanıtlar a_BW ile sınırlıdır.',
    ],
    pitfalls: [
      'Dokuz civarından fazla kriterde soruları iyi yanıtlamak zorlaşır; kriterleri gruplayıp her grubu ayrı ağırlıklandırın.',
      'Doğrusal modelin xi değeri ağırlık birimindedir ve xi* değerinden çok küçüktür (0,0109 ve 0,1459); Rezaei (2015) CI değerlerine bölmeyin.',
      'İki kriter eşit derecede en iyiyse birini B seçin, diğeri için 1 girin.',
    ],
  },
}
