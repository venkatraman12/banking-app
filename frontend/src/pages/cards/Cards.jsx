import { useEffect, useState } from 'react'
import { api, tokenStore } from '../../api/client'
import './Cards.css'

const COLOR_BY_TYPE = {
  DEBIT:    ['#1a56db', '#0ea5e9'],
  CREDIT:   ['#7c3aed', '#db2777'],
  VIRTUAL:  ['#475569', '#94a3b8'],
  PREPAID:  ['#059669', '#10b981'],
}

const statusLower = (s) => (s || '').toLowerCase()

function hydrate(c, holderName) {
  const color = COLOR_BY_TYPE[c.type] || COLOR_BY_TYPE.DEBIT
  const last4 = c.last4 || '0000'
  return {
    id:      c.id,
    type:    c.network || 'Visa',
    name:    holderName || 'Account Holder',
    number:  `•••• •••• •••• ${last4}`,
    expiry:  c.expiry,
    cvv:     '•••',
    limit:   Number(c.limit),
    spent:   Number(c.spent),
    status:  statusLower(c.status),
    color,
    label:   c.label,
  }
}

export default function Cards() {
  const [cards, setCards]       = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [flipped, setFlipped] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [blockConfirm, setBlockConfirm] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitInput, setLimitInput] = useState('')

  useEffect(() => {
    const holder = tokenStore.user()?.name
    api.getCards()
      .then(res => {
        const list = res.data.map(c => hydrate(c, holder))
        setCards(list)
        setSelected(list[0] || null)
      })
      .catch(err => setError(err.message || 'Failed to load cards'))
      .finally(() => setLoading(false))
  }, [])

  const toggleFreeze = async (id) => {
    const card = cards.find(c => c.id === id)
    if (!card) return
    const next = card.status === 'frozen' ? 'ACTIVE' : 'FROZEN'
    try {
      const res = await api.updateCard(id, { status: next })
      const updated = { ...card, status: statusLower(res.data.status) }
      setCards(prev => prev.map(c => c.id === id ? updated : c))
      if (selected?.id === id) setSelected(updated)
    } catch (err) { setError(err.message || 'Could not update card') }
  }

  const blockCard = async (id) => {
    try {
      const res = await api.updateCard(id, { status: 'BLOCKED' })
      const updated = { ...cards.find(c => c.id === id), status: statusLower(res.data.status) }
      setCards(prev => prev.map(c => c.id === id ? updated : c))
      if (selected?.id === id) setSelected(updated)
      setBlockConfirm(false)
    } catch (err) { setError(err.message || 'Could not block card') }
  }

  const applyLimit = async () => {
    const newLimit = parseInt(limitInput, 10)
    if (!newLimit || newLimit < 1 || !selected) return
    try {
      const res = await api.updateCard(selected.id, { limit: newLimit })
      const updated = { ...selected, limit: Number(res.data.limit) }
      setCards(prev => prev.map(c => c.id === selected.id ? updated : c))
      setSelected(updated)
      setShowLimitModal(false)
      setLimitInput('')
    } catch (err) { setError(err.message || 'Could not update limit') }
  }

  const deleteCard = async (id) => {
    try {
      await api.deleteCard(id)
      const remaining = cards.filter(c => c.id !== id)
      setCards(remaining)
      setSelected(remaining[0] ?? null)
      setFlipped(false)
      setDeleteConfirm(null)
    } catch (err) { setError(err.message || 'Could not delete card') }
  }

  if (loading) return <div className="cards-page"><p>Loading cards…</p></div>

  const cardTx = []
  const usedPct = selected && selected.limit ? Math.round((selected.spent / selected.limit) * 100) : 0

  return (
    <div className="cards-page">
      <div className="page-header">
        <div>
          <h1>Cards</h1>
          <p>Manage your debit and credit cards</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          + Add Card
        </button>
      </div>

      {error && <div className="card" style={{ padding: 12, color: 'var(--danger)' }}>{error}</div>}

      {showAdd && (
        <div className="card add-card-banner">
          <h3>Apply for a New Card</h3>
          <div className="add-card-options">
            {['Debit Card', 'Credit Card', 'Virtual Card', 'Prepaid Card'].map(type => (
              <button key={type} className="add-card-opt">
                <span>{type === 'Debit Card' ? '💳' : type === 'Credit Card' ? '🏦' : type === 'Virtual Card' ? '💻' : '🎁'}</span>
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="card-delete-overlay">
          <div className="card-delete-modal">
            <div className="card-delete-icon">🗑️</div>
            <h3>Delete Card?</h3>
            <p>Are you sure you want to remove <strong>{cards.find(c => c.id === deleteConfirm)?.label}</strong>? This action cannot be undone.</p>
            <div className="card-delete-actions">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteCard(deleteConfirm)}>Delete Card</button>
            </div>
          </div>
        </div>
      )}

      {blockConfirm && (
        <div className="card-delete-overlay">
          <div className="card-delete-modal">
            <div className="card-delete-icon">🔒</div>
            <h3>Block Card?</h3>
            <p>Blocking <strong>{selected?.label}</strong> will permanently disable it. You'll need to request a replacement. This cannot be undone.</p>
            <div className="card-delete-actions">
              <button className="btn btn-outline" onClick={() => setBlockConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => blockCard(selected.id)}>Block Card</button>
            </div>
          </div>
        </div>
      )}

      {showLimitModal && (
        <div className="card-delete-overlay">
          <div className="card-delete-modal">
            <div className="card-delete-icon">📊</div>
            <h3>Set Spending Limit</h3>
            <p>Current limit for <strong>{selected?.label}</strong>: <strong>${selected?.limit.toLocaleString()}</strong></p>
            <input
              type="number"
              min="1"
              placeholder="New limit (e.g. 8000)"
              value={limitInput}
              onChange={e => setLimitInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyLimit()}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, marginTop: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <div className="card-delete-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => { setShowLimitModal(false); setLimitInput('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={applyLimit}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <div className="card cards-empty">
          <div className="cards-empty-icon">💳</div>
          <h3>No cards yet</h3>
          <p>Add a new card to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Card</button>
        </div>
      )}

      {cards.length > 0 && <div className="cards-layout">
        {/* Card list */}
        <div className="cards-list">
          {cards.map(card => (
            <div
              key={card.id}
              className={`card-thumb ${selected?.id === card.id ? 'card-thumb--active' : ''} ${card.status === 'frozen' ? 'card-thumb--frozen' : ''}`}
              onClick={() => { setSelected(card); setFlipped(false) }}
            >
              <div className="card-thumb-visual" style={{ background: `linear-gradient(135deg, ${card.color[0]}, ${card.color[1]})` }}>
                <div className="card-thumb-label">{card.label}</div>
                <div className="card-thumb-num">•••• {card.number.slice(-4)}</div>
              </div>
              <div className="card-thumb-info">
                <span className={`card-status-dot ${card.status === 'active' ? 'dot--active' : card.status === 'blocked' ? 'dot--blocked' : 'dot--frozen'}`} />
                <span>{card.status === 'active' ? 'Active' : card.status === 'blocked' ? 'Blocked' : 'Frozen'}</span>
                <button
                  className="card-delete-btn"
                  title="Delete card"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(card.id) }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Card detail */}
        <div className="card-detail-section">
          {/* 3D Card */}
          <div className={`card-3d ${flipped ? 'card-3d--flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
            <div className="card-3d-front" style={{ background: `linear-gradient(135deg, ${selected.color[0]}, ${selected.color[1]})` }}>
              {selected.status === 'frozen' && <div className="frozen-overlay">❄ Frozen</div>}
              {selected.status === 'blocked' && <div className="frozen-overlay" style={{ background: 'rgba(220,38,38,0.75)' }}>🔒 Blocked</div>}
              <div className="card-3d-top">
                <span className="card-3d-bank">NovaBank</span>
                <div className="card-chip">
                  <div /><div /><div />
                </div>
              </div>
              <div className="card-3d-number">{selected.number}</div>
              <div className="card-3d-bottom">
                <div>
                  <div className="card-3d-sub">Card Holder</div>
                  <div className="card-3d-val">{selected.name}</div>
                </div>
                <div>
                  <div className="card-3d-sub">Expires</div>
                  <div className="card-3d-val">{selected.expiry}</div>
                </div>
                <div className="card-3d-type">{selected.type}</div>
              </div>
            </div>
            <div className="card-3d-back" style={{ background: `linear-gradient(135deg, ${selected.color[1]}, ${selected.color[0]})` }}>
              <div className="card-back-strip" />
              <div className="card-cvv-row">
                <span>CVV</span>
                <span className="card-cvv">{selected.cvv}</span>
              </div>
              <div className="card-flip-hint">Click to flip</div>
            </div>
          </div>
          <p className="card-flip-tip">Tap card to reveal back</p>

          {/* Spending limit */}
          <div className="card spend-limit-card">
            <div className="limit-header">
              <div>
                <div className="limit-label">Monthly Limit</div>
                <div className="limit-value">${selected.limit.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="limit-label">Spent</div>
                <div className="limit-value" style={{ color: usedPct > 80 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  ${selected.spent.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="limit-bar">
              <div className="limit-fill" style={{
                width: `${usedPct}%`,
                background: usedPct > 80 ? 'var(--danger)' : usedPct > 60 ? 'var(--warning)' : 'var(--success)'
              }} />
            </div>
            <div className="limit-pct">{usedPct}% used · ${(selected.limit - selected.spent).toLocaleString()} remaining</div>
          </div>

          {/* Actions */}
          <div className="card-actions-grid">
            <button
              className={`card-action-item ${selected.status === 'frozen' ? 'action--active' : ''}`}
              onClick={() => toggleFreeze(selected.id)}
            >
              <span className="action-icon">{selected.status === 'frozen' ? '🔥' : '❄'}</span>
              <span>{selected.status === 'frozen' ? 'Unfreeze' : 'Freeze'}</span>
            </button>
            <button
              className={`card-action-item ${selected.status === 'blocked' ? 'action--active' : ''}`}
              onClick={() => selected.status !== 'blocked' && setBlockConfirm(true)}
              disabled={selected.status === 'blocked'}
              title={selected.status === 'blocked' ? 'Card is blocked' : 'Permanently block this card'}
            >
              <span className="action-icon">🔒</span>
              <span>{selected.status === 'blocked' ? 'Blocked' : 'Block Card'}</span>
            </button>
            <button className="card-action-item" onClick={() => { setLimitInput(String(selected.limit)); setShowLimitModal(true) }}>
              <span className="action-icon">📊</span>
              <span>Set Limit</span>
            </button>
            <button className="card-action-item">
              <span className="action-icon">📄</span>
              <span>Statement</span>
            </button>
          </div>

          {/* Recent transactions */}
          <div className="card">
            <div className="card-header">
              <h2>Recent Transactions</h2>
            </div>
            {cardTx.length > 0 ? (
              <div className="card-tx-list">
                {cardTx.map(tx => (
                  <div key={tx.id} className="card-tx-item">
                    <span className="card-tx-icon">{tx.icon}</span>
                    <div className="card-tx-info">
                      <span>{tx.name}</span>
                      <span className="card-tx-date">{tx.date}</span>
                    </div>
                    <span className="card-tx-amount">${Math.abs(tx.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>No recent transactions</p>
            )}
          </div>
        </div>
      </div>}
    </div>
  )
}
