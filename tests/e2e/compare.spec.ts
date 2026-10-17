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
