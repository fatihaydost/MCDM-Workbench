import type { Bilingual } from './types'

/**
 * One-line explanation and formula for every intermediate step the core returns
 * (Step.key in src/core/methods/*.ts). Formulas follow the code, including its edge cases:
 * src/core/methods/critic.ts, entropy.ts, sd.ts, topsis.ts, saw.ts, vikor.ts and edas.ts.
 * Notation: i = alternative (1..m), j, k = criterion (1..n), J+ benefit and J- cost criteria.
 */
export type StepContent = Bilingual & {
  tex: string
  /** What the code does in the degenerate case, when it differs from the plain formula. */
  edgeCase?: Bilingual
}

export type StepKey =
  | 'critic.normalized'
  | 'critic.sigma'
  | 'critic.correlation'
  | 'critic.conflict'
  | 'critic.information'
  | 'critic.informationTotal'
  | 'critic.weights'
  | 'entropy.normalized'
  | 'entropy.proportionsSum'
  | 'entropy.proportionsMinmax'
  | 'entropy.entropy'
  | 'entropy.diversification'
  | 'entropy.weights'
  | 'sd.normalized'
  | 'sd.sigma'
  | 'sd.sigmaTotal'
  | 'sd.weights'
  | 'topsis.normalized'
  | 'topsis.weighted'
  | 'topsis.idealBest'
  | 'topsis.idealWorst'
  | 'topsis.distanceBest'
  | 'topsis.distanceWorst'
  | 'topsis.closeness'
  | 'saw.normalizedLinearMax'
  | 'saw.normalizedSum'
  | 'saw.weighted'
  | 'saw.scores'
  | 'vikor.best'
  | 'vikor.worst'
  | 'vikor.weightedDistance'
  | 'vikor.groupUtility'
  | 'vikor.individualRegret'
  | 'vikor.q'
  | 'vikor.threshold'
  | 'edas.average'
  | 'edas.pda'
  | 'edas.nda'
  | 'edas.weightedPda'
  | 'edas.weightedNda'
  | 'edas.sp'
  | 'edas.sn'
  | 'edas.nsp'
  | 'edas.nsn'
  | 'edas.scores'

export const stepContent: Readonly<Record<StepKey, StepContent>> = {
  'critic.normalized': {
    en: 'Min-max normalized matrix: each column scaled to 0-1, 1 is best (cost reversed).',
    tr: 'Min-maks normalize matris: her sütun 0-1 aralığına iner, 1 en iyidir (maliyet ters).',
    tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
    edgeCase: {
      en: 'A constant column (max = min) is set to 0 in every row.',
      tr: 'Sabit bir sütun (maks = min) her satırda 0 alınır.',
    },
  },
  'critic.sigma': {
    en: 'Contrast of each criterion: sample standard deviation of its normalized column.',
    tr: 'Her kriterin kontrastı: normalize sütununun örneklem standart sapması.',
    tex: String.raw`\sigma_j = \sqrt{\frac{1}{m-1}\sum_{i=1}^{m} \left(r_{ij} - \bar r_j\right)^2}, \qquad \bar r_j = \frac{1}{m}\sum_{i=1}^{m} r_{ij}`,
  },
  'critic.correlation': {
    en: 'Pearson correlation between every pair of normalized columns.',
    tr: 'Normalize sütunların her çifti arasındaki Pearson korelasyonu.',
    tex: String.raw`\rho_{jk} = \frac{\sum_{i=1}^{m} (r_{ij} - \bar r_j)(r_{ik} - \bar r_k)}{\sqrt{\sum_{i=1}^{m} (r_{ij} - \bar r_j)^2 \sum_{i=1}^{m} (r_{ik} - \bar r_k)^2}}, \qquad \rho_{jj} = 1`,
    edgeCase: {
      en: 'A pair with a constant column has no correlation; the table shows n/a.',
      tr: 'Sabit sütun içeren çiftin korelasyonu tanımsızdır; tabloda yok yazar.',
    },
  },
  'critic.conflict': {
    en: 'Conflict of each criterion with the others: the sum of 1 minus its correlations.',
    tr: 'Her kriterin diğerleriyle çatışması: 1 eksi korelasyonlarının toplamı.',
    tex: String.raw`\sum_{k=1}^{n} \left(1 - \rho_{jk}\right)`,
    edgeCase: {
      en: 'Constant columns are left out; their own conflict is 0.',
      tr: 'Sabit sütunlar toplama katılmaz; kendi çatışmaları 0 olur.',
    },
  },
  'critic.information': {
    en: 'Information content: contrast times conflict.',
    tr: 'Bilgi miktarı: kontrast ile çatışmanın çarpımı.',
    tex: String.raw`C_j = \sigma_j \sum_{k=1}^{n} \left(1 - \rho_{jk}\right)`,
  },
  'critic.informationTotal': {
    en: 'Total information over all criteria, the denominator of the weights.',
    tr: 'Tüm kriterlerin toplam bilgi miktarı: ağırlıkların paydası.',
    tex: String.raw`\sum_{k=1}^{n} C_k`,
  },
  'critic.weights': {
    en: 'CRITIC weights: each criterion\'s share of the total information.',
    tr: 'CRITIC ağırlıkları: her kriterin toplam bilgi içindeki payı.',
    tex: String.raw`w_j = \frac{C_j}{\sum_{k=1}^{n} C_k}`,
    edgeCase: {
      en: 'If the total is 0 (every column constant), every weight is 1/n.',
      tr: 'Toplam 0 ise (bütün sütunlar sabit) her ağırlık 1/n olur.',
    },
  },
  'entropy.normalized': {
    en: 'Min-max normalized matrix: each column scaled to 0-1, 1 is best (cost reversed).',
    tr: 'Min-maks normalize matris: her sütun 0-1 aralığına iner, 1 en iyidir (maliyet ters).',
    tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
    edgeCase: {
      en: 'A constant column (max = min) is set to 0 and never divided.',
      tr: 'Sabit bir sütun (max = min) 0 alınır, hiç bölünmez.',
    },
  },
  'entropy.proportionsSum': {
    en: 'Shares of the raw values: each value over its column total.',
    tr: 'Ham değerlerin payları: her değer sütun toplamına bölünür.',
    tex: String.raw`p_{ij} = \frac{x_{ij}}{\sum_{i=1}^{m} x_{ij}}, \qquad x_{ij} \ge 0`,
    edgeCase: {
      en: 'A constant column, also all zeros, gets p = 1/m.',
      tr: 'Sabit bir sütun, tamamı sıfır olan da, p = 1/m alır.',
    },
  },
  'entropy.proportionsMinmax': {
    en: 'Shares of the normalized values: each value over its column total.',
    tr: 'Normalize değerlerin payları: her değer sütun toplamına bölünür.',
    tex: String.raw`p_{ij} = \frac{r_{ij}}{\sum_{i=1}^{m} r_{ij}}`,
    edgeCase: {
      en: 'A constant column gets p = 1/m.',
      tr: 'Sabit bir sütun p = 1/m alır.',
    },
  },
  'entropy.entropy': {
    en: 'Entropy per criterion: 1 for equal shares, lower when uneven.',
    tr: 'Kriter başına entropi: eşit paylarda 1, dengesizleştikçe düşer.',
    tex: String.raw`e_j = -\frac{1}{\ln m} \sum_{i=1}^{m} p_{ij} \ln p_{ij}, \qquad 0 \ln 0 = 0`,
  },
  'entropy.diversification': {
    en: 'Degree of diversification: the information the criterion carries.',
    tr: 'Çeşitlenme derecesi: kriterin taşıdığı bilgi.',
    tex: String.raw`d_j = \max\left(0,\ 1 - e_j\right)`,
    edgeCase: {
      en: 'A constant column gets d = 0.',
      tr: 'Sabit bir sütun d = 0 alır.',
    },
  },
  'entropy.weights': {
    en: "Entropy weights: each criterion's share of the total diversification.",
    tr: 'Entropi ağırlıkları: her kriterin toplam çeşitlenme içindeki payı.',
    tex: String.raw`w_j = \frac{d_j}{\sum_{k=1}^{n} d_k}`,
    edgeCase: {
      en: 'If the total is 0 (every column constant), every weight is 1/n.',
      tr: 'Toplam 0 ise (bütün sütunlar sabit) her ağırlık 1/n olur.',
    },
  },
  'sd.normalized': {
    en: 'Min-max normalized matrix: each column scaled to 0-1, 1 is best (cost reversed).',
    tr: 'Min-maks normalize matris: her sütun 0-1 aralığına iner, 1 en iyidir (maliyet ters).',
    tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}} & j \in J^{-} \end{cases}`,
    edgeCase: {
      en: 'A constant column (max = min) is set to 0 in every row.',
      tr: 'Sabit bir sütun (maks = min) her satırda 0 alınır.',
    },
  },
  'sd.sigma': {
    en: 'Spread of each criterion: sample standard deviation of its normalized column.',
    tr: 'Her kriterin yayılımı: normalize sütununun örneklem standart sapması.',
    tex: String.raw`\sigma_j = \sqrt{\frac{1}{m-1}\sum_{i=1}^{m} \left(r_{ij} - \bar r_j\right)^2}, \qquad \bar r_j = \frac{1}{m}\sum_{i=1}^{m} r_{ij}`,
    edgeCase: {
      en: 'Diakoulaki et al. (1995) print the population value (1/m); the weights are the same.',
      tr: 'Diakoulaki vd. (1995) anakütle değerini (1/m) basar; ağırlıklar aynıdır.',
    },
  },
  'sd.sigmaTotal': {
    en: 'Total spread over all criteria, the denominator of the weights.',
    tr: 'Tüm kriterlerin toplam yayılımı: ağırlıkların paydası.',
    tex: String.raw`\sum_{k=1}^{n} \sigma_k`,
  },
  'sd.weights': {
    en: "SD weights: each criterion's share of the total spread.",
    tr: 'SD ağırlıkları: her kriterin toplam yayılım içindeki payı.',
    tex: String.raw`w_j = \frac{\sigma_j}{\sum_{k=1}^{n} \sigma_k}`,
    edgeCase: {
      en: 'If the total is 0 (every column constant), every weight is 1/n.',
      tr: 'Toplam 0 ise (bütün sütunlar sabit) her ağırlık 1/n olur.',
    },
  },
  'topsis.normalized': {
    en: 'Vector normalized matrix: each value divided by the length of its column.',
    tr: 'Vektör normalize matris: her değer kendi sütununun uzunluğuna bölünür.',
    tex: String.raw`r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{i=1}^{m} x_{ij}^2}}`,
    edgeCase: {
      en: 'An all-zero column stays 0.',
      tr: 'Tamamı sıfır olan sütun 0 kalır.',
    },
  },
  'topsis.weighted': {
    en: 'Weighted normalized matrix: each column multiplied by its criterion weight.',
    tr: 'Ağırlıklı normalize matris: her sütun kendi kriter ağırlığıyla çarpılır.',
    tex: String.raw`v_{ij} = w_j\, r_{ij}`,
  },
  'topsis.idealBest': {
    en: 'Ideal solution: the best weighted value per criterion (benefit max, cost min).',
    tr: 'İdeal çözüm: her kriterin en iyi ağırlıklı değeri (faydada maks, maliyette min).',
    tex: String.raw`A_j^{+} = \begin{cases} \max_i v_{ij} & j \in J^{+} \\ \min_i v_{ij} & j \in J^{-} \end{cases}`,
  },
  'topsis.idealWorst': {
    en: 'Negative-ideal solution: the worst weighted value of each criterion.',
    tr: 'Negatif ideal çözüm: her kriterin en kötü ağırlıklı değeri.',
    tex: String.raw`A_j^{-} = \begin{cases} \min_i v_{ij} & j \in J^{+} \\ \max_i v_{ij} & j \in J^{-} \end{cases}`,
  },
  'topsis.distanceBest': {
    en: 'Euclidean distance of each alternative to the ideal solution.',
    tr: 'Her alternatifin ideal çözüme Öklid uzaklığı.',
    tex: String.raw`D_i^{+} = \sqrt{\sum_{j=1}^{n} \left(v_{ij} - A_j^{+}\right)^2}`,
  },
  'topsis.distanceWorst': {
    en: 'Euclidean distance of each alternative to the negative-ideal solution.',
    tr: 'Her alternatifin negatif ideal çözüme Öklid uzaklığı.',
    tex: String.raw`D_i^{-} = \sqrt{\sum_{j=1}^{n} \left(v_{ij} - A_j^{-}\right)^2}`,
  },
  'topsis.closeness': {
    en: 'Relative closeness to the ideal solution, between 0 and 1; higher ranks better.',
    tr: 'İdeal çözüme göreli yakınlık, 0 ile 1 arasında; yüksek olan önde sıralanır.',
    tex: String.raw`C_i = \frac{D_i^{-}}{D_i^{+} + D_i^{-}}`,
    edgeCase: {
      en: 'If both distances are 0, the alternative gets 0.5: a tie, not last.',
      tr: 'İki uzaklık da 0 ise alternatif 0,5 alır: sonuncu değil, eşitlik.',
    },
  },
  'saw.normalizedLinearMax': {
    en: 'Linear max normalized matrix: the best value of each column becomes 1.',
    tr: 'Doğrusal maks normalize matris: her sütunun en iyi değeri 1 olur.',
    tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij}}{\max_i x_{ij}} & j \in J^{+} \\[2ex] \dfrac{\min_i x_{ij}}{x_{ij}} & j \in J^{-} \end{cases}, \qquad x_{ij} > 0`,
  },
  'saw.normalizedSum': {
    en: 'Sum normalized matrix: each column becomes shares that add up to 1.',
    tr: 'Toplam normalize matris: her sütun toplamı 1 olan paylara dönüşür.',
    tex: String.raw`r_{ij} = \begin{cases} \dfrac{x_{ij}}{\sum_{k=1}^{m} x_{kj}} & j \in J^{+} \\[2ex] \dfrac{1 / x_{ij}}{\sum_{k=1}^{m} 1 / x_{kj}} & j \in J^{-} \end{cases}, \qquad x_{ij} > 0`,
  },
  'saw.weighted': {
    en: 'Contributions: each normalized value multiplied by its criterion weight.',
    tr: 'Katkılar: her normalize değer kendi kriter ağırlığıyla çarpılır.',
    tex: String.raw`v_{ij} = w_j\, r_{ij}`,
  },
  'saw.scores': {
    en: 'Score: the sum of the contributions; higher ranks better.',
    tr: 'Skor: katkıların toplamı; yüksek olan önde sıralanır.',
    tex: String.raw`S_i = \sum_{j=1}^{n} v_{ij} = \sum_{j=1}^{n} w_j\, r_{ij}`,
  },
  'vikor.best': {
    en: 'Best value of each criterion: largest for benefit, smallest for cost.',
    tr: 'Her kriterin en iyi değeri: faydada en büyük, maliyette en küçük.',
    tex: String.raw`f_j^{*} = \begin{cases} \max_i x_{ij} & j \in J^{+} \\ \min_i x_{ij} & j \in J^{-} \end{cases}`,
  },
  'vikor.worst': {
    en: 'Worst value of each criterion: the opposite end of its column.',
    tr: 'Her kriterin en kötü değeri: sütununun öbür ucu.',
    tex: String.raw`f_j^{-} = \begin{cases} \min_i x_{ij} & j \in J^{+} \\ \max_i x_{ij} & j \in J^{-} \end{cases}`,
  },
  'vikor.weightedDistance': {
    en: 'Weighted distance to the best: 0 at the best, the weight at the worst.',
    tr: 'En iyiye ağırlıklı uzaklık: en iyi değerde 0, en kötüde ağırlığın kendisi.',
    tex: String.raw`d_{ij} = w_j\, \frac{f_j^{*} - x_{ij}}{f_j^{*} - f_j^{-}}`,
    edgeCase: {
      en: 'A constant column (best = worst) gets 0 in every row.',
      tr: 'Sabit bir sütun (en iyi = en kötü) her satırda 0 alır.',
    },
  },
  'vikor.groupUtility': {
    en: 'Group utility S: the sum of the distances; lower is better.',
    tr: 'Grup faydası S: uzaklıkların toplamı; küçük olan iyidir.',
    tex: String.raw`S_i = \sum_{j=1}^{n} d_{ij}`,
  },
  'vikor.individualRegret': {
    en: 'Individual regret R: the largest single distance; lower is better.',
    tr: 'Bireysel pişmanlık R: en büyük tek uzaklık; küçük olan iyidir.',
    tex: String.raw`R_i = \max_{j} d_{ij}`,
  },
  'vikor.q': {
    en: 'Compromise index Q, between 0 and 1; lower ranks better.',
    tr: 'Uzlaşı indeksi Q, 0 ile 1 arasında; küçük olan önde sıralanır.',
    tex: String.raw`Q_i = v\, \frac{S_i - S^{*}}{S^{-} - S^{*}} + (1 - v)\, \frac{R_i - R^{*}}{R^{-} - R^{*}}, \qquad S^{*} = \min_i S_i,\ S^{-} = \max_i S_i`,
    edgeCase: {
      en: 'If every S (or every R) is equal, that term is 0.',
      tr: 'Bütün S (ya da bütün R) değerleri eşitse o terim 0 olur.',
    },
  },
  'vikor.threshold': {
    en: 'Advantage threshold DQ: the Q gap the leader needs over the runner-up.',
    tr: 'Avantaj eşiği DQ: liderin ikinciye karşı gereken Q farkı.',
    tex: String.raw`DQ = \frac{1}{m - 1}, \qquad Q(a'') - Q(a') \ge DQ`,
  },
  'edas.average': {
    en: 'Average solution: the mean of each criterion over all alternatives.',
    tr: 'Ortalama çözüm: her kriterin bütün alternatifler üzerinden ortalaması.',
    tex: String.raw`AV_j = \frac{1}{m} \sum_{i=1}^{m} x_{ij}`,
    edgeCase: {
      en: 'A varying column with an average of 0 or below is a blocking error.',
      tr: 'Ortalaması 0 ya da altında olan değişken bir sütun engelleyici hatadır.',
    },
  },
  'edas.pda': {
    en: 'Positive distance: how far better than the average, as a share of it.',
    tr: 'Ortalamadan pozitif uzaklık: ortalamadan ne kadar iyi, ortalamanın oranı olarak.',
    tex: String.raw`PDA_{ij} = \begin{cases} \dfrac{\max(0,\ x_{ij} - AV_j)}{AV_j} & j \in J^{+} \\[2ex] \dfrac{\max(0,\ AV_j - x_{ij})}{AV_j} & j \in J^{-} \end{cases}`,
    edgeCase: {
      en: 'A constant column gets exactly 0 in every row.',
      tr: 'Sabit bir sütun her satırda tam 0 alır.',
    },
  },
  'edas.nda': {
    en: 'Negative distance: how far worse than the average, as a share of it.',
    tr: 'Ortalamadan negatif uzaklık: ortalamadan ne kadar kötü, ortalamanın oranı olarak.',
    tex: String.raw`NDA_{ij} = \begin{cases} \dfrac{\max(0,\ AV_j - x_{ij})}{AV_j} & j \in J^{+} \\[2ex] \dfrac{\max(0,\ x_{ij} - AV_j)}{AV_j} & j \in J^{-} \end{cases}`,
    edgeCase: {
      en: 'A constant column gets exactly 0 in every row.',
      tr: 'Sabit bir sütun her satırda tam 0 alır.',
    },
  },
  'edas.weightedPda': {
    en: 'Weighted positive distances: each criterion\'s share of SP.',
    tr: 'Ağırlıklı pozitif uzaklıklar: her kriterin SP içindeki payı.',
    tex: String.raw`w_j\, PDA_{ij}`,
  },
  'edas.weightedNda': {
    en: 'Weighted negative distances: each criterion\'s share of SN.',
    tr: 'Ağırlıklı negatif uzaklıklar: her kriterin SN içindeki payı.',
    tex: String.raw`w_j\, NDA_{ij}`,
  },
  'edas.sp': {
    en: 'SP: the weighted sum of the positive distances.',
    tr: 'SP: pozitif uzaklıkların ağırlıklı toplamı.',
    tex: String.raw`SP_i = \sum_{j=1}^{n} w_j\, PDA_{ij}`,
  },
  'edas.sn': {
    en: 'SN: the weighted sum of the negative distances.',
    tr: 'SN: negatif uzaklıkların ağırlıklı toplamı.',
    tex: String.raw`SN_i = \sum_{j=1}^{n} w_j\, NDA_{ij}`,
  },
  'edas.nsp': {
    en: 'NSP: SP divided by the largest SP; 1 for the furthest above average.',
    tr: 'NSP: SP bölü en büyük SP; ortalamanın en çok üstünde olana 1.',
    tex: String.raw`NSP_i = \frac{SP_i}{\max_k SP_k}`,
    edgeCase: {
      en: 'If every SP is 0, NSP is 0 for all.',
      tr: 'Bütün SP değerleri 0 ise herkesin NSP değeri 0 olur.',
    },
  },
  'edas.nsn': {
    en: 'NSN: 1 minus SN over the largest SN; 0 for the furthest below average.',
    tr: 'NSN: 1 eksi SN bölü en büyük SN; ortalamanın en çok altında olana 0.',
    tex: String.raw`NSN_i = 1 - \frac{SN_i}{\max_k SN_k}`,
    edgeCase: {
      en: 'If every SN is 0, NSN is 1 for all.',
      tr: 'Bütün SN değerleri 0 ise herkesin NSN değeri 1 olur.',
    },
  },
  'edas.scores': {
    en: 'Appraisal score AS, between 0 and 1; higher ranks better.',
    tr: 'Değerlendirme skoru AS, 0 ile 1 arasında; yüksek olan önde sıralanır.',
    tex: String.raw`AS_i = \tfrac{1}{2}\left(NSP_i + NSN_i\right)`,
    edgeCase: {
      en: 'If no alternative is away from the average, every AS is 0.5.',
      tr: 'Hiçbir alternatif ortalamadan uzak değilse bütün AS değerleri 0,5 olur.',
    },
  },
}

export const STEP_KEYS = Object.keys(stepContent) as StepKey[]

export const isStepKey = (key: string): key is StepKey => Object.hasOwn(stepContent, key)
