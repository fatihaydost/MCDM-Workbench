import type { MethodContent } from '../types'

// Source: docs/research/methods/cocoso.md
export const cocoso: MethodContent = {
  id: 'cocoso',
  name: { en: 'CoCoSo', tr: 'CoCoSo' },
  fullName: { en: 'COmbined COmpromise SOlution', tr: 'Birleşik uzlaşık çözüm' },
  family: 'ranking-utility',
  status: 'research',
  year: 2019,
  origin: {
    authors: 'Yazdani, M.; Zaraté, P.; Zavadskas, E.K.; Turskis, Z.',
    year: 2019,
    title: 'A combined compromise solution (CoCoSo) method for multi-criteria decision-making problems',
    venue: 'Management Decision 57(9), 2501-2519',
    doi: '10.1108/MD-05-2017-0458',
    url: 'https://hal.archives-ouvertes.fr/hal-02879091/document',
  },
  steps: [
    {
      title: { en: 'Min-max normalization', tr: 'Min-maks normalizasyonu' },
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
    },
    {
      title: { en: 'Weighted sum and power-weighted sum', tr: 'Ağırlıklı toplam ve üs ağırlıklı toplam' },
      tex: String.raw`S_i = \sum_{j=1}^{n} w_j\, r_{ij}, \qquad P_i = \sum_{j=1}^{n} r_{ij}^{\,w_j} \quad (0^{w} = 0)`,
      note: {
        en: 'The origin uses a sum of powers for P, not a product.',
        tr: 'Özgün yöntem P için çarpım değil, kuvvetlerin toplamını kullanır.',
      },
    },
    {
      title: { en: 'Three aggregation strategies', tr: 'Üç birleştirme stratejisi' },
      tex: String.raw`k_{ia} = \frac{P_i + S_i}{\sum_{i} (P_i + S_i)}, \quad k_{ib} = \frac{S_i}{\min_i S_i} + \frac{P_i}{\min_i P_i}, \quad k_{ic} = \frac{\lambda S_i + (1-\lambda) P_i}{\lambda \max_i S_i + (1-\lambda) \max_i P_i}`,
    },
    {
      title: { en: 'Final score', tr: 'Nihai skor' },
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
        en: 'The origin takes the weights given with the data and runs a 48-scenario weight-swap sensitivity analysis (Table VII).',
        tr: 'Özgün makale veriyle birlikte verilen ağırlıkları kullanır ve 48 senaryolu bir ağırlık değiştirme duyarlılık analizi yapar (Tablo VII).',
      },
    },
    {
      methodId: 'waspas',
      text: {
        en: 'The origin compares CoCoSo with WASPAS, VIKOR, TOPSIS, CODAS, MOORA, COPRAS and EDAS by Spearman correlation.',
        tr: "Özgün makale CoCoSo'yu WASPAS, VIKOR, TOPSIS, CODAS, MOORA, COPRAS ve EDAS ile Spearman korelasyonu üzerinden karşılaştırır.",
      },
    },
    {
      methodId: 'critic',
      text: {
        en: 'Objective weights (CRITIC, Entropy, MEREC) then CoCoSo are common in later work; CRITIC and CoCoSo co-occur in 91 OpenAlex records. Turkish example: LOPCOW-CRITIC-CoCoSo, Yılmaz Özekenci (2024), BIST energy.',
        tr: "Sonraki çalışmalarda nesnel ağırlıklar (CRITIC, Entropi, MEREC) ardından CoCoSo sık görülür; CRITIC ile CoCoSo OpenAlex'te 91 kayıtta birlikte geçer. Türkçe örnek: LOPCOW-CRITIC-CoCoSo, Yılmaz Özekenci (2024), BIST enerji.",
      },
    },
  ],
  reference: {
    source: 'Yazdani, M.; Zaraté, P.; Zavadskas, E.K.; Turskis, Z. (2019). A combined compromise solution (CoCoSo) method for multi-criteria decision-making problems. Management Decision 57(9), 2501-2519',
    doi: '10.1108/MD-05-2017-0458',
    match: 'partial',
    note: {
      en: 'Published example (Tables I, III-VI); this method is not computed here yet, only recomputed during research. Seven alternatives, five criteria. S, P, ka, kb and kc match to the printed 3 decimals. The final k is off by up to 0.0013 (1.2987 vs the printed "1.3"), more than 3-decimal rounding allows; the paper rounded at some other stage. The ranking is identical and pyDecision agrees with the recomputation to 1e-15.',
      tr: 'Yayımlanmış örnek (Tablo I, III-VI); bu yöntem sitede henüz hesaplanmıyor, yalnız araştırmada yeniden hesaplandı. Yedi alternatif, beş kriter. S, P, ka, kb ve kc basılı 3 basamakta örtüşüyor. Nihai k değerinde 0,0013\'e varan fark var (basılı "1.3" yerine 1,2987); bu 3 basamaklı yuvarlamanın açıklayacağından fazla, makale başka bir aşamada yuvarlamış. Sıralama aynı; pyDecision yeniden hesaplamayla 1e-15 düzeyinde uyuşuyor.',
    },
  },
  sources: [
    { label: 'Yazdani, Zaraté, Zavadskas & Turskis (2019), Management Decision 57(9), 2501-2519', doi: '10.1108/MD-05-2017-0458' },
    { label: 'Keshavarz Ghorabaee, Zavadskas, Turskis & Antucheviciene (2016), CODAS, Example 1 (same data)', url: 'https://ideas.repec.org/a/cys/ecocyb/v50y2016i3p25-44.html' },
    { label: 'Yılmaz Özekenci (2024), LOPCOW-CRITIC-CoCoSo, BIST energy', doi: '10.29249/selcuksbmyd.1400056' },
    { label: 'pyDecision 5.1.1, cocoso_method', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'CoCoSo merges a weighted sum and a power-weighted sum per alternative, using three aggregation strategies, into one final score. Use it for one result that balances additive and multiplicative views.',
    whenToUse: [
      'Both additive and multiplicative views of performance should count.',
      'Each criterion has a clear best and worst value.',
    ],
    whenNot: [
      'You need a bounded, percentage-like score: k is neither.',
      'An alternative worst on every criterion makes k_b divide by zero.',
    ],
    inputs: [
      'Decision matrix, criterion type per column, weights summing to 1.',
      'Parameter λ between 0 and 1, default 0.5.',
    ],
    pitfalls: [
      'min S = 0 or min P = 0 breaks k_b; pyDecision silently adds 1 to all S or P, which also changes k_a and k_c.',
      'A constant column cannot be min-max normalized; it is set to 0 with a warning.',
      'Rank reversal when alternatives are added: the min-max bounds and the min and max in k_b and k_c move.',
    ],
  },
  tr: {
    summary:
      'CoCoSo her alternatifin ağırlıklı toplamını ve üs ağırlıklı toplamını üç birleştirme stratejisiyle tek bir nihai skora dönüştürür. Toplamsal ve çarpımsal bakışı dengeleyen tek bir sonuç istediğinizde kullanın.',
    whenToUse: [
      'Performansa hem toplamsal hem çarpımsal bakış önemli.',
      'Her kriterin belirgin bir en iyi ve en kötü değeri var.',
    ],
    whenNot: [
      'Sınırlı, yüzde gibi okunan bir skor gerekiyor: k ikisi de değil.',
      'Her kriterde en kötü bir alternatif varsa k_b sıfıra bölünür.',
    ],
    inputs: [
      'Karar matrisi, her sütun için kriter türü, toplamı 1 olan ağırlıklar.',
      '0 ile 1 arasında λ parametresi, varsayılan 0,5.',
    ],
    pitfalls: [
      "min S = 0 ya da min P = 0 olursa k_b bozulur; pyDecision sessizce tüm S ya da P değerlerine 1 ekler, bu da k_a ve k_c'yi değiştirir.",
      'Sabit sütun min-maks ile normalize edilemez; 0 alınır ve uyarı gösterilir.',
      'Alternatif eklenince sıralama tersine dönebilir: min-maks sınırları ve k_b, k_c içindeki min ve maks kayar.',
    ],
  },
}
