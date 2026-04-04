import { useState, useRef } from 'react'
import { useSecurity } from '../../context/SecurityContext'
import { exportSecurityReport } from '../../utils/security'
import './Profile.css'

function getStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score, label: 'Very Weak',   color: '#ef4444' }
  if (score === 2) return { score, label: 'Weak',        color: '#f97316' }
  if (score === 3) return { score, label: 'Fair',        color: '#f59e0b' }
  if (score === 4) return { score, label: 'Strong',      color: '#10b981' }
  return             { score, label: 'Very Strong',  color: '#059669' }
}

const SESSIONS = [
  { id: 1, device: 'Chrome on macOS',    location: 'New York, US',  ip: '192.168.1.1',  lastActive: '2 minutes ago', current: true  },
  { id: 2, device: 'Safari on iPhone',   location: 'New York, US',  ip: '192.168.1.45', lastActive: '1 hour ago',    current: false },
  { id: 3, device: 'Firefox on Windows', location: 'Brooklyn, US',  ip: '10.0.0.12',    lastActive: '3 days ago',    current: false },
]

const ACTIVITY = [
  { event: 'Successful login',      device: 'Chrome on macOS',  location: 'New York, US', time: '2 min ago',    type: 'success' },
  { event: 'Password changed',      device: 'Chrome on macOS',  location: 'New York, US', time: '3 months ago', type: 'warn'    },
  { event: 'Failed login attempt',  device: 'Unknown device',   location: 'London, UK',   time: '3 months ago', type: 'danger'  },
  { event: 'Successful login',      device: 'Safari on iPhone', location: 'New York, US', time: '4 months ago', type: 'success' },
  { event: '2FA enabled',           device: 'Chrome on macOS',  location: 'New York, US', time: '5 months ago', type: 'info'    },
]

const INITIAL_TRUSTED = [
  { id: 1, name: 'Chrome on macOS',    added: 'Jan 12, 2026', current: true  },
  { id: 2, name: 'Safari on iPhone 15',added: 'Feb 3, 2026',  current: false },
]

const NOTIF_DEFAULTS = [
  { key: 'txn',    label: 'Transaction Alerts',  desc: 'Get notified for all transactions',       on: true  },
  { key: 'bal',    label: 'Low Balance Alert',    desc: 'Alert when balance falls below $500',     on: true  },
  { key: 'pay',    label: 'Payment Reminders',    desc: 'Reminders 3 days before due dates',       on: true  },
  { key: 'promo',  label: 'Promotional Offers',   desc: 'New products and special offers',          on: false },
  { key: 'sec',    label: 'Security Alerts',      desc: 'Suspicious activity notifications',        on: true  },
  { key: 'stmt',   label: 'Monthly Statement',    desc: 'Monthly report available alert',           on: false },
]

const OFFERS = [
  {
    id: 1, tag: 'Limited Time', badge: 'badge--warning',
    title: '5% Cashback on Groceries',
    desc: 'Earn 5% cashback on all grocery purchases made with your NovaBanc Platinum card through April 30.',
    expires: 'Expires Apr 30, 2026', cta: 'Activate Offer', icon: '🛒', color: ['#f59e0b', '#d97706'],
  },
  {
    id: 2, tag: 'New', badge: 'badge--primary',
    title: 'Zero-Fee Transfers for 3 Months',
    desc: 'Transfer funds between NovaBanc accounts with no fees for 90 days when you upgrade to Premium.',
    expires: 'Offer ends May 15, 2026', cta: 'Upgrade Now', icon: '💸', color: ['#2563eb', '#1d4ed8'],
  },
  {
    id: 3, tag: 'Exclusive', badge: 'badge--success',
    title: 'High-Yield Savings — 4.8% APY',
    desc: 'Open a new NovaBanc High-Yield Savings account today and earn 4.8% APY on balances up to $100,000.',
    expires: 'Rate valid through Jun 2026', cta: 'Open Account', icon: '📈', color: ['#10b981', '#059669'],
  },
  {
    id: 4, tag: 'Partner Deal', badge: 'badge--purple',
    title: '$150 Bonus — Refer a Friend',
    desc: 'Refer a friend to NovaBanc. When they open an account and make their first deposit, you both get $150.',
    expires: 'Ongoing', cta: 'Share Referral Link', icon: '🎁', color: ['#8b5cf6', '#7c3aed'],
  },
]

const STATEMENTS = [
  { id: 1, month: 'February 2026', period: 'Feb 1 – Feb 28, 2026', size: '142 KB', transactions: 34, closing: '$47,908.18' },
  { id: 2, month: 'January 2026',  period: 'Jan 1 – Jan 31, 2026',  size: '138 KB', transactions: 29, closing: '$44,212.50' },
  { id: 3, month: 'December 2025', period: 'Dec 1 – Dec 31, 2025',  size: '156 KB', transactions: 41, closing: '$39,500.00' },
  { id: 4, month: 'November 2025', period: 'Nov 1 – Nov 30, 2025',  size: '129 KB', transactions: 27, closing: '$36,800.00' },
  { id: 5, month: 'October 2025',  period: 'Oct 1 – Oct 31, 2025',  size: '134 KB', transactions: 32, closing: '$34,100.00' },
  { id: 6, month: 'September 2025',period: 'Sep 1 – Sep 30, 2025',  size: '118 KB', transactions: 25, closing: '$31,400.00' },
]

const DEMO_OTP = '123456'

export default function Profile({ user }) {
  const { accountFrozen, freezeAccount, unfreezeAccount, activeAlerts, dismissAlert } = useSecurity()
  const [activeTab, setActiveTab] = useState('personal')

  // Personal form
  const [formData, setFormData]   = useState({ firstName: 'Alex', lastName: 'Johnson', email: user?.email || 'demo@novabanc.com', phone: '+1 (555) 234-5678', dob: '1990-05-14', address: '123 Main Street, New York, NY 10001' })
  const [saved, setSaved]         = useState(false)

  // Security tab
  const [twoFAEnabled, setTwoFAEnabled]   = useState(true)
  const [twoFAMethod, setTwoFAMethod]     = useState('sms')
  const [sessions, setSessions]           = useState(SESSIONS)
  const [trustedDevices, setTrustedDevices] = useState(INITIAL_TRUSTED)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [pwForm, setPwForm]   = useState({ current: '', newPw: '', confirm: '' })
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  // OTP modal
  const [showOtp, setShowOtp]       = useState(false)
  const [otpValues, setOtpValues]   = useState(['','','','','',''])
  const [otpError, setOtpError]     = useState('')
  const otpRefs = useRef([])

  // Notifications
  const [notifSettings, setNotifSettings] = useState(NOTIF_DEFAULTS)
  const [notifSaved, setNotifSaved]       = useState(false)

  // Preferences
  const [prefs, setPrefs]         = useState({ currency: 'USD — US Dollar', language: 'English (US)', dateFormat: 'MM/DD/YYYY' })
  const [prefSaved, setPrefSaved] = useState(false)

  // Offers
  const [activatedOffers, setActivatedOffers] = useState(new Set())

  // Statements
  const [downloadedStmt, setDownloadedStmt] = useState(null)

  // Account freeze confirmation
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false)

  const strength = getStrength(pwForm.newPw)
  const scoreChecks = [
    { label: '2FA enabled',               ok: twoFAEnabled },
    { label: 'Strong password set',       ok: true },
    { label: 'Trusted device registered', ok: trustedDevices.length > 0 },
    { label: 'Activity monitoring on',    ok: true },
    { label: 'No active security alerts', ok: activeAlerts.length === 0 },
    { label: 'Account not frozen',        ok: !accountFrozen },
  ]
  const score        = Math.round((scoreChecks.filter(c => c.ok).length / scoreChecks.length) * 100)
  const scoreColor   = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 34
  const strokeDash   = (score / 100) * circumference

  /* ── Handlers ── */
  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleCancel = () => {
    setFormData({ firstName: 'Alex', lastName: 'Johnson', email: user?.email || 'demo@novabanc.com', phone: '+1 (555) 234-5678', dob: '1990-05-14', address: '123 Main Street, New York, NY 10001' })
  }

  const handlePasswordSave = (e) => {
    e.preventDefault()
    setPwError('')
    if (!pwForm.current) { setPwError('Enter your current password.'); return }
    if (strength.score < 3) { setPwError('New password is too weak.'); return }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Passwords do not match.'); return }
    setShowOtp(true)
    setOtpValues(['','','','','',''])
    setOtpError('')
  }

  const handleOtpInput = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otpValues]; next[i] = val
    setOtpValues(next); setOtpError('')
    if (val && i < 5) otpRefs.current[i + 1]?.focus()
  }

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otpValues[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  const handleOtpVerify = () => {
    if (otpValues.join('') === DEMO_OTP) {
      setShowOtp(false); setPwSaved(true)
      setPwForm({ current: '', newPw: '', confirm: '' })
      setShowChangePassword(false)
      setTimeout(() => setPwSaved(false), 3000)
    } else {
      setOtpError('Incorrect code. Try 123456')
      setOtpValues(['','','','','',''])
      otpRefs.current[0]?.focus()
    }
  }

  const addDevice = () => {
    const newDevice = { id: Date.now(), name: 'Current Browser', added: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), current: false }
    setTrustedDevices(prev => [...prev, newDevice])
  }

  const toggleNotif = (key) => {
    setNotifSettings(prev => prev.map(n => n.key === key ? { ...n, on: !n.on } : n))
  }

  const saveNotifs = () => {
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 2500)
  }

  const savePrefs = () => {
    setPrefSaved(true)
    setTimeout(() => setPrefSaved(false), 2500)
  }

  const simulateDownload = (stmt) => {
    setDownloadedStmt(stmt.id)
    setTimeout(() => setDownloadedStmt(null), 2500)
  }

  const TABS = [
    { id: 'personal',      label: 'Personal Info',   icon: '👤' },
    { id: 'security',      label: 'Security',        icon: '🔒' },
    { id: 'notifications', label: 'Notifications',   icon: '🔔' },
    { id: 'offers',        label: 'Offers',          icon: '🎁' },
    { id: 'statements',    label: 'Statements',      icon: '📄' },
    { id: 'preferences',   label: 'Preferences',     icon: '⚙️' },
  ]

  return (
    <div className="profile-page">
      {/* OTP Modal */}
      {showOtp && (
        <div className="otp-overlay">
          <div className="otp-modal">
            <div className="otp-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 5.53 5.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 14.92z"/>
              </svg>
            </div>
            <h3>Verify Your Identity</h3>
            <p>A 6-digit code was sent to your phone ending in ****78.</p>
            <div className="otp-inputs">
              {otpValues.map((v, i) => (
                <input key={i} ref={el => { otpRefs.current[i] = el }} className="otp-input"
                  type="text" inputMode="numeric" maxLength={1} value={v}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)} />
              ))}
            </div>
            <div className="otp-error">{otpError}</div>
            <button className="otp-resend">Resend code</button>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Demo code: <strong>123456</strong></p>
            <div className="otp-actions">
              <button className="btn btn-outline" onClick={() => setShowOtp(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleOtpVerify}>Verify</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div><h1>Profile</h1><p>Manage your personal information and preferences</p></div>
      </div>

      <div className="profile-layout">
        {/* Sidebar */}
        <div className="profile-sidebar card">
          <div className="profile-avatar-section">
            <div className="profile-avatar">{user?.name?.charAt(0) || 'A'}</div>
            <div className="profile-avatar-info">
              <h2>{user?.name || 'Alex Johnson'}</h2>
              <span>{user?.email || 'demo@novabanc.com'}</span>
            </div>
            <div className="profile-badge"><span className="badge-star">★</span> Premium Member</div>
          </div>

          <div className="profile-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`profile-nav-item ${activeTab === tab.id ? 'profile-nav-item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'offers' && <span className="nav-pill">4</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="profile-content card">

          {/* ── PERSONAL INFO ── */}
          {activeTab === 'personal' && (
            <form className="profile-form" onSubmit={handleSave}>
              <div className="profile-section-title">Personal Information</div>
              {saved && <div className="save-success"><span>✓</span> Changes saved successfully</div>}
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" className="form-input" value={formData.firstName} onChange={e => setFormData(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" className="form-input" value={formData.lastName} onChange={e => setFormData(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-input" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" className="form-input" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" className="form-input" value={formData.dob} onChange={e => setFormData(f => ({ ...f, dob: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" className="form-input" value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" className="btn btn-outline" onClick={handleCancel}>Cancel</button>
              </div>
            </form>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <div className="profile-section">
              <div className="profile-section-title">Security Settings</div>
              {pwSaved && <div className="save-success" style={{ marginBottom: 20 }}><span>✓</span> Password changed successfully</div>}

              {/* Active Security Alerts */}
              {activeAlerts.length > 0 && (
                <div className="sec-alerts-panel">
                  <div className="sec-alerts-header">
                    <span className="sec-alerts-title">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {activeAlerts.map(alert => (
                    <div key={alert.id} className={`sec-alert-item sec-alert-item--${alert.type}`}>
                      <div className="sec-alert-body">
                        <span className="sec-alert-msg">{alert.message}</span>
                        <span className="sec-alert-time">{alert.time}</span>
                      </div>
                      <button className="sec-alert-dismiss" onClick={() => dismissAlert(alert.id)} aria-label="Dismiss alert">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Security Score */}
              <div className="security-score-block">
                <div className="score-ring-wrap">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="7" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke={scoreColor} strokeWidth="7"
                      strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" />
                  </svg>
                  <div className="score-ring-label" style={{ color: scoreColor }}>{score}<span>/100</span></div>
                </div>
                <div className="score-details">
                  <h4>Security Score</h4>
                  <div className="score-checklist">
                    {scoreChecks.map((c, i) => (
                      <div key={i} className={`score-check ${c.ok ? 'score-check--ok' : 'score-check--bad'}`}>
                        {c.ok ? '✓' : '✗'} {c.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div className="sec-block">
                <div className="sec-block-header">
                  <div className="sec-block-info"><strong>Password</strong><span>Last changed 3 months ago</span></div>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowChangePassword(v => !v); setPwError('') }}>
                    {showChangePassword ? 'Cancel' : 'Change'}
                  </button>
                </div>
                {showChangePassword && (
                  <form className="change-pw-form" onSubmit={handlePasswordSave}>
                    {pwError && <div className="login-error">{pwError}</div>}
                    <div className="form-group">
                      <label>Current Password</label>
                      <input type="password" className="form-input" value={pwForm.current}
                        onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} placeholder="Enter current password" />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <div className="pw-input-row">
                        <input type={showNewPw ? 'text' : 'password'} className="form-input" value={pwForm.newPw}
                          onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} placeholder="Min 8 characters" />
                        <button type="button" className="eye-btn-inline" onClick={() => setShowNewPw(v => !v)}>{showNewPw ? '🙈' : '👁'}</button>
                      </div>
                      {pwForm.newPw && (
                        <div className="pw-strength">
                          <div className="pw-strength-bar">
                            {[1,2,3,4,5].map(i => (
                              <div key={i} className="pw-strength-seg" style={{ background: i <= strength.score ? strength.color : 'var(--border)' }} />
                            ))}
                          </div>
                          <span style={{ color: strength.color }}>{strength.label}</span>
                        </div>
                      )}
                      <ul className="pw-hints">
                        <li className={pwForm.newPw.length >= 8 ? 'hint-ok' : ''}>At least 8 characters</li>
                        <li className={/[A-Z]/.test(pwForm.newPw) ? 'hint-ok' : ''}>One uppercase letter</li>
                        <li className={/[0-9]/.test(pwForm.newPw) ? 'hint-ok' : ''}>One number</li>
                        <li className={/[^A-Za-z0-9]/.test(pwForm.newPw) ? 'hint-ok' : ''}>One special character</li>
                      </ul>
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input type="password" className="form-input" value={pwForm.confirm}
                        onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" />
                      {pwForm.confirm && pwForm.newPw !== pwForm.confirm && <span className="pw-mismatch">Passwords do not match</span>}
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>Update Password</button>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>An OTP will be sent to verify this change.</p>
                  </form>
                )}
              </div>

              {/* 2FA */}
              <div className="sec-block">
                <div className="sec-block-header">
                  <div className="sec-block-info">
                    <strong>Two-Factor Authentication</strong>
                    <span>{twoFAEnabled ? `Enabled via ${twoFAMethod === 'sms' ? 'SMS' : 'Authenticator App'}` : 'Not enabled — your account is less secure'}</span>
                  </div>
                  <button className={`toggle-btn ${twoFAEnabled ? 'toggle-btn--on' : ''}`} onClick={() => setTwoFAEnabled(v => !v)} aria-label="Toggle 2FA" />
                </div>
                {twoFAEnabled && (
                  <div className="twofa-methods">
                    <span className="twofa-label">Method:</span>
                    <button className={`twofa-chip ${twoFAMethod === 'sms' ? 'twofa-chip--active' : ''}`} onClick={() => setTwoFAMethod('sms')}>📱 SMS</button>
                    <button className={`twofa-chip ${twoFAMethod === 'app' ? 'twofa-chip--active' : ''}`} onClick={() => setTwoFAMethod('app')}>🔑 Authenticator App</button>
                  </div>
                )}
              </div>

              {/* Trusted Devices */}
              <div className="sec-block">
                <div className="sec-block-header">
                  <div className="sec-block-info">
                    <strong>Trusted Devices</strong>
                    <span>{trustedDevices.length} registered device{trustedDevices.length !== 1 ? 's' : ''}</span>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={addDevice}>+ Add Device</button>
                </div>
                <div>
                  {trustedDevices.map(d => (
                    <div key={d.id} className="trusted-device-item">
                      <div className="trusted-device-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                      </div>
                      <div className="trusted-device-info">
                        <strong>{d.name}{d.current && <span className="current-badge" style={{ marginLeft: 6 }}>Current</span>}</strong>
                        <span>Added {d.added}</span>
                      </div>
                      {!d.current && (
                        <button className="btn btn-outline btn-sm btn-danger-outline" onClick={() => setTrustedDevices(prev => prev.filter(x => x.id !== d.id))}>Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Sessions */}
              <div className="sec-block">
                <div className="sec-block-header">
                  <div className="sec-block-info">
                    <strong>Active Sessions</strong>
                    <span>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="sessions-list">
                  {sessions.map(s => (
                    <div key={s.id} className="session-item">
                      <div className="session-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                      </div>
                      <div className="session-info">
                        <strong>{s.device} {s.current && <span className="current-badge">Current</span>}</strong>
                        <span>{s.location} · {s.ip} · {s.lastActive}</span>
                      </div>
                      {!s.current && (
                        <button className="btn btn-outline btn-sm btn-danger-outline" onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}>Revoke</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Login Activity */}
              <div className="sec-block">
                <div className="sec-block-header">
                  <div className="sec-block-info"><strong>Recent Login Activity</strong><span>Last 5 events</span></div>
                </div>
                <div className="activity-list">
                  {ACTIVITY.map((a, i) => (
                    <div key={i} className="activity-item">
                      <span className={`activity-dot activity-dot--${a.type}`} />
                      <div className="activity-info"><strong>{a.event}</strong><span>{a.device} · {a.location}</span></div>
                      <span className="activity-time">{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Freeze */}
              <div className={`sec-block sec-block--freeze ${accountFrozen ? 'sec-block--frozen' : ''}`}>
                <div className="sec-block-header">
                  <div className="sec-block-info">
                    <strong>
                      {accountFrozen ? '🔴 Account Frozen' : '🟢 Account Active'}
                    </strong>
                    <span>
                      {accountFrozen
                        ? 'All transactions are blocked. Unfreeze to resume normal banking.'
                        : 'Instantly freeze your account to block all transactions if you suspect fraud.'}
                    </span>
                  </div>
                  {!accountFrozen ? (
                    <button className="btn btn-sm btn-danger-outline" onClick={() => setShowFreezeConfirm(true)}>
                      Freeze Account
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-primary" onClick={unfreezeAccount}>
                      Unfreeze
                    </button>
                  )}
                </div>
                {showFreezeConfirm && !accountFrozen && (
                  <div className="freeze-confirm">
                    <p>Are you sure? This will block <strong>all transactions</strong> including payments, transfers, and card purchases until you unfreeze.</p>
                    <div className="freeze-confirm-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => setShowFreezeConfirm(false)}>Cancel</button>
                      <button className="btn btn-sm btn-danger" onClick={() => { freezeAccount(); setShowFreezeConfirm(false) }}>Yes, Freeze My Account</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Security Report */}
              <div className="sec-block">
                <div className="sec-block-header">
                  <div className="sec-block-info">
                    <strong>Security Report</strong>
                    <span>Download a full report of your account's security status and login history</span>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => exportSecurityReport({
                      user,
                      score,
                      scoreChecks,
                      sessions: sessions.length,
                      activity: ACTIVITY,
                      alerts: activeAlerts,
                      twoFAEnabled,
                      trustedDevices: trustedDevices.length,
                    })}
                  >
                    ↓ Export Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="profile-section">
              <div className="profile-section-title">Notification Preferences</div>
              {notifSaved && <div className="save-success"><span>✓</span> Preferences saved</div>}
              <div className="notif-settings">
                {notifSettings.map(item => (
                  <div key={item.key} className="notif-setting-item">
                    <div className="notif-setting-info">
                      <strong>{item.label}</strong>
                      <span>{item.desc}</span>
                    </div>
                    <button
                      className={`toggle-btn ${item.on ? 'toggle-btn--on' : ''}`}
                      onClick={() => toggleNotif(item.key)}
                      aria-label={`Toggle ${item.label}`}
                    />
                  </div>
                ))}
              </div>
              <div className="form-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-primary" onClick={saveNotifs}>Save Preferences</button>
                <button className="btn btn-outline" onClick={() => setNotifSettings(NOTIF_DEFAULTS)}>Reset to Default</button>
              </div>
            </div>
          )}

          {/* ── OFFERS ── */}
          {activeTab === 'offers' && (
            <div className="profile-section">
              <div className="profile-section-title">Promotional Offers</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                Exclusive offers available to you as a Premium Member.
              </p>
              <div className="offers-list">
                {OFFERS.map(offer => (
                  <div key={offer.id} className={`offer-card ${activatedOffers.has(offer.id) ? 'offer-card--activated' : ''}`}>
                    <div className="offer-card-top">
                      <div className="offer-icon-wrap" style={{ background: `linear-gradient(135deg, ${offer.color[0]}22, ${offer.color[1]}22)` }}>
                        <span className="offer-icon">{offer.icon}</span>
                      </div>
                      <div className="offer-meta">
                        <span className={`offer-tag ${offer.badge}`}>{offer.tag}</span>
                        <h3 className="offer-title">{offer.title}</h3>
                        <p className="offer-desc">{offer.desc}</p>
                      </div>
                    </div>
                    <div className="offer-card-footer">
                      <span className="offer-expires">🕐 {offer.expires}</span>
                      {activatedOffers.has(offer.id) ? (
                        <span className="offer-activated-badge">✓ Activated</span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ background: `linear-gradient(135deg, ${offer.color[0]}, ${offer.color[1]})`, boxShadow: `0 4px 14px ${offer.color[0]}44` }}
                          onClick={() => setActivatedOffers(prev => new Set([...prev, offer.id]))}
                        >
                          {offer.cta}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STATEMENTS ── */}
          {activeTab === 'statements' && (
            <div className="profile-section">
              <div className="profile-section-title">Account Statements</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                Download your monthly statements as PDF. Statements are generated on the 1st of each month.
              </p>
              <div className="statements-list">
                {STATEMENTS.map(stmt => (
                  <div key={stmt.id} className="statement-item">
                    <div className="statement-icon">📋</div>
                    <div className="statement-info">
                      <strong>{stmt.month}</strong>
                      <span>{stmt.period} · {stmt.transactions} transactions · Closing balance {stmt.closing}</span>
                    </div>
                    <div className="statement-actions">
                      <span className="statement-size">{stmt.size}</span>
                      <button
                        className={`btn btn-sm ${downloadedStmt === stmt.id ? 'btn-success' : 'btn-outline'}`}
                        onClick={() => simulateDownload(stmt)}
                      >
                        {downloadedStmt === stmt.id ? '✓ Downloaded' : '↓ Download'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="statement-note">
                Statements are available for the past 12 months. For older records, contact support.
              </div>
            </div>
          )}

          {/* ── PREFERENCES ── */}
          {activeTab === 'preferences' && (
            <div className="profile-section">
              <div className="profile-section-title">App Preferences</div>
              {prefSaved && <div className="save-success"><span>✓</span> Preferences saved</div>}
              <div className="preferences-list">
                <div className="form-group">
                  <label>Currency</label>
                  <select className="form-input" value={prefs.currency} onChange={e => setPrefs(p => ({ ...p, currency: e.target.value }))}>
                    <option>USD — US Dollar</option>
                    <option>EUR — Euro</option>
                    <option>GBP — British Pound</option>
                    <option>JPY — Japanese Yen</option>
                    <option>CAD — Canadian Dollar</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Language</label>
                  <select className="form-input" value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}>
                    <option>English (US)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Portuguese</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date Format</label>
                  <select className="form-input" value={prefs.dateFormat} onChange={e => setPrefs(p => ({ ...p, dateFormat: e.target.value }))}>
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={savePrefs}>Save Preferences</button>
                  <button className="btn btn-outline" onClick={() => setPrefs({ currency: 'USD — US Dollar', language: 'English (US)', dateFormat: 'MM/DD/YYYY' })}>Reset</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
