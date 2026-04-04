const logger = require('../utils/logger')
const env = require('../config/env')

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.path}`, { message: err.message, stack: err.stack })

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Resource already exists' })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Resource not found' })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' })
  }

  const statusCode = err.statusCode || err.status || 500
  const message = env.isProd() && statusCode === 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error'

  res.status(statusCode).json({ success: false, message })
}

const notFoundHandler = (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })

module.exports = { errorHandler, notFoundHandler }
