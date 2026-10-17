import type { MethodContent } from '../types'

// Source: docs/research/methods/sd.md
export const sd: MethodContent = {
  id: 'sd',
  name: { en: 'SD', tr: 'SD' },
  fullName: { en: 'Standard deviation weighting', tr: 'Standart sapma ağırlıklandırması' },
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
      en: 'Section 4 defines SD weights (Eq. 7) as the baseline for CRITIC, with a worked example; the paper credits the idea of contrast by standard deviation to Zeleny (1982).',
      tr: 'Bölüm 4, SD ağırlıklarını (Denklem 7) CRITIC için karşılaştırma tabanı olarak tanımlar ve örnekle hesaplar; standart sapmayla kontrast fikrini Zeleny (1982) kaynağına bağlar.',
    },
  },
  steps: [
    {
      title: { en: 'Min-max normalization', tr: 'Min-maks normalizasyonu' },
      tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - x_j^{\min}}{x_j^{\max} - x_j^{\min}} & j \in J^{+} \\[2ex] \dfrac{x_j^{\max} - x_{ij}}{x_j^{\max} - x_j^{\min}} & j \in J^{-} \end{cases}`,
      note: { en: 'Same as step 1 of CRITIC.', tr: "CRITIC'in 1. adımıyla aynı." },
    },
    {
      title: { en: 'Standard deviation', tr: 'Standart sapma' },
      tex: String.raw`\sigma_j = \sqrt{\frac{1}{m-1}\sum_{i=1}^{m} \left(r_{ij} - \bar r_j\right)^2}`,
      note: {
        en: 'Diakoulaki et al. (1995) print the population value (1/m); the weights are the same.',
        tr: 'Diakoulaki vd. (1995) anakütle değerini (1/m) basar; ağırlıklar aynıdır.',
      },
    },
    {
      title: { en: 'Weights', tr: 'Ağırlıklar' },
      tex: String.raw`w_j = \frac{\sigma_j}{\sum_{k=1}^{n} \sigma_k}`,
      note: {
        en: 'SD is CRITIC with the conflict term set to 1.',
        tr: "SD, çatışma terimi 1 alınmış CRITIC'tir.",
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'saw',
      text: {
        en: 'SD only weighs; a ranking method ranks. Both published examples feed SD weights into a weighted sum (Diakoulaki et al. 1995, Eq. 9; Mukhametzyanov 2021, Table 2).',
        tr: 'SD yalnız ağırlık üretir; sıralamayı başka bir yöntem yapar. İki yayımlanmış örnek de SD ağırlıklarını ağırlıklı toplamda kullanır (Diakoulaki vd. 1995, Denklem 9; Mukhametzyanov 2021, Tablo 2).',
      },
    },
    {
      methodId: 'critic',
      text: {
        en: 'CRITIC is SD times a conflict term, which reduces the double counting of correlated criteria (Diakoulaki et al. 1995, Tables 3-5).',
        tr: 'CRITIC, SD ile bir çatışma teriminin çarpımıdır; birbirine bağlı kriterlerin iki kez sayılmasını azaltır (Diakoulaki vd. 1995, Tablo 3-5).',
      },
    },
    {
      methodId: 'entropy',
      text: {
        en: 'SD, Entropy and CRITIC compared on four related data sets: SD weights varied least (Mukhametzyanov 2021, Table 2).',
        tr: 'SD, Entropi ve CRITIC dört ilişkili veri setinde karşılaştırıldı: en az SD ağırlıkları değişti (Mukhametzyanov 2021, Tablo 2).',
      },
    },
    {
      methodId: 'moora',
      text: {
        en: 'SD then MULTIMOORA or MOOSRA, SD then EDAS, COPRAS, TOPSIS or ARAS, SD then GRA, TOPSIS or ORESTE, as reviewed in Keshavarz-Ghorabaee et al. (2021).',
        tr: 'SD ardından MULTIMOORA ya da MOOSRA, SD ardından EDAS, COPRAS, TOPSIS ya da ARAS, SD ardından GRA, TOPSIS ya da ORESTE; Keshavarz-Ghorabaee vd. (2021) incelemesine göre.',
      },
    },
  ],
  reference: {
    source: 'Diakoulaki, D.; Mavrotas, G.; Papayannakis, L. (1995). Determining objective weights in multiple criteria problems: The CRITIC method. Computers & Operations Research 22(7), 763-770',
    doi: '10.1016/0305-0548(94)00059-H',
    match: 'match',
    note: {
      en: 'Table 1 (input), Section 5 and Table 3 (SD). Eight firms, three criteria, negative values included. Our weights match the printed 3 decimals (largest difference 8.3e-5); the printed standard deviations are the population values and match once converted (3.5e-4). The four matrices of Mukhametzyanov (2021), Tables 1, 2 and 4, with cost criteria, match to 3 decimals as well (4.9e-4).',
      tr: 'Tablo 1 (girdi), Bölüm 5 ve Tablo 3 (SD). Sekiz firma, üç kriter, negatif değerler de var. Ağırlıklarımız basılı 3 basamakla örtüşüyor (en büyük fark 8,3e-5); basılı standart sapmalar anakütle değeri, dönüştürülünce örtüşüyor (3,5e-4). Mukhametzyanov (2021) Tablo 1, 2 ve 4\'teki maliyet kriterli dört matris de 3 basamakta örtüşüyor (4,9e-4).',
    },
  },
  sources: [
    { label: 'Diakoulaki, Mavrotas & Papayannakis (1995), Computers & Operations Research 22(7), 763-770', doi: '10.1016/0305-0548(94)00059-H' },
    { label: 'Mukhametzyanov (2021), DMAME 4(2), 76-105', doi: '10.31181/dmame210402076i' },
    { label: 'Zeleny (1982), Multiple Criteria Decision Making, McGraw-Hill' },
    { label: 'Keshavarz-Ghorabaee et al. (2021), Symmetry 13(4), 525', doi: '10.3390/sym13040525' },
  ],
  en: {
    summary:
      'SD rescales every criterion to 0-1 (min-max) and gives more weight to criteria whose values spread more across the alternatives. A simple, transparent objective baseline.',
    whenToUse: [
      'No expert weights, and you want weights from the data alone.',
      'A transparent baseline next to CRITIC and Entropy.',
      'Data of any sign: negatives and zeros are fine.',
    ],
    whenNot: [
      'Strongly correlated criteria: SD counts them twice; use CRITIC.',
      'Outliers: one extreme value distorts the spread of a column.',
      'Two alternatives: every varying criterion gets the same weight.',
    ],
    inputs: [
      'Decision matrix, any real values, at least 2 alternatives.',
      'Criterion type per column (changes the normalized values, not the weights).',
      'No parameters.',
    ],
    pitfalls: [
      'A constant column gets weight 0 with a warning; if all columns are constant, the weights fall back to 1/n.',
      'Weights are often close to equal (0.28-0.38 in the origin example); that is the method, not a fault.',
      'Adding or replacing an alternative moves the minimum and maximum, so the weights change too.',
    ],
  },
  tr: {
    summary:
      'SD her kriteri 0-1 aralığına (min-maks) ölçekler ve değerleri alternatifler arasında daha çok yayılan kriterlere daha çok ağırlık verir. Basit ve şeffaf bir nesnel taban.',
    whenToUse: [
      'Uzman ağırlığı yok ve ağırlıklar yalnız veriden gelsin istiyorsunuz.',
      'CRITIC ve Entropi yanında şeffaf bir taban.',
      'Her işaretten veri: negatifler ve sıfırlar sorun değil.',
    ],
    whenNot: [
      'Kriterler güçlü korelasyonlu: SD onları iki kez sayar; CRITIC kullanın.',
      'Uç değer: tek bir uç değer sütunun yayılımını bozar.',
      'İki alternatif: değişen her kriter aynı ağırlığı alır.',
    ],
    inputs: [
      'Karar matrisi, herhangi bir gerçek değer, en az 2 alternatif.',
      'Her sütun için kriter türü (normalize değerleri değiştirir, ağırlıkları değil).',
      'Parametre yok.',
    ],
    pitfalls: [
      'Sabit sütunun ağırlığı 0 alınır ve uyarı gösterilir; bütün sütunlar sabitse ağırlıklar 1/n olur.',
      'Ağırlıklar çoğu zaman eşite yakındır (ilk örnekte 0,28-0,38); bu yöntemin kendisi, hata değil.',
      'Alternatif eklemek ya da değiştirmek en küçük ve en büyük değeri kaydırır, ağırlıklar da değişir.',
    ],
  },
}
