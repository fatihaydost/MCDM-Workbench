import { judgementsFromBwm, type Judgements } from '../core'
import type { Citation, Localized } from './examples'

/** A published set of pairwise answers (no decision matrix): the method pages of BWM draw on it. */
export type JudgementExample = { id: string; name: Localized; citation: Citation; criteria: readonly Localized[]; judgements: Judgements }

/** Every answer below is copied from the cited table and is also a fixture in tests/fixtures (bwm-rezaei2016-car.json). */
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
      { en: 'quality', tr: 'kalite' },
      { en: 'price', tr: 'fiyat' },
      { en: 'comfort', tr: 'konfor' },
      { en: 'safety', tr: 'güvenlik' },
      { en: 'style', tr: 'stil' },
    ],
    // Example 3: price is the best, style the worst.
    judgements: judgementsFromBwm(5, 1, 4, [2, 1, 4, 3, 8], [4, 8, 4, 2, 1]),
  },
]

export const getJudgementExample = (id: string): JudgementExample | undefined => judgementExamples.find((x) => x.id === id)
