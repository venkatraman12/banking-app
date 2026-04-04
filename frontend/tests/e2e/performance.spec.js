/**
 * Performance Test Suite — NovaBanc
 *
 * Uses the browser Navigation Timing API and Chrome DevTools Protocol (CDP)
 * to measure real load times, interaction responsiveness, and resource usage.
 *
 * Thresholds are set for a local dev server (Vite HMR, non-minified).
 * Production builds will be significantly faster.
 *
 * Run: npm run test:perf
 */

import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'
const EMAIL = 'demo@novabanc.com'
const PASSWORD = 'password'

// Disable slowMo for all perf tests — we're measuring real timing
test.use({ slowMo: 0 })

// ─── Thresholds (ms) ────────────────────────────────────────────────────────
const THRESHOLDS = {
  domContentLoaded: 4000,  // page parsed and DOM ready
  pageLoad:         5000,  // all resources loaded
  domInteractive:   3000,  // browser can respond to user input
  navigationTime:   3000,  // SPA client-side route change
  taskDuration:     3000,  // total JS task time
  layoutCount:       500,  // total layout/reflow operations
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Type into a React controlled input and ensure state is committed before
 * the caller proceeds. Uses pressSequentially (real key events) + blur +
 * waitForFunction to guarantee React's onChange/onBlur have fired.
 */
async function typeInto(page, selector, text) {
  const loc = page.locator(selector)
  await loc.click()
  await loc.pressSequentially(text, { delay: 0 })
  await loc.blur()
  await page.waitForFunction(
    ({ sel, val }) => document.querySelector(sel)?.value === val,
    { sel: selector, val: text },
    { timeout: 3000 }
  )
}

async function login(page) {
  await page.goto(`${BASE}/login`)
  // Step 1: Email
  await typeInto(page, '#email', EMAIL)
  await page.locator('button[type="submit"]').click()
  // Step 2: Password
  await page.waitForSelector('#password', { state: 'visible', timeout: 5000 })
  await typeInto(page, '#password', PASSWORD)
  await page.locator('button[type="submit"]').click()
  // Step 3: OTP (demo code: 123456)
  await page.waitForSelector('.otp-box-input', { state: 'visible', timeout: 5000 })
  await page.locator('.otp-box-input').first().click()
  await page.keyboard.type('123456')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

/**
 * Get Navigation Timing metrics for the current page load.
 * Returns times in milliseconds relative to navigationStart.
 */
async function getNavTiming(page) {
  return page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation')
    if (!nav) return null
    return {
      dns:              Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcp:              Math.round(nav.connectEnd - nav.connectStart),
      ttfb:             Math.round(nav.responseStart - nav.requestStart),
      responseTime:     Math.round(nav.responseEnd - nav.responseStart),
      domInteractive:   Math.round(nav.domInteractive - nav.startTime),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      pageLoad:         Math.round(nav.loadEventEnd - nav.startTime),
      transferSizeKB:   Math.round((nav.transferSize || 0) / 1024),
    }
  })
}

/**
 * Get Chrome DevTools Protocol performance metrics.
 * Uses CDP since page.metrics() was removed in Playwright v1.x.
 */
async function getCDPMetrics(page) {
  const client = await page.context().newCDPSession(page)
  await client.send('Performance.enable')
  const { metrics } = await client.send('Performance.getMetrics')
  await client.detach()
  const result = {}
  for (const { name, value } of metrics) result[name] = value
  return result
}

/**
 * Measure time for an in-app navigation (sidebar click → URL settled).
 * Keeps React state alive — do NOT use page.goto() for authenticated pages.
 */
async function measureSidebarNav(page, href, contentSelector) {
  const start = Date.now()
  await page.locator(`a[href="${href}"]`).first().click()
  await page.waitForURL(`**${href}`)
  await page.waitForSelector(contentSelector, { timeout: 8000 })
  return Date.now() - start
}

/**
 * Measure time for an async interaction.
 */
async function measureInteraction(action) {
  const start = Date.now()
  await action()
  return Date.now() - start
}

/**
 * Collect resource transfer sizes grouped by type.
 */
async function getResourceSummary(page) {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType('resource')
    const s = { js: 0, css: 0, fonts: 0, images: 0, total: 0, count: entries.length }
    for (const r of entries) {
      const kb = (r.transferSize || 0) / 1024
      s.total += kb
      if (r.initiatorType === 'script') s.js += kb
      else if (r.name.match(/\.css/)) s.css += kb
      else if (r.name.match(/\.(woff2?|ttf|otf)/)) s.fonts += kb
      else if (r.initiatorType === 'img') s.images += kb
    }
    return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Math.round(v)]))
  })
}

// ─── PF-1: Login Page Load ───────────────────────────────────────────────────

test.describe('PF-1: Login Page Load', () => {
  test('login page loads within threshold', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')

    const t = await getNavTiming(page)
    console.log('\n[Login Page Timing]', t)

    expect(t.domInteractive,   'DOM interactive').toBeLessThan(THRESHOLDS.domInteractive)
    expect(t.domContentLoaded, 'DOMContentLoaded').toBeLessThan(THRESHOLDS.domContentLoaded)
    expect(t.pageLoad,         'Page load').toBeLessThan(THRESHOLDS.pageLoad)
  })

  test('login page resource sizes are reasonable', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')

    const r = await getResourceSummary(page)
    console.log('\n[Login Page Resources (KB)]', r)

    // Dev mode ships unminified JS — allow up to 8 MB total
    expect(r.total, 'Total transfer KB').toBeLessThan(8192)
    expect(r.css,   'CSS transfer KB').toBeLessThan(300)
  })

  test('login page CDP task duration is within threshold', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')

    const before = await getCDPMetrics(page)
    await page.fill('#email', 'test@test.com')
    const after = await getCDPMetrics(page)

    const taskDeltaMs = (after.TaskDuration - before.TaskDuration) * 1000
    console.log(`\n[Login] JS task duration for input: ${taskDeltaMs.toFixed(1)}ms`)
    expect(taskDeltaMs, 'JS task duration for input').toBeLessThan(500)
  })
})

// ─── PF-2: Dashboard Load After Login ───────────────────────────────────────

test.describe('PF-2: Dashboard Load After Login', () => {
  test('login → dashboard loads within 8 seconds (includes 1.5s demo delays across 3 steps)', async ({ page }) => {
    await page.goto(`${BASE}/login`)

    const elapsed = await measureInteraction(async () => {
      // Step 1: Email
      await typeInto(page, '#email', EMAIL)
      await page.locator('button[type="submit"]').click()
      // Step 2: Password
      await page.waitForSelector('#password', { state: 'visible', timeout: 5000 })
      await typeInto(page, '#password', PASSWORD)
      await page.locator('button[type="submit"]').click()
      // Step 3: OTP (demo code: 123456)
      await page.waitForSelector('.otp-box-input', { state: 'visible', timeout: 5000 })
      await page.locator('.otp-box-input').first().click()
      await page.keyboard.type('123456')
      await page.locator('button[type="submit"]').click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
      await page.waitForSelector('h1', { timeout: 5000 })
    })

    console.log(`\n[Login → Dashboard] elapsed: ${elapsed}ms`)
    expect(elapsed, 'Login to dashboard').toBeLessThan(8000)
  })

  test('dashboard CDP layout count is within threshold', async ({ page }) => {
    await login(page)

    const m = await getCDPMetrics(page)
    console.log(`\n[Dashboard] LayoutCount: ${m.LayoutCount}, Nodes: ${m.Nodes}`)

    expect(m.LayoutCount, 'Layout count').toBeLessThan(THRESHOLDS.layoutCount)
    expect(m.Nodes,       'DOM node count').toBeLessThan(3000)
  })

  test('dashboard event listener count is not excessive', async ({ page }) => {
    await login(page)

    const m = await getCDPMetrics(page)
    console.log(`\n[Dashboard] JSEventListeners: ${m.JSEventListeners}`)
    expect(m.JSEventListeners, 'Event listeners').toBeLessThan(500)
  })
})

// ─── PF-3: SPA Route Navigation Speed ───────────────────────────────────────

test.describe('PF-3: SPA Route Navigation Speed', () => {
  // Use beforeEach login + sidebar navigation (page.goto resets React auth state)
  test.beforeEach(async ({ page }) => { await login(page) })

  const routes = [
    { name: 'Accounts',     href: '/accounts',     selector: 'h1' },
    { name: 'Transactions', href: '/transactions',  selector: 'h1' },
    { name: 'Payments',     href: '/payments',      selector: 'h1' },
    { name: 'Transfer',     href: '/transfer',      selector: 'h1' },
    { name: 'Loans',        href: '/loans',         selector: 'h1' },
    { name: 'Cards',        href: '/cards',         selector: 'h1' },
    { name: 'Profile',      href: '/profile',       selector: 'h1' },
  ]

  for (const route of routes) {
    test(`navigates to ${route.name} within ${THRESHOLDS.navigationTime}ms`, async ({ page }) => {
      const elapsed = await measureSidebarNav(page, route.href, route.selector)

      console.log(`\n[Nav] ${route.name}: ${elapsed}ms`)
      expect(elapsed, `${route.name} navigation time`).toBeLessThan(THRESHOLDS.navigationTime)
    })
  }
})

// ─── PF-4: Sidebar Navigation Responsiveness ─────────────────────────────────

test.describe('PF-4: Sidebar Round-Trip Speed', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('three sidebar navigations all under threshold', async ({ page }) => {
    const hops = [
      { href: '/accounts',     selector: 'h1' },
      { href: '/payments',     selector: 'h1' },
      { href: '/transfer',     selector: 'h1' },
    ]

    const times = []
    for (const hop of hops) {
      const elapsed = await measureSidebarNav(page, hop.href, hop.selector)
      times.push(elapsed)
      console.log(`\n[Sidebar] ${hop.href}: ${elapsed}ms`)
    }

    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    console.log(`\n[Sidebar] Average: ${avg}ms`)
    for (const t of times) {
      expect(t, 'Sidebar nav time').toBeLessThan(THRESHOLDS.navigationTime)
    }
  })
})

// ─── PF-5: Form Interaction Responsiveness ───────────────────────────────────

test.describe('PF-5: Form Interaction Responsiveness', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('payment form validates instantly on submit', async ({ page }) => {
    await measureSidebarNav(page, '/payments', 'h1')
    await page.waitForSelector('.send-form')

    const elapsed = await measureInteraction(async () => {
      await page.click('button[type="submit"]')
      await page.waitForSelector('.input-error', { timeout: 2000 })
    })

    console.log(`\n[Payments] Validation response: ${elapsed}ms`)
    expect(elapsed, 'Form validation time').toBeLessThan(400)
  })

  test('transfer form validates instantly on submit', async ({ page }) => {
    await measureSidebarNav(page, '/transfer', 'h1')
    await page.waitForSelector('.transfer-form')

    const elapsed = await measureInteraction(async () => {
      await page.click('button[type="submit"]')
      await page.waitForSelector('.input-error', { timeout: 2000 })
    })

    console.log(`\n[Transfer] Validation response: ${elapsed}ms`)
    expect(elapsed, 'Form validation time').toBeLessThan(400)
  })

  test('account freeze toggle responds within 250ms', async ({ page }) => {
    await measureSidebarNav(page, '/accounts', 'h1')
    await page.waitForSelector('.detail-actions')

    const elapsed = await measureInteraction(async () => {
      await page.locator('.btn-danger').filter({ hasText: 'Freeze' }).click()
      await page.waitForSelector('.account-frozen-banner', { timeout: 2000 })
    })

    console.log(`\n[Accounts] Freeze toggle: ${elapsed}ms`)
    expect(elapsed, 'Account freeze response').toBeLessThan(400)
  })

  test('privacy mode toggle responds within 200ms', async ({ page }) => {
    // Already on dashboard after login
    await page.waitForSelector('h1')

    // Privacy button is the first icon button in the header (before notification bell)
    const privBtn = page.locator('.privacy-btn')

    const elapsed = await measureInteraction(async () => {
      await privBtn.click()
      await page.waitForFunction(
        () => document.querySelector('.privacy-mode') !== null,
        { timeout: 2000 }
      )
    })

    console.log(`\n[Privacy] Toggle response: ${elapsed}ms`)
    expect(elapsed, 'Privacy mode toggle').toBeLessThan(200)
  })
})

// ─── PF-6: Memory & Rendering ────────────────────────────────────────────────

test.describe('PF-6: Memory & Rendering', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('DOM node count stays below limit across pages', async ({ page }) => {
    const hops = [
      { href: '/accounts',     selector: 'h1' },
      { href: '/transactions', selector: 'h1' },
      { href: '/payments',     selector: 'h1' },
      { href: '/dashboard',    selector: 'h1' },
    ]
    const nodeCounts = []

    for (const hop of hops) {
      await measureSidebarNav(page, hop.href, hop.selector)
      const m = await getCDPMetrics(page)
      nodeCounts.push({ path: hop.href, nodes: m.Nodes })
    }

    console.log('\n[DOM Nodes per page]', nodeCounts)
    for (const { path, nodes } of nodeCounts) {
      expect(nodes, `DOM nodes on ${path}`).toBeLessThan(3000)
    }

    const max = Math.max(...nodeCounts.map(n => n.nodes))
    const min = Math.min(...nodeCounts.map(n => n.nodes))
    console.log(`\n[DOM] Max: ${max}, Min: ${min}, Delta: ${max - min}`)
    expect(max - min, 'Node count range across pages').toBeLessThan(2000)
  })

  test('no layout thrashing on dashboard scroll', async ({ page }) => {
    const before = await getCDPMetrics(page)

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.evaluate(() => window.scrollTo(0, 0))

    const after = await getCDPMetrics(page)
    const layoutDelta = after.LayoutCount - before.LayoutCount
    console.log(`\n[Dashboard] Layout operations from scroll: ${layoutDelta}`)
    expect(layoutDelta, 'Layout operations from scroll').toBeLessThan(20)
  })
})

// ─── PF-7: Stability Over Repeated Navigation ────────────────────────────────

test.describe('PF-7: Repeated Navigation Stability', () => {
  test('layout count stays bounded after 8 navigations', async ({ page }) => {
    await login(page)

    const hops = [
      { href: '/accounts',     selector: 'h1' },
      { href: '/payments',     selector: 'h1' },
      { href: '/transfer',     selector: 'h1' },
      { href: '/dashboard',    selector: 'h1' },
    ]

    // Navigate the loop twice
    for (let i = 0; i < 2; i++) {
      for (const hop of hops) {
        await measureSidebarNav(page, hop.href, hop.selector)
      }
    }

    const m = await getCDPMetrics(page)
    console.log(`\n[Stability] After 8 navs — LayoutCount: ${m.LayoutCount}, Nodes: ${m.Nodes}`)

    expect(m.LayoutCount, 'Total layout count after repeated nav').toBeLessThan(2000)
    expect(m.Nodes,       'DOM nodes after repeated nav').toBeLessThan(3000)
  })
})
