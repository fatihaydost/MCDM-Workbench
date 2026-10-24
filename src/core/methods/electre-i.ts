import { column, isConstant, isNearConstant, sum, zeros } from '../math'
import { rankScores } from '../rank'
import type { MethodWarning, Problem, RankingMethod, RankingResult, Step } from '../types'
import { assertValid, validateProblem, validateWeights } from '../validate'

/** How pairwise discordance differences are scaled across criteria. */
export type ElectreIDiscordanceScale = 'global' | 'range'

export const ELECTRE_I_DEFAULT_C_HAT = 0.75
export const ELECTRE_I_DEFAULT_D_HAT = 0.5

export type ElectreIParams = {
  /**
   * 'global' (default, Roy 1968): divide the largest raw disadvantage by the global maximum criterion span
   * δ = max_j (max_i g_ij - min_i g_ij).
   * 'range': divide each criterion's disadvantage by that criterion's own span range_j.
   */
  discordanceScale?: ElectreIDiscordanceScale
  /** Concordance threshold ĉ in (0, 1], default 0.75. */
  cHat?: number
  /** Discordance (veto) threshold d̂ in [0, 1], default 0.50. */
  dHat?: number
}

const VALID_SCALES: readonly ElectreIDiscordanceScale[] = ['global', 'range']
const BOUNDARY_EPS = 1e-12

function computeKernelWithCycles(S: readonly (readonly number[])[]): { kernel: number[]; hasCycle: boolean } {
  const m = S.length
  if (m === 0) return { kernel: [], hasCycle: false }

  // 1. Reachability matrix via BFS from each alternative to identify strongly connected components (SCCs).
  const reach: boolean[][] = Array.from({ length: m }, () => new Array<boolean>(m).fill(false))
  for (let start = 0; start < m; start++) {
    const r = reach[start]!
    r[start] = true
    const queue: number[] = [start]
    while (queue.length > 0) {
      const u = queue.shift()!
      const row = S[u]
      if (!row) continue
      for (let v = 0; v < m; v++) {
        if (!r[v] && u !== v && (row[v] ?? 0) > 0) {
          r[v] = true
          queue.push(v)
        }
      }
    }
  }

  // 2. Partition alternatives into strongly connected equivalence classes.
  const classes: number[][] = []
  const classOf = new Array<number>(m).fill(-1)
  for (let i = 0; i < m; i++) {
    if (classOf[i] !== -1) continue
    const cid = classes.length
    const members: number[] = []
    for (let j = i; j < m; j++) {
      if (classOf[j] === -1 && reach[i]![j] && reach[j]![i]) {
        classOf[j] = cid
        members.push(j)
      }
    }
    classes.push(members)
  }

  const hasCycle = classes.some((c) => c.length > 1)

  // 3. Direct outranking arcs between distinct SCC classes (condensed DAG).
  const k = classes.length
  const classArc: boolean[][] = Array.from({ length: k }, () => new Array<boolean>(k).fill(false))
  for (let u = 0; u < m; u++) {
    const cu = classOf[u]!
    const row = S[u]
    if (!row) continue
    for (let v = 0; v < m; v++) {
      const cv = classOf[v]!
      if (cu !== cv && (row[v] ?? 0) > 0) {
        classArc[cu]![cv] = true
      }
    }
  }

  // 4. Iteratively take classes with no incoming arc from remaining active classes and delete what they outrank.
  const active = new Array<boolean>(k).fill(true)
  const inKernelClass = new Array<boolean>(k).fill(false)
  while (active.some(Boolean)) {
    const sources: number[] = []
    for (let c = 0; c < k; c++) {
      if (!active[c]) continue
      let hasIncoming = false
      for (let p = 0; p < k; p++) {
        if (active[p] && p !== c && classArc[p]![c]) {
          hasIncoming = true
          break
        }
      }
      if (!hasIncoming) sources.push(c)
    }
    // A finite DAG always has at least one source; fallback guards against malformed input.
    if (sources.length === 0) {
      const firstActive = active.findIndex(Boolean)
      if (firstActive === -1) break
      sources.push(firstActive)
    }
    for (const src of sources) {
      inKernelClass[src] = true
      active[src] = false
    }
    for (const src of sources) {
      for (let q = 0; q < k; q++) {
        if (classArc[src]![q]) active[q] = false
      }
    }
  }

  const kernel: number[] = []
  for (let c = 0; c < k; c++) {
    if (inKernelClass[c]) kernel.push(...classes[c]!)
  }
  return { kernel: kernel.sort((a, b) => a - b), hasCycle }
}

/**
 * Computes the ELECTRE I choice kernel K (0-based alternative indices in ascending order) from an m x m binary
 * outranking matrix S.
 *
 * Condenses strongly connected components (cycles of mutual outranking) of S into single equivalence classes so the
 * reduced graph is a DAG, then iteratively places all active classes with no incoming arc into K and removes them
 * together with every class they directly outrank (Roy 1968; Figueira, Mousseau & Roy 2005).
 */
export function electreIKernel(S: readonly (readonly number[])[]): number[] {
  return computeKernelWithCycles(S).kernel
}

/**
 * ELECTRE I — ELimination Et Choix Traduisant la REalité I
 * (Roy 1968; Hwang & Yoon 1981; Wang & Triantaphyllou 2008).
 *
 * Steps:
 *   1. Orient criteria so higher is better: g_j(a) = +x_aj (benefit) or -x_aj (cost).
 *   2. Concordance matrix: C(a, b) = sum_{j: g_j(a) >= g_j(b)} w_j / sum_j w_j, C(a, a) = 1.
 *   3. Discordance matrix: D(a, b) under 'global' (Roy 1968 common-scale span δ) or 'range' (per-criterion span), D(a, a) = 0.
 *   4. Outranking matrix: S(a, b) = 1 iff a != b, C(a, b) >= ĉ and D(a, b) <= d̂, S(a, a) = 0.
 *   5. Kernel membership vector (1 = in kernel K after SCC cycle condensation, 0 = outranked).
 *   6. Net concordance C_net(a) = sum_{b != a} (C(a, b) - C(b, a)).
 *   7. Net discordance D_net(a) = sum_{b != a} (D(a, b) - D(b, a)).
 *   8. Normalized net outranking score Φ(a) = (C_net(a) - D_net(a)) / (2(m - 1)) in [-1, 1], ranked descending.
 *
 * See docs/research/methods/electre-i.md.
 */
export const electreI: RankingMethod<ElectreIParams> = {
  id: 'electre-i',
  kind: 'ranking',
  params: [
    {
      key: 'discordanceScale',
      kind: 'choice',
      options: ['global', 'range'],
      default: 'global',
    },
    {
      key: 'cHat',
      kind: 'number',
      min: 0.5,
      max: 1,
      step: 0.01,
      default: ELECTRE_I_DEFAULT_C_HAT,
    },
    {
      key: 'dHat',
      kind: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: ELECTRE_I_DEFAULT_D_HAT,
    },
  ],
  compute(problem: Problem, weights: number[], params: ElectreIParams = {}): RankingResult {
    const scale: ElectreIDiscordanceScale = params?.discordanceScale ?? 'global'
    if (!VALID_SCALES.includes(scale)) {
      throw new RangeError(`ELECTRE I discordanceScale must be one of ${VALID_SCALES.join(', ')}; got ${String(scale)}`)
    }
    const cHat = params?.cHat ?? ELECTRE_I_DEFAULT_C_HAT
    if (typeof cHat !== 'number' || !Number.isFinite(cHat) || cHat < 0.5 || cHat > 1) {
      throw new RangeError(`ELECTRE I cHat must be in [0.5, 1], got ${String(cHat)}`)
    }
    const dHat = params?.dHat ?? ELECTRE_I_DEFAULT_D_HAT
    if (typeof dHat !== 'number' || !Number.isFinite(dHat) || dHat < 0 || dHat > 1) {
      throw new RangeError(`ELECTRE I dHat must be in [0, 1], got ${String(dHat)}`)
    }

    const m = problem.alternatives.length
    const n = problem.criteria.length
    const issues = validateProblem(problem)
    assertValid([...issues, ...validateWeights(weights, n)])

    const { matrix, criteria } = problem
    const wTotal = sum(weights)
    const warnings: MethodWarning[] = []

    // 1. Orient all criteria so larger is better: +x_ij for benefit, -x_ij for cost.
    const oriented = zeros(m, n)
    const ranges = new Array<number>(n).fill(0)
    const constCols = new Array<boolean>(n).fill(false)
    let delta = 0
    for (let j = 0; j < n; j++) {
      const col = column(matrix, j)
      const sign = criteria[j]!.type === 'benefit' ? 1 : -1
      let lo = Infinity
      let hi = -Infinity
      for (let i = 0; i < m; i++) {
        const g = sign * matrix[i]![j]! + 0
        oriented[i]![j] = g
        if (g < lo) lo = g
        if (g > hi) hi = g
      }
      if (isConstant(col)) {
        constCols[j] = true
        ranges[j] = 0
        continue
      }
      if (isNearConstant(col)) {
        warnings.push({ code: 'electre-i.near-constant-column', col: j })
      }
      const r = hi - lo
      ranges[j] = r
      if (r > delta) delta = r
    }

    // 2. Concordance C(a, b) and 3. Discordance D(a, b).
    const concordance = zeros(m, m)
    const discordance = zeros(m, m)
    for (let a = 0; a < m; a++) {
      concordance[a]![a] = 1
      discordance[a]![a] = 0
      for (let b = 0; b < m; b++) {
        if (a === b) continue
        let wSum = 0
        let maxDiff = 0
        for (let j = 0; j < n; j++) {
          if (constCols[j]) {
            wSum += weights[j]!
            continue
          }
          const ga = oriented[a]![j]!
          const gb = oriented[b]![j]!
          if (ga >= gb - BOUNDARY_EPS) {
            wSum += weights[j]!
          }
          const loss = gb - ga
          if (loss > 0) {
            if (scale === 'global') {
              if (loss > maxDiff) maxDiff = loss
            } else {
              const rj = ranges[j]!
              if (rj > BOUNDARY_EPS) {
                const ratio = loss / rj
                if (ratio > maxDiff) maxDiff = ratio
              }
            }
          }
        }
        concordance[a]![b] = wTotal > 0 ? wSum / wTotal + 0 : 0
        discordance[a]![b] = scale === 'global' ? (delta > BOUNDARY_EPS ? maxDiff / delta + 0 : 0) : maxDiff + 0
      }
    }

    // 4. Outranking matrix S(a, b).
    const outranking = zeros(m, m)
    let outrankingEdges = 0
    for (let a = 0; a < m; a++) {
      for (let b = 0; b < m; b++) {
        if (a === b) continue
        if (concordance[a]![b]! >= cHat - BOUNDARY_EPS && discordance[a]![b]! <= dHat + BOUNDARY_EPS) {
          outranking[a]![b] = 1
          outrankingEdges++
        }
      }
    }

    // 5. Kernel membership vector after SCC cycle condensation.
    const { kernel: kernelIndices, hasCycle } = computeKernelWithCycles(outranking)
    if (hasCycle) {
      warnings.push({ code: 'electre-i.cycle-detected' })
    }
    const kernelSet = new Set(kernelIndices)
    const kernel = Array.from({ length: m }, (_, i) => (kernelSet.has(i) ? 1 : 0))

    // 6. Net concordance, 7. Net discordance, and 8. Normalized net outranking score Φ(a) in [-1, 1].
    const netConcordance = new Array<number>(m).fill(0)
    const netDiscordance = new Array<number>(m).fill(0)
    const denom = 2 * (m - 1)
    const netScore = new Array<number>(m).fill(0)
    for (let a = 0; a < m; a++) {
      let cSum = 0
      let dSum = 0
      for (let b = 0; b < m; b++) {
        if (a === b) continue
        cSum += concordance[a]![b]! - concordance[b]![a]!
        dSum += discordance[a]![b]! - discordance[b]![a]!
      }
      netConcordance[a] = cSum + 0
      netDiscordance[a] = dSum + 0
      netScore[a] = (cSum - dSum) / denom + 0
    }

    const ranking = rankScores(netScore, 'desc')
    if (kernel.some((k) => k === 1)) {
      for (let i = 0; i < m; i++) {
        if (ranking[i] === 1 && kernel[i] === 0) {
          warnings.push({ code: 'electre-i.non-kernel-leader', row: i })
        }
      }
    }

    const steps: Step[] = [
      { key: 'electre-i.oriented', matrix: oriented, axes: ['alternatives', 'criteria'] },
      { key: 'electre-i.concordance', matrix: concordance, axes: ['alternatives', 'alternatives'] },
      { key: 'electre-i.discordance', matrix: discordance, axes: ['alternatives', 'alternatives'] },
      { key: 'electre-i.outranking', matrix: outranking, axes: ['alternatives', 'alternatives'] },
      { key: 'electre-i.kernel', vector: kernel, axes: 'alternatives' },
      { key: 'electre-i.netConcordance', vector: netConcordance, axes: 'alternatives' },
      { key: 'electre-i.netDiscordance', vector: netDiscordance, axes: 'alternatives' },
      { key: 'electre-i.netScore', vector: netScore, axes: 'alternatives' },
    ]

    return {
      scores: netScore,
      order: 'desc',
      ranking,
      steps,
      diagnostics: {
        cHat,
        dHat,
        delta,
        kernelSize: kernelIndices.length,
        outrankingEdges,
      },
      warnings,
    }
  },
}
