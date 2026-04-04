import { useState, useEffect, useRef } from 'react'
import './analytics.css'

/* ── Animated counter ── */
function useCountUp(target, duration = 1800, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let startTs = null, raf = null
    const t = setTimeout(() => {
      const tick = (ts) => {
        if (!startTs) startTs = ts
        const p = Math.min((ts - startTs) / duration, 1)
        const e = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(e * target))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [target, duration, delay])
  return val
}

/* ── Data ── */
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
const BALANCE = [42800, 45200, 43900, 46500, 48200, 47100, 49800, 51200, 48500, 52100, 54300, 56820]

const CATEGORIES = [
  { label: 'Housing',        pct: 32, color: '#4338ca', amt: 1680 },
  { label: 'Food & Dining',  pct: 22, color: '#0ea5e9', amt: 1155 },
  { label: 'Transport',      pct: 15, color: '#8b5cf6', amt: 787  },
  { label: 'Entertainment',  pct: 12, color: '#ec4899', amt: 630  },
  { label: 'Utilities',      pct: 10, color: '#f59e0b', amt: 525  },
  { label: 'Other',          pct:  9, color: '#34d399', amt: 473  },
]

const BUDGET = [
  { label: 'Housing',       spent: 1680, limit: 1800, color: '#4338ca' },
  { label: 'Food',          spent: 1155, limit: 1200, color: '#0ea5e9' },
  { label: 'Transport',     spent: 787,  limit: 600,  color: '#8b5cf6' },
  { label: 'Entertainment', spent: 630,  limit: 800,  color: '#ec4899' },
  { label: 'Utilities',     spent: 525,  limit: 550,  color: '#f59e0b' },
]

const WEEKLY = [
  { day: 'Mon', exp: 450,  inc: 0    },
  { day: 'Tue', exp: 320,  inc: 0    },
  { day: 'Wed', exp: 890,  inc: 8200 },
  { day: 'Thu', exp: 210,  inc: 0    },
  { day: 'Fri', exp: 670,  inc: 0    },
  { day: 'Sat', exp: 1240, inc: 0    },
  { day: 'Sun', exp: 420,  inc: 0    },
]

/* ── SVG path builders ── */
function buildPaths(values, W, H) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const r   = max - min || 1
  const pts = values.map((v, i) => ({
    x: +(((i / (values.length - 1)) * W).toFixed(2)),
    y: +(( H - ((v - min) / r) * (H - 24) - 12).toFixed(2)),
  }))
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
  const area = `${line} L ${W} ${H} L 0 ${H} Z`
  return { pts, line, area }
}

/* ── Donut Ring ── */
function DonutRing({ segments }) {
  const R = 52, CX = 70, CY = 70
  const circ = 2 * Math.PI * R
  const [on, setOn] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 500)
    return () => clearTimeout(t)
  }, [])

  let cum = 0
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth="14" />
      {segments.map((seg, i) => {
        const dash   = on ? (seg.pct / 100) * circ : 0
        const gap    = circ
        const offset = -(cum / 100) * circ
        cum += seg.pct
        return (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            strokeLinecap="butt"
            strokeDasharray={`${dash.toFixed(2)} ${gap.toFixed(2)}`}
            strokeDashoffset={offset.toFixed(2)}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: `stroke-dasharray 1s cubic-bezier(.4,0,.2,1) ${0.2 + i * 0.1}s` }}
          />
        )
      })}
    </svg>
  )
}

/* ── Animated Bar ── */
function Bar({ pct, color, delay }) {
  const [h, setH] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setH(pct), 600)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div
      className="an-wbar"
      style={{ height: `${h}%`, background: color, transitionDelay: `${delay}s` }}
    />
  )
}

/* ── Main Page ── */
export default function Analytics() {
  const W = 800, H = 180
  const { pts, line, area } = buildPaths(BALANCE, W, H)

  /* Main chart line draw */
  const lineRef   = useRef(null)
  const [pLen, setPLen] = useState(null)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (lineRef.current) {
      const l = lineRef.current.getTotalLength()
      setPLen(l)
      requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)))
    }
  }, [])

  /* Budget bars reveal */
  const [budgetOn, setBudgetOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setBudgetOn(true), 700)
    return () => clearTimeout(t)
  }, [])

  /* Tab */
  const [tab, setTab] = useState('year')

  /* Counters */
  const netWorth  = useCountUp(56820,  2000, 300)
  const income    = useCountUp(98400,  1800, 500)
  const expenses  = useCountUp(56750,  1800, 700)
  const savings   = useCountUp(42,     1400, 900)

  const wMax = Math.max(...WEEKLY.map(d => Math.max(d.inc, d.exp)))

  return (
    <div className="an-page">

      {/* ── Ambient orbs ── */}
      <div className="an-orb an-orb-1" />
      <div className="an-orb an-orb-2" />
      <div className="an-orb an-orb-3" />

      {/* ── Header ── */}
      <header className="an-header">
        <div>
          <h1 className="an-title">
            <span className="an-title-shine">Analytics</span>
          </h1>
          <p className="an-sub">Your complete financial picture</p>
        </div>
        <div className="an-header-actions">
          <div className="an-tabs">
            {['week', 'month', 'year'].map(t => (
              <button
                key={t}
                className={`an-tab ${tab === t ? 'an-tab--on' : ''}`}
                onClick={() => setTab(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <button className="an-btn-export">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
        </div>
      </header>

      {/* ── Portfolio chart ── */}
      <div className="an-chart-card">
        <div className="an-cc-top">
          <div>
            <div className="an-cc-title">Portfolio Growth</div>
            <div className="an-cc-period">Apr 2025 – Mar 2026</div>
          </div>
          <div className="an-cc-badge">
            <span className="an-up-dot" />
            <span>+32.7% YTD</span>
          </div>
        </div>

        <div className="an-svg-wrap">
          <svg
            viewBox={`0 0 ${W} ${H + 32}`}
            preserveAspectRatio="none"
            className="an-svg"
          >
            <defs>
              <linearGradient id="lgArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4338ca" stopOpacity=".22" />
                <stop offset="100%" stopColor="#4338ca" stopOpacity=".01" />
              </linearGradient>
              <linearGradient id="lgLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="60%" stopColor="#4338ca" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>

            {/* Grid */}
            {[0.25, 0.5, 0.75].map(f => (
              <line key={f} x1="0" y1={f * H} x2={W} y2={f * H}
                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5 5" />
            ))}

            {/* Area — fade in after line draws */}
            <path
              d={area}
              fill="url(#lgArea)"
              style={{ opacity: drawn ? 1 : 0, transition: 'opacity .6s ease 2s' }}
            />

            {/* Line — stroke-dashoffset reveal */}
            <path
              ref={lineRef}
              d={line}
              stroke="url(#lgLine)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pLen ?? 10000}
              strokeDashoffset={drawn ? 0 : (pLen ?? 10000)}
              style={{ transition: pLen ? 'stroke-dashoffset 2s ease-out .2s' : 'none' }}
            />

            {/* Dots */}
            {pts.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="7" fill="rgba(67,56,202,.08)"
                  style={{ opacity: drawn ? 1 : 0, transition: `opacity .2s ${.3 + i * .15}s` }}
                />
                <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#4338ca" strokeWidth="2.2"
                  style={{ opacity: drawn ? 1 : 0, transition: `opacity .2s ${.3 + i * .15}s` }}
                />
              </g>
            ))}

            {/* X labels */}
            {MONTHS.map((m, i) => (
              <text key={i} x={(i / (MONTHS.length - 1)) * W} y={H + 24}
                textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="Inter,sans-serif">
                {m}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="an-kpi-row">

        <div className="an-kpi an-kpi-1">
          <div className="an-kpi-ico an-ico-purple">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="an-kpi-info">
            <div className="an-kpi-lbl">Net Worth</div>
            <div className="an-kpi-val">${netWorth.toLocaleString()}</div>
            <div className="an-kpi-trend an-up">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l9 20H3z"/></svg>
              +18.4% this year
            </div>
          </div>
          <svg viewBox="0 0 80 32" className="an-spark">
            <polyline points="0,26 14,20 28,22 42,15 56,11 70,7 80,4"
              fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" className="an-spark-line" />
          </svg>
        </div>

        <div className="an-kpi an-kpi-2">
          <div className="an-kpi-ico an-ico-blue">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="an-kpi-info">
            <div className="an-kpi-lbl">Annual Income</div>
            <div className="an-kpi-val">${income.toLocaleString()}</div>
            <div className="an-kpi-trend an-up">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l9 20H3z"/></svg>
              +2.1% vs last year
            </div>
          </div>
          <svg viewBox="0 0 80 32" className="an-spark">
            <polyline points="0,16 14,16 28,16 42,16 56,16 70,16 80,16"
              fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" className="an-spark-line" />
          </svg>
        </div>

        <div className="an-kpi an-kpi-3">
          <div className="an-kpi-ico an-ico-red">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
              <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
            </svg>
          </div>
          <div className="an-kpi-info">
            <div className="an-kpi-lbl">Total Expenses</div>
            <div className="an-kpi-val">${expenses.toLocaleString()}</div>
            <div className="an-kpi-trend an-down">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ transform:'rotate(180deg)' }}><path d="M12 2l9 20H3z"/></svg>
              -5.3% vs last year
            </div>
          </div>
          <svg viewBox="0 0 80 32" className="an-spark">
            <polyline points="0,8 14,14 28,6 42,18 56,10 70,16 80,8"
              fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" className="an-spark-line" />
          </svg>
        </div>

        <div className="an-kpi an-kpi-4">
          <div className="an-kpi-ico an-ico-green">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="an-kpi-info">
            <div className="an-kpi-lbl">Savings Rate</div>
            <div className="an-kpi-val">{savings}%</div>
            <div className="an-kpi-trend an-up">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l9 20H3z"/></svg>
              +3.2 pp this year
            </div>
          </div>
          <svg viewBox="0 0 80 32" className="an-spark">
            <polyline points="0,24 14,20 28,22 42,15 56,12 70,9 80,6"
              fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" className="an-spark-line" />
          </svg>
        </div>

      </div>

      {/* ── Bottom grid ── */}
      <div className="an-grid3">

        {/* Spending donut */}
        <div className="an-card">
          <div className="an-card-head">
            <span className="an-card-title">Spending Breakdown</span>
            <span className="an-card-sub">By category · This year</span>
          </div>
          <div className="an-donut-wrap">
            <DonutRing segments={CATEGORIES} />
            <div className="an-donut-center">
              <div className="an-donut-val">$5,250</div>
              <div className="an-donut-lbl">/ month avg</div>
            </div>
          </div>
          <div className="an-cat-list">
            {CATEGORIES.map((c, i) => (
              <div key={i} className="an-cat-row">
                <span className="an-cat-dot" style={{ background: c.color }} />
                <span className="an-cat-name">{c.label}</span>
                <span className="an-cat-pct">{c.pct}%</span>
                <span className="an-cat-amt">${c.amt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget tracker */}
        <div className="an-card">
          <div className="an-card-head">
            <span className="an-card-title">Budget Tracker</span>
            <span className="an-card-sub">Spent vs limit · March</span>
          </div>
          <div className="an-budget-list">
            {BUDGET.map((b, i) => {
              const pct  = Math.min((b.spent / b.limit) * 100, 100)
              const over = b.spent > b.limit
              return (
                <div key={i} className="an-bitem" style={{ animationDelay: `${.3 + i * .08}s` }}>
                  <div className="an-bitem-top">
                    <span className="an-bitem-name">{b.label}</span>
                    <span className={`an-bitem-amt ${over ? 'an-over' : ''}`}>
                      ${b.spent} <em>/ ${b.limit}</em>
                    </span>
                  </div>
                  <div className="an-btrack">
                    <div
                      className={`an-bfill ${over ? 'an-bfill--over' : ''}`}
                      style={{
                        width: budgetOn ? `${pct}%` : '0%',
                        background: over ? '#ef4444' : b.color,
                        transitionDelay: `${.3 + i * .1}s`,
                      }}
                    />
                  </div>
                  <div className="an-bfooter">
                    <span>{pct.toFixed(0)}% used</span>
                    {over
                      ? <span className="an-over-lbl">Over by ${b.spent - b.limit}</span>
                      : <span>${b.limit - b.spent} left</span>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly cash flow */}
        <div className="an-card">
          <div className="an-card-head">
            <span className="an-card-title">Weekly Cash Flow</span>
            <span className="an-card-sub">Income vs expenses · This week</span>
          </div>
          <div className="an-wchart">
            {WEEKLY.map((d, i) => (
              <div key={i} className="an-wcol">
                <div className="an-wbars">
                  {d.inc > 0 && (
                    <Bar pct={(d.inc / wMax) * 100} color="linear-gradient(180deg,#818cf8,#4338ca)" delay={i * .07} />
                  )}
                  <Bar pct={(d.exp / wMax) * 100} color="linear-gradient(180deg,#fca5a5,#ef4444)" delay={i * .07 + .04} />
                </div>
                <div className="an-wday">{d.day}</div>
              </div>
            ))}
          </div>
          <div className="an-wlegend">
            <span><span className="an-cat-dot" style={{ background: '#4338ca' }} /> Income</span>
            <span><span className="an-cat-dot" style={{ background: '#ef4444' }} /> Expenses</span>
          </div>
        </div>

      </div>
    </div>
  )
}
