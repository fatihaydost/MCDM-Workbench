import { describe, expect, it } from 'vitest'
import {
  emptyAlternativeJudgements,
  emptyJudgements,
  judgementsFromBwm,
  judgementsFromUpper,
  setAlternativePair,
  setAlternativeSource,
} from '../src/core'
import { buildShareUrl, decodeShareState, encodeShareState, type ShareState } from '../src/features/io'
import { computeRanking, computeWeights, useWorkbench } from '../src/state/workbench'

const baseState = (): ShareState => ({
  problem: {
    alternatives: ['İzmir', 'Eskişehir', 'Bursa'],
    criteria: [
      { name: 'Maliyet (₺)', type: 'cost' },
      { name: 'Kalite', type: 'benefit' },
      { name: 'Teslimat hızı', type: 'benefit' },
    ],
    matrix: [
      [120.5, 8.4, 90],
      [95.0, 7.2, 85],
      [110.25, 9.1, null],
    ],
  },
  weightMethod: 'manual',
  rankingMethod: 'vikor',
  manualWeights: [0.4, 0.35, 0.25],
  methodParams: {
    vikor: { v: 0.7 },
    entropy: { normalization: 'minmax' },
  },
  judgements: emptyJudgements(3),
  alternativeJudgements: emptyAlternativeJudgements(3),
  stage: 'results',
  exampleId: null,
})

describe('shareable link encode/decode', () => {
  it('round-trips a custom problem with UTF-8 names, null cells, manual weights, methodParams, and stage', () => {
    const original = baseState()
    const token = encodeShareState(original)
    expect(token).toMatch(/^[A-Za-z0-9\-_]+$/)

    const decoded = decodeShareState(token)
    expect(decoded).not.toBeNull()
    expect(decoded).toEqual(original)

    const url = buildShareUrl(original, 'https://example.com', '/MCDM-Workbench/')
    expect(url).toBe(`https://example.com/MCDM-Workbench/app?s=${token}`)
  })

  it('round-trips BWM and AHP criteria judgements as well as ahp-ranking alternativeJudgements', () => {
    const bwmJ = judgementsFromBwm(3, 0, 2, [1, 3, 7], [7, 4, 1])
    let altJ = setAlternativeSource(emptyAlternativeJudgements(3), 3, 3, 1, 'pairwise')
    altJ = setAlternativePair(altJ, 3, 3, 1, 0, 1, 5)
    altJ = setAlternativePair(altJ, 3, 3, 1, 0, 2, 1 / 3)
    altJ = setAlternativePair(altJ, 3, 3, 1, 1, 2, 1 / 7)

    const stateWithBwm: ShareState = {
      ...baseState(),
      problem: {
        ...baseState().problem,
        matrix: [
          [120.5, 8.4, 90],
          [95.0, 7.2, 85],
          [110.25, 9.1, 88],
        ],
      },
      weightMethod: 'bwm',
      rankingMethod: 'ahp-ranking',
      methodParams: { 'ahp-ranking': { aggregation: 'geometric' } },
      judgements: bwmJ,
      alternativeJudgements: altJ,
      stage: 'ranking',
      exampleId: 'krishnan-2021-smartphones',
    }

    const decodedBwm = decodeShareState(encodeShareState(stateWithBwm))
    expect(decodedBwm).toEqual(stateWithBwm)

    const ahpJ = judgementsFromUpper(3, [3, 5, 1 / 2])
    const stateWithAhp: ShareState = {
      ...stateWithBwm,
      weightMethod: 'ahp',
      methodParams: { ahp: { aggregation: 'geometric' } },
      judgements: ahpJ,
    }
    const decodedAhp = decodeShareState(encodeShareState(stateWithAhp))
    expect(decodedAhp).toEqual(stateWithAhp)

    // Verify loadSharedState restores into the workbench store and computes identically
    useWorkbench.getState().reset()
    useWorkbench.getState().loadSharedState(decodedAhp!)
    const s = useWorkbench.getState()
    expect(s.weightMethod).toBe('ahp')
    expect(s.rankingMethod).toBe('ahp-ranking')
    expect(s.stage).toBe('ranking')
    expect(computeWeights(s).value).not.toBeNull()
    expect(computeRanking(s).value).not.toBeNull()
  })

  it('returns null on corrupted, malformed, or out-of-bounds payloads without throwing', () => {
    expect(decodeShareState('')).toBeNull()
    expect(decodeShareState(null)).toBeNull()
    expect(decodeShareState(undefined)).toBeNull()
    expect(decodeShareState('not-valid-base64url!!!')).toBeNull()
    expect(decodeShareState('eyJ2IjoxfQ')).toBeNull() // {"v":1} missing problem

    const encodeRaw = (obj: unknown) =>
      Buffer.from(JSON.stringify(obj), 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

    // Wrong version
    expect(decodeShareState(encodeRaw({ v: 2, p: { a: ['A', 'B'], c: [['C1', 1], ['C2', 0]], m: [[1, 2], [3, 4]] }, wm: 'critic', rm: 'topsis', st: 'data' }))).toBeNull()
    // Matrix row count mismatch
    expect(decodeShareState(encodeRaw({ v: 1, p: { a: ['A', 'B'], c: [['C1', 1], ['C2', 0]], m: [[1, 2]] }, wm: 'critic', rm: 'topsis', st: 'data' }))).toBeNull()
    // Matrix column count mismatch
    expect(decodeShareState(encodeRaw({ v: 1, p: { a: ['A', 'B'], c: [['C1', 1], ['C2', 0]], m: [[1], [3, 4]] }, wm: 'critic', rm: 'topsis', st: 'data' }))).toBeNull()
    // Out-of-range cell magnitude
    expect(decodeShareState(encodeRaw({ v: 1, p: { a: ['A', 'B'], c: [['C1', 1], ['C2', 0]], m: [[1e150, 2], [3, 4]] }, wm: 'critic', rm: 'topsis', st: 'data' }))).toBeNull()
    // Unknown weightMethod
    expect(decodeShareState(encodeRaw({ v: 1, p: { a: ['A', 'B'], c: [['C1', 1], ['C2', 0]], m: [[1, 2], [3, 4]] }, wm: 'unknown-wm', rm: 'topsis', st: 'data' }))).toBeNull()
    // Unknown rankingMethod
    expect(decodeShareState(encodeRaw({ v: 1, p: { a: ['A', 'B'], c: [['C1', 1], ['C2', 0]], m: [[1, 2], [3, 4]] }, wm: 'critic', rm: 'unknown-rm', st: 'data' }))).toBeNull()
    // Unknown stage
    expect(decodeShareState(encodeRaw({ v: 1, p: { a: ['A', 'B'], c: [['C1', 1], ['C2', 0]], m: [[1, 2], [3, 4]] }, wm: 'critic', rm: 'topsis', st: 'invalid-stage' }))).toBeNull()
    // Negative manual weight
    expect(decodeShareState(encodeRaw({ v: 1, p: { a: ['A', 'B'], c: [['C1', 1], ['C2', 0]], m: [[1, 2], [3, 4]] }, wm: 'manual', rm: 'topsis', mw: [-0.5, 1.5], st: 'data' }))).toBeNull()
  })
})
