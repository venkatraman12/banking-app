// ── XSS Prevention ──────────────────────────────────────────────────────────
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// ── CSRF Token ───────────────────────────────────────────────────────────────
export function generateCsrfToken() {
  const arr = new Uint8Array(32)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

// ── Session Fingerprint ──────────────────────────────────────────────────────
export function generateSessionId() {
  const arr = new Uint8Array(16)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

// ── Common Weak Passwords ────────────────────────────────────────────────────
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'password1', '111111', '000000', 'welcome', 'login', 'admin',
])

export function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase())
}

// ── Password Entropy ─────────────────────────────────────────────────────────
export function calculateEntropy(password) {
  if (!password) return 0
  let charsetSize = 0
  if (/[a-z]/.test(password)) charsetSize += 26
  if (/[A-Z]/.test(password)) charsetSize += 26
  if (/[0-9]/.test(password)) charsetSize += 10
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32
  const entropy = Math.floor(password.length * Math.log2(charsetSize || 1))
  return entropy
}

export function entropyLabel(entropy) {
  if (entropy < 28) return { label: 'Very Weak',  color: '#ef4444' }
  if (entropy < 40) return { label: 'Weak',        color: '#f97316' }
  if (entropy < 60) return { label: 'Reasonable',  color: '#f59e0b' }
  if (entropy < 90) return { label: 'Strong',      color: '#10b981' }
  return               { label: 'Very Strong',  color: '#059669' }
}

// ── Login Risk Assessment ────────────────────────────────────────────────────
export function assessLoginRisk({ hour = new Date().getHours(), failedAttempts = 0, isNewDevice = false, isNewLocation = false } = {}) {
  let risk = 0
  const flags = []

  if (hour >= 23 || hour < 5) {
    risk += 25
    flags.push('Login at unusual hour')
  }

  if (failedAttempts >= 2) {
    risk += Math.min(failedAttempts * 12, 40)
    flags.push(`${failedAttempts} recent failed attempt${failedAttempts > 1 ? 's' : ''}`)
  }

  if (isNewDevice) {
    risk += 30
    flags.push('Unrecognized device')
  }

  if (isNewLocation) {
    risk += 20
    flags.push('New login location')
  }

  const level = risk === 0 ? 'low' : risk < 35 ? 'low' : risk < 65 ? 'medium' : 'high'
  return { risk: Math.min(risk, 100), level, flags }
}

// ── Transaction Anomaly Detection ────────────────────────────────────────────
export function detectTransactionAnomaly(amount, { avgAmount = 250, maxSingleTx = 2000 } = {}) {
  const alerts = []
  const num = Number(amount)
  if (!num || num <= 0) return alerts

  if (num > maxSingleTx) {
    alerts.push({
      type: 'high_amount',
      severity: 'high',
      message: `Large transaction: $${num.toLocaleString()} exceeds your typical single transaction limit`,
    })
  } else if (num > avgAmount * 4) {
    alerts.push({
      type: 'unusual_amount',
      severity: 'medium',
      message: `Amount is ${Math.round(num / avgAmount)}× your average transaction ($${avgAmount})`,
    })
  }

  if (num > 5000) {
    alerts.push({
      type: 'reporting_threshold',
      severity: 'info',
      message: 'Transactions over $5,000 may be subject to regulatory reporting requirements',
    })
  }

  return alerts
}

// ── In-Memory Rate Limiter ───────────────────────────────────────────────────
const rateLimitStore = {}

export function checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now()
  if (!rateLimitStore[key]) rateLimitStore[key] = []
  rateLimitStore[key] = rateLimitStore[key].filter(t => now - t < windowMs)

  if (rateLimitStore[key].length >= maxAttempts) {
    const oldest = rateLimitStore[key][0]
    const waitMs = windowMs - (now - oldest)
    return { allowed: false, waitSeconds: Math.ceil(waitMs / 1000) }
  }

  rateLimitStore[key].push(now)
  return { allowed: true, remaining: maxAttempts - rateLimitStore[key].length }
}

// ── Export Security Report ───────────────────────────────────────────────────
export function exportSecurityReport({ user, score, scoreChecks, sessions, activity, alerts, twoFAEnabled, trustedDevices }) {
  const now = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })
  const severityColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  const checks = scoreChecks.map(c => `
    <tr>
      <td style="padding:8px 12px;">${c.ok ? '✅' : '❌'} ${c.label}</td>
      <td style="padding:8px 12px;color:${c.ok ? '#10b981' : '#ef4444'}">${c.ok ? 'Pass' : 'Action Required'}</td>
    </tr>`).join('')

  const activityRows = activity.map(a => `
    <tr>
      <td style="padding:8px 12px;">${a.event}</td>
      <td style="padding:8px 12px;">${a.device}</td>
      <td style="padding:8px 12px;">${a.location}</td>
      <td style="padding:8px 12px;">${a.time}</td>
    </tr>`).join('')

  const alertRows = alerts.map(a => `
    <tr>
      <td style="padding:8px 12px;">${a.type === 'warning' ? '⚠️' : 'ℹ️'} ${a.message}</td>
      <td style="padding:8px 12px;">${a.time}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>NovaBanc Security Report</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#f0f4f8; color:#1e293b; margin:0; padding:40px; }
  .container { max-width:800px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.1); }
  .header { background:linear-gradient(135deg,#1e3a8a,#2563eb); color:#fff; padding:32px 40px; }
  .header h1 { margin:0 0 4px; font-size:24px; }
  .header p { margin:0; opacity:.75; font-size:14px; }
  .score-section { padding:32px 40px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:24px; }
  .score-circle { width:80px; height:80px; border-radius:50%; background:${severityColor}22; display:flex; flex-direction:column; align-items:center; justify-content:center; border:3px solid ${severityColor}; }
  .score-num { font-size:26px; font-weight:800; color:${severityColor}; line-height:1; }
  .score-label { font-size:10px; color:${severityColor}; font-weight:600; }
  .section { padding:24px 40px; border-bottom:1px solid #e2e8f0; }
  .section h2 { font-size:15px; font-weight:700; margin:0 0 16px; color:#1e3a8a; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { background:#f8fafc; padding:8px 12px; text-align:left; font-weight:600; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:.5px; }
  tr:nth-child(even) { background:#f8fafc; }
  .footer { padding:24px 40px; text-align:center; color:#94a3b8; font-size:12px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
  .badge-ok { background:#d1fae5; color:#059669; }
  .badge-warn { background:#fef3c7; color:#d97706; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🔒 NovaBanc Security Report</h1>
    <p>Account: ${user?.name || 'Alex Johnson'} · ${user?.email || 'demo@novabanc.com'} · Generated: ${now}</p>
  </div>

  <div class="score-section">
    <div class="score-circle">
      <span class="score-num">${score}</span>
      <span class="score-label">/100</span>
    </div>
    <div>
      <h2 style="margin:0 0 6px;">Overall Security Score</h2>
      <p style="margin:0;color:#64748b;font-size:14px;">
        ${score >= 80 ? '✅ Your account has strong security settings.' : score >= 60 ? '⚠️ Some improvements recommended.' : '❌ Immediate action required.'}
      </p>
      <div style="margin-top:8px;">
        <span class="badge ${twoFAEnabled ? 'badge-ok' : 'badge-warn'}">2FA: ${twoFAEnabled ? 'ON' : 'OFF'}</span>&nbsp;
        <span class="badge badge-ok">Trusted Devices: ${trustedDevices}</span>&nbsp;
        <span class="badge badge-ok">Sessions: ${sessions}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Security Checklist</h2>
    <table>
      <tr><th>Check</th><th>Status</th></tr>
      ${checks}
    </table>
  </div>

  ${alertRows ? `<div class="section">
    <h2>Active Security Alerts</h2>
    <table>
      <tr><th>Alert</th><th>Time</th></tr>
      ${alertRows}
    </table>
  </div>` : ''}

  <div class="section">
    <h2>Recent Login Activity</h2>
    <table>
      <tr><th>Event</th><th>Device</th><th>Location</th><th>Time</th></tr>
      ${activityRows}
    </table>
  </div>

  <div class="footer">
    This report is generated for your records. NovaBanc will never ask for your password or PIN via email.<br/>
    For security concerns, contact us at security@novabanc.com or call 1-800-NOVABANC.
  </div>
</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `NovaBanc_Security_Report_${Date.now()}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
