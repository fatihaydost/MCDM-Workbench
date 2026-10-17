import { expect, test } from '@playwright/test'

test('compare: four method columns, VIKOR\'s A7 first, Borda at the end', async ({ page }) => {
  await page.goto('/app?example=keshavarz-2015-ten-alternatives&stage=compare')
  await expect(page.getByRole('heading', { level: 1, name: 'Compare' })).toBeVisible()

  const columns = page.getByTestId('rank-column')
  await expect(columns).toHaveCount(4)
  expect(await columns.evaluateAll((els) => els.map((el) => el.getAttribute('data-label')))).toEqual([
    'TOPSIS',
    'SAW',
    'VIKOR',
    'EDAS',
  ])
  const firstOf = async (k: number) => columns.nth(k).locator('[data-rank="1"]').first().getAttribute('data-name')
  expect(await firstOf(0)).toBe('A1')
  expect(await firstOf(1)).toBe('A1')
  expect(await firstOf(2)).toBe('A7')
  expect(await firstOf(3)).toBe('A1')

  await expect(page.getByTestId('vikor-note')).toHaveText("VIKOR's own rule: compromise set A7, A1, A8")
  await expect(page.locator('[data-testid="borda-rank"][data-name="A1"]')).toHaveText('1')
  const summary = page.getByTestId('compare-summary')
  await expect(summary).toContainText("Agreement (Kendall's W): 0.97")
  await expect(summary).toContainText('A1 is first in 3 of 4 methods')
  await expect(summary).not.toContainText('methods ranked')

  // The top two (A1, A7) are selected at first; clicking another crossing selects that pair, arrows move focus.
  await expect(page.locator('[data-testid="crossing"][data-pair="0-6"]').first()).toHaveAttribute('aria-pressed', 'true')
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

test('compare: a zero cell leaves SAW out with its reason', async ({ page }) => {
  await page.goto('/app?example=keshavarz-2015-ten-alternatives&stage=data')
  await page.locator('#wb-cell-0-0').click()
  await page.keyboard.type('0')
  await page.keyboard.press('Enter')
  await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Compare' }).click()
  const saw = page.locator('[data-testid="rank-column"][data-method="saw"]')
  await expect(saw).toContainText('This method divides by the values or takes their logarithm, so each must be above 0.')
  await expect(saw.locator('[data-rank]')).toHaveCount(0)
  await expect(page.getByTestId('compare-summary')).toContainText('3 of 4 methods ranked')
})

test('compare: Turkish', async ({ page }) => {
  await page.goto('/app?example=keshavarz-2015-ten-alternatives&stage=compare')
  await page.getByRole('radio', { name: /^TR/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Karşılaştır' })).toBeVisible()
  await expect(page.getByTestId('why-panel').getByRole('heading', { name: 'A1 ya da A7?' })).toBeVisible()
  await expect(page.getByTestId('compare-summary')).toContainText('Uyum (Kendall W): 0,97')
})

test('compare: no sideways scroll at 390 px with 47 items', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app?example=keshavarz-2015-inventory&stage=compare')
  await expect(page.getByTestId('rank-column').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('compare: no VIKOR note when its compromise set has one member', async ({ page }) => {
  await page.goto('/app?example=podvezko-2011-baltic&stage=compare')
  await expect(page.getByTestId('rank-column')).toHaveCount(4)
  await expect(page.getByTestId('vikor-note')).toHaveCount(0)
})
