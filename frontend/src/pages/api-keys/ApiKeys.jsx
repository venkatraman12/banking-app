import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import './ApiKeys.css'

const SCOPE_OPTIONS = [
  { value: 'read',            label: 'Read Only',       desc: 'View accounts, transactions, balances' },
  { value: 'read,write',     label: 'Read & Write',    desc: 'Read + create transfers, manage cards' },
  { value: 'read,write,admin', label: 'Full Access',   desc: 'All permissions including admin endpoints' },
]

const EXPIRY_OPTIONS = [
  { value: '',   label: 'Never' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
]

function timeAgo(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function scopeBadges(scopes) {
  return (scopes || 'read').split(',').map(s => s.trim())
}

export default function ApiKeys() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name: '', scopes: 'read', expires_in_days: '' })
  const [creating, setCreating] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadKeys()
  }, [])

  async function loadKeys() {
    try {
      const res = await api.getApiKeys()
      setKeys(res.data)
    } catch {
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const body = {
        name: form.name.trim(),
        scopes: form.scopes,
      }
      if (form.expires_in_days) body.expires_in_days = parseInt(form.expires_in_days)
      const res = await api.createApiKey(body)
      setNewKey(res.data)
      setForm({ name: '', scopes: 'read', expires_in_days: '' })
      loadKeys()
      toast.success('API key created')
    } catch (err) {
      toast.error(err.message || 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id, name) {
    if (!confirm(`Revoke "${name}"? Any integrations using this key will stop working.`)) return
    try {
      await api.revokeApiKey(id)
      setKeys(prev => prev.filter(k => k.id !== id))
      toast.success('API key revoked')
    } catch {
      toast.error('Failed to revoke key')
    }
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="apikeys-page">
      <div className="page-header">
        <div>
          <h1>Developer API Keys</h1>
          <p>Create and manage API keys for programmatic access to your NovaBank data</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setNewKey(null) }}>
          + Create New Key
        </button>
      </div>

      {/* Newly created key banner */}
      {newKey && (
        <div className="apikey-created-banner">
          <div className="apikey-created-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <strong>Your new API key</strong>
            <span className="apikey-created-warning">Copy it now — it won't be shown again</span>
          </div>
          <div className="apikey-created-value">
            <code>{newKey.key}</code>
            <button className="btn btn-sm btn-outline" onClick={() => handleCopy(newKey.key)}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button className="apikey-dismiss" onClick={() => setNewKey(null)}>Dismiss</button>
        </div>
      )}

      {/* Create form */}
      {showCreate && !newKey && (
        <div className="card apikey-create-card">
          <h2>Create API Key</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Key Name</label>
              <input
                className="form-input"
                placeholder="e.g. Mobile App, CI/CD Pipeline, Analytics Dashboard"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Permissions</label>
              <div className="scope-options">
                {SCOPE_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`scope-option ${form.scopes === opt.value ? 'scope-option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="scopes"
                      value={opt.value}
                      checked={form.scopes === opt.value}
                      onChange={e => setForm(prev => ({ ...prev, scopes: e.target.value }))}
                    />
                    <div className="scope-option-content">
                      <span className="scope-option-label">{opt.label}</span>
                      <span className="scope-option-desc">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Expiration</label>
              <select
                className="form-input"
                value={form.expires_in_days}
                onChange={e => setForm(prev => ({ ...prev, expires_in_days: e.target.value }))}
              >
                {EXPIRY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="apikey-form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating || !form.name.trim()}>
                {creating ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* API endpoint reference */}
      <div className="card apikey-reference">
        <h3>Quick Start</h3>
        <div className="apikey-code-block">
          <code>
            <span className="code-comment"># Authenticate with your API key</span>{'\n'}
            curl -H "Authorization: Bearer YOUR_API_KEY" \{'\n'}
            {'  '}http://localhost:4000/api/v1/accounts
          </code>
        </div>
        <div className="apikey-endpoints">
          <div className="apikey-endpoint">
            <span className="method get">GET</span>
            <span>/api/v1/accounts</span>
          </div>
          <div className="apikey-endpoint">
            <span className="method get">GET</span>
            <span>/api/v1/transactions</span>
          </div>
          <div className="apikey-endpoint">
            <span className="method post">POST</span>
            <span>/api/v1/transactions/transfer</span>
          </div>
          <div className="apikey-endpoint">
            <span className="method get">GET</span>
            <span>/api/v1/cards</span>
          </div>
        </div>
      </div>

      {/* Existing keys */}
      <div className="card">
        <div className="apikey-list-header">
          <h2>Active Keys</h2>
          <span className="apikey-count">{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <p className="apikey-empty">Loading...</p>
        ) : keys.length === 0 ? (
          <div className="apikey-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            <p>No API keys yet</p>
            <span>Create your first key to start integrating with the NovaBank API</span>
          </div>
        ) : (
          <div className="apikey-list">
            {keys.map(k => (
              <div key={k.id} className="apikey-row">
                <div className="apikey-row-main">
                  <div className="apikey-row-top">
                    <strong className="apikey-name">{k.name}</strong>
                    <code className="apikey-prefix">{k.prefix}•••••••••</code>
                  </div>
                  <div className="apikey-row-meta">
                    <span>Created {timeAgo(k.createdAt)}</span>
                    <span className="apikey-meta-sep">|</span>
                    <span>Last used: {k.lastUsed ? timeAgo(k.lastUsed) : 'Never'}</span>
                    {k.expiresAt && (
                      <>
                        <span className="apikey-meta-sep">|</span>
                        <span>Expires {timeAgo(k.expiresAt)}</span>
                      </>
                    )}
                  </div>
                  <div className="apikey-scopes">
                    {scopeBadges(k.scopes).map(s => (
                      <span key={s} className={`scope-badge scope-badge--${s}`}>{s}</span>
                    ))}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleRevoke(k.id, k.name)}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
