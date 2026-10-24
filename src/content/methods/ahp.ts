import type { MethodContent } from '../types'

// Source: docs/research/methods/ahp.md
export const ahp: MethodContent = {
  id: 'ahp',
  name: { en: 'AHP', tr: 'AHP' },
  fullName: { en: 'Analytic Hierarchy Process', tr: 'Analitik hiyerarşi süreci' },
  family: 'weighting-subjective',
  status: 'available',
  year: 1977,
  origin: {
    authors: 'Saaty, T.L.',
    year: 1977,
    title: 'A scaling method for priorities in hierarchical structures',
    venue: 'Journal of Mathematical Psychology 15(3), 234-281',
    doi: '10.1016/0022-2496(77)90033-5',
    note: {
      en: 'The book is Saaty (1980); the algorithm and the consistency rule follow Saaty (2008) and Saaty (1988), the geometric-mean variant Crawford & Williams (1985).',
      tr: 'Kitap Saaty (1980); algoritma ve tutarlılık kuralı Saaty (2008) ile Saaty (1988), geometrik ortalama varyantı Crawford ve Williams (1985) kaynaklıdır.',
    },
  },
  steps: [
    {
      title: { en: 'Pairwise comparison matrix', tr: 'İkili karşılaştırma matrisi' },
      tex: String.raw`A = \left(a_{ij}\right)_{n \times n}, \qquad a_{ii} = 1, \qquad a_{ji} = \frac{1}{a_{ij}}, \qquad a_{ij} \in \left\{\tfrac19, \dots, 1, \dots, 9\right\}`,
      note: {
        en: 'Only the upper triangle is asked; the rest follows from reciprocity.',
        tr: 'Yalnız üst üçgen sorulur; gerisi karşılıklılıktan gelir.',
      },
    },
    {
      title: { en: 'Priority vector (eigenvector)', tr: 'Öncelik vektörü (özvektör)' },
      tex: String.raw`A\,w = \lambda_{\max}\, w, \qquad \sum_{j=1}^{n} w_j = 1`,
      note: {
        en: 'w is the principal right eigenvector, found by power iteration: multiply by A and renormalize until the change is below 1e-12.',
        tr: 'w, en büyük özdeğere ait sağ özvektördür; kuvvet yinelemesiyle bulunur: A ile çarpılıp değişim 1e-12 altına inene kadar yeniden normalize edilir.',
      },
    },
    {
      title: { en: 'Geometric-mean variant (option)', tr: 'Geometrik ortalama varyantı (seçenek)' },
      tex: String.raw`g_i = \left(\prod_{j=1}^{n} a_{ij}\right)^{1/n}, \qquad w_i = \frac{g_i}{\sum_{k} g_k}, \qquad \lambda_{\max} = \frac{1}{n}\sum_{i=1}^{n} \frac{(A w)_i}{w_i}`,
      note: {
        en: 'For n = 3 it gives the same weights as the eigenvector; for n of 4 or more they differ slightly.',
        tr: 'n = 3 için özvektörle aynı ağırlıkları verir; n 4 ve üzerindeyse biraz ayrışır.',
      },
    },
    {
      title: { en: 'Consistency index and ratio', tr: 'Tutarlılık indeksi ve oranı' },
      tex: String.raw`CI = \frac{\lambda_{\max} - n}{n - 1}, \qquad CR = \frac{CI}{RI_n}, \qquad CR \le 0.10`,
      note: {
        en: 'Random index RI: n = 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49; for n = 1 or 2, CR is not applicable.',
        tr: 'Rastgele indeks RI: n = 3: 0,58, 4: 0,90, 5: 1,12, 6: 1,24, 7: 1,32, 8: 1,41, 9: 1,45, 10: 1,49; n = 1 veya 2 için CR anlamsızdır.',
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'topsis',
      text: {
        en: "AHP then TOPSIS is the most common pipeline: 10,451 title or abstract co-mentions in OpenAlex, and TOPSIS is AHP's first partner every year in the review by Çebi et al. (2022).",
        tr: "AHP ardından TOPSIS en yaygın boru hattıdır: OpenAlex'te başlık ya da özette birlikte geçtiği 10.451 çalışma; Çebi vd. (2022) incelemesinde TOPSIS her yıl AHP'nin ilk ortağı.",
      },
    },
    {
      methodId: 'vikor',
      text: {
        en: 'AHP then VIKOR (1,753 co-mentions), for example Kaya & Kahraman (2010) on energy planning in Istanbul.',
        tr: 'AHP ardından VIKOR (1.753 ortak geçiş); örneğin Kaya ve Kahraman (2010), İstanbul enerji planlaması.',
      },
    },
    {
      methodId: 'promethee-ii',
      text: {
        en: 'AHP then PROMETHEE (1,484 co-mentions), for example Dağdeviren (2008) on equipment selection.',
        tr: 'AHP ardından PROMETHEE (1.484 ortak geçiş); örneğin Dağdeviren (2008), ekipman seçimi.',
      },
    },
    {
      methodId: 'electre-i',
      text: {
        en: 'AHP then ELECTRE (817 co-mentions), for example Soner & Önüt (2006) on supplier selection.',
        tr: 'AHP ardından ELECTRE (817 ortak geçiş); örneğin Soner ve Önüt (2006), tedarikçi seçimi.',
      },
    },
    {
      methodId: 'roc',
      text: {
        en: 'Roszkowska (2013) compares AHP weights with the rank formulas ROC, RS and RR for five criteria.',
        tr: 'Roszkowska (2013), beş kriter için AHP ağırlıklarını ROC, RS ve RR sıra formülleriyle karşılaştırır.',
      },
    },
  ],
  reference: {
    source: 'Saaty, T.L. (2008). Decision making with the analytic hierarchy process. International Journal of Services Sciences 1(1), 83-98',
    doi: '10.1504/IJSSCI.2008.017590',
    match: 'match',
    note: {
      en: 'Eigenvector weights match Saaty (2008) Table 3 (job criteria, 5 x 5) and Table 4 (3 x 3) to the printed 3 decimals. The drinks matrix of Table 2 (7 x 7) is not reciprocal as printed (Tea/Wine = 2 but Wine/Tea = 1/3); with Tea/Wine = 3 every published value and CR = 0.022 are reproduced, so the 2 is a typo. Also checked against Doğuç (2022) Tables 4-7 and the incomplete-matrix LLSM example of Bozóki, Fülöp & Rónyai (2010) Example 2.',
      tr: "Özvektör ağırlıkları Saaty (2008) Tablo 3 (iş kriterleri, 5 x 5) ve Tablo 4 (3 x 3) ile basılı 3 basamakta örtüşüyor. Tablo 2'deki içecek matrisi (7 x 7) basıldığı haliyle karşılıklı değil (Çay/Şarap = 2 ama Şarap/Çay = 1/3); Çay/Şarap = 3 alınınca yayımlanan tüm değerler ve CR = 0,022 elde ediliyor, yani 2 bir baskı hatası. Ayrıca Doğuç (2022) Tablo 4-7 ve Bozóki, Fülöp ve Rónyai (2010) Örnek 2 eksik matris LLSM sonuçlarıyla doğrulandı.",
    },
  },
  sources: [
    { label: 'Saaty (1977), Journal of Mathematical Psychology 15(3), 234-281', doi: '10.1016/0022-2496(77)90033-5' },
    { label: 'Saaty (2008), International Journal of Services Sciences 1(1), 83-98', doi: '10.1504/IJSSCI.2008.017590' },
    { label: 'Crawford & Williams (1985), Journal of Mathematical Psychology 29(4), 387-405', doi: '10.1016/0022-2496(85)90002-1' },
    { label: 'Alonso & Lamata (2006), International Journal of Uncertainty, Fuzziness and Knowledge-Based Systems 14(4), 445-459', doi: '10.1142/S0218488506004114' },
    { label: 'Bozóki, Fülöp & Rónyai (2010), Mathematical and Computer Modelling 52, 318-333', doi: '10.1016/j.mcm.2010.02.047' },
    { label: 'Doğuç (2022), Ekonomi, İşletme ve Maliye Araştırmaları Dergisi 4(2), 126-145', doi: '10.38009/ekimad.1142952' },
    { label: 'Saaty (1988), How to make a decision: the analytic hierarchy process, ISAHP proceedings' },
    { label: 'Roszkowska (2013), Optimum. Studia Ekonomiczne 5(65), 14-33', doi: '10.15290/ose.2013.05.65.02' },
    { label: 'Çebi, Onar, Öztayşi & Kahraman (2022), Integration of AHP with other MCDM methods: a literature review, ISAHP 2022', url: 'https://isahp.org/uploads/36_001.pdf' },
  ],
  en: {
    summary:
      'AHP turns pairwise judgements ("how much more important is A than B?", 1‑9) into weights and a consistency ratio CR. Use it when experts can judge importance but cannot give numbers directly.',
    whenToUse: [
      'Importance comes from people.',
      'Up to about 9 criteria: n(n-1)/2 comparisons, 36 at n = 9.',
      'You want a check of how consistent the judgements are.',
    ],
    whenNot: [
      'Many criteria: comparison fatigue; BWM needs only 2n - 3 judgements.',
      'Weights must be objective.',
      'Judges reject statements like "A is 3 times as important as B".',
    ],
    inputs: [
      "Positive reciprocal n x n matrix: 1 on the diagonal, a_ji = 1/a_ij, values from Saaty's 1‑9 scale and their reciprocals.",
      'Method option: principal eigenvector (default) or row geometric mean (LLSM).',
      'Output: weights, λmax, CI and CR.',
    ],
    pitfalls: [
      'A non-reciprocal matrix (a typo) still gives an eigenvector, but CR is meaningless; the input should enforce reciprocity.',
      'CR above 0.10 (the usual limit): revise the judgements, starting with the most inconsistent one.',
      'For n = 1 or 2, CR is undefined (CI and RI are both 0): report it as not applicable.',
    ],
  },
  tr: {
    summary:
      'AHP, ikili yargıları ("A, B\'den ne kadar önemli?", 1‑9) ağırlığa ve bir tutarlılık oranına (CR) çevirir. Uzmanlar önemi yargılayabiliyor ama doğrudan sayı veremiyorsa kullanın.',
    whenToUse: [
      'Önem kişilerin yargısından geliyor.',
      'En fazla 9 civarında kriter: n(n-1)/2 karşılaştırma, n = 9 için 36.',
      'Yargıların ne kadar tutarlı olduğunu denetlemek istiyorsunuz.',
    ],
    whenNot: [
      'Kriter çok: karşılaştırma yorgunluğu; BWM yalnız 2n - 3 yargı ister.',
      'Ağırlıklar nesnel olmalı.',
      'Uzmanlar "A, B\'den 3 kat önemli" türü ifadeleri kabul etmiyor.',
    ],
    inputs: [
      "Pozitif, karşılıklı n x n matris: köşegende 1, a_ji = 1/a_ij, değerler Saaty'nin 1‑9 ölçeğinden ve bunların tersleri.",
      'Yöntem seçeneği: temel özvektör (varsayılan) ya da satır geometrik ortalaması (LLSM).',
      'Çıktı: ağırlıklar, λmaks, CI ve CR.',
    ],
    pitfalls: [
      'Karşılıklı olmayan matris (yazım hatası) yine özvektör verir ama CR anlamsızlaşır; giriş karşılıklılığı zorunlu kılmalı.',
      "CR 0,10'u (olağan sınır) aşarsa yargıları gözden geçirin; en tutarsız yargıdan başlayın.",
      'n = 1 veya 2 için CR tanımsızdır (CI ve RI ikisi de 0); uygulanamaz diye raporlayın.',
    ],
  },
}
