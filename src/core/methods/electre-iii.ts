import { column, isConstant, isNearConstant, maxOf, minOf, sum } from '../math'
import { rankScores, TIE_TOLERANCE } from '../rank'
import type { MethodWarning, Problem, RankingMethod, Step } from '../types'
import { assertValid, validateProblem, validateRequirements, validateWeights } from '../validate'

export type ElectreIIIThresholdPreset = 'standard' | 'strict' | 'veto'

export type ThresholdSpec =
  | number
  | { readonly abs: number }
  | { readonly rel: number; readonly ref?: 'direct' | 'inverse' }

export type ElectreIIIParams = {
  /** Column-range threshold preset for the interactive workbench (default 'standard'). */
  readonly thresholdPreset?: ElectreIIIThresholdPreset
  /** Optional per-criterion indifference thresholds q_j (overrides preset). */
  readonly q?: readonly ThresholdSpec[]
  /** Optional per-criterion preference thresholds p_j (overrides preset). */
  readonly p?: readonly ThresholdSpec[]
  /** Optional per-criterion veto thresholds v_j, or null for no veto on criterion j (overrides preset). */
  readonly v?: readonly (ThresholdSpec | null)[]
  /** Distillation discrimination intercept α in s(λ) = α + β·λ (default 0.30). */
  readonly alpha?: number
  /** Distillation discrimination slope β in s(λ) = α + β·λ (default -0.15). */
  readonly beta?: number
}

export type ElectreIIIDistillationResult = {
  /** 1-based competition ranks from descending distillation (best first). */
  readonly descending: number[]
  /** 1-based competition ranks from ascending distillation (worst last, oriented 1 = best). */
  readonly ascending: number[]
  /** Equivalence classes from descending distillation (0-based alternative indices, top to bottom). */
  readonly descendingClasses: number[][]
  /** Equivalence classes from ascending distillation (0-based alternative indices, top to bottom). */
  readonly ascendingClasses: number[][]
  /** Pairs [a, b] (a < b) where descending and ascending distillations strictly disagree in order. */
  readonly incomparablePairs: [number, number][]
}

const VALID_PRESETS: readonly ElectreIIIThresholdPreset[] = ['standard', 'strict', 'veto']

function evalThreshold(spec: ThresholdSpec, xA: number, xB: number): number {
  if (typeof spec === 'number') {
    if (!Number.isFinite(spec) || spec < 0) throw new RangeError('ELECTRE III threshold must be a finite non-negative number')
    return spec
  }
  if (typeof spec !== 'object' || spec === null) {
    throw new RangeError('ELECTRE III threshold must be a finite non-negative number or threshold spec object')
  }
  if ('abs' in spec) {
    if (!Number.isFinite(spec.abs) || spec.abs < 0) throw new RangeError('ELECTRE III abs threshold must be a finite non-negative number')
    return spec.abs
  }
  if (!Number.isFinite(spec.rel) || spec.rel < 0) throw new RangeError('ELECTRE III rel threshold must be a finite non-negative number')
  const refVal = spec.ref === 'inverse' ? xB : xA
  return spec.rel * Math.abs(refVal)
}

function partialConcordance(delta: number, q: number, p: number, eps: number): number {
  if (delta <= q + eps) return 1
  if (delta >= p - eps) return 0
  return (p - delta) / (p - q)
}

function partialDiscordance(delta: number, p: number, v: number | null, eps: number): number {
  if (v === null) return 0
  if (delta >= v - eps) return 1
  if (delta <= p + eps) return 0
  return (delta - p) / (v - p)
}

function classesToCompetitionRanks(classes: readonly (readonly number[])[], m: number): number[] {
  const ranks = new Array<number>(m).fill(1)
  let pos = 1
  for (const cls of classes) {
    for (const a of cls) ranks[a] = pos
    pos += cls.length
  }
  return ranks
}

function distillDirection(
  credibility: readonly (readonly number[])[],
   pickMax: boolean,
  alpha: number,
  beta: number,
): number[][] {
  const m = credibility.length
  let remaining = Array.from({ length: m }, (_, i) => i)
  const classes: number[][] = []

  while (remaining.length > 0) {
    if (remaining.length === 1) {
      classes.push([...remaining])
      break
    }

    let lambda0 = 0
    for (const a of remaining) {
      for (const b of remaining) {
        if (a !== b) {
          const sab = credibility[a]![b]!
          if (sab > lambda0) lambda0 = sab
        }
      }
    }

    let D = [...remaining]
    while (D.length > 1 && lambda0 > TIE_TOLERANCE) {
      const cutoff = lambda0 - (alpha + beta * lambda0)
      let lambda1 = 0
      for (const a of D) {
        for (const b of D) {
          if (a !== b) {
            const sab = credibility[a]![b]!
            if (sab < cutoff - TIE_TOLERANCE && sab > lambda1) {
              lambda1 = sab
            }
          }
        }
      }

      const qualifications = D.map((a) => {
        let strength = 0
        let weakness = 0
        for (const b of D) {
          if (a === b) continue
          const sab = credibility[a]![b]!
          const sba = credibility[b]![a]!
          if (sab > lambda1 + TIE_TOLERANCE && sab - sba > alpha + beta * sab + TIE_TOLERANCE) {
            strength += 1
          }
          if (sba > lambda1 + TIE_TOLERANCE && sba - sab > alpha + beta * sba + TIE_TOLERANCE) {
            weakness += 1
          }
        }
        return strength - weakness
      })

      const target = pickMax ? maxOf(qualifications) : minOf(qualifications)
      const nextD = D.filter((_, idx) => Math.abs(qualifications[idx]! - target) <= TIE_TOLERANCE)

      if (nextD.length === D.length && lambda1 <= TIE_TOLERANCE) {
        break
      }
      D = nextD
      lambda0 = lambda1
    }

    classes.push(D)
    const inClass = new Set(D)
    remaining = remaining.filter((a) => !inClass.has(a))
  }

  if (!pickMax) {
    classes.reverse()
  }
  return classes
}

/**
 * Returns every pair [a, b] (with a < b) of alternatives that are incomparable (a R b):
 * one ranks strictly better in the descending distillation while the other ranks strictly better in the ascending distillation.
 */
export function electreIIIIncomparablePairs(
  descending: readonly number[],
  ascending: readonly number[],
): [number, number][] {
  const m = descending.length
  const pairs: [number, number][] = []
  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      const dDiff = descending[a]! - descending[b]!
      const aDiff = ascending[a]! - ascending[b]!
      if (dDiff * aDiff < 0) {
        pairs.push([a, b])
      }
    }
  }
  return pairs
}

/**
 * Runs Roy's (1978) descending and ascending distillations on an m × m credibility matrix σ(a, b)
 * with discrimination threshold s(λ) = α + β·λ.
 */
export function electreIIIDistill(
  credibility: readonly (readonly number[])[],
  alpha = 0.3,
  beta = -0.15,
): ElectreIIIDistillationResult {
  const m = credibility.length
  const descendingClasses = distillDirection(credibility, true, alpha, beta)
  const ascendingClasses = distillDirection(credibility, false, alpha, beta)
  const descending = classesToCompetitionRanks(descendingClasses, m)
  const ascending = classesToCompetitionRanks(ascendingClasses, m)
  const incomparablePairs = electreIIIIncomparablePairs(descending, ascending)
  return { descending, ascending, descendingClasses, ascendingClasses, incomparablePairs }
}

/**
 * ELECTRE III (Roy, 1978; Figueira, Mousseau & Roy, 2005; Wang & Triantaphyllou, 2008).
 *
 * Outranking method with pseudo-criteria (indifference q_j, preference p_j, veto v_j),
 * fuzzy credibility matrix σ(a, b), and descending/ascending distillation pre-orders.
 */
export const electreIII: RankingMethod<ElectreIIIParams> = {
  id: 'electre-iii',
  kind: 'ranking',
  params: [
    {
      key: 'thresholdPreset',
      kind: 'choice',
      options: ['standard', 'strict', 'veto'],
      default: 'standard',
    },
  ],
  compute(problem: Problem, weights: number[], params: ElectreIIIParams = {}) {
    assertValid([
      ...validateProblem(problem),
      ...validateWeights(weights, problem.criteria.length),
      ...validateRequirements(problem, this),
    ])

    const preset: ElectreIIIThresholdPreset = params.thresholdPreset ?? 'standard'
    if (!VALID_PRESETS.includes(preset)) {
      throw new RangeError(`invalid ELECTRE III thresholdPreset: ${String(preset)}`)
    }

    const alpha = params.alpha ?? 0.3
    const beta = params.beta ?? -0.15
    if (!Number.isFinite(alpha) || !Number.isFinite(beta)) {
      throw new RangeError('ELECTRE III distillation parameters alpha and beta must be finite numbers')
    }

    const { matrix, criteria } = problem
    const m = matrix.length
    const n = criteria.length

    if (params.q !== undefined && (!Array.isArray(params.q) || params.q.length !== n)) {
      throw new RangeError(
        `ELECTRE III q length (${Array.isArray(params.q) ? params.q.length : typeof params.q}) must match criteria count (${n})`,
      )
    }
    if (params.p !== undefined && (!Array.isArray(params.p) || params.p.length !== n)) {
      throw new RangeError(
        `ELECTRE III p length (${Array.isArray(params.p) ? params.p.length : typeof params.p}) must match criteria count (${n})`,
      )
    }
    if (params.v !== undefined && (!Array.isArray(params.v) || params.v.length !== n)) {
      throw new RangeError(
        `ELECTRE III v length (${Array.isArray(params.v) ? params.v.length : typeof params.v}) must match criteria count (${n})`,
      )
    }

    const warnings: MethodWarning[] = []
    const constantCols = Array.from({ length: n }, (_, j) => {
      const col = column(matrix, j)
      return isConstant(col)
    })
    const ranges = Array.from({ length: n }, (_, j) => {
      const col = column(matrix, j)
      if (!constantCols[j] && isNearConstant(col) && (weights[j] ?? 0) > 0) {
        warnings.push({ code: 'electre-iii.near-constant-column', col: j })
      }
      return constantCols[j] ? 0 : maxOf(col) - minOf(col)
    })

    const presetQFactor = preset === 'strict' ? 0.05 : 0.1
    const presetPFactor = preset === 'strict' ? 0.15 : 0.25
    const presetVFactor = preset === 'veto' ? 0.6 : null

    const wSum = sum(weights)

    // Steps 1-4: Global concordance C(a, b) and credibility σ(a, b)
    const concordance: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0))
    const credibility: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0))

    for (let a = 0; a < m; a++) {
      for (let b = 0; b < m; b++) {
        if (a === b) continue

        let cWeightedSum = 0
        const dValues = new Array<number>(n).fill(0)

        for (let j = 0; j < n; j++) {
          const xA = matrix[a]![j]!
          const xB = matrix[b]![j]!
          const cType = criteria[j]!.type
          // Advantage of b over a on criterion j
          const delta = constantCols[j] ? 0 : cType === 'benefit' ? xB - xA : xA - xB

          const qj = params.q ? evalThreshold(params.q[j]!, xA, xB) : presetQFactor * ranges[j]!
          const pj = params.p ? evalThreshold(params.p[j]!, xA, xB) : presetPFactor * ranges[j]!
          const vSpec = params.v ? params.v[j]! : null
          const vj = params.v
            ? vSpec !== null
              ? evalThreshold(vSpec, xA, xB)
              : null
            : presetVFactor !== null
              ? presetVFactor * ranges[j]!
              : null

          const eps = TIE_TOLERANCE * Math.max(ranges[j]!, Math.abs(qj), Math.abs(pj), vj !== null ? Math.abs(vj) : 0, 1e-100)
          if (qj > pj + eps) {
            throw new RangeError(`ELECTRE III indifference threshold q (${qj}) exceeds preference threshold p (${pj}) on criterion ${j}`)
          }
          if (vj !== null && pj > vj + eps) {
            throw new RangeError(`ELECTRE III preference threshold p (${pj}) exceeds veto threshold v (${vj}) on criterion ${j}`)
          }

          const cj = constantCols[j] ? 1 : partialConcordance(delta, qj, pj, eps)
          cWeightedSum += weights[j]! * cj
          dValues[j] = constantCols[j] ? 0 : partialDiscordance(delta, pj, vj, eps)
        }

        const cab = wSum > 0 ? cWeightedSum / wSum : 0
        concordance[a]![b] = cab

        // Credibility σ(a, b)
        let sab = cab
        if (dValues.some((dj) => dj >= 1 - TIE_TOLERANCE)) {
          sab = 0
        } else if (cab >= 1 - TIE_TOLERANCE) {
          sab = 1
        } else {
          for (let j = 0; j < n; j++) {
            const dj = dValues[j]!
            if (dj > cab + TIE_TOLERANCE) {
              sab *= (1 - dj) / (1 - cab)
            }
          }
        }
        credibility[a]![b] = sab
      }
    }

    // Step 5: Distillation into descending and ascending pre-orders
    const { descending, ascending, incomparablePairs } = electreIIIDistill(credibility, alpha, beta)

    // Net credibility flow Φ(a) = (1 / (m - 1)) * Σ_{b ≠ a} (σ(a, b) - σ(b, a))
    const denom = m - 1
    const netCredibility = Array.from({ length: m }, (_, a) => {
      let net = 0
      for (let b = 0; b < m; b++) {
        if (a !== b) net += credibility[a]![b]! - credibility[b]![a]!
      }
      return net / denom
    })

    // Mean distillation rank r̄(a) = 0.5 * (r_D(a) + r_A(a)), ranked ascending for overall pre-order ranking
    const meanRank = descending.map((rD, i) => 0.5 * (rD + ascending[i]!))

    const steps: Step[] = [
      { key: 'electre-iii.concordance', matrix: concordance, axes: ['alternatives', 'alternatives'] },
      { key: 'electre-iii.credibility', matrix: credibility, axes: ['alternatives', 'alternatives'] },
      { key: 'electre-iii.descending', vector: descending, axes: 'alternatives' },
      { key: 'electre-iii.ascending', vector: ascending, axes: 'alternatives' },
      { key: 'electre-iii.netCredibility', vector: netCredibility, axes: 'alternatives' },
    ]

    return {
      scores: netCredibility,
      order: 'desc',
      ranking: rankScores(meanRank, 'asc'),
      steps,
      diagnostics: { incomparablePairs: incomparablePairs.length },
      warnings,
    }
  },
}
