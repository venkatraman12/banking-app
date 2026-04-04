import React, { useState } from 'react'
import './Loans.css'

const activeLoans = [
  {
    id: 1, name: 'Home Mortgage', amount: 350000, outstanding: 285000,
    rate: 3.25, monthly: 1520, nextDue: 'Mar 15', term: '30 years', icon: '🏠',
    paid: 18.5, color: '#1a56db',
  },
  {
    id: 2, name: 'Auto Loan', amount: 28000, outstanding: 12400,
    rate: 4.9, monthly: 485, nextDue: 'Mar 20', term: '5 years', icon: '🚗',
    paid: 55.7, color: '#0ea5e9',
  },
  {
    id: 3, name: 'Personal Loan', amount: 10000, outstanding: 3200,
    rate: 7.5, monthly: 320, nextDue: 'Mar 25', term: '3 years', icon: '💳',
    paid: 68, color: '#8b5cf6',
  },
]

export default function Loans() {
  const [applyOpen, setApplyOpen] = useState(false)
  const [loanType, setLoanType] = useState('personal')
  const [loanAmount, setLoanAmount] = useState('5000')

  const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstanding, 0)
  const totalMonthly = activeLoans.reduce((s, l) => s + l.monthly, 0)

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
