---
name: Frontend Test Configuration
description: Test runner, config location, and key behavioral details for the NovaBanc frontend
type: project
---

Test runner is Playwright (not Vitest/Jest). Config at `frontend/playwright.config.js`.

- All E2E specs live in `frontend/tests/e2e/`
- Main spec: `banking-app.spec.js`
- Performance spec: `performance.spec.js` (overrides slowMo: 0, uses CDP)
- Lighthouse spec: `lighthouse.spec.js` (ESM dynamic import only)
- `playwright.config.js` sets `headless: false`, `slowMo: 600ms`, `retries: 1`, Chromium only
- Dev server auto-starts via `webServer` config in playwright.config.js

Key test helpers in `banking-app.spec.js`:
- `typeInto(page, selector, text)` — uses `pressSequentially` + rAF poll to ensure React state reflects value before proceeding
- `login(page)` — 3-step wizard helper: email → password → OTP

**Why:** `fill()` does not reliably trigger React onChange; `click()` + `keyboard.type()` / `pressSequentially` is required.

**How to apply:** Always use `typeInto()` or equivalent when writing new Playwright tests for this app's React inputs.
