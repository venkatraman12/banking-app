import { telemetry } from '../utils/telemetry'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'
const TOKEN_KEY   = 'nova-access-token'
const REFRESH_KEY = 'nova-refresh-token'
const USER_KEY    = 'nova-user'

export const tokenStore = {
  get:     () => localStorage.getItem(TOKEN_KEY),
  set:     (t) => localStorage.setItem(TOKEN_KEY, t),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (t) => localStorage.setItem(REFRESH_KEY, t),
  clear:   () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  },
  user:    () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') }
    catch { return null }
  },
  setUser: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
}

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message)
    this.status = status
    this.body   = body
  }
}

async function request(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  if (auth) {
    const t = tokenStore.get()
    if (t) h.Authorization = `Bearer ${t}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = data?.detail || data?.message || res.statusText
    telemetry.apiCall(path, false)
    throw new ApiError(res.status, msg, data)
  }
  telemetry.apiCall(path, true)
  return data
}

export const api = {
  // Auth
  login:      (email, password) => request('/auth/login',      { method: 'POST', auth: false, body: { email, password } }),
  verifyOtp:  (challenge_id, code) => request('/auth/otp/verify', { method: 'POST', auth: false, body: { challenge_id, code } }),
  register:   (data) => request('/auth/register', { method: 'POST', auth: false, body: data }),
  logout:     (refresh_token) => request('/auth/logout', { method: 'POST', body: { refresh_token } }),
  me:         () => request('/auth/me'),
  changePassword: (current_password, new_password) =>
                  request('/auth/password', { method: 'PATCH', body: { current_password, new_password } }),

  // Profile
  getProfile:    () => request('/users/me'),
  updateProfile: (data) => request('/users/me', { method: 'PATCH', body: data }),
  myDevices:     () => request('/users/me/devices'),

  // Accounts
  getAccounts:      () => request('/accounts'),
  getAccountSummary:() => request('/accounts/summary'),
  getAccount:       (id) => request(`/accounts/${id}`),
  createAccount:    (data) => request('/accounts', { method: 'POST', body: data }),
  updateAccount:    (id, data) => request(`/accounts/${id}`, { method: 'PATCH', body: data }),

  // Transactions
  getTransactions: () => request('/transactions'),
  getTxStats:      () => request('/transactions/stats'),
  transfer:        (data) => request('/transactions/transfer', { method: 'POST', body: data }),

  // Cards / Loans / Savings / Investments
  getCards:        () => request('/cards'),
  createCard:      (data) => request('/cards', { method: 'POST', body: data }),
  updateCard:      (id, data) => request(`/cards/${id}`, { method: 'PATCH', body: data }),
  deleteCard:      (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  getLoans:        () => request('/loans'),
  createLoan:      (data) => request('/loans', { method: 'POST', body: data }),
  getSavings:      () => request('/savings'),
  createSavings:   (data) => request('/savings', { method: 'POST', body: data }),
  getInvestments:  () => request('/investments'),
  createInvestment:(data) => request('/investments', { method: 'POST', body: data }),

  // API Keys
  getApiKeys:    () => request('/api-keys'),
  createApiKey:  (data) => request('/api-keys', { method: 'POST', body: data }),
  revokeApiKey:  (id) => request(`/api-keys/${id}`, { method: 'DELETE' }),

  // Admin-only audit views
  getAuthLogs:       () => request('/admin/auth-logs'),
  getLoginAttempts:  () => request('/admin/login-attempts'),
  getAllDevices:     () => request('/admin/devices'),
}
