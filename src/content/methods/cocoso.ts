import type { MethodContent } from '../types'

// Source: docs/research/methods/cocoso.md
export const cocoso: MethodContent = {
  id: 'cocoso',
  name: { en: 'CoCoSo', tr: 'CoCoSo' },
  fullName: { en: 'COmbined COmpromise SOlution', tr: 'Birleşik uzlaşık çözüm' },
  family: 'ranking-utility',
  status: 'available',
  year: 2019,
  origin: {
    authors: 'Yazdani, M.; Zaraté, P.; Zavadskas, E.K.; Turskis, Z.',
    year: 2019,
    title: 'A combined compromise solution (CoCoSo) method for multi-criteria decision-making problems',
    venue: 'Management Decision 57(9), 2501-2519',
    doi: '10.1108/MD-05-2017-0458',
    url: 'https://hal.science/hal-02879091/document',
  },
  steps: [
    {
      title: { en: 'Min-max normalization', tr: 'Min-maks normalizasyonu' },
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
      note: {
        en: 'The worst value of each column becomes 0 and the best 1, so negative values work too.',
        tr: 'Her sütunun en kötü değeri 0, en iyisi 1 olur; bu yüzden negatif değerler de çalışır.',
      },
    },
    {
      title: { en: 'Weighted sum and power sum', tr: 'Ağırlıklı toplam ve üs toplamı' },
      tex: String.raw`S_i = \sum_{j=1}^{n} w_j\, r_{ij}, \qquad P_i = \sum_{j:\, w_j > 0} r_{ij}^{\,w_j}`,
      note: {
        en: 'P is a sum of powers, not a product; a criterion with weight 0 is left out of P, since 0⁰ = 1 would add 1 to every P.',
        tr: "P bir çarpım değil, kuvvetlerin toplamıdır; ağırlığı 0 olan kriter P'ye katılmaz, çünkü 0⁰ = 1 her P'ye 1 eklerdi.",
      },
    },
    {
      title: { en: 'Three readings', tr: 'Üç okuma' },
      tex: String.raw`k_{ia} = \frac{P_i + S_i}{\sum_{i} (P_i + S_i)}, \quad k_{ib} = \frac{S_i}{\min_i S_i} + \frac{P_i}{\min_i P_i}, \quad k_{ic} = \frac{\lambda S_i + (1-\lambda) P_i}{\lambda \max_i S_i + (1-\lambda) \max_i P_i}`,
      note: {
        en: 'Share of the total, size against the weakest alternative, and a λ-balanced mix against the best (λ = 0.5 by default).',
        tr: 'Toplam içindeki pay, en zayıf alternatife göre büyüklük ve en iyiye göre λ ile dengelenmiş karışım (varsayılan λ = 0,5).',
      },
    },
    {
      title: { en: 'Combined score', tr: 'Birleşik puan' },
      tex: String.raw`k_i = \left(k_{ia}\, k_{ib}\, k_{ic}\right)^{1/3} + \frac{1}{3}\left(k_{ia} + k_{ib} + k_{ic}\right)`,
      note: {
        en: 'Rank by decreasing k.',
        tr: 'k değerine göre büyükten küçüğe sıralanır.',
      },
    },
  ],
  combinedWith: [
    {
      text: {
        en: 'Expert weights, then CoCoSo: Yazdani et al. (2019), the example used here.',
        tr: 'Uzman ağırlıkları, ardından CoCoSo: Yazdani vd. (2019); buradaki örnek budur.',
      },
    },
    {
      methodId: 'critic',
      text: {
        en: 'CRITIC then CoCoSo: Akgül (2021), Turkish banks, the third test example.',
        tr: 'CRITIC ardından CoCoSo: Akgül (2021), Türk bankaları, üçüncü test örneği.',
      },
    },
    {
      methodId: 'merec',
      text: {
        en: 'MEREC then CoCoSo appears in recent Turkish studies (Özel Sönmez & Toktaş 2024).',
        tr: 'MEREC ardından CoCoSo yeni Türkçe çalışmalarda görülür (Özel Sönmez ve Toktaş 2024).',
      },
    },
    {
      methodId: 'waspas',
      text: {
        en: 'The origin compares CoCoSo with WASPAS and VIKOR (same ranking) and with TOPSIS, COPRAS and EDAS.',
        tr: "Özgün makale CoCoSo'yu WASPAS ve VIKOR (aynı sıralama) ile, TOPSIS, COPRAS ve EDAS ile karşılaştırır.",
      },
    },
  ],
  reference: {
    source: 'Yazdani, M.; Zaraté, P.; Zavadskas, E.K.; Turskis, Z. (2019). A combined compromise solution (CoCoSo) method for multi-criteria decision-making problems. Management Decision 57(9), 2501-2519',
    doi: '10.1108/MD-05-2017-0458',
    match: 'match',
    note: {
      en: 'Published example, reproduced by the tests: seven logistics providers, five criteria (one cost), expert weights (Tables I, III-VI). S, P, ka, kb and kc match the printed 3 decimals and all seven ranks match; the final k differs by up to 0.0013 (1.2987 against the printed "1.3"), because the paper rounded at another stage. Also tested: the paper\'s second example (ten green suppliers, Tables X-XI) and Akgül (2021, nine Turkish banks, CRITIC weights), all ranks.',
      tr: 'Yayımlanmış örnek, testlerde yeniden üretiliyor: yedi lojistik firması, beş kriter (biri maliyet), uzman ağırlıkları (Tablo I, III-VI). S, P, ka, kb ve kc basılı 3 basamakta aynı, yedi sıranın tamamı da aynı; nihai k\'de 0,0013\'e varan fark var (basılı "1.3" yerine 1,2987), çünkü makale başka bir aşamada yuvarlamış. Ayrıca sınanan: makalenin ikinci örneği (on yeşil tedarikçi, Tablo X-XI) ve Akgül (2021, dokuz Türk bankası, CRITIC ağırlıkları), tüm sıralar.',
    },
  },
  sources: [
    { label: 'Yazdani, Zaraté, Zavadskas & Turskis (2019), Management Decision 57(9), 2501-2519', doi: '10.1108/MD-05-2017-0458' },
    { label: 'Akgül (2021), CRITIC-CoCoSo, Ekonomi ve Finansal Araştırmalar Dergisi 3(2), 71-90', url: 'https://dergipark.org.tr/tr/download/article-file/2114456' },
    { label: 'Özel Sönmez, G., & Toktaş, P. (2024). Supplier selection using the integrated MEREC - CoCoSo methods in a medical device company. Journal of Scientific Reports-A, (056), 116-133.', doi: '10.59313/jsr-a.1420728' },
    { label: 'pyDecision 5.1.8, cocoso_method (adds 1 to all S or P when the minimum is 0; not adopted)', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'CoCoSo gives each alternative a weighted sum and a sum of weighted powers, reads them three ways (share of the total, size against the weakest, a λ-mix against the best) and combines the three.',
    whenToUse: [
      'Your data mix units or contain negative values.',
      'Results should compare with CRITIC or MEREC then CoCoSo studies.',
      'Being last on a criterion should cost more than in SAW.',
    ],
    whenNot: [
      'One alternative is worst on every criterion (all-worst-alternative error).',
      'All criteria are constant: equal scores with cocoso.no-spread warning.',
      'You need a bounded score: k is not a percentage.',
    ],
    inputs: [
      'Decision matrix; zeros and negative values are allowed (SAW, WASPAS, COPRAS and MARCOS block them).',
      'Criterion type per column, weights summing to 1; a criterion with weight 0 is left out of P.',
      'Parameter λ between 0 and 1 in steps of 0.1, default 0.5; it moves only k_c.',
    ],
    pitfalls: [
      'The worst value of a column counts 0 in P, a value just above it almost a full point: being exactly last costs much more than being nearly last.',
      'k_b (at least 2) dominates k, and P outweighs S even at λ = 0.5.',
      'Min and max come from the current alternatives, so adding or removing one can reverse ranks.',
    ],
  },
  tr: {
    summary:
      'CoCoSo her alternatife ağırlıklı toplam ve ağırlıklı üslerin toplamı olmak üzere iki puan verir; bunları üç biçimde okur (toplamdaki pay, en zayıfa göre büyüklük, en iyiye göre λ karışımı) ve birleştirir.',
    whenToUse: [
      'Verileriniz farklı birimlerde ya da negatif değer içeriyor.',
      'Sonuç CRITIC ya da MEREC ardından CoCoSo çalışmalarıyla karşılaştırılmalı.',
      "Bir kriterde sonuncu olmak SAW'dakinden daha pahalı olmalı.",
    ],
    whenNot: [
      'Bir alternatif her kriterde en kötü (all-worst-alternative hatası).',
      'Tüm kriterler sabit: eşit puan ve cocoso.no-spread uyarısı.',
      'Sınırlı bir puan gerekiyor: k yüzde değildir.',
    ],
    inputs: [
      'Karar matrisi; sıfır ve negatif değerlere izin verilir (SAW, WASPAS, COPRAS ve MARCOS bunları engeller).',
      "Her sütun için kriter türü, toplamı 1 olan ağırlıklar; ağırlığı 0 olan kriter P'ye katılmaz.",
      "0 ile 1 arasında, 0,1 adımlı λ parametresi, varsayılan 0,5; yalnız k_c'yi değiştirir.",
    ],
    pitfalls: [
      "Sütunun en kötü değeri P'de 0 sayılır, hemen üstündeki değer neredeyse tam puan alır: tam sonuncu olmak, neredeyse sonuncu olmaktan çok daha pahalıdır.",
      "k'yi k_b (en az 2) belirler; λ = 0,5'te bile P, S'den ağır basar.",
      'Min ve maks mevcut alternatiflerden gelir; bir alternatif eklemek ya da çıkarmak sıralamayı tersine çevirebilir.',
    ],
  },
}
