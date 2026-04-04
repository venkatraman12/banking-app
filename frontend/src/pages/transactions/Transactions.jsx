import { useState, Profiler } from 'react'
import './Transactions.css'

const allTransactions = [
  { id: 1, name: 'Netflix Subscription', category: 'Entertainment', amount: -15.99, date: '2026-03-10', status: 'Completed', icon: '🎬' },
  { id: 2, name: 'Salary Deposit', category: 'Income', amount: 5500.00, date: '2026-03-09', status: 'Completed', icon: '💼' },
  { id: 3, name: 'Whole Foods Market', category: 'Groceries', amount: -87.43, date: '2026-03-08', status: 'Completed', icon: '🛒' },
  { id: 4, name: 'Electric Bill', category: 'Utilities', amount: -124.00, date: '2026-03-07', status: 'Completed', icon: '⚡' },
  { id: 5, name: 'Amazon Purchase', category: 'Shopping', amount: -234.99, date: '2026-03-06', status: 'Completed', icon: '📦' },
  { id: 6, name: 'Uber Ride', category: 'Transport', amount: -18.50, date: '2026-03-06', status: 'Completed', icon: '🚗' },
  { id: 7, name: 'Rent Payment', category: 'Housing', amount: -1800.00, date: '2026-03-05', status: 'Completed', icon: '🏠' },
  { id: 8, name: 'Gym Membership', category: 'Health', amount: -49.99, date: '2026-03-05', status: 'Completed', icon: '💪' },
  { id: 9, name: 'Restaurant Dinner', category: 'Food', amount: -64.20, date: '2026-03-04', status: 'Completed', icon: '🍽️' },
  { id: 10, name: 'Freelance Payment', category: 'Income', amount: 1200.00, date: '2026-03-03', status: 'Completed', icon: '💻' },
  { id: 11, name: 'Spotify', category: 'Entertainment', amount: -9.99, date: '2026-03-02', status: 'Completed', icon: '🎵' },
  { id: 12, name: 'Pharmacy', category: 'Health', amount: -32.50, date: '2026-03-01', status: 'Completed', icon: '💊' },
]

const categories = ['All', 'Income', 'Housing', 'Groceries', 'Entertainment', 'Transport', 'Shopping', 'Utilities', 'Health', 'Food']

function exportCSV(transactions) {
  const header = ['Date', 'Name', 'Category', 'Status', 'Amount']
  const rows = transactions.map(tx => [
    tx.date,
    `"${tx.name}"`,
    tx.category,
    tx.status,
    tx.amount.toFixed(2),
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Transactions() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [type, setType] = useState('All')
  const [sortCol, setSortCol] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'amount' ? 'desc' : 'asc')
    }
  }

  const filtered = allTransactions
    .filter(tx => {
      const matchSearch = tx.name.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || tx.category === category
      const matchType = type === 'All' || (type === 'Income' ? tx.amount > 0 : tx.amount < 0)
      return matchSearch && matchCategory && matchType
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortCol === 'date')     cmp = a.date.localeCompare(b.date)
      if (sortCol === 'name')     cmp = a.name.localeCompare(b.name)
      if (sortCol === 'category') cmp = a.category.localeCompare(b.category)
      if (sortCol === 'amount')   cmp = a.amount - b.amount
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalIn = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalOut = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <Profiler id="Transactions" onRender={(id, phase, actual, base) =>
      console.log(`[Profiler] ${id} ${phase}: actual=${actual.toFixed(1)}ms base=${base.toFixed(1)}ms`)
    }>
    <div className="transactions-page">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>View and filter all your transactions</p>
        </div>
        <button className="btn btn-outline" onClick={() => exportCSV(filtered)}>Export CSV</button>
      </div>

      <div className="tx-summary-row">
        <div className="tx-summary-card">
          <span className="tx-summary-label">Total In</span>
          <span className="tx-summary-amount positive">+${totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="tx-summary-card">
          <span className="tx-summary-label">Total Out</span>
          <span className="tx-summary-amount negative">-${totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="tx-summary-card">
          <span className="tx-summary-label">Net</span>
          <span className={`tx-summary-amount ${totalIn - totalOut >= 0 ? 'positive' : 'negative'}`}>
            {totalIn - totalOut >= 0 ? '+' : '-'}${Math.abs(totalIn - totalOut).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="tx-summary-card">
          <span className="tx-summary-label">Transactions</span>
          <span className="tx-summary-amount">{filtered.length}</span>
        </div>
      </div>

      <div className="card">
        <div className="tx-filters">
          <div className="filter-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={type} onChange={e => setType(e.target.value)} className="filter-select">
            <option value="All">All Types</option>
            <option value="Income">Income</option>
            <option value="Expense">Expenses</option>
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)} className="filter-select">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="tx-table-wrapper">
          <table className="tx-table">
            <thead>
              <tr>
                {[['name','Transaction'],['category','Category'],['date','Date'],['status','Status'],['amount','Amount']].map(([col, label]) => (
                  <th key={col} onClick={() => col !== 'status' && handleSort(col)} style={col !== 'status' ? { cursor: 'pointer', userSelect: 'none' } : {}}>
                    {label}
                    {sortCol === col && col !== 'status' && (
                      <span style={{ marginLeft: 4, opacity: 0.6 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <div className="tx-name-cell">
                      <span className="tx-table-icon">{tx.icon}</span>
                      <span className="tx-table-name">{tx.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">{tx.category}</span>
                  </td>
                  <td className="tx-date">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td>
                    <span className="status-badge status--completed">{tx.status}</span>
                  </td>
                  <td>
                    <span className={`tx-table-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="tx-empty">
              <p>No transactions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </Profiler>
  )
}
