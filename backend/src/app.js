const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const env = require('./config/env')
const routes = require('./routes')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')
const { defaultLimiter } = require('./middleware/rateLimiter')

const app = express()

// ── Security ──────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Logging ───────────────────────────────────
if (env.isDev()) app.use(morgan('dev'))

// ── Body parsing ──────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))

// ── Rate limiting ─────────────────────────────
app.use('/api', defaultLimiter)

// ── Routes ────────────────────────────────────
app.use('/api/v1', routes)

// ── 404 + Error handlers ──────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
