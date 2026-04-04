import React, { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/Toast/Toast'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 380)
  }, [])

  const show = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++idCounter
    setToasts(prev => [...prev, { id, message, type, duration }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const success = useCallback((msg, dur) => show(msg, 'success', dur), [show])
  const error   = useCallback((msg, dur) => show(msg, 'error',   dur), [show])
  const warning = useCallback((msg, dur) => show(msg, 'warning', dur), [show])
  const info    = useCallback((msg, dur) => show(msg, 'info',    dur), [show])

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, dismiss }}>
      {children}
      <Toast toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
