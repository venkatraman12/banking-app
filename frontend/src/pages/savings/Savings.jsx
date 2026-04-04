import React, { useState } from 'react'
import './Savings.css'

const initialGoals = [
  { id: 1, name: 'Emergency Fund', emoji: '🛡️', target: 15000, saved: 9800, color: '#1a56db', deadline: '2026-12-01', monthly: 500 },
  { id: 2, name: 'Vacation — Japan', emoji: '✈️', target: 5000, saved: 3200, color: '#0ea5e9', deadline: '2026-08-01', monthly: 300 },
  { id: 3, name: 'New MacBook', emoji: '💻', target: 2500, saved: 2500, color: '#10b981', deadline: '2026-02-01', monthly: 0 },
  { id: 4, name: 'Home Down Payment', emoji: '🏠', target: 80000, saved: 22000, color: '#8b5cf6', deadline: '2028-06-01', monthly: 1200 },
]

export default function Savings() {
  const [goals, setGoals] = useState(initialGoals)
  const [showAdd, setShowAdd] = useState(false)
  const [contributeId, setContributeId] = useState(null)
  const [contributeAmt, setContributeAmt] = useState('')
  const [newGoal, setNewGoal] = useState({ name: '', emoji: '🎯', target: '', monthly: '', deadline: '' })

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target, 0)

  const handleContribute = (id) => {
    const amt = Number(contributeAmt)
    if (!amt || amt <= 0) return
    setGoals(prev => prev.map(g => g.id === id ? { ...g, saved: Math.min(g.saved + amt, g.target) } : g))
    setContributeId(null)
    setContributeAmt('')
  }

  const handleAddGoal = (e) => {
    e.preventDefault()
    if (!newGoal.name || !newGoal.target) return
    const colors = ['#f59e0b', '#ef4444', '#14b8a6', '#ec4899']
    setGoals(prev => [...prev, {
      id: Date.now(), name: newGoal.name, emoji: newGoal.emoji,
      target: Number(newGoal.target), saved: 0,
      color: colors[prev.length % colors.length],
      deadline: newGoal.deadline, monthly: Number(newGoal.monthly) || 0,
    }])
    setShowAdd(false)
    setNewGoal({ name: '', emoji: '🎯', target: '', monthly: '', deadline: '' })
  }

  const monthsLeft = (deadline) => {
    const diff = new Date(deadline) - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30)))
  }

  return (
    <div className="savings-page">
      <div className="page-header">
        <div><h1>Savings Goals</h1><p>Track your savings targets and milestones</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>+ New Goal</button>
      </div>

      {/* Overview */}
      <div className="savings-overview">
        <div className="savings-overview-card savings-overview-card--primary">
          <div className="ov-label">Total Saved</div>
          <div className="ov-value">${totalSaved.toLocaleString()}</div>
          <div className="ov-sub">across {goals.length} goals</div>
        </div>
        <div className="savings-overview-card">
          <div className="ov-label">Total Target</div>
          <div className="ov-value">${totalTarget.toLocaleString()}</div>
          <div className="ov-progress">
            <div className="ov-bar"><div className="ov-fill" style={{ width: `${Math.round(totalSaved / totalTarget * 100)}%` }} /></div>
            <span>{Math.round(totalSaved / totalTarget * 100)}%</span>
          </div>
        </div>
        <div className="savings-overview-card">
          <div className="ov-label">Completed Goals</div>
          <div className="ov-value">{goals.filter(g => g.saved >= g.target).length}</div>
          <div className="ov-sub" style={{ color: 'var(--success)' }}>🎉 Keep it up!</div>
        </div>
        <div className="savings-overview-card">
          <div className="ov-label">Monthly Saving</div>
          <div className="ov-value">${goals.reduce((s, g) => s + g.monthly, 0).toLocaleString()}</div>
          <div className="ov-sub">auto-deposited</div>
        </div>
      </div>

      {/* Add goal form */}
      {showAdd && (
        <div className="card add-goal-form">
          <h3>Create New Savings Goal</h3>
          <form onSubmit={handleAddGoal}>
            <div className="add-goal-grid">
              <div className="form-group">
                <label>Goal Name</label>
                <input type="text" className="form-input" placeholder="e.g. New Car" value={newGoal.name} onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Emoji</label>
                <input type="text" className="form-input" maxLength={2} value={newGoal.emoji} onChange={e => setNewGoal({ ...newGoal, emoji: e.target.value })} style={{ fontSize: '20px', textAlign: 'center' }} />
              </div>
              <div className="form-group">
                <label>Target Amount ($)</label>
                <input type="number" className="form-input" placeholder="5000" min="1" value={newGoal.target} onChange={e => setNewGoal({ ...newGoal, target: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Monthly Contribution ($)</label>
                <input type="number" className="form-input" placeholder="200" min="0" value={newGoal.monthly} onChange={e => setNewGoal({ ...newGoal, monthly: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Target Date</label>
                <input type="date" className="form-input" value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary">Create Goal</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Goals grid */}
      <div className="goals-grid">
        {goals.map(goal => {
          const pct = Math.round((goal.saved / goal.target) * 100)
          const done = goal.saved >= goal.target
          const ml = goal.deadline ? monthsLeft(goal.deadline) : null

          return (
            <div key={goal.id} className={`goal-card card ${done ? 'goal-card--done' : ''}`}>
              <div className="goal-top">
                <div className="goal-emoji" style={{ background: goal.color + '20' }}>{goal.emoji}</div>
                <div className="goal-info">
                  <h3>{goal.name}</h3>
                  {done
                    ? <span className="goal-done-badge">🎉 Completed!</span>
                    : goal.deadline && <span className="goal-deadline">{ml} months left</span>
                  }
                </div>
                {!done && (
                  <button className="goal-menu-btn" onClick={() => setContributeId(contributeId === goal.id ? null : goal.id)}>
                    + Add
                  </button>
                )}
              </div>

              <div className="goal-amounts">
                <span className="goal-saved">${goal.saved.toLocaleString()}</span>
                <span className="goal-target">of ${goal.target.toLocaleString()}</span>
              </div>

              <div className="goal-progress-bar">
                <div className="goal-progress-fill" style={{ width: `${pct}%`, background: done ? 'var(--success)' : goal.color }} />
              </div>
              <div className="goal-pct">{pct}%{goal.monthly > 0 && !done && ` · $${goal.monthly}/mo auto`}</div>

              {contributeId === goal.id && (
                <div className="contribute-box">
                  <input
                    type="number" placeholder="Amount to add" className="form-input"
                    value={contributeAmt} onChange={e => setContributeAmt(e.target.value)}
                    style={{ fontSize: '14px' }} autoFocus
                  />
                  <button className="btn btn-primary" style={{ padding: '9px 14px', fontSize: '13px' }} onClick={() => handleContribute(goal.id)}>
                    Add
                  </button>
                  <button className="btn btn-outline" style={{ padding: '9px 14px', fontSize: '13px' }} onClick={() => setContributeId(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
