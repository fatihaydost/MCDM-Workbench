import i18next from 'i18next'
import { describe, expect, it } from 'vitest'
import { compareRankings, defaultPair, identicalRankings, pairFacts, rankingMethods, type Problem } from '../src/core'
import { getExample } from '../src/data/examples'
import { whySentences, type WhyContext } from '../src/app/workbench/compare/why'
import en from '../src/i18n/compare.en.json'
import tr from '../src/i18n/compare.tr.json'

const ex = getExample('keshavarz-2015-ten-alternatives')!
const problem = (): Problem => ({
  alternatives: ex.alternatives,
  criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
  matrix: ex.matrix.map((r) => [...r]),
})
const runs = rankingMethods.map((m) => ({ methodId: m.id, params: {} }))
const labels: Record<string, string> = { topsis: 'TOPSIS', saw: 'SAW', vikor: 'VIKOR', edas: 'EDAS' }

async function ctx(lang: 'en' | 'tr', p: Problem, identical = false): Promise<WhyContext> {
  const i = i18next.createInstance()
  await i.init({ lng: lang, resources: { en: { compare: en }, tr: { compare: tr } }, ns: ['compare'] })
  return {
    names: p.alternatives,
    criteria: p.criteria.map((c) => c.name),
    methodLabel: (id) => labels[id]!,
    t: i.getFixedT(lang, 'compare'),
    lang,
    identical,
  }
}

describe('whySentences', () => {
  const p = problem()
  const c = compareRankings(p, ex.weights!, runs)

  it('reference pair A1 vs A7, EN', async () => {
    const f = pairFacts(p, ex.weights!, c, 0, 6)
    const s = whySentences(f, await ctx('en', p))
    expect(s).toEqual([
      'A1 is ahead on C1 and C6 but behind on C5.',
      'TOPSIS, SAW and EDAS put A1 first.',
      'VIKOR puts A7 first.',
      'VIKOR weighs the total against the single largest regret, so one big weakness weighs heavily.',
      "VIKOR's largest regret for both A1 and A7 is on C3.",
    ])
  })

  it('reference pair A1 vs A7, TR', async () => {
    const s = whySentences(pairFacts(p, ex.weights!, c, 0, 6), await ctx('tr', p))
    expect(s).toHaveLength(5)
    expect(s[0]).toBe('A1, C1 ve C6 kriterlerinde önde ama C5 kriterlerinde geride.')
    expect(s[1]).toBe('TOPSIS, SAW ve EDAS için A1 önde.')
  })

  it('names both columns when VIKOR regrets differ', async () => {
    const f = { ...pairFacts(p, ex.weights!, c, 0, 6), vikorRegret: { a: 2, b: 0 } }
    expect((await whySentences(f, await ctx('en', p))).at(-1)).toBe("VIKOR's largest regret for A1 is on C3, for A7 on C1.")
  })

  it('unanimous pair: one sentence plus the pointer to the crossings', async () => {
    const f = pairFacts(p, ex.weights!, c, 0, 1)
    expect(f.unanimous).toBe(true)
    const s = whySentences(f, await ctx('en', p))
    expect(s[0]).toBe('All 4 methods put A1 above A2.')
    expect(s.at(-1)).toBe('Select a crossing in the chart to see another pair.')
  })

  it('identical rankings: exactly one sentence', async () => {
    const q = problem()
    q.matrix = q.matrix.map((r, i) => r.map((_, j) => (q.criteria[j]!.type === 'benefit' ? 100 - i : i + 1)))
    const cq = compareRankings(q, ex.weights!, runs)
    expect(identicalRankings(cq)).toBe(true)
    const [i, k] = defaultPair(cq)!
    expect(whySentences(pairFacts(q, ex.weights!, cq, i, k), await ctx('en', q, true))).toEqual([
      'All 4 methods give the same ranking.',
    ])
  })

  it('never says one is first when a method ranks them equal', async () => {
    const f = { ...pairFacts(p, ex.weights!, c, 0, 6), methods: [{ methodId: 'saw', higher: 'tie' as const }], unanimous: true }
    expect(whySentences(f, await ctx('en', p)).join(' ')).toContain('SAW ranks A1 and A7 equal.')
  })
})
