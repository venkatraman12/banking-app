const prisma = require('../config/database')
const { generateAccountNumber, maskAccountNumber } = require('../utils/helpers')
const { paginate, paginatedResponse } = require('../utils/pagination')

const getAccounts = async (userId) => {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  return accounts.map(a => ({ ...a, maskedNumber: maskAccountNumber(a.number) }))
}

const getAccount = async (userId, accountId) => {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    include: {
      sentTx: { orderBy: { createdAt: 'desc' }, take: 5 },
      receivedTx: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
  if (!account) { const err = new Error('Account not found'); err.statusCode = 404; throw err }
  return { ...account, maskedNumber: maskAccountNumber(account.number) }
}

const createAccount = async (userId, data) => {
  const count = await prisma.account.count({ where: { userId } })
  if (count >= 5) { const err = new Error('Maximum 5 accounts allowed'); err.statusCode = 400; throw err }

  return prisma.account.create({
    data: { userId, ...data, number: generateAccountNumber() },
  })
}

const updateAccount = async (userId, accountId, data) => {
  await getAccount(userId, accountId) // checks ownership
  return prisma.account.update({ where: { id: accountId }, data })
}

const getAccountSummary = async (userId) => {
  const accounts = await prisma.account.findMany({ where: { userId, status: 'ACTIVE' } })
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)
  return { accounts, totalBalance, count: accounts.length }
}

module.exports = { getAccounts, getAccount, createAccount, updateAccount, getAccountSummary }
