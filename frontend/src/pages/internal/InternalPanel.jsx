import { useState, useEffect } from 'react'
import { telemetry } from '../../utils/telemetry'
import './InternalPanel.css'

const CLOUD_STEPS = [
  { id: 1, label: 'Choose Provider', desc: 'Select AWS S3, Google Cloud Storage, or Azure Blob' },
  { id: 2, label: 'Configure Credentials', desc: 'Enter your bucket name, region, and access keys' },
  { id: 3, label: 'Select Data', desc: 'Choose which data to back up: logs, crash reports, cache stats' },
  { id: 4, label: 'Schedule', desc: 'Set backup frequency: hourly, daily, or on-demand' },
  { id: 5, label: 'Connect', desc: 'Test connection and activate cloud sync' },
]

export default function InternalPanel() {
  const [data, setData]         = useState(null)
  const [cloudStep, setCloudStep] = useState(0)
  const [tab, setTab]           = useState('logs')
  const [cleared, setCleared]   = useState(false)

  useEffect(() => {
    setData(telemetry.get())
    const t = setInterval(() => setData(telemetry.get()), 3000)
    return () => clearInterval(t)
  }, [])

  function handleClear() {
    telemetry.clear()
    setData(telemetry.get())
    setCleared(true)
    setTimeout(() => setCleared(false), 2000)
  }

  if (!data) return null

  const crashRate = data.apiCalls > 0
    ? ((data.apiErrors / data.apiCalls) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="internal-page">
      <div className="page-header">
        <div>
          <h1>Internal Tools</h1>
          <p>Local diagnostics — not visible to customers</p>
        </div>
        <div className="internal-header-actions">
          <button className="btn btn-outline" onClick={handleClear}>
            {cleared ? '✓ Cleared' : 'Clear All Data'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="internal-stats">
        <div className="card internal-stat">
          <div className="internal-stat-value">{data.apiCalls}</div>
          <div className="internal-stat-label">API Calls</div>
        </div>
        <div className="card internal-stat">
          <div className="internal-stat-value internal-stat-value--ok">{data.cacheHitRate}%</div>
          <div className="internal-stat-label">Success Rate</div>
        </div>
        <div className={`card internal-stat${Number(crashRate) > 5 ? ' internal-stat--warn' : ''}`}>
          <div className="internal-stat-value">{crashRate}%</div>
          <div className="internal-stat-label">Error Rate</div>
        </div>
        <div className="card internal-stat">
          <div className="internal-stat-value">{data.crashes.length}</div>
          <div className="internal-stat-label">Crashes Logged</div>
        </div>
        <div className="card internal-stat">
          <div className="internal-stat-value">{Math.round(data.sessionAgeSeconds / 60)}m</div>
          <div className="internal-stat-label">Session Age</div>
        </div>
        <div className="card internal-stat">
          <div className="internal-stat-value">{data.logs.length}</div>
          <div className="internal-stat-label">Log Entries</div>
        </div>
      </div>

      <div className="internal-layout">
        {/* Left: data tabs */}
        <div className="card internal-data-card">
          <div className="internal-tabs">
            {[['logs','Activity Log'],['crashes','Crash Log'],['cache','Cache Stats']].map(([id, label]) => (
              <button
                key={id}
                className={`internal-tab${tab === id ? ' internal-tab--active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
                {id === 'crashes' && data.crashes.length > 0 && (
                  <span className="internal-tab-badge">{data.crashes.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="internal-tab-body">
            {tab === 'logs' && (
              data.logs.length === 0
                ? <div className="internal-empty">No activity logged yet. Use the app to generate entries.</div>
                : [...data.logs].reverse().slice(0, 100).map((e, i) => (
                  <div key={i} className="internal-log-row">
                    <span className="internal-log-ts">{new Date(e.ts).toLocaleTimeString()}</span>
                    <span className={`internal-log-type internal-log-type--${e.type}`}>{e.type}</span>
                    <span className="internal-log-detail">{e.detail}</span>
                  </div>
                ))
            )}

            {tab === 'crashes' && (
              data.crashes.length === 0
                ? <div className="internal-empty">No crashes recorded.</div>
                : [...data.crashes].reverse().map((c, i) => (
                  <div key={i} className="internal-crash-row">
                    <div className="internal-crash-header">
                      <span className="internal-crash-ts">{new Date(c.ts).toLocaleString()}</span>
                    </div>
                    <div className="internal-crash-msg">{c.message}</div>
                    {c.stack && <pre className="internal-crash-stack">{c.stack}</pre>}
                  </div>
                ))
            )}

            {tab === 'cache' && (
              Object.keys(data.cache).length === 0
                ? <div className="internal-empty">No cache data yet. Make API calls to populate.</div>
                : Object.entries(data.cache)
                    .sort((a, b) => b[1] - a[1])
                    .map(([path, count]) => (
                      <div key={path} className="internal-cache-row">
                        <span className="internal-cache-path">{path}</span>
                        <span className="internal-cache-count">{count} calls</span>
                        <div className="internal-cache-bar">
                          <div
                            className="internal-cache-bar-fill"
                            style={{ width: `${Math.min(100, (count / Math.max(...Object.values(data.cache))) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
            )}
          </div>
        </div>

        {/* Right: cloud backup wizard */}
        <div className="card internal-cloud-card">
          <div className="internal-cloud-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
            <span>Cloud Backup</span>
            <span className="internal-cloud-badge">Coming Soon</span>
          </div>

          <p className="internal-cloud-desc">
            Save logs, crash reports, and cache metrics to cloud storage for long-term retention and cross-device access.
          </p>

          <div className="internal-cloud-steps">
            {CLOUD_STEPS.map((step) => (
              <div
                key={step.id}
                className={`internal-cloud-step${cloudStep >= step.id ? ' internal-cloud-step--done' : ''}${cloudStep + 1 === step.id ? ' internal-cloud-step--active' : ''}`}
              >
                <div className="internal-cloud-step-num">
                  {cloudStep >= step.id ? '✓' : step.id}
                </div>
                <div className="internal-cloud-step-info">
                  <div className="internal-cloud-step-label">{step.label}</div>
                  <div className="internal-cloud-step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="internal-cloud-actions">
            {cloudStep < CLOUD_STEPS.length ? (
              <button
                className="btn btn-primary"
                onClick={() => setCloudStep(s => Math.min(s + 1, CLOUD_STEPS.length))}
              >
                {cloudStep === 0 ? 'Set Up Cloud Backup' : cloudStep < CLOUD_STEPS.length - 1 ? 'Next Step →' : 'Activate Sync'}
              </button>
            ) : (
              <div className="internal-cloud-placeholder">
                <span>🎉 Configuration saved locally</span>
                <p>Cloud sync will activate when the backend integration is available.</p>
                <button className="btn btn-outline" onClick={() => setCloudStep(0)}>Reset</button>
              </div>
            )}
            {cloudStep > 0 && cloudStep < CLOUD_STEPS.length && (
              <button className="btn btn-outline" onClick={() => setCloudStep(s => s - 1)}>← Back</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
