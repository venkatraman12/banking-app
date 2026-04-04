import { useState } from 'react'
import './Cards.css'

const initialCards = [
  {
    id: 1, type: 'Visa', name: 'Alex Johnson', number: '4821 8834 2901 4821',
    expiry: '09/28', cvv: '•••', limit: 5000, spent: 1240,
    status: 'active', color: ['#1a56db', '#0ea5e9'], label: 'Platinum Debit',
  },
  {
    id: 2, type: 'Mastercard', name: 'Alex Johnson', number: '5412 7751 3384 5412',
    expiry: '03/27', cvv: '•••', limit: 10000, spent: 3760,
    status: 'active', color: ['#7c3aed', '#db2777'], label: 'Gold Credit',
  },
  {
    id: 3, type: 'Visa', name: 'Alex Johnson', number: '4929 6614 8823 4929',
    expiry: '11/25', cvv: '•••', limit: 2000, spent: 0,
    status: 'frozen', color: ['#475569', '#94a3b8'], label: 'Virtual Card',
  },
]

const recentTx = [
  { id: 1, name: 'Apple Store', amount: -129.99, date: 'Mar 10', icon: '🍎', card: 1 },
  { id: 2, name: 'Uber Eats', amount: -34.50, date: 'Mar 9', icon: '🍔', card: 1 },
  { id: 3, name: 'Netflix', amount: -15.99, date: 'Mar 9', icon: '🎬', card: 2 },
  { id: 4, name: 'Amazon', amount: -89.00, date: 'Mar 8', icon: '📦', card: 2 },
  { id: 5, name: 'Starbucks', amount: -6.75, date: 'Mar 7', icon: '☕', card: 1 },
]

export default function Cards() {
  const [cards, setCards] = useState(initialCards)
  const [selected, setSelected] = useState(cards[0])
  const [flipped, setFlipped] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [blockConfirm, setBlockConfirm] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitInput, setLimitInput] = useState('')

  const toggleFreeze = (id) => {
    setCards(prev => prev.map(c =>
      c.id === id ? { ...c, status: c.status === 'active' ? 'frozen' : 'active' } : c
    ))
    setSelected(prev => ({ ...prev, status: prev.status === 'active' ? 'frozen' : 'active' }))
  }

  const blockCard = (id) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, status: 'blocked' } : c))
    setSelected(prev => ({ ...prev, status: 'blocked' }))
    setBlockConfirm(false)
  }

  const applyLimit = () => {
    const newLimit = parseInt(limitInput, 10)
    if (!newLimit || newLimit < 1) return
    setCards(prev => prev.map(c => c.id === selected.id ? { ...c, limit: newLimit } : c))
    setSelected(prev => ({ ...prev, limit: newLimit }))
    setShowLimitModal(false)
    setLimitInput('')
  }

  const deleteCard = (id) => {
    const remaining = cards.filter(c => c.id !== id)
    setCards(remaining)
    setSelected(remaining[0] ?? null)
    setFlipped(false)
    setDeleteConfirm(null)
  }

  const cardTx = selected ? recentTx.filter(t => t.card === selected.id) : []
  const usedPct = selected ? Math.round((selected.spent / selected.limit) * 100) : 0

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
                <span className="card-3d-bank">NovaBanc</span>
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
