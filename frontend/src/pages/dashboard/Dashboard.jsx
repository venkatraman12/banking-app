import React, { Profiler, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSecurity } from '../../context/SecurityContext'
import { useToast } from '../../context/ToastContext'
import Prv from '../../components/Prv'
import './Dashboard.css'

/* ── Data ── */
const accounts = [
  { id: 1, name: 'Checking Account',   number: '****4821', balance: 12450.75, type: 'checking',   color: '#4338ca', bg: '#eef2ff', trend: +3.2 },
  { id: 2, name: 'Savings Account',    number: '****2934', balance: 34820.00, type: 'savings',    color: '#0ea5e9', bg: '#e0f2fe', trend: +1.8 },
  { id: 3, name: 'Investment Account', number: '****7610', balance: 89340.50, type: 'investment', color: '#7c3aed', bg: '#f5f3ff', trend: +5.4 },
]

const recentTransactions = [
  { id: 1, name: 'Netflix Subscription',  category: 'Entertainment', amount: -15.99,   date: 'Mar 10', icon: '🎬', note: 'Monthly plan · Auto-renews' },
  { id: 2, name: 'Salary Deposit',        category: 'Income',        amount: 5500.00,  date: 'Mar 9',  icon: '💼', note: 'Acme Corp · Direct deposit' },
  { id: 3, name: 'Whole Foods Market',    category: 'Groceries',     amount: -87.43,   date: 'Mar 8',  icon: '🛒', note: 'Weekly groceries' },
  { id: 4, name: 'Electric Bill',         category: 'Utilities',     amount: -124.00,  date: 'Mar 7',  icon: '⚡', note: 'City Power Co.' },
  { id: 5, name: 'Amazon Purchase',       category: 'Shopping',      amount: -234.99,  date: 'Mar 6',  icon: '📦', note: 'Order #114-6382-9124' },
]

const quickActions = [
  { label: 'Send Money',  color: '#4338ca', bg: '#eef2ff', path: '/transfer',     icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
  { label: 'Pay Bills',   color: '#0ea5e9', bg: '#e0f2fe', path: '/payments',    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { label: 'Top Up',      color: '#059669', bg: '#ecfdf5', path: '/savings',     icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
  { label: 'Invest',      color: '#7c3aed', bg: '#f5f3ff', path: '/investments', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 1 18"/><polyline points="16 7 22 7 22 13"/></svg> },
]

const spendingData = [
  { category: 'Housing',       amount: 1800, percent: 40, color: '#4338ca' },
  { category: 'Food',          amount: 650,  percent: 14, color: '#0ea5e9' },
  { category: 'Transport',     amount: 320,  percent: 7,  color: '#059669' },
  { category: 'Entertainment', amount: 280,  percent: 6,  color: '#d97706' },
  { category: 'Shopping',      amount: 413,  percent: 9,  color: '#7c3aed' },
  { category: 'Other',         amount: 1099, percent: 24, color: '#e5e7eb' },
]

/* ── Weekly sparkline data (7 days) ── */
const weeklyBalances = [132200, 134800, 133500, 136600, 135900, 138200, 136611.25]

/* ── Hooks ── */
function useCountUp(target, duration = 1200, start = 0) {
  const [value, setValue] = useState(start)
  const frameRef = useRef(null)

  useEffect(() => {
    const startTime = performance.now()
    const diff = target - start

    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out-cubic
      setValue(start + diff * eased)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration, start])

  return value
}

function useRipple() {
  const [ripples, setRipples] = useState([])

  const addRipple = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples(prev => [...prev, { id, x, y }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)
  }, [])

  return { ripples, addRipple }
}

/* ── Sparkline SVG ── */
function Sparkline({ data, width = 140, height = 44, color = '#6ee7b7' }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last = data[data.length - 1]
  const lastX = width
  const lastY = height - ((last - min) / range) * (height - 6) - 3

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polyline
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkGrad)"
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sparkline-line"
      />
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} className="sparkline-dot" />
    </svg>
  )
}

/* ── Donut Chart ── */
function DonutChart({ data, size = 160 }) {
  const [animated, setAnimated] = useState(false)
  const [hovered, setHovered] = useState(null)
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const filtered = data.filter(d => d.color !== '#e5e7eb')
  const total = data.reduce((s, d) => s + d.amount, 0)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(t)
  }, [])

  let offset = 0
  const segments = data.map(d => {
    const pct = d.amount / total
    const dash = pct * circumference
    const gap = circumference - dash
    const startOffset = circumference - offset * circumference / total
    offset += d.amount
    return { ...d, dash, gap, startOffset, pct }
  })

  const hoveredData = hovered !== null ? data[hovered] : null

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          {segments.map((seg, i) => (
            <circle
              key={seg.category}
              r={radius}
              cx="0"
              cy="0"
              fill="none"
              stroke={seg.color}
              strokeWidth={i === hovered ? 14 : 11}
              strokeDasharray={animated ? `${seg.dash} ${seg.gap}` : `0 ${circumference}`}
              strokeDashoffset={seg.startOffset}
              strokeLinecap="round"
              style={{
                transition: `stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms, stroke-width 0.2s ease`,
                cursor: 'pointer',
                opacity: hovered !== null && i !== hovered ? 0.45 : 1,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </g>
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="donut-center-label">
          {hoveredData ? `${Math.round(hoveredData.pct * 100)}%` : `$${(total / 1000).toFixed(1)}k`}
        </text>
        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="donut-center-sub">
          {hoveredData ? hoveredData.category : 'Total'}
        </text>
      </svg>
      <div className="donut-legend">
        {filtered.map((d, i) => (
          <div
            key={d.category}
            className={`donut-legend-item ${hovered === i ? 'donut-legend-item--active' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="donut-legend-dot" style={{ background: d.color }} />
            <span className="donut-legend-label">{d.category}</span>
            <span className="donut-legend-amount">${d.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Mini Bar Chart ── */
function MiniBarChart({ data, color }) {
  const max = Math.max(...data)
  return (
    <div className="mini-bar-chart">
      {data.map((v, i) => (
        <div
          key={i}
          className="mini-bar"
          style={{
            height: `${(v / max) * 100}%`,
            background: color,
            animationDelay: `${i * 50}ms`,
          }}
          title={`$${v.toLocaleString()}`}
        />
      ))}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/* ── Dashboard ── */
export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const { privacyMode } = useSecurity()
  const toast = useToast()
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const firstName = user?.name?.split(' ')[0] || 'Alex'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const animatedBalance = useCountUp(totalBalance, 1400)
  const animatedIncome  = useCountUp(5500, 1200)
  const animatedSpend   = useCountUp(3462.41, 1200)

  const [expandedTx, setExpandedTx] = useState(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const handleQuickAction = (action) => {
    toast.success(`Navigating to ${action.label}…`)
    navigate(action.path)
  }

  return (
    <Profiler id="Dashboard" onRender={(id, phase, actual, base) =>
      console.log(`[Profiler] ${id} ${phase}: actual=${actual.toFixed(1)}ms base=${base.toFixed(1)}ms`)
    }>
    <div className="dashboard page-transition">

      {/* ── Welcome Header ── */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h1>
            {getGreeting()},{' '}
            <span className="greeting-name" onClick={() => navigate('/profile')} title="View Profile">
              {firstName} 👋
            </span>
          </h1>
          <p>Here's your financial overview for today.</p>
        </div>
        <div className="dashboard-welcome-right">
          <div className="dashboard-live-time">
            <span className="live-dot" />
            {timeStr}
          </div>
          <div className="dashboard-date">{today}</div>
          <div className="dashboard-security-chip">
            <span className="security-chip-dot" />
            Secure Session
          </div>
        </div>
      </div>

      {/* ── Hero Balance Card ── */}
      <div className="hero-balance-card">
        <div className="hero-balance-left">
          <div className="hero-balance-label">Total Portfolio Balance</div>
          <div className="hero-balance-value">
            <Prv>${animatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Prv>
          </div>
          <div className="hero-balance-change">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
            +2.4% this month · $3,241.25
          </div>
          <div className="hero-sparkline">
            <Sparkline data={weeklyBalances} />
            <span className="hero-sparkline-label">Last 7 days</span>
          </div>
        </div>
        <div className="hero-balance-stats">
          <div className="hero-stat">
            <span>Monthly Income</span>
            <strong><Prv>${animatedIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Prv></strong>
            <div className="hero-stat-bar"><div className="hero-stat-bar-fill" style={{ width: '100%', background: '#6ee7b7' }} /></div>
          </div>
          <div className="hero-stat">
            <span>Monthly Spend</span>
            <strong><Prv>${animatedSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Prv></strong>
            <div className="hero-stat-bar"><div className="hero-stat-bar-fill" style={{ width: `${(3462.41/5500)*100}%`, background: '#fca5a5' }} /></div>
          </div>
          <div className="hero-stat">
            <span>Net Savings</span>
            <strong style={{ color: '#6ee7b7' }}><Prv>$2,037.59</Prv></strong>
            <div className="hero-stat-bar"><div className="hero-stat-bar-fill" style={{ width: '37%', background: '#6ee7b7' }} /></div>
          </div>
        </div>
        <div className="hero-orb hero-orb--1" />
        <div className="hero-orb hero-orb--2" />
        <div className="hero-orb hero-orb--3" />
      </div>

      {/* ── Summary Metrics ── */}
      <div className="summary-cards">
        <SummaryCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
          iconBg="#ecfdf5" iconColor="#059669"
          label="Monthly Income" value={<Prv>$5,500.00</Prv>}
          change="Salary received" positive
          bars={[3200, 4100, 3800, 5000, 4600, 5500]}
          barColor="#059669"
        />
        <SummaryCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
          iconBg="#fef2f2" iconColor="#dc2626"
          label="Monthly Spend" value={<Prv>$3,462.41</Prv>}
          change="+5.2% vs last month" negative
          bars={[2800, 3100, 2950, 3300, 3150, 3462]}
          barColor="#dc2626"
        />
        <SummaryCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>}
          iconBg="#f5f3ff" iconColor="#7c3aed"
          label="Savings Rate" value="37.0%"
          change="On track for goal" positive
          bars={[28, 31, 33, 35, 36, 37]}
          barColor="#7c3aed"
        />
        <SummaryCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
          iconBg="#eef2ff" iconColor="#4338ca"
          label="Security Score" value={<span style={{ color: '#059669' }}>94/100</span>}
          change="Excellent rating" positive
          bars={[80, 84, 86, 88, 91, 94]}
          barColor="#4338ca"
        />
      </div>

      {/* ── Main Grid ── */}
      <div className="dashboard-grid">

        {/* Left column */}
        <div className="dashboard-col-left">

          {/* Accounts */}
          <section className="card">
            <div className="card-header">
              <h2>My Accounts</h2>
              <Link to="/accounts" className="card-action">View all →</Link>
            </div>
            <div className="accounts-list">
              {accounts.map((account, i) => (
                <div
                  key={account.id}
                  className="account-item"
                  onClick={() => navigate('/accounts')}
                  role="button"
                  tabIndex={0}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="account-icon" style={{ background: account.bg, color: account.color }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div className="account-info">
                    <span className="account-name">{account.name}</span>
                    <span className="account-number">{account.number}</span>
                  </div>
                  <div className="account-right">
                    <div className="account-balance">
                      <Prv>${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Prv>
                    </div>
                    <div className={`account-trend ${account.trend > 0 ? 'positive' : 'negative'}`}>
                      {account.trend > 0 ? '▲' : '▼'} {Math.abs(account.trend)}%
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="account-arrow">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="card">
            <div className="card-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map(action => (
                <QuickActionButton
                  key={action.label}
                  action={action}
                  onClick={() => handleQuickAction(action)}
                />
              ))}
            </div>
          </section>

          {/* AI Insights */}
          <section className="card insights-card">
            <div className="card-header">
              <h2>💡 Insights</h2>
              <span className="card-header-sub">AI-powered</span>
            </div>
            <div className="insights-list">
              <div className="insight-item insight-item--good">
                <div className="insight-icon">📈</div>
                <div className="insight-text">
                  <strong>You saved 37% this month</strong> — 5% above your target. Great work!
                </div>
              </div>
              <div className="insight-item insight-item--warn">
                <div className="insight-icon">⚠️</div>
                <div className="insight-text">
                  <strong>Spending is 5% higher</strong> than last month, mostly in Shopping.
                </div>
              </div>
              <div className="insight-item insight-item--info">
                <div className="insight-icon">💡</div>
                <div className="insight-text">
                  <strong>Investment account up 5.4%</strong> — your best performing account this month.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="dashboard-col-right">

          {/* Recent Transactions */}
          <section className="card">
            <div className="card-header">
              <h2>Recent Transactions</h2>
              <Link to="/transactions" className="card-action">View all →</Link>
            </div>
            <div className="transactions-list">
              {recentTransactions.map(tx => (
                <div key={tx.id}>
                  <div
                    className={`tx-item txn-row ${expandedTx === tx.id ? 'tx-item--expanded' : ''}`}
                    onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="tx-icon">{tx.icon}</div>
                    <div className="tx-info">
                      <span className="tx-name">{tx.name}</span>
                      <span className="tx-category">{tx.category} · {tx.date}</span>
                    </div>
                    <div className={`tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                      <Prv>{tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}</Prv>
                    </div>
                    <svg
                      width="12" height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`tx-chevron ${expandedTx === tx.id ? 'tx-chevron--open' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  {expandedTx === tx.id && (
                    <div className="tx-detail">
                      <div className="tx-detail-row">
                        <span>Note</span><span>{tx.note}</span>
                      </div>
                      <div className="tx-detail-row">
                        <span>Account</span><span>Checking ****4821</span>
                      </div>
                      <div className="tx-detail-row">
                        <span>Status</span>
                        <span className="status-badge status--completed">Completed</span>
                      </div>
                      <div className="tx-detail-actions">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={(e) => { e.stopPropagation(); toast.info('Receipt downloaded!') }}
                        >
                          Download Receipt
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => { e.stopPropagation(); toast.warning('Dispute submitted for review.') }}
                        >
                          Dispute
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Spending Breakdown — Donut */}
          <section className="card">
            <div className="card-header">
              <h2>Spending Breakdown</h2>
              <span className="card-header-sub">March 2026</span>
            </div>
            <DonutChart data={spendingData} size={160} />
          </section>
        </div>
      </div>
    </div>
    </Profiler>
  )
}

/* ── Sub-components ── */
function SummaryCard({ icon, iconBg, iconColor, label, value, change, positive, negative, bars, barColor }) {
  return (
    <div className="summary-card">
      <div className="summary-card-top">
        <div className="summary-card-icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
        <MiniBarChart data={bars} color={barColor} />
      </div>
      <div className="summary-card-label">{label}</div>
      <div className="summary-card-value">{value}</div>
      <div className={`summary-card-change ${positive ? 'positive' : negative ? 'negative' : ''}`}>
        {positive && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        )}
        {negative && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        )}
        {change}
      </div>
    </div>
  )
}

function QuickActionButton({ action, onClick }) {
  const { ripples, addRipple } = useRipple()

  const handleClick = (e) => {
    addRipple(e)
    onClick()
  }

  return (
    <button
      className="quick-action-btn ripple-host"
      onClick={handleClick}
    >
      {ripples.map(r => (
        <span
          key={r.id}
          className="ripple-circle"
          style={{ left: r.x, top: r.y }}
        />
      ))}
      <div className="quick-action-icon" style={{ background: action.bg, color: action.color }}>
        {action.icon}
      </div>
      <span>{action.label}</span>
    </button>
  )
}
