import type { Judgements, Ratio } from './types'

/** Saaty's 17 values, ascending: 1/9 … 1/2, 1, 2 … 9. */
export const SCALE: readonly Ratio[] = [
  ...[9, 8, 7, 6, 5, 4, 3, 2].map((d) => 1 / d),
  1,
  2, 3, 4, 5, 6, 7, 8, 9,
]

/** The scale value within 1e-9 of v, else null. */
export function toScale(v: unknown): Ratio | null {
  if (typeof v !== 'number') return null
  return SCALE.find((s) => Math.abs(s - v) < 1e-9) ?? null
}

/** Closest Saaty scale value to a positive ratio (log-distance so 1 / v maps to the reciprocal of v). */
export function nearestScale(v: number): Ratio {
  if (!(v > 0) || !Number.isFinite(v)) return 1
  const target = Math.log(v)
  let best = 1
  let bestDist = Math.abs(target)
  for (const s of SCALE) {
    const dist = Math.abs(Math.log(s) - target)
    if (dist < bestDist - 1e-12 || (Math.abs(dist - bestDist) <= 1e-12 && Math.abs(Math.log(s)) < Math.abs(Math.log(best)))) {
      best = s
      bestDist = dist
    }
  }
  return best
}

const reciprocal = (v: Ratio): Ratio => toScale(1 / v) ?? 1 / v

export function emptyJudgements(n: number): Judgements {
  return {
    pairs: Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, k) => (i === k ? 1 : null))),
    best: null,
    worst: null,
  }
}

/** Writes [i][k] = v and [k][i] = 1 / v; returns a new object. */
export function setPair(j: Judgements, i: number, k: number, v: Ratio | null): Judgements {
  const pairs = j.pairs.map((row) => row.slice())
  pairs[i]![k] = v
  pairs[k]![i] = v === null ? null : reciprocal(v)
  return { ...j, pairs }
}

/** next[a][b] = old[map[a]][map[b]]; an unmapped row/column is null; anchors follow the map or become null. */
export function remapJudgements(j: Judgements, map: readonly (number | undefined)[]): Judgements {
  const pairs = map.map((oa, a) =>
    map.map((ob, b) => (a === b ? 1 : oa === undefined || ob === undefined ? null : (j.pairs[oa]?.[ob] ?? null))),
  )
  const follow = (old: number | null) => {
    const at = old === null ? -1 : map.indexOf(old)
    return at < 0 ? null : at
  }
  return { pairs, best: follow(j.best), worst: follow(j.worst) }
}

/** Trust boundary: refit anything to a valid n × n Judgements (upper triangle wins, off-scale → null). */
export function sanitizeJudgements(raw: unknown, n: number): Judgements {
  const r = (raw ?? {}) as { pairs?: unknown; best?: unknown; worst?: unknown }
  const rows = Array.isArray(r.pairs) ? r.pairs : []
  const out = emptyJudgements(n)
  for (let i = 0; i < n; i++)
    for (let k = i + 1; k < n; k++) {
      const row = rows[i]
      const v = toScale(Array.isArray(row) ? row[k] : undefined)
      if (v !== null) {
        out.pairs[i]![k] = v
        out.pairs[k]![i] = reciprocal(v)
      }
    }
  const anchor = (a: unknown) => (Number.isInteger(a) && (a as number) >= 0 && (a as number) < n ? (a as number) : null)
  const best = anchor(r.best)
  const worst = anchor(r.worst)
  return best !== null && best === worst ? out : { ...out, best, worst }
}

/** BWM vectors as pairwise answers: pairs[B][j] = bestToOthers[j], pairs[j][W] = othersToWorst[j]. */
export function judgementsFromBwm(
  n: number,
  best: number,
  worst: number,
  bestToOthers: readonly number[],
  othersToWorst: readonly number[],
): Judgements {
  let j: Judgements = { ...emptyJudgements(n), best, worst }
  for (let k = 0; k < n; k++) {
    if (k !== best) j = setPair(j, best, k, bestToOthers[k]!)
    if (k !== worst) j = setPair(j, k, worst, othersToWorst[k]!)
  }
  return j
}

/** Upper-triangle row-by-row values (length n(n - 1) / 2; null = unanswered) as pairwise answers. */
export function judgementsFromUpper(n: number, upper: readonly (number | null | undefined)[]): Judgements {
  let j = emptyJudgements(n)
  let at = 0
  for (let i = 0; i < n; i++)
    for (let k = i + 1; k < n; k++) {
      const raw = upper[at++]
      const v = raw === null || raw === undefined ? null : (toScale(raw) ?? raw)
      if (v !== null) j = setPair(j, i, k, v)
    }
  return j
}
