import { describe, expect, it } from 'vitest'
import en from '../src/i18n/en.json'
import tr from '../src/i18n/tr.json'
import type { ValidationCode } from '../src/core'

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
      'weights-length-mismatch',
      'invalid-weight',
      'negative-weight',
      'weights-sum',
    ]
    for (const c of codes) expect(flatEn[`validation.codes.${c}`], c).toBeTypeOf('string')
  })

  it('cover every step key and warning code the core methods emit', async () => {
    const { critic, edas, entropy, merec, saw, sd, topsis, vikor, waspas } = await import('../src/core')
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
      new Set(['sd.constant-column', 'sd.near-constant-column', 'sd.two-alternatives', 'sd.all-constant-equal-weights', 'critic.near-constant-column']),
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
    const steps = [...wp.steps, ...w.steps, ...r.steps, ...e.flatMap((x) => x.steps), ...sdr.flatMap((x) => x.steps), ...mr.flatMap((x) => x.steps), ...sw.flatMap((x) => x.steps), ...vk.flatMap((x) => x.steps), ...ed.flatMap((x) => x.steps)]
    const warnings = [
      ...(w.warnings ?? []),
      ...(r.warnings ?? []),
      ...e.flatMap((x) => x.warnings ?? []),
      ...sdr.flatMap((x) => x.warnings ?? []),
      ...mr.flatMap((x) => x.warnings ?? []),
      ...sw.flatMap((x) => x.warnings ?? []),
      ...vk.flatMap((x) => x.warnings ?? []),
      ...ed.flatMap((x) => x.warnings ?? []),
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
