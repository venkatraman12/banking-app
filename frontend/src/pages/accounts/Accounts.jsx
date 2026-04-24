import React, { useEffect, useState } from 'react'
import Prv from '../../components/Prv/Prv'
import { api } from '../../api/client'
import './Accounts.css'

const TYPE_COLORS = {
  CHECKING:   '#1a56db',
  SAVINGS:    '#0ea5e9',
  INVESTMENT: '#8b5cf6',
}

const formatType = (t) => t ? (t.charAt(0) + t.slice(1).toLowerCase()) : ''

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    api.getAccounts()
      .then(res => {
        const list = res.data.map(a => ({
          ...a,
          color: TYPE_COLORS[a.type] || '#1a56db',
          typeLabel: formatType(a.type),
          opened: new Date(a.createdAt).toLocaleDateString('en-US',
            { month: 'short', year: 'numeric' }),
        }))
        setAccounts(list)
        setSelected(list[0] || null)
      })
      .catch(err => setError(err.message || 'Failed to load accounts'))
      .finally(() => setLoading(false))
  }, [])

  const isFrozen = selected?.status === 'FROZEN'

  const toggleFreeze = async () => {
    if (!selected) return
    const next = isFrozen ? 'ACTIVE' : 'FROZEN'
    try {
      const res = await api.updateAccount(selected.id, { status: next })
      const updated = { ...selected, ...res.data,
                        color: selected.color, typeLabel: selected.typeLabel,
                        opened: selected.opened }
      setSelected(updated)
      setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a))
    } catch (err) {
      setError(err.message || 'Could not update account')
    }
  }

  if (loading) return <div className="accounts-page"><p>Loading accounts…</p></div>
  if (error)   return <div className="accounts-page"><p className="error">{error}</p></div>
  if (!selected) return <div className="accounts-page"><p>No accounts yet.</p></div>

  return (
    <div className="accounts-page">
      <div className="page-header">
        <div>
          <h1>Accounts</h1>
          <p>Manage and view all your bank accounts</p>
        </div>
        <button className="btn btn-primary">+ Add Account</button>
      </div>

      <div className="accounts-layout">
        <div className="accounts-sidebar">
          {accounts.map(account => (
            <button
              key={account.id}
              className={`account-card ${selected.id === account.id ? 'account-card--active' : ''}`}
              onClick={() => setSelected(account)}
            >
              <div className="account-card-top">
                <div className="account-card-icon" style={{ background: account.color }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <span className={`account-status ${account.status === 'FROZEN' ? 'status--frozen' : 'status--active'}`}>
                  {account.status === 'FROZEN' ? 'Frozen' : formatType(account.status)}
                </span>
              </div>
              <div className="account-card-name">{account.name}</div>
              <div className="account-card-balance">
                <Prv>${Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Prv>
              </div>
              <div className="account-card-number">{account.number}</div>
            </button>
          ))}
        </div>

        <div className="account-detail card">
          <div className="detail-hero" style={{ background: `linear-gradient(135deg, ${selected.color}, ${selected.color}cc)` }}>
            <div className="detail-hero-type">{selected.typeLabel} Account</div>
            <div className="detail-hero-balance">
              <Prv>${Number(selected.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Prv>
            </div>
            <div className="detail-hero-number">{selected.number}</div>
          </div>

          {isFrozen && (
            <div className="account-frozen-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              This account is frozen. Transactions are disabled.
            </div>
          )}

          <div className="detail-body">
            <div className="detail-info-grid">
              <div className="detail-info-item">
                <span className="detail-info-label">Account Type</span>
                <span className="detail-info-value">{selected.typeLabel}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Bank</span>
                <span className="detail-info-value">NovaBank</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Opened</span>
                <span className="detail-info-value">{selected.opened}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Status</span>
                <span className="detail-info-value">{formatType(selected.status)}</span>
              </div>
            </div>

            <div className="detail-actions">
              <button className="btn btn-primary" disabled={isFrozen}>Transfer Funds</button>
              <button className="btn btn-outline">Download Statement</button>
              <button className="btn btn-outline">Account Settings</button>
              <button
                className={`btn ${isFrozen ? 'btn-success' : 'btn-danger'}`}
                onClick={toggleFreeze}
              >
                {isFrozen ? '🔓 Unfreeze Account' : '🔒 Freeze Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
