import { describe, expect, it } from 'vitest'
import {
  electreI,
  electreIKernel,
  getMethod,
  type Problem,
} from '../src/core'
import { getExample } from '../src/data/examples'
import fixture from './fixtures/electre-i-wang2008.json'

describe('ELECTRE I — Wang & Triantaphyllou (2008) Galway wastewater plant', () => {
  const f = fixture.wang2008
  const problem: Problem = {
    alternatives: f.alternatives,
    criteria: f.criteria.map((c) => ({ name: c.name, type: c.type as 'benefit' | 'cost' })),
    matrix: f.matrix,
  }

  it('is registered in the method registry', () => {
    expect(getMethod('electre-i')).toBe(electreI)
    expect(electreI.kind).toBe('ranking')
  })

  it('reproduces the published concordance matrix C and global discordance matrix D within 1e-12', () => {
    const res = electreI.compute(problem, f.weights, {
      cHat: f.cHat,
      dHat: f.dHat,
      discordanceScale: 'global',
    })

    const C = res.steps.find((s) => s.key === 'electre-i.concordance')!.matrix!
    const D = res.steps.find((s) => s.key === 'electre-i.discordance')!.matrix!
    const S = res.steps.find((s) => s.key === 'electre-i.outranking')!.matrix!
    const kernelVec = res.steps.find((s) => s.key === 'electre-i.kernel')!.vector!
    const netC = res.steps.find((s) => s.key === 'electre-i.netConcordance')!.vector!
    const netD = res.steps.find((s) => s.key === 'electre-i.netDiscordance')!.vector!
    const netScore = res.steps.find((s) => s.key === 'electre-i.netScore')!.vector!

    for (let a = 0; a < 5; a++) {
      for (let b = 0; b < 5; b++) {
        expect(Math.abs(C[a]![b]! - f.concordanceMatrix[a]![b]!)).toBeLessThanOrEqual(f.exactTolerance)
        expect(Math.abs(D[a]![b]! - f.discordanceMatrixGlobal[a]![b]!)).toBeLessThanOrEqual(f.exactTolerance)
        expect(S[a]![b]).toBe(f.outrankingMatrixAt075[a]![b])
      }
      expect(Math.abs(netC[a]! - f.netConcordance[a]!)).toBeLessThanOrEqual(f.exactTolerance)
      expect(Math.abs(netD[a]! - f.netDiscordance[a]!)).toBeLessThanOrEqual(f.exactTolerance)
      expect(Math.abs(netScore[a]! - f.netScore[a]!)).toBeLessThanOrEqual(f.exactTolerance)
      expect(Math.abs(res.scores[a]! - f.netScore[a]!)).toBeLessThanOrEqual(f.exactTolerance)
    }

    expect(kernelVec).toEqual(f.kernelVector)
    expect(electreIKernel(S)).toEqual(f.kernelIndices)
    expect(res.ranking).toEqual(f.ranking)
    expect(res.diagnostics?.kernelSize).toBe(3)
    expect(res.diagnostics?.outrankingEdges).toBe(9)
  })

  it('reproduces the per-criterion range discordance matrix D_range within 1e-12', () => {
    const res = electreI.compute(problem, f.weights, {
      cHat: f.cHat,
      dHat: f.dHat,
      discordanceScale: 'range',
    })
    const D = res.steps.find((s) => s.key === 'electre-i.discordance')!.matrix!
    for (let a = 0; a < 5; a++) {
      for (let b = 0; b < 5; b++) {
        expect(Math.abs(D[a]![b]! - f.discordanceMatrixRange[a]![b]!)).toBeLessThanOrEqual(f.exactTolerance)
      }
    }
  })

  it('condenses the {A2, A3} cycle and satisfies kernel internal and external stability at cHat = 0.75 and cHat = 0.85', () => {
    for (const [cHat, expectedS] of [
      [0.75, f.outrankingMatrixAt075],
      [0.85, f.outrankingMatrixAt085],
    ] as const) {
      const res = electreI.compute(problem, f.weights, { cHat, dHat: 0.5 })
      const S = res.steps.find((s) => s.key === 'electre-i.outranking')!.matrix!
      expect(S).toEqual(expectedS)

      // Mutual outranking cycle between A2 (index 1) and A3 (index 2).
      expect(S[1]![2]).toBe(1)
      expect(S[2]![1]).toBe(1)
      expect(res.warnings).toContainEqual({ code: 'electre-i.cycle-detected' })

      const K = electreIKernel(S)
      expect(K).toEqual([1, 2, 4])

      // External stability: every alternative outside K is outranked by at least one member of K.
      const kSet = new Set(K)
      for (let b = 0; b < 5; b++) {
        if (kSet.has(b)) continue
        const dominatedByKernel = K.some((a) => S[a]![b]! > 0)
        expect(dominatedByKernel).toBe(true)
      }

      // Internal stability across distinct SCCs: no kernel member outranks another outside its own SCC.
      for (const a of K) {
        for (const b of K) {
          if (a === b) continue
          const sameCycle = S[a]![b]! > 0 && S[b]![a]! > 0
          if (!sameCycle) {
            expect(S[a]![b]).toBe(0)
          }
        }
      }
    }
  })

  it('matches the wang-2008-galway-wastewater dataset in examples.ts', () => {
    const ex = getExample('wang-2008-galway-wastewater')!
    expect(ex).toBeDefined()
    expect(ex.referenceFor).toContain('electre-i')
    const p: Problem = {
      alternatives: ex.alternatives,
      criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
      matrix: ex.matrix,
    }
    const res = electreI.compute(p, ex.weights!, {})
    for (const pub of ex.published) {
      const vec = res.steps.find((s) => s.key === pub.label)!.vector!
      ;(pub.values as number[]).forEach((v, i) =>
        expect(Math.abs(vec[i]! - v)).toBeLessThanOrEqual(f.tolerance),
      )
    }
  })
})

describe('ELECTRE I — Soner & Önüt (2006) supplier selection (cost + benefit criteria)', () => {
  const f2 = fixture.sonerOnut2006
  const problem: Problem = {
    alternatives: f2.alternatives,
    criteria: f2.criteria.map((c) => ({ name: c.name, type: c.type as 'benefit' | 'cost' })),
    matrix: f2.matrix,
  }

  it('reproduces the concordance matrix and net concordance indices C_a', () => {
    const res = electreI.compute(problem, f2.weights, {})
    const C = res.steps.find((s) => s.key === 'electre-i.concordance')!.matrix!
    const netC = res.steps.find((s) => s.key === 'electre-i.netConcordance')!.vector!

    for (let a = 0; a < 5; a++) {
      for (let b = 0; b < 5; b++) {
        expect(C[a]![b]).toBeCloseTo(f2.concordanceMatrix[a]![b]!, 12)
      }
      expect(netC[a]).toBeCloseTo(f2.netConcordanceExact[a]!, 12)
      expect(Math.abs(netC[a]! - f2.netConcordancePublished[a]!)).toBeLessThanOrEqual(
        f2.publishedNetConcordanceTolerance + 1e-12,
      )
    }

    // Zero-sum property of net concordance and net discordance.
    const netD = res.steps.find((s) => s.key === 'electre-i.netDiscordance')!.vector!
    expect(Math.abs(netC.reduce((a, b) => a + b, 0))).toBeLessThan(1e-12)
    expect(Math.abs(netD.reduce((a, b) => a + b, 0))).toBeLessThan(1e-12)
  })
})

describe('ELECTRE I — graph kernel, edge cases & parameter validation', () => {
  it('condenses a pure 3-cycle into a single source SCC and returns all 3 vertices', () => {
    const cycle3 = [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ]
    expect(electreIKernel(cycle3)).toEqual([0, 1, 2])
  })

  it('computes the unique kernel {0, 2} on a 4-vertex directed path 0 -> 1 -> 2 -> 3', () => {
    const path4 = [
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
    ]
    expect(electreIKernel(path4)).toEqual([0, 2])
  })

  it('handles negative values, zeros, and constant columns without division by zero', () => {
    const p: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'cost' },
        { name: 'C3 (constant)', type: 'benefit' },
      ],
      matrix: [
        [-10, 0, 5],
        [0, -20, 5],
        [15, 10, 5],
      ],
    }
    for (const discordanceScale of ['global', 'range'] as const) {
      const res = electreI.compute(p, [0.4, 0.4, 0.2], { discordanceScale })
      expect(res.ranking).toHaveLength(3)
      expect(res.scores.every((v) => Number.isFinite(v))).toBe(true)
    }

    // All-constant matrix: every C_ab = 1, every D_ab = 0, all alternatives tie.
    const flat: Problem = {
      alternatives: ['A1', 'A2'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'cost' },
      ],
      matrix: [
        [7, 3],
        [7, 3],
      ],
    }
    const resFlat = electreI.compute(flat, [0.5, 0.5], {})
    expect(resFlat.scores).toEqual([0, 0])
    expect(resFlat.ranking).toEqual([1, 1])
  })

  it('emits near-constant-column and non-kernel-leader warnings when applicable', () => {
    const nearConst: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
      ],
      matrix: [
        [10, 1],
        [20, 1 + 1e-10],
        [30, 1],
      ],
    }
    const resNear = electreI.compute(nearConst, [0.5, 0.5], {})
    expect(resNear.warnings).toContainEqual({ code: 'electre-i.near-constant-column', col: 1 })

    // Non-kernel leader: A2 (index 1) has the highest net outranking score Φ,
    // but is outranked by A1 (index 0) and is therefore excluded from the kernel K = {0}.
    const nonKernelLeaderProb: Problem = {
      alternatives: ['A1', 'A2', 'A3', 'A4'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
        { name: 'C3', type: 'benefit' },
      ],
      matrix: [
        [100, 100, 0], // A1: beats A2 on C1, C2 (w=0.7) with small loss on C3 (30/100 = 0.3 <= dHat=0.35) -> S(A1, A2) = 1
        [90, 90, 30],  // A2: beats A3, A4 on all criteria -> highest net score, but outranked by A1 so kernel[1] = 0
        [0, 0, 20],
        [0, 0, 10],
      ],
    }
    const resLeader = electreI.compute(nonKernelLeaderProb, [0.35, 0.35, 0.3], { cHat: 0.7, dHat: 0.35 })
    const kernelVec = resLeader.steps.find((s) => s.key === 'electre-i.kernel')!.vector!
    expect(resLeader.ranking[1]).toBe(1)
    expect(kernelVec[1]).toBe(0)
    expect(resLeader.warnings).toContainEqual({ code: 'electre-i.non-kernel-leader', row: 1 })
  })

  it('rejects out-of-range cHat, dHat, or invalid discordanceScale', () => {
    const p: Problem = {
      alternatives: ['A1', 'A2'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
      ],
      matrix: [
        [1, 2],
        [2, 3],
      ],
    }
    expect(() => electreI.compute(p, [0.5, 0.5], { cHat: 0.4 })).toThrow(/cHat/)
    expect(() => electreI.compute(p, [0.5, 0.5], { cHat: 1.1 })).toThrow(/cHat/)
    expect(() => electreI.compute(p, [0.5, 0.5], { dHat: -0.1 })).toThrow(/dHat/)
    expect(() => electreI.compute(p, [0.5, 0.5], { dHat: 1.1 })).toThrow(/dHat/)
    expect(() => electreI.compute(p, [0.5, 0.5], { discordanceScale: 'invalid' as never })).toThrow(/discordanceScale/)
  })
})
