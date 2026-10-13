import { expect, test, type Page } from '@playwright/test'
import { critic, topsis } from '../../src/core'
import { monteCarlo, perturbWeights, removeCriteria, reweight, sweepWeight } from '../../src/core/robustness'
import { rankOrder, stepWeight } from '../../src/app/ranking/order'
import { largestWeight } from '../../src/app/workbench/robustness/helpers'
import { getExample } from '../../src/data/examples'

const ex = getExample('krishnan-2021-smartphones')!
const problem = {
  alternatives: ex.alternatives,
  criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
  matrix: ex.matrix,
}
const weights = critic.compute(problem, {}).weights
const names = ex.alternatives
const criteria = problem.criteria.map((c) => c.name)
/** Locale rounding (half away from zero on the decimal value), as the page prints; toFixed rounds the binary value. */
const fixed = (x: number, d: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(x)
const f4 = (x: number) => fixed(x, 4)
const percent1 = (p: number) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(p)
const URL = '/app?example=krishnan-2021-smartphones&stage=robustness'

/** Alternative names in the live table's DOM order. */
const liveOrder = (page: Page) => page.getByTestId('live-row').locator('th').allInnerTexts()
/** The core's order (names) with criterion k's weight at wk. */
const coreOrder = (k: number, wk: number) => rankOrder(topsis.compute(problem, reweight(weights, k, wk), {}).ranking).map((i) => names[i]!)
const coreScores = (k: number, wk: number) => topsis.compute(problem, reweight(weights, k, wk), {}).scores

async function open(page: Page) {
  await page.goto(URL)
  await expect(page.getByRole('heading', { level: 1, name: 'Robustness' })).toBeVisible()
  await expect(page.getByTestId('live-row')).toHaveCount(names.length)
}

test('the slider and its keys re-rank the table exactly as the core does', async ({ page }) => {
  await open(page)
  const k = largestWeight(weights)
  const slider = page.getByRole('slider', { name: `Weight of ${criteria[k]}` })
  const readout = page.getByTestId('sweep-weight')
  await expect(readout).toHaveText(f4(weights[k]!))
  expect(await liveOrder(page)).toEqual(coreOrder(k, weights[k]!))

  await slider.focus()
  // End: all the weight on criterion k. The order changes (the sentence below says first place only holds up to b).
  await page.keyboard.press('End')
  await expect(readout).toHaveText('1.0000')
  expect(coreOrder(k, 1)).not.toEqual(coreOrder(k, weights[k]!))
  await expect.poll(() => liveOrder(page)).toEqual(coreOrder(k, 1))
  const closeness = await page.getByTestId('live-closeness').allInnerTexts()
  const scores = coreScores(k, 1)
  expect(closeness).toEqual(coreOrder(k, 1).map((n) => f4(scores[names.indexOf(n)]!)))

  await page.keyboard.press('Home')
  await expect(readout).toHaveText('0.0000')
  await expect.poll(() => liveOrder(page)).toEqual(coreOrder(k, 0))

  // Back to the user's weight, then one step: the next point of the 0.01 grid.
  await page.getByRole('button', { name: 'Back to your weight' }).click()
  await expect(readout).toHaveText(f4(weights[k]!))
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  const next = stepWeight(weights[k]!, 1)
  await expect(readout).toHaveText(f4(next))
  await page.keyboard.press('PageUp')
  await expect(readout).toHaveText(f4(stepWeight(next, 10)))
  await expect.poll(() => liveOrder(page)).toEqual(coreOrder(k, stepWeight(next, 10)))
})

test('another criterion: the sentence gives the core\'s stability interval, the chart marks its switches', async ({ page }) => {
  await open(page)
  for (const j of [0, largestWeight(weights)]) {
    await page.getByRole('radio', { name: criteria[j]! }).click()
    const sweep = sweepWeight(problem, weights, topsis, j)
    const top = sweep.baseTopInterval
    const leader = top.top.map((i) => names[i]).join(', ')
    const sentence = page.getByTestId('holds-sentence')
    if (top.from <= 1e-9 && top.to >= 1 - 1e-9) await expect(sentence).toHaveText(`${leader} stays first at every weight of ${criteria[j]}, from 0 to 1.`)
    else
      await expect(sentence).toHaveText(
        `${leader} stays first while the weight of ${criteria[j]} is between ${f4(top.from)} and ${f4(top.to)}; your weight is ${f4(weights[j]!)}.`,
      )
    await expect(page.locator('svg[data-sweep] [data-switch]')).toHaveCount(sweep.rankingIntervals.length - 1)
    await expect(page.getByTestId('sweep-weight')).toHaveText(f4(weights[j]!))
  }
  // Dragging on the chart picks a weight too (0.01 grid), the table follows.
  const area = page.locator('svg[data-sweep] rect[class*="pickArea"]')
  const box = (await area.boundingBox())!
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2)
  const wk = Number(await page.getByTestId('sweep-weight').innerText())
  expect(Math.abs(wk - 0.9)).toBeLessThan(0.011)
  await expect.poll(() => liveOrder(page)).toEqual(coreOrder(largestWeight(weights), wk))
})

test('a criterion with weight 0 is not perturbed: n/a, left out of the count, with a note', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=weights')
  await page.getByRole('radio', { name: 'Manual' }).click()
  const manual = [0, 0.25, 0.25, 0.25, 0.25]
  for (const [j, v] of manual.entries()) {
    await page.locator(`#wb-weight-${j}`).fill(String(v))
    await page.locator(`#wb-weight-${j}`).blur()
  }
  await expect(page.getByText('Weights sum to 1.')).toBeVisible()
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Robustness' }).click()
  const rows = perturbWeights(problem, manual, topsis).filter((r) => r.k !== 0)
  await expect(page.getByTestId('perturb-summary')).toHaveText(
    `First place holds in ${rows.filter((r) => r.sameTop).length} of ${rows.length} changes.`,
  )
  await expect(page.locator('[data-testid="perturb-cell"][data-na]')).toHaveCount(6)
  await expect(page.getByText('Criteria with weight 0 are left out: a percentage of 0 is still 0.')).toBeVisible()
})

test('all the weight on one criterion: the small changes say there is nothing to nudge and draw no empty grid', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=weights')
  await page.getByRole('radio', { name: 'Manual' }).click()
  for (const [j, v] of [1, 0, 0, 0, 0].entries()) {
    await page.locator(`#wb-weight-${j}`).fill(String(v))
    await page.locator(`#wb-weight-${j}`).blur()
  }
  await expect(page.getByText('Weights sum to 1.')).toBeVisible()
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Robustness' }).click()
  await expect(page.getByTestId('perturb-summary')).toHaveText(
    'All the weight is on one criterion: the others cannot be rescaled, so there is nothing to nudge.',
  )
  await expect(page.locator('[data-testid="perturb-cell"]')).toHaveCount(0)
  await expect(page.getByText('Criteria with weight 0 are left out: a percentage of 0 is still 0.')).toHaveCount(0)
})

test('small changes: the grid and the summary match perturbWeights', async ({ page }) => {
  await open(page)
  const rows = perturbWeights(problem, weights, topsis)
  const held = rows.filter((r) => r.sameTop).length
  await expect(page.getByTestId('perturb-summary')).toHaveText(`First place holds in ${held} of ${rows.length} changes.`)
  await expect(page.getByTestId('perturb-cell')).toHaveCount(rows.length)
  await expect(page.locator('[data-testid="perturb-cell"][data-changed]')).toHaveCount(rows.length - held)
})

test('random weights: the worker gives the core\'s numbers for the seed, and a new κ replaces them', async ({ page }) => {
  await open(page)
  await expect(page.getByTestId('mc-note')).toHaveText('N = 10,000 · seed 1')
  const result = page.getByTestId('mc-result')
  const check = async (concentration: 'uniform' | number) => {
    const mc = monteCarlo(problem, weights, topsis, { concentration, n: 10_000, seed: 1 })
    const base = topsis.compute(problem, weights, {}).ranking
    const first = names[base.indexOf(1)]
    await expect(result).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 })
    await expect(page.getByTestId('mc-same-top')).toHaveText(`${first} is first in ${percent1(mc.sameTop)} of the draws.`)
    // The heat map's table: rows in the base order, a share per rank.
    const table = page.locator('figure', { hasText: 'Share of draws by rank' }).locator('table')
    const order = rankOrder(base)
    const cells = await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent)))
    const pct = (p: number) => (p > 0 && p < 0.005 ? '<1%' : `${Math.round(p * 100)}%`)
    expect(cells).toEqual(order.map((i) => mc.acceptability[i]!.map(pct)))
    const means = page.locator('figure', { hasText: 'Mean rank and 95% interval' }).locator('table tbody tr td:first-of-type')
    const byMean = mc.meanRank.map((_, i) => i).sort((a, b) => mc.meanRank[a]! - mc.meanRank[b]! || a - b)
    await expect(means).toHaveText(byMean.map((i) => fixed(mc.meanRank[i]!, 2)))
  }
  await check(100)
  await page.getByRole('radio', { name: 'Uniform' }).click()
  await check('uniform')
  await page.getByRole('radio', { name: 'Tight, κ = 500' }).click()
  await check(500)
})

test('drop a criterion: one row each, first-place changes marked, CRITIC can be recomputed', async ({ page }) => {
  await open(page)
  for (const [label, mode] of [
    ['Rescale', 'renormalize'],
    ['Recompute CRITIC', 'recompute'],
  ] as const) {
    await page.getByRole('radio', { name: label }).click()
    const rows = removeCriteria(problem, weights, topsis, critic).filter((r) => r.mode === mode)
    const dom = page.getByTestId('removal-row')
    await expect(dom).toHaveCount(criteria.length)
    for (const [k, r] of rows.entries()) {
      const row = dom.nth(k)
      await expect(row.locator('th')).toHaveText(criteria[r.j]!)
      const leader = r.ranking.map((x, i) => (x === 1 ? names[i] : null)).filter(Boolean).join(', ')
      await expect(row.locator('td').first()).toHaveText(r.sameTop ? `Same (${leader})` : `${leader} first`)
      await expect(row.locator('td').nth(1)).toHaveText(fixed(r.spearman, 3))
      await expect(row.locator('td').nth(2)).toHaveText(fixed(r.ws, 3))
      if (r.sameTop) await expect(row).not.toHaveAttribute('data-changed')
      else await expect(row).toHaveAttribute('data-changed', 'true')
    }
  }
})

test('Results leads here by keyboard, and the rail says how often first place holds', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=results')
  const rows = perturbWeights(problem, weights, topsis)
  const rail = page.locator('nav[aria-label="Stages"]:visible')
  await expect(rail.getByRole('button', { name: /Robustness/ })).toContainText(
    `First place held: ${rows.filter((r) => r.sameTop).length}/${rows.length}`,
    { timeout: 15_000 },
  )
  const go = page.getByRole('button', { name: 'Check robustness' })
  await go.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Robustness' })).toBeVisible()
  await expect(page.locator('#main')).toBeFocused({ timeout: 10_000 })
  // The stage opens with its content (goTo waits for the chunk): no placeholder to tab past.
  await expect(page.getByRole('slider')).toBeVisible()
  await expect(page.getByRole('status', { name: 'Loading the robustness checks' })).toHaveCount(0)
  // Tab reaches the criterion choice, then the slider, which moves with the arrow keys.
  const k = largestWeight(weights)
  for (let n = 0; n < 30; n++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.type === 'range')) break
  }
  await expect(page.getByRole('slider')).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('sweep-weight')).toHaveText(f4(stepWeight(weights[k]!, -1)))
  // Past the slider: the formulas open from the keyboard, and their KaTeX loads.
  for (let n = 0; n < 30; n++) {
    await page.keyboard.press('Tab')
    if ((await page.evaluate(() => document.activeElement?.textContent)) === 'Formula and sources') break
  }
  await page.keyboard.press('Enter')
  await expect(page.locator('details[open] .katex').first()).toBeVisible()
  await expect(page.locator('details[open]').getByRole('link', { name: 'doi:10.1016/0377-2217(88)90254-8' })).toBeVisible()
})

test('Turkish: texts and numbers in Turkish', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kds.lang', 'tr'))
  await page.goto(URL)
  await expect(page.getByRole('heading', { level: 1, name: 'Sağlamlık' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Bir ağırlığı kaydırın' })).toBeVisible()
  await expect(page.getByTestId('mc-note')).toHaveText('N = 10.000 · tohum 1')
  await expect(page.getByTestId('mc-result')).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 })
  await expect(page.getByTestId('mc-same-top')).toContainText('%')
  await expect(page.getByTestId('sweep-weight')).toHaveText(f4(weights[largestWeight(weights)]!).replace('.', ','))
})

test('390 px: the change grid fits the screen and lists what changed under it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  const grid = page.locator('[role="img"][data-compact]')
  await expect(grid).toBeVisible()
  const fits = await grid.evaluate((el) => el.scrollWidth <= el.parentElement!.clientWidth)
  expect(fits).toBe(true)
  const changed = perturbWeights(problem, weights, topsis).filter((r) => !r.sameTop)
  await expect(page.getByTestId('perturb-changes').locator('li')).toHaveCount(changed.length)
})

for (const width of [390, 1440]) {
  test(`no sideways page scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await open(page)
    await expect(page.getByTestId('mc-result')).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
