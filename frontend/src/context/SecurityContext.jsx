import { createContext, useContext, useState, useCallback } from 'react'
import { generateCsrfToken, generateSessionId } from '../utils/security'

const SecurityContext = createContext(null)

const now = Date.now()
const minsAgo  = m => new Date(now - m * 60000).toISOString()
const hoursAgo = h => new Date(now - h * 3600000).toISOString()
const daysAgo  = d => new Date(now - d * 86400000).toISOString()

const INITIAL_ALERTS = [
  { id: 1, type: 'warning', message: 'Login detected from new device: Chrome on Windows, Berlin, DE', time: '10 min ago', dismissed: false },
  { id: 2, type: 'info',    message: 'Your security phrase was last verified 7 days ago — consider reviewing it', time: '2 hours ago', dismissed: false },
]

const INITIAL_THREATS = [
  { id: 1, type: 'brute_force',         severity: 'high',   title: 'Brute Force Attempt',         description: '7 consecutive failed logins from IP 185.220.101.47', sourceIP: '185.220.101.47', country: 'RU', timestamp: minsAgo(12),  dismissed: false, blocked: true  },
  { id: 2, type: 'geo_anomaly',          severity: 'medium', title: 'Login from New Location',      description: 'Login from Warsaw, Poland — 5,400 mi from last known location', sourceIP: '91.228.54.12',  country: 'PL', timestamp: minsAgo(47),  dismissed: false, blocked: false },
  { id: 3, type: 'unusual_transaction',  severity: 'medium', title: 'Anomalous Transaction Pattern', description: '$8,500 transfer to new recipient — 34× your average transaction', sourceIP: null,            country: null, timestamp: hoursAgo(2),  dismissed: false, blocked: false },
  { id: 4, type: 'suspicious_ip',        severity: 'low',    title: 'Tor Exit Node Detected',       description: 'Login attempt from 94.102.49.190, a known Tor exit node',     sourceIP: '94.102.49.190', country: 'DE', timestamp: hoursAgo(3),  dismissed: true,  blocked: true  },
  { id: 5, type: 'credential_stuffing',  severity: 'high',   title: 'Credential Stuffing Detected', description: 'Rapid account enumeration pattern detected across subnet',      sourceIP: '192.168.1.x',   country: 'US', timestamp: hoursAgo(5),  dismissed: false, blocked: true  },
]

const INITIAL_FIREWALL_RULES = [
  { id: 1, type: 'ip_block',      target: '185.220.101.47', label: 'Brute force source',             enabled: true,  createdAt: '2024-03-15', hits: 24  },
  { id: 2, type: 'ip_block',      target: '94.102.49.190',  label: 'Tor exit node',                  enabled: true,  createdAt: '2024-03-14', hits: 3   },
  { id: 3, type: 'ip_block',      target: '192.168.1.100',  label: 'Credential stuffing source',     enabled: true,  createdAt: '2024-03-13', hits: 67  },
  { id: 4, type: 'geo_block',     target: 'KP',             label: 'High-risk country: North Korea',  enabled: true,  createdAt: '2024-01-01', hits: 0   },
  { id: 5, type: 'geo_block',     target: 'IR',             label: 'Sanctioned country: Iran',        enabled: true,  createdAt: '2024-01-01', hits: 1   },
  { id: 6, type: 'tx_limit',      target: '$5,000',         label: 'Single transaction cap',          enabled: true,  createdAt: '2024-02-20', hits: 4   },
  { id: 7, type: 'time_rule',     target: '23:00–05:00',    label: 'Off-hours enhanced verification', enabled: true,  createdAt: '2024-02-10', hits: 12  },
  { id: 8, type: 'device_policy', target: 'require_2fa',    label: 'Require 2FA on new devices',      enabled: true,  createdAt: '2024-01-15', hits: 8   },
  { id: 9, type: 'ip_allow',      target: '203.0.113.42',   label: 'Home office IP',                  enabled: true,  createdAt: '2024-03-01', hits: 156 },
]

const INITIAL_DEVICES = [
  { id: 1, name: 'Chrome on macOS',       type: 'desktop', ip: '203.0.113.42',  location: 'San Francisco, US', lastSeen: 'Just now',    status: 'trusted',    current: true,  trustScore: 98 },
  { id: 2, name: 'Safari on iPhone 15',   type: 'mobile',  ip: '172.58.67.123', location: 'San Francisco, US', lastSeen: '2 hours ago', status: 'trusted',    current: false, trustScore: 92 },
  { id: 3, name: 'Firefox on Windows',    type: 'desktop', ip: '91.228.54.12',  location: 'Warsaw, Poland',    lastSeen: '47 min ago',  status: 'suspicious', current: false, trustScore: 34 },
  { id: 4, name: 'Chrome on Android',     type: 'mobile',  ip: '185.220.101.47',location: 'Unknown',           lastSeen: '3 days ago',  status: 'blocked',    current: false, trustScore: 5  },
]

const INITIAL_AUDIT_LOG = [
  { id: 1,  event: 'login_success',   severity: 'info',   description: 'Successful login — Chrome on macOS',              ip: '203.0.113.42',  location: 'San Francisco, US', timestamp: minsAgo(5)   },
  { id: 2,  event: 'ip_blocked',      severity: 'high',   description: 'IP 185.220.101.47 auto-blocked after 7 failures',  ip: '185.220.101.47',location: 'Unknown',           timestamp: minsAgo(12)  },
  { id: 3,  event: 'login_failed',    severity: 'medium', description: 'Failed login attempt #7 — wrong password',         ip: '185.220.101.47',location: 'Unknown',           timestamp: minsAgo(13)  },
  { id: 4,  event: 'geo_alert',       severity: 'medium', description: 'Login from new country: Poland',                   ip: '91.228.54.12',  location: 'Warsaw, Poland',    timestamp: minsAgo(47)  },
  { id: 5,  event: 'tx_anomaly',      severity: 'medium', description: 'Anomalous transaction pattern flagged for review',  ip: '203.0.113.42',  location: 'San Francisco, US', timestamp: hoursAgo(2)  },
  { id: 6,  event: '2fa_enabled',     severity: 'info',   description: 'Two-factor authentication enabled via SMS',        ip: '203.0.113.42',  location: 'San Francisco, US', timestamp: hoursAgo(24) },
  { id: 7,  event: 'password_changed',severity: 'info',   description: 'Password changed successfully',                    ip: '203.0.113.42',  location: 'San Francisco, US', timestamp: daysAgo(2)   },
  { id: 8,  event: 'session_revoked', severity: 'info',   description: 'Session terminated: Firefox on Windows',           ip: '203.0.113.42',  location: 'San Francisco, US', timestamp: daysAgo(2)   },
  { id: 9,  event: 'account_freeze',  severity: 'high',   description: 'Account temporarily frozen by user',               ip: '203.0.113.42',  location: 'San Francisco, US', timestamp: daysAgo(3)   },
  { id: 10, event: 'rule_added',      severity: 'info',   description: 'Firewall rule added: Block 185.220.101.47',        ip: '203.0.113.42',  location: 'San Francisco, US', timestamp: daysAgo(4)   },
]

export function SecurityProvider({ children }) {
  const [privacyMode,    setPrivacyMode]    = useState(false)
  const [accountFrozen,  setAccountFrozen]  = useState(false)
  const [securityAlerts, setSecurityAlerts] = useState(INITIAL_ALERTS)
  const [threatEvents,   setThreatEvents]   = useState(INITIAL_THREATS)
  const [firewallRules,  setFirewallRules]  = useState(INITIAL_FIREWALL_RULES)
  const [devices,        setDevices]        = useState(INITIAL_DEVICES)
  const [auditLog,       setAuditLog]       = useState(INITIAL_AUDIT_LOG)

  const [csrfToken] = useState(() => generateCsrfToken())
  const [sessionId] = useState(() => generateSessionId())

  const togglePrivacy   = () => setPrivacyMode(v => !v)
  const freezeAccount   = () => setAccountFrozen(true)
  const unfreezeAccount = () => setAccountFrozen(false)

  const dismissAlert = useCallback((id) => {
    setSecurityAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a))
  }, [])
  const addAlert = useCallback((alert) => {
    setSecurityAlerts(prev => [{ id: Date.now(), dismissed: false, ...alert }, ...prev])
  }, [])

  // ── Threat management ────────────────────────────────────────────────────────
  const dismissThreat = useCallback((id) => {
    setThreatEvents(prev => prev.map(t => t.id === id ? { ...t, dismissed: true } : t))
  }, [])
  const blockThreatIP = useCallback((id) => {
    setThreatEvents(prev => prev.map(t => t.id === id ? { ...t, blocked: true } : t))
  }, [])
  const addThreat = useCallback((threat) => {
    const entry = { id: Date.now(), timestamp: new Date().toISOString(), dismissed: false, blocked: false, ...threat }
    setThreatEvents(prev => [entry, ...prev])
    addAuditEvent({ event: 'threat_detected', severity: threat.severity, description: threat.description, ip: threat.sourceIP || '—', location: '—' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Firewall rule management ─────────────────────────────────────────────────
  const addFirewallRule = useCallback((rule) => {
    setFirewallRules(prev => [{ id: Date.now(), enabled: true, hits: 0, createdAt: new Date().toLocaleDateString('en-CA'), ...rule }, ...prev])
  }, [])
  const removeFirewallRule = useCallback((id) => {
    setFirewallRules(prev => prev.filter(r => r.id !== id))
  }, [])
  const toggleFirewallRule = useCallback((id) => {
    setFirewallRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }, [])

  // ── Device management ─────────────────────────────────────────────────────────
  const blockDevice = useCallback((id) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'blocked', trustScore: 0 } : d))
  }, [])
  const trustDevice = useCallback((id) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'trusted', trustScore: 85 } : d))
  }, [])
  const removeDevice = useCallback((id) => {
    setDevices(prev => prev.filter(d => d.id !== id))
  }, [])

  // ── Audit log ─────────────────────────────────────────────────────────────────
  const addAuditEvent = useCallback((entry) => {
    setAuditLog(prev => [{ id: Date.now(), timestamp: new Date().toISOString(), location: 'San Francisco, US', ...entry }, ...prev])
  }, [])

  const activeAlerts  = securityAlerts.filter(a => !a.dismissed)
  const activeThreats = threatEvents.filter(t => !t.dismissed)

  return (
    <SecurityContext.Provider value={{
      privacyMode, togglePrivacy,
      accountFrozen, freezeAccount, unfreezeAccount,
      securityAlerts, activeAlerts, dismissAlert, addAlert,
      threatEvents, activeThreats, dismissThreat, blockThreatIP, addThreat,
      firewallRules, addFirewallRule, removeFirewallRule, toggleFirewallRule,
      devices, blockDevice, trustDevice, removeDevice,
      auditLog, addAuditEvent,
      csrfToken, sessionId,
    }}>
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  return useContext(SecurityContext)
}
