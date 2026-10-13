import { expect, test, type Page } from '@playwright/test'

/** The focused element's label and text. */
const focusedLabel = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return el ? `${el.getAttribute('aria-label') ?? ''} ${el.innerText ?? ''}`.trim() : ''
  })

test.describe('explanation bottom sheet below 1280 px', () => {
  test.use({ viewport: { width: 1024, height: 900 } })

  test('is closed by default, traps focus, closes with Escape and returns focus', async ({ page }) => {
    await page.goto('/app?example=krishnan-2021-smartphones&stage=weights')
    await expect(page.getByRole('heading', { level: 1, name: 'Weights' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const toggle = page.getByRole('button', { name: 'Show explanation' })
    await toggle.click()
    const sheet = page.getByRole('dialog', { name: 'Explanation' })
    await expect(sheet).toBeVisible()
    // Focus is inside the sheet and stays there: nothing under the sheet can take it.
    for (let k = 0; k < 12; k++) {
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true)
      await page.keyboard.press('Tab')
    }
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(toggle).toBeFocused()
  })

  test('the stage content under the sheet is not reachable while it is open', async ({ page }) => {
    await page.goto('/app?example=krishnan-2021-smartphones&stage=weights')
    await page.getByRole('button', { name: 'Show explanation' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue to ranking' })).toHaveCount(0) // aria-hidden while modal
  })
})

test.describe('tables that scroll sideways at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the weights table fits: name, direction and w without a sideways scroll', async ({ page }) => {
    for (const example of ['krishnan-2021-smartphones', 'zavadskas-2017-vilnius']) {
      await page.goto(`/app?example=${example}&stage=weights`)
      const table = page.getByRole('table', { name: 'Weights by criterion' })
      await expect(table).toBeVisible()
      await expect(page.getByRole('region', { name: 'Weights by criterion' })).toHaveCount(0)
      const box = await table.boundingBox()
      expect(box!.x + box!.width, example).toBeLessThanOrEqual(390)
      await expect(table.getByRole('columnheader', { name: 'Weight w' })).toBeVisible()
    }
  })

  test('a table that does not fit is a focusable, named region that scrolls with the arrow keys', async ({ page }) => {
    await page.goto('/app?example=krishnan-2021-smartphones&stage=ranking')
    const region = page.locator('[role="region"][tabindex="0"]', { has: page.locator('table') }).first()
    await expect(region).toHaveAttribute('aria-labelledby', /.+/)
    // Reach it with Tab, like a keyboard user.
    await page.locator('#main').focus()
    let reached = false
    for (let k = 0; k < 60 && !reached; k++) {
      await page.keyboard.press('Tab')
      reached = await region.evaluate((el) => el === document.activeElement)
    }
    expect(reached).toBe(true)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  })

  test('a table that fits is not an extra tab stop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/app?example=krishnan-2021-smartphones&stage=weights')
    await expect(page.getByRole('heading', { level: 1, name: 'Weights' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Weights by criterion' })).toHaveCount(0)
  })
})

test('manual weight: fill() replaces the value (no "0.50.45")', async ({ page }) => {
  await page.goto('/app?example=opricovic-tzeng-2004-f&stage=weights')
  const w1 = page.locator('#wb-weight-1')
  await expect(w1).toHaveValue('0.5000')
  await w1.fill('0.45')
  await expect(w1).toHaveValue('0.45')
  await w1.blur()
  await expect(w1).toHaveValue('0.4500')
  await expect(page.getByText('Weights sum to 0.950, they must sum to 1.')).toBeVisible()
})

test('manual weight: Tab into the field and type replaces the value', async ({ page }) => {
  await page.goto('/app?example=opricovic-tzeng-2004-f&stage=weights')
  await page.locator('#wb-weight-0').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('#wb-weight-1')).toBeFocused()
  await page.keyboard.type('0.3')
  await expect(page.locator('#wb-weight-1')).toHaveValue('0.3')
})

const heatmaps = [
  { stage: 'results', figure: 'Correlation between criteria' },
  { stage: 'robustness', figure: 'Share of draws by rank' },
] as const

for (const [theme, heat] of (['light', 'dark'] as const).flatMap((t) => heatmaps.map((h) => [t, h] as const))) {
  test(`heatmap values reach 4.5:1 on their cells (${theme}, ${heat.stage})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('kds.theme', t), theme)
    await page.goto(`/app?example=krishnan-2021-smartphones&stage=${heat.stage}`)
    const figure = page.locator('figure', { hasText: heat.figure })
    await expect(figure.locator('svg text').first()).toBeVisible()
    const ratios = await figure.evaluate((root) => {
      const cv = document.createElement('canvas')
      cv.width = cv.height = 1
      const cx = cv.getContext('2d', { willReadFrequently: true })!
      const rgb = (c: string) => {
        cx.clearRect(0, 0, 1, 1)
        cx.fillStyle = '#000'
        cx.fillStyle = c
        cx.fillRect(0, 0, 1, 1)
        const d = cx.getImageData(0, 0, 1, 1).data
        return [d[0]!, d[1]!, d[2]!] as const
      }
      const lum = ([r, g, b]: readonly number[]) => {
        const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
        return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
      }
      const out: { text: string; ratio: number }[] = []
      for (const t of root.querySelectorAll('svg text')) {
        const rect = t.previousElementSibling
        if (!rect || rect.tagName !== 'rect' || !t.textContent?.trim()) continue
        const a = lum(rgb(getComputedStyle(t).fill))
        const b = lum(rgb(getComputedStyle(rect).fill))
        out.push({ text: t.textContent.trim(), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) })
      }
      return out
    })
    expect(ratios.length).toBe(25)
    for (const r of ratios) expect(r.ratio, `${theme} ${heat.stage} ${r.text}`).toBeGreaterThanOrEqual(4.5)
  })
}

test('the stage heading is inside main, so the skip link lands on it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app?example=krishnan-2021-smartphones&stage=data')
  await expect(page.locator('#main h1')).toHaveText('Data')
  await expect(page.getByRole('navigation', { name: 'Stages' })).toBeVisible()
  // Skip link -> #main: the heading is the first thing read.
  await page.keyboard.press('Tab')
  expect(await focusedLabel(page)).toContain('Skip')
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
})

test('grid: Escape then Tab leaves the grid instead of moving cell by cell', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=data')
  await page.locator('#wb-cell-0-0').click()
  await page.keyboard.press('Tab')
  await expect(page.locator('#wb-cell-0-1')).toBeFocused() // Tab alone still moves like a spreadsheet
  await page.keyboard.press('Escape')
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="grid"]')))).toBe(false)
})

test('grid: one click on a direction selects it and changes nothing', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=data')
  const cell = page.locator('#wb-type-2')
  await expect(cell).toContainText('Benefit')
  await cell.locator('button').click()
  await expect(cell).toBeFocused()
  await expect(cell).toContainText('Benefit')
  await expect(page.getByRole('menu')).toHaveCount(0)
  // Clicking along the direction row (and a Shift+click range) changes nothing either.
  const row = page.locator('[id^="wb-type-"]')
  const before = await row.allInnerTexts()
  for (const j of [0, 1, 3, 4]) await page.locator(`#wb-type-${j} button`).click()
  await page.locator('#wb-type-0 button').click({ modifiers: ['Shift'] })
  expect(await row.allInnerTexts()).toEqual(before)
  await page.goto('/app?stage=ranking')
  await expect(page.getByTestId('best-sentence')).toHaveText('E ranks first (C = 0.6033).')
})

test('grid: the direction menu changes it, says so and can be undone', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=data')
  const cell = page.locator('#wb-type-2')
  // Mouse: the caret opens the menu in one click; the option is the deliberate choice.
  await cell.locator('[data-caret]').click()
  const menu = page.getByRole('menu', { name: 'Pixel density: Direction' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitemradio', { name: '↑ Benefit' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(cell).toBeFocused()
  await expect(cell).toContainText('Benefit')
  // Keyboard: Enter opens, ArrowDown moves, Enter picks.
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(cell).toBeFocused()
  await expect(cell).toContainText('Cost')
  await expect(page.getByText('Pixel density is now Cost. Ctrl+Z undoes it.')).toBeVisible()
  await page.keyboard.press('ControlOrMeta+Z')
  await expect(cell).toContainText('Benefit')
  // Mouse: a second click on the selected cell opens the menu too.
  await cell.locator('button').click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.getByRole('menuitemradio', { name: '↓ Cost' }).click()
  await expect(cell).toContainText('Cost')
})

test('Turkish workbench: table references and the page description are Turkish', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kds.lang', 'tr'))
  await page.goto('/app?example=krishnan-2021-smartphones&stage=data')
  await expect(page.getByText('Örnek veri: Krishnan vd. (2021), Tablo 1 (girdi), Tablo 2 ve 5 (çıktı).')).toBeVisible()
  await expect(page.getByText(/Table \d/)).toHaveCount(0)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Karar matrisini girin/)
})

test('Results is a summary: no second copy of the closeness bars or the TOPSIS picture', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=results')
  await expect(page.getByRole('heading', { level: 1, name: 'Results' })).toBeVisible()
  await expect(page.locator('figure', { hasText: 'Closeness coefficient C' })).toHaveCount(0)
  await expect(page.locator('figure', { hasText: 'Criterion weights' })).toHaveCount(1)
  // The short ranking: rank, alternative, C.
  await expect(page.getByRole('table', { name: 'Ranking' }).locator('thead th')).toHaveCount(3)
})

// The CRITIC example for every stage, and the Entropy, SAW and VIKOR examples where their cards are shown.
const PANEL_RUNS = [
  ['krishnan-2021-smartphones', ['data', 'weights', 'ranking', 'results', 'robustness']],
  ['zavadskas-2017-vilnius', ['weights', 'results']],
  ['podvezko-2011-baltic', ['ranking', 'results']],
  ['keshavarz-2015-ten-alternatives', ['ranking']],
] as const

for (const lang of ['en', 'tr'] as const) {
  for (const [example, stages] of PANEL_RUNS) {
    test(`explanation panel stays at 60 words or fewer per stage (${lang}, ${example})`, async ({ page }) => {
      await page.addInitScript((l) => localStorage.setItem('kds.lang', l), lang)
      for (const stage of stages) {
        await page.goto(`/app?example=${example}&stage=${stage}`)
        const panel = page.locator('aside')
        await expect(panel).toBeVisible()
        // The method note fills in once its card has loaded.
        if (stage === 'weights') await expect(panel.getByRole('link', { name: /method page|yöntem sayfası/i })).toBeVisible()
        const words = (await panel.innerText()).split(/\s+/).filter(Boolean).length
        expect(words, `${lang} ${stage}`).toBeLessThanOrEqual(60)
      }
    })
  }
}

test('explanation panel: a pitfall with its own label is not printed after "Watch out:"', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=ranking')
  const panel = page.locator('aside')
  await expect(panel).toContainText('Rank reversal: the winner changes')
  await expect(panel).not.toContainText('Watch out: Rank reversal')
})
