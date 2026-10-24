import type { MethodContent } from '../types'

// Source: docs/research/methods/aras.md
export const aras: MethodContent = {
  id: 'aras',
  name: { en: 'ARAS', tr: 'ARAS' },
  fullName: { en: 'Additive Ratio ASsessment', tr: 'Toplamsal oran değerlendirmesi' },
  family: 'ranking-utility',
  status: 'available',
  year: 2010,
  origin: {
    authors: 'Zavadskas, E.K.; Turskis, Z.',
    year: 2010,
    title: 'A new additive ratio assessment (ARAS) method in multicriteria decision-making',
    venue: 'Technological and Economic Development of Economy 16(2), 159-172',
    doi: '10.3846/tede.2010.10',
  },
  steps: [
    {
      title: { en: 'Add the optimal benchmark row', tr: 'Optimal kıyas satırının eklenmesi' },
      tex: String.raw`x_{0j} = \begin{cases} \max_{1 \le i \le m} x_{ij} & j \in J^{+} \\ \min_{1 \le i \le m} x_{ij} & j \in J^{-} \end{cases}`,
      note: {
        en: 'Row 0 takes the column best on each criterion (maximum for benefit, minimum for cost), or an external target row when given.',
        tr: '0. satır her kriterde sütunun en iyisini (faydada maksimum, maliyette minimum) ya da dışarıdan verilen bir hedef satırını alır.',
      },
    },
    {
      title: { en: 'Invert cost criteria and normalize each extended column', tr: 'Maliyet kriterlerini ters çevirme ve genişletilmiş sütun normalizasyonu' },
      tex: String.raw`\bar{x}_{ij} = \frac{x^{*}_{ij}}{\sum_{k=0}^{m} x^{*}_{kj}}, \qquad x^{*}_{ij} = \begin{cases} x_{ij} & j \in J^{+} \\[1ex] \dfrac{1}{x_{ij}} & j \in J^{-} \end{cases}`,
      note: {
        en: 'The column sum in the denominator runs from row 0 through row m, so the optimal row takes part of each column total.',
        tr: 'Paydadaki sütun toplamı 0. satırdan m. satıra kadar uzanır; böylece optimal satır da her sütun toplamından pay alır.',
      },
    },
    {
      title: { en: 'Weight the normalized matrix', tr: 'Normalize matrisin ağırlıklandırılması' },
      tex: String.raw`\hat{x}_{ij} = w_j\, \bar{x}_{ij}, \qquad i = 0, \dots, m`,
    },
    {
      title: { en: 'Optimality function per row', tr: 'Satır başına optimallik fonksiyonu' },
      tex: String.raw`S_i = \sum_{j=1}^{n} \hat{x}_{ij}, \qquad i = 0, \dots, m`,
      note: {
        en: 'Row 0 gives the optimal benchmark total S0, and rows 1 to m give each alternative total Si.',
        tr: '0. satır optimal kıyas toplamı S0 değerini, 1 ile m arasındaki satırlar ise her alternatifin Si toplamını verir.',
      },
    },
    {
      title: { en: 'Utility degree and ranking', tr: 'Fayda derecesi ve sıralama' },
      tex: String.raw`K_i = \frac{S_i}{S_0}, \qquad i = 1, \dots, m`,
      note: {
        en: 'Each alternative is scored as its share of the optimal benchmark S0 and ranked from highest K to lowest.',
        tr: 'Her alternatif, optimal kıyas skoru S0 içindeki payına göre puanlanır ve en yüksek K değerinden en düşüğe doğru sıralanır.',
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'entropy',
      text: {
        en: 'Bakır & Atalık (2018) weight seven airline service-quality criteria with Entropy and rank eleven airlines with ARAS.',
        tr: 'Bakır ve Atalık (2018), yedi havayolu hizmet kalitesi kriterini Entropi ile ağırlıklandırıp on bir havayolunu ARAS ile sıralar.',
      },
    },
    {
      methodId: 'ahp',
      text: {
        en: 'Aytaç Adalı & Tuş Işık (2016) pair AHP weights with ARAS and COPRAS; the 2010 origin paper uses expert weights from 38 specialists.',
        tr: 'Aytaç Adalı ve Tuş Işık (2016) AHP ağırlıklarını ARAS ve COPRAS ile eşleştirir; 2010 özgün makalesi ise 38 uzmanın ağırlıklarını kullanır.',
      },
    },
    {
      methodId: 'saw',
      text: {
        en: 'Adding row 0 to each column sum scales criterion j by 1 / (1 + p0j), so ARAS can rank alternatives differently from SAW.',
        tr: '0. satırı her sütun toplamına katmak j kriterini 1 / (1 + p0j) ile ölçekler; bu yüzden ARAS, SAW yönteminden farklı bir sıralama üretebilir.',
      },
    },
  ],
  reference: {
    source:
      'Bakır, M.; Atalık, Ö. (2018). Entropi ve Aras Yöntemleriyle Havayolu İşletmelerinde Hizmet Kalitesinin Değerlendirilmesi. İşletme Araştırmaları Dergisi 10(1), 617-638',
    doi: '10.20491/isarder.2018.410',
    match: 'match',
    note: {
      en: "Published example, reproduced by the tests: eleven airlines on seven Skytrax service-quality criteria with Entropy weights (Tables 3, 7, 8-11). S0 = 0.099651, all eleven Si and Ki values in Table 11 match within 0.00002, and all eleven ranks match; our Entropy also reproduces Table 7's weights. (Tables 9 and 10 accidentally reprint the A0 row on the THY line, while Table 11 uses THY's true row.) Also tested: Zavadskas & Turskis (2010, Tables 1-3, fourteen office rooms on six criteria), where Table 2 entered room 8's illumination as 390 lx (room 1) instead of 400 lx, swapping rooms 8 and 9; with the Table 1 data, room 8 ranks first under both the paper's target norms (K8 = 0.7762) and the column-best benchmark (K8 = 0.9485).",
      tr: "Yayımlanmış örnek, testlerde yeniden üretiliyor: Entropi ağırlıklarıyla yedi Skytrax hizmet kalitesi kriterinde on bir havayolu (Tablo 3, 7, 8-11). S0 = 0,099651 ile Tablo 11'deki on bir Si ve Ki değerinin tamamı 0,00002 farkla, on bir sıranın tamamı ise birebir örtüşüyor; bizim Entropi yöntemimiz de Tablo 7 ağırlıklarını veriyor. (Tablo 9 ve 10'da THY satırına sehven A0 satırı yeniden basılmış, Tablo 11 ise THY'nin gerçek satırıyla hesaplanmıştır.) Ayrıca sınananlar: Zavadskas ve Turskis (2010, Tablo 1-3, altı kriterde on dört ofis odası); burada Tablo 2'de 8. odanın aydınlatması 400 lx yerine 390 lx (1. oda) girildiği için 8. ve 9. odalar yer değiştirmiştir; Tablo 1 verisiyle hem makalenin hedef normlarında (K8 = 0,7762) hem de sütun en iyisi kıyas satırında (K8 = 0,9485) 8. oda birinci çıkar.",
    },
  },
  sources: [
    {
      label: 'Zavadskas, E.K. & Turskis, Z. (2010), Technological and Economic Development of Economy 16(2), 159-172 (Tables 1-3)',
      doi: '10.3846/tede.2010.10',
    },
    {
      label: 'Bakır, M. & Atalık, Ö. (2018), İşletme Araştırmaları Dergisi 10(1), 617-638 (Eqs. 1-11, Tables 3-11)',
      doi: '10.20491/isarder.2018.410',
    },
    {
      label: 'Aytaç Adalı, E. & Tuş Işık, A. (2016), Manas Journal of Social Studies 5(2), 124-138 (Eqs. 9-15, Tables 1, 5-8)',
      url: 'https://dergipark.org.tr/en/download/article-file/577434',
    },
    {
      label: 'Keshavarz Ghorabaee, M. et al. (2016), CODAS, Economic Computation and Economic Cybernetics Studies and Research 50(3), 25-44 (Example 2)',
      url: 'https://ideas.repec.org/a/cys/ecocyb/v50y2016i3p25-44.html',
    },
    { label: 'pyDecision, aras_method', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      "ARAS adds an optimal benchmark row built from the best value on each criterion, totals every row's weighted shares, and scores each alternative as its fraction of that optimal total.",
    whenToUse: [
      'All values are positive and you want a share-of-optimum score.',
      'You want results comparable with the Entropy, AHP or SWARA ARAS literature.',
    ],
    whenNot: [
      'The data contain zero or negative values.',
      'Cost criteria must be treated linearly rather than with 1/x.',
      'Data are on an interval scale where ratios are meaningless.',
    ],
    inputs: [
      'Decision matrix with strictly positive values.',
      'Criterion type per column: benefit or cost.',
      'Weights summing to 1.',
    ],
    pitfalls: [
      'Cost criteria use 1/x, so zeros are blocked and very small cost values dominate their column.',
      'Adding the optimal row to each column sum reweights criteria by their spread, so rankings can differ from SAW.',
      'Adding or removing an alternative changes column sums and can reverse close ranks.',
    ],
  },
  tr: {
    summary:
      'ARAS tabloya her kriterin en iyi değerinden oluşan optimal bir kıyas satırı ekler, tüm satırların ağırlıklı paylarını toplar ve her alternatifi bu optimal toplamın oranı olarak puanlar.',
    whenToUse: [
      'Tüm değerler pozitif ve optimumun payı olarak okunan bir skor istiyorsunuz.',
      'Sonuçların Entropi, AHP ya da SWARA tabanlı ARAS çalışmalarıyla karşılaştırılabilir olmasını istiyorsunuz.',
    ],
    whenNot: [
      'Verilerde sıfır ya da negatif değerler var.',
      'Maliyet kriterlerinin 1/x yerine doğrusal ele alınması gerekiyor.',
      'Veriler oranların anlam taşımadığı aralık ölçeğinde.',
    ],
    inputs: [
      'Tüm değerleri kesinlikle pozitif olan karar matrisi.',
      'Her sütun için kriter türü: fayda ya da maliyet.',
      'Toplamı 1 olan ağırlıklar.',
    ],
    pitfalls: [
      'Maliyet kriterleri 1/x kullanır; bu yüzden sıfırlar engellenir ve çok küçük maliyet değerleri sütuna baskın çıkar.',
      "Optimal satırı her sütun toplamına katmak kriterleri yayılımlarına göre yeniden ağırlıklandırır; bu yüzden sıralama SAW'dan ayrışabilir.",
      'Alternatif eklemek ya da çıkarmak sütun toplamlarını değiştirir ve yakın sıraları tersine çevirebilir.',
    ],
  },
}
