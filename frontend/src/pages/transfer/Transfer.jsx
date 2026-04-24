import React, { useEffect, useState } from 'react'
import { validateTransferForm } from '../../utils/validate'
import { downloadReceipt } from '../../utils/downloadReceipt'
import { detectTransactionAnomaly } from '../../utils/security'
import { api } from '../../api/client'
import './Transfer.css'

const beneficiaries = [
  { id: 1, name: 'John Smith', bank: 'Chase Bank', account: '****3892', avatar: 'J' },
  { id: 2, name: 'Sarah Connor', bank: 'Wells Fargo', account: '****7124', avatar: 'S' },
  { id: 3, name: 'Mike Torres', bank: 'Bank of America', account: '****5503', avatar: 'M' },
  { id: 4, name: 'Emily Davis', bank: 'Citibank', account: '****9921', avatar: 'E' },
]

const recentTransfers = [
  { id: 1, to: 'John Smith', amount: 250, date: 'Mar 8', type: 'external' },
  { id: 2, to: 'Savings ****2934', amount: 1000, date: 'Mar 5', type: 'internal' },
  { id: 3, to: 'Sarah Connor', amount: 75, date: 'Mar 1', type: 'external' },
]

const STEPS = ['Details', 'Review', 'Done']

const formatType = (t) => t ? (t.charAt(0) + t.slice(1).toLowerCase()) : ''

export default function Transfer() {
  const [myAccounts, setMyAccounts] = useState([])
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState('own') // 'own' | 'external'
  const [form, setForm] = useState({ from: '', to: '', beneficiary: null, amount: '', note: '', scheduled: false, schedDate: '' })
  const [errors, setErrors] = useState({})
  const [ref, setRef] = useState('')
  const [anomalyWarnings, setAnomalyWarnings] = useState([])
  const [anomalyAcknowledged, setAnomalyAcknowledged] = useState(false)

  useEffect(() => {
    api.getAccounts().then(res => {
      setMyAccounts(res.data.map(a => ({
        id: a.id,
        label: `${formatType(a.type)} ${a.number}`,
        balance: Number(a.balance),
      })))
    }).catch(() => {})
  }, [])

  const fromAcc = myAccounts.find(a => a.id === form.from)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  const handleNext = (e) => {
    e.preventDefault()
    const errs = validateTransferForm(form, fromAcc)
    if (mode === 'own' && !form.to) errs.to = 'To account is required'
    if (mode === 'external' && !form.beneficiary) errs.beneficiary = 'Please select a beneficiary'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    const warnings = detectTransactionAnomaly(form.amount)
    setAnomalyWarnings(warnings)
    setAnomalyAcknowledged(false)
    setStep(1)
  }

  const handleConfirm = async () => {
    setSubmitError('')
    if (mode === 'external') {
      // External transfers aren't backed by the API yet — simulate.
      setRef(`TXN${Date.now().toString().slice(-8)}`)
      setStep(2)
      return
    }
    setSubmitting(true)
    try {
      const res = await api.transfer({
        from_account_id: form.from,
        to_account_id: form.to,
        amount: Number(form.amount),
        description: form.note || null,
      })
      setRef(res.data.reference || res.data.id)
      setStep(2)
      // Refresh account balances
      api.getAccounts().then(r => {
        setMyAccounts(r.data.map(a => ({
          id: a.id,
          label: `${formatType(a.type)} ${a.number}`,
          balance: Number(a.balance),
        })))
      }).catch(() => {})
    } catch (err) {
      setSubmitError(err.message || 'Transfer failed')
    } finally {
      setSubmitting(false)
    }
  }
  const handleReset = () => { setStep(0); setForm({ from: '', to: '', beneficiary: null, amount: '', note: '', scheduled: false, schedDate: '' }) }

  const handleDownload = () => {
    downloadReceipt({
      type: 'Transfer',
      reference: ref,
      from: myAccounts.find(a => a.id === form.from)?.label || form.from,
      to: toLabel,
      amount: form.amount,
      note: form.note || null,
      scheduled: form.scheduled && form.schedDate ? form.schedDate : null,
      fee: 'Free',
    })
  }

  const toLabel = mode === 'own'
    ? myAccounts.find(a => a.id === form.to)?.label
    : beneficiaries.find(b => b.id === form.beneficiary)?.name

  return (
    <div className="transfer-page">
      <div className="page-header">
        <div><h1>Transfer Money</h1><p>Move funds between accounts or send to others</p></div>
      </div>

      <div className="transfer-layout">
        <div className="transfer-main">
          {/* Step indicator */}
          <div className="steps card">
            {STEPS.map((s, i) => (
              <div key={s} className={`step ${i === step ? 'step--active' : ''} ${i < step ? 'step--done' : ''}`}>
                <div className="step-circle">{i < step ? '✓' : i + 1}</div>
                <span>{s}</span>
                {i < STEPS.length - 1 && <div className="step-line" />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="card">
              <div className="transfer-mode-tabs">
                <button className={`mode-tab ${mode === 'own' ? 'mode-tab--active' : ''}`} onClick={() => setMode('own')}>
                  Own Accounts
                </button>
                <button className={`mode-tab ${mode === 'external' ? 'mode-tab--active' : ''}`} onClick={() => setMode('external')}>
                  Send to Others
                </button>
              </div>

              <form className="transfer-form" onSubmit={handleNext}>
                <div className="form-group">
                  <label>From Account</label>
                  <select className={`form-input${errors.from ? ' input--error' : ''}`} value={form.from} onChange={e => handleChange('from', e.target.value)}>
                    <option value="">Select account</option>
                    {myAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.label} — ${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</option>
                    ))}
                  </select>
                  {errors.from && <span className="input-error">{errors.from}</span>}
                </div>

                {mode === 'own' ? (
                  <div className="form-group">
                    <label>To Account</label>
                    <select className={`form-input${errors.to ? ' input--error' : ''}`} value={form.to} onChange={e => handleChange('to', e.target.value)}>
                      <option value="">Select account</option>
                      {myAccounts.filter(a => a.id !== form.from).map(a => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                    {errors.to && <span className="input-error">{errors.to}</span>}
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Select Beneficiary</label>
                    <div className="beneficiary-grid">
                      {beneficiaries.map(b => (
                        <button
                          key={b.id} type="button"
                          className={`beneficiary-btn ${form.beneficiary === b.id ? 'beneficiary-btn--active' : ''}`}
                          onClick={() => handleChange('beneficiary', b.id)}
                        >
                          <div className="ben-avatar">{b.avatar}</div>
                          <div className="ben-info">
                            <span className="ben-name">{b.name}</span>
                            <span className="ben-bank">{b.bank}</span>
                          </div>
                        </button>
                      ))}
                      <button type="button" className="beneficiary-btn beneficiary-add">
                        <div className="ben-avatar ben-avatar--add">+</div>
                        <div className="ben-info">
                          <span className="ben-name">Add New</span>
                          <span className="ben-bank">Beneficiary</span>
                        </div>
                      </button>
                    </div>
                    {errors.beneficiary && <span className="input-error">{errors.beneficiary}</span>}
                  </div>
                )}

                <div className="form-group">
                  <label>Amount (USD)</label>
                  <div className="amount-input-wrapper">
                    <span className="amount-prefix">$</span>
                    <input
                      type="number" className={`form-input amount-input${errors.amount ? ' input--error' : ''}`}
                      placeholder="0.00" min="0.01" max="1000000" step="0.01"
                      value={form.amount} onChange={e => handleChange('amount', e.target.value)}
                    />
                  </div>
                  {errors.amount && <span className="input-error">{errors.amount}</span>}
                </div>

                <div className="form-group">
                  <label>Note <span className="label-optional">(optional, max 255)</span></label>
                  <input type="text" className={`form-input${errors.note ? ' input--error' : ''}`} placeholder="What's this for?" maxLength={255} value={form.note} onChange={e => handleChange('note', e.target.value)} />
                  {errors.note && <span className="input-error">{errors.note}</span>}
                </div>

                <div className="form-group schedule-toggle">
                  <label className="toggle-label">
                    <input type="checkbox" checked={form.scheduled} onChange={e => handleChange('scheduled', e.target.checked)} />
                    Schedule for later
                  </label>
                  {form.scheduled && (
                    <>
                      <input type="date" className={`form-input${errors.schedDate ? ' input--error' : ''}`} value={form.schedDate} onChange={e => handleChange('schedDate', e.target.value)} />
                      {errors.schedDate && <span className="input-error">{errors.schedDate}</span>}
                    </>
                  )}
                </div>

                <button type="submit" className="btn btn-primary btn-full">Continue →</button>
              </form>
            </div>
          )}

          {step === 1 && (
            <div className="card review-card">
              <h2>Review Transfer</h2>

              {/* Anomaly warnings */}
              {anomalyWarnings.length > 0 && (
                <div className="anomaly-warnings">
                  <div className="anomaly-warnings-header">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Transaction Security Check
                  </div>
                  {anomalyWarnings.map((w, i) => (
                    <div key={i} className={`anomaly-item anomaly-item--${w.severity}`}>{w.message}</div>
                  ))}
                  <label className="anomaly-ack-label">
                    <input type="checkbox" checked={anomalyAcknowledged} onChange={e => setAnomalyAcknowledged(e.target.checked)} />
                    I understand and want to proceed with this transaction
                  </label>
                </div>
              )}
              <div className="review-row">
                <span>From</span><strong>{myAccounts.find(a => a.id === form.from)?.label}</strong>
              </div>
              <div className="review-row">
                <span>To</span><strong>{toLabel}</strong>
              </div>
              <div className="review-row review-row--amount">
                <span>Amount</span><strong>${Number(form.amount).toFixed(2)}</strong>
              </div>
              {form.note && <div className="review-row"><span>Note</span><strong>{form.note}</strong></div>}
              {form.scheduled && form.schedDate && (
                <div className="review-row"><span>Scheduled</span><strong>{form.schedDate}</strong></div>
              )}
              <div className="review-fee">
                <span>Transfer Fee</span><strong style={{ color: 'var(--success)' }}>Free</strong>
              </div>
              {submitError && <div className="anomaly-item anomaly-item--danger">{submitError}</div>}
              <div className="review-actions">
                <button className="btn btn-outline" onClick={() => setStep(0)} disabled={submitting}>← Back</button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirm}
                  disabled={submitting || (anomalyWarnings.length > 0 && !anomalyAcknowledged)}
                  title={anomalyWarnings.length > 0 && !anomalyAcknowledged ? 'Please acknowledge the security warning above' : ''}
                >
                  {submitting ? 'Processing…' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card transfer-success">
              <div className="success-icon-lg">✓</div>
              <h2>Transfer Successful!</h2>
              <p>${Number(form.amount).toFixed(2)} transferred to <strong>{toLabel}</strong></p>
              <div className="success-ref">Reference: {ref}</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={handleReset}>New Transfer</button>
                <button className="btn btn-outline" onClick={handleDownload}>⬇ Download Receipt</button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Recent transfers */}
        <div className="transfer-sidebar">
          <div className="card">
            <div className="card-header"><h2>Recent Transfers</h2></div>
            <div className="recent-transfers">
              {recentTransfers.map(t => (
                <div key={t.id} className="recent-transfer-item">
                  <div className={`rt-icon ${t.type === 'internal' ? 'rt-icon--internal' : ''}`}>
                    {t.type === 'internal' ? '⇄' : '↗'}
                  </div>
                  <div className="rt-info">
                    <span className="rt-to">{t.to}</span>
                    <span className="rt-date">{t.date}</span>
                  </div>
                  <span className="rt-amount">${t.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card transfer-tip">
            <div className="tip-icon">💡</div>
            <p>Transfers between your NovaBank accounts are instant and free, 24/7.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
