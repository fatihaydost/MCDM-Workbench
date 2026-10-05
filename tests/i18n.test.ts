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
      'weights-length-mismatch',
      'invalid-weight',
      'negative-weight',
      'weights-sum',
    ]
    for (const c of codes) expect(flatEn[`validation.codes.${c}`], c).toBeTypeOf('string')
  })

  it('cover every step key and warning code the core methods emit', async () => {
    const { critic, entropy, topsis } = await import('../src/core')
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
    const steps = [...w.steps, ...r.steps, ...e.flatMap((x) => x.steps)]
    const warnings = [...(w.warnings ?? []), ...(r.warnings ?? []), ...e.flatMap((x) => x.warnings ?? [])]
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
      if (d.kind !== 'choice') continue
      for (const o of d.options) {
        expect(flatEn[`workbench.params.${id}.${d.key}Options.${o}`], `${id}.${d.key}.${o}`).toBeTypeOf('string')
        expect(flatEn[`workbench.params.${id}.${d.key}Variant.${o}`], `${id}.${d.key}.${o} variant`).toBeTypeOf('string')
      }
    }
  })
})
