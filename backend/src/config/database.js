const { PrismaClient } = require('@prisma/client')
const env = require('./env')

const prisma = new PrismaClient({
  log: env.isDev() ? ['query', 'warn', 'error'] : ['error'],
})

module.exports = prisma
