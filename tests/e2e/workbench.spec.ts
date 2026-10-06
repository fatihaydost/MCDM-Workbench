import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import * as XLSX from 'xlsx'
import { critic, entropy, saw, topsis, type CriterionType } from '../../src/core'
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
    await expect(page.getByRole('radio', { name: to })).toBeFocused()
  }
  await arrow('ArrowRight', 'Entropy')
  await arrow('ArrowRight', 'Equal weights')
  await arrow('ArrowRight', 'Manual')
  await page.keyboard.press('Space')
  await expect(page.getByRole('radio', { name: 'Manual' })).toHaveAttribute('aria-checked', 'true')
  await arrow('ArrowLeft', 'Equal weights')
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
  await expect(page.locator('figure', { hasText: 'Weighted sum S' })).toBeVisible()

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
})

test('SAW: a zero blocks the ranking with a message at its cell', async ({ page }) => {
  await page.goto('/app?example=podvezko-2011-baltic&stage=data')
  await page.locator('#wb-cell-2-3').click()
  await page.keyboard.type('0')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Ranking' }).click()
  const error = page.getByRole('button', { name: 'Lithuania on Unemployment rate (%) is 0. This method divides by the values, so each must be above 0.' })
  await expect(error).toBeVisible()
  await error.click()
  await expect(page.locator('#wb-cell-2-3')).toBeFocused()
})
