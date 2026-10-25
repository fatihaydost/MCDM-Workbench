import { expect, test, type Page } from '@playwright/test'

/**
 * The moving path (docs/design/MOTION.md). Every other spec runs with reduced motion, where all durations are 0; these
 * run with motion on and check that each animation happens, ends where the reduced-motion render is, and leaves
 * nothing behind.
 */
test.use({ reducedMotion: 'no-preference' })

/** Running CSS transitions and animations inside `root` (whole document by default). */
const running = (page: Page, selector?: string) =>
  page.evaluate((sel) => {
    const root = sel ? document.querySelector(sel) : document
    return (root?.getAnimations({ subtree: true }) ?? []).filter((a) => a.playState === 'running').length
  }, selector)

/** Waits until every animation in the document has finished. */
const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))))

/**
 * Starts recording `animationstart` / `transitionrun` names on window.__motion (awaited, so it is in place before the
 * next action). Reading them afterwards does not depend on how long the animation lasted or how busy the machine is.
 */
const recordMotion = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __motion: string[] }
    w.__motion = []
    document.addEventListener('animationstart', (e) => w.__motion.push(e.animationName), true)
    document.addEventListener('transitionrun', (e) => {
      const t = e.target as Element
      w.__motion.push(`${t.getAttribute('data-tabs-indicator') !== null ? 'indicator' : t.tagName.toLowerCase()}:${e.propertyName}`)
    }, true)
  })
const recorded = (page: Page) => page.evaluate(() => (window as unknown as { __motion: string[] }).__motion)

/** Screen positions of the TOPSIS points on the method page. */
const topsisPoints = (page: Page) =>
  page.locator('#idea svg [role="radio"]').evaluateAll((els) =>
    els.map((el) => {
      const r = el.querySelector('circle')!.getBoundingClientRect()
      return { x: Math.round((r.x + r.width / 2) * 10) / 10, y: Math.round((r.y + r.height / 2) * 10) / 10 }
    }),
  )

test('floating layers animate out and then leave the DOM', async ({ page }) => {
  await page.goto('/methods/topsis')
  const trigger = page.getByRole('button', { name: /^Theme/ })
  await trigger.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await settled(page)
  await recordMotion(page)
  await page.keyboard.press('Escape')
  // The exit animation keeps it for a moment (Radix waits for animationend), then it is gone and focus is back.
  await expect(menu).toHaveCount(0)
  expect(await recorded(page)).toContain('kds-float-out')
  await expect(trigger).toBeFocused()
})

test.describe('bottom sheet', () => {
  test.use({ viewport: { width: 1024, height: 900 } })

  test('slides in, slides out and leaves the DOM', async ({ page }) => {
    await page.goto('/app?example=krishnan-2021-smartphones&stage=weights')
    const open = page.getByRole('button', { name: 'Show explanation' })
    await expect(open).toBeVisible()
    await recordMotion(page)
    await open.click()
    const sheet = page.getByRole('dialog', { name: 'Explanation' })
    await expect(sheet).toBeVisible()
    await settled(page)
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(page.locator('.bg-overlay')).toHaveCount(0)
    expect(await recorded(page)).toEqual(expect.arrayContaining(['kds-fade-in', 'kds-sheet-in', 'kds-fade-out', 'kds-sheet-out']))
  })
})

test('TOPSIS view switch moves the points and ends where the reduced-motion render puts them', async ({ page, browser }) => {
  await page.goto('/methods/topsis')
  await expect(page.locator('#idea svg [role="radio"]')).toHaveCount(3)
  await settled(page)
  await recordMotion(page)
  await page.locator('#idea').getByRole('radio', { name: 'Two criteria' }).click()
  await settled(page)
  // The three dots slid (object constancy): one transform transition each on the point groups.
  expect((await recorded(page)).filter((m) => m === 'g:transform').length).toBeGreaterThanOrEqual(3)
  const animated = await topsisPoints(page)

  const reduced = await browser.newPage({ reducedMotion: 'reduce' })
  await reduced.goto('/methods/topsis')
  await expect(reduced.locator('#idea svg [role="radio"]')).toHaveCount(3)
  await reduced.locator('#idea').getByRole('radio', { name: 'Two criteria' }).click()
  expect(await topsisPoints(reduced)).toEqual(animated)
  await reduced.close()

  // The hidden view is out of sight and out of the accessibility tree once the crossfade is over.
  const layers = await page
    .locator('#idea svg g[data-view]')
    .evaluateAll((els) => els.map((el) => `${el.getAttribute('data-view')} ${getComputedStyle(el).visibility} ${getComputedStyle(el).opacity}`))
  expect(new Set(layers)).toEqual(new Set(['distances hidden 0', 'criteria visible 1']))
})

for (const width of [390, 1440]) {
  test(`the TOPSIS picture keeps its height when the view changes (${width} px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/methods/topsis')
    const svg = page.locator('#idea svg')
    await expect(page.locator('#idea svg [role="radio"]')).toHaveCount(3)
    const before = await svg.getAttribute('height')
    await page.locator('#idea').getByRole('radio', { name: 'Two criteria' }).click()
    // Same height right after the click: the leaving view never paints over the readout below.
    expect(await svg.getAttribute('height')).toBe(before)
    await settled(page)
    expect(await svg.getAttribute('height')).toBe(before)
  })
}

test('switching views turns the D+ and D- lines into the selected point\'s coordinates', async ({ page }) => {
  await page.goto('/methods/topsis')
  await expect(page.locator('#idea svg [role="radio"]')).toHaveCount(3)
  const idea = page.locator('#idea')
  await idea.getByRole('radio', { name: 'Two criteria' }).click()
  await settled(page)
  await recordMotion(page)
  await idea.getByRole('radio', { name: 'Distances' }).click()
  await settled(page)
  // The same two lines moved (no crossfade): each one's d transitioned.
  expect((await recorded(page)).filter((m) => m === 'path:d').length).toBe(2)
  const geo = await page.locator('#idea svg').evaluate((svg) => {
    const ends = (el: Element | null) => {
      // The computed d, e.g. path("M 99 140 L 16 140"): what is painted, also mid-transition.
      const n = (getComputedStyle(el!).getPropertyValue('d').match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number)
      return { from: { x: n[0]!, y: n[1]! }, to: { x: n[2]!, y: n[3]! } }
    }
    const axis = (name: string) => (svg.querySelector(`[data-axis="${name}"]`)!.getAttribute('d')!.match(/-?[\d.]+/g) ?? []).map(Number)
    const dot = svg.querySelector('[role="radio"][aria-checked="true"] circle:last-of-type')!.getBoundingClientRect()
    const box = svg.getBoundingClientRect()
    return {
      dot: { x: dot.x + dot.width / 2 - box.x, y: dot.y + dot.height / 2 - box.y },
      plus: ends(svg.querySelector('[data-dist="plus"]')),
      minus: ends(svg.querySelector('[data-dist="minus"]')),
      yAxisX: axis('d-minus')[0]!, // M left bottom V top
      xAxisY: axis('d-plus')[1]!, // M left bottom H right
    }
  })
  const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(0.5)
  // D+ runs from the dot level to the D- (vertical) axis; D- from the dot down to the D+ (horizontal) axis.
  near(geo.plus.from.x, geo.dot.x)
  near(geo.plus.from.y, geo.dot.y)
  near(geo.plus.to.x, geo.yAxisX)
  near(geo.plus.to.y, geo.dot.y)
  near(geo.minus.from.x, geo.dot.x)
  near(geo.minus.to.x, geo.dot.x)
  near(geo.minus.to.y, geo.xAxisY)
})

test('the first render and a resize do not animate the TOPSIS picture', async ({ page }) => {
  await page.goto('/methods/topsis')
  await expect(page.locator('#idea svg [role="radio"]')).toHaveCount(3)
  expect(await running(page, '#idea svg')).toBe(0)
  const before = await page.locator('#idea svg').getAttribute('width')
  await page.setViewportSize({ width: 520, height: 900 })
  await expect.poll(() => page.locator('#idea svg').getAttribute('width')).not.toBe(before)
  expect(await running(page, '#idea svg')).toBe(0)
})

test('the tab indicator slides and ends under the selected tab', async ({ page }) => {
  await page.goto('/methods/topsis')
  const list = page.locator('#details [role="tablist"]')
  await expect(list).toHaveAttribute('data-indicator', '')
  const bar = list.locator('[data-tabs-indicator]')
  const under = async (name: string) => {
    const tab = await list.getByRole('tab', { name }).boundingBox()
    const b = await bar.boundingBox()
    return { dx: Math.abs(b!.x - tab!.x), dw: Math.abs(b!.width - tab!.width), dy: Math.abs(b!.y + b!.height - (tab!.y + tab!.height)) }
  }
  // Placed at once on the first render, under the default tab.
  expect(await running(page, '#details [role="tablist"]')).toBe(0)
  for (const d of Object.values(await under('Use'))) expect(d).toBeLessThan(0.5)

  await recordMotion(page)
  await list.getByRole('tab', { name: 'Pitfalls' }).click()
  await settled(page)
  expect((await recorded(page)).filter((m) => m.startsWith('indicator:'))).toEqual(['indicator:transform'])
  for (const d of Object.values(await under('Pitfalls'))) expect(d).toBeLessThan(0.5)
  // The bar draws the underline now; the trigger's own border (the no-JS fallback) is off.
  expect(await list.getByRole('tab', { name: 'Pitfalls' }).evaluate((el) => getComputedStyle(el).borderBottomColor)).toBe('rgba(0, 0, 0, 0)')
})

test('a theme change lands in one frame, without transitions', async ({ page }) => {
  await page.goto('/methods/topsis') // light system scheme
  await page.getByRole('button', { name: /^Theme/ }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await settled(page)
  const result = page.evaluate(
    () =>
      new Promise<{ during: number; switching: boolean; after: boolean }>((resolve) => {
        const item = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].find((el) => el.textContent?.includes('Dark'))!
        item.click()
        const switching = document.documentElement.hasAttribute('data-theme-switching')
        // Force the style update of the new theme now: controls with transition-colors would start transitions here.
        void document.documentElement.offsetHeight
        const count = () => document.getAnimations().filter((a) => a instanceof CSSTransition).length
        const during = count()
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve({ during: during + count(), switching, after: document.documentElement.hasAttribute('data-theme-switching') })),
          ),
        )
      }),
  )
  expect(await result).toEqual({ during: 0, switching: true, after: false })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('a disclosure grows open where the browser can animate to auto', async ({ page }) => {
  await page.goto('/methods/topsis')
  // Open one step first so KaTeX is loaded and the measured step does not change size on its own.
  await page.locator('#algorithm details').first().locator('summary').click()
  await expect(page.locator('#algorithm .katex').first()).toBeVisible()
  await settled(page)
  // ::details-content transitions are not listed by getAnimations(), so measure the height. Slowed tenfold (CDP) so a
  // busy machine still catches it half open.
  const step = page.locator('#algorithm details').nth(1)
  const closed = (await step.boundingBox())!.height
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 })
  await step.locator('summary').click()
  await expect.poll(async () => (await step.boundingBox())!.height).toBeGreaterThan(closed)
  const during = (await step.boundingBox())!.height
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })
  await expect.poll(async () => (await step.boundingBox())!.height).toBeGreaterThan(during)
  await settled(page)
  const open = (await step.boundingBox())!.height
  expect(during).toBeLessThan(open)
})

test('a new page starts at the top', async ({ page }) => {
  await page.goto('/methods/topsis')
  await page.locator('#combined a[href$="/methods/critic"]').first().scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, 400))
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
  await page.locator('#combined a[href$="/methods/critic"]').first().click()
  await expect(page).toHaveURL(/\/methods\/critic$/)
  await expect(page.getByRole('heading', { level: 1, name: 'CRITIC' })).toBeVisible()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

// ---------- Robustness: the live ranking (FLIP) and the Monte Carlo heat map ----------

const krishnan = async () => {
  const { critic, topsis } = await import('../../src/core')
  const { reweight } = await import('../../src/core/robustness')
  const { largestWeight } = await import('../../src/app/workbench/robustness/helpers')
  const { rankOrder } = await import('../../src/app/ranking/order')
  const { getExample } = await import('../../src/data/examples')
  const ex = getExample('krishnan-2021-smartphones')!
  const problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const w = critic.compute(problem, {}).weights
  const k = largestWeight(w)
  return { k, base: w[k]!, order: (wk: number) => rankOrder(topsis.compute(problem, reweight(w, k, wk), {}).ranking).map((i) => ex.alternatives[i]!) }
}

/** Records Web Animations started on live-table rows and every row that took the "moved" tint. */
const recordRows = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __slides: string[]; __tinted: string[] }
    w.__slides = []
    w.__tinted = []
    const animate = Element.prototype.animate
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
      if (this.matches('[data-testid="live-row"]')) w.__slides.push(this.querySelector('th')?.textContent ?? '')
      return animate.apply(this, args)
    }
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as Element
        if (el.matches('[data-testid="live-row"][data-moved]')) w.__tinted.push(el.querySelector('th')?.textContent ?? '')
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-moved'] })
  })
const rowLog = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __slides: string[]; __tinted: string[] }
    return { slides: w.__slides, tinted: w.__tinted }
  })
const liveOrder = (page: Page) => page.getByTestId('live-row').locator('th').allInnerTexts()

test('robustness: a new order slides the rows (FLIP), tints them, and ends in the core\'s order', async ({ page }) => {
  const { order } = await krishnan()
  await recordRows(page)
  await page.goto('/app?example=krishnan-2021-smartphones&stage=robustness')
  await expect(page.getByTestId('live-row')).toHaveCount(5)
  // The sweep comes from a worker: wait for its cursor.
  await expect(page.locator('svg[data-sweep] [data-cursor]')).toHaveCount(1)
  // The stage opens without motion: nothing runs on its first render.
  await settled(page)
  expect((await rowLog(page)).slides).toEqual([])
  await page.getByRole('slider').focus()
  await page.keyboard.press('End')
  await expect.poll(async () => (await rowLog(page)).slides.length).toBeGreaterThan(0)
  expect((await rowLog(page)).tinted.length).toBeGreaterThan(0)
  // The cursor follows at once: no transition on it.
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('svg[data-sweep] [data-cursor]')!).transitionDuration)).toBe('0s')
  await settled(page)
  expect(await liveOrder(page)).toEqual(order(1))
  // Every row back in its own place: no transform left behind.
  const offsets = await page.getByTestId('live-row').evaluateAll((els) => els.map((el) => getComputedStyle(el).transform))
  expect(new Set(offsets)).toEqual(new Set(['none']))
})

test('robustness: a held-down arrow key re-ranks without sliding (high-frequency keyboard), the tint stays', async ({ page }) => {
  const { base, order } = await krishnan()
  await recordRows(page)
  await page.goto('/app?example=krishnan-2021-smartphones&stage=robustness')
  await expect(page.getByTestId('live-row')).toHaveCount(5)
  await page.getByRole('slider').focus()
  // One keydown, then repeats (Playwright sets KeyboardEvent.repeat for a key pressed again without release).
  for (let n = 0; n < 40; n++) await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  const wk = Number(await page.getByTestId('sweep-weight').innerText())
  expect(order(wk)).not.toEqual(order(base))
  await expect.poll(async () => (await rowLog(page)).tinted.length).toBeGreaterThan(0)
  expect((await rowLog(page)).slides).toEqual([])
  expect(await liveOrder(page)).toEqual(order(wk))
})

test.describe('robustness with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('rows jump to their new place without sliding, and still take the tint', async ({ page }) => {
    const { order } = await krishnan()
    await recordRows(page)
    await page.goto('/app?example=krishnan-2021-smartphones&stage=robustness')
    await expect(page.getByTestId('live-row')).toHaveCount(5)
    await page.getByRole('slider').focus()
    await page.keyboard.press('End')
    await expect.poll(async () => (await rowLog(page)).tinted.length).toBeGreaterThan(0)
    expect((await rowLog(page)).slides).toEqual([])
    expect(await liveOrder(page)).toEqual(order(1))
  })
})

test('robustness: a new κ changes the heat map\'s colours and never moves its cells', async ({ page }) => {
  await page.goto('/app?example=krishnan-2021-smartphones&stage=robustness')
  const result = page.getByTestId('mc-result')
  await expect(result).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 })
  await settled(page)
  await recordMotion(page)
  await page.getByRole('radio', { name: 'Uniform' }).click()
  await expect(result).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 })
  await settled(page)
  const heat = (await recorded(page)).filter((m) => m.startsWith('rect:'))
  expect(heat.length).toBeGreaterThan(0)
  expect(new Set(heat)).toEqual(new Set(['rect:fill']))
})

// ---------- Landing hero: the weight of price re-ranks the published example ----------

const heroOrder = async () => {
  const { critic, topsis } = await import('../../src/core')
  const { reweight } = await import('../../src/core/robustness')
  const { rankOrder } = await import('../../src/app/ranking/order')
  const { getExample } = await import('../../src/data/examples')
  const ex = getExample('krishnan-2021-smartphones')!
  const problem = { alternatives: ex.alternatives, criteria: ex.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: ex.matrix }
  const w = critic.compute(problem, {}).weights
  const at = (weights: number[]) => rankOrder(topsis.compute(problem, weights, {}).ranking).map((i) => ex.alternatives[i]!)
  // Price is the first criterion.
  return { base: at(w), order: (wp: number) => at(reweight(w, 0, wp)) }
}

const hero = (page: Page) => page.locator('section[aria-labelledby="hero-result-title"]')

test('landing hero: the price slider slides the rows into the core\'s order, and reset brings back CRITIC', async ({ page }) => {
  const { base, order } = await heroOrder()
  await recordRows(page)
  await page.goto('/')
  await expect(page.getByTestId('live-row')).toHaveCount(5)
  await settled(page)
  // The page opens without motion, at the CRITIC weights.
  expect((await rowLog(page)).slides).toEqual([])
  expect(await liveOrder(page)).toEqual(base)
  await expect(hero(page).getByRole('button', { name: 'Back to CRITIC' })).toHaveCount(0)

  const slider = hero(page).getByRole('slider', { name: 'Weight of price' })
  await slider.focus()
  await page.keyboard.press('End')
  await expect(page.getByTestId('hero-price-weight')).toHaveText('1.0000')
  await expect.poll(async () => (await rowLog(page)).slides.length).toBeGreaterThan(0)
  expect((await rowLog(page)).tinted.length).toBeGreaterThan(0)
  await settled(page)
  expect(await liveOrder(page)).toEqual(order(1))
  // The cheapest phone wins when price is all that counts; first place is announced.
  expect((await liveOrder(page))[0]).toBe('D')
  await expect(hero(page).locator('[aria-live="polite"]')).toHaveText('D is first at this weight.')
  const offsets = await page.getByTestId('live-row').evaluateAll((els) => els.map((el) => getComputedStyle(el).transform))
  expect(new Set(offsets)).toEqual(new Set(['none']))

  await page.keyboard.press('Home')
  await settled(page)
  expect((await liveOrder(page))[0]).toBe('C')
  expect(await liveOrder(page)).toEqual(order(0))

  // Reset from the keyboard: the button goes away, focus returns to the slider, first place is said again.
  await hero(page).getByRole('button', { name: 'Back to CRITIC' }).focus()
  await page.keyboard.press('Enter')
  await settled(page)
  expect(await liveOrder(page)).toEqual(base)
  await expect(slider).toBeFocused()
  await expect(hero(page).locator('[aria-live="polite"]')).toHaveText(`${base[0]} is first at this weight.`)
  await expect(hero(page).getByText('Drag it to re-rank')).toBeVisible()
  await expect(page.getByTestId('hero-price-weight')).toHaveText('0.1872')
})

test('landing hero: the first arrow key from the CRITIC weight lands on the 0.01 grid', async ({ page }) => {
  const { order } = await heroOrder()
  await page.goto('/')
  const slider = hero(page).getByRole('slider', { name: 'Weight of price' })
  await slider.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('hero-price-weight')).toHaveText('0.1800')
  await expect(slider).toHaveAttribute('aria-valuetext', '0.1800')
  await settled(page)
  expect(await liveOrder(page)).toEqual(order(0.18))
})

test('landing hero: a held-down arrow key re-ranks without sliding rows or moving bars', async ({ page }) => {
  const { order } = await heroOrder()
  await recordRows(page)
  await page.goto('/')
  await expect(page.getByTestId('live-row')).toHaveCount(5)
  await settled(page)
  await recordMotion(page)
  await hero(page).getByRole('slider', { name: 'Weight of price' }).focus()
  for (let n = 0; n < 30; n++) await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  const wp = Number(await page.getByTestId('hero-price-weight').innerText())
  expect(wp).toBeGreaterThan(0.4)
  expect((await rowLog(page)).slides).toEqual([])
  // Only the first keydown is not a repeat: at most one step of bar transitions, none after it.
  const bars = (await recorded(page)).filter((m) => m.startsWith('rect:') || m.startsWith('text:'))
  expect(bars.length).toBeLessThanOrEqual(10)
  expect(await running(page, 'section[aria-labelledby="hero-result-title"] svg')).toBe(0)
  expect(await liveOrder(page)).toEqual(order(wp))
})

test.describe('landing hero with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('rows jump to their new place without sliding, and still take the tint', async ({ page }) => {
    const { order } = await heroOrder()
    await recordRows(page)
    await page.goto('/')
    await expect(page.getByTestId('live-row')).toHaveCount(5)
    await hero(page).getByRole('slider', { name: 'Weight of price' }).focus()
    await page.keyboard.press('End')
    await expect.poll(async () => (await rowLog(page)).tinted.length).toBeGreaterThan(0)
    expect((await rowLog(page)).slides).toEqual([])
    expect(await liveOrder(page)).toEqual(order(1))
  })
})
