/** Scores closer than this (relative to their magnitude, floor 1) count as tied. */
export const TIE_TOLERANCE = 1e-12

export const tied = (a: number, b: number): boolean =>
  Math.abs(a - b) <= TIE_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b))

/**
 * Competition ("min") ranking: ranks[i] is the 1-based rank of item i; tied items share
 * the best rank of their group and the next rank skips (0.9, 0.7, 0.7, 0.1 -> 1, 2, 2, 4).
 * `order` 'desc' means a higher score is better.
 */
export function rankScores(scores: number[], order: 'desc' | 'asc'): number[] {
  const sign = order === 'desc' ? -1 : 1
  const idx = scores.map((_, i) => i).sort((a, b) => sign * (scores[a]! - scores[b]!) || a - b)
  const ranks = new Array<number>(scores.length).fill(0)
  let groupScore = NaN
  let groupRank = 0
  idx.forEach((i, pos) => {
    const s = scores[i]!
    if (pos === 0 || !tied(s, groupScore)) {
      groupScore = s
      groupRank = pos + 1
    }
    ranks[i] = groupRank
  })
  return ranks
}
