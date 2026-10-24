import { expect, test } from '@playwright/test'
import { COMPARE_ORDER, compareRankings, RANKING_IDS } from '../../src/core'
import { getExample } from '../../src/data/examples'

// Every registry ranking method is a column; the counts and firsts come from the core on the same example.
const N = RANKING_IDS.length
// Compare column order: SAW, AHP and MARCOS sit next to each other.
const ORDER = COMPARE_ORDER
const ex = getExample('keshavarz-2015-ten-alternatives')!
const core = compareRankings(
  { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix },
  ex.weights!,
  ORDER.map((methodId) => ({ methodId, params: {} })),
)
const firsts = core.runs.map((r) => ex.alternatives[r.result!.ranking.indexOf(1)])

test('compare: one column per ranking method, VIKOR\'s A7 first, Borda at the end', async ({ page }) => {
  await page.goto('/app?example=keshavarz-2015-ten-alternatives&stage=compare')
  await expect(page.getByRole('heading', { level: 1, name: 'Compare' })).toBeVisible()

  const columns = page.getByTestId('rank-column')
  await expect(columns).toHaveCount(N)
  expect(await columns.evaluateAll((els) => els.map((el) => el.getAttribute('data-label')))).toEqual(
    ORDER.map((id) => (id === 'cocoso' ? 'CoCoSo' : id === 'ahp-ranking' ? 'AHP' : id.replace('-', ' ').toUpperCase())),
  )
  const firstOf = async (k: number) => columns.nth(k).locator('[data-rank="1"]').first().getAttribute('data-name')
  for (let k = 0; k < N; k++) expect(await firstOf(k)).toBe(firsts[k])
  expect(firsts[ORDER.indexOf('vikor')]).toBe('A7')

  await expect(page.getByTestId('vikor-note')).toHaveText("VIKOR's own rule: compromise set A7, A1, A8")
  await expect(page.locator('[data-testid="borda-rank"][data-name="A1"]')).toHaveText('1')
  const summary = page.getByTestId('compare-summary')
  await expect(summary).toContainText(`Agreement (Kendall's W): ${core.kendallW!.toFixed(2)}`)
  // MARCOS echoes SAW (Linear): a badge, and it is counted once.
  await expect(page.getByTestId('marcos-badge')).toHaveText('MARCOS: same order as SAW (Linear), counted once')
  expect(core.firstPlace!.of).toBe(N - 1)
  await expect(summary).toContainText(`A1 is first in ${core.firstPlace!.methods} of ${N - 1} methods`)
  await expect(summary).not.toContainText('methods ranked')

  // The top two (A1, A7) are selected at first; clicking another crossing selects that pair, arrows move focus.
  await expect(page.locator('[data-testid="crossing"][data-pair="0-6"]').first()).toHaveAttribute('aria-pressed', 'true')
  // The selected pair is coloured by slot with two fixed tokens, never by alternative index.
  const lineA = page.locator('[data-testid="rank-line"][data-pair="a"]')
  const lineB = page.locator('[data-testid="rank-line"][data-pair="b"]')
  await expect(lineA).toHaveCount(1)
  await expect(lineB).toHaveCount(1)
  const stroke = (l: typeof lineA) => l.evaluate((el) => getComputedStyle(el).stroke)
  expect(await stroke(lineA)).not.toBe(await stroke(lineB))
  const other = page.locator('[data-testid="crossing"]:not([data-pair="0-6"])').first()
  await other.click()
  await expect(other).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-testid="crossing"][data-pair="0-6"]').first()).toHaveAttribute('aria-pressed', 'false')
  await other.focus()
  const index = Number(await other.getAttribute('data-index'))
  await page.keyboard.press('ArrowRight')
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-index'))).toBe(String(index + 1))
})

test('compare: the why panel opens on A1 and A7, and a crossing changes the pair', async ({ page }) => {
  await page.goto('/app?example=keshavarz-2015-ten-alternatives&stage=compare')
  const panel = page.getByTestId('why-panel')
  await expect(panel.getByRole('heading', { name: 'A1 or A7?' })).toBeVisible()
  await expect(panel).toContainText('VIKOR')
  await page.locator('[data-testid="crossing"]:not([data-pair="0-6"])').first().focus()
  const pair = await page.evaluate(() => document.activeElement?.getAttribute('data-pair') ?? '')
  await page.keyboard.press('Enter')
  const [i, k] = pair.split('-').map((n) => `A${Number(n) + 1}`)
  // The better-ranked alternative comes first, so only the pair is fixed, not the order.
  const title = panel.getByRole('heading')
  await expect(title).toHaveText(new RegExp(`^(${i} or ${k}|${k} or ${i})\\?$`))
  await expect(title).not.toHaveText('A1 or A7?')
})

test('compare: a zero cell leaves SAW, WASPAS, COPRAS, MARCOS, ARAS and CODAS out with their reason, CoCoSo still ranks', async ({ page }) => {
  await page.goto('/app?example=keshavarz-2015-ten-alternatives&stage=data')
  await page.locator('#wb-cell-0-0').click()
  await page.keyboard.type('0')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Compare' }).click()
  const saw = page.locator('[data-testid="rank-column"][data-method="saw"]')
  await expect(saw).toContainText('This method divides by the values or takes their logarithm, so each must be above 0.')
  await expect(saw.locator('[data-rank]')).toHaveCount(0)
  await expect(page.locator('[data-testid="rank-column"][data-method="ahp-ranking"] [data-rank]')).toHaveCount(0)
  await expect(page.locator('[data-testid="rank-column"][data-method="waspas"] [data-rank]')).toHaveCount(0)
  await expect(page.locator('[data-testid="rank-column"][data-method="copras"] [data-rank]')).toHaveCount(0)
  await expect(page.locator('[data-testid="rank-column"][data-method="marcos"] [data-rank]')).toHaveCount(0)
  await expect(page.locator('[data-testid="rank-column"][data-method="aras"] [data-rank]')).toHaveCount(0)
  await expect(page.locator('[data-testid="rank-column"][data-method="codas"] [data-rank]')).toHaveCount(0)
  await expect(page.getByTestId('marcos-badge')).toHaveCount(0)
  // CoCoSo normalizes by min-max, so the zero cell is an ordinary value for it.
  await expect(page.locator('[data-testid="rank-column"][data-method="cocoso"] [data-rank]')).toHaveCount(10)
  await expect(page.getByTestId('compare-summary')).toContainText(`${N - 7} of ${N} methods ranked`)
})

test('compare: Turkish', async ({ page }) => {
  await page.goto('/app?example=keshavarz-2015-ten-alternatives&stage=compare')
  await page.getByRole('radio', { name: /^TR/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Karşılaştır' })).toBeVisible()
  await expect(page.getByTestId('why-panel').getByRole('heading', { name: 'A1 ya da A7?' })).toBeVisible()
  await expect(page.getByTestId('compare-summary')).toContainText(`Uyum (Kendall W): ${core.kendallW!.toFixed(2).replace('.', ',')}`)
})

test('compare: no sideways scroll at 390 px with 47 items', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app?example=keshavarz-2015-inventory&stage=compare')
  await expect(page.getByTestId('rank-column').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('compare: no VIKOR note when its compromise set has one member', async ({ page }) => {
  await page.goto('/app?example=podvezko-2011-baltic&stage=compare')
  await expect(page.getByTestId('rank-column')).toHaveCount(N)
  await expect(page.getByTestId('vikor-note')).toHaveCount(0)
})
