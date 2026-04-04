import React, { useState } from 'react'
import Prv from '../../components/Prv'
import './Accounts.css'

const accounts = [
  {
    id: 1, name: 'Checking Account', number: '4821 8834 2901 4821',
    balance: 12450.75, type: 'Checking', status: 'Active',
    bank: 'NovaBanc', opened: 'Jan 2020', color: '#1a56db',
    income: 5500, expenses: 3200,
  },
  {
    id: 2, name: 'Savings Account', number: '2934 5512 7823 2934',
    balance: 34820.00, type: 'Savings', status: 'Active',
    bank: 'NovaBanc', opened: 'Mar 2019', color: '#0ea5e9',
    income: 1200, expenses: 0,
  },
  {
    id: 3, name: 'Investment Account', number: '7610 4421 3310 7610',
    balance: 89340.50, type: 'Investment', status: 'Active',
    bank: 'NovaBanc', opened: 'Sep 2021', color: '#8b5cf6',
    income: 4200, expenses: 0,
  },
]

export default function Accounts() {
  const [selected, setSelected] = useState(accounts[0])
  const [frozenAccounts, setFrozenAccounts] = useState(new Set())

  const isFrozen = frozenAccounts.has(selected.id)

  const toggleFreeze = () => {
    setFrozenAccounts(prev => {
      const next = new Set(prev)
      if (next.has(selected.id)) next.delete(selected.id)
      else next.add(selected.id)
      return next
    })
  }

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
                <span className={`account-status ${frozenAccounts.has(account.id) ? 'status--frozen' : account.status === 'Active' ? 'status--active' : ''}`}>
                  {frozenAccounts.has(account.id) ? 'Frozen' : account.status}
                </span>
              </div>
              <div className="account-card-name">{account.name}</div>
              <div className="account-card-balance">
                <Prv>${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Prv>
              </div>
              <div className="account-card-number">{account.number.slice(-8)}</div>
            </button>
          ))}
        </div>

        <div className="account-detail card">
          <div className="detail-hero" style={{ background: `linear-gradient(135deg, ${selected.color}, ${selected.color}cc)` }}>
            <div className="detail-hero-type">{selected.type} Account</div>
            <div className="detail-hero-balance">
              <Prv>${selected.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Prv>
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
            <div className="detail-stats">
              <div className="detail-stat">
                <span className="detail-stat-label">Monthly Income</span>
                <span className="detail-stat-value positive">+${selected.income.toLocaleString()}</span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-label">Monthly Expenses</span>
                <span className="detail-stat-value negative">${selected.expenses.toLocaleString()}</span>
              </div>
            </div>

            <div className="detail-info-grid">
              <div className="detail-info-item">
                <span className="detail-info-label">Account Type</span>
                <span className="detail-info-value">{selected.type}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Bank</span>
                <span className="detail-info-value">{selected.bank}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Opened</span>
                <span className="detail-info-value">{selected.opened}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Status</span>
                <span className="detail-info-value">{selected.status}</span>
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
