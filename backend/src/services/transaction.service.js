const prisma = require('../config/database')
const { generateReference } = require('../utils/helpers')
const { paginate, paginatedResponse } = require('../utils/pagination')

const getTransactions = async (userId, query = {}) => {
  const { page, limit, skip } = paginate(query)
  const { category, type, startDate, endDate, search } = query

  // Get all account IDs for this user
  const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true } })
  const accountIds = accounts.map(a => a.id)

  const where = {
    OR: [{ fromAccountId: { in: accountIds } }, { toAccountId: { in: accountIds } }],
    ...(category && { category }),
    ...(type && { type }),
    ...(search && { description: { contains: search, mode: 'insensitive' } }),
    ...(startDate || endDate) && {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    },
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fromAccount: { select: { name: true, number: true } },
        toAccount: { select: { name: true, number: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ])

  return paginatedResponse(transactions, total, page, limit)
}

const transfer = async (userId, { fromAccountId, toAccountId, toAccountNumber, amount, description, category }) => {
  // Verify ownership of source account
  const from = await prisma.account.findFirst({ where: { id: fromAccountId, userId, status: 'ACTIVE' } })
  if (!from) { const err = new Error('Source account not found or inactive'); err.statusCode = 404; throw err }
  if (Number(from.balance) < amount) { const err = new Error('Insufficient funds'); err.statusCode = 400; throw err }

  // Resolve destination account
  let toId = toAccountId
  if (!toId && toAccountNumber) {
    const to = await prisma.account.findUnique({ where: { number: toAccountNumber } })
    if (!to) { const err = new Error('Destination account not found'); err.statusCode = 404; throw err }
    toId = to.id
  }

  const reference = generateReference()

  // Atomic transfer with Prisma transaction
  const [tx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        fromAccountId, toAccountId: toId, amount,
        type: 'TRANSFER', description, category,
        reference, status: 'COMPLETED',
      },
    }),
    prisma.account.update({ where: { id: fromAccountId }, data: { balance: { decrement: amount } } }),
    prisma.account.update({ where: { id: toId }, data: { balance: { increment: amount } } }),
  ])

  return tx
}

const getTransactionStats = async (userId) => {
  const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true } })
  const ids = accounts.map(a => a.id)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [income, expenses, count] = await Promise.all([
    prisma.transaction.aggregate({
      where: { toAccountId: { in: ids }, type: 'DEPOSIT', createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { fromAccountId: { in: ids }, type: { in: ['PAYMENT', 'WITHDRAWAL'] }, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.count({
      where: { OR: [{ fromAccountId: { in: ids } }, { toAccountId: { in: ids } }] },
    }),
  ])

  return {
    monthlyIncome: Number(income._sum.amount || 0),
    monthlyExpenses: Number(expenses._sum.amount || 0),
    totalTransactions: count,
  }
}

module.exports = { getTransactions, transfer, getTransactionStats }
