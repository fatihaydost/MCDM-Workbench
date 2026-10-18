import { expect, test, type Page } from '@playwright/test'

/**
 * "Step through" on the method pages (IdeaSteps): the picture transforms step by step, the last step is the full
 * picture, and the controls work by mouse and keyboard, with and without motion.
 */

/** Everything drawn in the idea picture: tag, visibility, opacity, box, fill and CSS d of each SVG element. */
const drawing = (page: Page) =>
  page
    .locator('#idea figure')
    .first()
    .evaluate((figure) => {
      const svg = figure.querySelector('svg')!
      const origin = svg.getBoundingClientRect()
      const r = (v: number) => Math.round(v * 10) / 10
      return [...svg.querySelectorAll('*')]
        .filter((el) => !el.closest('defs') && el.tagName !== 'title')
        .map((el) => {
          const cs = getComputedStyle(el)
          const b = el.getBoundingClientRect()
          const box = [b.x - origin.x, b.y - origin.y, b.width, b.height].map(r).join(',')
          return `${el.tagName} ${cs.visibility} ${cs.opacity} ${box} ${cs.fill} ${cs.stroke} ${cs.fontWeight} ${cs.getPropertyValue('d')} ${el.textContent?.trim().slice(0, 20) ?? ''}`
        })
    })

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))))

const counter = (page: Page) => page.locator('#idea [role="group"]').getByText(/^\d \/ \d$/)
const sentence = (page: Page) => page.locator('#idea p[aria-live="polite"]')

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test.describe(`motion ${reducedMotion}`, () => {
    test.use({ reducedMotion })

    test('TOPSIS: five steps, the last one is the full picture, Finish keeps it', async ({ page }) => {
      await page.goto('/methods/topsis')
      await expect(page.locator('#idea svg [role="radio"]')).toHaveCount(3)
      await settled(page)
      const full = await drawing(page)

      await page.getByRole('button', { name: 'Step through the idea' }).click()
      await expect(counter(page)).toHaveText('1 / 5')
      await expect(sentence(page)).toHaveText('Each alternative is a point: its weighted normalized values on two criteria.')
      // Step 1 is the criterion plane without A+, A- or the distance lines.
      await expect(page.locator('#idea').getByRole('radio', { name: 'Two criteria' })).toHaveAttribute('aria-checked', 'true')
      await settled(page)
      expect(await page.locator('#idea [data-dist="plus"]').evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden')

      for (const n of [2, 3, 4, 5]) {
        await page.getByRole('button', { name: 'Next' }).click()
        await expect(counter(page)).toHaveText(`${n} / 5`)
      }
      await expect(sentence(page)).toHaveText('Relative closeness C = D− / (D+ + D−) is the same along each ray; top left is best.')
      await settled(page)
      expect(await drawing(page)).toEqual(full)

      await page.getByRole('button', { name: 'Finish' }).click()
      await expect(page.getByRole('button', { name: 'Step through the idea' })).toBeFocused()
      await settled(page)
      expect(await drawing(page)).toEqual(full)
    })

    test('CRITIC: four steps, information then weight, the last one is the full picture', async ({ page }) => {
      await page.goto('/methods/critic')
      await expect(page.locator('#idea svg')).toBeVisible()
      await settled(page)
      const full = await drawing(page)

      await page.getByRole('button', { name: 'Step through the idea' }).click()
      await expect(counter(page)).toHaveText('1 / 4')
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(counter(page)).toHaveText('3 / 4')
      // Information C = σ × Σ(1 − ρ): Krishnan et al. (2021), Thickness 0.4161 × 5.8868.
      await expect(page.locator('#idea svg').getByText('Information content C')).toBeVisible()
      await expect(page.locator('#idea svg').getByText('2.4494')).toBeAttached()
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page.locator('#idea svg').getByText('0.2599')).toBeAttached()
      await settled(page)
      expect(await drawing(page)).toEqual(full)
    })

    for (const [method, count] of [['entropy', 4], ['saw', 3], ['merec', 4], ['sd', 3], ['cocoso', 4], ['mabac', 3], ['edas', 3], ['copras', 4], ['marcos', 3]] as const) {
      test(`${method}: ${count} steps, the last one is the full picture`, async ({ page }) => {
        await page.goto(`/methods/${method}`)
        await expect(page.locator('#idea figure').first()).toBeVisible()
        await settled(page)
        const full = await drawing(page)

        await page.getByRole('button', { name: 'Step through the idea' }).click()
        await expect(counter(page)).toHaveText(`1 / ${count}`)
        for (let k = 2; k <= count; k++) {
          await page.getByRole('button', { name: 'Next' }).click()
          await expect(counter(page)).toHaveText(`${k} / ${count}`)
        }
        await settled(page)
        expect(await drawing(page)).toEqual(full)
      })
    }

    test('keyboard: arrows move, Escape closes and gives the focus back', async ({ page }) => {
      await page.goto('/methods/topsis')
      await expect(page.locator('#idea svg [role="radio"]')).toHaveCount(3)
      await page.getByRole('button', { name: 'Step through the idea' }).click()
      await expect(page.getByRole('button', { name: 'Next' })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      await expect(counter(page)).toHaveText('3 / 5')
      await page.keyboard.press('ArrowLeft')
      await expect(counter(page)).toHaveText('2 / 5')
      // Back to the first step keeps the focus on Back, which is now aria-disabled (a disabled button would drop it).
      await page.getByRole('button', { name: 'Back' }).click()
      await expect(counter(page)).toHaveText('1 / 5')
      await expect(page.getByRole('button', { name: 'Back' })).toHaveAttribute('aria-disabled', 'true')
      await expect(page.getByRole('button', { name: 'Back' })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(page.locator('#idea [role="group"]')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Step through the idea' })).toBeFocused()
    })
  })
}

test('while stepping, the points and the view switch are inert', async ({ page }) => {
  await page.goto('/methods/topsis')
  await expect(page.locator('#idea svg [role="radio"]')).toHaveCount(3)
  await page.getByRole('button', { name: 'Step through the idea' }).click()
  for (let k = 0; k < 2; k++) await page.getByRole('button', { name: 'Next' }).click()
  const a2 = page.locator('#idea svg [role="radio"]').nth(1)
  await a2.click({ force: true })
  await expect(a2).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('#idea').getByRole('radio', { name: 'Distances' })).toBeDisabled()
  // Closing gives both back.
  await page.getByRole('button', { name: 'Close the steps' }).click()
  await a2.click()
  await expect(a2).toHaveAttribute('aria-checked', 'true')
})

test.describe('pace', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('nothing moves before the reader asks; a step moves at the explain pace', async ({ page }) => {
    await page.goto('/methods/topsis')
    await expect(page.locator('#idea svg [role="radio"]')).toHaveCount(3)
    expect(await page.locator('#idea svg').evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0)
    // Record transitions with their duration (awaited setup, read after the action: no timing window).
    await page.evaluate(() => {
      const w = window as unknown as { __runs: string[] }
      w.__runs = []
      document.addEventListener('transitionrun', (e) => {
        const el = e.target as Element
        if (el.closest('#idea svg')) w.__runs.push(`${e.propertyName} ${getComputedStyle(el).transitionDuration}`)
      })
    })
    await page.getByRole('button', { name: 'Step through the idea' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await settled(page)
    const runs = await page.evaluate(() => (window as unknown as { __runs: string[] }).__runs)
    // The dots moved into the criterion plane and A+ / A- faded in, all in 450 ms (--dur-explain).
    expect(runs.filter((r) => r.startsWith('transform')).length).toBeGreaterThanOrEqual(3)
    expect(runs.filter((r) => r.startsWith('opacity')).every((r) => r.split(' ')[1]!.split(',').includes('0.45s'))).toBe(true)
    expect(runs.some((r) => r.startsWith('opacity'))).toBe(true)
  })
})

test('CRITIC: σ is drawn to its true length, in the full picture and at the contrast step', async ({ page }) => {
  await page.goto('/methods/critic')
  await expect(page.locator('#idea svg')).toBeVisible()
  const rulers = () =>
    page.locator('#idea svg [data-sigma]').evaluateAll((els) =>
      els.map((el) => ({ sigma: Number(el.getAttribute('data-sigma')), width: el.getBoundingClientRect().width })),
    )
  const proportional = (rows: { sigma: number; width: number }[]) => {
    // The ruler's end ticks add no width, so width / σ is one scale for every row (Krishnan et al. 2021: 5 criteria,
    // σ 0.4062 .. 0.4394). A ruler cut to the 0..1 strip, as mean ± σ was, breaks this and the order of the σ.
    const k = rows[0]!.width / rows[0]!.sigma
    for (const r of rows) expect(Math.abs(r.width / r.sigma - k) / k).toBeLessThan(0.005)
    const byWidth = [...rows].sort((a, b) => a.width - b.width).map((r) => r.sigma)
    expect(byWidth).toEqual([...byWidth].sort((a, b) => a - b))
  }
  const full = await rulers()
  expect(full).toHaveLength(5)
  proportional(full)
  await page.getByRole('button', { name: 'Step through the idea' }).click()
  proportional(await rulers())
  // The contrast step writes σ next to each ruler.
  await expect(page.locator('#idea svg').getByText('0.4394')).toBeVisible()
})

test('the step sentence never moves the text below it (390 and 1440 px, every method with steps)', async ({ page }) => {
  test.setTimeout(90_000)
  for (const width of [390, 1440])
  for (const [method, count] of [['topsis', 5], ['critic', 4], ['entropy', 4], ['saw', 3], ['merec', 4], ['sd', 3], ['cocoso', 4], ['mabac', 3], ['edas', 3], ['copras', 4], ['marcos', 3]] as const) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/methods/${method}`)
    await expect(page.locator('#idea figure').first()).toBeVisible()
    await page.getByRole('button', { name: 'Step through the idea' }).click()
    const source = page.locator('#idea').getByText(/^Data: /)
    const tops: number[] = []
    for (let k = 0; k < count; k++) {
      if (k > 0) await page.getByRole('button', { name: 'Next' }).click()
      await expect(counter(page)).toHaveText(`${k + 1} / ${count}`)
      tops.push((await source.boundingBox())!.y)
    }
    expect(new Set(tops).size, `${method} ${width}: ${tops.join(', ')}`).toBe(1)
  }
})

test('closing in the middle gives back the reader\'s view; Finish ends on the distance plane', async ({ page }) => {
  await page.goto('/methods/topsis')
  await expect(page.locator('#idea svg [role="radio"]')).toHaveCount(3)
  const view = (name: string) => page.locator('#idea').getByRole('radio', { name })
  await page.getByRole('button', { name: 'Step through the idea' }).click()
  await expect(view('Two criteria')).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(view('Distances')).toHaveAttribute('aria-checked', 'true')
  // From the criterion plane: close keeps it, Finish (the last step is the distance plane) keeps the distance plane.
  await view('Two criteria').click()
  await page.getByRole('button', { name: 'Step through the idea' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(view('Distances')).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Close the steps' }).click()
  await expect(view('Two criteria')).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Step through the idea' }).click()
  for (let k = 0; k < 4; k++) await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(view('Distances')).toHaveAttribute('aria-checked', 'true')
})

test.describe('resize', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('resizing while stepping moves nothing (CRITIC)', async ({ page }) => {
    await page.goto('/methods/critic')
    await expect(page.locator('#idea figure svg')).toBeVisible()
    await page.getByRole('button', { name: 'Step through the idea' }).click()
    for (let k = 0; k < 3; k++) await page.getByRole('button', { name: 'Next' }).click()
    await settled(page)
    const before = await page.locator('#idea figure svg').getAttribute('width')
    await page.setViewportSize({ width: 390, height: 900 })
    await expect.poll(() => page.locator('#idea figure svg').getAttribute('width')).not.toBe(before)
    expect(await page.locator('#idea figure svg').evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0)
  })
})
