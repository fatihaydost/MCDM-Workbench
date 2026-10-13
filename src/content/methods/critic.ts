import type { MethodContent } from '../types'

// Source: docs/research/methods/critic.md
export const critic: MethodContent = {
  id: 'critic',
  name: { en: 'CRITIC', tr: 'CRITIC' },
  fullName: {
    en: 'CRiteria Importance Through Intercriteria Correlation',
    tr: 'Kriterler arası korelasyon yoluyla kriter önemi',
  },
  family: 'weighting-objective',
  status: 'available',
  year: 1995,
  origin: {
    authors: 'Diakoulaki, D.; Mavrotas, G.; Papayannakis, L.',
    year: 1995,
    title: 'Determining objective weights in multiple criteria problems: The CRITIC method',
    venue: 'Computers & Operations Research 22(7), 763-770',
    doi: '10.1016/0305-0548(94)00059-H',
    note: {
      en: 'The steps follow the open-access restatements by Krishnan et al. (2021) and Mukhametzyanov (2021), which agree with each other.',
      tr: 'Adımlar, birbiriyle uyumlu iki açık erişimli anlatımı izler: Krishnan vd. (2021) ve Mukhametzyanov (2021).',
    },
  },
  steps: [
    {
      title: { en: 'Min-max normalization', tr: 'Min-maks normalizasyonu' },
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - x_j^{\min}}{x_j^{\max} - x_j^{\min}} & j \in J^{+} \\[2ex] \dfrac{x_j^{\max} - x_{ij}}{x_j^{\max} - x_j^{\min}} & j \in J^{-} \end{cases}`,
      note: {
        en: 'J+ are benefit and J- cost criteria; the origin paper\'s "ideal point" transformation maps every column to 0-1, with 1 the best value.',
        tr: 'J+ fayda, J- maliyet kriterleridir; özgün makaledeki "ideal nokta" dönüşümü her sütunu 0-1 aralığına indirir, 1 en iyi değerdir.',
      },
    },
    {
      title: { en: 'Contrast: standard deviation', tr: 'Kontrast: standart sapma' },
      tex: String.raw`\sigma_j = \sqrt{\frac{1}{m-1}\sum_{i=1}^{m} \left(r_{ij} - \bar r_j\right)^2}`,
      note: {
        en: 'Sample standard deviation (Excel STDEV); using m instead of m - 1 scales every sigma equally, so the weights do not change.',
        tr: "Örneklem standart sapması (Excel'deki STDEV); m - 1 yerine m kullanmak her sigmayı aynı çarpanla ölçekler, ağırlıklar değişmez.",
      },
    },
    {
      title: { en: 'Correlation between criteria', tr: 'Kriterler arası korelasyon' },
      tex: String.raw`\rho_{jk} = \operatorname{corr}\left(r_{\cdot j},\, r_{\cdot k}\right)`,
      note: {
        en: 'Pearson correlation of the normalized columns, without absolute value.',
        tr: 'Normalize sütunlar arasındaki Pearson korelasyonu, mutlak değer alınmadan.',
      },
    },
    {
      title: { en: 'Information content', tr: 'Bilgi miktarı' },
      tex: String.raw`C_j = \sigma_j \sum_{k=1}^{n} \left(1 - \rho_{jk}\right)`,
      note: {
        en: 'Contrast times conflict: a criterion that is spread out and disagrees with the others carries more information.',
        tr: 'Kontrast ile çatışmanın çarpımı: değerleri yayılan ve diğer kriterlerle çelişen kriter daha çok bilgi taşır.',
      },
    },
    {
      title: { en: 'Weights', tr: 'Ağırlıklar' },
      tex: String.raw`w_j = \frac{C_j}{\sum_{k=1}^{n} C_k}`,
    },
  ],
  combinedWith: [
    {
      methodId: 'topsis',
      text: {
        en: 'CRITIC then TOPSIS is the pipeline this site started from. Keshavarz-Ghorabaee et al. (2021) review a material-selection study that feeds CRITIC weights into TOPSIS, GRA and ORESTE.',
        tr: 'CRITIC ardından TOPSIS, bu sitenin çıkış noktası olan boru hattıdır. Keshavarz-Ghorabaee vd. (2021), CRITIC ağırlıklarını TOPSIS, GRA ve ORESTE ile kullanan bir malzeme seçimi çalışmasını inceler.',
      },
    },
    {
      methodId: 'entropy',
      text: {
        en: 'Often run next to Entropy, SD and MEREC as competing objective weightings on the same matrix (Keshavarz-Ghorabaee et al. 2021, Table 6; Mukhametzyanov 2021).',
        tr: 'Aynı matris üzerinde Entropi, SD ve MEREC ile rakip nesnel ağırlıklandırmalar olarak yan yana hesaplanır (Keshavarz-Ghorabaee vd. 2021, Tablo 6; Mukhametzyanov 2021).',
      },
    },
    {
      methodId: 'edas',
      text: {
        en: 'CRITIC then EDAS is common in Turkish financial-performance studies, for example Bayram (2021) on participation banks.',
        tr: 'CRITIC ardından EDAS, Türkçe finansal performans çalışmalarında yaygındır; örneğin Bayram (2021) katılım bankaları üzerine.',
      },
    },
  ],
  reference: {
    source: 'Krishnan, A.R.; Kasim, M.M.; Hamid, R.; Ghazali, M.F. (2021). A Modified CRITIC Method to Estimate the Objective Weights of Decision Criteria. Symmetry 13(6), 973',
    doi: '10.3390/sym13060973',
    match: 'match',
    note: {
      en: "Table 1 (input), Table 2 and Table 5 (output). Five smartphones and five criteria. Our weights match the published ones to 4 decimals (largest difference 4.6e-5) and the standard deviations match Table 2. A second check against the project's own Excel sheet agrees to 1e-12.",
      tr: "Tablo 1 (girdi), Tablo 2 ve Tablo 5 (çıktı). Beş akıllı telefon ve beş kriter. Ağırlıklarımız yayımlanan değerlerle 4 basamakta örtüşüyor (en büyük fark 4,6e-5); standart sapmalar Tablo 2 ile aynı. Projenin kendi Excel dosyasıyla yapılan ikinci kontrol 1e-12 düzeyinde uyuşuyor.",
    },
  },
  sources: [
    { label: 'Diakoulaki, Mavrotas & Papayannakis (1995), Computers & Operations Research 22(7), 763-770', doi: '10.1016/0305-0548(94)00059-H' },
    { label: 'Krishnan, Kasim, Hamid & Ghazali (2021), Symmetry 13(6), 973', doi: '10.3390/sym13060973' },
    { label: 'Mukhametzyanov (2021), Decision Making: Applications in Management and Engineering 4(2), 76-105', doi: '10.31181/dmame210402076i' },
    { label: 'Keshavarz-Ghorabaee et al. (2021), Symmetry 13(4), 525', doi: '10.3390/sym13040525' },
  ],
  en: {
    summary:
      'CRITIC gives more weight to criteria whose values vary a lot (contrast) and disagree with the other criteria (conflict). Use it when you have a filled decision matrix and no expert view on importance.',
    whenToUse: [
      'Weights must come from the data, not from people.',
      'Correlated criteria (financial ratios, specifications) should share weight, not count twice.',
      'You want steps that are easy to show: deviation, correlation, information.',
    ],
    whenNot: [
      'With 3 or fewer alternatives, correlations are +1, -1 or unstable.',
      'Clear expert views on importance: use AHP, BWM or SWARA, or combine.',
      'You will add or remove alternatives: the weights change with the set.',
    ],
    inputs: [
      'Decision matrix with m alternatives and n criteria, real numbers; negatives are fine, min-max handles them. At least 4 alternatives recommended, 2 is the technical minimum.',
      'Criterion type per column (benefit or cost). It is used only in the normalization.',
      'No parameters.',
    ],
    pitfalls: [
      'A constant column gets weight 0 with a warning and stays out of the conflict sums, so it does not move the other weights; if every column is constant, the weights fall back to 1/n.',
      'With fewer than 4 alternatives the correlations jump around; we warn below 4.',
      'Negative correlation raises weight (1 - rho can reach 2); Mukhametzyanov (2021) calls this a flaw and proposes |rho|.',
    ],
  },
  tr: {
    summary:
      'CRITIC, değerleri çok değişen (kontrast) ve diğer kriterlerle çelişen (çatışma) kriterlere daha çok ağırlık verir. Dolu bir karar matrisiniz varsa ve önem konusunda uzman görüşü yoksa kullanın.',
    whenToUse: [
      'Ağırlıklar kişilerden değil, veriden gelmeli.',
      'İlişkili kriterler (finansal oranlar, teknik özellikler) ağırlığı paylaşmalı, iki kez sayılmamalı.',
      'Adımları kolay gösterilen bir yöntem istiyorsunuz: sapma, korelasyon, bilgi.',
    ],
    whenNot: [
      'En fazla 3 alternatif: korelasyonlar +1, -1 çıkar ya da oynar.',
      'Net uzman görüşü varsa AHP, BWM ya da SWARA; ikisini birleştirebilirsiniz.',
      'Alternatif ekleyip çıkaracaksınız: ağırlıklar kümeyle birlikte değişir.',
    ],
    inputs: [
      'm alternatif ve n kriterden oluşan karar matrisi, gerçek sayılar; negatif değerler sorun değil, min-maks bunları karşılar. En az 4 alternatif önerilir, teknik alt sınır 2.',
      'Her sütun için kriter türü (fayda ya da maliyet). Yalnız normalizasyonda kullanılır.',
      'Parametre yok.',
    ],
    pitfalls: [
      'Sabit sütunun ağırlığı 0 alınır, uyarı gösterilir ve çatışma toplamlarına katılmaz, böylece diğer ağırlıkları kaydırmaz; bütün sütunlar sabitse ağırlıklar 1/n olur.',
      "4'ten az alternatifte korelasyonlar sıçrar; 4'ün altında uyarı gösterilir.",
      "Negatif korelasyon ağırlığı artırır (1 - rho 2'ye kadar çıkar); Mukhametzyanov (2021) bunu kusur sayar ve |rho| önerir.",
    ],
  },
}
