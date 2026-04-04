const prisma = require('../config/database')

const getLoans = async (userId) =>
  prisma.loan.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })

const getLoan = async (userId, loanId) => {
  const loan = await prisma.loan.findFirst({ where: { id: loanId, userId } })
  if (!loan) { const err = new Error('Loan not found'); err.statusCode = 404; throw err }
  return loan
}

const applyLoan = async (userId, data) => {
  const monthly = _calcMonthly(data.amount, data.rate, data.termMonths)
  return prisma.loan.create({
    data: {
      userId,
      type: data.type.toUpperCase(),
      name: data.name || `${data.type} Loan`,
      principal: data.amount,
      outstanding: data.amount,
      rate: data.rate || 8.5,
      monthly,
      termMonths: data.termMonths || 36,
      status: 'PENDING',
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
}

const makePayment = async (userId, loanId, amount, accountId) => {
  const loan = await getLoan(userId, loanId)
  if (loan.status !== 'ACTIVE') { const err = new Error('Loan is not active'); err.statusCode = 400; throw err }

  const newOutstanding = Math.max(0, Number(loan.outstanding) - amount)
  const status = newOutstanding === 0 ? 'PAID' : 'ACTIVE'

  return prisma.$transaction([
    prisma.loan.update({ where: { id: loanId }, data: { outstanding: newOutstanding, status } }),
    prisma.account.update({ where: { id: accountId }, data: { balance: { decrement: amount } } }),
    prisma.transaction.create({
      data: {
        fromAccountId: accountId, amount, type: 'PAYMENT',
        description: `Loan payment — ${loan.name}`, category: 'Loan',
        reference: `LOAN${Date.now()}`,
      },
    }),
  ])
}

const _calcMonthly = (principal, annualRate, months) => {
  const r = annualRate / 100 / 12
  if (r === 0) return principal / months
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

module.exports = { getLoans, getLoan, applyLoan, makePayment }
