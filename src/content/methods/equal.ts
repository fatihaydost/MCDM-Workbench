import type { MethodContent } from '../types'

// Source: docs/research/methods/equal.md
export const equal: MethodContent = {
  id: 'equal',
  name: { en: 'Equal weights', tr: 'Eşit ağırlık' },
  fullName: { en: 'Equal weights', tr: 'Eşit ağırlık' },
  family: 'weighting-objective',
  status: 'available',
  year: 1974,
  origin: {
    authors: 'Dawes, R.M.; Corrigan, B.',
    year: 1974,
    title: 'Linear models in decision making',
    venue: 'Psychological Bulletin 81(2), 95-106',
    doi: '10.1037/h0037613',
    note: {
      en: 'Equal weights have no single inventor; Dawes & Corrigan (1974) and Einhorn & Hogarth (1975) are the classic "unit weights" references.',
      tr: 'Eşit ağırlığın tek bir mucidi yoktur; "birim ağırlık" için genelde Dawes ve Corrigan (1974) ile Einhorn ve Hogarth (1975) gösterilir.',
    },
  },
  steps: [
    {
      title: { en: 'Same weight for every criterion', tr: 'Her kritere aynı ağırlık' },
      tex: String.raw`w_j = \frac{1}{n}, \qquad j = 1, \dots, n`,
    },
  ],
  combinedWith: [
    {
      methodId: 'topsis',
      text: {
        en: 'Any ranking method, as the "no weighting" scenario: Dua et al. (2024) run MARA, RAM and PIV with mean weights next to Entropy, MEREC, LOPCOW and CRITIC.',
        tr: 'Herhangi bir sıralama yöntemiyle, "ağırlıksız" senaryo olarak: Dua vd. (2024) MARA, RAM ve PIV yöntemlerini Entropi, MEREC, LOPCOW ve CRITIC yanında ortalama ağırlıklarla da çalıştırır.',
      },
    },
    {
      methodId: 'edas',
      text: {
        en: 'The worked example of the EDAS origin paper uses equal weights.',
        tr: 'EDAS özgün makalesindeki çözümlü örnek eşit ağırlık kullanır.',
      },
    },
  ],
  reference: {
    source: 'Roszkowska, E. (2013). Rank Ordering Criteria Weighting Methods: a Comparative Overview. Optimum. Studia Ekonomiczne 5(65), 14-33',
    doi: '10.15290/ose.2013.05.65.02',
    match: 'match',
    note: {
      en: 'Table 4, column EW. The published 1/n values for n = 3 and n = 4 are reproduced exactly.',
      tr: 'Tablo 4, EW sütunu. n = 3 ve n = 4 için yayımlanan 1/n değerleri birebir elde ediliyor.',
    },
  },
  sources: [
    { label: 'Dawes & Corrigan (1974), Psychological Bulletin 81(2), 95-106', doi: '10.1037/h0037613' },
    { label: 'Einhorn & Hogarth (1975), Organizational Behavior and Human Performance 13(2), 171-192', doi: '10.1016/0030-5073(75)90044-6' },
    { label: 'Roszkowska (2013), Optimum. Studia Ekonomiczne 5(65), 14-33', doi: '10.15290/ose.2013.05.65.02' },
    { label: 'Dua, Duc, Bao & Trung (2024), EUREKA: Physics and Engineering', doi: '10.21303/2461-4262.2024.003171' },
    { label: 'Keshavarz-Ghorabaee et al. (2021), Symmetry 13(4), 525', doi: '10.3390/sym13040525' },
  ],
  en: {
    summary:
      'Every criterion gets the same weight, 1/n. Use it when no criterion deserves priority, or as a neutral baseline to see how much another weighting changes the ranking.',
    whenToUse: ['No information about importance.', 'As a baseline for sensitivity checks.'],
    whenNot: [
      'Criteria overlap: equal weights count correlated criteria twice.',
      'Uneven themes: a 5-criterion theme weighs 5 times a 1-criterion one.',
    ],
    inputs: ['Number of criteria n, at least 1. No matrix needed.'],
    pitfalls: [
      'Hidden weighting through the number of criteria per theme.',
      "Weights are equal only after normalization: the ranking method's normalization decides how much each criterion really counts.",
      'In floating point, 1/3 three times does not sum exactly to 1; tests need a tolerance.',
    ],
  },
  tr: {
    summary:
      'Her kriter aynı ağırlığı alır: 1/n. Hiçbir kriteri öne çıkarmak için nedeniniz yoksa ya da başka bir ağırlıklandırmanın etkisini görmek için tarafsız bir taban olarak kullanın.',
    whenToUse: ['Önem hakkında hiçbir bilgi yok.', 'Duyarlılık kontrolleri için karşılaştırma tabanı olarak.'],
    whenNot: [
      'Kriterler örtüşüyor: eşit ağırlık ilişkili kriterleri iki kez sayar.',
      'Temaların büyüklüğü farklı: 5 kriterli tema, 1 kriterlinin 5 katı ağırlık alır.',
    ],
    inputs: ['Kriter sayısı n, en az 1. Matris gerekmez.'],
    pitfalls: [
      'Tema başına kriter sayısı üzerinden gizli ağırlıklandırma.',
      'Ağırlıklar ancak normalizasyondan sonra eşittir: her kriterin gerçekte ne kadar sayılacağını sıralama yönteminin normalizasyonu belirler.',
      "Kayan noktalı sayılarda üç kez 1/3 tam olarak 1'e toplanmaz; testler tolerans gerektirir.",
    ],
  },
}
