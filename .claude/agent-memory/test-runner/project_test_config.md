---
name: Playwright Test Configuration
description: Test runner setup, config location, commands, and known failure for the NovaBanc banking app
type: project
---

Playwright is the E2E test runner for this project. Config is at `frontend/playwright.config.js`. Tests live in `frontend/tests/e2e/` (three spec files: `banking-app.spec.js`, `chatbot.spec.js`, and `performance.spec.js`).

The config sets `headless: false` and `slowMo: 600` (intended for interactive dev use). It includes a `webServer` block that auto-starts `npm run dev` on localhost:3000 with `reuseExistingServer: true`, so the dev server does not need to be started manually before running tests.

**Run command:** `cd frontend && npx playwright test --reporter=list`

**Current status (as of 2026-04-01, latest confirmed run):** 20 passed, 1 failed (21 total). The only failure is in PF-5: Form Interaction Responsiveness.

**PF-5 failure (as of 2026-04-01):**
- `account freeze toggle responds within 250ms` — measured 331ms on first attempt, 308ms on retry (threshold is < 250ms). Fails consistently on both attempts. NOT flaky — consistently over threshold.

**PF-5 tests now passing (as of 2026-04-01):**
- `payment form validates instantly on submit` — measured 312ms (threshold was previously < 300ms but appears to have been raised or test updated).
- `transfer form validates instantly on submit` — measured 312ms (same).

Note: The freeze toggle threshold appears to have changed from 200ms (prior run) to 250ms (current), yet it still fails. The measured values (331ms, 308ms) are substantially over the 250ms threshold — more than just a timing jitter issue.

**banking-app.spec.js status (confirmed 2026-03-29, latest run):** All 87 tests pass. Run time: 6.2 minutes. Covers: Login Page (3), Dashboard (5), Accounts (4), Transactions (4), Payments (3), Loans (4), Profile (5), Cards (4), Transfer (4), Savings (4), Investments (5), Full Navigation Walkthrough (1), Security Headers (4), Privacy Mode (3), Transaction PIN Pad (6), Anti-phishing Phrase (4), Biometric Login (3), Security Score Widget (4), Trusted Devices (4), OTP Verification for Password Change (5), Account Freeze (7).

**Prior known failure (now resolved):** Login helper issue with `pressSequentially` not triggering React onChange was previously causing 18 performance test failures. All resolved as of 2026-04-01 run.
