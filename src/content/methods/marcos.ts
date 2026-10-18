import type { MethodContent } from '../types'

// Source: docs/research/methods/marcos.md
export const marcos: MethodContent = {
  id: 'marcos',
  name: { en: 'MARCOS', tr: 'MARCOS' },
  fullName: {
    en: 'Measurement of Alternatives and Ranking according to COmpromise Solution',
    tr: 'Alternatiflerin ölçümü ve uzlaşık çözüme göre sıralama',
  },
  family: 'ranking-utility',
  status: 'available',
  year: 2020,
  origin: {
    authors: 'Stević, Ž.; Pamučar, D.; Puška, A.; Chatterjee, P.',
    year: 2020,
    title: 'Sustainable supplier selection in healthcare industries using a new MCDM method: Measurement of alternatives and ranking according to COmpromise solution (MARCOS)',
    venue: 'Computers & Industrial Engineering 140, 106231',
    doi: '10.1016/j.cie.2019.106231',
    note: {
      en: "Paywalled; not opened. The formulas follow the first author's open restatement (Stević & Brković 2020, Eqs. 1-12), checked against Madenoğlu (2020).",
      tr: 'Ücretli erişimde, açılmadı. Formüller ilk yazarın açık erişimli yeniden anlatımını (Stević ve Brković 2020, Denklem 1-12) izler, Madenoğlu (2020) ile karşılaştırıldı.',
    },
  },
  steps: [
    {
      title: { en: 'Add ideal and anti-ideal rows', tr: 'İdeal ve anti-ideal satırların eklenmesi' },
      tex: String.raw`AI_j = \begin{cases} \max_i x_{ij} & j \in J^{+} \\ \min_i x_{ij} & j \in J^{-} \end{cases} \qquad AAI_j = \begin{cases} \min_i x_{ij} & j \in J^{+} \\ \max_i x_{ij} & j \in J^{-} \end{cases}`,
    },
    {
      title: { en: 'Normalize against the ideal', tr: 'İdeale göre normalizasyon' },
      tex: String.raw`n_{ij} = \begin{cases} \dfrac{x_{ij}}{AI_j} & j \in J^{+} \\[2ex] \dfrac{AI_j}{x_{ij}} & j \in J^{-} \end{cases}`,
      note: {
        en: 'Applied to the AI and AAI rows as well.',
        tr: 'AI ve AAI satırlarına da uygulanır.',
      },
    },
    {
      title: { en: 'Weighted sums', tr: 'Ağırlıklı toplamlar' },
      tex: String.raw`S_i = \sum_{j=1}^{n} w_j\, n_{ij}, \qquad K_i^{-} = \frac{S_i}{S_{aai}}, \qquad K_i^{+} = \frac{S_i}{S_{ai}}`,
      note: {
        en: 'S_aai and S_ai are the same sums for the two imaginary rows; with weights summing to 1, S_ai = 1.',
        tr: 'S_aai ve S_ai iki hayali satırın aynı toplamlarıdır; ağırlıkların toplamı 1 ise S_ai = 1.',
      },
    },
    {
      title: { en: 'Utility functions', tr: 'Fayda fonksiyonları' },
      tex: String.raw`f(K_i^{-}) = \frac{K_i^{+}}{K_i^{+} + K_i^{-}}, \qquad f(K_i^{+}) = \frac{K_i^{-}}{K_i^{+} + K_i^{-}}`,
      note: {
        en: 'Both are the same number for every alternative, so they are shown once.',
        tr: 'İkisi de her alternatif için aynı sayıdır, bu yüzden bir kez gösterilir.',
      },
    },
    {
      title: { en: 'Final utility', tr: 'Nihai fayda' },
      tex: String.raw`f(K_i) = \frac{K_i^{+} + K_i^{-}}{1 + \dfrac{1 - f(K_i^{+})}{f(K_i^{+})} + \dfrac{1 - f(K_i^{-})}{f(K_i^{-})}}`,
      note: {
        en: 'Rank by decreasing f(K); f(K) = c S with one c for the whole table, so the order is that of SAW (Linear).',
        tr: "f(K) değerine göre büyükten küçüğe sıralanır; tüm tablo için tek bir c ile f(K) = c S olduğundan sıra SAW (Doğrusal) sırasıdır.",
      },
    },
  ],
  combinedWith: [
    {
      text: {
        en: 'FUCOM weights, then MARCOS: Stević & Brković (2020), the example used here.',
        tr: 'FUCOM ağırlıkları, ardından MARCOS: Stević ve Brković (2020); buradaki örnek budur.',
      },
    },
    {
      methodId: 'ahp',
      text: {
        en: 'AHP weights, then MARCOS: Madenoğlu (2020), the second test example.',
        tr: 'AHP ağırlıkları, ardından MARCOS: Madenoğlu (2020), ikinci test örneği.',
      },
    },
    {
      methodId: 'critic',
      text: {
        en: 'CRITIC is the weighting most often paired with MARCOS (Demir et al. 2024, from a search snippet).',
        tr: 'MARCOS ile en sık eşleşen ağırlıklandırma CRITIC (Demir vd. 2024, yalnız arama özeti).',
      },
    },
    {
      methodId: 'saw',
      text: {
        en: 'Same ranking as SAW with the Linear option, always; only the scale of the scores differs.',
        tr: 'Doğrusal seçenekli SAW ile her zaman aynı sıralama; yalnız skorların ölçeği farklı.',
      },
    },
  ],
  reference: {
    source: 'Stević, Ž.; Brković, N. (2020). A Novel Integrated FUCOM-MARCOS Model for Evaluation of Human Resources in a Transport Company. Logistics 4(1), 4',
    doi: '10.3390/logistics4010004',
    match: 'match',
    note: {
      en: "Published example, reproduced by the tests: 23 drivers, five criteria (two cost), FUCOM weights (Tables 2, 4, 5). All 23 f(K) values match the printed 3 decimals (largest gap 0.0006, from the paper's rounded divisor 0.470) and so do all 23 ranks. The paper applies the weights of C3 and C4 swapped against its own FUCOM figure; the test uses them as applied and records that the figure's weights move 9 ranks. Also tested: Madenoğlu (2020), six suppliers, 16 criteria, AHP weights, all ranks.",
      tr: "Yayımlanmış örnek, testlerde yeniden üretiliyor: 23 şoför, beş kriter (ikisi maliyet), FUCOM ağırlıkları (Tablo 2, 4, 5). 23 f(K) değerinin tamamı basılı 3 basamakta aynı (makalenin yuvarlanmış böleni 0,470 yüzünden en büyük fark 0,0006), 23 sıranın tamamı da aynı. Makale C3 ve C4 ağırlıklarını kendi FUCOM şekline göre yer değiştirmiş uyguluyor; test onları uygulandığı haliyle kullanıyor ve şekildeki ağırlıkların 9 sırayı değiştirdiğini kaydediyor. Ayrıca sınanan: Madenoğlu (2020), altı tedarikçi, 16 kriter, AHP ağırlıkları, tüm sıralar.",
    },
  },
  sources: [
    { label: 'Stević, Pamučar, Puška & Chatterjee (2020), Computers & Industrial Engineering 140, 106231 (not opened)', doi: '10.1016/j.cie.2019.106231' },
    { label: 'Stević & Brković (2020), Logistics 4(1), 4', doi: '10.3390/logistics4010004' },
    { label: 'Madenoğlu (2020), Economics Business and Organization Research 2(2), 99-120', url: 'https://dergipark.org.tr/tr/download/article-file/1432780' },
    { label: 'Demir, Chatterjee, Kadry, Abdelhadi & Pamučar (2024), Decision Making: Applications in Management and Engineering (search snippet only, not read)', doi: '10.31181/dmame7220241137' },
    { label: 'pyDecision 5.1.8, marcos_method', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'MARCOS adds an imaginary ideal row (the best value of every criterion) and an anti-ideal row (the worst) to the table, and scores each alternative by its weighted total against both.',
    whenToUse: [
      'All values are positive amounts.',
      'Results should read as closeness to the ideal, distance from the worst.',
      'Results should be comparable with FUCOM, CRITIC or AHP then MARCOS studies.',
    ],
    whenNot: [
      'As a second opinion next to SAW (Linear): same ranking.',
      'Zeros or negative values in the data (blocked, no shift).',
      'Interval data where zero is arbitrary.',
    ],
    inputs: [
      'Decision matrix, every value above 0.',
      'Criterion type per column, weights summing to 1.',
      'No parameters; the ideal and anti-ideal rows come from the data.',
    ],
    pitfalls: [
      'Same order as SAW with the Linear option; count it once, not as extra agreement.',
      'The authors replaced a zero with 0.001; the value you choose instead of zero changes the scores.',
      'f(K-) and f(K+) are one number each for the whole table, not information about an alternative.',
    ],
  },
  tr: {
    summary:
      'MARCOS tabloya hayali bir ideal satır (her kriterin en iyi değeri) ve anti-ideal satır (en kötüsü) ekler; her alternatifi ağırlıklı toplamının bu ikisine oranıyla puanlar.',
    whenToUse: [
      'Tüm değerler pozitif miktarlar.',
      'Sonucu ideale yakınlık ve en kötüden uzaklık diliyle anlatmak istiyorsunuz.',
      'FUCOM, CRITIC ya da AHP ardından MARCOS çalışmalarıyla karşılaştırılabilir olmalı.',
    ],
    whenNot: [
      'SAW (Doğrusal) yanında ikinci görüş olarak: sıralama aynıdır.',
      'Veride sıfır ya da negatif değer var (engellenir, kaydırma yok).',
      'Sıfırın keyfi olduğu aralık verisi.',
    ],
    inputs: [
      "Karar matrisi, her değer 0'dan büyük.",
      'Her sütun için kriter türü, toplamı 1 olan ağırlıklar.',
      'Parametre yok; ideal ve anti-ideal satırlar veriden gelir.',
    ],
    pitfalls: [
      'Sıra, Doğrusal seçenekli SAW ile aynıdır; bunu ek bir uzlaşı gibi değil, bir kez sayın.',
      'Yazarlar sıfır yerine 0,001 yazmıştır; sıfırın yerine seçtiğiniz değer skorları değiştirir.',
      'f(K-) ve f(K+) bütün tablo için birer sayıdır, bir alternatif hakkında bilgi taşımaz.',
    ],
  },
}
