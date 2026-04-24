import { useState } from 'react'

const DEMO_PIN = '1234'

export default function PinPad({ title = 'Enter PIN', subtitle = 'Enter your 4-digit transaction PIN', onSuccess, onCancel }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const press = (digit) => {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setError('')
    if (next.length === 4) {
      setTimeout(() => verify(next), 120)
    }
  }

  const backspace = () => {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  const verify = (code) => {
    if (code === DEMO_PIN) {
      onSuccess()
    } else {
      setShake(true)
      setError('Incorrect PIN. Try again.')
      setPin('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="pinpad-overlay">
      <div className={`pinpad-modal ${shake ? 'pinpad-shake' : ''}`}>
        <div className="pinpad-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h3>{title}</h3>
        <p>{subtitle}</p>

        {/* PIN dots */}
        <div className="pinpad-dots">
          {[0,1,2,3].map(i => (
            <div key={i} className={`pinpad-dot ${i < pin.length ? 'pinpad-dot--filled' : ''}`} />
          ))}
        </div>

        <div className="pinpad-error">{error}</div>

        {/* Number grid */}
        <div className="pinpad-grid">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} className="pinpad-key" onClick={() => press(d)}>{d}</button>
          ))}
          <button className="pinpad-key" onClick={backspace}>⌫</button>
          <button className="pinpad-key" onClick={() => press('0')}>0</button>
          <button className="pinpad-key pinpad-key--cancel" onClick={onCancel} style={{fontSize:12,color:'var(--text-muted)'}}>✕</button>
        </div>

        <p style={{fontSize:11,color:'var(--text-muted)',marginTop:-8}}>Demo PIN: <strong>1234</strong></p>
      </div>
    </div>
  )
}
