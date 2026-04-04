const prisma = require('../config/database')
const { omit } = require('../utils/helpers')

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      phone: true, dateOfBirth: true, address: true, role: true,
      createdAt: true, updatedAt: true,
      _count: { select: { accounts: true, cards: true, loans: true } },
    },
  })
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err }
  return user
}

const updateProfile = async (userId, data) => {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, email: true, firstName: true, lastName: true,
      phone: true, dateOfBirth: true, address: true, updatedAt: true,
    },
  })
}

const getDashboard = async (userId) => {
  const [accounts, recentTx, loans, goals] = await Promise.all([
    prisma.account.findMany({ where: { userId, status: 'ACTIVE' } }),
    prisma.transaction.findMany({
      where: {
        OR: [
          { fromAccount: { userId } },
          { toAccount: { userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        fromAccount: { select: { name: true } },
        toAccount: { select: { name: true } },
      },
    }),
    prisma.loan.findMany({ where: { userId, status: 'ACTIVE' }, take: 3 }),
    prisma.savingsGoal.findMany({ where: { userId }, take: 3 }),
  ])

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

  return { totalBalance, accounts, recentTransactions: recentTx, loans, savingsGoals: goals }
}

module.exports = { getProfile, updateProfile, getDashboard }
