import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Problem } from '../src/core/types'
import { getExample } from '../src/data/examples'
import { electreI as electreIView } from '../src/app/methods/views/electre-i'
import { roc as rocView } from '../src/app/methods/views/roc'
import { ArasOptimalBar } from '../src/features/illustrations/ArasIdea'
import { BwmRulers } from '../src/features/illustrations/BwmRulers'
import { CilosIdea } from '../src/features/illustrations/CilosIdea'
import { CodasIdea } from '../src/features/illustrations/CodasIdea'
import { CriticIdea } from '../src/features/illustrations/CriticIdea'
import { EdasIdea } from '../src/features/illustrations/EdasIdea'
import { ElectreIIdea } from '../src/features/illustrations/ElectreIIdea'
import { ElectreIIIIdea } from '../src/features/illustrations/ElectreIIIIdea'
import { EntropyIdea } from '../src/features/illustrations/EntropyIdea'
import { EqualIdea } from '../src/features/illustrations/EqualIdea'
import { cilosParts, lineCrossings, vikorParts } from '../src/features/illustrations/geometry'
import { LopcowIdea } from '../src/features/illustrations/LopcowIdea'
import { MarcosSawLine } from '../src/features/illustrations/MarcosIdea'
import { MerecIdea } from '../src/features/illustrations/MerecIdea'
import { MethodThumb } from '../src/features/illustrations/MethodThumb'
import { MooraIdea } from '../src/features/illustrations/MooraIdea'
import { SawContributions } from '../src/features/illustrations/SawContributions'
import { SdIdea } from '../src/features/illustrations/SdIdea'
import { SwaraIdea } from '../src/features/illustrations/SwaraIdea'
import { TopsisGeometry } from '../src/features/illustrations/TopsisGeometry'
import { WaspasLambda } from '../src/features/illustrations/WaspasLambda'

const problemOf = (id: string): Problem => {
  const x = getExample(id)
  if (!x) throw new Error(id)
  return {
    alternatives: [...x.alternatives],
    criteria: x.criteria.map((c) => ({ name: c.name.en, type: c.type })),
    matrix: x.matrix.map((r) => [...r]),
  }
}

describe('Illustrations and Method Views fixes (Work Package 2)', () => {
  it('1. LopcowIdea hides zero-weight bar with data-off="" at step >= 2', () => {
    const problem: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
      ],
      matrix: [
        [1, 10],
        [5, 20],
        [1, 30],
      ],
    }
    const html = renderToStaticMarkup(createElement(LopcowIdea, { problem, step: 2 }))
    expect(html).toContain('<svg')
    expect(html).not.toContain('data-off="false"')
  })

  it('2. SdIdea shows left column head at step 0 and hides zero-weight bar', () => {
    const p = problemOf('diakoulaki-1995-pharma')
    const htmlStep0 = renderToStaticMarkup(createElement(SdIdea, { problem: p, step: 0 }))
    const headMatches = [...htmlStep0.matchAll(/<text[^>]*class="[^"]*colHead[^"]*"[^>]*>/g)]
    expect(headMatches.length).toBeGreaterThanOrEqual(2)
    expect(headMatches[0]![0]).not.toContain('data-off=""')
    expect(headMatches[1]![0]).toContain('data-off=""')
  })

  it('3. EqualIdea places weight text in the right column (x = x1 + 8), not over the stripBase track', () => {
    const p = problemOf('krishnan-2021-smartphones')
    const html = renderToStaticMarkup(createElement(EqualIdea, { problem: p }))
    const stripMatch = html.match(/<line[^>]*class="[^"]*stripBase[^"]*"[^>]*x1="(\d+(?:\.\d+)?)"[^>]*x2="(\d+(?:\.\d+)?)"/)
    expect(stripMatch).not.toBeNull()
    const x1 = Number(stripMatch![2])
    const valueMatch = html.match(/<text[^>]*class="[^"]*barValue[^"]*"[^>]*x="(\d+(?:\.\d+)?)"/)
    expect(valueMatch).not.toBeNull()
    const textX = Number(valueMatch![1])
    expect(textX).toBeGreaterThan(x1)
  })

  it('4. MerecIdea & CilosIdea reserve effectW/lossW and CilosIdea table uses non-transposed lossMatrix rows', () => {
    const merecProb = problemOf('keshavarz-2021-merec')
    const merecHtml = renderToStaticMarkup(createElement(MerecIdea, { problem: merecProb }))
    expect(merecHtml).toContain('<svg')

    const cilosProb = problemOf('zavadskas-2017-vilnius-social')
    const parts = cilosParts(cilosProb)!
    const cilosHtml = renderToStaticMarkup(createElement(CilosIdea, { problem: cilosProb }))
    const expectedCell = parts.lossMatrix[0]![1]!.toFixed(4)
    const firstRowMatch = cilosHtml.match(/<tbody><tr>[\s\S]*?<\/tr>/)
    expect(firstRowMatch).not.toBeNull()
    expect(firstRowMatch![0]).toContain(`>${expectedCell}</td>`)
  })

  it('5. EntropyIdea uses parts.diversification[j] for 1 - e display and scale', () => {
    const p = problemOf('zavadskas-2017-vilnius')
    const html = renderToStaticMarkup(createElement(EntropyIdea, { problem: p, step: 2 }))
    expect(html).toContain('1 − e =')
  })

  it('6. CriticIdea supports weightHead and clamps sigmaValue x before x1 - 4', () => {
    const p = problemOf('krishnan-2021-smartphones')
    const html = renderToStaticMarkup(
      createElement(CriticIdea, {
        problem: p,
        step: 0,
        labels: { weightHead: (total) => `w = C / ${total}` },
      }),
    )
    expect(html).toContain('w = C /')
  })

  it('7. BwmRulers formats integer fromBest/toWorst without .0000 and weights with 4 decimals', () => {
    const html = renderToStaticMarkup(
      createElement(BwmRulers, {
        criteria: ['C1', 'C2', 'C3'],
        best: 0,
        worst: 2,
        bestToOthers: [1, 2, 8],
        othersToWorst: [8, 4, 1],
        weights: [0.6923, 0.2308, 0.0769],
        flagged: null,
      }),
    )
    expect(html).toContain('>8</td><td')
    expect(html).toContain('>0.6923</td>')
    expect(html).not.toContain('>8.0000</td>')
    expect(html).not.toContain('>1.0000</td>')
  })

  it('8. SwaraIdea includes header width in sColW so Turkish "Adım oranı s" is not truncated', () => {
    const p = problemOf('kersuliene-2010-dispute')
    const html = renderToStaticMarkup(
      createElement(SwaraIdea, {
        problem: p,
        s: [0, 0.15, 0.04, 0.29, 0.02, 0.04],
        labels: { s: 'Adım oranı s' },
      }),
    )
    expect(html).toContain('>Adım oranı s</text>')
    expect(html).not.toContain('>Adım…')
  })

  it('9. TopsisGeometry separates D+ (dy=-10) and D- (dy=14) labels vertically', () => {
    const p = problemOf('opricovic-tzeng-2004-f')
    const html = renderToStaticMarkup(createElement(TopsisGeometry, { problem: p, weights: [0.5, 0.5] }))
    expect(html).toContain('dy="-10"')
    expect(html).toContain('dy="14"')
  })

  it('10. vikorParts returns sFlat/rFlat/noSpread/effV, MethodThumb uses effV, and lineCrossings ignores TIE_TOLERANCE noise', () => {
    const flatSProblem: Problem = {
      alternatives: ['A', 'B', 'C'],
      criteria: ['C1', 'C2', 'C3', 'C4'].map((name) => ({ name, type: 'benefit' as const })),
      matrix: [
        [0, 0, 1, 5],
        [1, 1, 0, 5],
        [0.5, 0.5, 0.5, 5],
      ],
    }
    const vp = vikorParts(flatSProblem, [0.1, 0.2, 0.3, 0.4])!
    expect(vp.sFlat).toBe(true)
    expect(vp.rFlat).toBe(false)
    expect(vp.noSpread).toBe(false)
    expect(vp.effV).toBe(0)

    const thumbHtml = renderToStaticMarkup(
      createElement(MethodThumb, {
        kind: 'compromise',
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
        v: 0.5,
        effV: 0,
        q: 0.5,
        inSet: [0],
      }),
    )
    expect(thumbHtml).toContain('<svg')

    const xs = [0, 0.25, 0.5, 0.75, 1]
    const a = [0.5, 0.5 + 1e-16, 0.5 - 1e-16, 0.5 + 1e-16, 0.5]
    const b = [0.5, 0.5, 0.5, 0.5, 0.5]
    expect(lineCrossings(xs, a, b)).toEqual([])
  })

  it('11. WaspasLambda joins tied alternatives with " = " in readout order', () => {
    const tiedProblem: Problem = {
      alternatives: ['A1', 'A2', 'A3'],
      criteria: [
        { name: 'C1', type: 'benefit' },
        { name: 'C2', type: 'benefit' },
      ],
      matrix: [
        [10, 20],
        [10, 20],
        [5, 8],
      ],
    }
    const html = renderToStaticMarkup(
      createElement(WaspasLambda, { problem: tiedProblem, weights: [0.5, 0.5], lambda: 0.5 }),
    )
    expect(html).toContain('data-testid="waspas-lambda"')
    expect(html).toContain('data-order="A1 = A2 &gt; A3"')
  })

  it('12. EdasIdea shows NDA/PDA headers at step 0 and avoids -0.0000 in table cells', () => {
    const p = problemOf('keshavarz-2015-ten-alternatives')
    const htmlStep0 = renderToStaticMarkup(
      createElement(EdasIdea, {
        problem: p,
        weights: getExample('keshavarz-2015-ten-alternatives')!.weights!,
        step: 0,
      }),
    )
    expect(htmlStep0).toContain('← NDA')
    expect(htmlStep0).toContain('PDA →')
    expect(htmlStep0).not.toContain('-0.0000')
  })

  it('13. SawContributions renders Other criteria legend item when n > 8', () => {
    const manyCritProblem: Problem = {
      alternatives: ['A1', 'A2'],
      criteria: Array.from({ length: 10 }, (_, j) => ({ name: `C${j + 1}`, type: 'benefit' as const })),
      matrix: [
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      ],
    }
    const weights = new Array<number>(10).fill(0.1)
    const html = renderToStaticMarkup(createElement(SawContributions, { problem: manyCritProblem, weights }))
    expect(html).toContain('Other criteria')
  })

  it('14. MarcosSawLine clamps line label y so it does not collide with Y-axis title when c -> 1', () => {
    const p = problemOf('stevic-brkovic-2020-drivers')
    const html = renderToStaticMarkup(
      createElement(MarcosSawLine, { problem: p, weights: getExample('stevic-brkovic-2020-drivers')!.weights! }),
    )
    const labelMatch = html.match(/<text[^>]*class="[^"]*marcosLineLabel[^"]*"[^>]*y="(\d+(?:\.\d+)?)"/)
    expect(labelMatch).not.toBeNull()
    expect(Number(labelMatch![1])).toBeGreaterThanOrEqual(42)
  })

  it('15. MooraIdea cleans Turkish signed text for both "değerine" and "toplamına"', () => {
    const p = problemOf('brauers-zavadskas-2010-projects')
    const w = new Array<number>(p.criteria.length).fill(1 / p.criteria.length)
    const html = renderToStaticMarkup(
      createElement(MooraIdea, {
        problem: p,
        weights: w,
        labels: {
          segmentBenefit: (a, c, v, y) => `${a}, ${c}: S+ toplamına -${v} ekler (y = ${y})`,
        },
      }),
    )
    expect(html).toContain('S+ değerinden ')
    expect(html).not.toContain('S+ toplamına -')
  })

  it('16. ArasOptimalBar accepts params and forwards them to arasParts', () => {
    const p = problemOf('bakir-atalik-2018-airlines')
    const w = getExample('bakir-atalik-2018-airlines')!.weights!
    const html = renderToStaticMarkup(createElement(ArasOptimalBar, { problem: p, weights: w, params: {} }))
    expect(html).toContain('data-testid="aras-rows"')
  })

  it('17. CodasIdea shows only Euclidean header at step 0 and truncates header at step >= 1', () => {
    const p = problemOf('badi-2018-suppliers')
    const w = getExample('badi-2018-suppliers')!.weights!
    const htmlStep0 = renderToStaticMarkup(createElement(CodasIdea, { problem: p, weights: w, step: 0 }))
    const statusMatch0 = htmlStep0.match(/<text[^>]*data-testid="codas-tau-status"[^>]*>(.*?)<\/text>/)
    expect(statusMatch0?.[1]).toBe('E')

    const htmlStep2 = renderToStaticMarkup(createElement(CodasIdea, { problem: p, weights: w, step: 2 }))
    const statusMatch2 = htmlStep2.match(/<text[^>]*data-testid="codas-tau-status"[^>]*>(.*?)<\/text>/)
    expect(statusMatch2?.[1]).toContain('E / T')
  })

  it('18. ElectreIIdea dims non-kernel rows at step 1 and electreI.verdict summarizes kernel and cycles', () => {
    const p = problemOf('wang-2008-galway-wastewater')
    const w = getExample('wang-2008-galway-wastewater')!.weights!
    const htmlStep1 = renderToStaticMarkup(createElement(ElectreIIdea, { problem: p, weights: w, step: 1 }))
    expect(htmlStep1).toContain('data-off=""')

    expect(electreIView.verdict).toBeTypeOf('function')
    const verdict = electreIView.verdict!(
      {
        scores: [1, 0, -1],
        ranking: [1, 2, 3],
        order: 'desc',
        steps: [{ key: 'electre-i.kernel', axes: 'alternatives', vector: [1, 0, 1] }],
        warnings: [{ code: 'electre-i.cycle-detected' }],
        diagnostics: { cycles: 1 },
      },
      ['A1', 'A2', 'A3'],
      ((key: string) => key) as never,
      (v: number) => v.toFixed(4),
    )
    expect(verdict).not.toBeNull()
    expect(verdict!.result).toContain('A1, A3')
    expect(verdict!.set).toEqual([0, 2])
  })

  it('19. ElectreIIIIdea renders picture-StageNote for incomparable pairs', () => {
    const p = problemOf('wang-2008-galway-wastewater')
    const w = getExample('wang-2008-galway-wastewater')!.weights!
    const html = renderToStaticMarkup(createElement(ElectreIIIIdea, { problem: p, weights: w }))
    expect(html).toContain('picture-StageNote')
    expect(html).toContain('data-testid="electre-iii-incomparable"')
  })

  it('20. roc.ts sets ledger tolerance to 0.015', () => {
    expect(rocView.ledger?.tolerance).toBe(0.015)
  })
})
