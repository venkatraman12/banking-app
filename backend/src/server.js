const app = require('./app')
const env = require('./config/env')
const prisma = require('./config/database')
const logger = require('./utils/logger')

const server = app.listen(env.PORT, async () => {
  try {
    await prisma.$connect()
    logger.info(`✅ Database connected`)
    logger.info(`🚀 NovaBanc API running on http://localhost:${env.PORT}/api/v1`)
    logger.info(`📋 Environment: ${env.NODE_ENV}`)
  } catch (err) {
    logger.error('Failed to connect to database', { message: err.message })
    process.exit(1)
  }
})

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`)
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { message: err.message })
  process.exit(1)
})

module.exports = server
