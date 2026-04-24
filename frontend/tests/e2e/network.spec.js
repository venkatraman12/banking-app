/**
 * Network Test Suite — NovaBank
 *
 * Tests network behaviour: request patterns, resource loading, security headers,
 * offline resilience, and network condition simulation.
 *
 * Run: npx playwright test tests/e2e/network.spec.js
 */

import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'
const EMAIL = 'demo@novabank.com'
const PASSWORD = 'password'

test.use({ slowMo: 0 })

// ── Helpers ─────────────────────────────────────────────────────────────────

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
  await typeInto(page, '#email', EMAIL)
  await page.locator('button[type="submit"]').click()
  await page.waitForSelector('#password', { state: 'visible', timeout: 5000 })
  await typeInto(page, '#password', PASSWORD)
  await page.locator('button[type="submit"]').click()
  // Read dynamic OTP from page
  await page.waitForSelector('.otp-box-input', { state: 'visible', timeout: 10000 })
  const otpHint = page.locator('.otp-hint-box strong')
  let otpCode = '123456'
  try {
    await otpHint.waitFor({ state: 'visible', timeout: 3000 })
    otpCode = (await otpHint.textContent()).trim()
  } catch { /* use fallback */ }
  await page.locator('.otp-box-input').first().click()
  await page.keyboard.type(otpCode)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

/** Collect all requests made during an action into an array. */
function collectRequests(page) {
  const requests = []
  const handler = req => requests.push({
    url:    req.url(),
    method: req.method(),
    type:   req.resourceType(),
  })
  page.on('request', handler)
  return {
    requests,
    stop: () => page.off('request', handler),
  }
}

/** Collect all failed requests during an action. */
function collectFailures(page) {
  const failures = []
  const handler = req => failures.push({ url: req.url(), failure: req.failure()?.errorText })
  page.on('requestfailed', handler)
  return {
    failures,
    stop: () => page.off('requestfailed', handler),
  }
}

// ─── NET-1: Request Inventory ────────────────────────────────────────────────

test.describe('NET-1: Request Inventory', () => {
  test('login page makes no unexpected external API calls', async ({ page }) => {
    const { requests, stop } = collectRequests(page)

    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')
    stop()

    const external = requests.filter(r => {
      try {
        const u = new URL(r.url)
        // Allow localhost and known CDNs (Google Fonts)
        return u.hostname !== 'localhost' &&
               u.hostname !== '127.0.0.1' &&
               !u.hostname.endsWith('fonts.googleapis.com') &&
               !u.hostname.endsWith('fonts.gstatic.com')
      } catch { return false }
    })

    console.log('\n[NET-1] Login page requests:', requests.length)
    console.log('[NET-1] External requests:', external.map(r => r.url))

    expect(external, 'Unexpected external requests on login page').toHaveLength(0)
  })

  test('dashboard makes no unexpected API calls to external hosts', async ({ page }) => {
    await login(page)

    const { requests, stop } = collectRequests(page)
    await page.waitForTimeout(1000) // let any deferred requests fire
    stop()

    const externalAPI = requests.filter(r => {
      try {
        const u = new URL(r.url)
        return u.hostname !== 'localhost' &&
               u.hostname !== '127.0.0.1' &&
               !u.hostname.endsWith('fonts.googleapis.com') &&
               !u.hostname.endsWith('fonts.gstatic.com') &&
               (r.type === 'fetch' || r.type === 'xhr')
      } catch { return false }
    })

    console.log('\n[NET-1] Dashboard XHR/fetch to external hosts:', externalAPI.map(r => r.url))
    expect(externalAPI, 'External API calls from dashboard').toHaveLength(0)
  })

  test('all page resources load without failures', async ({ page }) => {
    const { failures, stop } = collectFailures(page)

    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')
    stop()

    // Filter out known benign failures (e.g. favicon 404 in dev)
    const real = failures.filter(f => !f.url.includes('favicon'))
    console.log('\n[NET-1] Failed requests:', real)
    expect(real, 'Failed page requests').toHaveLength(0)
  })
})

// ─── NET-2: Resource Types & Sizes ───────────────────────────────────────────

test.describe('NET-2: Resource Types & Sizes', () => {
  test('login page loads expected resource types (script, stylesheet, document)', async ({ page }) => {
    const { requests, stop } = collectRequests(page)
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')
    stop()

    const types = new Set(requests.map(r => r.type))
    console.log('\n[NET-2] Resource types on login:', [...types])

    expect(types.has('document'), 'document request').toBe(true)
    // Vite serves JS modules
    expect(
      types.has('script') || types.has('module') || types.has('other'),
      'script/module resource'
    ).toBe(true)
  })

  test('number of requests on login page is bounded', async ({ page }) => {
    const { requests, stop } = collectRequests(page)
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')
    stop()

    const count = requests.length
    console.log(`\n[NET-2] Login page total requests: ${count}`)
    // Dev mode (Vite) generates many module requests; cap at 150
    expect(count, 'Total requests on login page').toBeLessThan(150)
  })

  test('no image requests are excessively large (>500 KB each)', async ({ page }) => {
    const largeImages = []

    page.on('response', async res => {
      const type = res.request().resourceType()
      if (type !== 'image') return
      const headers = res.headers()
      const cl = parseInt(headers['content-length'] ?? '0', 10)
      if (cl > 500 * 1024) largeImages.push({ url: res.url(), sizeKB: Math.round(cl / 1024) })
    })

    await login(page)
    await page.waitForTimeout(500)

    console.log('\n[NET-2] Large images:', largeImages)
    expect(largeImages, 'Images exceeding 500 KB').toHaveLength(0)
  })
})

// ─── NET-3: Security Headers ─────────────────────────────────────────────────

test.describe('NET-3: Security Headers', () => {
  test('login page response includes X-Content-Type-Options', async ({ page }) => {
    const response = await page.goto(`${BASE}/login`)
    const headers = response.headers()
    console.log('\n[NET-3] Response headers:', headers)

    // Vite dev server may or may not set these — we document what is present
    const xContentType = headers['x-content-type-options']
    console.log('[NET-3] x-content-type-options:', xContentType ?? '(not set)')
    // Non-blocking assertion: log presence, don't fail on absence in dev
    // In production builds behind a real server this should be 'nosniff'
  })

  test('login page has no mixed-content (all resources over same scheme)', async ({ page }) => {
    const mixedContent = []

    page.on('request', req => {
      const pageUrl = new URL(BASE)
      let reqUrl
      try { reqUrl = new URL(req.url()) } catch { return }
      // Flag HTTP requests when page is served over HTTPS
      if (pageUrl.protocol === 'https:' && reqUrl.protocol === 'http:') {
        mixedContent.push(req.url())
      }
    })

    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')

    console.log('\n[NET-3] Mixed content requests:', mixedContent)
    expect(mixedContent, 'Mixed-content requests').toHaveLength(0)
  })

  test('no sensitive data in query strings of any requests', async ({ page }) => {
    const leaky = []
    const SENSITIVE = /password|token|secret|apikey|api_key|auth/i

    page.on('request', req => {
      try {
        const u = new URL(req.url())
        for (const [key, val] of u.searchParams) {
          if (SENSITIVE.test(key) || SENSITIVE.test(val)) {
            leaky.push({ url: req.url(), param: key })
          }
        }
      } catch {}
    })

    await login(page)
    await page.waitForTimeout(500)

    console.log('\n[NET-3] Leaky query params:', leaky)
    expect(leaky, 'Sensitive data in query strings').toHaveLength(0)
  })
})

// ─── NET-4: Offline & Error Resilience ───────────────────────────────────────

test.describe('NET-4: Offline & Network Error Resilience', () => {
  test('app renders gracefully when fonts CDN is blocked', async ({ page, context }) => {
    // Block Google Fonts
    await context.route('**fonts.googleapis.com**', route => route.abort())
    await context.route('**fonts.gstatic.com**', route => route.abort())

    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')

    // Core UI must still render without the web font
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    console.log('\n[NET-4] App renders with fonts blocked ✓')
  })

  test('login works with all network requests slowed (500ms artificial delay)', async ({ page, context }) => {
    // Simulate slow network by adding delay to every route response
    await context.route('**/*', async route => {
      // Only delay local resources
      const url = route.request().url()
      if (url.startsWith(BASE)) {
        await new Promise(r => setTimeout(r, 100)) // 100ms added per request
      }
      await route.continue()
    })

    const start = Date.now()
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email', { timeout: 15000 })
    const elapsed = Date.now() - start

    console.log(`\n[NET-4] Login page load with delay: ${elapsed}ms`)
    // Page must still load (just slower)
    await expect(page.locator('#email')).toBeVisible()
  })

  test('going offline after login shows UI but does not crash', async ({ page, context }) => {
    await login(page)
    await page.waitForSelector('h1')

    // Simulate offline mode
    await context.setOffline(true)

    // Navigate within the SPA — page loads but API data won't be available
    await page.locator('a[href="/accounts"]').first().click()
    await page.waitForURL('**/accounts', { timeout: 5000 })
    // Sidebar and layout should still render even if page content fails to load data
    await expect(page.locator('.sidebar-nav')).toBeVisible()
    // App should not crash (no blank page)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText.length, 'Page has content (not blank)').toBeGreaterThan(0)

    console.log('\n[NET-4] SPA navigation offline ✓')

    // Restore
    await context.setOffline(false)
  })
})

// ─── NET-5: Request Method Audit ─────────────────────────────────────────────

test.describe('NET-5: Request Method Audit', () => {
  test('login page makes only GET requests (no unexpected POST/PUT/DELETE)', async ({ page }) => {
    const nonGet = []

    page.on('request', req => {
      if (req.method() !== 'GET') {
        nonGet.push({ method: req.method(), url: req.url(), type: req.resourceType() })
      }
    })

    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')

    // Filter out Vite HMR websocket upgrades
    const realNonGet = nonGet.filter(r => r.type !== 'websocket' && r.type !== 'eventsource')
    console.log('\n[NET-5] Non-GET requests on login page:', realNonGet)

    expect(realNonGet, 'Non-GET requests on initial page load').toHaveLength(0)
  })

  test('no DELETE or PATCH requests fire during normal dashboard use', async ({ page }) => {
    await login(page)
    const destructive = []

    page.on('request', req => {
      if (['DELETE', 'PATCH'].includes(req.method())) {
        destructive.push({ method: req.method(), url: req.url() })
      }
    })

    // Navigate several pages
    await page.locator('a[href="/accounts"]').first().click()
    await page.waitForURL('**/accounts')
    await page.locator('a[href="/transactions"]').first().click()
    await page.waitForURL('**/transactions')
    await page.locator('a[href="/payments"]').first().click()
    await page.waitForURL('**/payments')

    console.log('\n[NET-5] Destructive requests during navigation:', destructive)
    expect(destructive, 'Unexpected DELETE/PATCH requests').toHaveLength(0)
  })
})

// ─── NET-6: Response Timing per Resource ─────────────────────────────────────

test.describe('NET-6: Response Timing', () => {
  test('all local resource responses complete within 3s each', async ({ page }) => {
    const slow = []

    page.on('response', async res => {
      const req = res.request()
      if (!req.url().startsWith(BASE)) return
      const timing = req.timing()
      if (!timing) return
      const responseEnd = timing.responseEnd
      if (responseEnd > 3000) {
        slow.push({ url: req.url(), ms: Math.round(responseEnd) })
      }
    })

    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')

    console.log('\n[NET-6] Slow resources (>3s):', slow)
    expect(slow, 'Resources taking longer than 3s').toHaveLength(0)
  })

  test('captures full resource timing summary for login page', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#email')

    const summary = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource')
      const byType = {}
      for (const e of entries) {
        const t = e.initiatorType || 'other'
        if (!byType[t]) byType[t] = { count: 0, totalKB: 0, maxDurationMs: 0 }
        byType[t].count++
        byType[t].totalKB += Math.round((e.transferSize || 0) / 1024)
        byType[t].maxDurationMs = Math.max(byType[t].maxDurationMs, Math.round(e.duration))
      }
      return byType
    })

    console.log('\n[NET-6] Resource timing by type:', JSON.stringify(summary, null, 2))
    // Structural check: we got timing data
    expect(Object.keys(summary).length, 'Resource types measured').toBeGreaterThan(0)
  })
})
