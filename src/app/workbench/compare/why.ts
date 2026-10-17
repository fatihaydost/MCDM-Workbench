import type { TFunction } from 'i18next'
import type { PairFacts } from '../../../core'

export type WhyContext = {
  names: string[]
  criteria: string[]
  methodLabel: (id: string) => string
  /** `t` of the compare namespace. */
  t: TFunction<'compare'>
  lang?: string
  /** Every ranked method gives the same ranking: one sentence, nothing to explain. */
  identical?: boolean
}

const MAX_SENTENCES = 5

/**
 * The "why" text for one pair, from the pair facts only. Character sentences are kept to the methods on the side that
 * disagrees with the majority (both sides on a 2-2 split); the panel stays at five sentences.
 */
export function whySentences(f: PairFacts, ctx: WhyContext): string[] {
  const { t, names } = ctx
  // en-GB: no serial comma ("A, B and C").
  const list = (xs: string[]) => new Intl.ListFormat(ctx.lang === 'tr' ? 'tr' : 'en-GB', { type: 'conjunction' }).format(xs)
  const a = names[f.a]!
  const b = names[f.b]!
  const n = f.methods.length
  if (ctx.identical) return [t('why.identical', { n })]

  const side = (s: 'a' | 'b' | 'tie') => f.methods.filter((m) => m.higher === s).map((m) => m.methodId)
  const label = (ids: string[]) => list(ids.map(ctx.methodLabel))
  const crit = (better: 'a' | 'b') => list(f.criteria.filter((c) => c.better === better).map((c) => ctx.criteria[c.col]!))
  const ahead = crit('a')
  const behind = crit('b')
  const criteria = !ahead && !behind ? [] : [
    !behind ? t('why.criteriaAhead', { a, list: ahead })
    : !ahead ? t('why.criteriaBehind', { a, list: behind })
    : t('why.criteria', { a, ahead, behind }),
  ]

  if (f.unanimous && f.methods[0]?.higher !== 'tie') {
    const [hi, lo] = f.methods[0]!.higher === 'a' ? [a, b] : [b, a]
    return [t('why.unanimous', { n, a: hi, b: lo }), ...criteria, t('why.crossings')]
  }

  const groups = (['a', 'b'] as const).flatMap((s) => {
    const ids = side(s)
    return ids.length ? [t('why.group', { count: ids.length, methods: label(ids), name: s === 'a' ? a : b })] : []
  })
  const tied = side('tie')
  const ties = tied.length ? [t('why.tie', { count: tied.length, methods: label(tied), a, b })] : []

  const na = side('a').length
  const nb = side('b').length
  const shown = na === nb ? [...side('a'), ...side('b')] : na < nb ? side('a') : side('b')
  const vikor = shown.includes('vikor') && f.vikorRegret ? f.vikorRegret : null
  const regret = vikor
    ? vikor.a === vikor.b
      ? [t('why.vikorRegretSame', { a, b, c: ctx.criteria[vikor.a]! })]
      : [t('why.vikorRegret', { a, b, ca: ctx.criteria[vikor.a]!, cb: ctx.criteria[vikor.b]! })]
    : []
  const head = [...criteria, ...groups, ...ties]
  const characters = shown
    .filter((id) => id in CHARACTER)
    .map((id) => t(CHARACTER[id as keyof typeof CHARACTER]))
    .slice(0, Math.max(0, MAX_SENTENCES - head.length - regret.length))
  return [...head, ...characters, ...regret]
}

const CHARACTER = {
  topsis: 'why.character.topsis',
  saw: 'why.character.saw',
  vikor: 'why.character.vikor',
  edas: 'why.character.edas',
} as const
