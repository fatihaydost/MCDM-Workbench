import type { MethodContent } from '../types'

// Source: docs/research/methods/cilos.md
export const cilos: MethodContent = {
  id: 'cilos',
  name: { en: 'CILOS', tr: 'CILOS' },
  fullName: { en: 'Criterion Impact LOSs', tr: 'Kriter etki kaybı' },
  family: 'weighting-objective',
  status: 'available',
  year: 2016,
  origin: {
    authors: 'Zavadskas, E.K.; Podvezko, V.',
    year: 2016,
    title: 'Integrated Determination of Objective CRIteria Weights in MCDM',
    venue: 'International Journal of Information Technology & Decision Making 15(2), 267-283',
    doi: '10.1142/S0219622016500036',
    note: {
      en: "The idea goes back to Mirkin (1974), a Russian book on group choice; the algorithm follows the same authors' open-access paper Zavadskas et al. (2017), section 5.1.2.",
      tr: "Fikir, grup seçimi üzerine Rusça bir kitap olan Mirkin'e (1974) dayanır; algoritma aynı yazarların açık erişimli Zavadskas vd. (2017) makalesinin 5.1.2 bölümünü izler.",
    },
  },
  steps: [
    {
      title: { en: 'Turn cost criteria into benefit', tr: 'Maliyet kriterlerinin faydaya çevrilmesi' },
      tex: String.raw`x_{ij} \leftarrow \frac{\min_i x_{ij}}{x_{ij}}, \qquad j \in J^{-}`,
    },
    {
      title: { en: 'Sum normalization', tr: 'Toplam normalizasyonu' },
      tex: String.raw`\bar x_{ij} = \frac{x_{ij}}{\sum_{i=1}^{m} x_{ij}}`,
    },
    {
      title: { en: 'Matrix of column winners', tr: 'Sütun birincileri matrisi' },
      tex: String.raw`W_i = \arg\max_r \bar x_{ri}, \qquad a_{ij} = \frac{1}{|W_i|}\sum_{r \in W_i} \bar x_{rj}`,
      note: {
        en: 'Row i of the n x n matrix A is the winning row on criterion i (ties are averaged for row-order invariance), so a_ii is the column maximum.',
        tr: 'n x n boyutlu A matrisinin i. satırı, i. kriterde birinci olan satırdır (sıra bağımsızlığı için eşitliklerin ortalaması alınır); yani a_ii sütunun en büyük değeridir.',
      },
    },
    {
      title: { en: 'Relative losses', tr: 'Göreli kayıplar' },
      tex: String.raw`p_{ij} = \frac{a_{jj} - a_{ij}}{a_{jj}}, \qquad p_{ii} = 0`,
      note: {
        en: 'The loss on criterion j when the alternative that is best on criterion i is chosen.',
        tr: 'i. kriterde en iyi olan alternatif seçilince j. kriterde uğranan kayıp.',
      },
    },
    {
      title: { en: 'Loss matrix with column sums on the diagonal', tr: 'Köşegeninde sütun toplamları olan kayıp matrisi' },
      tex: String.raw`F = P, \qquad f_{jj} = -\sum_{i=1}^{n} p_{ij}`,
    },
    {
      title: { en: 'Weights from a homogeneous system', tr: 'Homojen sistemden ağırlıklar' },
      tex: String.raw`F\,q = 0, \qquad \sum_{j=1}^{n} q_j = 1, \qquad w = q`,
      note: {
        en: 'The columns of F sum to zero, so F is singular by construction; a unique normalized solution exists when F has rank n - 1.',
        tr: "F'nin sütunları sıfıra toplanır, yani F yapısı gereği tekildir; F'nin rankı n - 1 ise tek bir normalize çözüm vardır.",
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'entropy',
      text: {
        en: 'CILOS times Entropy gives IDOCRIW, which Zavadskas et al. (2017) then use with EDAS and other ranking methods.',
        tr: 'CILOS ile Entropi çarpılınca IDOCRIW elde edilir; Zavadskas vd. (2017) bunu EDAS ve başka sıralama yöntemleriyle kullanır.',
      },
    },
    {
      methodId: 'edas',
      text: {
        en: 'CILOS and IDOCRIW weights paired with EDAS, SAW, TOPSIS and COPRAS on the Vilnius neighbourhood dataset: Zavadskas et al. (2017).',
        tr: 'Vilnius mahalleleri verisinde EDAS, SAW, TOPSIS ve COPRAS ile eşleştirilen CILOS ve IDOCRIW ağırlıkları: Zavadskas vd. (2017).',
      },
    },
    {
      methodId: 'critic',
      text: {
        en: 'Compared with Entropy, IDOCRIW, CRITIC and D-CRITIC on one matrix by Krishnan et al. (2021).',
        tr: 'Krishnan vd. (2021) tek bir matris üzerinde Entropi, IDOCRIW, CRITIC ve D-CRITIC ile karşılaştırır.',
      },
    },
    {
      text: {
        en: 'Fuzzy extensions FCILOS and FIDOCRIW: Podvezko, Zavadskas & Podviezko (2020).',
        tr: 'Bulanık uzantılar FCILOS ve FIDOCRIW: Podvezko, Zavadskas ve Podviezko (2020).',
      },
    },
  ],
  reference: {
    source: 'Zavadskas, E.K.; Cavallaro, F.; Podvezko, V.; Ubarte, I.; Kaklauskas, A. (2017). MCDM Assessment of a Healthy and Safe Built Environment According to Sustainable Development Principles: A Practical Neighborhood Approach in Vilnius. Sustainability 9(5), 702',
    doi: '10.3390/su9050702',
    match: 'match',
    note: {
      en: 'Published example (Table 4, social and economic blocks; Tables 10 and 8, CILOS): twenty-one Vilnius neighbourhoods, five criteria per block. All published CILOS values are reproduced to 4 decimals, but the paper attaches them to the wrong criteria: in Table 10 the first two rows are swapped (and in Table 8 the rows follow [2, 4, 0, 1, 3]). Matched after undoing the swap.',
      tr: "Yayımlanmış örnek (Tablo 4, sosyal ve ekonomik bloklar; Tablo 10 ve 8, CILOS): yirmi bir Vilnius mahallesi, blok başına beş kriter. Yayımlanan tüm CILOS değerleri 4 basamakta elde ediliyor, ama makale onları yanlış kriterlere bağlamış: Tablo 10'da ilk iki satır yer değiştirmiş (Tablo 8'de de satırlar [2, 4, 0, 1, 3] sırasını izliyor). Yer değişimi geri alınınca örtüşüyor.",
    },
  },
  sources: [
    { label: 'Zavadskas & Podvezko (2016), International Journal of Information Technology & Decision Making 15(2), 267-283', doi: '10.1142/S0219622016500036' },
    { label: 'Zavadskas, Cavallaro, Podvezko, Ubarte & Kaklauskas (2017), Sustainability 9(5), 702', doi: '10.3390/su9050702' },
    { label: 'Pala (2021), Kafkas Üniversitesi İİBF Dergisi 12(23), 263-294', doi: '10.36543/kauiibfd.2021.013' },
    { label: 'Krishnan, Kasim, Hamid & Ghazali (2021), Symmetry 13(6), 973', doi: '10.3390/sym13060973' },
    { label: 'Mirkin (1974), Problema gruppovogo vybora, Nauka, Moscow' },
    { label: 'Podvezko, Zavadskas & Podviezko (2020), Economic Computation and Economic Cybernetics Studies and Research 54(2), 59-75', doi: '10.24818/18423264/54.2.20.04' },
  ],
  en: {
    summary:
      'CILOS asks how much the other criteria lose when you pick the best alternative on one criterion. Criteria that cost little elsewhere get more weight; it is often multiplied with Entropy (IDOCRIW).',
    whenToUse: [
      'Data are positive.',
      'You want to combine it with Entropy (IDOCRIW), Vilnius-school style.',
    ],
    whenNot: [
      'A constant criterion: zero loss column, singular linear system.',
      'One alternative is best on several criteria: duplicate rows destabilize.',
      'Any criterion contains zero or negative values (needs x > 0).',
    ],
    inputs: [
      'Decision matrix with positive values.',
      'Criterion type per column: benefit or cost.',
      'At least 2 criteria. No parameters.',
    ],
    pitfalls: [
      'A constant column makes the system rank-deficient; it is dropped (weight 0) with a warning and the rest is solved.',
      'Ties for the column maximum are averaged across all tied winners so alternative order never alters the weights.',
      'If one alternative is best on every varying criterion, all losses in P are 0 (F = 0), so the varying criteria share the weight equally with a warning.',
    ],
  },
  tr: {
    summary:
      'CILOS, bir kriterde en iyi alternatifi seçince diğer kriterlerin ne kadar kaybettiğini sorar. Başka yerde az kayba yol açan kriter daha çok ağırlık alır; çoğu zaman Entropi ile çarpılır (IDOCRIW).',
    whenToUse: [
      'Veriler pozitif.',
      'Vilnius okulundaki gibi Entropi ile birleştirmek istiyorsunuz (IDOCRIW).',
    ],
    whenNot: [
      'Bir kriter sabit: kayıp sütunu sıfır, doğrusal sistem tekil olur.',
      'Bir alternatif birkaç kriterde birden en iyi: tekrarlanan satırlar sistemi hassaslaştırır.',
      'Kriterlerde sıfır ya da negatif değer var (x > 0 gerekir).',
    ],
    inputs: [
      'Pozitif değerli karar matrisi.',
      'Her sütun için kriter türü: fayda ya da maliyet.',
      'En az 2 kriter. Parametre yok.',
    ],
    pitfalls: [
      'Sabit sütun sistemin rankını düşürür; o sütun çıkarılır (ağırlık 0), uyarı verilir ve kalanlar çözülür.',
      'Sütun maksimumundaki eşitliklerde tüm eş birincilerin ortalaması alınır; böylece alternatif sırası ağırlıkları değiştirmez.',
      'Tek bir alternatif değişen her kriterde en iyiyse P içindeki tüm kayıplar 0 olur (F = 0); değişen kriterler uyarı verilerek ağırlığı eşit paylaşır.',
    ],
  },
}
