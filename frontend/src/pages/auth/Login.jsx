import { useState, useEffect, useRef } from 'react'
import { validateEmail, validatePassword } from '../../utils/validate'
import { assessLoginRisk } from '../../utils/security'
import { api, tokenStore, ApiError } from '../../api/client'
import { useSecurity } from '../../context/SecurityContext'
import './Login.css'

const PHISHING_PHRASE = 'Golden Sunrise Dolphin'
const MAX_ATTEMPTS = 5

let _logId = 0

export default function Login({ onLogin }) {
  const { csrfToken, sessionId } = useSecurity()

  // Multi-step state
  const [step, setStep] = useState(1) // 1 | 2 | 3

  // Activity log
  const [loginLogs, setLoginLogs] = useState([])
  const [logsOpen, setLogsOpen] = useState(true)

  // Form values
  const [form, setForm] = useState({ email: '', password: '', otp: '' })

  // UI states
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [showPassword,   setShowPassword]   = useState(false)
  const [showPhrase,     setShowPhrase]     = useState(false)
  const [biometricState, setBiometricState] = useState('idle') // idle | scanning | success
  const [captchaSolved,  setCaptchaSolved]  = useState(false)
  const [loginRisk,      setLoginRisk]      = useState(null)

  // Lockout states (mirrors server-side lockout; server is source of truth)
  const [attempts,      setAttempts]      = useState(0)
  const [lockedUntil,   setLockedUntil]   = useState(null)
  const [lockCountdown, setLockCountdown] = useState(0)

  // OTP step states
  const [otpDigits,   setOtpDigits]   = useState(['', '', '', '', '', ''])
  const [otpTimer,    setOtpTimer]    = useState(30)
  const [otpError,    setOtpError]    = useState('')
  const [challengeId, setChallengeId] = useState(null)
  const [demoOtp,     setDemoOtp]     = useState(null)
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  const isLocked = lockedUntil && Date.now() < lockedUntil

  const addLog = (label, status, detail = '') => {
    setLoginLogs(prev => [{ id: ++_logId, ts: Date.now(), label, status, detail }, ...prev].slice(0, 20))
  }

  // OTP countdown timer — starts when we enter step 3
  useEffect(() => {
    if (step !== 3) return
    setOtpTimer(30)
    const interval = setInterval(() => {
      setOtpTimer(t => {
        if (t <= 1) {
          clearInterval(interval)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  const startLockout = (seconds) => {
    const until = Date.now() + seconds * 1000
    setLockedUntil(until)
    setLockCountdown(seconds)
    setCaptchaSolved(false)
    const interval = setInterval(() => {
      const remaining = Math.ceil((until - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(interval)
        setLockedUntil(null)
        setLockCountdown(0)
        setAttempts(0)
        setError('')
      } else {
        setLockCountdown(remaining)
      }
    }, 1000)
  }

  const handleEmailBlur = () => {
    if (form.email === 'demo@novabank.com') setShowPhrase(true)
    else setShowPhrase(false)
  }

  // Step 1: Email → proceed to Step 2
  const handleEmailContinue = (e) => {
    e.preventDefault()
    setError('')
    const emailErr = validateEmail(form.email)
    if (emailErr) { setError(emailErr); return }
    addLog('Email verified', 'success', form.email)
    setStep(2)
  }

  // Step 2: Password → proceed to Step 3 (OTP) via backend
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (isLocked) return
    setError('')

    const passErr = validatePassword(form.password, 1)
    if (passErr) { setError(passErr); return }

    setLoading(true)
    try {
      const res = await api.login(form.email, form.password)
      setAttempts(0)
      addLog('Password accepted', 'success')
      const risk = assessLoginRisk({ failedAttempts: attempts })
      if (risk.level !== 'low') setLoginRisk(risk)
      setChallengeId(res.data.challenge_id)
      setDemoOtp(res.data.demo_code || null)
      setStep(3)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 423) {
          const match = err.message.match(/(\d+)s/)
          const secs = match ? parseInt(match[1], 10) : 300
          startLockout(secs)
          addLog('Account locked', 'danger', `${secs}s lockout`)
          setError(err.message)
        } else if (err.status === 401) {
          const newAttempts = attempts + 1
          setAttempts(newAttempts)
          addLog('Password failed', 'danger', `attempt ${newAttempts}/${MAX_ATTEMPTS}`)
          const remaining = Math.max(0, 5 - newAttempts)
          setError(remaining > 0
            ? `Invalid password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : err.message)
        } else {
          setError(err.message)
        }
      } else {
        setError('Unable to reach server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Step 3: OTP verification
  const handleOtpDigit = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const newDigits = [...otpDigits]
    newDigits[index] = value
    setOtpDigits(newDigits)
    setOtpError('')
    // Auto-advance
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs[index - 1].current?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      otpRefs[index + 1].current?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      const newDigits = [...pasted.split(''), ...Array(6).fill('')].slice(0, 6)
      setOtpDigits(newDigits)
      const focusIdx = Math.min(pasted.length, 5)
      otpRefs[focusIdx].current?.focus()
    }
  }

  const handleOtpVerify = async (e) => {
    e.preventDefault()
    setOtpError('')
    const enteredOtp = otpDigits.join('')
    if (enteredOtp.length < 6) {
      setOtpError('Please enter all 6 digits.')
      return
    }
    if (!challengeId) {
      setOtpError('Session expired. Please sign in again.')
      setStep(1)
      return
    }
    setLoading(true)
    try {
      const res = await api.verifyOtp(challengeId, enteredOtp)
      addLog('Authenticated', 'success', 'OTP verified')
      const { access_token, refresh_token, user } = res.data
      tokenStore.set(access_token)
      tokenStore.setRefresh(refresh_token)
      tokenStore.setUser(user)
      onLogin(user)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Verification failed.'
      addLog('OTP failed', 'danger', msg)
      setOtpError(msg)
      setOtpDigits(['', '', '', '', '', ''])
      otpRefs[0].current?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleOtpResend = async () => {
    setOtpDigits(['', '', '', '', '', ''])
    setOtpError('')
    try {
      const res = await api.login(form.email, form.password)
      setChallengeId(res.data.challenge_id)
      setDemoOtp(res.data.demo_code || null)
      setOtpTimer(30)
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Could not resend code.')
    }
  }

  const handleBiometric = async () => {
    setBiometricState('scanning')
    addLog('Biometric scan', 'info')
    try {
      const login = await api.login('demo@novabank.com', 'password')
      await new Promise(r => setTimeout(r, 1200))
      const verify = await api.verifyOtp(login.data.challenge_id, login.data.demo_code)
      addLog('Biometric OK', 'success')
      setBiometricState('success')
      const { access_token, refresh_token, user } = verify.data
      tokenStore.set(access_token)
      tokenStore.setRefresh(refresh_token)
      tokenStore.setUser(user)
      await new Promise(r => setTimeout(r, 400))
      onLogin(user)
    } catch (err) {
      setBiometricState('idle')
      addLog('Biometric failed', 'danger')
      setError(err instanceof ApiError ? err.message : 'Biometric authentication failed.')
    }
  }

  const handleCaptchaChange = (checked) => {
    setCaptchaSolved(checked)
    if (checked) addLog('CAPTCHA passed', 'warning')
  }

  const needsCaptcha = attempts >= 3 && !isLocked

  const otpTimerPercent = (otpTimer / 30) * 100
  const otpTimerClass = otpTimer <= 5 ? 'otp-timer-bar--critical' : otpTimer <= 10 ? 'otp-timer-bar--warning' : ''

  return (
    <div className="login-page">
      {/* ── Left Panel ── */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 22h18M4 9h16M2 7l10-5 10 5M6 9v13M10 9v13M14 9v13M18 9v13"/>
            </svg>
          </div>
          <div>
            <span className="login-brand-name">NovaBank</span>
          </div>
        </div>

        <div className="login-hero">
          <h1>The future of<br /><span>banking, today.</span></h1>
          <p>Premium financial services with enterprise-grade security. Manage everything in one intelligent platform.</p>
        </div>

        {/* Step progress indicator */}
        <div className="login-step-progress">
          <div className="step-progress-label">Sign-in progress</div>
          <div className="step-progress-track">
            {[1, 2, 3].map(s => (
              <div key={s} className={`step-progress-node ${step > s ? 'step-progress-node--done' : step === s ? 'step-progress-node--active' : ''}`}>
                {step > s ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span>{s}</span>
                )}
              </div>
            ))}
            <div className="step-progress-line">
              <div className="step-progress-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
            </div>
          </div>
          <div className="step-progress-labels">
            <span className={step >= 1 ? 'active' : ''}>Email</span>
            <span className={step >= 2 ? 'active' : ''}>Password</span>
            <span className={step >= 3 ? 'active' : ''}>Verify</span>
          </div>
        </div>

        <div className="login-security-badges">
          <div className="sec-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            256-bit SSL Encryption
          </div>
          <div className="sec-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            FDIC Insured
          </div>
          <div className="sec-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            2FA Protected
          </div>
          <div className="sec-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Zero-Knowledge Auth
          </div>
        </div>

        <div className="login-stats">
          <div className="stat">
            <strong>2M+</strong>
            <span>Active Users</span>
          </div>
          <div className="stat">
            <strong>$50B+</strong>
            <span>Transactions</span>
          </div>
          <div className="stat">
            <strong>4.9★</strong>
            <span>App Rating</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="login-right">
        <div className="login-card">

          {/* ════════════ STEP 1: EMAIL ════════════ */}
          {step === 1 && (
            <div className="login-step" key="step1">
              <div className="login-card-header">
                <div className="login-step-badge">Step 1 of 3</div>
                <h2>Welcome back</h2>
                <p>Enter your email address to continue</p>
              </div>

              <form className="login-form" onSubmit={handleEmailContinue}>
                {error && (
                  <div className="login-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <div className="input-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      onBlur={handleEmailBlur}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {showPhrase && (
                  <div className="phishing-phrase">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Your security phrase: <strong>{PHISHING_PHRASE}</strong>
                  </div>
                )}

                <button type="submit" className="login-btn" disabled={!form.email}>
                  Continue
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </form>
            </div>
          )}

          {/* ════════════ STEP 2: PASSWORD ════════════ */}
          {step === 2 && (
            <div className="login-step" key="step2">
              <div className="login-card-header">
                <div className="login-step-badge">Step 2 of 3</div>
                <h2>Enter password</h2>
                <div className="login-email-row">
                  <span className="login-email-display">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {form.email}
                  </span>
                  <button type="button" className="login-change-btn" onClick={() => { setStep(1); setError(''); setAttempts(0); setLockedUntil(null) }}>
                    Change
                  </button>
                </div>
              </div>

              {loginRisk && loginRisk.level !== 'low' && (
                <div className={`login-risk-banner login-risk-banner--${loginRisk.level}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div>
                    <strong>Unusual Login Detected</strong>
                    <ul className="risk-flags">
                      {loginRisk.flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <form className="login-form" onSubmit={handlePasswordSubmit}>
                {error && (
                  <div className={`login-error ${isLocked ? 'login-error--locked' : ''}`}>
                    {isLocked ? (
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Account locked — retry in <strong>{lockCountdown}s</strong>
                        {lockoutCount > 1 && <span className="lockout-escalation"> (lockout #{lockoutCount})</span>}
                      </span>
                    ) : error}
                  </div>
                )}

                {attempts > 0 && !isLocked && (
                  <div className="attempt-dots">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <span key={i} className={`attempt-dot ${i < attempts ? 'attempt-dot--used' : ''}`} />
                    ))}
                    <span className="attempt-label">{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} left</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="password">
                    Password
                    <a href="#" className="forgot-link" onClick={e => e.preventDefault()}>Forgot password?</a>
                  </label>
                  <div className="input-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      autoComplete="current-password"
                      disabled={isLocked}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {needsCaptcha && (
                  <div className={`captcha-box ${captchaSolved ? 'captcha-box--solved' : ''}`}>
                    <label className="captcha-label">
                      <input type="checkbox" checked={captchaSolved} onChange={e => handleCaptchaChange(e.target.checked)} />
                      <span className="captcha-check-icon">
                        {captchaSolved ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <span className="captcha-empty-box" />
                        )}
                      </span>
                      <span>I am not a robot</span>
                    </label>
                    <div className="captcha-logo">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <span>reCAPTCHA</span>
                    </div>
                  </div>
                )}

                <button type="submit" className="login-btn" disabled={loading || isLocked || biometricState === 'scanning'}>
                  {loading ? (
                    <span className="spinner" />
                  ) : isLocked ? (
                    `Locked (${lockCountdown}s)`
                  ) : (
                    'Sign In'
                  )}
                </button>

                <button
                  type="button"
                  className="biometric-btn"
                  onClick={handleBiometric}
                  disabled={isLocked || biometricState === 'scanning'}
                >
                  {biometricState === 'scanning' ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16, borderColor: 'rgba(0,0,0,0.2)', borderTopColor: 'var(--primary)' }} />
                      Scanning biometrics…
                    </>
                  ) : biometricState === 'success' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Authenticated
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C9.5 2 7.5 3 6 5M12 2c2.5 0 4.5 1 6 3M12 22c-2.5 0-4.5-1-6-3M12 22c2.5 0 4.5-1 6-3"/>
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M3 9a9 9 0 0 0 0 6M21 9a9 9 0 0 1 0 6"/>
                      </svg>
                      Use Face ID / Fingerprint
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ════════════ STEP 3: OTP VERIFICATION ════════════ */}
          {step === 3 && (
            <div className="login-step" key="step3">
              <div className="login-card-header">
                <div className="login-step-badge login-step-badge--verify">Step 3 of 3</div>
                <div className="login-otp-icon-wrap">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                </div>
                <h2>Verify your identity</h2>
                <p>We've sent a 6-digit code to your authenticator app. Enter it below to complete sign-in.</p>
              </div>

              <form className="login-form" onSubmit={handleOtpVerify}>
                {/* TOTP Timer */}
                <div className="otp-timer-section">
                  <div className="otp-timer-bar-wrap">
                    <div
                      className={`otp-timer-bar ${otpTimerClass}`}
                      style={{ width: `${otpTimerPercent}%` }}
                    />
                  </div>
                  <div className="otp-timer-label">
                    Code expires in <strong>{otpTimer}s</strong>
                    {otpTimer === 0 && <span className="otp-timer-expired"> — Code expired</span>}
                  </div>
                </div>

                {/* OTP Input Grid */}
                <div className="otp-inputs-row">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={otpRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`otp-box-input ${digit ? 'otp-box-input--filled' : ''}`}
                      value={digit}
                      onChange={e => handleOtpDigit(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="login-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {otpError}
                  </div>
                )}

                {demoOtp && (
                  <div className="otp-hint-box">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Demo OTP: <strong>{demoOtp}</strong>
                  </div>
                )}

                <button type="submit" className="login-btn" disabled={loading || otpDigits.join('').length < 6}>
                  {loading ? <span className="spinner" /> : 'Verify & Sign In'}
                </button>

                <div className="otp-footer-row">
                  <span>Didn't receive a code?</span>
                  <button type="button" className="otp-resend-btn" onClick={handleOtpResend}>
                    Resend code
                  </button>
                </div>

                <button
                  type="button"
                  className="login-back-btn"
                  onClick={() => { setStep(2); setOtpDigits(['', '', '', '', '', '']); setOtpError('') }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                  </svg>
                  Back to password
                </button>
              </form>
            </div>
          )}

          {/* Demo credentials box */}
          <div className="login-demo">
            <div className="login-demo-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Demo credentials
            </div>
            <div className="login-demo-row">
              <span>Email</span>
              <code>demo@novabank.com</code>
            </div>
            <div className="login-demo-row">
              <span>Password</span>
              <code>password</code>
            </div>
            <div className="login-demo-row">
              <span>OTP</span>
              <code>shown on step 3</code>
            </div>
          </div>

          {/* Activity Log — glass panel */}
          {loginLogs.length > 0 && (
            <div className="glass-panel login-log-panel">
              <button className="glass-panel-header" onClick={() => setLogsOpen(o => !o)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>Activity Log</span>
                <span className="glass-panel-count">{loginLogs.length}</span>
                <svg
                  className={`glass-panel-chevron${logsOpen ? ' glass-panel-chevron--open' : ''}`}
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {logsOpen && (
                <div className="glass-panel-body">
                  {loginLogs.slice(0, 6).map(e => (
                    <div key={e.id} className="log-entry">
                      <span className={`log-dot log-dot--${e.status}`} />
                      <span className="log-label">{e.label}</span>
                      {e.detail && <span className="log-detail-chip">{e.detail}</span>}
                      <span className="log-ts">{relativeTime(e.ts)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Session & Cookies — glass panel */}
          <div className="glass-panel login-cookie-panel">
            <div className="glass-panel-header glass-panel-header--static">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Session & Cookies</span>
            </div>
            <div className="glass-panel-body">
              {[
                ['CSRF Token',  csrfToken ? csrfToken.slice(0, 12) + '…' : '—'],
                ['Session ID',  sessionId ? sessionId.slice(0, 10) + '…' : '—'],
                ['SameSite',    'Strict'],
                ['HttpOnly',    'Yes'],
                ['Secure',      'Yes'],
                ['Theme',       localStorage.getItem('nova-theme') || 'light'],
                ['Expires',     'Session'],
              ].map(([k, v]) => (
                <div key={k} className="cookie-row">
                  <span className="cookie-key">{k}</span>
                  <span className="cookie-val">{v}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function relativeTime(ts) {
  const diff = Math.round((Date.now() - ts) / 1000)
  if (diff < 5)  return 'just now'
  if (diff < 60) return `${diff}s ago`
  return `${Math.round(diff / 60)}m ago`
}
