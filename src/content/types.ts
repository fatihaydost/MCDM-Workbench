/**
 * Content model for the method pages and the "which method?" guide.
 * Source of truth: docs/research/methods/*.md (one card per method) and docs/research/combinations.md.
 *
 * Language-independent data (TeX, DOIs, citations, method ids) is stored once; everything a reader
 * sees as prose is stored per language. `localizeMethod` flattens one method into a single-language view.
 */

/** Same union as src/i18n/lang.ts, repeated so the content layer has no UI dependency. */
export type Lang = 'en' | 'tr'

/** Prose in both site languages. */
export type Bilingual = { en: string; tr: string }

export type MethodId =
  | 'ahp'
  | 'aras'
  | 'bwm'
  | 'cilos'
  | 'cocoso'
  | 'codas'
  | 'copras'
  | 'critic'
  | 'edas'
  | 'electre-i'
  | 'electre-iii'
  | 'entropy'
  | 'equal'
  | 'lopcow'
  | 'mabac'
  | 'marcos'
  | 'merec'
  | 'moora'
  | 'promethee-ii'
  | 'roc'
  | 'saw'
  | 'sd'
  | 'swara'
  | 'topsis'
  | 'vikor'
  | 'waspas'

export type MethodFamily =
  | 'weighting-objective'
  | 'weighting-subjective'
  | 'ranking-distance'
  | 'ranking-utility'
  | 'ranking-ratio'
  | 'ranking-outranking'

/** 'available' = implemented in src/core and runnable on the site; 'research' = card only. */
export type MethodStatus = 'available' | 'research'

export type Origin = {
  /** As printed, surname first. */
  authors: string
  year: number
  title: string
  /** Journal volume(issue), pages; or publisher for books. */
  venue: string
  /** Only when the card gives one. */
  doi?: string
  url?: string
  /** Caveats about the attribution (no single founding paper, idea older than the paper, ...). */
  note?: Bilingual
}

/** One algorithm step. TeX is shared by both languages; the title and note are prose. */
export type MethodStep = {
  title: Bilingual
  /** KaTeX source. */
  tex: string
  note?: Bilingual
}

export type Combination = {
  /** Set when the partner method has its own page here. */
  methodId?: MethodId
  text: Bilingual
}

/**
 * How our recomputation compares with the published reference example.
 * match: every published number is reproduced at the paper's printed precision; numbers printed under the wrong
 *        label (swapped rows or columns) count, once they are read under the right one.
 * partial: some published number is not reproduced as printed, e.g. one that follows from a misprinted input
 *          (documented, with the corrected value), or only at a looser tolerance than the printed digits imply.
 * mismatch: not reproduced.
 */
export type ReferenceMatch = 'match' | 'partial' | 'mismatch'

export type Reference = {
  /** Citation of the paper the fixture comes from. */
  source: string
  doi?: string
  /**
   * Where inside the paper, language-neutral. Leave it unset: table and section names are prose, so they
   * open the localized note instead ("Tables 1-3" / "Tablo 1-3").
   */
  table?: string
  match: ReferenceMatch
  note: Bilingual
}

export type Source = {
  label: string
  doi?: string
  url?: string
}

/** Prose that exists once per language. */
export type LocalizedText = {
  /** At most 2 short sentences (35 words) for the method page header and the method list. */
  summary: string
  /** At most 3 items of up to 12 words each (DESIGN.md, Copy). */
  whenToUse: string[]
  /** Same limits as whenToUse. */
  whenNot: string[]
  inputs: string[]
  /** At most 3. */
  pitfalls: string[]
}

export type MethodContent = {
  id: MethodId
  /** Display name, usually the acronym ("TOPSIS"); differs by language only for non-acronyms (Entropy / Entropi). */
  name: Bilingual
  fullName: Bilingual
  family: MethodFamily
  status: MethodStatus
  /** Year of the origin publication. */
  year: number
  origin: Origin
  steps: MethodStep[]
  combinedWith: Combination[]
  reference: Reference
  sources: Source[]
  en: LocalizedText
  tr: LocalizedText
}

/** Single-language view of a method, as a page component would consume it. */
export type Localized = LocalizedText & {
  name: string
  fullName: string
  steps: { title: string; tex: string; note?: string }[]
  combinedWith: { methodId?: MethodId; text: string }[]
  originNote?: string
  referenceNote: string
}

export function localizeMethod(m: MethodContent, lang: Lang): Localized {
  return {
    ...m[lang],
    name: m.name[lang],
    fullName: m.fullName[lang],
    steps: m.steps.map((s) => ({
      title: s.title[lang],
      tex: s.tex,
      ...(s.note && { note: s.note[lang] }),
    })),
    combinedWith: m.combinedWith.map((c) => ({ ...(c.methodId && { methodId: c.methodId }), text: c.text[lang] })),
    ...(m.origin.note && { originNote: m.origin.note[lang] }),
    referenceNote: m.reference.note[lang],
  }
}
