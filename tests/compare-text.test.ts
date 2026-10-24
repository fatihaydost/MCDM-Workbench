import i18next from 'i18next'
import { describe, expect, it } from 'vitest'
import {
  compareRankings,
  defaultPair,
  identicalRankings,
  pairFacts,
  rankingMethods,
  type PairFacts,
  type Problem,
} from '../src/core'
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
const labels: Record<string, string> = { topsis: 'TOPSIS', saw: 'SAW', vikor: 'VIKOR', edas: 'EDAS', waspas: 'WASPAS', copras: 'COPRAS', cocoso: 'CoCoSo', mabac: 'MABAC', moora: 'MOORA', aras: 'ARAS', codas: 'CODAS', 'promethee-ii': 'PROMETHEE II', 'electre-iii': 'ELECTRE III' }

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
    expect(whySentences(f, await ctx('en', p))).toEqual([
      'A1 is mainly ahead on C1 and C6 but behind on C5.',
      'TOPSIS, SAW, EDAS, WASPAS, COPRAS, CoCoSo, MABAC, MOORA, ARAS, CODAS and PROMETHEE II rank A1 above A7.',
      'VIKOR ranks A7 above A1.',
      'ELECTRE III ranks A1 and A7 equal.',
      "VIKOR's largest regret for both A1 and A7 is on C3, and A1's is larger.",
    ])
  })

  it('reference pair A1 vs A7, TR', async () => {
    const f = pairFacts(p, ex.weights!, c, 0, 6)
    expect(whySentences(f, await ctx('tr', p))).toEqual([
      'A1, özellikle C1 ve C6 kriterlerinde önde ama C5 kriterinde geride.',
      'TOPSIS, SAW, EDAS, WASPAS, COPRAS, CoCoSo, MABAC, MOORA, ARAS, CODAS ve PROMETHEE II için A1 alternatifi A7 alternatifinden önde.',
      'VIKOR için A7 alternatifi A1 alternatifinden önde.',
      'ELECTRE III için A1 ve A7 eşit sırada.',
      "VIKOR'un en büyük pişmanlığı hem A1 hem A7 için C3 kriterinde, daha büyüğü A1 için.",
    ])
  })

  it('names both columns when VIKOR regrets differ, and says when they are equal', async () => {
    const f = pairFacts(p, ex.weights!, c, 0, 6)
    const regret = (vikorRegret: PairFacts['vikorRegret'], lang: 'en' | 'tr') =>
      ctxAndRun(lang, { ...f, vikorRegret })
    const ctxAndRun = async (lang: 'en' | 'tr', x: PairFacts) => whySentences(x, await ctx(lang, p)).at(-1)
    expect(await regret({ a: 2, b: 0, ra: 0.03, rb: 0.04 }, 'en')).toBe(
      "VIKOR's largest regret for A1 is on C3, for A7 on C1, and A7's is larger.",
    )
    expect(await regret({ a: 2, b: 0, ra: 0.03, rb: 0.04 }, 'tr')).toBe(
      "VIKOR'un en büyük pişmanlığı A1 için C3, A7 için C1 kriterinde, daha büyüğü A7 için.",
    )
    expect(await regret({ a: 2, b: 1, ra: 0.03, rb: 0.03 }, 'en')).toBe("VIKOR's largest regrets for A1 and A7 are equal.")
  })

  it('a 2-2 split explains both sides within five sentences', async () => {
    const f: PairFacts = {
      ...pairFacts(p, ex.weights!, c, 0, 6),
      methods: [
        { methodId: 'topsis', higher: 'a' },
        { methodId: 'saw', higher: 'a' },
        { methodId: 'vikor', higher: 'b' },
        { methodId: 'edas', higher: 'b' },
      ],
    }
    const s = whySentences(f, await ctx('en', p))
    expect(s.length).toBeLessThanOrEqual(5)
    expect(s.filter((x) => /^(TOPSIS|VIKOR) (measures|weighs)/.test(x))).toHaveLength(2)
  })

  it('unanimous pair: one sentence plus the pointer to the crossings', async () => {
    const f = pairFacts(p, ex.weights!, c, 0, 1)
    expect(f.unanimous).toBe(true)
    const s = whySentences(f, await ctx('en', p))
    expect(s[0]).toBe('All 13 methods put A1 above A2.')
    expect(whySentences(f, await ctx('tr', p))[0]).toBe('13 yöntemin hepsi A1 alternatifini A2 alternatifinin üstüne koyuyor.')
    expect(s).toEqual(['All 13 methods put A1 above A2.', 'Select a crossing in the chart to see another pair.'])
  })

  it('identical rankings: exactly one sentence', async () => {
    const q = problem()
    q.matrix = q.matrix.map((r, i) => r.map((_, j) => (q.criteria[j]!.type === 'benefit' ? 100 - i : i + 1)))
    const cq = compareRankings(q, ex.weights!, runs)
    expect(identicalRankings(cq)).toBe(true)
    const [i, k] = defaultPair(cq)!
    expect(whySentences(pairFacts(q, ex.weights!, cq, i, k), await ctx('en', q, true))).toEqual([
      'All 12 methods give the same ranking.',
    ])
  })

  it('never says one is first when a method ranks them equal', async () => {
    const f = { ...pairFacts(p, ex.weights!, c, 0, 6), methods: [{ methodId: 'saw', higher: 'tie' as const }], unanimous: true }
    expect(whySentences(f, await ctx('en', p)).join(' ')).toContain('SAW ranks A1 and A7 equal.')
    expect(whySentences(f, await ctx('tr', p)).join(' ')).toContain('SAW için A1 ve A7 eşit sırada.')
  })
})
