# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NovaBanc — a full-stack banking demo app. The frontend is fully functional with client-side-only state (no real API calls yet). Two backend implementations exist (Node.js and Python) with identical APIs, but neither is wired to the frontend.

## Commands

### Frontend (`cd frontend` first)
```bash
npm run dev          # Dev server → localhost:3000
npm run build        # Production build
npm run preview      # Serve production build
npm run analyze      # Build + open bundle visualizer (dist/bundle-stats.html)

# Tests — dev server auto-starts if not running (playwright.config.js webServer)
npm test                    # All Playwright E2E tests
npm run test:perf           # Performance suite (performance.spec.js)
npm run test:lighthouse     # Lighthouse audits (lighthouse.spec.js)
npm run test:ui             # Playwright UI mode
npx playwright test tests/e2e/banking-app.spec.js  # Single spec
```

### Node.js Backend (`cd backend` first)
```bash
npm run dev          # nodemon → localhost:5000
npm test             # Jest unit tests (tests/unit/**)
npm run db:migrate   # Prisma migration
npm run db:seed      # Seed database
npm run db:studio    # Prisma Studio GUI
```

### Python Backend (`cd python_backend` first)
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 4000
```

## Architecture

### Frontend State Model
Auth is **client-side only** — `isAuthenticated` + `currentUser` live in `App.jsx` useState. There is no token, no localStorage, no real API. The login wizard sets these via `handleLogin(user)`.

**3-step login wizard** (Login.jsx): email → password → OTP. Demo credentials: `demo@novabanc.com` / `password` / OTP `123456`. For Playwright tests, use `click()` + `keyboard.type()` (not `fill()`) to reliably trigger React's onChange across all three steps.

**SecurityContext** (`src/context/SecurityContext.jsx`) wraps the entire app and is the single source of truth for: `privacyMode`, `accountFrozen`, `securityAlerts`, `csrfToken`, `sessionId`. Any component needing these calls `useSecurity()`.

**Inactivity timeout** lives in `App.jsx` — 5 min idle triggers a 60s warning modal, then auto-logout. Resets on mouse/key/touch/scroll events.

### Frontend Structure
- `src/App.jsx` — routing, auth state, inactivity timeout
- `src/context/SecurityContext.jsx` — privacy mode, account freeze, alerts
- `src/pages/` — one directory per page, each with `Page.jsx` + `Page.css`
- `src/styles/globals.css` — CSS custom properties (`--primary: #1a56db`, etc.)
- `src/styles/components.css` — shared classes: `.btn`, `.btn-primary`, `.btn-danger`, `.card`, `.form-input`, `.badge-*`
- `src/utils/` — `validate.js` (Zod-mirroring validators), `security.js` (CSRF/session), `downloadReceipt.js`

All routes are nested under the authenticated `AppLayout` outlet except `/login`. Unauthenticated access to any route redirects to `/login`.

### Backend (Node.js)
- `src/app.js` — Express app setup (helmet, cors, rate limiter, routes)
- `src/routes/` — one file per resource: auth, account, transaction, loan, card, savings, investment, user
- All routes under `/api/v1/`
- JWT auth (access + refresh tokens), bcrypt passwords, Zod validators, Prisma ORM → PostgreSQL
- Requires `backend/.env` (copy from `.env.example`)

### Python Backend
- `python_backend/main.py` — single-file FastAPI app, mirrors Node API exactly
- Same routes: `/api/v1/{auth,accounts,transactions,loans,cards,savings,investments}`
- Uses SQLite (`novabanc.db`) via SQLAlchemy instead of PostgreSQL

### Tests
**Playwright** (`frontend/tests/e2e/`):
- `playwright.config.js` — `headless: false`, `slowMo: 600ms`, `retries: 1`, Chromium only
- `performance.spec.js` — overrides `slowMo: 0`, uses CDP metrics + Navigation Timing API
- `lighthouse.spec.js` — programmatic Lighthouse via `chrome-launcher` + `lighthouse` npm packages (both ESM, use dynamic `import()` inside async functions, not `require()`)
- `vitals-capture.mjs` — standalone script to capture Web Vitals from browser console

**Jest** (`backend/tests/unit/`): `npm test` runs unit tests only (not integration).

### Performance Tooling
- **Web Vitals**: auto-reports to browser console (CLS, FCP, INP, LCP, TTFB) — open DevTools while running dev server. INP only fires on real user interactions.
- **Bundle visualizer**: `npm run analyze` generates `dist/bundle-stats.html` with gzip + brotli sizes.
- **React Profiler**: active on Dashboard, Transactions, Payments — logs render timings to console in dev.
- **Lighthouse dev-mode note**: FCP/LCP will be ~10–20s in dev (unminified 3MB JS). Run against `npm run preview` for realistic scores. SEO score is capped at ~45 by design (`noindex, nofollow` in index.html).
