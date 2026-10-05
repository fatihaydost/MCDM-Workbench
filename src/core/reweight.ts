/** One-at-a-time weight change (docs/research/combinations.md §C.1), shared by the robustness stage and the landing hero. */

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/**
 * Set criterion k's weight to `wk` (clamped to [0, 1]) and rescale the others proportionally so the sum stays 1:
 * w_j' = w_j (1 - wk') / (1 - w_k). When w_k = 1 the others cannot be rescaled: they share 1 - wk' equally.
 *
 * Implementation: the divisor is the actual sum of the other weights (equal to 1 - w_k for a valid weight
 * vector), so the result sums to 1 even when the input is off by rounding. If that sum is 0 (w_k = 1, or all
 * other weights 0) the others share 1 - wk' equally. A single criterion always gets [1].
 */
export function reweight(weights: readonly number[], k: number, wk: number): number[] {
  const n = weights.length
  if (k < 0 || k >= n || !Number.isInteger(k)) throw new RangeError(`criterion index ${k} out of range`)
  if (n === 1) return [1]
  const target = clamp01(wk)
  let others = 0
  for (let j = 0; j < n; j++) if (j !== k) others += weights[j]!
  const rest = 1 - target
  const out = new Array<number>(n)
  for (let j = 0; j < n; j++) {
    if (j === k) out[j] = target
    else out[j] = others > 0 ? (weights[j]! * rest) / others : rest / (n - 1)
  }
  return out
}
