import { describe, expect, it } from 'vitest'
import en from '../src/i18n/en.json'
import tr from '../src/i18n/tr.json'
import type { ValidationCode } from '../src/core'
import f3 from './fixtures/bwm-demir-bircan2020.json'

type Tree = { [k: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out[key] = v
    else Object.assign(out, flatten(v, key))
  }
  return out
}

const flatEn = flatten(en as Tree)
const flatTr = flatten(tr as Tree)

describe('i18n resources', () => {
  it('have the same keys in EN and TR', () => {
    expect(Object.keys(flatTr).sort()).toEqual(Object.keys(flatEn).sort())
  })

  it('use the documented top-level tree', () => {
    expect(Object.keys(en)).toEqual(['common', 'nav', 'landing', 'workbench', 'methods', 'steps', 'validation', 'warnings'])
  })

  it('use the same interpolation variables in both languages', () => {
    const vars = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
    for (const key of Object.keys(flatEn)) expect(vars(flatTr[key]!), key).toEqual(vars(flatEn[key]!))
  })

  it('follow the copy rules: no em or en dash, no emoji, no empty strings', () => {
    for (const [lang, flat] of [['en', flatEn], ['tr', flatTr]] as const) {
      for (const [key, s] of Object.entries(flat)) {
        expect(s, `${lang}:${key} has a dash`).not.toMatch(/[–—]/)
        expect(s, `${lang}:${key} has an emoji`).not.toMatch(/\p{Extended_Pictographic}/u)
        expect(s.trim(), `${lang}:${key} is empty`).not.toBe('')
      }
    }
  })

  it('avoid the banned buzzwords', () => {
    const banned = /\b(unlock|seamless|powerful|elevate|revolutioni[sz]e|supercharge|effortless)/i
    for (const [key, s] of Object.entries(flatEn)) expect(s, key).not.toMatch(banned)
  })

  it('cover every core validation code', () => {
    const codes: ValidationCode[] = [
      'too-few-alternatives',
      'too-few-criteria',
      'alternatives-count-mismatch',
      'row-length-mismatch',
      'invalid-cell',
      'invalid-criterion-type',
      'constant-column',
      'non-positive-value',
      'negative-value',
      'non-positive-average',
      'all-worst-alternative',
      'weights-length-mismatch',
      'invalid-weight',
      'negative-weight',
      'weights-sum',
      'judgements-incomplete',
      'anchors-missing',
    ]
    for (const c of codes) expect(flatEn[`validation.codes.${c}`], c).toBeTypeOf('string')
  })

  it('cover every step key and warning code the core methods emit', async () => {
    const { ahp, ahpRanking, aras, bwm, judgementsFromBwm, judgementsFromUpper, cilos, cocoso, codas, copras, critic, edas, electreI, electreIII, entropy, lopcow, mabac, marcos, merec, moora, prometheeII, roc, saw, sd, swara, topsis, vikor, waspas } = await import('../src/core')
    const p = {
      alternatives: ['A', 'B', 'C'],
      criteria: [
        { name: 'x', type: 'benefit' as const },
        { name: 'y', type: 'cost' as const },
      ],
      matrix: [
        [1, 5],
        [2, 5],
        [3, 5],
      ],
    }
    const w = critic.compute(p, {})
    const r = topsis.compute(p, [0.5, 0.5], {})
    // Entropy: both variants, and small problems that trigger each of its notices.
    const e = [
      entropy.compute(p, {}),
      entropy.compute(p, { normalization: 'minmax' }),
      entropy.compute({ ...p, matrix: [[0, 1], [0, 2], [0, 4]] }, {}), // constant (all-zero) column
      entropy.compute({ ...p, matrix: [[0, 1], [1, 2], [2, 4]] }, {}), // zeros in a column
      entropy.compute({ ...p, alternatives: ['A', 'B'], matrix: [[1, 2], [3, 1]] }, { normalization: 'minmax' }), // m = 2
      entropy.compute({ ...p, matrix: [[1, 1], [1, 1], [1, 1]] }, {}), // all constant
      entropy.compute({ ...p, matrix: [[10, 0.045], [11, 0], [12, 0]] }, {}), // dominant weight
    ]
    // SD and CRITIC: small problems that trigger each SD notice and CRITIC's near-constant one.
    const nearConstant = { ...p, matrix: [[1, 150], [2, 150 + 1e-9], [3, 150 + 2e-9]] }
    const sdr = [
      sd.compute(p, {}), // constant column
      sd.compute(nearConstant, {}),
      sd.compute({ ...p, alternatives: ['A', 'B'], matrix: [[1, 2], [3, 1]] }, {}), // m = 2
      sd.compute({ ...p, matrix: [[1, 1], [1, 1], [1, 1]] }, {}), // all constant
      critic.compute(nearConstant, {}),
    ]
    expect(new Set(sdr.flatMap((x) => x.warnings ?? []).map((x) => x.code).filter((c) => c.endsWith('near-constant-column') || c.startsWith('sd.')))).toEqual(
      new Set(['sd.constant-column', 'sd.near-constant-column', 'sd.two-alternatives', 'sd.all-constant-equal-weights', 'sd.dominant-weight', 'critic.near-constant-column']),
    )
    // MEREC: constant column, all constant, dominant weight (C1 from 5 to 450 against a narrow C2).
    const mr = [
      merec.compute(p, {}),
      merec.compute({ ...p, matrix: [[1, 1], [1, 1], [1, 1]] }, {}),
      merec.compute({ ...p, matrix: [[450, 5], [5, 6], [100, 5.5]] }, {}),
      merec.compute({ ...p, matrix: [[1, 150], [2, 150 + 1e-9], [3, 150 + 2e-9]] }, {}), // near-constant
    ]
    expect(new Set(mr.flatMap((x) => x.warnings ?? []).map((x) => x.code))).toEqual(
      new Set(['merec.constant-column', 'merec.all-constant-equal-weights', 'merec.dominant-weight', 'merec.near-constant-column']),
    )
    // LOPCOW: constant column, near-constant column, m = 2, all constant.
    const lp = [
      lopcow.compute(p, {}),
      lopcow.compute(nearConstant, {}),
      lopcow.compute({ ...p, alternatives: ['A', 'B'], matrix: [[1, 2], [3, 1]] }, {}),
      lopcow.compute({ ...p, matrix: [[1, 1], [1, 1], [1, 1]] }, {}),
    ]
    expect(new Set(lp.flatMap((x) => x.warnings ?? []).map((x) => x.code))).toEqual(
      new Set(['lopcow.constant-column', 'lopcow.near-constant-column', 'lopcow.two-alternatives', 'lopcow.all-constant-equal-weights', 'lopcow.dominant-weight']),
    )
    // CILOS: constant column, near-constant column, partial shared optimum, total shared optimum (P = 0, F = 0), all constant.
    const ci = [
      cilos.compute(p, {}),
      cilos.compute(nearConstant, {}),
      cilos.compute(
        {
          alternatives: ['A', 'B', 'C'],
          criteria: [
            { name: 'c1', type: 'benefit' as const },
            { name: 'c2', type: 'benefit' as const },
            { name: 'c3', type: 'benefit' as const },
          ],
          matrix: [
            [10, 10, 2],
            [5, 6, 9],
            [3, 4, 5],
          ],
        },
        {},
      ),
      cilos.compute({ ...p, matrix: [[10, 1], [5, 2], [2, 5]] }, {}), // A wins both c1 (max=10) and c2 (min=1) -> P=0, F=0
      cilos.compute({ ...p, matrix: [[1, 1], [1, 1], [1, 1]] }, {}),
    ]
    expect(new Set(ci.flatMap((x) => x.warnings ?? []).map((x) => x.code))).toEqual(
      new Set(['cilos.constant-column', 'cilos.near-constant-column', 'cilos.shared-optimum', 'cilos.zero-loss-equal-weights', 'cilos.all-constant-equal-weights', 'cilos.dominant-weight']),
    )
    // SAW: both normalizations (it emits no warnings of its own; its data errors are validation codes).
    const sw = [saw.compute(p, [0.5, 0.5], {}), saw.compute(p, [0.5, 0.5], { normalization: 'sum' })]
    // VIKOR: small problems that trigger each of its notices.
    const vk = [
      vikor.compute(p, [0.5, 0.5], {}), // constant column
      vikor.compute({ ...p, matrix: [[1, 0], [0, 1], [0.5, 0.5]], criteria: [p.criteria[0]!, { ...p.criteria[0]!, name: 'y' }] }, [0.5, 0.5], {}), // equal S
      vikor.compute({ ...p, matrix: [[0, 1], [0, 0], [1, 0]], criteria: [p.criteria[0]!, { ...p.criteria[0]!, name: 'y' }] }, [0.5, 0.5], {}), // equal R, tie
      vikor.compute({ ...p, alternatives: ['A', 'B'], matrix: [[2, 2], [1, 1]] }, [0.5, 0.5], {}), // all S and R equal
    ]
    expect(new Set(vk.flatMap((x) => x.warnings ?? []).map((x) => x.code))).toEqual(
      new Set(['vikor.constant-column', 'vikor.equal-group-utility', 'vikor.equal-regret', 'vikor.tie-for-first', 'vikor.no-spread']),
    )
    // EDAS: small problems that trigger each of its notices.
    const ed = [
      edas.compute(p, [0.5, 0.5], {}), // constant column
      edas.compute({ ...p, matrix: [[-100, 5], [100.01, 6], [0, 7]] }, [0.5, 0.5], {}), // negative values, small average
      edas.compute({ ...p, matrix: [[2, 5], [2, 5], [2, 5]] }, [0.5, 0.5], {}), // nobody away from the average
    ]
    expect(new Set(ed.flatMap((x) => x.warnings ?? []).map((x) => x.code))).toEqual(
      new Set(['edas.constant-column', 'edas.negative-values', 'edas.small-average', 'edas.no-spread']),
    )
    // WASPAS: no warnings of its own (zeros and negatives are validation codes, as for SAW).
    const wp = waspas.compute(p, [0.5, 0.5], { lambda: 0.3 })
    expect(wp.warnings).toEqual([])
    // COPRAS: with a single cost criterion, and no cost criterion.
    const cp = [copras.compute(p, [0.5, 0.5], {}), copras.compute({ ...p, criteria: [p.criteria[0]!, { ...p.criteria[0]!, name: 'y' }] }, [0.5, 0.5], {})]
    expect(cp.flatMap((x) => x.warnings ?? []).map((x) => x.code)).toEqual(['copras.single-cost-criterion', 'copras.no-cost-criteria'])
    // MARCOS, ARAS and CODAS: no warnings of their own (zeros and negatives are validation codes, as for SAW).
    const mc = marcos.compute(p, [0.5, 0.5], {})
    expect(mc.warnings).toEqual([])
    const ar = aras.compute(p, [0.5, 0.5], {})
    expect(ar.warnings).toEqual([])
    const cd = codas.compute(p, [0.5, 0.5], { tau: 0.02 })
    expect(cd.warnings).toEqual([])
    const pr = [
      prometheeII.compute(p, [0.5, 0.5], {}),
      prometheeII.compute(p, [0.5, 0.5], { preferenceFunction: 'usual' }),
      prometheeII.compute(p, [0.5, 0.5], { preferenceFunction: 'level' }),
      prometheeII.compute(p, [0.5, 0.5], { preferenceFunction: 'gaussian' }),
    ]
    const el = [
      electreIII.compute(p, [0.5, 0.5], {}),
      electreIII.compute(p, [0.5, 0.5], { thresholdPreset: 'strict' }),
      electreIII.compute(p, [0.5, 0.5], { thresholdPreset: 'veto' }),
    ]
    // CoCoSo: negatives allowed, and its one notice (a near-constant column).
    const cc = [
      cocoso.compute({ ...p, matrix: [[-1, 2], [3, -1], [2, 3]] }, [0.5, 0.5], { lambda: 0.3 }),
      cocoso.compute({ ...p, matrix: [[1, 5], [3, 5 + 1e-10], [2, 5]] }, [0.5, 0.5], {}),
    ]
    expect(cc.flatMap((x) => x.warnings ?? []).map((x) => x.code)).toEqual(['cocoso.near-constant-column'])
    // MABAC: negatives allowed, and its one notice (a near-constant column).
    const mb = [
      mabac.compute({ ...p, matrix: [[-1, 2], [3, -1], [2, 3]] }, [0.5, 0.5], {}),
      mabac.compute({ ...p, matrix: [[1, 5], [3, 5 + 1e-10], [2, 5]] }, [0.5, 0.5], {}),
    ]
    expect(mb.flatMap((x) => x.warnings ?? []).map((x) => x.code)).toEqual(['mabac.near-constant-column'])
    // MOORA: negatives allowed, and its one notice (an all-zero column).
    const mo = [
      moora.compute({ ...p, matrix: [[-1, 2], [3, -1], [2, 3]] }, [0.5, 0.5], {}),
      moora.compute({ ...p, matrix: [[0, 1], [0, 2], [0, 4]] }, [0.5, 0.5], {}),
    ]
    expect(mo.flatMap((x) => x.warnings ?? []).map((x) => x.code)).toEqual(['moora.zero-column'])
    // BWM: the Demir & Bircan answers (F3, n = 9, inconsistent on K7) and n = 10 with aBW = 3 (approximate threshold).
    const bwmProblem = (n: number) => ({ ...p, criteria: Array.from({ length: n }, (_, j) => ({ name: `C${j + 1}`, type: 'benefit' as const })), matrix: [new Array<number>(n).fill(1), new Array<number>(n).fill(2)] })
    const aB10 = [1, 2, 2, 2, 2, 2, 2, 2, 2, 3]
    const aW10 = [3, 2, 2, 2, 2, 2, 2, 2, 2, 1]
    const bw = [
      bwm.compute(bwmProblem(9), {}, judgementsFromBwm(9, f3.best, f3.worst, f3.bestToOthers, f3.othersToWorst)),
      bwm.compute(bwmProblem(10), {}, judgementsFromBwm(10, 0, 9, aB10, aW10)),
    ]
    expect(new Set(bw.flatMap((x) => x.warnings ?? []).map((x) => x.code))).toEqual(new Set(['bwm.inconsistent', 'bwm.threshold-approximate']))
    // AHP: inconsistent 3x3 (a_12 = 5, a_13 = 1/3, a_23 = 7) and n = 8 all ones (many-criteria).
    const ah = [
      ahp.compute(bwmProblem(3), {}, judgementsFromUpper(3, [5, 1 / 3, 7])),
      ahp.compute(bwmProblem(8), {}, judgementsFromUpper(8, new Array<number>(28).fill(1))),
    ]
    expect(new Set(ah.flatMap((x) => x.warnings ?? []).map((x) => x.code))).toEqual(new Set(['ahp.inconsistent', 'ahp.many-criteria']))
    const rc = [
      roc.compute(p, { formula: 'roc' }),
      roc.compute(p, { formula: 'rs' }),
      roc.compute(p, { formula: 'rr' }),
    ]
    const swr = [
      swara.compute(p, { stepRatio: 'moderate' }),
      swara.compute(p, { stepRatio: 'gentle' }),
      swara.compute(p, { stepRatio: 'steep' }),
    ]
    const el1 = [
      electreI.compute(p, [0.5, 0.5], {}),
      electreI.compute(p, [0.5, 0.5], { discordanceScale: 'range' }),
    ]
    const ahr = ahpRanking.compute(p, [0.5, 0.5], {})
    const steps = [...ahr.steps, ...ah.flatMap((x) => x.steps), ...rc.flatMap((x) => x.steps), ...swr.flatMap((x) => x.steps), ...el1.flatMap((x) => x.steps), ...ar.steps, ...cd.steps, ...pr.flatMap((x) => x.steps), ...el.flatMap((x) => x.steps), ...bw.flatMap((x) => x.steps), ...mo.flatMap((x) => x.steps), ...mb.flatMap((x) => x.steps), ...cc.flatMap((x) => x.steps), ...mc.steps, ...cp.flatMap((x) => x.steps), ...wp.steps, ...w.steps, ...r.steps, ...e.flatMap((x) => x.steps), ...sdr.flatMap((x) => x.steps), ...mr.flatMap((x) => x.steps), ...lp.flatMap((x) => x.steps), ...ci.flatMap((x) => x.steps), ...sw.flatMap((x) => x.steps), ...vk.flatMap((x) => x.steps), ...ed.flatMap((x) => x.steps)]
    const warnings = [
      ...(w.warnings ?? []),
      ...(r.warnings ?? []),
      ...e.flatMap((x) => x.warnings ?? []),
      ...sdr.flatMap((x) => x.warnings ?? []),
      ...mr.flatMap((x) => x.warnings ?? []),
      ...lp.flatMap((x) => x.warnings ?? []),
      ...ci.flatMap((x) => x.warnings ?? []),
      ...sw.flatMap((x) => x.warnings ?? []),
      ...vk.flatMap((x) => x.warnings ?? []),
      ...ed.flatMap((x) => x.warnings ?? []),
      ...cp.flatMap((x) => x.warnings ?? []),
      ...cc.flatMap((x) => x.warnings ?? []),
      ...mb.flatMap((x) => x.warnings ?? []),
      ...mo.flatMap((x) => x.warnings ?? []),
      ...bw.flatMap((x) => x.warnings ?? []),
      ...ah.flatMap((x) => x.warnings ?? []),
    ]
    expect(new Set(warnings.filter((x) => x.code.startsWith('entropy.')).map((x) => x.code))).toEqual(
      new Set(['entropy.constant-column', 'entropy.zeros-in-column', 'entropy.two-alternatives-minmax', 'entropy.all-constant-equal-weights', 'entropy.dominant-weight']),
    )
    for (const s of steps) {
      expect(flatEn[`steps.${s.key}`], s.key).toBeTypeOf('string')
      expect(flatEn[`workbench.stepNames.${s.key}`], s.key).toBeTypeOf('string')
    }
    for (const x of warnings) expect(flatEn[`warnings.${x.code}`], x.code).toBeTypeOf('string')
  })

  it('label every option the registry methods declare', async () => {
    const { listMethods } = await import('../src/core')
    const declared = listMethods().flatMap((m) => (m.params ?? []).map((d) => [m.id, d] as const))
    expect(declared.length).toBeGreaterThan(0)
    for (const [id, d] of declared) {
      expect(flatEn[`workbench.params.${id}.${d.key}`], `${id}.${d.key}`).toBeTypeOf('string')
      if (d.kind !== 'choice') {
        // A number option names its value in the variant label ("v = 0,70").
        expect(flatEn[`workbench.params.${id}.${d.key}Variant`], `${id}.${d.key} variant`).toMatch(/\{\{value\}\}/)
        continue
      }
      for (const o of d.options) {
        expect(flatEn[`workbench.params.${id}.${d.key}Options.${o}`], `${id}.${d.key}.${o}`).toBeTypeOf('string')
        expect(flatEn[`workbench.params.${id}.${d.key}Variant.${o}`], `${id}.${d.key}.${o} variant`).toBeTypeOf('string')
      }
    }
  })
})
