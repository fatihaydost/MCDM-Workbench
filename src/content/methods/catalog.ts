import type { Bilingual, MethodContent, MethodFamily, MethodId } from '../types'

/**
 * The few fields of every method card that lists and links need (catalogue, landing, guide), so
 * those pages do not load all 26 cards. The full card of one method comes from `loadMethod(id)`
 * (./load.ts), one chunk per method. `catalog.test.ts` checks every row against its card.
 */
export type MethodMeta = Pick<MethodContent, 'id' | 'family' | 'status' | 'year'> & { name: Bilingual }

const ROWS: readonly MethodMeta[] = [
  { id: 'ahp', name: { en: 'AHP', tr: 'AHP' }, family: 'weighting-subjective', status: 'research', year: 1977 },
  { id: 'aras', name: { en: 'ARAS', tr: 'ARAS' }, family: 'ranking-utility', status: 'research', year: 2010 },
  { id: 'bwm', name: { en: 'BWM', tr: 'BWM' }, family: 'weighting-subjective', status: 'research', year: 2015 },
  { id: 'cilos', name: { en: 'CILOS', tr: 'CILOS' }, family: 'weighting-objective', status: 'research', year: 2016 },
  { id: 'cocoso', name: { en: 'CoCoSo', tr: 'CoCoSo' }, family: 'ranking-utility', status: 'research', year: 2019 },
  { id: 'codas', name: { en: 'CODAS', tr: 'CODAS' }, family: 'ranking-distance', status: 'research', year: 2016 },
  { id: 'copras', name: { en: 'COPRAS', tr: 'COPRAS' }, family: 'ranking-utility', status: 'research', year: 1994 },
  { id: 'critic', name: { en: 'CRITIC', tr: 'CRITIC' }, family: 'weighting-objective', status: 'available', year: 1995 },
  { id: 'edas', name: { en: 'EDAS', tr: 'EDAS' }, family: 'ranking-distance', status: 'research', year: 2015 },
  { id: 'electre-i', name: { en: 'ELECTRE I', tr: 'ELECTRE I' }, family: 'ranking-outranking', status: 'research', year: 1968 },
  { id: 'electre-iii', name: { en: 'ELECTRE III', tr: 'ELECTRE III' }, family: 'ranking-outranking', status: 'research', year: 1978 },
  { id: 'entropy', name: { en: 'Entropy', tr: 'Entropi' }, family: 'weighting-objective', status: 'available', year: 1981 },
  { id: 'equal', name: { en: 'Equal weights', tr: 'Eşit ağırlık' }, family: 'weighting-objective', status: 'available', year: 1974 },
  { id: 'lopcow', name: { en: 'LOPCOW', tr: 'LOPCOW' }, family: 'weighting-objective', status: 'research', year: 2022 },
  { id: 'mabac', name: { en: 'MABAC', tr: 'MABAC' }, family: 'ranking-distance', status: 'research', year: 2015 },
  { id: 'marcos', name: { en: 'MARCOS', tr: 'MARCOS' }, family: 'ranking-utility', status: 'research', year: 2020 },
  { id: 'merec', name: { en: 'MEREC', tr: 'MEREC' }, family: 'weighting-objective', status: 'research', year: 2021 },
  { id: 'moora', name: { en: 'MOORA', tr: 'MOORA' }, family: 'ranking-ratio', status: 'research', year: 2006 },
  { id: 'promethee-ii', name: { en: 'PROMETHEE II', tr: 'PROMETHEE II' }, family: 'ranking-outranking', status: 'research', year: 1986 },
  { id: 'roc', name: { en: 'ROC', tr: 'ROC' }, family: 'weighting-subjective', status: 'research', year: 1996 },
  { id: 'saw', name: { en: 'SAW', tr: 'SAW' }, family: 'ranking-utility', status: 'available', year: 1954 },
  { id: 'sd', name: { en: 'SD', tr: 'SD' }, family: 'weighting-objective', status: 'research', year: 1982 },
  { id: 'swara', name: { en: 'SWARA', tr: 'SWARA' }, family: 'weighting-subjective', status: 'research', year: 2010 },
  { id: 'topsis', name: { en: 'TOPSIS', tr: 'TOPSIS' }, family: 'ranking-distance', status: 'available', year: 1981 },
  { id: 'vikor', name: { en: 'VIKOR', tr: 'VIKOR' }, family: 'ranking-distance', status: 'available', year: 1998 },
  { id: 'waspas', name: { en: 'WASPAS', tr: 'WASPAS' }, family: 'ranking-utility', status: 'research', year: 2012 },
]

/** Weighting methods first, then ranking methods, each group in the family order below. */
export const FAMILY_ORDER: readonly MethodFamily[] = [
  'weighting-objective',
  'weighting-subjective',
  'ranking-distance',
  'ranking-utility',
  'ranking-ratio',
  'ranking-outranking',
]

/** Every method, keyed by id. */
export const methodMeta: Readonly<Record<MethodId, MethodMeta>> = Object.fromEntries(ROWS.map((m) => [m.id, m])) as Record<
  MethodId,
  MethodMeta
>

/** Every method in family order, then by year. */
export const allMethods: readonly MethodMeta[] = [...ROWS].sort(
  (a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) || a.year - b.year,
)

export const isMethodId = (id: string): id is MethodId => Object.hasOwn(methodMeta, id)

export const methodsByFamily = (family: MethodFamily): MethodMeta[] => allMethods.filter((m) => m.family === family)
