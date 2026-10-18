import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** The live AHP card on /dev/ui (4 criteria, 6 questions). */
const ahp = (page: Page) => page.locator('[data-card="ahp"]').getByRole('group', { name: 'Which matters more?' })

async function open(page: Page) {
  await page.goto('/dev/ui')
  await expect(ahp(page)).toBeVisible()
}

test.describe('pairwise card at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('AHP card at 390 px: two taps answer, = answers in one, the next card takes focus', async ({ page }) => {
    await open(page)
    const card = ahp(page)
    await expect(card).toHaveAccessibleDescription('1 / 6')
    await card.getByRole('radio', { name: 'Comfort', exact: true }).click()
    await card.getByRole('radio', { name: '5, strongly more important' }).click()
    await expect(card).toHaveAccessibleDescription('2 / 6')
    // Card 2 is Comfort vs Safety; its side row takes focus (Radix moves focus after the render, so wait).
    await expect(card.getByRole('radio', { name: 'Comfort', exact: true })).toBeFocused()
    await expect(card.getByRole('radio', { name: 'Comfort', exact: true })).toHaveAttribute('aria-checked', 'false')

    await card.getByRole('radio', { name: 'Equally important', exact: true }).click()
    await expect(card).toHaveAccessibleDescription('3 / 6')

    await card.getByRole('button', { name: 'Back' }).click()
    await expect(card).toContainText('Comfort = Safety')
    await card.getByRole('button', { name: 'Back' }).click()
    await expect(card).toHaveAccessibleDescription('1 / 6')
    await expect(card).toContainText('Comfort ▸ 5 · strongly')
  })

  test('every value cell is at least 56 px and the side row 48 px at 390 px', async ({ page }) => {
    await open(page)
    const card = ahp(page)
    const sides = card.getByRole('radiogroup', { name: 'Which matters more' }).getByRole('radio')
    await expect(sides).toHaveCount(3)
    for (const box of await Promise.all((await sides.all()).map((r) => r.boundingBox()))) {
      expect(box!.height).toBeCloseTo(48, 0)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
    await card.getByRole('radio', { name: 'Price', exact: true }).click()
    const cells = card.getByRole('radiogroup', { name: 'By how much' }).getByRole('radio')
    await expect(cells).toHaveCount(9)
    for (const box of await Promise.all((await cells.all()).map((r) => r.boundingBox()))) {
      expect(box!.height).toBeGreaterThanOrEqual(56)
      expect(box!.width).toBeGreaterThanOrEqual(56)
    }
    const page390 = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(page390).toBeLessThanOrEqual(390)
  })
})

test('AHP card at 1440 px: arrows pick the side, digits set the value, Backspace goes back', async ({ page }) => {
  await open(page)
  const card = ahp(page)
  await card.getByRole('radio', { name: 'Price', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(card.getByRole('radio', { name: 'Comfort', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(card.getByRole('radio', { name: 'Comfort', exact: true })).toBeFocused()
  await page.keyboard.press('7')
  await expect(card).toHaveAccessibleDescription('2 / 6')
  await expect(card.getByRole('radio', { name: 'Comfort', exact: true })).toBeFocused()

  await page.keyboard.press('Backspace')
  await expect(card).toHaveAccessibleDescription('1 / 6')
  await expect(card).toContainText('Comfort ▸ 7 · very strongly')
  await expect(card.getByRole('radio', { name: 'Comfort', exact: true })).toBeFocused()

  // Digits do nothing before a side is chosen on an unanswered card.
  await card.getByRole('radio', { name: 'Price', exact: true }).focus()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('3')
  await expect(card).toHaveAccessibleDescription('2 / 6')
  await expect(page.locator('[data-card="ahp"]')).toContainText('Price ▸ 3')
  await page.keyboard.press('5')
  await expect(card).toHaveAccessibleDescription('2 / 6')
})

test('BWM card: values above the cap are disabled and say why', async ({ page }) => {
  await open(page)
  const card = page.locator('[data-card="bwm"]').getByRole('group', { name: /^How much more/ })
  await expect(card).toContainText('How much more important is Safety than Price?')
  await expect(card.getByRole('radio', { name: /^3,/ })).toBeEnabled()
  for (let v = 4; v <= 9; v++) {
    const cell = card.getByRole('radio', { name: new RegExp(`^${v},`) })
    await expect(cell).toBeDisabled()
    await expect(cell).toHaveAttribute('title', 'At most 3')
  }
  await card.getByRole('radio', { name: /^3,/ }).click()
  await expect(card).toContainText('Safety ▸ 3 · moderately')
})

test('flagged card: Use 3 calls onAnswer(3)', async ({ page }) => {
  await open(page)
  const card = page.locator('[data-card="flagged"]').getByRole('group', { name: 'Which matters more?' })
  await expect(card).toContainText('Price ▸ 7 · very strongly')
  await expect(card).toContainText('Your other answers suggest Price ▸ 3')
  await card.getByRole('button', { name: 'Use 3' }).click()
  await expect(card).toContainText('Price ▸ 3 · moderately')
  await expect(card.getByRole('button', { name: 'Use 3' })).toHaveCount(0)
})

test('axe finds no violations on the pairwise section in each state', async ({ page }) => {
  await open(page)
  const scan = async (state: string) => {
    const { violations } = await new AxeBuilder({ page }).include('[data-dev="pairwise"]').analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`), state).toEqual([])
  }
  await scan('unanswered and flagged')
  const card = ahp(page)
  await card.getByRole('radio', { name: 'Comfort', exact: true }).click()
  await scan('side chosen')
  await card.getByRole('radio', { name: '5, strongly more important' }).click()
  await card.getByRole('button', { name: 'Back' }).click()
  await expect(card).toContainText('Comfort ▸ 5')
  await scan('answered')
  await page.emulateMedia({ colorScheme: 'dark' })
  await scan('dark')
})
