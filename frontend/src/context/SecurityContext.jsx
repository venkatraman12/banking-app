import { createContext, useContext, useState, useCallback } from 'react'
import { generateCsrfToken, generateSessionId } from '../utils/security'

const SecurityContext = createContext(null)

const INITIAL_ALERTS = [
  { id: 1, type: 'warning', message: 'Login detected from new device: Chrome on Windows, Berlin, DE', time: '10 min ago', dismissed: false },
  { id: 2, type: 'info',    message: 'Your security phrase was last verified 7 days ago — consider reviewing it', time: '2 hours ago', dismissed: false },
]

export function SecurityProvider({ children }) {
  const [privacyMode,    setPrivacyMode]    = useState(false)
  const [accountFrozen,  setAccountFrozen]  = useState(false)
  const [securityAlerts, setSecurityAlerts] = useState(INITIAL_ALERTS)

  // Generated once per session — used for CSRF simulation and fingerprinting
  const [csrfToken]  = useState(() => generateCsrfToken())
  const [sessionId]  = useState(() => generateSessionId())

  const togglePrivacy    = () => setPrivacyMode(v => !v)
  const freezeAccount    = () => setAccountFrozen(true)
  const unfreezeAccount  = () => setAccountFrozen(false)

  const dismissAlert = useCallback((id) => {
    setSecurityAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a))
  }, [])

  const addAlert = useCallback((alert) => {
    setSecurityAlerts(prev => [{ id: Date.now(), dismissed: false, ...alert }, ...prev])
  }, [])

  const activeAlerts = securityAlerts.filter(a => !a.dismissed)

  return (
    <SecurityContext.Provider value={{
      privacyMode, togglePrivacy,
      accountFrozen, freezeAccount, unfreezeAccount,
      securityAlerts, activeAlerts, dismissAlert, addAlert,
      csrfToken, sessionId,
    }}>
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  return useContext(SecurityContext)
}
