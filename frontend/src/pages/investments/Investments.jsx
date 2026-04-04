import React, { useState } from 'react'
import './Investments.css'

const holdings = [
  { id: 1, symbol: 'AAPL', name: 'Apple Inc.',      shares: 15, price: 182.52, change: 2.34,  changePct: 1.30,  value: 2737.80, gain: 412.50,  color: '#2563eb' },
  { id: 2, symbol: 'MSFT', name: 'Microsoft Corp.', shares: 10, price: 378.85, change: -1.20, changePct: -0.32, value: 3788.50, gain: 890.00,  color: '#0ea5e9' },
  { id: 3, symbol: 'GOOGL', name: 'Alphabet Inc.',  shares: 8,  price: 142.36, change: 0.88,  changePct: 0.62,  value: 1138.88, gain: 203.20,  color: '#8b5cf6' },
  { id: 4, symbol: 'NVDA', name: 'NVIDIA Corp.',    shares: 5,  price: 875.40, change: 18.50, changePct: 2.16,  value: 4377.00, gain: 2340.00, color: '#10b981' },
  { id: 5, symbol: 'VOO',  name: 'Vanguard S&P 500',shares: 20, price: 486.20, change: -0.60, changePct: -0.12, value: 9724.00, gain: 1840.00, color: '#f59e0b' },
]

const watchlist = [
  { symbol: 'TSLA', name: 'Tesla Inc.',    price: 175.34, change: -2.11 },
  { symbol: 'AMZN', name: 'Amazon.com',   price: 185.60, change:  1.45 },
  { symbol: 'META', name: 'Meta Platforms',price: 484.10, change:  3.20 },
]

const allocationData = [
  { label: 'Technology', pct: 52, color: '#2563eb' },
  { label: 'ETFs',       pct: 28, color: '#f59e0b' },
  { label: 'Consumer',   pct: 12, color: '#10b981' },
  { label: 'Other',      pct: 8,  color: '#e2e8f0' },
]

const perfByPeriod = {
  '1W': [
    { day: 'Mon', val: 21200 }, { day: 'Tue', val: 21580 }, { day: 'Wed', val: 21340 },
    { day: 'Thu', val: 21900 }, { day: 'Fri', val: 21766 }, { day: 'Sat', val: 22080 }, { day: 'Sun', val: 21766 },
  ],
  '1M': [
    { day: 'W1', val: 20100 }, { day: 'W2', val: 20640 }, { day: 'W3', val: 21200 },
    { day: 'W4', val: 21766 },
  ],
  '3M': [
    { day: 'Jan', val: 19200 }, { day: 'Feb', val: 20100 }, { day: 'Mar', val: 21766 },
  ],
  '1Y': [
    { day: 'Q1', val: 17400 }, { day: 'Q2', val: 18900 }, { day: 'Q3', val: 20200 }, { day: 'Q4', val: 21766 },
  ],
  'All': [
    { day: '2021', val: 12000 }, { day: '2022', val: 14500 }, { day: '2023', val: 18200 }, { day: '2024', val: 21766 },
  ],
}

export default function Investments() {
  const [tab, setTab]           = useState('holdings')
  const [period, setPeriod]     = useState('1W')
  const [tradeStock, setTradeStock] = useState(null)
  const [tradeType, setTradeType]   = useState('buy')
  const [tradeQty, setTradeQty]     = useState('')
  const [orderSuccess, setOrderSuccess] = useState(null) // { symbol, type, qty, total }

  const totalValue    = holdings.reduce((s, h) => s + h.value, 0)
  const totalGain     = holdings.reduce((s, h) => s + h.gain, 0)
  const totalGainPct  = ((totalGain / (totalValue - totalGain)) * 100).toFixed(2)

  const perfData = perfByPeriod[period]
  const maxVal   = Math.max(...perfData.map(d => d.val))
  const minVal   = Math.min(...perfData.map(d => d.val))

  const openTrade = (stock, type = 'buy') => {
    setTradeStock(stock)
    setTradeType(type)
    setTradeQty('')
    setOrderSuccess(null)
  }

  const placeOrder = () => {
    if (!tradeQty || tradeQty <= 0) return
    setOrderSuccess({
      symbol: tradeStock.symbol,
      type:   tradeType,
      qty:    tradeQty,
      total:  (tradeStock.price * tradeQty).toFixed(2),
    })
    setTradeQty('')
  }

  const resetTrade = () => {
    setTradeStock(null)
    setOrderSuccess(null)
    setTradeQty('')
  }

  return (
    <div className="investments-page">
      <div className="page-header">
        <div><h1>Investments</h1><p>Monitor your portfolio and market positions</p></div>
        <button className="btn btn-primary" onClick={() => openTrade(holdings[0], 'buy')}>
          + Buy / Sell
        </button>
      </div>

      {/* Portfolio summary */}
      <div className="inv-summary">
        <div className="inv-summary-main">
          <div className="inv-total-label">Portfolio Value</div>
          <div className="inv-total-value">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className={`inv-total-gain ${totalGain >= 0 ? 'positive' : 'negative'}`}>
            {totalGain >= 0 ? '▲' : '▼'} ${Math.abs(totalGain).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({totalGainPct}%) all time
          </div>
        </div>
        <div className="inv-summary-stats">
          <div className="inv-stat">
            <span>Day's Gain</span>
            <strong className="positive">+$314.22 (+1.46%)</strong>
          </div>
          <div className="inv-stat">
            <span>Positions</span>
            <strong>{holdings.length}</strong>
          </div>
          <div className="inv-stat">
            <span>Cash Available</span>
            <strong>$2,450.00</strong>
          </div>
          <div className="inv-stat">
            <span>Dividends YTD</span>
            <strong className="positive">+$184.50</strong>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card inv-chart-card">
        <div className="chart-header">
          <h2>Portfolio Performance</h2>
          <div className="chart-period-tabs">
            {['1W', '1M', '3M', '1Y', 'All'].map(p => (
              <button
                key={p}
                className={`period-btn ${p === period ? 'period-btn--active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="bar-chart">
          {perfData.map((d, i) => {
            const heightPct = ((d.val - minVal) / (maxVal - minVal || 1)) * 70 + 20
            const isLast = i === perfData.length - 1
            return (
              <div key={d.day} className="bar-col">
                <div className="bar-value">${(d.val / 1000).toFixed(1)}k</div>
                <div className={`bar-fill ${isLast ? 'bar-fill--active' : ''}`} style={{ height: `${heightPct}%` }} />
                <div className="bar-label">{d.day}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="inv-bottom-grid">
        {/* Holdings / Allocation tabs */}
        <div className="card inv-holdings-card">
          <div className="inv-tabs">
            <button className={`inv-tab ${tab === 'holdings' ? 'inv-tab--active' : ''}`} onClick={() => setTab('holdings')}>Holdings</button>
            <button className={`inv-tab ${tab === 'allocation' ? 'inv-tab--active' : ''}`} onClick={() => setTab('allocation')}>Allocation</button>
          </div>

          {tab === 'holdings' && (
            <div className="holdings-table-wrap">
              <table className="holdings-table">
                <thead>
                  <tr><th>Symbol</th><th>Shares</th><th>Price</th><th>Change</th><th>Value</th><th>Gain</th><th></th></tr>
                </thead>
                <tbody>
                  {holdings.map(h => (
                    <tr key={h.id} className="holding-row" onClick={() => openTrade(h, 'buy')}>
                      <td>
                        <div className="holding-symbol">
                          <div className="holding-dot" style={{ background: h.color }} />
                          <div>
                            <div className="holding-ticker">{h.symbol}</div>
                            <div className="holding-name">{h.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="holding-val">{h.shares}</td>
                      <td className="holding-val">${h.price.toFixed(2)}</td>
                      <td>
                        <span className={`holding-change ${h.change >= 0 ? 'positive' : 'negative'}`}>
                          {h.change >= 0 ? '+' : ''}{h.changePct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="holding-val bold">${h.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td><span className={`holding-gain ${h.gain >= 0 ? 'positive' : 'negative'}`}>+${h.gain.toLocaleString()}</span></td>
                      <td>
                        <button
                          className="trade-btn"
                          onClick={e => { e.stopPropagation(); openTrade(h, 'buy') }}
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'allocation' && (
            <div className="allocation-view">
              <div className="alloc-donut">
                <div className="donut-center">
                  <span>${(totalValue / 1000).toFixed(1)}k</span>
                  <span>Total</span>
                </div>
                <svg viewBox="0 0 36 36" className="donut-svg">
                  {(() => {
                    let offset = 0
                    return allocationData.map(a => {
                      const dash = a.pct
                      const el = (
                        <circle key={a.label} cx="18" cy="18" r="15.9155" fill="none"
                          stroke={a.color} strokeWidth="3.5"
                          strokeDasharray={`${dash} ${100 - dash}`}
                          strokeDashoffset={-offset}
                          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                        />
                      )
                      offset += dash
                      return el
                    })
                  })()}
                </svg>
              </div>
              <div className="alloc-legend">
                {allocationData.map(a => (
                  <div key={a.label} className="alloc-item">
                    <span className="alloc-dot" style={{ background: a.color }} />
                    <span className="alloc-label">{a.label}</span>
                    <span className="alloc-pct">{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trade panel / Watchlist */}
        <div className="card trade-panel">
          {orderSuccess ? (
            /* ── Order Success ── */
            <div className="order-success">
              <div className="order-success-icon">✓</div>
              <h3>Order Placed!</h3>
              <p>
                <strong>{orderSuccess.type === 'buy' ? 'Bought' : 'Sold'}</strong>{' '}
                {orderSuccess.qty} share{orderSuccess.qty > 1 ? 's' : ''} of{' '}
                <strong>{orderSuccess.symbol}</strong> for{' '}
                <strong>${orderSuccess.total}</strong>
              </p>
              <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={resetTrade}>
                Done
              </button>
              <button className="btn btn-outline btn-full" style={{ marginTop: 8 }} onClick={() => { setOrderSuccess(null) }}>
                Place Another Order
              </button>
            </div>
          ) : tradeStock ? (
            /* ── Trade form ── */
            <>
              <div className="trade-panel-header">
                <div>
                  <div className="trade-ticker">{tradeStock.symbol}</div>
                  <div className="trade-company">{tradeStock.name}</div>
                </div>
                <div className="trade-price">${tradeStock.price.toFixed(2)}</div>
              </div>
              <div className="trade-type-tabs">
                <button className={`trade-type-btn ${tradeType === 'buy' ? 'buy--active' : ''}`} onClick={() => setTradeType('buy')}>Buy</button>
                <button className={`trade-type-btn ${tradeType === 'sell' ? 'sell--active' : ''}`} onClick={() => setTradeType('sell')}>Sell</button>
              </div>

              {/* Stock selector */}
              <div className="form-group" style={{ marginTop: '14px' }}>
                <label>Stock</label>
                <select
                  className="form-input"
                  value={tradeStock.symbol}
                  onChange={e => {
                    const found = [...holdings, ...watchlist.map(w => ({ ...w, id: w.symbol, shares: 0, change: 0, changePct: 0, value: 0, gain: 0, color: '#64748b' }))].find(h => h.symbol === e.target.value)
                    if (found) openTrade(found, tradeType)
                  }}
                >
                  <optgroup label="Your Holdings">
                    {holdings.map(h => <option key={h.symbol} value={h.symbol}>{h.symbol} — {h.name}</option>)}
                  </optgroup>
                  <optgroup label="Watchlist">
                    {watchlist.map(w => <option key={w.symbol} value={w.symbol}>{w.symbol} — {w.name}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '10px' }}>
                <label>Quantity (shares)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0"
                  min="1"
                  value={tradeQty}
                  onChange={e => setTradeQty(e.target.value)}
                />
              </div>
              {tradeQty > 0 && (
                <div className="trade-estimate">
                  <span>Estimated Total</span>
                  <strong>${(tradeStock.price * tradeQty).toFixed(2)}</strong>
                </div>
              )}
              <button
                className={`btn btn-full ${tradeType === 'buy' ? 'btn-primary' : 'btn-danger'}`}
                style={{ marginTop: '12px' }}
                disabled={!tradeQty || tradeQty <= 0}
                onClick={placeOrder}
              >
                {tradeType === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
              </button>
              <button className="btn btn-outline btn-full" style={{ marginTop: '8px' }} onClick={resetTrade}>Cancel</button>
            </>
          ) : (
            /* ── Watchlist ── */
            <>
              <h2 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700 }}>Watchlist</h2>
              {watchlist.map(w => (
                <div
                  key={w.symbol}
                  className="watch-item watch-item--clickable"
                  onClick={() => openTrade({ ...w, id: w.symbol, shares: 0, change: 0, changePct: 0, value: 0, gain: 0, color: '#64748b' }, 'buy')}
                >
                  <div>
                    <span className="watch-symbol">{w.symbol}</span>
                    <span className="watch-name">{w.name}</span>
                  </div>
                  <div className="watch-right">
                    <span className="watch-price">${w.price.toFixed(2)}</span>
                    <span className={`watch-change ${w.change >= 0 ? 'positive' : 'negative'}`}>
                      {w.change >= 0 ? '+' : ''}{w.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
              <button className="btn btn-outline btn-full" style={{ marginTop: '16px' }} onClick={() => openTrade(holdings[0], 'buy')}>
                + Open Trade Panel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
