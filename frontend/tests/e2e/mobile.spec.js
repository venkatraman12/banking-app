/**
 * Mobile E2E Tests — NovaBank
 *
 * Runs on Pixel 7 (Android Chrome) and iPhone 15 (Safari) emulation.
 * Tests mobile-specific interactions: hamburger menu, sidebar drawer,
 * responsive layout, and core flows at 390–412px viewport widths.
 *
 * Run: npm run test:mobile
 */

import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'
const EMAIL = 'demo@novabank.com'
const PASSWORD = 'password'

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  await page.waitForSelector('.otp-box-input', { state: 'visible', timeout: 5000 })
  await page.locator('.otp-box-input').first().click()
  await page.keyboard.type('123456')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

/** Open sidebar via hamburger and wait for it to slide in */
async function openSidebar(page) {
  await page.locator('.header-menu-btn').click()
  await page.waitForSelector('.sidebar--open', { timeout: 3000 })
}

/** Open sidebar, click a nav link, wait for navigation */
async function navigateTo(page, href) {
  await openSidebar(page)
  await page.locator(`.sidebar a[href="${href}"]`).click()
  await page.waitForURL(`**${href}`, { timeout: 8000 })
  await page.waitForSelector('h1', { timeout: 5000 })
}

// ─── Login ───────────────────────────────────────────────────────────────────

test.describe('Mobile Login', () => {
  test('3-step login wizard works on mobile', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('wrong credentials shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await typeInto(page, '#email', EMAIL)
    await page.locator('button[type="submit"]').click()
    await page.waitForSelector('#password', { state: 'visible', timeout: 5000 })
    await typeInto(page, '#password', 'wrongpassword')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('.login-error')).toBeVisible()
  })
})

// ─── Navigation ──────────────────────────────────────────────────────────────

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('hamburger button is visible on mobile', async ({ page }) => {
    await expect(page.locator('.header-menu-btn')).toBeVisible()
  })

  test('hamburger opens the sidebar drawer', async ({ page }) => {
    await page.locator('.header-menu-btn').click()
    await expect(page.locator('.sidebar')).toHaveClass(/sidebar--open/)
  })

  test('tapping the overlay closes the sidebar', async ({ page }) => {
    await page.locator('.header-menu-btn').click()
    await page.waitForSelector('.sidebar--open')
    await page.locator('.sidebar-overlay').click()
    await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar--open/)
  })

  test('navigates to Accounts via sidebar', async ({ page }) => {
    await navigateTo(page, '/accounts')
    await expect(page.locator('h1')).toBeVisible()
    // Sidebar should close after navigation
    await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar--open/)
  })

  test('navigates to Transactions via sidebar', async ({ page }) => {
    await navigateTo(page, '/transactions')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('navigates to Payments via sidebar', async ({ page }) => {
    await navigateTo(page, '/payments')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('navigates to Profile via sidebar', async ({ page }) => {
    await navigateTo(page, '/profile')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('sign out button in sidebar works', async ({ page }) => {
    await openSidebar(page)
    await page.locator('.sidebar-logout').click()
    await expect(page).toHaveURL(/login/)
  })
})

// ─── Header ──────────────────────────────────────────────────────────────────

test.describe('Mobile Header', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('search bar is hidden on mobile', async ({ page }) => {
    await expect(page.locator('.header-search')).not.toBeVisible()
  })

  test('page name is visible in header', async ({ page }) => {
    await expect(page.locator('.header-page-name')).toBeVisible()
    await expect(page.locator('.header-page-name')).toContainText('Dashboard')
  })

  test('privacy toggle works on mobile', async ({ page }) => {
    await page.locator('.privacy-btn').click()
    await expect(page.locator('.app-layout')).toHaveClass(/privacy-mode/)
    await page.locator('.privacy-btn').click()
    await expect(page.locator('.app-layout')).not.toHaveClass(/privacy-mode/)
  })

  test('dark mode toggle works on mobile', async ({ page }) => {
    await page.locator('.dark-mode-btn').click()
    await expect(page.locator('[data-theme="dark"]')).toBeVisible()
    await page.locator('.dark-mode-btn').click()
  })

  test('notification dropdown opens and is visible', async ({ page }) => {
    await page.locator('.notif-wrapper .header-icon-btn').click()
    await expect(page.locator('.notif-dropdown')).toBeVisible()
  })

  test('notification dropdown does not overflow viewport', async ({ page }) => {
    await page.locator('.notif-wrapper .header-icon-btn').click()
    await page.waitForSelector('.notif-dropdown', { state: 'visible' })

    const box = await page.locator('.notif-dropdown').boundingBox()
    const viewport = page.viewportSize()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  })
})

// ─── Dashboard on mobile ─────────────────────────────────────────────────────

test.describe('Mobile Dashboard', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('dashboard summary cards render', async ({ page }) => {
    await expect(page.locator('.summary-card').first()).toBeVisible()
  })

  test('recent transactions are visible', async ({ page }) => {
    await expect(page.locator('.txn-row').first()).toBeVisible()
  })
})

// ─── Responsive layout ───────────────────────────────────────────────────────

test.describe('Mobile Responsive Layout', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('no horizontal overflow on dashboard', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
    expect(overflow).toBe(false)
  })

  test('no horizontal overflow on accounts page', async ({ page }) => {
    await navigateTo(page, '/accounts')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
    expect(overflow).toBe(false)
  })

  test('no horizontal overflow on transactions page', async ({ page }) => {
    await navigateTo(page, '/transactions')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
    expect(overflow).toBe(false)
  })

  test('no horizontal overflow on payments page', async ({ page }) => {
    await navigateTo(page, '/payments')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
    expect(overflow).toBe(false)
  })
})

// ─── Core flows on mobile ────────────────────────────────────────────────────

test.describe('Mobile Core Flows', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('account detail panel opens on mobile', async ({ page }) => {
    await navigateTo(page, '/accounts')
    await page.locator('.account-card').first().click()
    await expect(page.locator('.account-detail')).toBeVisible()
  })

  test('transfer form renders on mobile', async ({ page }) => {
    await navigateTo(page, '/transfer')
    await expect(page.locator('.transfer-form')).toBeVisible()
  })

  test('loan application form renders on mobile', async ({ page }) => {
    await navigateTo(page, '/loans')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('card thumbnails render on mobile', async ({ page }) => {
    await navigateTo(page, '/cards')
    await expect(page.locator('.card-thumb').first()).toBeVisible()
  })
})
