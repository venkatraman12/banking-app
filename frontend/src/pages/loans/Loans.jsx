import React, { useEffect, useState } from 'react'
import { api } from '../../api/client'
import './Loans.css'

const TYPE_UI = {
  HOME:      { icon: '🏠', color: '#1a56db', termLabel: (m) => `${Math.round(m / 12)} years` },
  AUTO:      { icon: '🚗', color: '#0ea5e9', termLabel: (m) => `${Math.round(m / 12)} years` },
  PERSONAL:  { icon: '💳', color: '#8b5cf6', termLabel: (m) => `${m} months` },
  BUSINESS:  { icon: '💼', color: '#059669', termLabel: (m) => `${m} months` },
  STUDENT:   { icon: '🎓', color: '#d97706', termLabel: (m) => `${Math.round(m / 12)} years` },
}

const shortDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  : '—'

function hydrate(l) {
  const ui = TYPE_UI[l.type] || TYPE_UI.PERSONAL
  const paid = l.principal
    ? Math.max(0, Math.min(100, (1 - l.outstanding / l.principal) * 100))
    : 0
  return {
    id: l.id,
    name: l.name,
    amount: l.principal,
    outstanding: l.outstanding,
    rate: l.rate,
    monthly: l.monthly,
    nextDue: shortDate(l.nextDueDate),
    term: ui.termLabel(l.termMonths || 0),
    icon: ui.icon,
    color: ui.color,
    paid: Number(paid.toFixed(1)),
  }
}

export default function Loans() {
  const [activeLoans, setActiveLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [applyOpen, setApplyOpen] = useState(false)
  const [loanType, setLoanType] = useState('personal')
  const [loanAmount, setLoanAmount] = useState('5000')

  useEffect(() => {
    api.getLoans()
      .then(res => setActiveLoans(res.data.map(hydrate)))
      .catch(err => setError(err.message || 'Failed to load loans'))
      .finally(() => setLoading(false))
  }, [])

  const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstanding, 0)
  const totalMonthly = activeLoans.reduce((s, l) => s + l.monthly, 0)

  if (loading) return <div className="loans-page"><p>Loading loans…</p></div>

  return (
    <div className="loans-page">
      <div className="page-header">
        <div>
          <h1>Loans</h1>
          <p>Manage your loans and explore financing options</p>
        </div>
        <button className="btn btn-primary" onClick={() => setApplyOpen(!applyOpen)}>
          {applyOpen ? 'Cancel' : 'Apply for Loan'}
        </button>
      </div>

      {error && <div className="card" style={{ padding: 12, color: 'var(--danger)' }}>{error}</div>}

      {applyOpen && (
        <div className="card loan-apply">
          <h2>New Loan Application</h2>
          <div className="apply-form">
            <div className="form-group">
              <label>Loan Type</label>
              <div className="loan-type-grid">
                {['personal', 'home', 'auto', 'business'].map(type => (
                  <button
                    key={type}
                    className={`loan-type-btn ${loanType === type ? 'loan-type-btn--active' : ''}`}
                    onClick={() => setLoanType(type)}
                  >
                    {type === 'personal' ? '💳' : type === 'home' ? '🏠' : type === 'auto' ? '🚗' : '💼'}
                    <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="apply-row">
              <div className="form-group">
                <label>Loan Amount</label>
                <div className="amount-input-wrapper">
                  <span className="amount-prefix">$</span>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={e => setLoanAmount(e.target.value)}
                    className="form-input amount-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <input type="text" placeholder="Brief description" className="form-input" />
              </div>
            </div>

            <div className="loan-estimate">
              <div className="estimate-item">
                <span>Estimated Rate</span>
                <strong>6.5% – 12.9% APR</strong>
              </div>
              <div className="estimate-item">
                <span>Term</span>
                <strong>12 – 60 months</strong>
              </div>
              <div className="estimate-item">
                <span>Est. Monthly</span>
                <strong>${(Number(loanAmount || 0) / 36 * 1.08).toFixed(2)}</strong>
              </div>
            </div>

            <button className="btn btn-primary">Submit Application</button>
          </div>
        </div>
      )}

      <div className="loan-summary-row">
        <div className="loan-summary-card">
          <span className="loan-summary-label">Total Outstanding</span>
          <span className="loan-summary-value">${totalOutstanding.toLocaleString()}</span>
        </div>
        <div className="loan-summary-card">
          <span className="loan-summary-label">Monthly Payments</span>
          <span className="loan-summary-value">${totalMonthly.toLocaleString()}</span>
        </div>
        <div className="loan-summary-card">
          <span className="loan-summary-label">Active Loans</span>
          <span className="loan-summary-value">{activeLoans.length}</span>
        </div>
      </div>

      <div className="loans-list">
        {activeLoans.map(loan => (
          <div key={loan.id} className="card loan-card">
            <div className="loan-card-header">
              <div className="loan-icon">{loan.icon}</div>
              <div className="loan-info">
                <h3>{loan.name}</h3>
                <span>{loan.rate}% APR · {loan.term}</span>
              </div>
              <div className="loan-next-due">
                <span className="due-label">Next Payment</span>
                <span className="due-date">{loan.nextDue}</span>
              </div>
            </div>

            <div className="loan-progress-section">
              <div className="loan-amounts">
                <div>
                  <span className="loan-amount-label">Outstanding</span>
                  <strong>${loan.outstanding.toLocaleString()}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="loan-amount-label">Original</span>
                  <strong>${loan.amount.toLocaleString()}</strong>
                </div>
              </div>
              <div className="loan-progress-bar">
                <div className="loan-progress-fill" style={{ width: `${loan.paid}%`, background: loan.color }} />
              </div>
              <div className="loan-progress-label">
                <span>{loan.paid}% paid off</span>
                <span>${loan.monthly}/month</span>
              </div>
            </div>

            <div className="loan-actions">
              <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '13px' }}>Make Payment</button>
              <button className="btn btn-outline" style={{ padding: '7px 14px', fontSize: '13px' }}>View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
