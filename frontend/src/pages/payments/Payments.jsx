import React, { useState, Profiler } from 'react'
import PinPad from '../../components/PinPad/PinPad'
import { validatePaymentForm } from '../../utils/validate'
import { downloadReceipt } from '../../utils/downloadReceipt'
import './Payments.css'

const scheduledPayments = [
  { id: 1, name: 'Rent', to: 'Landlord Properties LLC', amount: 1800, due: 'Mar 15', status: 'Upcoming', icon: '🏠' },
  { id: 2, name: 'Car Insurance', to: 'State Farm', amount: 145, due: 'Mar 18', status: 'Upcoming', icon: '🚗' },
  { id: 3, name: 'Internet Bill', to: 'Comcast', amount: 79.99, due: 'Mar 20', status: 'Upcoming', icon: '📡' },
  { id: 4, name: 'Student Loan', to: 'Navient', amount: 320, due: 'Mar 25', status: 'Upcoming', icon: '🎓' },
]

const recentPayments = [
  { id: 1, name: 'Electric Bill', to: 'Con Edison', amount: 124, date: 'Mar 7', status: 'Paid', icon: '⚡' },
  { id: 2, name: 'Netflix', to: 'Netflix Inc', amount: 15.99, date: 'Mar 5', status: 'Paid', icon: '🎬' },
  { id: 3, name: 'Gym', to: 'Planet Fitness', amount: 24.99, date: 'Mar 1', status: 'Paid', icon: '💪' },
]

export default function Payments() {
  const [form, setForm] = useState({ recipient: '', account: '', amount: '', note: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [payRef, setPayRef] = useState('')

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear field error on change
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  const handleSend = (e) => {
    e.preventDefault()
    const errs = validatePaymentForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setShowPin(true)
  }

  const handlePinSuccess = () => {
    setShowPin(false)
    setPayRef(`PAY${Date.now().toString().slice(-8)}`)
    setSent(true)
  }

  const handlePaymentReset = () => {
    setSent(false)
    setForm({ recipient: '', account: '', amount: '', note: '' })
    setPayRef('')
  }

  const handleDownload = () => {
    const accountLabel = form.account === 'checking' ? 'Checking ****4821' : 'Savings ****2934'
    downloadReceipt({
      type: 'Payment',
      reference: payRef,
      from: accountLabel,
      to: form.recipient,
      amount: form.amount,
      note: form.note || null,
    })
  }

  return (
    <Profiler id="Payments" onRender={(id, phase, actual, base) =>
      console.log(`[Profiler] ${id} ${phase}: actual=${actual.toFixed(1)}ms base=${base.toFixed(1)}ms`)
    }>
    <div className="payments-page">
      {showPin && (
        <PinPad
          title="Confirm Payment"
          subtitle={`Authorise payment of $${form.amount} to ${form.recipient}`}
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPin(false)}
        />
      )}

      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Send money and manage your scheduled payments</p>
        </div>
      </div>

      <div className="payments-grid">
        {/* Send Money */}
        <div className="card send-money-card">
          <div className="card-header">
            <h2>Send Money</h2>
          </div>

          {sent ? (
            <div className="payment-success">
              <div className="success-icon">✓</div>
              <h3>Payment Sent!</h3>
              <p>Your payment of <strong>${form.amount}</strong> to <strong>{form.recipient}</strong> was sent successfully.</p>
              <div className="success-ref" style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg)', padding: '5px 14px', borderRadius: 99, color: 'var(--text-muted)', marginTop: 4 }}>
                Reference: {payRef}
              </div>
              <button className="btn btn-outline btn-full" style={{ marginTop: 12 }} onClick={handleDownload}>
                ⬇ Download Receipt
              </button>
              <button className="btn btn-primary btn-full" style={{ marginTop: 6 }} onClick={handlePaymentReset}>
                Make Another Payment
              </button>
            </div>
          ) : (
            <form className="send-form" onSubmit={handleSend}>
              <div className="form-group">
                <label>Recipient Name or Email</label>
                <input
                  type="text"
                  placeholder="John Doe or john@example.com"
                  value={form.recipient}
                  onChange={e => handleChange('recipient', e.target.value)}
                  className={`form-input${errors.recipient ? ' input--error' : ''}`}
                />
                {errors.recipient && <span className="input-error">{errors.recipient}</span>}
              </div>

              <div className="form-group">
                <label>From Account</label>
                <select
                  value={form.account}
                  onChange={e => handleChange('account', e.target.value)}
                  className={`form-input${errors.account ? ' input--error' : ''}`}
                >
                  <option value="">Select account</option>
                  <option value="checking">Checking ****4821 — $12,450.75</option>
                  <option value="savings">Savings ****2934 — $34,820.00</option>
                </select>
                {errors.account && <span className="input-error">{errors.account}</span>}
              </div>

              <div className="form-group">
                <label>Amount (USD)</label>
                <div className="amount-input-wrapper">
                  <span className="amount-prefix">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    value={form.amount}
                    onChange={e => handleChange('amount', e.target.value)}
                    className={`form-input amount-input${errors.amount ? ' input--error' : ''}`}
                  />
                </div>
                {errors.amount && <span className="input-error">{errors.amount}</span>}
              </div>

              <div className="form-group">
                <label>Note <span className="label-optional">(optional, max 255)</span></label>
                <input
                  type="text"
                  placeholder="What's this payment for?"
                  value={form.note}
                  maxLength={255}
                  onChange={e => handleChange('note', e.target.value)}
                  className={`form-input${errors.note ? ' input--error' : ''}`}
                />
                {errors.note && <span className="input-error">{errors.note}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-full">
                🔒 Send Payment
              </button>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
                PIN verification required for all payments
              </p>
            </form>
          )}
        </div>

        {/* Scheduled */}
        <div className="payments-right">
          <div className="card">
            <div className="card-header">
              <h2>Upcoming Payments</h2>
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '13px' }}>
                + Schedule
              </button>
            </div>
            <div className="scheduled-list">
              {scheduledPayments.map(p => (
                <div key={p.id} className="scheduled-item">
                  <div className="scheduled-icon">{p.icon}</div>
                  <div className="scheduled-info">
                    <span className="scheduled-name">{p.name}</span>
                    <span className="scheduled-to">{p.to}</span>
                  </div>
                  <div className="scheduled-right">
                    <span className="scheduled-amount">${p.amount.toFixed(2)}</span>
                    <span className="scheduled-due">Due {p.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Recent Payments</h2>
            </div>
            <div className="scheduled-list">
              {recentPayments.map(p => (
                <div key={p.id} className="scheduled-item">
                  <div className="scheduled-icon">{p.icon}</div>
                  <div className="scheduled-info">
                    <span className="scheduled-name">{p.name}</span>
                    <span className="scheduled-to">{p.to}</span>
                  </div>
                  <div className="scheduled-right">
                    <span className="scheduled-amount" style={{ color: 'var(--text-primary)' }}>${p.amount.toFixed(2)}</span>
                    <span className="status-badge status--completed">{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </Profiler>
  )
}
