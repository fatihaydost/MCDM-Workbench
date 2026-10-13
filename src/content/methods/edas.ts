import type { MethodContent } from '../types'

// Source: docs/research/methods/edas.md
export const edas: MethodContent = {
  id: 'edas',
  name: { en: 'EDAS', tr: 'EDAS' },
  fullName: { en: 'Evaluation based on Distance from Average Solution', tr: 'Ortalama çözüme uzaklığa dayalı değerlendirme' },
  family: 'ranking-distance',
  status: 'research',
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
        en: 'Entropy then EDAS appears in Turkish papers, for example Aydın Ünal (2019) on BIST insurers and Sarıhan & Aydın (2023) on exporters. Keshavarz-Ghorabaee et al. (2021) also review an Entropy-EDAS renewable-energy study.',
        tr: "Entropi ardından EDAS Türkçe makalelerde görülür; örneğin Aydın Ünal (2019) BIST sigorta şirketleri, Sarıhan ve Aydın (2023) ihracatçılar. Keshavarz-Ghorabaee vd. (2021) de Entropi-EDAS kullanan bir yenilenebilir enerji çalışmasını inceler.",
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
      methodId: 'lopcow',
      text: {
        en: 'LOPCOW then EDAS appears in several of the first LOPCOW applications (Keleş 2023, Table 1).',
        tr: 'LOPCOW ardından EDAS, ilk LOPCOW uygulamalarının birçoğunda görülür (Keleş 2023, Tablo 1).',
      },
    },
    {
      methodId: 'equal',
      text: {
        en: 'The origin example uses equal weights; a second example uses 7 simulated weight sets.',
        tr: 'Özgün örnek eşit ağırlık kullanır; ikinci örnekte 7 benzetim ağırlık seti vardır.',
      },
    },
  ],
  reference: {
    source: 'Keshavarz Ghorabaee, M.; Zavadskas, E.K.; Olfat, L.; Turskis, Z. (2015). Multi-Criteria Inventory Classification Using a New Method of Evaluation Based on Distance from Average Solution (EDAS). Informatica 26(3), 435-451',
    doi: '10.15388/Informatica.2015.57',
    match: 'match',
    note: {
      en: 'Published example (Tables 1-2 (47 items), Tables 5-7 (10 x 7, seven weight sets)); this method is not computed here yet, only recomputed during research. Inventory classification with 47 items and 3 criteria. AS matches the printed 2 decimals (largest gap 0.0052, at the edge of rounding; the paper rounded intermediate values). In the 10 x 7 example the ranks equal the published EDAS ranks in 7 of 7 weight sets.',
      tr: "Yayımlanmış örnek (Tablo 1-2 (47 kalem), Tablo 5-7 (10 x 7, yedi ağırlık seti)); bu yöntem sitede henüz hesaplanmıyor, yalnız araştırmada yeniden hesaplandı. 47 kalem ve 3 kriterle stok sınıflandırması. AS basılı 2 basamakta örtüşüyor (en büyük fark 0,0052, yuvarlama sınırında; makale ara değerleri yuvarlamış). 10 x 7 örnekte sıralar yayımlanan EDAS sıralarıyla 7 ağırlık setinin 7'sinde aynı.",
    },
  },
  sources: [
    { label: 'Keshavarz Ghorabaee, Zavadskas, Olfat & Turskis (2015), Informatica 26(3), 435-451', doi: '10.15388/Informatica.2015.57' },
    { label: 'Aydın Ünal (2019), Entropi-EDAS, BIST insurers', doi: '10.29106/fesa.649946' },
    { label: 'Sarıhan & Aydın (2023), Entropi-EDAS, exporters', doi: '10.46928/iticusbe.1263122' },
    { label: 'Bayram (2021), CRITIC-EDAS, participation banks', doi: '10.14784/marufacd.879171' },
    { label: 'pyDecision 5.1.1, edas_method', url: 'https://github.com/Valdecy/pyDecision' },
  ],
  en: {
    summary:
      'EDAS scores each alternative by its weighted distance above and below the average alternative. It suits cases where the average is a meaningful benchmark and no natural ideal exists.',
    whenToUse: [
      'Many alternatives, for example inventory (ABC) classification.',
      'No natural ideal point.',
      'Less sensitivity to one extreme alternative than ideal-point methods.',
    ],
    whenNot: [
      'A criterion average is 0 or below: distances divide by it.',
      'The average itself has no meaning (ordinal codes).',
      'The alternative set will change: the average moves with it.',
    ],
    inputs: [
      'Decision matrix, positive values recommended.',
      'Criterion type per column, weights summing to 1. Scaling all weights by the same factor does not change AS.',
      'No parameters.',
    ],
    pitfalls: [
      'AV = 0 divides by zero and a negative AV flips the meaning; use positive data or a declared shift.',
      'If no alternative is above (max SP = 0) or below (max SN = 0) average, NSP or NSN is undefined.',
      'Rank reversal when alternatives are added or removed.',
    ],
  },
  tr: {
    summary:
      'EDAS her alternatifi ortalama alternatifin üstündeki ve altındaki ağırlıklı uzaklığıyla puanlar. Ortalama anlamlı bir referanssa ve doğal bir ideal nokta yoksa uygundur.',
    whenToUse: [
      'Alternatif çok, örneğin stok (ABC) sınıflandırması.',
      'Doğal bir ideal nokta yok.',
      'Tek bir uç alternatife ideal nokta yöntemlerinden daha az duyarlılık istiyorsunuz.',
    ],
    whenNot: [
      'Bir kriterin ortalaması 0 ya da altında: uzaklıklar ortalamaya bölünür.',
      'Ortalamanın kendisi anlamsız (sıralı kodlar).',
      'Alternatif kümesi değişecek: ortalama da onunla kayar.',
    ],
    inputs: [
      'Karar matrisi, pozitif değerler önerilir.',
      "Her sütun için kriter türü, toplamı 1 olan ağırlıklar. Tüm ağırlıkları aynı çarpanla ölçeklemek AS'yi değiştirmez.",
      'Parametre yok.',
    ],
    pitfalls: [
      'AV = 0 sıfıra bölme demektir, negatif AV anlamı tersine çevirir; pozitif veri ya da açıkça belirtilen bir kaydırma kullanın.',
      'Hiçbir alternatif ortalamanın üstünde (maks SP = 0) ya da altında (maks SN = 0) değilse NSP veya NSN tanımsızdır.',
      'Alternatif eklenip çıkarılınca sıralama tersine dönebilir.',
    ],
  },
}
