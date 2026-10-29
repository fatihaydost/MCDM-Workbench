import {
  emptyAlternativeJudgements,
  emptyJudgements,
  getRankingMethod,
  getWeightingMethod,
  isValidParam,
  MAX_MAGNITUDE,
  MIN_MAGNITUDE,
  sanitizeAlternativeJudgements,
  sanitizeJudgements,
  type AlternativeJudgements,
  type Criterion,
  type Judgements,
  type MethodParamValue,
  type Ratio,
} from '../../core'
import { getExample } from '../../data/examples'
import {
  sanitizeMethodParams,
  STAGES,
  type DraftProblem,
  type MethodParamsState,
  type RankingMethodId,
  type Stage,
  type WeightMethodId,
  type WorkbenchData,
} from '../../state/workbench'

export type ShareState = Pick<
  WorkbenchData,
  | 'problem'
  | 'weightMethod'
  | 'rankingMethod'
  | 'manualWeights'
  | 'methodParams'
  | 'judgements'
  | 'alternativeJudgements'
  | 'stage'
  | 'exampleId'
>

type WireProblem = {
  a: string[]
  c: [string, 0 | 1][]
  m: (number | null)[][]
}

type WireJudgements = {
  u: (Ratio | null)[]
  b?: number | null
  w?: number | null
}

type WirePayload = {
  v: 1
  p: WireProblem
  wm: WeightMethodId
  rm: RankingMethodId
  mw?: (number | null)[]
  mp?: MethodParamsState
  j?: WireJudgements
  aj?: ((Ratio | null)[] | null)[]
  st: Stage
  ex?: string | null
}

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64: string): string | null {
  if (!b64 || !/^[A-Za-z0-9\-_]+$/.test(b64)) return null
  try {
    const pad = b64.length % 4
    const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + (pad ? '='.repeat(4 - pad) : '')
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

function upperOf(pairs: readonly (readonly (Ratio | null)[])[], size: number): (Ratio | null)[] {
  const out: (Ratio | null)[] = []
  for (let i = 0; i < size; i++) {
    for (let k = i + 1; k < size; k++) {
      out.push(pairs[i]?.[k] ?? null)
    }
  }
  return out
}

function hasAnyJudgement(j: Judgements | undefined, n: number): boolean {
  if (!j || j.pairs.length !== n) return false
  if (j.best !== null || j.worst !== null) return true
  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k < n; k++) {
      if (j.pairs[i]?.[k] != null) return true
    }
  }
  return false
}

function hasAnyAltJudgement(aj: AlternativeJudgements | undefined, m: number, n: number): boolean {
  if (!aj || aj.length !== n) return false
  return aj.some((mat) => Array.isArray(mat) && mat.length === m)
}

function isValidCellNumber(v: unknown): v is number | null {
  if (v === null) return true
  if (typeof v !== 'number' || !Number.isFinite(v)) return false
  if (v === 0) return true
  const abs = Math.abs(v)
  return abs >= MIN_MAGNITUDE && abs <= MAX_MAGNITUDE
}

function cleanMethodParams(raw: unknown, n: number): MethodParamsState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const sanitized = sanitizeMethodParams(raw as Record<string, Record<string, unknown>>, n)
  const out: MethodParamsState = {}
  for (const [methodId, params] of Object.entries(sanitized)) {
    const method = getWeightingMethod(methodId) ?? getRankingMethod(methodId)
    if (!method || !params) continue
    const descriptors = method.params ?? []
    const cleaned: Record<string, MethodParamValue> = {}
    for (const [k, v] of Object.entries(params)) {
      const desc = descriptors.find((d) => d.key === k)
      if (desc) {
        if (isValidParam(desc, v)) cleaned[k] = v
      } else if (Array.isArray(v)) {
        cleaned[k] = v as unknown as MethodParamValue
      }
    }
    if (Object.keys(cleaned).length > 0) out[methodId] = cleaned
  }
  return out
}

/** Encodes a workbench state into a compact URL-safe base64url token for `?s=<token>`. */
export function encodeShareState(state: ShareState): string {
  const { problem } = state
  const m = problem.alternatives.length
  const n = problem.criteria.length

  const wireProblem: WireProblem = {
    a: [...problem.alternatives],
    c: problem.criteria.map((c) => [c.name, c.type === 'cost' ? 0 : 1]),
    m: problem.matrix.slice(0, m).map((row) => Array.from({ length: n }, (_, j) => (isValidCellNumber(row?.[j] ?? null) ? (row?.[j] ?? null) : null))),
  }

  const wire: WirePayload = {
    v: 1,
    p: wireProblem,
    wm: state.weightMethod,
    rm: state.rankingMethod,
    st: state.stage,
  }

  const mw = Array.from({ length: n }, (_, j) => {
    const w = state.manualWeights?.[j] ?? null
    return typeof w === 'number' && Number.isFinite(w) && w >= 0 ? w : null
  })
  if (mw.some((w) => w !== null)) wire.mw = mw

  const mp = cleanMethodParams(state.methodParams, n)
  if (Object.keys(mp).length > 0) wire.mp = mp

  if (hasAnyJudgement(state.judgements, n) && state.judgements) {
    wire.j = {
      u: upperOf(state.judgements.pairs, n),
      ...(state.judgements.best !== null ? { b: state.judgements.best } : {}),
      ...(state.judgements.worst !== null ? { w: state.judgements.worst } : {}),
    }
  }

  if (hasAnyAltJudgement(state.alternativeJudgements, m, n) && state.alternativeJudgements) {
    wire.aj = state.alternativeJudgements.slice(0, n).map((mat) => (mat && mat.length === m ? upperOf(mat, m) : null))
  }

  if (state.exampleId && getExample(state.exampleId)) {
    wire.ex = state.exampleId
  }

  return toBase64Url(JSON.stringify(wire))
}

/** Decodes and validates a `?s=<token>` share parameter; returns `null` on any invalid or corrupted input. */
export function decodeShareState(token: string | null | undefined): ShareState | null {
  if (!token || typeof token !== 'string') return null
  const json = fromBase64Url(token.trim())
  if (!json) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const raw = parsed as Record<string, unknown>
  if (raw.v !== 1) return null

  const p = raw.p as Record<string, unknown> | undefined
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null
  if (!Array.isArray(p.a) || !Array.isArray(p.c) || !Array.isArray(p.m)) return null

  const m = p.a.length
  const n = p.c.length
  if (m < 1 || m > 200 || n < 1 || n > 100 || p.m.length !== m) return null
  if (!p.a.every((x) => typeof x === 'string')) return null

  const criteria: Criterion[] = []
  for (const item of p.c) {
    if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && (item[1] === 0 || item[1] === 1)) {
      criteria.push({ name: item[0], type: item[1] === 0 ? 'cost' : 'benefit' })
    } else if (
      item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      typeof (item as { name?: unknown }).name === 'string' &&
      ((item as { type?: unknown }).type === 'benefit' || (item as { type?: unknown }).type === 'cost')
    ) {
      criteria.push({ name: (item as { name: string }).name, type: (item as { type: 'benefit' | 'cost' }).type })
    } else {
      return null
    }
  }

  const matrix: (number | null)[][] = []
  for (const row of p.m) {
    if (!Array.isArray(row) || row.length !== n) return null
    const cleanRow: (number | null)[] = []
    for (const cell of row) {
      if (!isValidCellNumber(cell)) return null
      cleanRow.push(cell)
    }
    matrix.push(cleanRow)
  }

  const wm = raw.wm
  if (wm !== 'manual' && (typeof wm !== 'string' || !getWeightingMethod(wm))) return null
  const rm = raw.rm
  if (typeof rm !== 'string' || !getRankingMethod(rm)) return null
  const st = raw.st
  if (typeof st !== 'string' || !(STAGES as readonly string[]).includes(st)) return null

  let manualWeights: (number | null)[] = new Array<number | null>(n).fill(null)
  if (raw.mw !== undefined) {
    if (!Array.isArray(raw.mw) || raw.mw.length !== n) return null
    manualWeights = raw.mw.map((w) => {
      if (w === null) return null
      if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) return NaN
      return w
    })
    if (manualWeights.some((w) => Number.isNaN(w))) return null
  }

  let judgements: Judgements = emptyJudgements(n)
  if (raw.j !== undefined && raw.j !== null) {
    if (typeof raw.j !== 'object' || Array.isArray(raw.j)) return null
    const jObj = raw.j as Record<string, unknown>
    if (Array.isArray(jObj.u)) {
      const pairs: (unknown | null)[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, k) => (i === k ? 1 : null)),
      )
      let at = 0
      for (let i = 0; i < n; i++) {
        for (let k = i + 1; k < n; k++) {
          pairs[i]![k] = jObj.u[at++] ?? null
        }
      }
      judgements = sanitizeJudgements({ pairs, best: jObj.b ?? null, worst: jObj.w ?? null }, n)
    } else if (Array.isArray(jObj.pairs)) {
      judgements = sanitizeJudgements(jObj, n)
    } else {
      return null
    }
  }

  let alternativeJudgements: AlternativeJudgements = emptyAlternativeJudgements(n)
  if (raw.aj !== undefined && raw.aj !== null) {
    if (!Array.isArray(raw.aj) || raw.aj.length !== n) return null
    const rawMats = raw.aj.map((entry) => {
      if (entry === null) return null
      if (!Array.isArray(entry)) return undefined
      if (entry.length === (m * (m - 1)) / 2 && !Array.isArray(entry[0])) {
        const mat: (unknown | null)[][] = Array.from({ length: m }, (_, i) =>
          Array.from({ length: m }, (_, k) => (i === k ? 1 : null)),
        )
        let at = 0
        for (let i = 0; i < m; i++) {
          for (let k = i + 1; k < m; k++) {
            mat[i]![k] = entry[at++] ?? null
          }
        }
        return mat
      }
      return entry
    })
    if (rawMats.some((x) => x === undefined)) return null
    alternativeJudgements = sanitizeAlternativeJudgements(rawMats, m, n)
  }

  const exampleId = typeof raw.ex === 'string' && getExample(raw.ex) ? raw.ex : null
  const problem: DraftProblem = {
    alternatives: p.a as string[],
    criteria,
    matrix,
  }

  return {
    problem,
    weightMethod: wm as WeightMethodId,
    rankingMethod: rm as RankingMethodId,
    manualWeights,
    methodParams: cleanMethodParams(raw.mp, n),
    judgements,
    alternativeJudgements,
    stage: st as Stage,
    exampleId,
  }
}

/** Builds the full shareable URL (`<origin><BASE_URL>app?s=<token>`) for the given workbench state. */
export function buildShareUrl(state: ShareState, origin?: string, baseUrl?: string): string {
  const token = encodeShareState(state)
  const resolvedOrigin = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://localhost')
  const resolvedBase = baseUrl ?? import.meta.env.BASE_URL ?? '/'
  const normalizedBase = resolvedBase.endsWith('/') ? resolvedBase : `${resolvedBase}/`
  return `${resolvedOrigin}${normalizedBase}app?s=${token}`
}
