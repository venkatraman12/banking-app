import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSecurity } from '../../context/SecurityContext'
import { useToast } from '../../context/ToastContext'
import './Header.css'

const PAGE_TITLES = {
  '/dashboard':    { title: 'Dashboard',    sub: 'Overview' },
  '/accounts':     { title: 'Accounts',     sub: 'My Accounts' },
  '/transactions': { title: 'Transactions', sub: 'History' },
  '/payments':     { title: 'Payments',     sub: 'Bills & Payments' },
  '/transfer':     { title: 'Transfer',     sub: 'Send Money' },
  '/loans':        { title: 'Loans',        sub: 'Loan Center' },
  '/cards':        { title: 'Cards',        sub: 'Card Management' },
  '/savings':      { title: 'Savings',      sub: 'Savings Goals' },
  '/investments':  { title: 'Investments',  sub: 'Portfolio' },
  '/analytics':    { title: 'Analytics',    sub: 'Insights' },
  '/profile':      { title: 'Profile',      sub: 'Account Settings' },
}

const SEARCH_INDEX = [
  { label: 'Dashboard',    sub: 'Home overview',          path: '/dashboard',    icon: '🏠' },
  { label: 'Accounts',     sub: 'My bank accounts',       path: '/accounts',     icon: '🏦' },
  { label: 'Transactions', sub: 'Transaction history',    path: '/transactions', icon: '📊' },
  { label: 'Payments',     sub: 'Pay bills & schedule',   path: '/payments',     icon: '💳' },
  { label: 'Transfer',     sub: 'Send money',             path: '/transfer',     icon: '🔄' },
  { label: 'Loans',        sub: 'Loan center',            path: '/loans',        icon: '🏷️' },
  { label: 'Cards',        sub: 'Card management',        path: '/cards',        icon: '💳' },
  { label: 'Savings',      sub: 'Savings goals',          path: '/savings',      icon: '🎯' },
  { label: 'Investments',  sub: 'Portfolio & stocks',     path: '/investments',  icon: '📈' },
  { label: 'Analytics',    sub: 'Financial insights',     path: '/analytics',    icon: '💡' },
  { label: 'Profile',      sub: 'Account settings',       path: '/profile',      icon: '👤' },
  { label: 'Netflix',      sub: 'Recent transaction',     path: '/transactions', icon: '🎬' },
  { label: 'Salary',       sub: 'Income · Mar 9',         path: '/transactions', icon: '💼' },
  { label: 'Amazon',       sub: 'Recent transaction',     path: '/transactions', icon: '📦' },
  { label: 'Security',     sub: 'Security settings',      path: '/profile',      icon: '🔐' },
]

const NOTIFICATIONS = [
  { id: 1, icon: '💰', text: 'Payment of $250 received from John Doe', time: '2 min ago', unread: true,  type: 'success' },
  { id: 2, icon: '✅', text: 'Your loan application has been approved',  time: '1 hour ago', unread: true,  type: 'info' },
  { id: 3, icon: '📄', text: 'Monthly statement ready to download',      time: '3 hours ago', unread: false, type: 'neutral' },
  { id: 4, icon: '⚠️', text: 'Unusual login attempt detected',          time: 'Yesterday',  unread: false, type: 'warning' },
]

const THEME_CYCLE = { system: 'light', light: 'dark', dark: 'system' }

export default function Header({ user, onMenuClick, themeMode, isDark, onSetTheme }) {
  const [notifOpen, setNotifOpen]   = useState(false)
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen,  setSearchOpen]  = useState(false)
  const searchRef = useRef(null)
  const { privacyMode, togglePrivacy, activeAlerts, accountFrozen } = useSecurity()
  const toast    = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const pageInfo   = PAGE_TITLES[location.pathname] || { title: 'NovaBank', sub: '' }
  const unreadCount = notifications.filter(n => n.unread).length

  const searchResults = searchQuery.length > 0
    ? SEARCH_INDEX.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sub.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : []

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleSearchSelect = (item) => {
    navigate(item.path)
    setSearchQuery('')
    setSearchOpen(false)
  }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
    toast.success('All notifications marked as read')
  }

  return (
    <header className="header">
      <button className="header-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Page title */}
      <div className="header-title">
        <span className="header-breadcrumb">NovaBank</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="header-breadcrumb-sep">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span className="header-page-name">{pageInfo.title}</span>
      </div>

      {/* Search */}
      <div className={`header-search ${searchOpen ? 'header-search--focused' : ''}`} onClick={() => { setSearchOpen(true); searchRef.current?.focus() }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search… (⌘K)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => { setSearchOpen(false); setSearchQuery('') }, 180)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}

        {/* Search results dropdown */}
        {searchOpen && searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map(item => (
              <button key={item.path + item.label} className="search-result" onMouseDown={() => handleSearchSelect(item)}>
                <span className="search-result-icon">{item.icon}</span>
                <div className="search-result-text">
                  <strong>{item.label}</strong>
                  <span>{item.sub}</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        )}
        {searchOpen && searchQuery.length > 1 && searchResults.length === 0 && (
          <div className="search-dropdown search-dropdown--empty">
            <span>No results for "<strong>{searchQuery}</strong>"</span>
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="header-actions">

        {/* Security Alert */}
        {(accountFrozen || activeAlerts.length > 0) && (
          <button
            className={`header-icon-btn security-alert-btn ${accountFrozen ? 'security-alert-btn--frozen' : 'security-alert-btn--warn'}`}
            onClick={() => navigate('/profile')}
            title={accountFrozen ? 'Account frozen' : `${activeAlerts.length} alert${activeAlerts.length !== 1 ? 's' : ''}`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="security-alert-badge">{accountFrozen ? '!' : activeAlerts.length}</span>
          </button>
        )}

        {/* Theme toggle — cycles: system → light → dark */}
        <button
          className={`header-icon-btn dark-mode-btn ${isDark ? 'dark-mode-btn--on' : ''}`}
          onClick={() => onSetTheme(THEME_CYCLE[themeMode])}
          title={themeMode === 'system' ? 'Theme: System (click for Light)' : themeMode === 'light' ? 'Theme: Light (click for Dark)' : 'Theme: Dark (click for System)'}
          aria-label="Cycle theme"
        >
          {themeMode === 'system' ? (
            /* Monitor / auto icon */
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          ) : themeMode === 'light' ? (
            /* Sun icon */
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            /* Moon icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Privacy Toggle */}
        <button
          className={`header-icon-btn privacy-btn ${privacyMode ? 'privacy-btn--on' : ''}`}
          onClick={togglePrivacy}
          aria-label={privacyMode ? 'Show balances' : 'Hide balances'}
          title={privacyMode ? 'Show balances' : 'Hide balances'}
        >
          {privacyMode ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>

        {/* Notifications */}
        <div className="notif-wrapper">
          <button className="header-icon-btn" onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {notifOpen && (
            <>
              <div className="notif-backdrop" onClick={() => setNotifOpen(false)} />
              <div className="notif-dropdown">
                <div className="notif-header">
                  <span>Notifications</span>
                  <span className="notif-count">{unreadCount} unread</span>
                  <button onClick={markAllRead}>Mark all read</button>
                </div>
                {notifications.map(n => (
                  <div key={n.id} className={`notif-item notif-item--${n.type} ${n.unread ? 'notif-item--unread' : ''}`}>
                    <div className={`notif-icon notif-icon--${n.type}`}>{n.icon}</div>
                    <div className="notif-content">
                      <p>{n.text}</p>
                      <span>{n.time}</span>
                    </div>
                    {n.unread && <div className="notif-unread-dot" />}
                  </div>
                ))}
                <div className="notif-footer">
                  <button onClick={() => setNotifOpen(false)}>View all notifications</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Avatar */}
        <div className="header-user" onClick={() => navigate('/profile')} role="button" tabIndex={0}>
          <div className="user-avatar">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Alex Johnson'}</span>
            <span className="user-role">Premium Member</span>
          </div>
        </div>
      </div>
    </header>
  )
}
