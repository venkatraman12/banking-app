# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NovaBank — a full-stack banking demo app. The **frontend is wired to the Python FastAPI backend** (`python_backend/main.py`) on port 4000 via `frontend/src/api/client.js`. The Node.js backend (`backend/`) exposes the same API contract but is not currently wired to the frontend.

## Commands

### Run the full app
```bash
# Terminal 1 — backend (from python_backend/)
python3 -m uvicorn main:app --reload --port 4000

# Terminal 2 — frontend (from frontend/)
npm run dev   # localhost:3000, proxies API calls to localhost:4000
```

First backend start creates `python_backend/novabanc.db` and seeds:
- `demo@novabank.com` / `password` (user)
- `admin@novabank.com` / `admin1234` (admin, can hit `/admin/*` routes)

Schema changes are not migrated — delete `novabanc.db` and restart to re-seed.

### Frontend (`cd frontend` first)
```bash
npm run dev          # Dev server → localhost:3000
npm run build        # Production build
npm run preview      # Serve production build
npm run analyze      # Build + open bundle visualizer (dist/bundle-stats.html)

# Tests — dev server auto-starts if not running (playwright.config.js webServer)
npm test                                                         # All E2E tests (Chromium)
npm run test:perf                                                # Performance suite (CDP + Nav Timing)
npm run test:lighthouse                                          # Lighthouse audits
npm run test:mobile                                              # Mobile (Pixel 7, iPhone 15)
npm run test:browsers                                            # Firefox + WebKit (banking-app.spec.js only)
npm run test:all                                                 # All projects
npm run test:ui                                                  # Playwright UI mode
npm run test:agent                                               # Claude Agent SDK autonomous test runner
npm run test:agent:fix                                           # Agent runner with auto-fix mode
npx playwright test tests/e2e/banking-app.spec.js --project=chromium  # Single spec
npx playwright test --grep "Login"                               # Run tests matching a string
```

### Python Backend (`cd python_backend` first)
```bash
pip install -r requirements.txt                        # bcrypt, fastapi, sqlalchemy, python-jose…
python3 -m uvicorn main:app --reload --port 4000       # `uvicorn` CLI may not be on PATH; use `python3 -m`
rm novabanc.db && python3 -m uvicorn main:app --port 4000   # Reset DB + reseed
```

Env vars (all have dev defaults): `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `DATABASE_URL`, `DEMO_MODE` (set `false` to stop returning `demo_code` in login responses).

### Node.js Backend (`cd backend` first) — not currently used
```bash
npm run dev          # nodemon → localhost:5000
npm test             # Jest unit tests (tests/unit/**)
npm run db:migrate   # Prisma migration
npm run db:seed      # Seed database
npm run db:studio    # Prisma Studio GUI
```

### API smoke test
```bash
python3 python_backend/validate_api.py     # Validates request/response schemas end-to-end
```

## Architecture

### Auth flow (3-step, real backend)

Login wizard (`src/pages/auth/Login.jsx`) → backend challenge/response:

1. **Email** → client-side format check only.
2. **Password** → `POST /auth/login` returns `{ challenge_id, expires_in, demo_code? }`. Backend tracks failed attempts per user and returns **423 Locked** for 5 min after 5 failures (`UserModel.failed_logins`, `locked_until`). `demo_code` is included only when `DEMO_MODE=true`.
3. **OTP** → `POST /auth/otp/verify` with `{ challenge_id, code }` → returns `{ access_token, refresh_token, user }`. Access token is JWT HS256, 15 min; refresh 7 days.

`tokenStore` in `src/api/client.js` persists `nova-access-token`, `nova-refresh-token`, `nova-user` in localStorage. `api.*` methods auto-inject `Authorization: Bearer <token>`. On 4xx/5xx, `request()` throws `ApiError(status, message, body)`.

App boot (`src/App.jsx`): if token in localStorage, call `api.me()` to revalidate; on failure clear tokens and show login. Logout posts refresh token to `/auth/logout` (stored as revoked in `refresh_tokens` table).

**Biometric button** reuses the same two endpoints with the demo credentials — it's a shortcut, not a separate auth path.

### Backend data model (SQLAlchemy, SQLite)

Single-file app in `python_backend/main.py`. Key tables:
- `users` — PII (name, dob, national_id, address_*) + `password_hash` (bcrypt, 72-byte truncated), `failed_logins`, `locked_until`
- `accounts`, `transactions`, `cards`, `loans`, `savings_goals`, `investments`
- **Audit tables** (admin-only reads): `login_attempts` (every login try w/ IP + UA), `auth_logs` (semantic events: login_success, otp_verified, password_changed…), `devices` (fingerprint = `sha256(ua|ip)[:32]`, not bcrypt — bcrypt has 72-byte ceiling), `mfa_codes` (active OTP challenges, 5-min TTL)
- `refresh_tokens` — revocation list

`seed_demo_data()` runs once on startup if no users exist; creates demo + admin users plus sample accounts/transactions/cards/loans/savings/investments.

### Frontend ↔ backend wiring

`src/api/client.js` is the single API entry point. Every page that displays persisted data fetches through it on mount:

| Page | Endpoint(s) |
|------|-------------|
| Dashboard | `getAccounts`, `getTransactions`, `getTxStats` |
| Accounts | `getAccounts`, `updateAccount` (freeze/unfreeze) |
| Transactions | `getAccounts` + `getTransactions` (signs amount by comparing `toAccountId` to user's account ids) |
| Transfer | `getAccounts`, `transfer` (own-account only; external is still simulated) |
| Cards | `getCards`, `updateCard` (freeze/block/limit), `deleteCard` |
| Loans | `getLoans` |
| API Keys | `getApiKeys`, `createApiKey`, `revokeApiKey` |
| Internal | **client-side only** — reads from `telemetry.js` (localStorage); shows API call counts, errors, session info, and a presentational cloud-backup wizard. No backend calls. |

Savings, Investments, Payments, Analytics, Profile, Security pages are **not yet wired** — they still render hardcoded data.

Admin-only endpoints (require `admin@novabank.com` login): `getAuthLogs` → `/admin/auth-logs`, `getLoginAttempts` → `/admin/login-attempts`, `getAllDevices` → `/admin/devices`. These are defined in `client.js` but no frontend page consumes them yet.

**Presentation-only fields** (color, icon, bg gradient, trend %) are added client-side via lookup tables keyed on account type / card type / loan type. Backend doesn't store them.

### Frontend state & context

**Context tree** (outermost first): `SecurityProvider` → `ToastProvider` → `BrowserRouter` → `AppContent`

- **SecurityContext** (`src/context/SecurityContext.jsx`) — single source for `privacyMode`, `accountFrozen`, `securityAlerts`, `csrfToken`, `sessionId`. `privacy-mode` CSS class on root div (set when `privacyMode` is true) triggers blur rules in `globals.css`.
- **ToastContext** — `useToast()` returns `{ show, success, error, warning, info }`; auto-dismiss 4s.
- **Dark mode** — persisted in `localStorage['nova-theme']`; sets `data-theme="dark"` on `<html>`. CSS vars in `globals.css` respond.
- **Inactivity timeout** — `App.jsx` drives a 5-min idle → 60s warning modal → auto-logout (which also hits `/auth/logout`). Resets on `mousemove`, `keydown`, `mousedown`, `touchstart`, `scroll`.

### CSP note

`frontend/index.html` ships a strict CSP `<meta>`. Adding a new backend origin or external host requires updating the `connect-src` list there. Currently whitelisted: `ws://localhost:3000`, `http://localhost:5000` (Node backend, unused), `http://localhost:4000` (Python backend).

### Login UX (client-side in addition to real backend)

- Lockout duration is displayed from the 423 error message returned by the backend (parsed as seconds).
- Anti-phishing phrase on step 2: `'Golden Sunrise Dolphin'` (client-only cosmetic).
- CAPTCHA toggle after repeated failures — visual only, doesn't gate submit.
- OTP 30s resend timer; resend re-hits `/auth/login` to mint a new challenge.
- Risk assessment (`src/utils/security.js` → `assessLoginRisk()`) — client heuristic on device/time-of-day, doesn't touch the backend.

### Playwright testing

- `playwright.config.js` — `headless: false`, `slowMo: 600ms`, `retries: 1`, Chromium default; Firefox/WebKit only for `banking-app.spec.js`.
- `webServer` auto-starts only the frontend (`npm run dev`). **The Python backend must be running separately** or any test that calls `login()` will fail with "Unable to reach server".
- For form inputs, use `pressSequentially()` + explicit `blur()` — not `fill()` — because React onChange handlers only fire reliably that way. See `typeInto()` helpers in existing specs.
- Tests expect the demo user (`demo@novabank.com` / `password`). The OTP code is read dynamically from `.otp-hint-box strong` on the page (backend returns `demo_code` when `DEMO_MODE=true`).
- Account Freeze tests persist state in the DB. The `beforeEach` cleanup unfreeze logic uses `waitFor()` (not `isVisible()` which returns immediately in Playwright).
- For faster test runs: `PLAYWRIGHT_SLOW_MO=0 npx playwright test tests/e2e/banking-app.spec.js --project=chromium` (~3.5 min vs ~11 min with default slowMo).
- For clean test state: restart the backend with a fresh DB before running (`cd python_backend && rm novabanc.db && python3 -m uvicorn main:app --port 4000`).
- `test-agent.mjs` uses the Claude Agent SDK to run the suite and optionally fix failures (`test:agent:fix`).

### Performance tooling
- **Web Vitals**: auto-reports to browser console (CLS, FCP, INP, LCP, TTFB) in dev. INP fires only on real interactions.
- **Bundle visualizer**: `npm run analyze` → `dist/bundle-stats.html` with gzip + brotli sizes.
- **React Profiler**: active on Dashboard, Transactions, Payments — logs render timings in dev.
- **Lighthouse dev-mode note**: FCP/LCP will be ~10–20s in dev (unminified ~3 MB JS). Run against `npm run preview` for realistic scores. SEO score is capped at ~45 by design (`noindex, nofollow` in `index.html`).

### Key files to know

- `src/api/client.js` — `tokenStore`, `ApiError`, and the `api.*` method surface. All HTTP goes through here.
- `python_backend/main.py` — the entire backend (~1200 lines). Route definitions are listed top-to-bottom by resource; search for `@app.` to locate one.
- `src/pages/auth/Login.jsx` — 3-step wizard; branches on `ApiError.status` (401 bad password, 423 locked).
- `src/App.jsx` — auth bootstrapping + routes + inactivity modal. All authenticated routes nest under `AppLayout` via `<Outlet>`.
- `src/styles/globals.css` — CSS custom properties, dark-mode overrides, privacy-mode blur rules.
- `src/styles/components.css` — shared `.btn`, `.card`, `.form-input`, `.badge-*` classes used everywhere.
