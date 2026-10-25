import type { MethodContent } from '../types'

// Source: docs/research/methods/codas.md
export const codas: MethodContent = {
  id: 'codas',
  name: { en: 'CODAS', tr: 'CODAS' },
  fullName: { en: 'COmbinative Distance-based ASsessment', tr: 'Birleşik uzaklık tabanlı değerlendirme' },
  family: 'ranking-distance',
  status: 'available',
  year: 2016,
  origin: {
    authors: 'Keshavarz Ghorabaee, M.; Zavadskas, E.K.; Turskis, Z.; Antucheviciene, J.',
    year: 2016,
    title: 'A new combinative distance-based assessment (CODAS) method for multi-criteria decision-making',
    venue: 'Economic Computation and Economic Cybernetics Studies and Research 50(3), 25-44',
    url: 'https://ideas.repec.org/a/cys/ecocyb/v50y2016i3p25-44.html',
    note: {
      en: 'No DOI found; none is printed in the PDF.',
      tr: "DOI bulunamadı; PDF'te de basılı değil.",
    },
  },
  steps: [
    {
      title: { en: 'Linear normalization', tr: 'Doğrusal normalizasyon' },
      tex: String.raw`n_{ij} = \begin{cases} \dfrac{x_{ij}}{\max_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\min_i x_{ij}}{x_{ij}} & j \in J^{-} \end{cases}`,
    },
    {
      title: { en: 'Weighting and negative-ideal point', tr: 'Ağırlıklandırma ve negatif ideal nokta' },
      tex: String.raw`r_{ij} = w_j\, n_{ij}, \qquad ns_j = \min_i r_{ij}`,
    },
    {
      title: { en: 'Euclidean and Taxicab distances', tr: 'Öklid ve Taxicab uzaklıkları' },
      tex: String.raw`E_i = \sqrt{\sum_{j=1}^{n} \left(r_{ij} - ns_j\right)^2}, \qquad T_i = \sum_{j=1}^{n} \left|r_{ij} - ns_j\right|`,
    },
    {
      title: { en: 'Relative assessment matrix', tr: 'Göreli değerlendirme matrisi' },
      tex: String.raw`h_{ik} = (E_i - E_k) + \psi(E_i - E_k)\,(T_i - T_k), \qquad \psi(x) = \begin{cases} 1 & |x| \ge \tau \\ 0 & |x| < \tau \end{cases}`,
      note: {
        en: "psi as printed in Eq. (8) of the origin, which reproduces every published number in Section 3, although the paper's prose says the opposite (use Taxicab when the Euclidean gap is below tau).",
        tr: "psi, özgün makaledeki Denklem (8)'de basıldığı gibidir ve Bölüm 3'te yayımlanan tüm sayıları verir; makalenin metni ise tersini söyler (Öklid farkı tau'nun altındaysa Taxicab kullanılır).",
      },
    },
    {
      title: { en: 'Assessment score', tr: 'Değerlendirme skoru' },
      tex: String.raw`H_i = \sum_{k=1}^{m} h_{ik}`,
      note: {
        en: 'Rank by decreasing H.',
        tr: 'H değerine göre büyükten küçüğe sıralanır.',
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'ahp',
      text: {
        en: 'Expert or AHP weights, then CODAS: Badi, Abdulshahed & Shetwan (2018), the example used here; the origin uses weights from Chakraborty & Zavadskas (2014) and Zavadskas & Turskis (2010).',
        tr: 'Uzman ya da AHP ağırlıkları, ardından CODAS: Badi, Abdulshahed ve Shetwan (2018), buradaki örnek; özgün makale Chakraborty ve Zavadskas (2014) ile Zavadskas ve Turskis (2010) ağırlıklarını kullanır.',
      },
    },
    {
      methodId: 'edas',
      text: {
        en: 'Simulated weight sets for sensitivity, compared with WASPAS, COPRAS, TOPSIS, VIKOR and EDAS (origin, Tables 9-11).',
        tr: 'Duyarlılık için benzetim ağırlık setleri; WASPAS, COPRAS, TOPSIS, VIKOR ve EDAS ile karşılaştırma (özgün makale, Tablo 9-11).',
      },
    },
    {
      methodId: 'aras',
      text: {
        en: 'Example 2 reuses the office-microclimate data of the ARAS paper (2010).',
        tr: '2. örnek, ARAS makalesinin (2010) ofis mikroklima verisini yeniden kullanır.',
      },
    },
  ],
  reference: {
    source: 'Badi, I.; Abdulshahed, A.M.; Shetwan, A. (2018). A case study of supplier selection for a steelmaking company in Libya by using the Combinative Distance-based Assessment (CODAS) model. Decision Making: Applications in Management and Engineering 1(1), 1-12',
    doi: '10.31181/dmame180101b',
    match: 'match',
    note: {
      en: 'Published example, reproduced by the tests: six steelmaking suppliers on four criteria, direct cost the only cost, with expert weights (Tables 1-5). E, T and H match to 4 decimals and the rank order over tau (0.01 to 1.00) is identical; Table 3 misprints the third column of ns as 0.0719 for 0.1161, while E, T and H use 0.1161. Also tested: both examples of the origin (Keshavarz Ghorabaee et al. 2016, industrial robots in Tables 1-4, where the headers of Tables 1 and 2 swap tip speed and repeatability, and office microclimate in Tables 5-8), which match E, T, H and rankings. pyDecision uses a different h formula and does not match.',
      tr: "Yayımlanmış örnek, testlerde yeniden üretiliyor: dört kriterde altı çelik üretimi tedarikçisi, yalnız doğrudan maliyetin maliyet kriteri olduğu uzman ağırlıklı tablo (Tablo 1-5). E, T ve H 4 basamağa kadar örtüşüyor ve tau (0,01'den 1,00'a) boyunca sıralama birebir aynı; Tablo 3, ns satırının üçüncü sütununu 0,1161 yerine 0,0719 basmış ama E, T ve H hesabında 0,1161 kullanılmış. Ayrıca sınananlar: özgün makalenin iki örneği (Keshavarz Ghorabaee vd. 2016; Tablo 1 ve 2 başlıklarında uç hızı ile tekrarlanabilirliğin yer değiştirdiği Tablo 1-4 endüstriyel robot seçimi ve Tablo 5-8 ofis mikrokliması); ikisinde de E, T, H ve sıralamalar örtüşüyor. pyDecision farklı bir h formülü kullanır ve örtüşmez.",
    },
  },
  sources: [
    { label: 'Badi, Abdulshahed & Shetwan (2018), Decision Making: Applications in Management and Engineering 1(1), 1-12', doi: '10.31181/dmame180101b' },
    { label: 'Trung (2022), Applied Engineering Letters 7(2), 54-66', doi: '10.18485/aeletters.2022.7.2.2' },
    { label: 'pymcdm 1.4.0, pymcdm.methods.CODAS', url: 'https://gitlab.com/shekhand/mcda' },
    { label: 'pyDecision 5.1.8, codas_method', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'CODAS scores each alternative by its distance from the worst point, Euclidean first and Taxicab second. Comparing every pair, the alternative with the largest total margin wins.',
    whenToUse: [
      'Strictly positive benefit and cost data.',
      'You want pairwise aggregation using two notions of distance.',
    ],
    whenNot: [
      'You cannot defend a value for tau: the ranking can change.',
      'Any criterion contains zero or negative values (linear max/min normalization).',
    ],
    inputs: [
      'Decision matrix with strictly positive values.',
      'Criterion type per column, weights summing to 1.',
      'Threshold tau, default 0.02, range 0.01-0.10 (0.01-0.05 suggested).',
    ],
    pitfalls: [
      'The origin paper contradicts itself on psi; Eq. (8) is the version that reproduces the published numbers in Section 3.',
      'tau is in weighted normalized distance units, so its effect depends on the weights and the number of alternatives.',
      'H sums to zero over all alternatives and is not bounded; do not compare it across problems.',
    ],
  },
  tr: {
    summary:
      'CODAS her alternatifi en kötü noktaya uzaklığıyla puanlar: önce Öklid, ikinci ölçü olarak Taxicab uzaklığı. Tüm çiftler karşılaştırılır; toplamda en büyük farkla önde olan kazanır.',
    whenToUse: [
      'Kesinlikle pozitif fayda ve maliyet kriterli veri.',
      'İki uzaklık kavramını kullanan ikili karşılaştırmalı bir birleştirme istiyorsunuz.',
    ],
    whenNot: [
      'tau için savunulabilir bir değeriniz yok: sıralama buna göre değişebilir.',
      'Herhangi bir kriterde sıfır veya negatif değer var (doğrusal maks/min normalizasyonu).',
    ],
    inputs: [
      'Kesinlikle pozitif değerli karar matrisi.',
      'Her sütun için kriter türü, toplamı 1 olan ağırlıklar.',
      'Eşik tau, varsayılan 0,02, aralık 0,01-0,10 (önerilen 0,01-0,05).',
    ],
    pitfalls: [
      "Özgün makale psi konusunda kendisiyle çelişir; Bölüm 3'te yayımlanan sayıları veren Denklem (8)'dir.",
      'tau ağırlıklı normalize uzaklık birimindedir; etkisi ağırlıklara ve alternatif sayısına bağlıdır.',
      'H tüm alternatifler üzerinde sıfıra toplanır ve sınırlı değildir; problemler arasında karşılaştırmayın.',
    ],
  },
}
