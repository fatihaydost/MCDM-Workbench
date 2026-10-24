import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import * as XLSX from 'xlsx'
import { cocoso, copras, critic, edas, entropy, mabac, marcos, merec, saw, sd, topsis, vikor, vikorCompromise, waspas, type CriterionType } from '../../src/core'
import { getExample } from '../../src/data/examples'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'))
const krishnan = fixture('critic-krishnan2021') as { expected: { weights: number[] } }
const legacy = fixture('legacy-python-critic-topsis') as { matrix: number[][]; types: string[]; expected: { closeness: number[] } }

const f4 = (x: number) => x.toFixed(4)

/** Closeness per alternative name, read from the ranking table (rows are in rank order). */
async function closenessByName(page: Page): Promise<Record<string, string>> {
  const rows = page.getByTestId('ranking-row')
  await expect(rows.first()).toBeVisible()
  const out: Record<string, string> = {}
  for (const row of await rows.all()) {
    const name = (await row.locator('th').innerText()).trim()
    out[name] = (await row.getByTestId('closeness').innerText()).trim()
  }
  return out
}

/** The focused element's label and text. */
const focusedLabel = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return el ? `${el.getAttribute('aria-label') ?? ''} ${el.innerText ?? ''}`.trim() : ''
  })

/** Presses Tab until the focused element's text or label matches, like a keyboard user would. */
async function tabTo(page: Page, name: string | RegExp, max = 120, key = 'Tab'): Promise<void> {
  for (let k = 0; k < max; k++) {
    await page.keyboard.press(key)
    const label = await focusedLabel(page)
    if (typeof name === 'string' ? label.includes(name) : name.test(label)) return
  }
  throw new Error(`Tab never reached ${String(name)}`)
}

const stageHeading = (page: Page, name: string): Locator => page.getByRole('heading', { level: 1, name })

test('example -> CRITIC -> TOPSIS: weights match Krishnan et al. (2021), closeness matches the core', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('button', { name: 'Load example', exact: true }).first().click()
  await expect(page.getByRole('grid', { name: 'Decision matrix' })).toBeVisible()
  await expect(page.getByText('Example data: Krishnan et al. (2021)')).toBeVisible()

  await page.getByRole('button', { name: 'Continue to weights' }).click()
  await expect(stageHeading(page, 'Weights')).toBeVisible()
  const weightCells = page.locator('table').first().locator('tbody tr td:last-child')
  await expect(weightCells).toHaveText(krishnan.expected.weights.map(f4))

  await page.getByRole('button', { name: 'Continue to ranking' }).click()
  await expect(stageHeading(page, 'Ranking')).toBeVisible()

  const ex = getExample('krishnan-2021-smartphones')!
  const problem = {
    alternatives: ex.alternatives,
    criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })),
    matrix: ex.matrix,
  }
  const w = critic.compute(problem, {}).weights
  const r = topsis.compute(problem, w, {})
  const expected = Object.fromEntries(ex.alternatives.map((a, i) => [a, f4(r.scores[i]!)]))
  expect(await closenessByName(page)).toEqual(expected)

  await page.getByRole('button', { name: 'Continue to results' }).click()
  await expect(stageHeading(page, 'Results')).toBeVisible()
  expect(await closenessByName(page)).toEqual(expected)
  // The worked calculation, collapsed until asked for: 7 CRITIC steps + 7 TOPSIS steps, with formulas.
  await expect(page.locator('section[data-step]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show the calculation' }).click()
  await expect(page.locator('section[data-step]')).toHaveCount(14)
  await expect(page.locator('section[data-step] .katex').first()).toBeVisible()
})

test('import a CSV -> CRITIC -> TOPSIS: closeness matches the legacy Python fixture', async ({ page }) => {
  const names = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']
  const alts = legacy.matrix.map((_, i) => `A${i + 1}`)
  const csv = [
    ['Alternative', ...names].join(';'),
    ['Type', ...legacy.types].join(';'),
    ...legacy.matrix.map((row, i) => [alts[i], ...row].join(';')),
  ].join('\n')

  await page.goto('/app')
  await page.locator('input[type="file"]').setInputFiles({ name: 'legacy.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await expect(page.getByText('Imported legacy.csv (alternatives: 7, criteria: 6)')).toBeVisible()

  await page.getByRole('button', { name: 'Continue to weights' }).click()
  await page.getByRole('button', { name: 'Continue to ranking' }).click()
  const expected = Object.fromEntries(alts.map((a, i) => [a, f4(legacy.expected.closeness[i]!)]))
  expect(await closenessByName(page)).toEqual(expected)
  // Same numbers as the core on the same input.
  const p = { alternatives: alts, criteria: names.map((name, j) => ({ name, type: legacy.types[j] as CriterionType })), matrix: legacy.matrix }
  const core = topsis.compute(p, critic.compute(p, {}).weights, {})
  expect(Object.values(expected)).toEqual(core.scores.map(f4))
})

test('an empty cell blocks Continue with a GOV.UK summary whose link focuses the cell', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones')
  const cell = page.locator('#wb-cell-1-2')
  await cell.click()
  await page.keyboard.press('Delete')
  await page.getByRole('button', { name: 'Continue to weights' }).click()

  const summary = page.getByRole('alert').filter({ hasText: 'There is a problem' })
  await expect(summary).toBeFocused()
  const link = summary.getByRole('link', { name: 'Enter a number for B on Pixel density.' })
  await link.click()
  await expect(cell).toBeFocused()
  // Typing now edits that cell, not the one the grid had before.
  await page.keyboard.type('401')
  await page.keyboard.press('Enter')
  await expect(cell).toHaveText('401')

  // Later stages explain what blocks them instead of failing.
  await page.locator('#wb-cell-0-0').click()
  await page.keyboard.press('Delete')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(page.getByText('The decision matrix has problems')).toBeVisible()
  await page.getByRole('button', { name: 'Enter a number for A on Price.' }).click()
  await expect(stageHeading(page, 'Data')).toBeVisible()
  await expect(page.locator('#wb-cell-0-0')).toBeFocused()
})

test('manual weights: live total, specific sum error, normalize', async ({ page }) => {
  await page.goto('/app?example=opricovic-tzeng-2004-f&stage=weights')
  await expect(page.getByRole('radio', { name: 'Manual' })).toHaveAttribute('aria-checked', 'true')
  const w1 = page.locator('#wb-weight-1')
  await w1.fill('0.45')
  await w1.blur()
  await expect(page.getByText('Weights sum to 0.950, they must sum to 1.')).toBeVisible()
  await page.getByRole('button', { name: 'Continue to ranking' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'There is a problem' })).toBeFocused()
  await page.getByRole('button', { name: 'Normalize to 1' }).click()
  await expect(page.getByText('Weights sum to 1.')).toBeVisible()
  await expect(page.locator('#wb-weight-0')).toHaveValue('0.5263')
})

test('copy a step as TSV and LaTeX', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/app?example=krishnan-2021-smartphones&stage=results')
  await page.getByRole('button', { name: 'Show the calculation' }).click()
  const block = page.locator('section[data-step="critic.weights"]')
  // One "Copy" menu per step: TSV or LaTeX.
  const copy = block.getByRole('button', { name: 'Copy step 7' })
  await copy.click()
  await page.getByRole('menuitem', { name: 'As TSV, for spreadsheets' }).click()
  await expect(copy).toHaveText('Copied')
  const tsv = await page.evaluate(() => navigator.clipboard.readText())
  expect(tsv.split('\n')[0]).toBe('\tPrice\tScreen size\tPixel density\tThickness\tMass')
  expect(tsv.split('\n')[1]!.startsWith('w\t0.187')).toBe(true)
  await copy.click()
  await page.getByRole('menuitem', { name: 'As a LaTeX table' }).click()
  const tex = await page.evaluate(() => navigator.clipboard.readText())
  expect(tex).toContain('\\toprule')
  expect(tex).toContain('$w_j$ & 0.1872')
  await expect(copy).toHaveText('Copy', { timeout: 3000 })
})

test('download the full calculation as .xlsx', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=results')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download full calculation (.xlsx)' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('mcdm-calculation.xlsx')
  const path = await download.path()
  const wb = XLSX.read(readFileSync(path), { cellNF: true })
  // Data first (it imports back), the provenance last.
  expect(wb.SheetNames).toEqual(['Data', 'Weights', 'Ranking', 'Calculation', 'About'])
  const about = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['About']!, { header: 1 })
  expect(about[0]).toEqual(['Tool', 'MCDM Workbench'])
  expect(about.find((r) => r[0] === 'Data source')?.[1]).toContain('doi:10.3390/sym13060973')
  // Computed numbers are number cells with a 4-decimal format and full precision.
  const w = wb.Sheets['Weights']!['F4']!
  expect(w.t).toBe('n')
  expect(w.z).toBe('0.0000')
  expect(String(w.v).length).toBeGreaterThan(8)
  // Each calculation block names its method.
  const titles = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Calculation']!, { header: 1 }).filter((r) => r.length === 1).map((r) => r[0])
  expect(titles).toContain('CRITIC: Normalized matrix r (min-max)')
  expect(titles).toContain('TOPSIS: Normalized matrix r (vector)')
})

test('the whole flow works with the keyboard alone', async ({ page }) => {
  await page.goto('/app')
  // Tab once the workbench is on screen: before its chunk arrives there is nothing to reach but the top bar.
  await expect(page.getByRole('button', { name: 'Load example', exact: true }).first()).toBeVisible()
  await tabTo(page, /^Load example$/)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('grid', { name: 'Decision matrix' })).toBeVisible()
  await tabTo(page, 'Continue to weights', 200)
  await page.keyboard.press('Enter')
  await expect(stageHeading(page, 'Weights')).toBeVisible()
  // The stage takes focus, so Tab continues from the top of the new stage.
  await expect(page.locator('#main')).toBeFocused({ timeout: 10_000 })
  await tabTo(page, /^CRITIC$/)
  // Radix roving focus moves the focus in a timeout after the key; a second key sent before it lands goes to the old
  // item. Each arrow therefore waits for the focus it produces, as a person would see it move.
  const arrow = async (key: 'ArrowRight' | 'ArrowLeft', to: string) => {
    await page.keyboard.press(key)
    await expect(page.getByRole('radio', { name: to, exact: true })).toBeFocused()
  }
  await arrow('ArrowRight', 'Entropy')
  await arrow('ArrowRight', 'SD')
  await arrow('ArrowRight', 'MEREC')
  await arrow('ArrowRight', 'Equal weights')
  await arrow('ArrowRight', 'Manual')
  await page.keyboard.press('Space')
  await expect(page.getByRole('radio', { name: 'Manual' })).toHaveAttribute('aria-checked', 'true')
  await arrow('ArrowLeft', 'Equal weights')
  await arrow('ArrowLeft', 'MEREC')
  await arrow('ArrowLeft', 'SD')
  await arrow('ArrowLeft', 'Entropy')
  await arrow('ArrowLeft', 'CRITIC')
  await page.keyboard.press('Space')
  await expect(page.getByRole('radio', { name: 'CRITIC' })).toHaveAttribute('aria-checked', 'true')
  await tabTo(page, 'Show the calculation')
  await page.keyboard.press('Enter')
  await expect(page.locator('section[data-step]')).toHaveCount(7)
  await tabTo(page, 'Continue to ranking')
  await page.keyboard.press('Enter')
  await expect(stageHeading(page, 'Ranking')).toBeVisible()
  await tabTo(page, 'Continue to results')
  await page.keyboard.press('Enter')
  await expect(stageHeading(page, 'Results')).toBeVisible()
  await tabTo(page, 'Download data (.csv)')
  await tabTo(page, 'Check robustness')
  await page.keyboard.press('Enter')
  await expect(stageHeading(page, 'Robustness')).toBeVisible()
  await expect(page.locator('#main')).toBeFocused({ timeout: 10_000 })
  await expect(page.getByRole('slider')).toBeVisible() // the stage's own chunk has arrived
  // The criterion choice (one tab stop, on the selected criterion), then the slider: its arrow keys move the weight.
  await tabTo(page, /^Thickness$/)
  await tabTo(page, 'Weight of')
  const weight = page.getByTestId('sweep-weight')
  const before = await weight.innerText()
  await page.keyboard.press('ArrowRight')
  await expect(weight).not.toHaveText(before)
  // Random weights: Tab lands on the selected spread; arrows move (each waits for its focus), Space picks.
  await tabTo(page, 'Medium, κ = 100')
  await arrow('ArrowLeft', 'Loose, κ = 20')
  await arrow('ArrowLeft', 'Uniform')
  await page.keyboard.press('Space')
  await expect(page.getByRole('radio', { name: 'Uniform' })).toHaveAttribute('aria-checked', 'true')
  // The rail is reachable too: Shift+Tab back up to the stage list and open Data.
  await tabTo(page, /^Data\s/, 120, 'Shift+Tab')
  await page.keyboard.press('Enter')
  await expect(stageHeading(page, 'Data')).toBeVisible()
})

test('Entropy: the Vilnius example gives the published weights; min-max, a negative value and the calculation', async ({ page }) => {
  const z = fixture('entropy-zavadskas2017') as { matrix: number[][]; types: CriterionType[]; expected: { weights: number[] } }
  await page.goto('/app?example=zavadskas-2017-vilnius&stage=weights')
  await expect(stageHeading(page, 'Weights')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Entropy' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: 'Raw data (sum)' })).toHaveAttribute('aria-checked', 'true')
  const weightCells = page.getByRole('table', { name: 'Weights by criterion' }).locator('tbody tr td:last-child')
  await expect(weightCells).toHaveText(z.expected.weights.map(f4))
  await expect(page.locator('figure', { hasText: 'Uneven shares, more weight' })).toBeVisible()

  // Min-max: other weights, the same as the core's.
  await page.getByRole('radio', { name: 'Min-max' }).click()
  const p = { alternatives: z.matrix.map((_, i) => `A${i}`), criteria: z.types.map((type, j) => ({ name: `C${j}`, type })), matrix: z.matrix }
  const minmax = entropy.compute(p, { normalization: 'minmax' }).weights.map(f4)
  expect(minmax).not.toEqual(z.expected.weights.map(f4))
  await expect(weightCells).toHaveText(minmax)
  await expect(page.locator('nav[aria-label="Stages"]:visible')).toContainText('Entropy (min-max)')

  // "Show the calculation": the min-max steps, then the four raw-data steps.
  await page.getByRole('button', { name: 'Show the calculation' }).click()
  const steps = page.locator('section[data-step]')
  await expect(steps).toHaveCount(5)
  await page.getByRole('radio', { name: 'Raw data (sum)' }).click()
  await expect(steps).toHaveCount(4)
  expect(await steps.evaluateAll((els) => els.map((e) => e.getAttribute('data-step')))).toEqual([
    'entropy.proportionsSum',
    'entropy.entropy',
    'entropy.diversification',
    'entropy.weights',
  ])
  await expect(page.getByRole('navigation', { name: 'Calculation steps' })).toContainText('Diversification')

  // A negative value blocks raw-data shares with a message that offers min-max; min-max then computes.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Data' }).click()
  await page.locator('#wb-cell-3-1').click()
  await page.keyboard.type('-5')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Weights' }).click()
  const error = page.getByRole('button', { name: /^Justiniškės on Population density \(per km²\) is .5\. Raw data \(sum\) needs values of 0 or more; choose Min-max to use negative values\.$/ })
  await expect(error).toBeVisible()
  await expect(page.getByText('The decision matrix has problems')).toBeVisible()
  await page.getByRole('radio', { name: 'Min-max' }).click()
  await expect(error).toHaveCount(0)
  await expect(weightCells).toHaveCount(5)
})

test('SD: the Diakoulaki example gives the published weights, the picture and the calculation', async ({ page }) => {
  const d = fixture('sd-diakoulaki1995') as { matrix: number[][]; types: CriterionType[]; published: { weights: number[] } }
  await page.goto('/app?example=diakoulaki-1995-pharma&stage=weights')
  await expect(stageHeading(page, 'Weights')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'SD', exact: true })).toHaveAttribute('aria-checked', 'true')
  const weightCells = page.getByRole('table', { name: 'Weights by criterion' }).locator('tbody tr td:last-child')
  // The core's weights at 4 decimals, which round to the paper's 3.
  const p = { alternatives: d.matrix.map((_, i) => `A${i}`), criteria: d.types.map((type, j) => ({ name: `C${j}`, type })), matrix: d.matrix }
  const core = sd.compute(p, {}).weights
  await expect(weightCells).toHaveText(core.map(f4))
  expect(core.map((w) => w.toFixed(3))).toEqual(d.published.weights.map((w) => w.toFixed(3)))
  await expect(page.locator('figure', { hasText: 'Wider spread, more weight' })).toBeVisible()

  await page.getByRole('button', { name: 'Show the calculation' }).click()
  const steps = page.locator('section[data-step]')
  await expect(steps).toHaveCount(4)
  expect(await steps.evaluateAll((els) => els.map((e) => e.getAttribute('data-step')))).toEqual(['sd.normalized', 'sd.sigma', 'sd.sigmaTotal', 'sd.weights'])
  await expect(page.getByRole('navigation', { name: 'Calculation steps' })).toContainText('Spread')
})

test('MEREC: the illustrative example gives the published weights and the picture; a zero cell blocks at the cell', async ({ page }) => {
  const k = fixture('merec-keshavarz2021-illustrative') as { matrix: number[][]; types: CriterionType[]; expected: { weights: number[] } }
  await page.goto('/app?example=keshavarz-2021-merec&stage=weights')
  await expect(stageHeading(page, 'Weights')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'MEREC', exact: true })).toHaveAttribute('aria-checked', 'true')
  const weightCells = page.getByRole('table', { name: 'Weights by criterion' }).locator('tbody tr td:last-child')
  const p = { alternatives: k.matrix.map((_, i) => `A${i}`), criteria: k.types.map((type, j) => ({ name: `C${j}`, type })), matrix: k.matrix }
  const core = merec.compute(p, {}).weights
  await expect(weightCells).toHaveText(core.map(f4))
  expect(core.map(f4)).toEqual(k.expected.weights.map(f4))
  await expect(page.locator('figure', { hasText: 'Remove a criterion, see how much the scores drop' })).toBeVisible()
  await expect(page.getByText('C1 takes more than half of the weight, so check that its range is real.')).toBeVisible()

  await page.getByRole('button', { name: 'Show the calculation' }).click()
  const steps = page.locator('section[data-step]')
  await expect(steps).toHaveCount(6)
  await expect(page.getByRole('navigation', { name: 'Calculation steps' })).toContainText('Removal effect')

  // A zero cell: MEREC cannot divide by it or take its logarithm, so the stage is blocked; the message leads to the cell.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Data' }).click()
  await page.locator('#wb-cell-1-2').click()
  await page.keyboard.type('0')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Weights' }).click()
  const error = page.getByRole('button', { name: /^A2 on C3 is 0\. This method divides by the values or takes their logarithm, so each must be above 0\.$/ })
  await expect(error).toBeVisible()
  await expect(weightCells).toHaveCount(0)
  await error.click()
  await expect(page.locator('#wb-cell-1-2')).toBeFocused()
})

test('a cold deep link to a stage renders its picture in the first frame: the table below does not shift', async ({ page }) => {
  // Every animation frame from the first: where the weights table first appears and whether the picture was there.
  await page.addInitScript(() => {
    const w = window as unknown as { firstTable?: { top: number; picture: boolean } }
    const tick = () => {
      const table = document.querySelector('table[aria-labelledby="wb-weights-table"]')
      if (table && !w.firstTable) w.firstTable = { top: table.getBoundingClientRect().top, picture: document.querySelector('main figure') !== null }
      if (!w.firstTable) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  // A slow network for the picture chunks, so a page that rendered before them would show the table first.
  await page.route(/\.pictures\b/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    await route.continue()
  })
  await page.goto('/app?example=keshavarz-2021-merec&stage=weights')
  const table = page.getByRole('table', { name: 'Weights by criterion' })
  await expect(table).toBeVisible()
  await page.waitForLoadState('networkidle')
  const first = await page.evaluate(() => (window as unknown as { firstTable?: { top: number; picture: boolean } }).firstTable)
  const settled = await table.evaluate((el) => el.getBoundingClientRect().top)
  expect(first?.picture).toBe(true)
  expect(first?.top).toBe(settled)
})

test('SAW: the Podvezko example ranks with SAW, sum changes the scores, the contributions add up to S, TOPSIS brings back D+ and D−', async ({ page }) => {
  const ex = getExample('podvezko-2011-baltic')!
  const p = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const byName = (scores: number[]) => Object.fromEntries(ex.alternatives.map((a, i) => [a, f4(scores[i]!)]))
  const linear = saw.compute(p, ex.weights!, {})
  const sum = saw.compute(p, ex.weights!, { normalization: 'sum' })

  await page.goto('/app?example=podvezko-2011-baltic&stage=ranking')
  await expect(stageHeading(page, 'Ranking')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'SAW' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: 'Linear (x / max)' })).toHaveAttribute('aria-checked', 'true')
  const table = page.getByRole('table', { name: 'Ranking' })
  await expect(table.locator('thead th')).toHaveText(['Rank', 'Alternative', 'Score S'])

  // Scores: the core's, and the published ones (corrected Table 3) to 3 decimals.
  expect(await closenessByName(page)).toEqual(byName(linear.scores))
  const published = ex.published.find((x) => x.label === 'saw.scores')!.values as number[]
  const shown = await closenessByName(page)
  ex.alternatives.forEach((a, i) => expect(Number(shown[a]).toFixed(3), a).toBe(published[i]!.toFixed(3)))
  await expect(page.getByTestId('best-sentence')).toHaveText(`Lithuania ranks first (S = ${f4(linear.scores[2]!)}).`)
  // The contributions picture takes the score chart's place: each of its bars already ends at S.
  await expect(page.locator('figure', { hasText: 'Where each score comes from' })).toBeVisible()
  await expect(page.locator('figure', { hasText: 'Weighted sum S' })).toHaveCount(0)

  // The picture: one bar per alternative in rank order, five segments each, adding up to S.
  const bars = page.getByTestId('saw-bar')
  await expect(bars).toHaveCount(4)
  const read = () =>
    bars.evaluateAll((els) =>
      els.map((el) => ({
        score: Number(el.getAttribute('data-score')),
        parts: [...el.querySelectorAll('[data-testid="saw-segment"]')].map((r) => Number(r.getAttribute('data-value'))),
        text: el.querySelector('text:last-of-type')?.textContent ?? '',
      })),
    )
  const check = async (scores: number[]) => {
    const drawn = await read()
    const order = scores.map((_, i) => i).sort((a, b) => scores[b]! - scores[a]!)
    expect(drawn.map((d) => d.score)).toEqual(order.map((i) => scores[i]))
    for (const d of drawn) {
      expect(d.parts).toHaveLength(5)
      expect(Math.abs(d.parts.reduce((a, b) => a + b, 0) - d.score)).toBeLessThan(1e-12)
      expect(d.text).toBe(f4(d.score))
    }
  }
  await check(linear.scores)

  // Hovering a segment names its criterion and contribution.
  const v = linear.steps.find((x) => x.key === 'saw.weighted')!.matrix!
  await bars.first().getByTestId('saw-segment').first().hover()
  await expect(page.getByText(`Lithuania: GDP growth (%) adds ${f4(v[2]![0]!)} to S = ${f4(linear.scores[2]!)}`)).toBeVisible()

  // Sum normalization: other scores, the core's, and the picture follows.
  await page.getByRole('radio', { name: 'Sum' }).click()
  expect(await closenessByName(page)).toEqual(byName(sum.scores))
  expect(byName(sum.scores)).not.toEqual(byName(linear.scores))
  await check(sum.scores)
  await expect(page.locator('nav[aria-label="Stages"]:visible')).toContainText('SAW (sum)')

  // Robustness ranks with SAW (sum) and names its score.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Robustness' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Robustness' })).toBeVisible()
  await expect(page.locator('figure', { hasText: 'Weighted sum S as the weight of GDP growth (%) changes' })).toBeVisible()
  await expect(page.getByTestId('live-row').first().locator('th')).toHaveText('Lithuania')

  // TOPSIS: D+ and D− come back with Closeness C, the contributions go.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await page.getByRole('radio', { name: 'TOPSIS' }).click()
  await expect(table.locator('thead th')).toHaveText(['Rank', 'Alternative', 'D+', 'D−', 'Closeness C'])
  expect(await closenessByName(page)).toEqual(byName(topsis.compute(p, ex.weights!, {}).scores))
  await expect(page.getByTestId('saw-contributions')).toHaveCount(0)
  await expect(page.locator('figure', { hasText: 'Closeness coefficient C' })).toBeVisible()
  await expect(page.locator('figure', { hasText: 'Distances to A+ and A−' })).toBeVisible()
})

test('VIKOR: the ten-alternative example ranks by Q, shows S and R, the DQ verdict and the compromise set; v moves Q live', async ({ page }) => {
  const ex = getExample('keshavarz-2015-ten-alternatives')!
  const p = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const byName = (scores: number[]) => Object.fromEntries(ex.alternatives.map((a, i) => [a, f4(scores[i]!)]))
  const at = (v: number) => {
    const r = vikor.compute(p, ex.weights!, { v })
    const vec = (k: string) => r.steps.find((x) => x.key === k)!.vector!
    return { r, c: vikorCompromise(vec('vikor.groupUtility'), vec('vikor.individualRegret'), r.scores) }
  }
  const half = at(0.5)

  await page.goto('/app?example=keshavarz-2015-ten-alternatives&stage=ranking')
  await expect(stageHeading(page, 'Ranking')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'VIKOR' })).toHaveAttribute('aria-checked', 'true')
  const table = page.getByRole('table', { name: 'Ranking' })
  await expect(table.locator('thead th')).toHaveText(['Rank', 'Alternative', 'Group utility S', 'Individual regret R', 'Compromise Q'])
  expect(await closenessByName(page)).toEqual(byName(half.r.scores))
  // Rank column equals the published VIKOR ranks (Table 7, set 1); rows are in rank order, lowest Q first.
  const published = ex.published.find((x) => x.label === 'vikor.rank')!.values as number[]
  const rows = await table.getByTestId('ranking-row').evaluateAll((els) => els.map((el) => [el.querySelector('th')!.textContent!.trim(), Number(el.querySelector('td')!.textContent)] as const))
  for (const [name, rank] of rows) expect(rank, name).toBe(published[ex.alternatives.indexOf(name)])
  await expect(page.getByTestId('best-sentence')).toHaveText(`A7 ranks first (Q = ${f4(half.r.scores[6]!)}).`)

  // The picture replaces the score chart: ten Q bars in rank order, the compromise set in the accent.
  await expect(page.getByTestId('vikor-idea')).toBeVisible()
  const bars = page.getByTestId('vikor-bar')
  await expect(bars).toHaveCount(10)
  const drawn = await bars.evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-q'))))
  expect(drawn).toEqual([...half.r.scores].sort((a, b) => a - b))
  await expect(page.locator('[data-testid="vikor-bar"][data-in-set]')).toHaveCount(3)
  await expect(page.getByTestId('vikor-c1')).toHaveText(`No acceptable advantage: A7 leads A1 by only ${f4(half.c.advantage)} in Q, less than DQ = 0.1111.`)
  await expect(page.getByTestId('vikor-c2')).toHaveText('Acceptable stability: A7 is also first by R.')
  await expect(page.getByTestId('vikor-result')).toHaveText('Compromise set: A7, A1, A8')

  // Results, the rail and the downloaded workbook give the same answer as the method: a set, not one winner.
  const rail = page.locator('nav[aria-label="Stages"]:visible')
  await expect(rail).toContainText('A7, A1, A8')
  await rail.locator('button', { hasText: 'Results' }).click()
  const c1 = `No acceptable advantage: A7 leads A1 by only ${f4(half.c.advantage)} in Q, less than DQ = 0.1111.`
  await expect(page.getByTestId('results-vikor-verdict')).toHaveText(`${c1} Compromise set: A7, A1, A8.`)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download full calculation (.xlsx)' }).click(),
  ])
  const about = XLSX.utils.sheet_to_json<string[]>(XLSX.read(readFileSync(await download.path())).Sheets['About']!, { header: 1 })
  expect(about.find((r) => r[0] === 'Acceptable advantage (C1)')?.[1]).toBe(c1)
  expect(about.find((r) => r[0] === 'Acceptable stability (C2)')?.[1]).toBe('Acceptable stability: A7 is also first by R.')
  expect(about.find((r) => r[0] === 'Compromise set')?.[1]).toBe('A7, A1, A8')
  await rail.locator('button', { hasText: 'Ranking' }).click()
  await expect(stageHeading(page, 'Ranking')).toBeVisible()

  // v to 1 with the keyboard (End): Q is S alone, the table, the picture and the verdict follow.
  const slider = page.getByRole('slider', { name: 'Strategy weight v' })
  await slider.focus()
  await page.keyboard.press('End')
  await expect(page.getByTestId('param-value')).toHaveText('1.00')
  const one = at(1)
  await expect.poll(() => closenessByName(page)).toEqual(byName(one.r.scores))
  await expect(page.getByTestId('vikor-idea')).toHaveAttribute('data-v', '1')
  await expect(page.getByTestId('vikor-result')).toHaveText(
    one.c.set.length === 1 ? `Compromise solution: ${ex.alternatives[one.c.set[0]!]}` : `Compromise set: ${one.c.set.map((i) => ex.alternatives[i]).join(', ')}`,
  )
  await expect(page.locator('nav[aria-label="Stages"]:visible')).toContainText('VIKOR (v = 1.00)')
  // One step left: 0.99 on the 0.01 grid.
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('param-value')).toHaveText('0.99')

  // Robustness ranks with VIKOR and names its score.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Robustness' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Robustness' })).toBeVisible()
  await expect(page.locator('figure', { hasText: 'Compromise index Q as the weight of C1 changes' })).toBeVisible()
})

test('WASPAS: the method page opens the supplier example with WASPAS; published Q, the λ chart, and λ moves Q and the label live', async ({ page }) => {
  const ex = getExample('adali-2017-suppliers')!
  const p = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const byName = (scores: number[]) => Object.fromEntries(ex.alternatives.map((a, i) => [a, f4(scores[i]!)]))
  const at = (lambda: number) => waspas.compute(p, ex.weights!, { lambda })

  await page.goto('/methods/waspas')
  await expect(page.getByTestId('waspas-lambda')).toBeVisible()
  await page.getByRole('link', { name: /Open in workbench/ }).first().click()
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(stageHeading(page, 'Ranking')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'WASPAS' })).toHaveAttribute('aria-checked', 'true')
  const table = page.getByRole('table', { name: 'Ranking' })
  await expect(table.locator('thead th')).toHaveText(['Rank', 'Alternative', 'Sum Q1', 'Product Q2', 'Score Q'])
  // Q at λ = 0.5 equals the core and Table 7 to the printed 4 decimals.
  const half = at(0.5)
  expect(await closenessByName(page)).toEqual(byName(half.scores))
  const published = ex.published.find((x) => x.label === 'waspas.scores')!.values as number[]
  expect(Object.values(byName(half.scores)).map(Number)).toEqual(published)
  await expect(page.getByTestId('best-sentence')).toHaveText(`A1 ranks first (Q = ${f4(half.scores[0]!)}).`)

  // The λ chart: one line per supplier, two rank swaps between λ = 0 and 1, the cursor at 0.5.
  await expect(page.getByTestId('waspas-lambda')).toBeVisible()
  await expect(page.getByTestId('waspas-line')).toHaveCount(5)
  await expect(page.getByTestId('waspas-swap')).toHaveCount(2)
  await expect(page.getByTestId('waspas-cursor')).toHaveAttribute('data-lambda', '0.5')

  // λ to 0.9 with the keyboard (step 0.1): A5 passes A4, Q and the variant label follow.
  const slider = page.getByRole('slider', { name: 'Blend λ' })
  await slider.focus()
  for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('param-value')).toHaveText('0.90')
  await expect.poll(() => closenessByName(page)).toEqual(byName(at(0.9).scores))
  await expect(page.getByTestId('waspas-cursor')).toHaveAttribute('data-lambda', '0.9')
  const order = await table.getByTestId('ranking-row').evaluateAll((els) => els.map((el) => el.querySelector('th')!.textContent!.trim()))
  expect(order).toEqual(['A1', 'A5', 'A4', 'A2', 'A3'])
  await expect(page.locator('nav[aria-label="Stages"]:visible')).toContainText('WASPAS (λ = 0.90)')

  // Keyboard on the chart: a grid point reads its λ, Q and rank; arrows move along λ.
  await page.locator('[data-testid="waspas-lambda"] circle[tabindex="0"]').focus()
  await page.keyboard.press('Home')
  expect(await focusedLabel(page)).toMatch(/, λ = 0\.0: Q = 0\.\d{4}, rank \d/)
})

test('VIKOR: the method page opens the shared Opricovic and Tzeng example with VIKOR, and its own v slider turns the line', async ({ page }) => {
  await page.goto('/methods/vikor')
  await expect(page.getByTestId('vikor-idea')).toBeVisible()
  const line = page.getByTestId('vikor-threshold-line')
  const before = await line.getAttribute('d')
  await page.getByRole('slider', { name: 'Strategy weight v' }).focus()
  await page.keyboard.press('Home')
  await expect(page.getByTestId('idea-v')).toHaveText('0.00')
  expect(await line.getAttribute('d')).not.toBe(before)
  await page.getByRole('link', { name: /^Open in workbench: Mountain climbing \(Opricovic/ }).click()
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(page.getByRole('radio', { name: 'VIKOR' })).toHaveAttribute('aria-checked', 'true')
  expect(await closenessByName(page)).toEqual({ A1: '1.0000', A2: '0.0000', A3: '1.0000' })
  await expect(page.getByTestId('vikor-result')).toHaveText('Compromise solution: A2')
  await expect(page.getByTestId('vikor-c1')).toHaveText('Acceptable advantage: A2 leads A1 by 1.0000 in Q, at least DQ = 0.5000.')
})

test('EDAS: the method page opens the ten-alternative example with EDAS; AS, SP and SN match the core, the ranks match Table 7', async ({ page }) => {
  const ex = getExample('keshavarz-2015-ten-alternatives')!
  const p = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const r = edas.compute(p, ex.weights!, {})

  await page.goto('/methods/edas')
  await expect(page.getByTestId('edas-idea')).toBeVisible()
  await page.getByRole('link', { name: /^Ten alternatives: Open in workbench/ }).click()
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(page.getByRole('radio', { name: 'EDAS' })).toHaveAttribute('aria-checked', 'true')
  const table = page.getByRole('table', { name: 'Ranking' })
  await expect(table.locator('thead th')).toHaveText(['Rank', 'Alternative', 'Above average SP', 'Below average SN', 'Appraisal AS'])
  expect(await closenessByName(page)).toEqual(Object.fromEntries(ex.alternatives.map((a, i) => [a, f4(r.scores[i]!)])))
  const published = ex.published.find((x) => x.label === 'edas.rank')!.values as number[]
  const rows = await table.getByTestId('ranking-row').evaluateAll((els) => els.map((el) => [el.querySelector('th')!.textContent!.trim(), Number(el.querySelector('td')!.textContent)] as const))
  for (const [name, rank] of rows) expect(rank, name).toBe(published[ex.alternatives.indexOf(name)])
  await expect(page.getByTestId('best-sentence')).toHaveText(`A1 ranks first (AS = ${f4(r.scores[0]!)}).`)

  // The diverging picture: one row per alternative in rank order, the highest AS first.
  const drawn = await page.getByTestId('edas-row').evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-score'))))
  expect(drawn).toEqual([...r.scores].sort((a, b) => b - a))
  await expect(page.getByTestId('edas-average-line')).toHaveCount(1) // a vertical line has no width, so not 'visible' to Playwright
})

test('EDAS: a negative value computes with a notice; a criterion whose average drops to 0 or below blocks the ranking', async ({ page }) => {
  await page.goto('/app?example=keshavarz-2015-ten-alternatives&method=edas&stage=data')
  const setCell = async (value: string) => {
    await page.locator('#wb-cell-0-3').click()
    await page.keyboard.type(value)
    await page.keyboard.press('Enter')
  }
  const toRanking = () => page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()

  // C4 averages 0.101; -0.5 at A1 keeps it above 0.
  await setCell('-0.5')
  await toRanking()
  await expect(page.getByText('C4 has negative values. EDAS measures distance as a share of the average')).toBeVisible()
  await expect(page.getByTestId('ranking-row')).toHaveCount(10)

  // -2 at A1 takes the average of C4 below 0.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Data' }).click()
  await setCell('-2')
  await toRanking()
  await expect(page.getByRole('button', { name: /^The average of C4 is .+ EDAS divides by each criterion's average, so it must be above 0\.$/ })).toBeVisible()
  await expect(page.getByTestId('ranking-row')).toHaveCount(0)
})

test('COPRAS: the method page opens the cream separators with Entropy and COPRAS; published Q, the N column and the bonus bars; a zero blocks', async ({ page }) => {
  const ex = getExample('ozcan-celik-2021-separators')!
  const p = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const res = copras.compute(p, entropy.compute(p, {}).weights, {})
  const n = res.steps.find((x) => x.key === 'copras.utility')!.vector!

  await page.goto('/methods/copras')
  await expect(page.getByTestId('copras-bonus')).toBeVisible()
  await page.getByRole('link', { name: /Open in workbench/ }).first().click()
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(stageHeading(page, 'Ranking')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'COPRAS' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('nav[aria-label="Stages"]:visible')).toContainText('Entropy')
  const table = page.getByRole('table', { name: 'Ranking' })
  await expect(table.locator('thead th')).toHaveText(['Rank', 'Alternative', 'Relative significance Q', 'Utility degree N (%)'])
  // Q equals the core and the printed Table 11 to 4 decimals (Entropy weights from the data).
  const byName = Object.fromEntries(ex.alternatives.map((a, i) => [a, f4(res.scores[i]!)]))
  expect(await closenessByName(page)).toEqual(byName)
  const published = ex.published.find((x) => x.label === 'copras.significance')!.values as number[]
  expect(Object.values(byName).map(Number)).toEqual(published)
  const order = await table.getByTestId('ranking-row').evaluateAll((els) => els.map((el) => el.querySelector('th')!.textContent!.trim()))
  expect(order).toEqual(['A4', 'A7', 'A6', 'A5', 'A2', 'A3', 'A1'])
  await expect(table.getByTestId('column-copras.utility')).toHaveText(order.map((a) => n[ex.alternatives.indexOf(a)]!.toFixed(2)))
  await expect(page.getByTestId('best-sentence')).toHaveText(`A4 ranks first (Q = ${f4(res.scores[3]!)}).`)
  // The picture replaces the score chart: one two-part bar per alternative in rank order, N at the end.
  await expect(page.getByTestId('copras-bar')).toHaveCount(7)
  await expect(page.getByTestId('copras-utility').first()).toHaveText('100.00%')
  await page.locator('[data-testid="copras-segment"][tabindex="0"]').focus()
  await page.keyboard.press('ArrowRight')
  expect(await focusedLabel(page)).toMatch(/^A4, Cost bonus: 0\.\d{4} \(Q = 0\.1702, N = 100\.00%\)/)

  // A zero in a benefit column: Entropy still weighs, COPRAS blocks with the message at the cell.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Data' }).click()
  await page.locator('#wb-cell-1-2').click()
  await page.keyboard.type('0')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  const error = page.getByRole('button', { name: 'A2 on Drum turnover is 0. This method divides by the values or takes their logarithm, so each must be above 0.' })
  await expect(error).toBeVisible()
  await expect(page.getByTestId('ranking-row')).toHaveCount(0)
})

test('MARCOS: the method page opens the drivers with MARCOS; published f(K), f(K-) and f(K+) once above the table, the ghost rows; a zero blocks', async ({ page }) => {
  const ex = getExample('stevic-brkovic-2020-drivers')!
  const p = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const res = marcos.compute(p, ex.weights!, {})
  const scalar = (key: string) => res.steps.find((x) => x.key === key)!.scalar!

  await page.goto('/methods/marcos')
  await expect(page.getByTestId('marcos-rows')).toBeVisible()
  await expect(page.getByTestId('marcos-saw-line')).toBeVisible()
  await page.getByRole('link', { name: /Open in workbench/ }).first().click()
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(stageHeading(page, 'Ranking')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'MARCOS' })).toHaveAttribute('aria-checked', 'true')
  const table = page.getByRole('table', { name: 'Ranking' })
  await expect(table.locator('thead th')).toHaveText(['Rank', 'Alternative', 'Utility f(K)'])
  const byName = Object.fromEntries(ex.alternatives.map((a, i) => [a, f4(res.scores[i]!)]))
  expect(await closenessByName(page)).toEqual(byName)
  const published = ex.published.find((x) => x.label === 'marcos.utility')!.values as number[]
  res.scores.forEach((f, i) => expect(Math.abs(f - published[i]!)).toBeLessThanOrEqual(0.001))
  await expect(page.getByTestId('best-sentence')).toHaveText(`A8 ranks first (f(K) = ${f4(res.scores[7]!)}).`)
  await expect(page.getByTestId('ranking-constants')).toHaveText(
    `The same for every alternative: f(K⁻) = ${f4(scalar('marcos.fKMinus'))}, f(K⁺) = ${f4(scalar('marcos.fKPlus'))}`,
  )
  // The picture replaces the score chart: the ideal and anti-ideal rows around one bar per alternative.
  await expect(page.getByTestId('marcos-ghost')).toHaveCount(2)
  await expect(page.getByTestId('marcos-bar')).toHaveCount(23)
  await expect(page.getByTestId('marcos-utility').first()).toHaveText(f4(res.scores[7]!))

  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Data' }).click()
  await page.locator('#wb-cell-0-2').click()
  await page.keyboard.type('0')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(page.getByRole('button', { name: /^A1 on Vehicle maintenance is 0\./ })).toBeVisible()
  await expect(page.getByTestId('ranking-row')).toHaveCount(0)
})

test('CoCoSo: the method page opens the logistics example with CoCoSo; S, P and k, the three readings, the λ chart and slider; an all-worst row blocks', async ({ page }) => {
  const ex = getExample('yazdani-2019-logistics')!
  const p = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const at = (lambda: number) => cocoso.compute(p, ex.weights!, { lambda })
  const byName = (scores: number[]) => Object.fromEntries(ex.alternatives.map((a, i) => [a, f4(scores[i]!)]))

  await page.goto('/methods/cocoso')
  await expect(page.getByTestId('cocoso-lenses')).toBeVisible()
  await expect(page.getByTestId('cocoso-lambda')).toBeVisible()
  await page.getByRole('link', { name: /Open in workbench/ }).first().click()
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(stageHeading(page, 'Ranking')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'CoCoSo' })).toHaveAttribute('aria-checked', 'true')
  const table = page.getByRole('table', { name: 'Ranking' })
  await expect(table.locator('thead th')).toHaveText(['Rank', 'Alternative', 'Weighted sum S', 'Power sum P', 'Combined score k'])
  const half = at(0.5)
  expect(await closenessByName(page)).toEqual(byName(half.scores))
  const published = ex.published.find((x) => x.label === 'cocoso.scores')!.values as number[]
  half.scores.forEach((k, i) => expect(Math.abs(k - published[i]!)).toBeLessThanOrEqual(0.0015))
  await expect(page.getByTestId('best-sentence')).toHaveText(`A3 GEFCO ranks first (k = ${f4(half.scores[2]!)}).`)

  // The readings replace the score chart; the λ chart has one line per provider and no swap on this example.
  await expect(page.getByTestId('cocoso-row')).toHaveCount(7)
  await expect(page.getByTestId('cocoso-k').first()).toHaveText(f4(half.scores[2]!))
  await expect(page.getByTestId('cocoso-line')).toHaveCount(7)
  await expect(page.getByTestId('cocoso-swap')).toHaveCount(0)
  await expect(page.getByTestId('cocoso-cursor')).toHaveAttribute('data-lambda', '0.5')

  // λ to 0.2 with the keyboard (step 0.1): k and the variant label follow, the order holds.
  const slider = page.getByRole('slider', { name: 'Mix λ in kc' })
  await slider.focus()
  for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('param-value')).toHaveText('0.20')
  await expect.poll(() => closenessByName(page)).toEqual(byName(at(0.2).scores))
  await expect(page.getByTestId('cocoso-cursor')).toHaveAttribute('data-lambda', '0.2')
  await expect(page.locator('nav[aria-label="Stages"]:visible')).toContainText('CoCoSo (λ = 0.20)')

  // A negative value is fine; making A5 the worst on every criterion blocks with its name.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Data' }).click()
  await page.locator('#wb-cell-4-0').click()
  await page.keyboard.type('-5')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(page.getByTestId('ranking-row')).toHaveCount(7)
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Data' }).click()
  for (const [col, v] of [[1, '0.5'], [2, '100'], [3, '100'], [4, '100']] as const) {
    await page.locator(`#wb-cell-4-${col}`).click()
    await page.keyboard.type(v)
    await page.keyboard.press('Enter')
  }
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(page.getByRole('button', { name: /^A5 LDI Dimotrans is the worst on every weighted criterion/ })).toBeVisible()
  await expect(page.getByTestId('ranking-row')).toHaveCount(0)
  // Compare keeps the other methods and names the alternative in CoCoSo's column.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Compare' }).click()
  const column = page.locator('[data-testid="rank-column"][data-method="cocoso"]')
  await expect(column).toContainText('A5 LDI Dimotrans is the worst on every weighted criterion')
  await expect(column.locator('[data-rank]')).toHaveCount(0)
})

test('MABAC: the method page opens the forklifts with MABAC; S matches the paper, distances up and down from the border, Q by sign; negatives rank', async ({ page }) => {
  const ex = getExample('pamucar-cirovic-2015-forklifts')!
  const p = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const res = mabac.compute(p, ex.weights!, {})

  await page.goto('/methods/mabac')
  await expect(page.getByTestId('mabac-border')).toBeVisible()
  await expect(page.getByTestId('mabac-dot')).toHaveCount(7)
  // Every criterion name is reachable in full: on the (truncated) header and over the strip cells.
  for (const c of p.criteria) await expect(page.getByTestId('mabac-border').locator('title', { hasText: c.name }).first()).toBeAttached()
  await page.getByRole('link', { name: /Open in workbench/ }).first().click()
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(stageHeading(page, 'Ranking')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'MABAC' })).toHaveAttribute('aria-checked', 'true')
  const table = page.getByRole('table', { name: 'Ranking' })
  await expect(table.locator('thead th')).toHaveText(['Rank', 'Alternative', 'Distance to border S'])
  const published = ex.published.find((x) => x.label === 'mabac.scores')!.values as number[]
  res.scores.forEach((v, i) => expect(Math.abs(v - published[i]!)).toBeLessThanOrEqual(1e-4))
  await expect(page.getByTestId('best-sentence')).toHaveText(`Forklift 2 ranks first (S = ${f4(res.scores[1]!)}).`)

  // The picture replaces the score chart: one row per forklift, ten sticks each, S signed on the right.
  await expect(page.getByTestId('mabac-row')).toHaveCount(7)
  await expect(page.getByTestId('mabac-q')).toHaveCount(70)
  await expect(page.getByTestId('mabac-s').first()).toHaveText(`+${f4(res.scores[1]!)}`)
  await expect(page.getByTestId('mabac-s').last()).toHaveText(f4(res.scores[4]!))
  const q = res.steps.find((x) => x.key === 'mabac.distance')!.matrix!.flat()
  await expect(page.locator('[data-testid="mabac-q"][data-sign="up"]')).toHaveCount(q.filter((x) => x > 0).length)

  // The worked calculation marks each Q cell by its area: a triangle up or down, as well as the colour.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Results' }).click()
  await page.getByRole('button', { name: 'Show the calculation' }).click()
  const qBlock = page.locator('section[data-step="mabac.distance"]')
  await expect(qBlock.locator('[data-sign="up"]')).toHaveCount(q.filter((x) => x > 0).length)
  await expect(qBlock.locator('[data-sign="down"]')).toHaveCount(q.filter((x) => x < 0).length)

  // A negative value is an ordinary value for min-max.
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Data' }).click()
  await page.locator('#wb-cell-4-1').click()
  await page.keyboard.type('-500')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  await expect(page.getByTestId('ranking-row')).toHaveCount(7)
  await expect(page.getByTestId('mabac-row')).toHaveCount(7)
})

test('the ranking control is three full rows of three at 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/app?example=pamucar-cirovic-2015-forklifts&stage=ranking')
  const radios = page.locator('[aria-label="Ranking method"]').getByRole('radio')
  await expect(radios).toHaveCount(9)
  const boxes = await radios.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) })))
  const rows = [...new Set(boxes.map((b) => b.y))]
  expect(rows).toHaveLength(3)
  for (const y of rows) expect(boxes.filter((b) => b.y === y)).toHaveLength(3)
  const widths = new Set(boxes.map((b) => b.w))
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1)
  for (const b of boxes) expect(b.x + b.w).toBeLessThanOrEqual(375)
})

test('the weighting control is two rows at 375 px: four, then four', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/app?example=krishnan-2021-smartphones&stage=weights')
  const radios = page.locator('[aria-label="Weighting method"]').getByRole('radio')
  await expect(radios).toHaveCount(8)
  const boxes = await radios.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) })))
  const rows = [...new Set(boxes.map((b) => b.y))]
  expect(rows).toHaveLength(2)
  expect(boxes.filter((b) => b.y === rows[0]).length).toBe(4)
  expect(boxes.filter((b) => b.y === rows[1]).length).toBe(4)
  for (const b of boxes) expect(b.x + b.w).toBeLessThanOrEqual(375)
})

test('SAW: a zero blocks the ranking with a message at its cell', async ({ page }) => {
  await page.goto('/app?example=podvezko-2011-baltic&stage=data')
  await page.locator('#wb-cell-2-3').click()
  await page.keyboard.type('0')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  const error = page.getByRole('button', { name: 'Lithuania on Unemployment rate (%) is 0. This method divides by the values or takes their logarithm, so each must be above 0.' })
  await expect(error).toBeVisible()
  await error.click()
  await expect(page.locator('#wb-cell-2-3')).toBeFocused()
})

test('deleting a criterion in the grid leaves every other weight on its own criterion; undo brings the weight back', async ({ page }) => {
  await page.goto('/app?example=podvezko-2011-baltic&stage=data')
  await page.locator('#wb-cell-0-1').click()
  await page.getByRole('button', { name: /^Delete criterion: Production growth/ }).click()
  await expect(page.getByRole('grid', { name: 'Decision matrix' })).not.toContainText('Production growth')
  await page.getByRole('button', { name: 'Continue to weights' }).click()
  await expect(page.getByRole('radio', { name: 'Manual' })).toHaveAttribute('aria-checked', 'true')
  const values = ['0.3500', '0.1700', '0.2500', '0.1300']
  for (const [j, v] of values.entries()) await expect(page.locator(`#wb-weight-${j}`)).toHaveValue(v)

  await page.goto('/app?example=podvezko-2011-baltic&stage=data')
  await page.locator('#wb-cell-0-1').click()
  await page.getByRole('button', { name: /^Delete criterion: Production growth/ }).click()
  await page.locator('#wb-cell-0-0').click()
  await page.keyboard.press('Control+z')
  await expect(page.getByRole('grid', { name: 'Decision matrix' })).toContainText('Production growth')
  await page.getByRole('button', { name: 'Continue to weights' }).click()
  const all = ['0.3500', '0.1000', '0.1700', '0.2500', '0.1300']
  for (const [j, v] of all.entries()) await expect(page.locator(`#wb-weight-${j}`)).toHaveValue(v)
})

test('an example link without a stage opens Data, and an unchanged example follows the language', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=robustness')
  await expect(stageHeading(page, 'Robustness')).toBeVisible()
  await page.goto('/app?example=podvezko-2011-baltic&method=saw')
  await expect(stageHeading(page, 'Data')).toBeVisible()
  const grid = page.getByRole('grid') // its name follows the language too
  await expect(grid).toContainText('Lithuania')
  await page.getByRole('radio', { name: /^TR/ }).click()
  await expect(grid).toContainText('Litvanya')
  await expect(grid).toContainText('İşsizlik oranı')
})

test('a language switch is not an undo step; undo back to an unchanged example writes its names in the current language', async ({ page }) => {
  await page.goto('/app?example=podvezko-2011-baltic&method=saw')
  const grid = page.getByRole('grid')
  await expect(grid).toContainText('GDP growth (%)')
  await page.getByRole('radio', { name: /^TR/ }).click()
  await expect(grid).toContainText('Litvanya')
  await page.locator('#wb-cell-0-0').click()
  await expect(page.locator('#wb-cell-0-0')).toBeFocused()
  await page.keyboard.press('Control+z')
  await expect(grid).not.toContainText('GDP growth (%)')
  await expect(grid).toContainText('Litvanya')
  await expect(page.getByText(/^Örnek veri: Podvezko/).first()).toBeVisible()

  // Edited in English, switched to Turkish (an edited table keeps its names), then undone: the example is back, in TR.
  await page.getByRole('radio', { name: /^EN/ }).click()
  await expect(grid).toContainText('Lithuania')
  await page.locator('#wb-cell-2-3').click()
  await page.keyboard.type('7')
  await page.keyboard.press('Enter')
  await page.getByRole('radio', { name: /^TR/ }).click()
  await expect(grid).toContainText('Lithuania')
  await page.locator('#wb-cell-0-0').click()
  await expect(page.locator('#wb-cell-0-0')).toBeFocused()
  await page.keyboard.press('Control+z')
  await expect(grid).toContainText('Litvanya')
  await expect(grid).not.toContainText('Lithuania')
})
