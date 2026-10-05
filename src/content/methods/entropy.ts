import type { MethodContent } from '../types'

// Source: docs/research/methods/entropy.md
export const entropy: MethodContent = {
  id: 'entropy',
  name: { en: 'Entropy', tr: 'Entropi' },
  fullName: { en: 'Entropy weighting (Shannon)', tr: 'Entropi ağırlıklandırması (Shannon)' },
  family: 'weighting-objective',
  status: 'available',
  year: 1981,
  origin: {
    authors: 'Hwang, C.-L.; Yoon, K.',
    year: 1981,
    title: 'Multiple Attribute Decision Making: Methods and Applications',
    venue: 'Springer, Lecture Notes in Economics and Mathematical Systems 186',
    doi: '10.1007/978-3-642-48318-9',
    note: {
      en: 'The information measure is Shannon (1948); its use as a weighting method is usually credited to Zeleny (1982) and Hwang & Yoon (1981), and the algorithm follows open-access restatements.',
      tr: 'Bilgi ölçüsü Shannon (1948) kaynaklıdır; ağırlıklandırmada kullanımı genellikle Zeleny (1982) ile Hwang ve Yoon (1981) kaynaklarına bağlanır, algoritma açık erişimli anlatımları izler.',
    },
  },
  steps: [
    {
      title: { en: 'Shares', tr: 'Paylar' },
      tex: String.raw`p_{ij} = \frac{x_{ij}}{\sum_{i=1}^{m} x_{ij}}`,
      note: {
        en: 'Default variant: raw data, criterion type ignored; the min-max option first normalizes with cost inversion, then takes shares.',
        tr: 'Varsayılan varyant: ham veri, kriter türü dikkate alınmaz; min-max seçeneği önce maliyeti ters çevirerek normalize eder, sonra payları alır.',
      },
    },
    {
      title: { en: 'Entropy per criterion', tr: 'Kriter başına entropi' },
      tex: String.raw`e_j = -\frac{1}{\ln m}\sum_{i=1}^{m} p_{ij} \ln p_{ij}, \qquad 0 \cdot \ln 0 := 0, \qquad 0 \le e_j \le 1`,
    },
    {
      title: { en: 'Degree of diversification', tr: 'Çeşitlenme derecesi' },
      tex: String.raw`d_j = 1 - e_j`,
      note: {
        en: 'A constant column, including an all-zero one, gets d = 0 and weight 0; if every column is constant, the weights are 1/n.',
        tr: 'Sabit bir sütun, tamamı sıfır olan da, d = 0 ve 0 ağırlık alır; bütün sütunlar sabitse ağırlıklar 1/n olur.',
      },
    },
    {
      title: { en: 'Weights', tr: 'Ağırlıklar' },
      tex: String.raw`w_j = \frac{d_j}{\sum_{k=1}^{n} d_k}`,
    },
  ],
  combinedWith: [
    {
      methodId: 'topsis',
      text: {
        en: 'Entropy only weighs; a ranking method ranks. Published pairings include TOPSIS (Alao et al. 2020) and, with IDOCRIW weights, COPRAS, SAW, TOPSIS and EDAS (Zavadskas et al. 2017).',
        tr: 'Entropi yalnız ağırlık üretir; sıralamayı başka bir yöntem yapar. Yayımlanmış eşleşmeler arasında TOPSIS (Alao vd. 2020) ve IDOCRIW ağırlıklarıyla COPRAS, SAW, TOPSIS ve EDAS (Zavadskas vd. 2017) var.',
      },
    },
    {
      methodId: 'edas',
      text: {
        en: 'Entropy then EDAS (Yazdani et al. 2020); the review by Keshavarz-Ghorabaee et al. (2021) also lists Entropy with VIKOR and PROMETHEE.',
        tr: 'Entropi ardından EDAS (Yazdani vd. 2020); Keshavarz-Ghorabaee vd. (2021) incelemesi Entropiyi VIKOR ve PROMETHEE ile de listeler.',
      },
    },
    {
      methodId: 'cilos',
      text: {
        en: 'Entropy times CILOS gives IDOCRIW, which Zavadskas et al. (2017) then merge with expert weights.',
        tr: 'Entropi ile CILOS çarpılınca IDOCRIW elde edilir; Zavadskas vd. (2017) bunu uzman ağırlıklarıyla birleştirir.',
      },
    },
    {
      methodId: 'moora',
      text: {
        en: 'Entropy and CRITIC weights for MOORA and SAW in an air-conditioner selection (Vujičić, Papić & Blagojević 2017).',
        tr: 'Bir klima seçiminde MOORA ve SAW için Entropi ve CRITIC ağırlıkları (Vujičić, Papić ve Blagojević 2017).',
      },
    },
    {
      methodId: 'critic',
      text: {
        en: 'Compared with CRITIC, CILOS, IDOCRIW and D-CRITIC on one matrix (Krishnan et al. 2021, Table 5).',
        tr: 'Tek bir matris üzerinde CRITIC, CILOS, IDOCRIW ve D-CRITIC ile karşılaştırılır (Krishnan vd. 2021, Tablo 5).',
      },
    },
  ],
  reference: {
    source: 'Zavadskas, E.K.; Cavallaro, F.; Podvezko, V.; Ubarte, I.; Kaklauskas, A. (2017). MCDM Assessment of a Healthy and Safe Built Environment According to Sustainable Development Principles: A Practical Neighborhood Approach in Vilnius. Sustainability 9(5), 702',
    doi: '10.3390/su9050702',
    match: 'match',
    note: {
      en: 'Table 4 (input, economic block) and Table 8 (Entropy). Twenty-one Vilnius neighbourhoods, five criteria. Our weights match all five published values to 4 decimals (largest difference 4.6e-5). The paper prints them on the wrong criterion rows, so we list them in the data\'s column order. The min-max option matches Krishnan et al. (2021), Table 5, to 4 decimals (4.5e-5), and its normalized matrix equals their Table 2.',
      tr: 'Tablo 4 (girdi, ekonomik blok) ve Tablo 8 (Entropi). Yirmi bir Vilnius mahallesi, beş kriter. Ağırlıklarımız yayımlanan beş değerle 4 basamakta örtüşüyor (en büyük fark 4,6e-5). Makale bunları yanlış kriter satırlarına basmış, bu yüzden veri sütunlarının sırasıyla veriyoruz. Min-max seçeneği Krishnan vd. (2021) Tablo 5 ile 4 basamakta örtüşüyor (4,5e-5), normalize matrisi de Tablo 2 ile aynı.',
    },
  },
  sources: [
    { label: 'Shannon (1948), A Mathematical Theory of Communication, Bell System Technical Journal 27(3), 379-423', doi: '10.1002/j.1538-7305.1948.tb01338.x' },
    { label: 'Hwang & Yoon (1981), Multiple Attribute Decision Making, Springer', doi: '10.1007/978-3-642-48318-9' },
    { label: 'Zeleny (1982), Multiple Criteria Decision Making, McGraw-Hill' },
    { label: 'Zavadskas, Cavallaro, Podvezko, Ubarte & Kaklauskas (2017), Sustainability 9(5), 702', doi: '10.3390/su9050702' },
    { label: 'Krishnan, Kasim, Hamid & Ghazali (2021), Symmetry 13(6), 973', doi: '10.3390/sym13060973' },
    { label: 'Mukhametzyanov (2021), Decision Making: Applications in Management and Engineering 4(2), 76-105', doi: '10.31181/dmame210402076i' },
    { label: 'Vujičić, Papić & Blagojević (2017), Tehnika 72(3), 422-429', doi: '10.5937/tehnika1703422V' },
    { label: 'Zhu, Tian & Yan (2020), Mathematical Problems in Engineering 2020, 3564835', doi: '10.1155/2020/3564835' },
    { label: 'Keshavarz-Ghorabaee et al. (2021), Symmetry 13(4), 525', doi: '10.3390/sym13040525' },
    { label: 'Yazdani et al. (2020), Sustainable Operations and Computers 1, 35-42', doi: '10.1016/j.susoc.2020.12.002' },
    { label: 'Alao et al. (2020), Energy 201, 117675', doi: '10.1016/j.energy.2020.117675' },
  ],
  en: {
    summary:
      'Entropy gives little weight to criteria on which all alternatives score almost the same, and more to criteria with uneven scores. It looks only at the data, not at what a criterion means.',
    whenToUse: [
      'No expert view; measured numbers of 0 or more in every cell.',
      'A quick, fully objective baseline next to CRITIC, SD or MEREC.',
    ],
    whenNot: [
      'Many zeros: a nearly empty column can take most weight.',
      'Very homogeneous data: entropies near 1, tiny differences decide.',
      'The set of alternatives will change: the weights move a lot.',
    ],
    inputs: [
      'Decision matrix with at least 2 alternatives. Raw data (sum) needs values of 0 or more.',
      'Criterion types are not used by raw data (sum); min-max uses them to reverse cost criteria.',
      'Option: normalization, raw data (sum, the default) or min-max, which accepts negative values.',
    ],
    pitfalls: [
      'Zeros: they make the shares uneven, so a column with one non-zero value can take most of the weight (Zhu et al. 2020).',
      'Homogeneous data amplify noise: entropies of 0.991 to 0.999 gave weights of 0.024 to 0.378 in one published study.',
      'The variant matters: raw data and min-max can differ a lot, and adding a constant (C vs K) changes raw-data weights; multiplying does not.',
    ],
  },
  tr: {
    summary:
      'Entropi, tüm alternatiflerin hemen hemen aynı puanı aldığı kriterlere az, puanları dengesiz dağılan kriterlere daha çok ağırlık verir. Yalnız veriye bakar, kriterin anlamına bakmaz.',
    whenToUse: [
      'Uzman görüşü yok; her hücrede negatif olmayan ölçülmüş sayı var.',
      'CRITIC, SD ya da MEREC yanında hızlı ve tamamen nesnel bir taban.',
    ],
    whenNot: [
      'Çok sayıda sıfır: neredeyse boş bir sütun ağırlığın çoğunu alabilir.',
      "Veri çok homojen: entropiler 1'e yakın, küçük farklar belirleyici olur.",
      'Alternatif kümesi değişecek: ağırlıklar çok oynar.',
    ],
    inputs: [
      'En az 2 alternatifli karar matrisi. Ham veri (toplam) 0 ya da daha büyük değer ister.',
      'Ham veri (toplam) kriter türlerini kullanmaz; min-max maliyet kriterlerini ters çevirmek için kullanır.',
      'Seçenek: normalizasyon, ham veri (toplam, varsayılan) ya da negatif değer kabul eden min-max.',
    ],
    pitfalls: [
      'Sıfırlar: payları dengesizleştirir, tek bir sıfır olmayan değeri olan sütun ağırlığın çoğunu alabilir (Zhu vd. 2020).',
      'Homojen veri gürültüyü büyütür: yayımlanmış bir çalışmada 0,991 ile 0,999 arası entropiler 0,024 ile 0,378 arası ağırlıklar verdi.',
      'Varyant önemlidir: ham veri ile min-max çok farklı sonuç verebilir; sabit eklemek (santigrat ve kelvin) ham veri ağırlıklarını değiştirir, çarpmak değiştirmez.',
    ],
  },
}
