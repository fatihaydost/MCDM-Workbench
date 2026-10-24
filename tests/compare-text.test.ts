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
const labels: Record<string, string> = { topsis: 'TOPSIS', saw: 'SAW', 'ahp-ranking': 'AHP', vikor: 'VIKOR', edas: 'EDAS', waspas: 'WASPAS', copras: 'COPRAS', cocoso: 'CoCoSo', mabac: 'MABAC', moora: 'MOORA', aras: 'ARAS', codas: 'CODAS', 'promethee-ii': 'PROMETHEE II', 'electre-i': 'ELECTRE I', 'electre-iii': 'ELECTRE III' }

async function ctx(lang: 'en' | 'tr', p: Problem, identical = false): Promise<WhyContext> {
  const i = i18next.createInstance()
  await i.init({
    lng: lang,
    resources: { en: { compare: en }, tr: { compare: tr } },
    ns: ['compare'],
    interpolation: { escapeValue: false },
  })
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
      'TOPSIS, SAW, EDAS, WASPAS, COPRAS, CoCoSo, MABAC, MOORA, ARAS, CODAS, ELECTRE I and AHP rank A1 above A7.',
      'VIKOR ranks A7 above A1.',
      'ELECTRE III ranks A1 and A7 equal.',
      'VIKOR weighs the total against the single largest regret, so one big weakness weighs heavily.',
      "VIKOR's largest regret for both A1 and A7 is on C3, and A1's is larger.",
    ])
  })

  it('reference pair A1 vs A7, TR', async () => {
    const f = pairFacts(p, ex.weights!, c, 0, 6)
    expect(whySentences(f, await ctx('tr', p))).toEqual([
      'A1, özellikle C1 ve C6 kriterlerinde önde ama C5 kriterinde geride.',
      'TOPSIS, SAW, EDAS, WASPAS, COPRAS, CoCoSo, MABAC, MOORA, ARAS, CODAS, ELECTRE I ve AHP için A1 alternatifi A7 alternatifinden önde.',
      'VIKOR için A7 alternatifi A1 alternatifinden önde.',
      'ELECTRE III için A1 ve A7 eşit sırada.',
      'VIKOR toplamı tek bir en büyük pişmanlıkla tartar, bu yüzden tek büyük zayıflık ağır basar.',
      "VIKOR'un en büyük pişmanlığı hem A1 hem A7 için C3 kriterinde, daha büyüğü A1 için.",
    ])
  })

  it('names both columns when VIKOR regrets differ, says when they are equal, and omits regret when it contradicts VIKOR', async () => {
    const f = pairFacts(p, ex.weights!, c, 0, 6)
    const flipSides: PairFacts = {
      ...f,
      methods: f.methods.map((m) =>
        m.higher === 'a' ? { ...m, higher: 'b' as const } : m.higher === 'b' ? { ...m, higher: 'a' as const } : m,
      ),
    }
    const ctxAndRun = async (lang: 'en' | 'tr', x: PairFacts) => whySentences(x, await ctx(lang, p)).at(-1)
    expect(await ctxAndRun('en', { ...flipSides, vikorRegret: { a: 2, b: 0, ra: 0.03, rb: 0.04 } })).toBe(
      "VIKOR's largest regret for A1 is on C3, for A7 on C1, and A7's is larger.",
    )
    expect(await ctxAndRun('tr', { ...flipSides, vikorRegret: { a: 2, b: 0, ra: 0.03, rb: 0.04 } })).toBe(
      "VIKOR'un en büyük pişmanlığı A1 için C3, A7 için C1 kriterinde, daha büyüğü A7 için.",
    )
    const equalRegretSentences = whySentences({ ...f, vikorRegret: { a: 2, b: 1, ra: 0.03, rb: 0.03 } }, await ctx('en', p))
    expect(equalRegretSentences.at(-1)).toBe("VIKOR's largest regrets for A1 and A7 are equal.")
    expect(equalRegretSentences.some((s) => s.startsWith('VIKOR weighs the total against the single largest regret'))).toBe(false)
    // When VIKOR ranks A7 (b) above A1 (a) via S despite A7 having larger R, omit the misleading regret sentence.
    const contradicted = whySentences({ ...f, vikorRegret: { a: 2, b: 0, ra: 0.03, rb: 0.04 } }, await ctx('en', p))
    expect(contradicted.some((s) => s.includes('largest regret for'))).toBe(false)
  })

  it('deduplicates SAW and AHP additive-sum character sentences so another minority method gets a voice', async () => {
    const f: PairFacts = {
      ...pairFacts(p, ex.weights!, c, 0, 6),
      vikorRegret: null,
      methods: [
        { methodId: 'topsis', higher: 'a' },
        { methodId: 'vikor', higher: 'a' },
        { methodId: 'edas', higher: 'a' },
        { methodId: 'moora', higher: 'a' },
        { methodId: 'saw', higher: 'b' },
        { methodId: 'ahp-ranking', higher: 'b' },
        { methodId: 'waspas', higher: 'b' },
      ],
    }
    const s = whySentences(f, await ctx('en', p))
    expect(s.some((x) => x.startsWith('SAW adds up the weighted values'))).toBe(true)
    expect(s.some((x) => x.startsWith("AHP adds up each criterion's local priorities"))).toBe(false)
    expect(s.some((x) => x.startsWith('WASPAS blends a sum with a product'))).toBe(true)
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

  it('includes the tied method character sentence when one side has 0 methods and another method ties', async () => {
    const f: PairFacts = {
      ...pairFacts(p, ex.weights!, c, 0, 6),
      unanimous: false,
      vikorRegret: null,
      methods: [
        { methodId: 'topsis', higher: 'a' },
        { methodId: 'saw', higher: 'a' },
        { methodId: 'electre-iii', higher: 'tie' },
      ],
    }
    const s = whySentences(f, await ctx('en', p))
    expect(s).toContain('ELECTRE III ranks A1 and A7 equal.')
    expect(s.some((x) => x.startsWith('ELECTRE III builds a fuzzy outranking credibility matrix'))).toBe(true)
  })

  it('unanimous pair: one sentence plus the pointer to the crossings', async () => {
    const f = pairFacts(p, ex.weights!, c, 0, 1)
    expect(f.unanimous).toBe(true)
    const s = whySentences(f, await ctx('en', p))
    expect(s[0]).toBe('All 14 methods put A1 above A2.')
    expect(whySentences(f, await ctx('tr', p))[0]).toBe('14 yöntemin hepsi A1 alternatifini A2 alternatifinin üstüne koyuyor.')
    expect(s).toEqual(['All 14 methods put A1 above A2.', 'Select a crossing in the chart to see another pair.'])
  })

  it('identical rankings: exactly one sentence', async () => {
    const q = problem()
    q.matrix = q.matrix.map((r, i) => r.map((_, j) => (q.criteria[j]!.type === 'benefit' ? 100 - i : i + 1)))
    const cq = compareRankings(q, ex.weights!, runs)
    expect(identicalRankings(cq)).toBe(true)
    const [i, k] = defaultPair(cq)!
    expect(whySentences(pairFacts(q, ex.weights!, cq, i, k), await ctx('en', q, true))).toEqual([
      'All 13 methods give the same ranking.',
    ])
  })

  it('never says one is first when a method ranks them equal', async () => {
    const f = { ...pairFacts(p, ex.weights!, c, 0, 6), methods: [{ methodId: 'saw', higher: 'tie' as const }], unanimous: true }
    expect(whySentences(f, await ctx('en', p)).join(' ')).toContain('SAW ranks A1 and A7 equal.')
    expect(whySentences(f, await ctx('tr', p)).join(' ')).toContain('SAW için A1 ve A7 eşit sırada.')
  })
})
