import { expect, test, type Page } from '@playwright/test'

/** Krishnan et al. (2021) smartphones; best Screen size, worst Mass. Questions in queue order and their answers. */
const ANSWERS = [8, 2, 4, 3, 4, 2, 3]
/** bwm.compute on those answers, to 4 decimals (Price, Screen size, Pixel density, Thickness, Mass). */
const WEIGHTS = ['0.2295', '0.4481', '0.1148', '0.1530', '0.0546']

const card = (page: Page) => page.getByRole('group', { name: /^How many times more important is / })
const pairs = (page: Page) => page.getByRole('navigation', { name: 'All pairs' })
const panel = (page: Page) => page.getByRole('group', { name: 'Weights', exact: true })
const weightCells = (page: Page) => page.locator('table').first().locator('tbody tr td:last-child')

async function open(page: Page) {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=weights')
  await page.getByRole('radio', { name: 'BWM', exact: true }).click()
}

async function anchors(page: Page) {
  await page.getByRole('radiogroup', { name: 'Most important (best)' }).getByRole('radio', { name: 'Screen size' }).click()
  await page.getByRole('radiogroup', { name: 'Least important (worst)' }).getByRole('radio', { name: 'Mass' }).click()
}

/** Taps value v on the current card and waits for the card to move on (or to give way to the summary). */
async function tap(page: Page, v: number, next: string | null) {
  await card(page).locator(`[data-value="${v}"]`).click()
  if (next === null) await expect(card(page)).toHaveCount(0)
  else await expect(card(page)).toHaveAccessibleDescription(next)
}

async function answerAll(page: Page, values = ANSWERS) {
  for (const [k, v] of values.entries()) await tap(page, v, k + 1 < values.length ? `${k + 2} / 7` : null)
}

test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('390 px: pick best and worst, answer 7 questions with one tap each, weights equal the core', async ({ page }) => {
    await open(page)
    await anchors(page)
    await expect(card(page)).toHaveAccessibleDescription('1 / 7')
    await expect(card(page)).toContainText('How many times more important is Screen size than Mass?')
    await tap(page, ANSWERS[0]!, '2 / 7')
    // Mid-flow on a phone the pair list steps aside (it is the summary once complete).
    await expect(pairs(page)).toBeHidden()
    // The next card's first value takes focus (Radix moves it after the render, so wait).
    await expect(card(page).locator('[data-value="1"]')).toBeFocused()
    for (let k = 1; k < ANSWERS.length; k++) await tap(page, ANSWERS[k]!, k + 1 < ANSWERS.length ? `${k + 2} / 7` : null)
    await expect(pairs(page)).toBeVisible()
    await expect(weightCells(page)).toHaveText(WEIGHTS)
  })

  test('All equally important switches to Equal weights', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'All equally important' }).click()
    await expect(page.getByRole('radio', { name: 'Equal weights' })).toHaveAttribute('aria-checked', 'true')
    await expect(weightCells(page)).toHaveText(Array(5).fill('0.2000'))
  })
})

test.describe('1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('1440 px: digits answer, the pair list jumps to any question, Continue reaches the ranking', async ({ page }) => {
    await open(page)
    await anchors(page)
    await card(page).locator('[data-value="1"]').focus()
    for (const [k, v] of ANSWERS.slice(0, 4).entries()) {
      await page.keyboard.press(String(v))
      await expect(card(page)).toHaveAccessibleDescription(`${k + 2} / 7`)
      await expect(card(page).locator('[data-value="1"]')).toBeFocused()
    }
    await pairs(page).getByRole('button', { name: /^Thickness vs Mass/ }).click()
    await expect(card(page)).toHaveAccessibleDescription('7 / 7')
    await tap(page, 3, '5 / 7') // wraps to the first unanswered question
    await tap(page, 4, '6 / 7')
    await tap(page, 2, null)
    await expect(weightCells(page)).toHaveText(WEIGHTS)
    await page.getByRole('button', { name: 'Continue to ranking' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ranking' })).toBeVisible()
  })

  test('lowering a_BW sends the answers above it back to the queue, raising it restores them', async ({ page }) => {
    await open(page)
    await anchors(page)
    await answerAll(page)
    await pairs(page).getByRole('button', { name: /^Screen size vs Mass/ }).click()
    await expect(card(page)).toHaveAccessibleDescription('1 / 7')
    // Pixel density's 4 and Price's 4 are above 3: unanswered (5 / 7), and the card returns to the first of them.
    await tap(page, 3, '3 / 7')
    await expect(pairs(page).getByRole('button').filter({ hasText: '—' })).toHaveCount(2)
    await expect(weightCells(page)).toHaveCount(0)
    await pairs(page).getByRole('button', { name: /^Screen size vs Mass/ }).click()
    await tap(page, 8, null)
    await expect(pairs(page).getByRole('button').filter({ hasText: '—' })).toHaveCount(0)
    await expect(weightCells(page)).toHaveText(WEIGHTS)
  })

  test('an inconsistent answer is flagged with a suggestion; Use 2 clears the warning', async ({ page }) => {
    await open(page)
    await anchors(page)
    await answerAll(page, [8, 2, 4, 3, 4, 8, 3])
    await expect(panel(page)).toContainText('CR 0.43, threshold 0.30')
    await expect(panel(page)).toContainText('Consistency warning: Pixel density')
    await pairs(page).getByRole('button', { name: /^Pixel density vs Mass/ }).click()
    await expect(card(page)).toContainText('Your other answers suggest 2')
    await card(page).getByRole('button', { name: 'Use 2' }).click()
    await expect(card(page)).toHaveCount(0)
    await expect(panel(page)).toContainText('Consistent')
    await expect(panel(page)).not.toContainText('warning')
    await expect(weightCells(page)).toHaveText(WEIGHTS)
  })

  test('switching to Manual and back keeps the answers; a reload resumes at the first unanswered question', async ({ page }) => {
    await open(page)
    await anchors(page)
    for (const [k, v] of ANSWERS.slice(0, 3).entries()) await tap(page, v, `${k + 2} / 7`)
    // Thickness has neither answer yet: left out of the provisional weights, shown as "—".
    await expect(panel(page).getByRole('listitem').filter({ hasText: 'Thickness' })).toContainText('—')
    await expect(panel(page).getByRole('listitem').filter({ hasText: 'Pixel density' })).not.toContainText('—')
    await page.getByRole('radio', { name: 'Manual', exact: true }).click()
    await page.getByRole('radio', { name: 'BWM', exact: true }).click()
    // 3 / 7 answered: four pairs still show "—", the card asks question 4.
    await expect(pairs(page).getByRole('button').filter({ hasText: '—' })).toHaveCount(4)
    await expect(card(page)).toHaveAccessibleDescription('4 / 7')
    await page.reload()
    await expect(card(page)).toHaveAccessibleDescription('4 / 7')
    await expect(pairs(page).getByRole('button').filter({ hasText: '—' })).toHaveCount(4)
  })

  test('the live region speaks only consistency changes', async ({ page }) => {
    await open(page)
    await anchors(page)
    const live = panel(page).locator('[aria-live="polite"]')
    const heard: string[] = []
    const values = [8, 2, 4, 3, 4, 8, 3]
    for (const [k, v] of values.entries()) {
      await tap(page, v, k + 1 < values.length ? `${k + 2} / 7` : null)
      const text = (await live.textContent()) ?? ''
      if (heard.at(-1) !== text) heard.push(text)
    }
    expect(heard).toEqual(['Consistent', 'Consistency warning: Pixel density'])
  })

  test('Robustness offers no recompute for BWM', async ({ page }) => {
    await open(page)
    await anchors(page)
    await answerAll(page)
    await page.locator('nav[aria-label="Stages"]:visible button', { hasText: 'Robustness' }).click()
    await expect(page.getByTestId('removal-row').first()).toBeVisible()
    await expect(page.getByRole('radio', { name: /^Recompute/ })).toHaveCount(0)
  })
})
