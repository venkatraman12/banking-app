import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'
const EMAIL = 'demo@novabanc.com'
const PASSWORD = 'password'

// Helper: type into a React controlled input reliably (bypasses slowMo)
async function typeInto(page, selector, text) {
  const loc = page.locator(selector)
  await loc.click()
  await loc.pressSequentially(text, { delay: 0 })
  // Blur to fire React's onChange/onBlur and flush state
  await loc.blur()
  // Wait for React state to reflect the typed value
  await page.waitForFunction(
    ({ sel, val }) => document.querySelector(sel)?.value === val,
    { sel: selector, val: text },
    { timeout: 3000 }
  )
}

// Helper: 3-step login wizard (email → password → OTP)
async function login(page) {
  await page.goto(`${BASE}/login`)

  // Step 1: Email
  await typeInto(page, '#email', EMAIL)
  await page.locator('button[type="submit"]').click()

  // Step 2: Password (900ms async delay in handler)
  await page.waitForSelector('#password', { state: 'visible', timeout: 5000 })
  await typeInto(page, '#password', PASSWORD)
  await page.locator('button[type="submit"]').click()

  // Step 3: OTP
  await page.waitForSelector('.otp-box-input', { state: 'visible', timeout: 5000 })
  await page.locator('.otp-box-input').first().click()
  await page.keyboard.type('123456')
  await page.locator('button[type="submit"]').click()

  // Navigate to dashboard (700ms OTP verify delay + page load)
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

// ─────────────────────────────────────────────
// 1. LOGIN PAGE
// ─────────────────────────────────────────────
test.describe('Login Page', () => {
  test('shows login page with brand and form', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await expect(page.locator('.brand-name, .login-brand')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    // Step 1: Enter valid email to proceed to password step
    await typeInto(page, '#email', EMAIL)
    await page.locator('button[type="submit"]').click()
    // Step 2: Enter wrong password
    await page.waitForSelector('#password', { state: 'visible', timeout: 5000 })
    await typeInto(page, '#password', 'wrongpassword')
    await page.locator('button[type="submit"]').click()
    // Error message appears after async check (900ms)
    await expect(page.locator('.login-error')).toBeVisible({ timeout: 5000 })
  })

  test('redirects to dashboard on valid login', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/dashboard/)
  })
})

// ─────────────────────────────────────────────
// 2. DASHBOARD
// ─────────────────────────────────────────────
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('shows total balance and summary cards', async ({ page }) => {
    await expect(page.locator('.summary-card').first()).toBeVisible()
    await expect(page.locator('.summary-card .summary-card-value').first()).toContainText('$')
  })

  test('shows accounts list', async ({ page }) => {
    await expect(page.locator('.accounts-list')).toBeVisible()
    const accounts = page.locator('.account-item')
    await expect(accounts).toHaveCount(3)
  })

  test('shows recent transactions', async ({ page }) => {
    await expect(page.locator('.transactions-list')).toBeVisible()
    const txItems = page.locator('.tx-item')
    await expect(txItems.first()).toBeVisible()
  })

  test('shows spending breakdown', async ({ page }) => {
    await expect(page.locator('.donut-wrap')).toBeVisible()
    await expect(page.locator('.donut-svg')).toBeVisible()
  })

  test('greeting shows user name', async ({ page }) => {
    await expect(page.locator('.dashboard-welcome-text h1')).toContainText('Alex')
  })
})

// ─────────────────────────────────────────────
// 3. ACCOUNTS PAGE
// ─────────────────────────────────────────────
test.describe('Accounts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/accounts"]')
    await page.waitForURL('**/accounts')
  })

  test('shows 3 account cards', async ({ page }) => {
    const cards = page.locator('.account-card')
    await expect(cards).toHaveCount(3)
  })

  test('clicking account shows detail panel', async ({ page }) => {
    await page.locator('.account-card').nth(1).click()
    await expect(page.locator('.detail-hero-balance')).toBeVisible()
  })

  test('detail panel shows account info', async ({ page }) => {
    await expect(page.locator('.detail-hero')).toBeVisible()
    await expect(page.locator('.detail-hero-balance')).toContainText('$')
    await expect(page.locator('.detail-hero-number')).toBeVisible()
  })

  test('shows transfer and statement buttons', async ({ page }) => {
    await expect(page.locator('text=Transfer Funds')).toBeVisible()
    await expect(page.locator('text=Download Statement')).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 4. TRANSACTIONS PAGE
// ─────────────────────────────────────────────
test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/transactions"]')
    await page.waitForURL('**/transactions')
  })

  test('shows summary row with totals', async ({ page }) => {
    await expect(page.locator('.tx-summary-row')).toBeVisible()
    const cards = page.locator('.tx-summary-card')
    await expect(cards).toHaveCount(4)
  })

  test('shows transactions table', async ({ page }) => {
    await expect(page.locator('.tx-table')).toBeVisible()
    const rows = page.locator('.tx-table tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('search filters transactions', async ({ page }) => {
    const allRows = await page.locator('.tx-table tbody tr').count()
    await page.fill('.filter-search input', 'Netflix')
    await page.waitForTimeout(200)
    const filteredRows = await page.locator('.tx-table tbody tr').count()
    expect(filteredRows).toBeLessThan(allRows)
    await expect(page.locator('text=Netflix')).toBeVisible()
  })

  test('category filter works', async ({ page }) => {
    await page.selectOption('.filter-select >> nth=1', 'Income')
    await page.waitForTimeout(200)
    const rows = page.locator('.tx-table tbody tr')
    await expect(rows.first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 5. PAYMENTS PAGE
// ─────────────────────────────────────────────
test.describe('Payments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/payments"]')
    await page.waitForURL('**/payments')
  })

  test('shows send money form', async ({ page }) => {
    await expect(page.locator('.send-money-card')).toBeVisible()
    await expect(page.locator('.send-money-card h2')).toBeVisible()
  })

  test('shows upcoming payments', async ({ page }) => {
    const items = page.locator('.scheduled-item')
    await expect(items.first()).toBeVisible()
  })

  test('can fill and submit payment form with PIN', async ({ page }) => {
    await page.fill('input[placeholder*="john@example"]', 'John Doe')
    await page.selectOption('select', 'checking')
    await page.fill('input[type="number"]', '150')
    await page.fill('input[placeholder*="payment for"]', 'Dinner split')
    await page.click('button[type="submit"]')
    // PIN pad should appear
    await expect(page.locator('.pinpad-overlay')).toBeVisible()
    // Enter correct demo PIN: 1234
    for (const digit of ['1', '2', '3', '4']) {
      await page.locator(`.pinpad-key >> text="${digit}"`).click()
    }
    await expect(page.locator('.payment-success')).toBeVisible()
    await expect(page.locator('text=Payment Sent')).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 6. LOANS PAGE
// ─────────────────────────────────────────────
test.describe('Loans', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/loans"]')
    await page.waitForURL('**/loans')
  })

  test('shows loan summary row', async ({ page }) => {
    await expect(page.locator('.loan-summary-row')).toBeVisible()
    await expect(page.locator('text=Total Outstanding')).toBeVisible()
  })

  test('shows active loans with progress bars', async ({ page }) => {
    const loans = page.locator('.loan-card')
    await expect(loans).toHaveCount(3)
    await expect(page.locator('.loan-progress-fill').first()).toBeVisible()
  })

  test('apply for loan toggle works', async ({ page }) => {
    await page.click('text=Apply for Loan')
    await expect(page.locator('.loan-apply')).toBeVisible()
    await expect(page.locator('text=New Loan Application')).toBeVisible()
  })

  test('loan type selection works', async ({ page }) => {
    await page.click('text=Apply for Loan')
    await page.click('.loan-type-btn >> nth=1')
    await expect(page.locator('.loan-type-btn--active').nth(0)).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 7. PROFILE PAGE
// ─────────────────────────────────────────────
test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/profile"]')
    await page.waitForURL('**/profile')
  })

  test('shows profile avatar and user info', async ({ page }) => {
    await expect(page.locator('.profile-avatar')).toBeVisible()
    await expect(page.locator('.profile-avatar-info h2')).toContainText('Alex Johnson')
  })

  test('personal info tab shows form', async ({ page }) => {
    await expect(page.locator('.profile-form')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('switching to security tab works', async ({ page }) => {
    await page.click('text=Security')
    await expect(page.locator('.sec-block').first()).toBeVisible()
    await expect(page.locator('text=Two-Factor Authentication')).toBeVisible()
  })

  test('notifications tab shows toggles', async ({ page }) => {
    await page.click('text=Notifications')
    await expect(page.locator('.notif-settings')).toBeVisible()
    await expect(page.locator('.toggle-btn').first()).toBeVisible()
  })

  test('saving changes shows success message', async ({ page }) => {
    await page.click('text=Save Changes')
    await expect(page.locator('.save-success')).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 8. CARDS PAGE
// ─────────────────────────────────────────────
test.describe('Cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.locator('.sidebar-nav').locator('a[href="/cards"]').click()
    await page.waitForURL('**/cards')
  })

  test('shows 3 card thumbnails', async ({ page }) => {
    await expect(page.locator('.card-thumb')).toHaveCount(3)
  })

  test('clicking card updates detail panel', async ({ page }) => {
    await page.locator('.card-thumb').nth(1).click()
    await expect(page.locator('.card-3d-front')).toBeVisible()
    await expect(page.locator('.limit-bar')).toBeVisible()
  })

  test('flipping card shows back side', async ({ page }) => {
    await page.locator('.card-3d').click()
    await expect(page.locator('.card-cvv')).toBeVisible()
  })

  test('freeze/unfreeze button toggles', async ({ page }) => {
    const btn = page.locator('.card-action-item').first()
    const initialText = await btn.textContent()
    await btn.click()
    const newText = await btn.textContent()
    expect(newText).not.toBe(initialText)
  })
})

// ─────────────────────────────────────────────
// 9. TRANSFER PAGE
// ─────────────────────────────────────────────
test.describe('Transfer', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.locator('.sidebar-nav').locator('a[href="/transfer"]').click()
    await page.waitForURL('**/transfer')
  })

  test('shows step indicator and form', async ({ page }) => {
    await expect(page.locator('.steps')).toBeVisible()
    await expect(page.locator('.transfer-mode-tabs')).toBeVisible()
  })

  test('own account transfer flow reaches review', async ({ page }) => {
    await page.selectOption('select >> nth=0', 'chk')
    await page.selectOption('select >> nth=1', 'sav')
    await page.fill('input[type="number"]', '500')
    await page.click('button[type="submit"]')
    await expect(page.locator('.review-card')).toBeVisible()
    await expect(page.locator('.review-row--amount strong')).toContainText('500.00')
  })

  test('confirm transfer shows success screen', async ({ page }) => {
    await page.selectOption('select >> nth=0', 'chk')
    await page.selectOption('select >> nth=1', 'sav')
    await page.fill('input[type="number"]', '200')
    await page.click('button[type="submit"]')
    await page.click('text=Confirm Transfer')
    await expect(page.locator('.transfer-success')).toBeVisible()
    await expect(page.locator('.success-ref')).toBeVisible()
  })

  test('switches to send to others mode', async ({ page }) => {
    await page.locator('.mode-tab').nth(1).click()
    await expect(page.locator('.beneficiary-grid')).toBeVisible()
    await expect(page.locator('.beneficiary-btn')).toHaveCount(5)
  })
})

// ─────────────────────────────────────────────
// 10. SAVINGS PAGE
// ─────────────────────────────────────────────
test.describe('Savings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.locator('.sidebar-nav').locator('a[href="/savings"]').click()
    await page.waitForURL('**/savings')
  })

  test('shows overview cards and goals', async ({ page }) => {
    await expect(page.locator('.savings-overview')).toBeVisible()
    await expect(page.locator('.goal-card')).toHaveCount(4)
  })

  test('completed goal shows badge', async ({ page }) => {
    await expect(page.locator('.goal-done-badge')).toBeVisible()
  })

  test('can contribute to a goal', async ({ page }) => {
    await page.locator('.goal-menu-btn').first().click()
    await expect(page.locator('.contribute-box')).toBeVisible()
    await page.fill('.contribute-box input', '500')
    await page.locator('.contribute-box .btn-primary').click()
    await expect(page.locator('.contribute-box')).not.toBeVisible()
  })

  test('can create a new goal', async ({ page }) => {
    await page.click('text=+ New Goal')
    await page.fill('input[placeholder="e.g. New Car"]', 'New Car')
    await page.fill('input[placeholder="5000"]', '15000')
    await page.click('text=Create Goal')
    const goals = page.locator('.goal-card')
    await expect(goals).toHaveCount(5)
  })
})

// ─────────────────────────────────────────────
// 11. INVESTMENTS PAGE
// ─────────────────────────────────────────────
test.describe('Investments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.locator('.sidebar-nav').locator('a[href="/investments"]').click()
    await page.waitForURL('**/investments')
  })

  test('shows portfolio value and summary', async ({ page }) => {
    await expect(page.locator('.inv-summary')).toBeVisible()
    await expect(page.locator('.inv-total-value')).toContainText('$')
  })

  test('shows performance bar chart', async ({ page }) => {
    await expect(page.locator('.bar-chart')).toBeVisible()
    await expect(page.locator('.bar-fill')).toHaveCount(7)
  })

  test('shows 5 holdings in table', async ({ page }) => {
    await expect(page.locator('.holdings-table tbody tr')).toHaveCount(5)
  })

  test('clicking trade opens trade panel', async ({ page }) => {
    await page.locator('.trade-btn').first().click()
    await expect(page.locator('.trade-panel-header')).toBeVisible()
    await expect(page.locator('.trade-type-tabs')).toBeVisible()
  })

  test('allocation tab shows donut chart', async ({ page }) => {
    await page.click('text=Allocation')
    await expect(page.locator('.alloc-donut')).toBeVisible()
    await expect(page.locator('.alloc-item')).toHaveCount(4)
  })
})

// ─────────────────────────────────────────────
// 12. FULL PAGE NAVIGATION WALKTHROUGH
// ─────────────────────────────────────────────
test.describe('Full Navigation Walkthrough', () => {
  test('navigates through all pages via sidebar links', async ({ page }) => {
    await login(page)

    const nav = page.locator('.sidebar-nav')

    // ── Dashboard ──
    await nav.locator('a[href="/dashboard"]').click()
    await page.waitForURL('**/dashboard')
    await expect(page.locator('.dashboard-welcome-text h1')).toBeVisible()
    await expect(page.locator('.summary-card').first()).toBeVisible()

    // ── Accounts ──
    await nav.locator('a[href="/accounts"]').click()
    await page.waitForURL('**/accounts')
    await expect(page.locator('.account-card').first()).toBeVisible()
    await expect(page.locator('.detail-hero')).toBeVisible()

    // ── Transactions ──
    await nav.locator('a[href="/transactions"]').click()
    await page.waitForURL('**/transactions')
    await expect(page.locator('.tx-table')).toBeVisible()
    await expect(page.locator('.tx-summary-row')).toBeVisible()

    // ── Payments ──
    await nav.locator('a[href="/payments"]').click()
    await page.waitForURL('**/payments')
    await expect(page.locator('.send-money-card')).toBeVisible()
    await expect(page.locator('.scheduled-item').first()).toBeVisible()

    // ── Loans ──
    await nav.locator('a[href="/loans"]').click()
    await page.waitForURL('**/loans')
    await expect(page.locator('.loan-summary-row')).toBeVisible()
    await expect(page.locator('.loan-card').first()).toBeVisible()

    // ── Cards ──
    await nav.locator('a[href="/cards"]').click()
    await page.waitForURL('**/cards')
    await expect(page.locator('.card-thumb').first()).toBeVisible()
    await expect(page.locator('.card-3d')).toBeVisible()

    // ── Transfer ──
    await nav.locator('a[href="/transfer"]').click()
    await page.waitForURL('**/transfer')
    await expect(page.locator('.steps')).toBeVisible()
    await expect(page.locator('.transfer-form')).toBeVisible()

    // ── Savings ──
    await nav.locator('a[href="/savings"]').click()
    await page.waitForURL('**/savings')
    await expect(page.locator('.savings-overview')).toBeVisible()
    await expect(page.locator('.goal-card').first()).toBeVisible()

    // ── Investments ──
    await nav.locator('a[href="/investments"]').click()
    await page.waitForURL('**/investments')
    await expect(page.locator('.inv-summary')).toBeVisible()
    await expect(page.locator('.bar-chart')).toBeVisible()

    // ── Profile ──
    await nav.locator('a[href="/profile"]').click()
    await page.waitForURL('**/profile')
    await expect(page.locator('.profile-avatar')).toBeVisible()
    await expect(page.locator('.profile-form')).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// CYBERSECURITY TESTS
// ─────────────────────────────────────────────

// ── CS-1: Security Headers ──
test.describe('Security Headers (CSP & Meta)', () => {
  test('CSP meta tag is present in HTML', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
    expect(csp).toBeTruthy()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  test('X-Frame-Options meta tag is DENY', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    const xfo = await page.locator('meta[http-equiv="X-Frame-Options"]').getAttribute('content')
    expect(xfo).toBe('DENY')
  })

  test('X-Content-Type-Options meta tag is nosniff', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    const xcto = await page.locator('meta[http-equiv="X-Content-Type-Options"]').getAttribute('content')
    expect(xcto).toBe('nosniff')
  })

  test('Referrer-Policy meta tag is set', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    const rp = await page.locator('meta[http-equiv="Referrer-Policy"]').getAttribute('content')
    expect(rp).toBe('strict-origin-when-cross-origin')
  })
})

// ─────────────────────────────────────────────
// 14. PRIVACY MODE
// ─────────────────────────────────────────────
test.describe('Privacy Mode', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('privacy mode blurs balance values', async ({ page }) => {
    // Before: balance shows $ amount
    await expect(page.locator('.hero-balance-value')).toContainText('$')
    // Toggle privacy on
    await page.locator('.privacy-btn').click()
    // Balance should now show ••• instead of $
    await expect(page.locator('.hero-balance-value')).toContainText('•••')
    await expect(page.locator('.hero-balance-value')).not.toContainText('$')
  })

  test('toggling privacy off restores normal view', async ({ page }) => {
    // Toggle on then off
    await page.locator('.privacy-btn').click()
    await expect(page.locator('.hero-balance-value')).toContainText('•••')
    await page.locator('.privacy-btn').click()
    await expect(page.locator('.hero-balance-value')).toContainText('$')
  })

  test('privacy button shows active state when on', async ({ page }) => {
    await page.locator('.privacy-btn').click()
    await expect(page.locator('.privacy-btn')).toHaveClass(/privacy-btn--on/)
    // Toggle off
    await page.locator('.privacy-btn').click()
    await expect(page.locator('.privacy-btn')).not.toHaveClass(/privacy-btn--on/)
  })
})

// ─────────────────────────────────────────────
// 15. TRANSACTION PIN PAD
// ─────────────────────────────────────────────
test.describe('Transaction PIN Pad', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/payments"]')
    await page.waitForURL('**/payments')
  })

  async function openPinPad(page) {
    await page.fill('input[placeholder*="john@example"]', 'John Doe')
    await page.selectOption('select', 'checking')
    await page.fill('input[type="number"]', '100')
    await page.fill('input[placeholder*="payment for"]', 'Test payment')
    await page.click('button[type="submit"]')
    await page.waitForSelector('.pinpad-overlay', { state: 'visible' })
  }

  test('PIN pad appears after submitting payment form', async ({ page }) => {
    await openPinPad(page)
    await expect(page.locator('.pinpad-overlay')).toBeVisible()
    await expect(page.locator('.pinpad-modal')).toBeVisible()
  })

  test('PIN pad shows 4 empty dots initially', async ({ page }) => {
    await openPinPad(page)
    const dots = page.locator('.pinpad-dot')
    await expect(dots).toHaveCount(4)
    await expect(page.locator('.pinpad-dot--filled')).toHaveCount(0)
  })

  test('pressing PIN digits fills dots', async ({ page }) => {
    await openPinPad(page)
    await page.locator('.pinpad-key').filter({ hasText: '1' }).click()
    await page.locator('.pinpad-key').filter({ hasText: '2' }).click()
    await expect(page.locator('.pinpad-dot--filled')).toHaveCount(2)
  })

  test('wrong PIN shows error and clears digits', async ({ page }) => {
    await openPinPad(page)
    for (const d of ['9', '9', '9', '9']) {
      await page.locator('.pinpad-key').filter({ hasText: d }).click()
    }
    await expect(page.locator('.pinpad-error')).toBeVisible()
    await expect(page.locator('.pinpad-dot--filled')).toHaveCount(0)
  })

  test('correct PIN (1234) closes modal and shows success', async ({ page }) => {
    await openPinPad(page)
    for (const d of ['1', '2', '3', '4']) {
      await page.locator('.pinpad-key').filter({ hasText: d }).click()
    }
    await expect(page.locator('.pinpad-overlay')).not.toBeVisible()
    await expect(page.locator('.payment-success')).toBeVisible()
  })

  test('cancel button closes PIN pad', async ({ page }) => {
    await openPinPad(page)
    await page.locator('.pinpad-key--cancel').click()
    await expect(page.locator('.pinpad-overlay')).not.toBeVisible()
  })

  test('backspace removes last digit', async ({ page }) => {
    await openPinPad(page)
    await page.locator('.pinpad-key').filter({ hasText: '1' }).click()
    await page.locator('.pinpad-key').filter({ hasText: '2' }).click()
    await expect(page.locator('.pinpad-dot--filled')).toHaveCount(2)
    await page.locator('.pinpad-key').filter({ hasText: '⌫' }).click()
    await expect(page.locator('.pinpad-dot--filled')).toHaveCount(1)
  })
})

// ─────────────────────────────────────────────
// 16. ANTI-PHISHING PHRASE
// ─────────────────────────────────────────────
test.describe('Anti-phishing Phrase', () => {
  test('phrase does not appear initially', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await expect(page.locator('.phishing-phrase')).not.toBeVisible()
  })

  test('phrase appears after recognized email is blurred', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await typeInto(page, '#email', 'demo@novabanc.com')
    // blur is already triggered by typeInto
    await expect(page.locator('.phishing-phrase')).toBeVisible()
    await expect(page.locator('.phishing-phrase')).toContainText('Golden Sunrise Dolphin')
  })

  test('phrase disappears for unknown email', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    // First show phrase with known email
    await typeInto(page, '#email', 'demo@novabanc.com')
    await expect(page.locator('.phishing-phrase')).toBeVisible()
    // Clear and type unknown email
    await page.locator('#email').click({ clickCount: 3 })
    await page.locator('#email').pressSequentially('unknown@test.com', { delay: 0 })
    await page.locator('#email').blur()
    await expect(page.locator('.phishing-phrase')).not.toBeVisible()
  })

  test('phrase has shield icon', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await typeInto(page, '#email', 'demo@novabanc.com')
    await expect(page.locator('.phishing-phrase svg')).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 17. BIOMETRIC LOGIN
// ─────────────────────────────────────────────
test.describe('Biometric Login', () => {
  // Biometric button lives on Step 2 (password step) of the wizard
  async function goToStep2(page) {
    await page.goto(`${BASE}/login`)
    await typeInto(page, '#email', EMAIL)
    await page.locator('button[type="submit"]').click()
    await page.waitForSelector('#password', { state: 'visible', timeout: 5000 })
  }

  test('biometric button is visible on login page', async ({ page }) => {
    await goToStep2(page)
    await expect(page.locator('.biometric-btn')).toBeVisible()
  })

  test('biometric button shows scanning state when clicked', async ({ page }) => {
    await goToStep2(page)
    await page.locator('.biometric-btn').click()
    await expect(page.locator('.biometric-btn')).toContainText('Scanning')
  })

  test('biometric login eventually redirects to dashboard', async ({ page }) => {
    await goToStep2(page)
    await page.locator('.biometric-btn').click()
    // Biometric takes ~2.4s (1800ms scan + 600ms success delay)
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await expect(page).toHaveURL(/dashboard/)
  })
})

// ─────────────────────────────────────────────
// 18. SECURITY SCORE WIDGET
// ─────────────────────────────────────────────
test.describe('Security Score Widget', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/profile"]')
    await page.waitForURL('**/profile')
    await page.click('text=Security')
  })

  test('security score block is visible on security tab', async ({ page }) => {
    await expect(page.locator('.security-score-block')).toBeVisible()
  })

  test('score ring shows numeric score', async ({ page }) => {
    await expect(page.locator('.score-ring-label')).toBeVisible()
    const text = await page.locator('.score-ring-label').textContent()
    expect(text).toMatch(/\d+/)
  })

  test('score checklist items are visible', async ({ page }) => {
    await expect(page.locator('.score-checklist')).toBeVisible()
    const items = page.locator('.score-check')
    await expect(items.first()).toBeVisible()
  })

  test('score checklist contains 2FA and password items', async ({ page }) => {
    await expect(page.locator('.score-checklist')).toContainText('2FA')
    await expect(page.locator('.score-checklist')).toContainText('password')
  })
})

// ─────────────────────────────────────────────
// 19. TRUSTED DEVICES
// ─────────────────────────────────────────────
test.describe('Trusted Devices', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/profile"]')
    await page.waitForURL('**/profile')
    await page.click('text=Security')
  })

  test('trusted devices section is visible', async ({ page }) => {
    await expect(page.locator('.trusted-device-item').first()).toBeVisible()
  })

  test('device items show device name and date', async ({ page }) => {
    const item = page.locator('.trusted-device-item').first()
    await expect(item.locator('.trusted-device-info strong')).toBeVisible()
    await expect(item.locator('.trusted-device-info > span')).toBeVisible()
  })

  test('removing a trusted device reduces count', async ({ page }) => {
    const initial = await page.locator('.trusted-device-item').count()
    // Find a non-current device and remove it
    await page.locator('.trusted-device-item').filter({ hasText: 'Remove' }).first().locator('button:has-text("Remove")').click()
    const updated = await page.locator('.trusted-device-item').count()
    expect(updated).toBe(initial - 1)
  })

  test('current device has no remove button', async ({ page }) => {
    const currentDevice = page.locator('.trusted-device-item').filter({ hasText: 'Current' })
    await expect(currentDevice).toBeVisible()
    await expect(currentDevice.locator('button:has-text("Remove")')).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 20. OTP VERIFICATION FOR PASSWORD CHANGE
// ─────────────────────────────────────────────
test.describe('OTP Verification for Password Change', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/profile"]')
    await page.waitForURL('**/profile')
    await page.click('text=Security')
    // Expand the password change form
    await page.locator('.sec-block').filter({ hasText: 'Password' }).locator('button:has-text("Change")').click()
    // Fill valid password form
    const inputs = page.locator('.change-pw-form input[type="password"]')
    await inputs.nth(0).fill('password')
    await inputs.nth(1).fill('NewSecure@123!')
    await inputs.nth(2).fill('NewSecure@123!')
    await page.locator('.change-pw-form button[type="submit"]').click()
  })

  test('OTP modal appears after clicking Update Password', async ({ page }) => {
    await expect(page.locator('.otp-overlay')).toBeVisible()
    await expect(page.locator('.otp-modal')).toBeVisible()
  })

  test('OTP modal shows 6 input boxes', async ({ page }) => {
    await expect(page.locator('.otp-input')).toHaveCount(6)
  })

  test('wrong OTP shows error message', async ({ page }) => {
    const inputs = page.locator('.otp-input')
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill('9')
    }
    await page.locator('.otp-modal .btn-primary').click()
    await expect(page.locator('.otp-error')).toBeVisible()
    await expect(page.locator('.otp-error')).toContainText('Incorrect')
  })

  test('correct OTP (123456) closes modal and saves password', async ({ page }) => {
    const inputs = page.locator('.otp-input')
    const digits = ['1', '2', '3', '4', '5', '6']
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill(digits[i])
    }
    await page.locator('.otp-modal .btn-primary').click()
    await expect(page.locator('.otp-overlay')).not.toBeVisible()
    await expect(page.locator('.save-success')).toBeVisible()
  })

  test('cancel button closes OTP modal', async ({ page }) => {
    await page.locator('.otp-modal .btn-outline').click()
    await expect(page.locator('.otp-overlay')).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 21. ACCOUNT FREEZE
// ─────────────────────────────────────────────
test.describe('Account Freeze', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.click('a[href="/accounts"]')
    await page.waitForURL('**/accounts')
  })

  test('freeze button is visible in account detail', async ({ page }) => {
    await expect(page.locator('.detail-actions .btn-danger')).toBeVisible()
    await expect(page.locator('.detail-actions .btn-danger')).toContainText('Freeze')
  })

  test('clicking freeze shows frozen banner', async ({ page }) => {
    await page.locator('.detail-actions .btn-danger').click()
    await expect(page.locator('.account-frozen-banner')).toBeVisible()
  })

  test('frozen account shows Frozen status badge', async ({ page }) => {
    await page.locator('.detail-actions .btn-danger').click()
    await expect(page.locator('.status--frozen')).toBeVisible()
  })

  test('Transfer Funds button is disabled when account is frozen', async ({ page }) => {
    await page.locator('.detail-actions .btn-danger').click()
    await expect(page.locator('.detail-actions .btn-primary')).toBeDisabled()
  })

  test('freeze button changes to Unfreeze after freezing', async ({ page }) => {
    await page.locator('.detail-actions .btn-danger').click()
    await expect(page.locator('.detail-actions .btn-success')).toBeVisible()
    await expect(page.locator('.detail-actions .btn-success')).toContainText('Unfreeze')
  })

  test('clicking Unfreeze restores account to active state', async ({ page }) => {
    await page.locator('.detail-actions .btn-danger').click()
    await page.locator('.detail-actions .btn-success').click()
    await expect(page.locator('.account-frozen-banner')).not.toBeVisible()
    await expect(page.locator('.detail-actions .btn-primary')).not.toBeDisabled()
  })

  test('other accounts remain unfrozen when one is frozen', async ({ page }) => {
    // Freeze first account
    await page.locator('.detail-actions .btn-danger').click()
    // Switch to second account
    await page.locator('.account-card').nth(1).click()
    await expect(page.locator('.account-frozen-banner')).not.toBeVisible()
    await expect(page.locator('.detail-actions .btn-primary')).not.toBeDisabled()
  })
})
