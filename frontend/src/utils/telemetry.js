const KEY = 'nova-telemetry'
const MAX_LOGS = 500
const MAX_CRASHES = 100

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || empty()
  } catch {
    return empty()
  }
}

function empty() {
  return { logs: [], crashes: [], cache: {}, apiCalls: 0, apiErrors: 0, sessionStart: Date.now() }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

export const telemetry = {
  log(type, detail = '') {
    const s = load()
    s.logs.push({ ts: Date.now(), type, detail: String(detail).slice(0, 200) })
    if (s.logs.length > MAX_LOGS) s.logs = s.logs.slice(-MAX_LOGS)
    save(s)
  },

  crash(error) {
    const s = load()
    s.crashes.push({
      ts: Date.now(),
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 400) || '',
    })
    if (s.crashes.length > MAX_CRASHES) s.crashes = s.crashes.slice(-MAX_CRASHES)
    save(s)
  },

  apiCall(path, ok) {
    const s = load()
    s.apiCalls = (s.apiCalls || 0) + 1
    if (!ok) s.apiErrors = (s.apiErrors || 0) + 1
    s.cache[path] = (s.cache[path] || 0) + 1
    save(s)
  },

  get() {
    const s = load()
    const age = Math.round((Date.now() - (s.sessionStart || Date.now())) / 1000)
    const hitRate = s.apiCalls > 0
      ? Math.round(((s.apiCalls - s.apiErrors) / s.apiCalls) * 100)
      : 100
    return { ...s, sessionAgeSeconds: age, cacheHitRate: hitRate }
  },

  clear() { save(empty()) },
}
