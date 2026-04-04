import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SecurityProvider, useSecurity } from './context/SecurityContext'
import { ToastProvider } from './context/ToastContext'
import Login from './pages/auth/Login'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/dashboard/Dashboard'
import Accounts from './pages/accounts/Accounts'
import Transactions from './pages/transactions/Transactions'
import Payments from './pages/payments/Payments'
import Profile from './pages/profile/Profile'
import Loans from './pages/loans/Loans'
import Cards from './pages/cards/Cards'
import Transfer from './pages/transfer/Transfer'
import Savings from './pages/savings/Savings'
import Investments from './pages/investments/Investments'
import Analytics from './pages/analytics/Analytics'

const INACTIVITY_TIMEOUT = 5 * 60 * 1000
const WARN_BEFORE = 60 * 1000

function AppContent({ darkMode, onToggleDark }) {
  const { privacyMode } = useSecurity()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser]         = useState(null)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)

  const warnTimer          = useRef(null)
  const logoutTimer        = useRef(null)
  const countdownInterval  = useRef(null)

  const handleLogin = (user) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleLogout = useCallback(() => {
    clearTimeout(warnTimer.current)
    clearTimeout(logoutTimer.current)
    clearInterval(countdownInterval.current)
    setShowTimeoutWarning(false)
    setCurrentUser(null)
    setIsAuthenticated(false)
  }, [])

  const resetTimers = useCallback(() => {
    if (!isAuthenticated) return
    clearTimeout(warnTimer.current)
    clearTimeout(logoutTimer.current)
    clearInterval(countdownInterval.current)
    setShowTimeoutWarning(false)

    warnTimer.current = setTimeout(() => {
      setShowTimeoutWarning(true)
      setCountdown(60)
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownInterval.current); return 0 }
          return prev - 1
        })
      }, 1000)
    }, INACTIVITY_TIMEOUT - WARN_BEFORE)

    logoutTimer.current = setTimeout(() => {
      handleLogout()
    }, INACTIVITY_TIMEOUT)
  }, [isAuthenticated, handleLogout])

  useEffect(() => {
    if (!isAuthenticated) return
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimers, { passive: true }))
    resetTimers()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimers))
      clearTimeout(warnTimer.current)
      clearTimeout(logoutTimer.current)
      clearInterval(countdownInterval.current)
    }
  }, [isAuthenticated, resetTimers])

  return (
    <div className={privacyMode ? 'privacy-mode' : ''}>
      {/* Inactivity Warning Modal */}
      {showTimeoutWarning && (
        <div className="timeout-overlay">
          <div className="timeout-modal">
            <div className="timeout-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3>Session Expiring Soon</h3>
            <p>You've been inactive. For your security, you'll be logged out in</p>
            <div className="timeout-countdown">{countdown}s</div>
            <div className="timeout-actions">
              <button className="btn btn-primary" onClick={resetTimers}>Stay Logged In</button>
              <button className="btn btn-outline" onClick={handleLogout}>Log Out Now</button>
            </div>
          </div>
        </div>
      )}

      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/"
          element={
            isAuthenticated
              ? <AppLayout user={currentUser} onLogout={handleLogout} darkMode={darkMode} onToggleDark={onToggleDark} />
              : <Navigate to="/login" replace />
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<Dashboard user={currentUser} />} />
          <Route path="accounts"     element={<Accounts />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="payments"     element={<Payments />} />
          <Route path="loans"        element={<Loans />} />
          <Route path="cards"        element={<Cards />} />
          <Route path="transfer"     element={<Transfer />} />
          <Route path="savings"      element={<Savings />} />
          <Route path="investments"  element={<Investments />} />
          <Route path="analytics"    element={<Analytics />} />
          <Route path="profile"      element={<Profile user={currentUser} />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('nova-theme') === 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.setAttribute('data-theme', 'dark')
      localStorage.setItem('nova-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
      localStorage.setItem('nova-theme', 'light')
    }
  }, [darkMode])

  return (
    <SecurityProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppContent darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
        </BrowserRouter>
      </ToastProvider>
    </SecurityProvider>
  )
}
