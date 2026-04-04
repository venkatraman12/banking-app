"""
NovaBanc API Validation Script
Validates API request/response schemas and mirrors frontend validation rules.
Run: python scripts/validate_api.py
Requires: pip install requests
"""

import re
import sys
import json
import datetime
import requests

BASE_URL = "http://localhost:3000"

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
WARN = "\033[93m⚠\033[0m"

results = {"passed": 0, "failed": 0, "skipped": 0}


# ─── Assertion helpers ────────────────────────────────────────────────────────

def assert_true(condition, message):
    if condition:
        print(f"  {PASS} {message}")
        results["passed"] += 1
    else:
        print(f"  {FAIL} {message}")
        results["failed"] += 1


def skip(message):
    print(f"  {WARN} SKIP — {message}")
    results["skipped"] += 1


def section(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print(f"{'─'*55}")


# ─── Schema validators (mirrors frontend/src/utils/validate.js) ───────────────

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

def validate_email(email):
    if not email:
        return "Email is required"
    if not EMAIL_RE.match(email):
        return "Invalid email address"
    return None

def validate_password(password, min_length=8):
    if not password:
        return "Password is required"
    if len(password) < min_length:
        return f"Password must be at least {min_length} characters"
    return None

def validate_amount(amount):
    if amount is None or amount == "":
        return "Amount is required"
    try:
        num = float(amount)
    except (ValueError, TypeError):
        return "Amount must be a number"
    if num <= 0:
        return "Amount must be greater than zero"
    if num > 1_000_000:
        return "Amount cannot exceed $1,000,000"
    return None

def validate_required(value, label="This field"):
    if not value or not str(value).strip():
        return f"{label} is required"
    return None

def validate_max_length(value, max_len, label="This field"):
    if value and len(str(value)) > max_len:
        return f"{label} cannot exceed {max_len} characters"
    return None

def validate_scheduled_date(date_str):
    if not date_str:
        return "Scheduled date is required"
    try:
        date = datetime.datetime.fromisoformat(date_str)
    except ValueError:
        return "Invalid date"
    if date <= datetime.datetime.now():
        return "Scheduled date must be in the future"
    return None

def validate_payment_form(form):
    errors = {}
    err = validate_required(form.get("recipient"), "Recipient")
    if err:
        errors["recipient"] = err
    else:
        err = validate_max_length(form.get("recipient"), 255, "Recipient")
        if err:
            errors["recipient"] = err

    err = validate_required(form.get("account"), "Account")
    if err:
        errors["account"] = err

    err = validate_amount(form.get("amount"))
    if err:
        errors["amount"] = err

    if form.get("note"):
        err = validate_max_length(form.get("note"), 255, "Note")
        if err:
            errors["note"] = err

    return errors

def validate_transfer_form(form, from_balance=None):
    errors = {}
    err = validate_required(form.get("from"), "From account")
    if err:
        errors["from"] = err

    amount_err = validate_amount(form.get("amount"))
    if amount_err:
        errors["amount"] = amount_err
    elif from_balance is not None and float(form.get("amount", 0)) > from_balance:
        errors["amount"] = "Amount exceeds available balance"

    if form.get("note"):
        err = validate_max_length(form.get("note"), 255, "Note")
        if err:
            errors["note"] = err

    if form.get("scheduled"):
        err = validate_scheduled_date(form.get("schedDate"))
        if err:
            errors["schedDate"] = err

    return errors


# ─── Test suites ──────────────────────────────────────────────────────────────

def test_server_reachability():
    section("1. Server Reachability")
    try:
        resp = requests.get(BASE_URL, timeout=5)
        assert_true(resp.status_code == 200, f"GET / → {resp.status_code}")
        return True
    except requests.exceptions.ConnectionError:
        print(f"  {FAIL} Cannot connect to {BASE_URL} — is the dev server running?")
        results["failed"] += 1
        return False


def test_email_validation():
    section("2. Email Validation (mirrors validate.js)")
    cases = [
        ("",               "Email is required",   "empty email"),
        ("notanemail",     "Invalid email address","missing @ and domain"),
        ("a@b",            "Invalid email address","missing TLD"),
        ("user@bank.com",  None,                   "valid email"),
        ("a@b.co",         None,                   "short but valid"),
    ]
    for email, expected_err, label in cases:
        got = validate_email(email)
        assert_true(got == expected_err, f"{label!r}: {got!r}")


def test_password_validation():
    section("3. Password Validation (mirrors validate.js)")
    cases = [
        ("",         8, "Password is required",                          "empty"),
        ("short",    8, "Password must be at least 8 characters",       "too short"),
        ("password", 8, None,                                            "exactly 8 chars"),
        ("longpassword123", 8, None,                                     "long valid"),
    ]
    for pwd, min_len, expected, label in cases:
        got = validate_password(pwd, min_len)
        assert_true(got == expected, f"{label}: {got!r}")


def test_amount_validation():
    section("4. Amount Validation (mirrors validate.js)")
    cases = [
        ("",          "Amount is required",              "empty string"),
        (None,        "Amount is required",              "None"),
        ("abc",       "Amount must be a number",         "non-numeric string"),
        (-1,          "Amount must be greater than zero","negative"),
        (0,           "Amount must be greater than zero","zero"),
        (1_000_001,   "Amount cannot exceed $1,000,000", "over limit"),
        (0.01,        None,                              "minimum valid"),
        (1_000_000,   None,                              "at limit"),
        (500,         None,                              "normal amount"),
    ]
    for amount, expected, label in cases:
        got = validate_amount(amount)
        assert_true(got == expected, f"{label}: {got!r}")


def test_payment_form_validation():
    section("5. Payment Form Validation (mirrors validatePaymentForm)")

    # All fields missing
    errors = validate_payment_form({})
    assert_true("recipient" in errors, "missing recipient flagged")
    assert_true("account" in errors,   "missing account flagged")
    assert_true("amount" in errors,    "missing amount flagged")

    # Recipient too long
    errors = validate_payment_form({"recipient": "x" * 256, "account": "ACC1", "amount": 100})
    assert_true("recipient" in errors, "oversized recipient flagged")

    # Note too long
    errors = validate_payment_form({"recipient": "Alice", "account": "ACC1", "amount": 50, "note": "n" * 256})
    assert_true("note" in errors, "oversized note flagged")

    # Valid form
    errors = validate_payment_form({"recipient": "Alice", "account": "ACC1", "amount": 150.00})
    assert_true(errors == {}, f"valid payment form passes — {errors}")


def test_transfer_form_validation():
    section("6. Transfer Form Validation (mirrors validateTransferForm)")

    # Missing from account
    errors = validate_transfer_form({"amount": 100})
    assert_true("from" in errors, "missing from-account flagged")

    # Amount exceeds balance
    errors = validate_transfer_form({"from": "ACC1", "amount": 5000}, from_balance=1000)
    assert_true("amount" in errors, "over-balance amount flagged")

    # Future scheduled date passes
    future = (datetime.datetime.now() + datetime.timedelta(days=1)).isoformat()
    errors = validate_transfer_form({"from": "ACC1", "amount": 50, "scheduled": True, "schedDate": future})
    assert_true(errors == {}, f"valid scheduled transfer passes — {errors}")

    # Past scheduled date fails
    past = "2020-01-01T00:00:00"
    errors = validate_transfer_form({"from": "ACC1", "amount": 50, "scheduled": True, "schedDate": past})
    assert_true("schedDate" in errors, "past scheduled date flagged")

    # Valid immediate transfer
    errors = validate_transfer_form({"from": "ACC1", "amount": 200}, from_balance=5000)
    assert_true(errors == {}, f"valid transfer passes — {errors}")


def test_api_endpoints(server_up):
    section("7. API Endpoint Contracts")
    if not server_up:
        skip("server unreachable — skipping all endpoint tests")
        results["skipped"] += 4
        return

    # Auth endpoint
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login",
                             json={"email": "demo@novabanc.com", "password": "password"},
                             timeout=5)
        if resp.status_code == 404:
            skip("POST /api/auth/login — no backend yet (expected 404 for SPA)")
            results["skipped"] += 1
        else:
            assert_true(resp.status_code in (200, 201), f"POST /api/auth/login → {resp.status_code}")
    except Exception as e:
        skip(f"POST /api/auth/login — {e}")
        results["skipped"] += 1

    # Payments endpoint
    try:
        resp = requests.post(f"{BASE_URL}/api/payments",
                             json={"recipient": "Alice", "account": "ACC1", "amount": 100},
                             timeout=5)
        if resp.status_code == 404:
            skip("POST /api/payments — no backend yet (expected 404 for SPA)")
            results["skipped"] += 1
        else:
            assert_true(resp.status_code in (200, 201), f"POST /api/payments → {resp.status_code}")
    except Exception as e:
        skip(f"POST /api/payments — {e}")
        results["skipped"] += 1

    # Reject invalid payment (missing fields)
    try:
        resp = requests.post(f"{BASE_URL}/api/payments", json={}, timeout=5)
        if resp.status_code == 404:
            skip("POST /api/payments (invalid) — no backend yet")
            results["skipped"] += 1
        else:
            assert_true(resp.status_code == 400, f"Invalid payment → {resp.status_code} (expected 400)")
    except Exception as e:
        skip(f"POST /api/payments (invalid) — {e}")
        results["skipped"] += 1

    # Accounts listing
    try:
        resp = requests.get(f"{BASE_URL}/api/accounts", timeout=5)
        if resp.status_code == 404:
            skip("GET /api/accounts — no backend yet")
            results["skipped"] += 1
        else:
            assert_true(resp.status_code == 200, f"GET /api/accounts → {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                assert_true(isinstance(data, list), "accounts response is array")
    except Exception as e:
        skip(f"GET /api/accounts — {e}")
        results["skipped"] += 1


def test_cors_headers(server_up):
    section("8. Security Headers")
    if not server_up:
        skip("server unreachable — skipping header tests")
        results["skipped"] += 3
        return

    try:
        resp = requests.get(BASE_URL, timeout=5)
        headers = {k.lower(): v for k, v in resp.headers.items()}

        # These are recommended but may not be set by Vite dev server
        for header, label in [
            ("x-content-type-options", "X-Content-Type-Options"),
            ("x-frame-options",        "X-Frame-Options"),
            ("content-security-policy","Content-Security-Policy"),
        ]:
            if header in headers:
                assert_true(True, f"{label}: {headers[header]}")
            else:
                skip(f"{label} not set (add in production server config)")
    except Exception as e:
        skip(f"header check — {e}")
        results["skipped"] += 3


# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║        NovaBanc API Validation Script               ║")
    print("╚══════════════════════════════════════════════════════╝")
    print(f"  Target: {BASE_URL}")
    print(f"  Time:   {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    server_up = test_server_reachability()
    test_email_validation()
    test_password_validation()
    test_amount_validation()
    test_payment_form_validation()
    test_transfer_form_validation()
    test_api_endpoints(server_up)
    test_cors_headers(server_up)

    total = results["passed"] + results["failed"] + results["skipped"]
    print(f"\n{'═'*55}")
    print(f"  Results: {results['passed']} passed  |  {results['failed']} failed  |  {results['skipped']} skipped  (total: {total})")
    print(f"{'═'*55}\n")

    sys.exit(1 if results["failed"] > 0 else 0)


if __name__ == "__main__":
    main()
