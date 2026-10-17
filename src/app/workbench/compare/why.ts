import type { TFunction } from 'i18next'
import { RANKING_IDS, type PairFacts, type RankingId } from '../../../core'

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

const isRankingId = (id: string): id is RankingId => (RANKING_IDS as readonly string[]).includes(id)

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
  const crit = (better: 'a' | 'b') => {
    const xs = f.criteria.filter((c) => c.better === better).map((c) => ctx.criteria[c.col]!)
    return xs.length ? t('why.on', { count: xs.length, list: list(xs) }) : ''
  }
  const ahead = crit('a')
  const behind = crit('b')
  const criteria = !ahead && !behind ? [] : [
    !behind ? t('why.criteriaAhead', { a, list: ahead })
    : !ahead ? t('why.criteriaBehind', { a, list: behind })
    : t('why.criteria', { a, ahead, behind }),
  ]

  if (f.unanimous && f.methods[0]?.higher !== 'tie') {
    const [hi, lo] = f.methods[0]!.higher === 'a' ? [a, b] : [b, a]
    return [t('why.unanimous', { n, a: hi, b: lo }), t('why.crossings')]
  }

  const groups = (['a', 'b'] as const).flatMap((s) => {
    const ids = side(s)
    return ids.length ? [t('why.group', { count: ids.length, methods: label(ids), name: s === 'a' ? a : b, other: s === 'a' ? b : a })] : []
  })
  const tied = side('tie')
  const ties = tied.length ? [t('why.tie', { count: tied.length, methods: label(tied), a, b })] : []

  const na = side('a').length
  const nb = side('b').length
  // Methods whose character is explained: the minority side; on a 2-2 split one per side (VIKOR first), so both
  // sides get a sentence within the limit.
  const rep = (ids: string[]) => [ids.includes('vikor') ? 'vikor' : ids[0]!]
  const shown = na === nb ? [...(na ? rep(side('a')) : []), ...(nb ? rep(side('b')) : [])] : na < nb ? side('a') : side('b')
  const head = [...criteria, ...groups, ...ties]
  // Every ranking method has its sentence at why.character.<id>.
  const characters = shown
    .filter(isRankingId)
    .map((id) => t(`why.character.${id}`))
    .slice(0, Math.max(0, MAX_SENTENCES - head.length))
  const v = shown.includes('vikor') ? f.vikorRegret : null
  const regret = !v ? [] : Math.abs(v.ra - v.rb) < 1e-12
    ? [t('why.vikorRegretEqual', { a, b })]
    : [
        v.a === v.b
          ? t('why.vikorRegretSame', { a, b, c: ctx.criteria[v.a]!, larger: v.ra > v.rb ? a : b })
          : t('why.vikorRegret', { a, b, ca: ctx.criteria[v.a]!, cb: ctx.criteria[v.b]!, larger: v.ra > v.rb ? a : b }),
      ]
  return [...head, ...characters, ...regret].slice(0, MAX_SENTENCES)
}
