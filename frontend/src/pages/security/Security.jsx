import { useState, useMemo } from 'react'
import { useSecurity } from '../../context/SecurityContext'
import { analyzeIPRisk, countryRisk } from '../../utils/security'
import './Security.css'

// ── Small shared helpers ──────────────────────────────────────────────────────

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const SEVERITY_CLASS = { high: 'sev-high', medium: 'sev-medium', low: 'sev-low', info: 'sev-info', critical: 'sev-critical' }
const SEVERITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low', info: 'Info', critical: 'Critical' }

const THREAT_ICON = {
  brute_force:          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  geo_anomaly:          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  unusual_transaction:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  suspicious_ip:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  credential_stuffing:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
}

const RULE_TYPE_META = {
  ip_block:      { label: 'IP Block',      color: 'tag-red'    },
  ip_allow:      { label: 'IP Allow',      color: 'tag-green'  },
  geo_block:     { label: 'Geo Block',     color: 'tag-orange' },
  tx_limit:      { label: 'TX Limit',      color: 'tag-blue'   },
  time_rule:     { label: 'Time Rule',     color: 'tag-purple' },
  device_policy: { label: 'Device Policy', color: 'tag-gray'   },
}

const AUDIT_EVENT_META = {
  login_success:    { label: 'Login',             color: 'sev-info'   },
  login_failed:     { label: 'Failed Login',      color: 'sev-medium' },
  ip_blocked:       { label: 'IP Blocked',        color: 'sev-high'   },
  geo_alert:        { label: 'Geo Alert',         color: 'sev-medium' },
  tx_anomaly:       { label: 'TX Anomaly',        color: 'sev-medium' },
  '2fa_enabled':    { label: '2FA Enabled',       color: 'sev-info'   },
  password_changed: { label: 'Password Changed',  color: 'sev-info'   },
  session_revoked:  { label: 'Session Revoked',   color: 'sev-info'   },
  account_freeze:   { label: 'Account Frozen',    color: 'sev-high'   },
  rule_added:       { label: 'Rule Added',        color: 'sev-info'   },
  threat_detected:  { label: 'Threat Detected',   color: 'sev-high'   },
}

// ── Sub-tab: Threat Detection ─────────────────────────────────────────────────

function ThreatTab() {
  const { threatEvents, activeThreats, dismissThreat, blockThreatIP, addThreat, firewallRules, addFirewallRule, addAuditEvent } = useSecurity()
  const [filter, setFilter] = useState('active')

  const highCount   = threatEvents.filter(t => !t.dismissed && t.severity === 'high').length
  const mediumCount = threatEvents.filter(t => !t.dismissed && t.severity === 'medium').length
  const blockedCount = threatEvents.filter(t => t.blocked).length

  const overallLevel = highCount > 0 ? 'high' : mediumCount > 1 ? 'medium' : 'low'

  const shown = useMemo(() => {
    if (filter === 'active')   return threatEvents.filter(t => !t.dismissed)
    if (filter === 'high')     return threatEvents.filter(t => !t.dismissed && t.severity === 'high')
    if (filter === 'medium')   return threatEvents.filter(t => !t.dismissed && t.severity === 'medium')
    if (filter === 'low')      return threatEvents.filter(t => !t.dismissed && t.severity === 'low')
    if (filter === 'dismissed') return threatEvents.filter(t => t.dismissed)
    return threatEvents
  }, [threatEvents, filter])

  function handleBlock(threat) {
    blockThreatIP(threat.id)
    if (threat.sourceIP && !threat.sourceIP.includes('x')) {
      addFirewallRule({ type: 'ip_block', target: threat.sourceIP, label: `Blocked: ${threat.title}` })
      addAuditEvent({ event: 'ip_blocked', severity: 'high', description: `IP ${threat.sourceIP} manually blocked`, ip: threat.sourceIP, location: '—' })
    }
  }

  function simulateThreat() {
    addThreat({
      type: 'brute_force',
      severity: 'high',
      title: 'New Brute Force Attempt',
      description: `${Math.floor(Math.random() * 5) + 3} failed logins from IP ${randomIP()}`,
      sourceIP: randomIP(),
      country: 'XX',
    })
  }

  return (
    <div className="sec-tab-content">
      {/* Threat level banner */}
      <div className={`threat-banner threat-banner--${overallLevel}`}>
        <div className="threat-banner-left">
          <span className={`threat-level-dot threat-level-dot--${overallLevel}`} />
          <div>
            <strong>Threat Level: {overallLevel.toUpperCase()}</strong>
            <span>{activeThreats.length} active threat{activeThreats.length !== 1 ? 's' : ''} · {blockedCount} IP{blockedCount !== 1 ? 's' : ''} blocked</span>
          </div>
        </div>
        <button className="btn-simulate" onClick={simulateThreat}>Simulate Threat</button>
      </div>

      {/* Summary cards */}
      <div className="sec-summary-grid">
        <div className="sec-summary-card">
          <span className="summary-num summary-num--red">{highCount}</span>
          <span className="summary-lbl">High Severity</span>
        </div>
        <div className="sec-summary-card">
          <span className="summary-num summary-num--orange">{mediumCount}</span>
          <span className="summary-lbl">Medium Severity</span>
        </div>
        <div className="sec-summary-card">
          <span className="summary-num summary-num--blue">{blockedCount}</span>
          <span className="summary-lbl">IPs Blocked</span>
        </div>
        <div className="sec-summary-card">
          <span className="summary-num summary-num--gray">{threatEvents.filter(t => t.dismissed).length}</span>
          <span className="summary-lbl">Dismissed</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sec-filter-bar">
        {['active', 'high', 'medium', 'low', 'dismissed'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'filter-btn--active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Threat list */}
      <div className="threat-list">
        {shown.length === 0 && (
          <div className="sec-empty">No threats match this filter.</div>
        )}
        {shown.map(threat => (
          <div key={threat.id} className={`threat-card ${threat.dismissed ? 'threat-card--dismissed' : ''}`}>
            <div className={`threat-icon-wrap threat-icon-wrap--${threat.severity}`}>
              {THREAT_ICON[threat.type] || THREAT_ICON.suspicious_ip}
            </div>
            <div className="threat-body">
              <div className="threat-header-row">
                <strong className="threat-title">{threat.title}</strong>
                <span className={`sev-badge ${SEVERITY_CLASS[threat.severity]}`}>{SEVERITY_LABEL[threat.severity]}</span>
                {threat.blocked && <span className="blocked-badge">Blocked</span>}
              </div>
              <p className="threat-desc">{threat.description}</p>
              <div className="threat-meta">
                {threat.sourceIP && <span className="meta-chip">IP: {threat.sourceIP}</span>}
                {threat.country  && <span className={`meta-chip risk-${countryRisk(threat.country)}`}>Country: {threat.country}</span>}
                <span className="meta-chip">{timeAgo(threat.timestamp)}</span>
              </div>
            </div>
            {!threat.dismissed && (
              <div className="threat-actions">
                {!threat.blocked && threat.sourceIP && (
                  <button className="action-btn action-btn--danger" onClick={() => handleBlock(threat)}>Block IP</button>
                )}
                <button className="action-btn action-btn--ghost" onClick={() => dismissThreat(threat.id)}>Dismiss</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sub-tab: Firewall & Policies ──────────────────────────────────────────────

function FirewallTab() {
  const { firewallRules, addFirewallRule, removeFirewallRule, toggleFirewallRule, addAuditEvent } = useSecurity()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'ip_block', target: '', label: '' })
  const [filterType, setFilterType] = useState('all')

  const ruleTypes = ['all', 'ip_block', 'ip_allow', 'geo_block', 'tx_limit', 'time_rule', 'device_policy']
  const shown = filterType === 'all' ? firewallRules : firewallRules.filter(r => r.type === filterType)

  function submit(e) {
    e.preventDefault()
    if (!form.target.trim()) return
    addFirewallRule({ ...form })
    addAuditEvent({ event: 'rule_added', severity: 'info', description: `Firewall rule added: ${form.label || form.target}`, ip: '203.0.113.42', location: 'San Francisco, US' })
    setForm({ type: 'ip_block', target: '', label: '' })
    setShowForm(false)
  }

  function handleRemove(rule) {
    removeFirewallRule(rule.id)
    addAuditEvent({ event: 'rule_added', severity: 'info', description: `Firewall rule removed: ${rule.label || rule.target}`, ip: '203.0.113.42', location: 'San Francisco, US' })
  }

  return (
    <div className="sec-tab-content">
      <div className="sec-section-header">
        <div>
          <h3 className="sec-section-title">Firewall Rules & Policies</h3>
          <p className="sec-section-sub">{firewallRules.filter(r => r.enabled).length} active rules · {firewallRules.filter(r => !r.enabled).length} disabled</p>
        </div>
        <button className="btn-add-rule" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Add Rule'}
        </button>
      </div>

      {showForm && (
        <form className="add-rule-form" onSubmit={submit}>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="rule-select">
            <option value="ip_block">IP Block</option>
            <option value="ip_allow">IP Allow</option>
            <option value="geo_block">Geo Block</option>
            <option value="tx_limit">Transaction Limit</option>
            <option value="time_rule">Time Rule</option>
            <option value="device_policy">Device Policy</option>
          </select>
          <input
            className="rule-input"
            placeholder="Target (IP, country code, amount…)"
            value={form.target}
            onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
          />
          <input
            className="rule-input"
            placeholder="Label (optional)"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          />
          <button type="submit" className="btn-rule-submit">Add Rule</button>
        </form>
      )}

      {/* Type filter */}
      <div className="sec-filter-bar sec-filter-bar--scroll">
        {ruleTypes.map(t => (
          <button key={t} className={`filter-btn ${filterType === t ? 'filter-btn--active' : ''}`} onClick={() => setFilterType(t)}>
            {t === 'all' ? 'All Rules' : (RULE_TYPE_META[t]?.label ?? t)}
          </button>
        ))}
      </div>

      <div className="rule-table-wrap">
        <table className="rule-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Target</th>
              <th>Label</th>
              <th>Created</th>
              <th>Hits</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map(rule => {
              const meta = RULE_TYPE_META[rule.type] || { label: rule.type, color: 'tag-gray' }
              return (
                <tr key={rule.id} className={rule.enabled ? '' : 'rule-row--disabled'}>
                  <td><span className={`rule-tag ${meta.color}`}>{meta.label}</span></td>
                  <td className="rule-target">{rule.target}</td>
                  <td className="rule-label-cell">{rule.label || '—'}</td>
                  <td className="rule-date">{rule.createdAt}</td>
                  <td className="rule-hits">{rule.hits}</td>
                  <td>
                    <label className="toggle-switch" title={rule.enabled ? 'Disable' : 'Enable'}>
                      <input type="checkbox" checked={rule.enabled} onChange={() => toggleFirewallRule(rule.id)} />
                      <span className="toggle-track"><span className="toggle-thumb" /></span>
                    </label>
                  </td>
                  <td>
                    <button className="rule-remove-btn" onClick={() => handleRemove(rule)} title="Remove rule">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {shown.length === 0 && <div className="sec-empty">No rules of this type.</div>}
      </div>

      {/* Policy quick-toggles */}
      <div className="policy-section">
        <h4 className="policy-section-title">Global Policies</h4>
        <div className="policy-grid">
          {[
            { label: 'Block Tor exit nodes automatically',   desc: 'Any IP identified as a Tor node is auto-blocked' },
            { label: 'Require 2FA from new countries',       desc: 'Force OTP when login country differs from last known' },
            { label: 'Rate-limit failed login attempts',     desc: 'Auto-lockout after 5 failures within 10 minutes' },
            { label: 'Alert on off-hours activity (23–05)', desc: 'Push alert if account accessed between 11pm and 5am' },
            { label: 'Block high-risk country codes',        desc: 'Automatically deny logins from sanctioned countries' },
          ].map((policy, i) => (
            <PolicyToggle key={i} label={policy.label} desc={policy.desc} defaultOn={i < 3} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PolicyToggle({ label, desc, defaultOn }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="policy-row">
      <div className="policy-text">
        <span className="policy-label">{label}</span>
        <span className="policy-desc">{desc}</span>
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={on} onChange={() => setOn(v => !v)} />
        <span className="toggle-track"><span className="toggle-thumb" /></span>
      </label>
    </div>
  )
}

// ── Sub-tab: Device & IP Monitor ──────────────────────────────────────────────

function DeviceTab() {
  const { devices, blockDevice, trustDevice, removeDevice, addFirewallRule, addAuditEvent } = useSecurity()

  const trustedCount    = devices.filter(d => d.status === 'trusted').length
  const suspiciousCount = devices.filter(d => d.status === 'suspicious').length
  const blockedCount    = devices.filter(d => d.status === 'blocked').length

  const STATUS_META = {
    trusted:    { label: 'Trusted',    cls: 'status-trusted'    },
    suspicious: { label: 'Suspicious', cls: 'status-suspicious' },
    blocked:    { label: 'Blocked',    cls: 'status-blocked'    },
  }

  function handleBlockDevice(device) {
    blockDevice(device.id)
    if (device.ip && !device.ip.includes('x')) {
      addFirewallRule({ type: 'ip_block', target: device.ip, label: `Blocked device: ${device.name}` })
    }
    addAuditEvent({ event: 'session_revoked', severity: 'high', description: `Device blocked: ${device.name}`, ip: device.ip, location: device.location })
  }

  function handleTrust(device) {
    trustDevice(device.id)
    addAuditEvent({ event: 'login_success', severity: 'info', description: `Device trusted: ${device.name}`, ip: device.ip, location: device.location })
  }

  return (
    <div className="sec-tab-content">
      {/* Summary strip */}
      <div className="device-summary-strip">
        <div className="device-stat">
          <span className="ds-num ds-trusted">{trustedCount}</span>
          <span className="ds-lbl">Trusted Devices</span>
        </div>
        <div className="device-stat">
          <span className="ds-num ds-suspicious">{suspiciousCount}</span>
          <span className="ds-lbl">Suspicious</span>
        </div>
        <div className="device-stat">
          <span className="ds-num ds-blocked">{blockedCount}</span>
          <span className="ds-lbl">Blocked</span>
        </div>
        <div className="device-stat">
          <span className="ds-num">{devices.length}</span>
          <span className="ds-lbl">Total Known</span>
        </div>
      </div>

      {/* Device cards */}
      <div className="device-grid">
        {devices.map(device => {
          const ipRisk = analyzeIPRisk(device.ip)
          const statusMeta = STATUS_META[device.status] || STATUS_META.suspicious
          const isDesktop = device.type === 'desktop'

          return (
            <div key={device.id} className={`device-card device-card--${device.status}`}>
              <div className="device-card-top">
                <div className="device-icon-wrap">
                  {isDesktop
                    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  }
                </div>
                <div className="device-info">
                  <strong className="device-name">{device.name}</strong>
                  {device.current && <span className="current-badge">Current</span>}
                </div>
                <span className={`device-status-badge ${statusMeta.cls}`}>{statusMeta.label}</span>
              </div>

              <div className="device-meta-grid">
                <div className="dm-row">
                  <span className="dm-key">IP Address</span>
                  <span className="dm-val">{device.ip}</span>
                </div>
                <div className="dm-row">
                  <span className="dm-key">Location</span>
                  <span className="dm-val">{device.location}</span>
                </div>
                <div className="dm-row">
                  <span className="dm-key">Last Seen</span>
                  <span className="dm-val">{device.lastSeen}</span>
                </div>
                <div className="dm-row">
                  <span className="dm-key">IP Risk</span>
                  <span className={`dm-val risk-val risk-${ipRisk.score > 40 ? 'high' : ipRisk.score > 10 ? 'medium' : 'low'}`}>
                    {ipRisk.score > 40 ? 'High' : ipRisk.score > 10 ? 'Medium' : 'Low'} ({ipRisk.score})
                  </span>
                </div>
              </div>

              {/* Trust score bar */}
              <div className="trust-score-wrap">
                <span className="trust-score-label">Trust Score</span>
                <div className="trust-bar-bg">
                  <div
                    className="trust-bar-fill"
                    style={{
                      width: `${device.trustScore}%`,
                      background: device.trustScore >= 80 ? '#10b981' : device.trustScore >= 40 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
                <span className="trust-score-num">{device.trustScore}</span>
              </div>

              {ipRisk.flags.length > 0 && (
                <div className="ip-flags">
                  {ipRisk.flags.map((f, i) => <span key={i} className="ip-flag-chip">{f}</span>)}
                </div>
              )}

              {!device.current && (
                <div className="device-card-actions">
                  {device.status !== 'trusted' && (
                    <button className="action-btn action-btn--green" onClick={() => handleTrust(device)}>Trust</button>
                  )}
                  {device.status !== 'blocked' && (
                    <button className="action-btn action-btn--danger" onClick={() => handleBlockDevice(device)}>Block</button>
                  )}
                  <button className="action-btn action-btn--ghost" onClick={() => removeDevice(device.id)}>Remove</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent login locations table */}
      <div className="login-locations">
        <h4 className="sec-section-title" style={{ marginBottom: 16 }}>Recent Login Locations</h4>
        <table className="rule-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>IP Address</th>
              <th>Device</th>
              <th>Risk Level</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => {
              const ipRisk = analyzeIPRisk(d.ip)
              const level = ipRisk.score > 40 ? 'High' : ipRisk.score > 10 ? 'Medium' : 'Low'
              const cls   = ipRisk.score > 40 ? 'sev-high' : ipRisk.score > 10 ? 'sev-medium' : 'sev-info'
              return (
                <tr key={d.id}>
                  <td>{d.location}</td>
                  <td className="rule-target">{d.ip}</td>
                  <td>{d.name}</td>
                  <td><span className={`sev-badge ${cls}`}>{level}</span></td>
                  <td className="rule-date">{d.lastSeen}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Sub-tab: Audit Log ─────────────────────────────────────────────────────────

function AuditTab() {
  const { auditLog } = useSecurity()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const AUTH_EVENTS = new Set(['login_success', 'login_failed', '2fa_enabled', 'password_changed', 'session_revoked'])
  const SEC_EVENTS  = new Set(['ip_blocked', 'geo_alert', 'threat_detected', 'account_freeze', 'rule_added'])

  const shown = useMemo(() => {
    let list = auditLog
    if (filter === 'auth')     list = list.filter(e => AUTH_EVENTS.has(e.event))
    if (filter === 'security') list = list.filter(e => SEC_EVENTS.has(e.event))
    if (filter === 'high')     list = list.filter(e => e.severity === 'high')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.description.toLowerCase().includes(q) || e.ip.includes(q) || e.location.toLowerCase().includes(q))
    }
    return list
  }, [auditLog, filter, search])

  function exportCSV() {
    const header = 'Time,Event,Severity,Description,IP,Location'
    const rows = auditLog.map(e =>
      [new Date(e.timestamp).toLocaleString(), e.event, e.severity, `"${e.description}"`, e.ip, e.location].join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `NovaBank_AuditLog_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="sec-tab-content">
      <div className="sec-section-header">
        <div>
          <h3 className="sec-section-title">Security Audit Log</h3>
          <p className="sec-section-sub">{auditLog.length} total events</p>
        </div>
        <button className="btn-export" onClick={exportCSV}>Export CSV</button>
      </div>

      <div className="audit-controls">
        <div className="sec-filter-bar">
          {[['all', 'All Events'], ['auth', 'Auth Events'], ['security', 'Security Events'], ['high', 'High Severity']].map(([val, label]) => (
            <button key={val} className={`filter-btn ${filter === val ? 'filter-btn--active' : ''}`} onClick={() => setFilter(val)}>
              {label}
            </button>
          ))}
        </div>
        <input
          className="audit-search"
          placeholder="Search events, IPs, locations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="rule-table-wrap">
        <table className="rule-table audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>Severity</th>
              <th>Description</th>
              <th>IP Address</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(entry => {
              const meta = AUDIT_EVENT_META[entry.event] || { label: entry.event, color: 'sev-info' }
              return (
                <tr key={entry.id}>
                  <td className="audit-time">{timeAgo(entry.timestamp)}</td>
                  <td><span className={`sev-badge ${meta.color}`}>{meta.label}</span></td>
                  <td><span className={`sev-badge ${SEVERITY_CLASS[entry.severity] || 'sev-info'}`}>{SEVERITY_LABEL[entry.severity] || entry.severity}</span></td>
                  <td className="audit-desc">{entry.description}</td>
                  <td className="rule-target">{entry.ip}</td>
                  <td className="rule-date">{entry.location}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {shown.length === 0 && <div className="sec-empty">No events match this filter.</div>}
      </div>
    </div>
  )
}

// ── Random IP helper for simulation ──────────────────────────────────────────
function randomIP() {
  return [
    Math.floor(Math.random() * 223) + 1,
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
  ].join('.')
}

// ── Main Security page ────────────────────────────────────────────────────────

const TABS = [
  { id: 'threats',  label: 'Threat Detection' },
  { id: 'firewall', label: 'Firewall & Policies' },
  { id: 'devices',  label: 'Device & IP Monitor' },
  { id: 'audit',    label: 'Audit Log' },
]

export default function Security() {
  const [activeTab, setActiveTab] = useState('threats')
  const { activeThreats, firewallRules, devices } = useSecurity()

  const highThreats = activeThreats.filter(t => t.severity === 'high').length
  const suspiciousDevices = devices.filter(d => d.status === 'suspicious').length

  const BADGE = {
    threats:  highThreats > 0 ? String(highThreats) : null,
    firewall: String(firewallRules.filter(r => r.enabled).length),
    devices:  suspiciousDevices > 0 ? String(suspiciousDevices) : null,
    audit:    null,
  }

  return (
    <div className="security-page">
      <div className="security-page-header">
        <div className="security-header-left">
          <div className="security-shield-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h1 className="security-page-title">Security Center</h1>
            <p className="security-page-sub">Threat detection, firewall rules, device monitoring and audit trail</p>
          </div>
        </div>
        {highThreats > 0 && (
          <div className="header-threat-alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {highThreats} high-severity threat{highThreats !== 1 ? 's' : ''} require attention
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="sec-tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`sec-tab-btn ${activeTab === tab.id ? 'sec-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {BADGE[tab.id] && <span className="tab-badge">{BADGE[tab.id]}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'threats'  && <ThreatTab />}
      {activeTab === 'firewall' && <FirewallTab />}
      {activeTab === 'devices'  && <DeviceTab />}
      {activeTab === 'audit'    && <AuditTab />}
    </div>
  )
}
