import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  catColorVar,
  CriterionProfileChart,
  HeadToHeadDeltaChart,
  MiniScoreBar,
  StabilityBandSparkbar,
} from '../src/app/workbench/report/ReportCharts'
import type {
  CriterionDeltaItem,
  CriterionProfileLegendItem,
  CriterionProfileRow,
} from '../src/app/workbench/report/types'

describe('ReportCharts (Executive Report SVG micro-charts)', () => {
  it('catColorVar maps 1..8 to --data-cat-1..8 and other to --data-context', () => {
    expect(catColorVar(1)).toBe('var(--data-cat-1)')
    expect(catColorVar(8)).toBe('var(--data-cat-8)')
    expect(catColorVar('other')).toBe('var(--data-context)')
  })

  it('CriterionProfileChart renders deterministic viewBox SVG, stacked categorical segments, and legend swatches', () => {
    const rows: CriterionProfileRow[] = [
      {
        altIndex: 0,
        rank: 1,
        totalProfile: 0.75,
        segments: [
          { key: 'c0', col: 0, catSlot: 1, value: 0.45 },
          { key: 'c1', col: 1, catSlot: 2, value: 0.2 },
          { key: 'others', col: 'others', catSlot: 'other', value: 0.1 },
        ],
      },
      {
        altIndex: 1,
        rank: 2,
        totalProfile: 0.5,
        segments: [
          { key: 'c0', col: 0, catSlot: 1, value: 0.25 },
          { key: 'c1', col: 1, catSlot: 2, value: 0.15 },
          { key: 'others', col: 'others', catSlot: 'other', value: 0.1 },
        ],
      },
    ]
    const legend: CriterionProfileLegendItem[] = [
      { key: 'c0', col: 0, catSlot: 1, weight: 0.5 },
      { key: 'c1', col: 1, catSlot: 2, weight: 0.3 },
      { key: 'others', col: 'others', catSlot: 'other', weight: 0.2, restCount: 3 },
    ]

    const html = renderToStaticMarkup(
      <CriterionProfileChart
        rows={rows}
        legend={legend}
        altNames={['Alpha', 'Beta']}
        criterionLabel={(col, restCount) => (col === 'others' ? `Others (${restCount})` : `Crit ${col + 1}`)}
        formatValue={(v) => v.toFixed(3)}
        ariaLabel="Weighted criterion profile"
      />,
    )

    expect(html).toContain('<svg')
    expect(html).toContain('viewBox="')
    expect(html).toContain('aria-label="Weighted criterion profile"')
    expect(html).toContain('var(--data-cat-1)')
    expect(html).toContain('var(--data-cat-2)')
    expect(html).toContain('var(--data-context)')
    expect(html).toContain('Alpha')
    expect(html).toContain('Beta')
    expect(html).toContain('0.750')
    expect(html).toContain('0.500')
    expect(html).toContain('Crit 1')
    expect(html).toContain('Crit 2')
    expect(html).toContain('Others (3)')
  })

  it('HeadToHeadDeltaChart renders diverging bars around zero axis and handles empty/zero state', () => {
    const items: CriterionDeltaItem[] = [
      { col: 0, type: 'benefit', weight: 0.4, aShare: 0.35, bShare: 0.15, delta: 0.2 },
      { col: 1, type: 'cost', weight: 0.35, aShare: 0.1, bShare: 0.22, delta: -0.12 },
    ]

    const html = renderToStaticMarkup(
      <HeadToHeadDeltaChart
        items={items}
        pairNames={['Alpha', 'Beta']}
        critNames={['Cost efficiency', 'Latency']}
        formatDelta={(v) => (v > 0 ? `+${v.toFixed(3)}` : v.toFixed(3))}
        emptyText="Identical weighted contributions."
        ariaLabel="Head to head delta chart"
      />,
    )

    expect(html).toContain('<svg')
    expect(html).toContain('viewBox="')
    expect(html).toContain('var(--data-accent)')
    expect(html).toContain('var(--data-negative)')
    expect(html).toContain('+0.200')
    expect(html).toContain('-0.120')
    expect(html).toContain('Cost efficiency')
    expect(html).toContain('Latency')

    const emptyHtml = renderToStaticMarkup(
      <HeadToHeadDeltaChart
        items={[{ col: 0, type: 'benefit', weight: 0.5, aShare: 0.2, bShare: 0.2, delta: 0 }]}
        pairNames={['Alpha', 'Beta']}
        critNames={['Cost efficiency']}
        formatDelta={(v) => v.toFixed(3)}
        emptyText="Identical weighted contributions."
        ariaLabel="Head to head delta chart"
      />,
    )

    expect(emptyHtml).toContain('Identical weighted contributions.')
  })

  it('StabilityBandSparkbar renders viewBox="0 0 88 14" with safe band and weight tick, plus neutral fallback when interval is null', () => {
    const html = renderToStaticMarkup(
      <StabilityBandSparkbar
        weight={0.35}
        interval={{ from: 0.15, to: 0.75 }}
        ariaLabel="Safe band [0.15, 0.75]"
      />,
    )

    expect(html).toContain('viewBox="0 0 88 14"')
    expect(html).toContain('aria-label="Safe band [0.15, 0.75]"')
    expect(html).toContain('var(--data-accent)')

    const nullHtml = renderToStaticMarkup(
      <StabilityBandSparkbar weight={0.35} interval={null} ariaLabel="No sweep interval" />,
    )
    expect(nullHtml).toContain('viewBox="0 0 88 14"')
    expect(nullHtml).not.toContain('data-testid="sparkbar-band"')
  })

  it('MiniScoreBar handles desc positive, asc lower-is-better (VIKOR Q=0 gets full bar), and desc signed/diverging (MABAC) scores', () => {
    // 1. desc positive scores: [0.8, 0.4] -> leader 100%, second 50%
    const descLeader = renderToStaticMarkup(
      <MiniScoreBar value={0.8} scores={[0.8, 0.4]} order="desc" isLeader={true} />,
    )
    const descSecond = renderToStaticMarkup(
      <MiniScoreBar value={0.4} scores={[0.8, 0.4]} order="desc" isLeader={false} />,
    )
    expect(descLeader).toContain('width:100%')
    expect(descLeader).toContain('var(--data-accent)')
    expect(descSecond).toContain('width:50%')
    expect(descSecond).toContain('var(--data-context)')

    // 2. asc lower-is-better (VIKOR): [0, 0.5, 1.0] -> Q=0 gets 100% bar, Q=1.0 gets 8% stub
    const ascBest = renderToStaticMarkup(
      <MiniScoreBar value={0} scores={[0, 0.5, 1.0]} order="asc" isLeader={true} />,
    )
    const ascWorst = renderToStaticMarkup(
      <MiniScoreBar value={1.0} scores={[0, 0.5, 1.0]} order="asc" isLeader={false} />,
    )
    expect(ascBest).toContain('width:100%')
    expect(ascBest).toContain('var(--data-accent)')
    expect(ascWorst).toContain('width:8%')
    expect(ascWorst).toContain('var(--data-context)')

    // 3. desc signed/diverging (MABAC): [-0.2, 0.4] -> zero axis at 33.33%
    const signedPos = renderToStaticMarkup(
      <MiniScoreBar value={0.4} scores={[-0.2, 0.4]} order="desc" isLeader={true} />,
    )
    const signedNeg = renderToStaticMarkup(
      <MiniScoreBar value={-0.2} scores={[-0.2, 0.4]} order="desc" isLeader={false} />,
    )
    expect(signedPos).toContain('left:33.33%')
    expect(signedPos).toContain('width:66.67%')
    expect(signedPos).toContain('var(--data-accent)')
    expect(signedNeg).toContain('var(--data-negative)')
    expect(signedNeg).toContain('width:33.33%')
  })
})
