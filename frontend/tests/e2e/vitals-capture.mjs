/**
 * Captures Web Vitals from the browser console using Playwright.
 * Navigates to /login, waits for early metrics, then navigates away to flush final ones.
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3000'
const collected = {}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

page.on('console', msg => {
  const text = msg.text()
  if (text.startsWith('[Web Vitals]')) {
    const match = text.match(/\[Web Vitals\] (\w+): ([\d.]+)ms \(rating: (\w+)\)/)
    if (match) collected[match[1]] = { value: parseFloat(match[2]), rating: match[3] }
  }
})

// Login page
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

// Navigate away to flush LCP, CLS, INP
await page.goto('about:blank')
await page.waitForTimeout(500)

// Root redirect
const page2 = await browser.newPage()
page2.on('console', msg => {
  const text = msg.text()
  if (text.startsWith('[Web Vitals]')) {
    const match = text.match(/\[Web Vitals\] (\w+): ([\d.]+)ms \(rating: (\w+)\)/)
    if (match) collected[match[1]] = { value: parseFloat(match[2]), rating: match[3] }
  }
})
await page2.goto(BASE, { waitUntil: 'networkidle' })
await page2.waitForTimeout(2000)
await page2.goto('about:blank')
await page2.waitForTimeout(500)

await browser.close()

const RATINGS = { good: '✅', 'needs-improvement': '⚠️', poor: '❌' }
const ORDER = ['TTFB', 'FCP', 'LCP', 'CLS', 'INP']

console.log('\n╔══════════════════════════════════════════╗')
console.log('║         Web Vitals Report (dev mode)     ║')
console.log('╠══════════════════════════════════════════╣')
for (const name of ORDER) {
  const m = collected[name]
  if (m) {
    const icon = RATINGS[m.rating] || '❓'
    const unit = name === 'CLS' ? '' : 'ms'
    console.log(`║  ${icon} ${name.padEnd(6)} ${String(m.value.toFixed(1) + unit).padStart(12)}   (${m.rating.padEnd(18)}) ║`)
  } else {
    console.log(`║  ❓ ${name.padEnd(6)} ${'—'.padStart(12)}   (${'not captured'.padEnd(18)}) ║`)
  }
}
console.log('╚══════════════════════════════════════════╝')
console.log()
console.log('Thresholds: TTFB <800ms | FCP <1.8s | LCP <2.5s | CLS <0.1 | INP <200ms')
