/**
 * Lighthouse Audit Test Suite — NovaBank
 *
 * Runs programmatic Lighthouse audits against the live dev server.
 * Scores are 0–1 (1 = 100). Dev-mode thresholds are lenient;
 * production builds (npm run build && npm run preview) will score much higher.
 *
 * Run: npx playwright test tests/e2e/lighthouse.spec.js --project=chromium
 */

import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

// Dev-mode score thresholds (0–1). Bump these when running against a prod build.
const THRESHOLDS = {
  performance:    0.3,
  accessibility:  0.7,
  bestPractices:  0.7,
  seo:            0.4,  // intentionally low: noindex/nofollow set (banking app, not public-facing)
}

async function runLighthouse(url) {
  const { default: lighthouse } = await import('lighthouse')
  const { launch } = await import('chrome-launcher')

  const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox'] })

  const result = await lighthouse(url, {
    port: chrome.port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  })

  await chrome.kill()
  return result.lhr
}

// ─── LH-1: Login Page ───────────────────────────────────────────────────────

test.describe('LH-1: Login Page Lighthouse Audit', () => {
  test('login page meets score thresholds', async () => {
    const lhr = await runLighthouse(`${BASE}/login`)

    const scores = {
      performance:   lhr.categories.performance.score,
      accessibility: lhr.categories.accessibility.score,
      bestPractices: lhr.categories['best-practices'].score,
      seo:           lhr.categories.seo.score,
    }

    console.log('\n[Lighthouse] Login page scores:', Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, Math.round(v * 100)])
    ))

    // Key diagnostics
    const fcp  = lhr.audits['first-contentful-paint']?.numericValue
    const lcp  = lhr.audits['largest-contentful-paint']?.numericValue
    const tbt  = lhr.audits['total-blocking-time']?.numericValue
    const cls  = lhr.audits['cumulative-layout-shift']?.numericValue
    const ttfb = lhr.audits['server-response-time']?.numericValue

    console.log('\n[Lighthouse] Login page diagnostics (ms):',
      { fcp: fcp?.toFixed(0), lcp: lcp?.toFixed(0), tbt: tbt?.toFixed(0), cls: cls?.toFixed(3), ttfb: ttfb?.toFixed(0) }
    )

    expect(scores.performance,   'Performance score').toBeGreaterThanOrEqual(THRESHOLDS.performance)
    expect(scores.accessibility, 'Accessibility score').toBeGreaterThanOrEqual(THRESHOLDS.accessibility)
    expect(scores.bestPractices, 'Best Practices score').toBeGreaterThanOrEqual(THRESHOLDS.bestPractices)
    expect(scores.seo,           'SEO score').toBeGreaterThanOrEqual(THRESHOLDS.seo)
  })
})

// ─── LH-2: Dashboard Page ───────────────────────────────────────────────────
// Note: Dashboard requires auth — Lighthouse audits the login redirect instead.
// For a full authenticated audit, use a custom Chrome extension or session cookie injection.

test.describe('LH-2: Root / Redirect Audit', () => {
  test('root page meets score thresholds', async () => {
    const lhr = await runLighthouse(BASE)

    const scores = {
      performance:   lhr.categories.performance.score,
      accessibility: lhr.categories.accessibility.score,
      bestPractices: lhr.categories['best-practices'].score,
      seo:           lhr.categories.seo.score,
    }

    console.log('\n[Lighthouse] Root page scores:', Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, Math.round(v * 100)])
    ))

    expect(scores.performance,   'Performance score').toBeGreaterThanOrEqual(THRESHOLDS.performance)
    expect(scores.accessibility, 'Accessibility score').toBeGreaterThanOrEqual(THRESHOLDS.accessibility)
    expect(scores.bestPractices, 'Best Practices score').toBeGreaterThanOrEqual(THRESHOLDS.bestPractices)
    expect(scores.seo,           'SEO score').toBeGreaterThanOrEqual(THRESHOLDS.seo)
  })
})
