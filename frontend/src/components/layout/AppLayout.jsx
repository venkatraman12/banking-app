import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSecurity } from '../../context/SecurityContext'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatBot from '../ChatBot/ChatBot'
import './AppLayout.css'

export default function AppLayout({ user, onLogout, themeMode, isDark, onSetTheme }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { privacyMode } = useSecurity()

  return (
    <div className={`app-layout${privacyMode ? ' privacy-mode' : ''}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
        user={user}
      />
      <div className="app-main">
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          themeMode={themeMode}
          isDark={isDark}
          onSetTheme={onSetTheme}
        />
        <main className="app-content">
          {/* key forces remount + re-animation on route change */}
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>
      <ChatBot />
    </div>
  )
}
