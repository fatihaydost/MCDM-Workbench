import { judgementsFromBwm, judgementsFromUpper, type Judgements } from '../core'
import type { Citation, Localized } from './examples'

/** A published set of pairwise answers (no decision matrix): the method pages of AHP and BWM draw on it. */
export type JudgementExample = { id: string; name: Localized; citation: Citation; criteria: readonly Localized[]; judgements: Judgements }

/** Every answer below is copied from the cited table and is also a fixture in tests/fixtures. */
export const judgementExamples: readonly JudgementExample[] = [
  {
    id: 'rezaei-2016-car',
    name: { en: 'Buying a car (Rezaei 2016)', tr: 'Otomobil seçimi (Rezaei 2016)' },
    citation: {
      authors: 'Rezaei, J.',
      year: 2016,
      title: 'Best-worst multi-criteria decision-making method: Some properties and a linear model',
      venue: 'Omega 64, 126-130',
      doi: '10.1016/j.omega.2015.12.001',
      tables: { en: 'Table 4 (input)', tr: 'Tablo 4 (girdi)' },
    },
    criteria: [
      { en: 'Quality', tr: 'Kalite' },
      { en: 'Price', tr: 'Fiyat' },
      { en: 'Comfort', tr: 'Konfor' },
      { en: 'Safety', tr: 'Güvenlik' },
      { en: 'Style', tr: 'Stil' },
    ],
    // Example 3: price is the best, style the worst.
    judgements: judgementsFromBwm(5, 1, 4, [2, 1, 4, 3, 8], [4, 8, 4, 2, 1]),
  },
  {
    id: 'saaty-2008-job',
    name: { en: 'Choosing a job (Saaty 2008)', tr: 'İş seçimi (Saaty 2008)' },
    citation: {
      authors: 'Saaty, T. L.',
      year: 2008,
      title: 'Decision making with the analytic hierarchy process',
      venue: 'International Journal of Services Sciences 1(1), 83-98',
      doi: '10.1504/IJSSCI.2008.017590',
      tables: { en: 'Table 3', tr: 'Tablo 3' },
    },
    criteria: [
      { en: 'Flexibility', tr: 'Esneklik' },
      { en: 'Opportunities', tr: 'Fırsatlar' },
      { en: 'Security', tr: 'Güvence' },
      { en: 'Reputation', tr: 'İtibar' },
      { en: 'Salary', tr: 'Maaş' },
    ],
    judgements: judgementsFromUpper(5, [1 / 4, 1 / 6, 1 / 4, 1 / 8, 1 / 3, 3, 1 / 7, 4, 1 / 2, 1 / 7]),
  },
]

export const getJudgementExample = (id: string): JudgementExample | undefined => judgementExamples.find((x) => x.id === id)
