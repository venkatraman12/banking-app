---
name: Login Step Transition — Timing Failure Pattern (RESOLVED)
description: Previously known failure mode where tests timed out waiting for #password field; all 3 Login Page tests now pass as of 2026-03-29
type: project
---

As of 2026-03-29 all 3 Login Page tests pass cleanly in a single attempt (12.8s total, no retries, empty test-results/ directory).

Prior failure pattern (now resolved): Tests "shows error on wrong credentials" and "redirects to dashboard on valid login" both failed with `TimeoutError: Timeout 5000ms exceeded waiting for #password to be visible`. The page remained on Step 1 after the email Continue button click. Suspected causes were the blur-triggered phishing-phrase layout shift covering the button, or React state not yet reflecting the typed email when the click fired.

**Why:** The bug was documented as causing 2 of 3 Login Page tests to fail consistently.

**How to apply:** If the timing failure resurfaces, revisit the blur/phishing-phrase layout-shift hypothesis and check whether the Continue button is momentarily covered or disabled at click time.
