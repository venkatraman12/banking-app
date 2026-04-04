const env = require('../config/env')

const levels = { error: 0, warn: 1, info: 2, debug: 3 }
const currentLevel = env.isDev() ? 3 : 1

const format = (level, msg, meta) => {
  const ts = new Date().toISOString()
  const base = `[${ts}] [${level.toUpperCase()}] ${msg}`
  return meta ? `${base} ${JSON.stringify(meta)}` : base
}

const logger = {
  error: (msg, meta) => { if (levels.error <= currentLevel) console.error(format('error', msg, meta)) },
  warn:  (msg, meta) => { if (levels.warn  <= currentLevel) console.warn(format('warn',  msg, meta)) },
  info:  (msg, meta) => { if (levels.info  <= currentLevel) console.log(format('info',   msg, meta)) },
  debug: (msg, meta) => { if (levels.debug <= currentLevel) console.log(format('debug',  msg, meta)) },
}

module.exports = logger
