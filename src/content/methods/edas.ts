import type { MethodContent } from '../types'

// Source: docs/research/methods/edas.md
export const edas: MethodContent = {
  id: 'edas',
  name: { en: 'EDAS', tr: 'EDAS' },
  fullName: { en: 'Evaluation based on Distance from Average Solution', tr: 'Ortalama çözüme uzaklığa dayalı değerlendirme' },
  family: 'ranking-distance',
  status: 'available',
  year: 2015,
  origin: {
    authors: 'Keshavarz Ghorabaee, M.; Zavadskas, E.K.; Olfat, L.; Turskis, Z.',
    year: 2015,
    title: 'Multi-Criteria Inventory Classification Using a New Method of Evaluation Based on Distance from Average Solution (EDAS)',
    venue: 'Informatica 26(3), 435-451',
    doi: '10.15388/Informatica.2015.57',
  },
  steps: [
    {
      title: { en: 'Average solution', tr: 'Ortalama çözüm' },
      tex: String.raw`AV_j = \frac{1}{m}\sum_{i=1}^{m} x_{ij}`,
    },
    {
      title: { en: 'Positive and negative distance from average', tr: 'Ortalamadan pozitif ve negatif uzaklık' },
      tex: String.raw`PDA_{ij} = \frac{\max\left(0,\ x_{ij} - AV_j\right)}{AV_j}, \qquad NDA_{ij} = \frac{\max\left(0,\ AV_j - x_{ij}\right)}{AV_j}`,
      note: {
        en: 'For benefit criteria; for cost criteria the two numerators swap.',
        tr: 'Fayda kriterleri için; maliyet kriterlerinde iki pay yer değiştirir.',
      },
    },
    {
      title: { en: 'Weighted sums', tr: 'Ağırlıklı toplamlar' },
      tex: String.raw`SP_i = \sum_{j=1}^{n} w_j\, PDA_{ij}, \qquad SN_i = \sum_{j=1}^{n} w_j\, NDA_{ij}`,
    },
    {
      title: { en: 'Normalization', tr: 'Normalizasyon' },
      tex: String.raw`NSP_i = \frac{SP_i}{\max_k SP_k}, \qquad NSN_i = 1 - \frac{SN_i}{\max_k SN_k}`,
      note: {
        en: 'If no alternative is away from the average (every SP and SN is 0), every AS is set to 0.5.',
        tr: 'Hiçbir alternatif ortalamadan uzak değilse (bütün SP ve SN değerleri 0), bütün AS değerleri 0,5 alınır.',
      },
    },
    {
      title: { en: 'Appraisal score', tr: 'Değerlendirme skoru' },
      tex: String.raw`AS_i = \frac{1}{2}\left(NSP_i + NSN_i\right), \qquad 0 \le AS_i \le 1`,
      note: {
        en: 'Rank by decreasing AS.',
        tr: 'AS değerine göre büyükten küçüğe sıralanır.',
      },
    },
  ],
  combinedWith: [
    {
      methodId: 'entropy',
      text: {
        en: 'Entropy then EDAS in Turkish papers, for example Aydın Ünal (2019) on BIST insurers and Sarıhan & Aydın (2023) on exporters.',
        tr: 'Türkçe makalelerde Entropi ardından EDAS; örneğin Aydın Ünal (2019) BIST sigorta şirketleri, Sarıhan ve Aydın (2023) ihracatçılar.',
      },
    },
    {
      methodId: 'critic',
      text: {
        en: 'CRITIC then EDAS, for example Bayram (2021) on participation banks.',
        tr: 'CRITIC ardından EDAS; örneğin Bayram (2021), katılım bankaları.',
      },
    },
    {
      methodId: 'ahp',
      text: {
        en: 'AHP is the weighting method most often mentioned with EDAS in OpenAlex (223 works, an upper bound), for example fuzzy AHP then EDAS in Ecer (2017).',
        tr: "OpenAlex'te EDAS ile en sık birlikte geçen ağırlıklandırma yöntemi AHP (223 çalışma, bir üst sınır); örneğin Ecer (2017) bulanık AHP ardından EDAS.",
      },
    },
    {
      methodId: 'lopcow',
      text: {
        en: 'LOPCOW then EDAS appears in several of the first LOPCOW applications (Keleş 2023, Table 1).',
        tr: 'LOPCOW ardından EDAS, ilk LOPCOW uygulamalarının birçoğunda görülür (Keleş 2023, Tablo 1).',
      },
    },
    {
      methodId: 'equal',
      text: {
        en: "The origin's 47-item example uses equal weights; its 10-alternative example uses seven hand-set weight sets.",
        tr: 'Özgün makalenin 47 kalemli örneği eşit ağırlık, 10 alternatifli örneği elle belirlenmiş yedi ağırlık seti kullanır.',
      },
    },
    {
      methodId: 'vikor',
      text: {
        en: 'The origin compares EDAS with VIKOR, TOPSIS, SAW and COPRAS on one matrix and seven weight sets (Spearman at least 0.867 with each).',
        tr: "Özgün makale EDAS'ı tek bir matris ve yedi ağırlık setinde VIKOR, TOPSIS, SAW ve COPRAS ile karşılaştırır (her biriyle Spearman en az 0,867).",
      },
    },
  ],
  reference: {
    source: 'Keshavarz Ghorabaee, M.; Zavadskas, E.K.; Olfat, L.; Turskis, Z. (2015). Multi-Criteria Inventory Classification Using a New Method of Evaluation Based on Distance from Average Solution (EDAS). Informatica 26(3), 435-451',
    doi: '10.15388/Informatica.2015.57',
    match: 'match',
    note: {
      en: 'Published examples, reproduced by the tests: in the 47-item example (Tables 1-3) the averages and all 517 cells of Table 2 (PDA, NDA, SP, NSP, SN, NSN, AS) match once rounded to 3 and then 2 decimals, as the paper did, and the A and B classes of Table 3 are the same. In the 10 x 7 example (Tables 5-7) the ranks equal the published EDAS ranks in 7 of 7 weight sets. Two Turkish Entropy-EDAS papers are checked too; both print errors, recorded with the corrected values.',
      tr: "Yayımlanmış örnekler, testlerde yeniden üretiliyor: 47 kalemli örnekte (Tablo 1-3) ortalamalar ve Tablo 2'nin 517 hücresinin tamamı (PDA, NDA, SP, NSP, SN, NSN, AS), makalenin yaptığı gibi önce 3 sonra 2 basamağa yuvarlanınca aynı; Tablo 3'ün A ve B sınıfları da aynı. 10 x 7 örnekte (Tablo 5-7) sıralar yayımlanan EDAS sıralarıyla 7 ağırlık setinin 7'sinde aynı. İki Türkçe Entropi-EDAS makalesi de sınandı; ikisinde de baskı hatası var, düzeltilmiş değerleriyle kayıtlı.",
    },
  },
  sources: [
    { label: 'Keshavarz Ghorabaee, Zavadskas, Olfat & Turskis (2015), Informatica 26(3), 435-451', doi: '10.15388/Informatica.2015.57' },
    { label: 'Aydın Ünal (2019), Entropi-EDAS, BIST insurers', doi: '10.29106/fesa.649946' },
    { label: 'Sarıhan & Aydın (2023), Entropi-EDAS, exporters', doi: '10.46928/iticusbe.1263122' },
    { label: 'Bayram (2021), CRITIC-EDAS, participation banks', doi: '10.14784/marufacd.879171' },
    { label: 'Ecer (2017), fuzzy AHP-EDAS, Technological and Economic Development of Economy', doi: '10.3846/20294913.2016.1213207' },
    { label: 'Torkayesh, Deveci, Karagöz & Antuchevičienė (2023), EDAS review, Expert Systems with Applications 119724', doi: '10.1016/j.eswa.2023.119724' },
    { label: 'pyDecision 5.1.1, edas_method', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'EDAS scores each alternative by how far it is above or below the average of all alternatives on each criterion, weighted by criterion importance.',
    whenToUse: [
      'Every criterion is a positive measured quantity with a meaningful average.',
      'Many alternatives, for example inventory (ABC) classification.',
      'No single best or worst alternative should set the scale.',
    ],
    whenNot: [
      "A criterion's average is 0 or below: distances divide by it.",
      'Shifted or interval data (z-scores, °C): the result depends on zero.',
      'The alternative set will change: the average moves with it.',
    ],
    inputs: [
      'Decision matrix; zeros are fine, negative values only with a notice and while the column average is above 0.',
      'Criterion type per column, weights summing to 1. Scaling all weights by the same factor does not change AS.',
      'No parameters.',
    ],
    pitfalls: [
      'A criterion that varies a lot relative to its own average moves AS more than its weight suggests.',
      'A column average of 0 or below is a blocking error; with negative values an average near 0 inflates the distances, with a notice.',
      'Rank reversal when alternatives are added or removed: the average moves.',
    ],
  },
  tr: {
    summary:
      'EDAS her alternatifi, her kriterde tüm alternatiflerin ortalamasının ne kadar üstünde ya da altında olduğuna göre, kriter ağırlıklarıyla puanlar.',
    whenToUse: [
      'Her kriter, ortalaması anlamlı, pozitif ve ölçülmüş bir büyüklük.',
      'Alternatif çok, örneğin stok (ABC) sınıflandırması.',
      'Ölçeği tek bir en iyi ya da en kötü alternatif belirlemesin.',
    ],
    whenNot: [
      'Bir kriterin ortalaması 0 ya da altında: uzaklıklar ortalamaya bölünür.',
      'Kaydırılmış ya da aralık ölçekli veri (z-skoru, °C): sonuç sıfıra bağlı.',
      'Alternatif kümesi değişecek: ortalama da onunla kayar.',
    ],
    inputs: [
      "Karar matrisi; sıfır olabilir, negatif değerler yalnız sütun ortalaması 0'dan büyükken ve uyarıyla.",
      "Her sütun için kriter türü, toplamı 1 olan ağırlıklar. Tüm ağırlıkları aynı çarpanla ölçeklemek AS'yi değiştirmez.",
      'Parametre yok.',
    ],
    pitfalls: [
      "Kendi ortalamasına göre çok değişken bir kriter, AS'yi ağırlığının gösterdiğinden fazla etkiler.",
      "Ortalaması 0 ya da altında olan sütun engelleyici hatadır; negatif değerlerle 0'a yakın bir ortalama uzaklıkları şişirir, uyarı verilir.",
      'Alternatif eklenip çıkarılınca sıralama tersine dönebilir: ortalama kayar.',
    ],
  },
}
