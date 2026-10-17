/** Pure helpers of the live ranking and the weight slider: orders and weight steps on the 0.01 grid. */

/** Alternatives in rank order; ties keep input order. */
export function rankOrder(ranking: readonly number[]): number[] {
  return ranking.map((_, i) => i).sort((a, b) => ranking[a]! - ranking[b]! || a - b)
}

/** Alternatives whose row position differs between two orders (both lists of alternative indices). */
export function movedAlternatives(prev: readonly number[], next: readonly number[]): number[] {
  const at = new Map(prev.map((i, pos) => [i, pos]))
  return next.filter((i, pos) => at.get(i) !== pos)
}

/** Weight on the 0.01 grid (or the given `step`'s), inside [0, 1] (pointer input). */
export function snapWeight(v: number, step = 0.01): number {
  if (!Number.isFinite(v)) return 0
  const k = Math.round(1 / step)
  return Math.min(1, Math.max(0, Math.round(v * k) / k))
}

/** Values that agree to 12 decimals are the same weight (0.1 + 0.2 and 0.3). */
const same = (a: number, b: number) => Math.abs(a - b) < 1e-9

/**
 * A step of `steps` grid points (0.01 each, or `step`) from `v`: from a value off the grid (the user's weight, 0.1872)
 * the first step lands on the next grid point in that direction (0.19 up, 0.18 down), then it moves 0.01 at a time.
 */
export function stepWeight(v: number, steps: number, step = 0.01): number {
  if (steps === 0) return v
  const k = Math.round(1 / step)
  const scaled = v * k
  const onGrid = same(scaled, Math.round(scaled))
  const from = onGrid ? Math.round(scaled) : steps > 0 ? Math.floor(scaled) : Math.ceil(scaled)
  return Math.min(1, Math.max(0, (from + steps) / k))
}
