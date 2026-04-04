const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const passwordHash = await bcrypt.hash('password', 12)
  const user = await prisma.user.upsert({
    where: { email: 'demo@novabanc.com' },
    update: {},
    create: {
      email: 'demo@novabanc.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Johnson',
      phone: '+1 (555) 234-5678',
      dateOfBirth: new Date('1990-05-14'),
      address: '123 Main Street, New York, NY 10001',
    },
  })

  // Create accounts
  const checking = await prisma.account.upsert({
    where: { number: '4821883429014821' },
    update: {},
    create: {
      userId: user.id,
      name: 'Checking Account',
      type: 'CHECKING',
      number: '4821883429014821',
      balance: 12450.75,
    },
  })

  const savings = await prisma.account.upsert({
    where: { number: '2934551278232934' },
    update: {},
    create: {
      userId: user.id,
      name: 'Savings Account',
      type: 'SAVINGS',
      number: '2934551278232934',
      balance: 34820.00,
    },
  })

  const investment = await prisma.account.upsert({
    where: { number: '7610442133107610' },
    update: {},
    create: {
      userId: user.id,
      name: 'Investment Account',
      type: 'INVESTMENT',
      number: '7610442133107610',
      balance: 89340.50,
    },
  })

  // Create cards
  await prisma.card.createMany({
    skipDuplicates: true,
    data: [
      { userId: user.id, accountId: checking.id, type: 'DEBIT', label: 'Platinum Debit', last4: '4821', expiry: '09/28', network: 'Visa', limit: 5000, spent: 1240 },
      { userId: user.id, accountId: savings.id, type: 'CREDIT', label: 'Gold Credit', last4: '5412', expiry: '03/27', network: 'Mastercard', limit: 10000, spent: 3760 },
    ],
  })

  // Create transactions
  const txData = [
    { fromAccountId: checking.id, amount: 15.99, type: 'PAYMENT', category: 'Entertainment', description: 'Netflix Subscription' },
    { toAccountId: checking.id, amount: 5500.00, type: 'DEPOSIT', category: 'Income', description: 'Salary Deposit' },
    { fromAccountId: checking.id, amount: 87.43, type: 'PAYMENT', category: 'Groceries', description: 'Whole Foods Market' },
    { fromAccountId: checking.id, amount: 124.00, type: 'PAYMENT', category: 'Utilities', description: 'Electric Bill' },
    { fromAccountId: checking.id, amount: 234.99, type: 'PAYMENT', category: 'Shopping', description: 'Amazon Purchase' },
    { fromAccountId: checking.id, amount: 1800.00, type: 'PAYMENT', category: 'Housing', description: 'Rent Payment' },
    { fromAccountId: savings.id, toAccountId: checking.id, amount: 1000.00, type: 'TRANSFER', description: 'Monthly transfer' },
  ]

  for (const tx of txData) {
    await prisma.transaction.create({ data: { ...tx, reference: `TXN${Date.now()}${Math.random()}` } })
    await new Promise(r => setTimeout(r, 5)) // ensure unique timestamps
  }

  // Create loans
  await prisma.loan.createMany({
    skipDuplicates: false,
    data: [
      { userId: user.id, type: 'HOME', name: 'Home Mortgage', principal: 350000, outstanding: 285000, rate: 3.25, monthly: 1520, termMonths: 360, nextDueDate: new Date('2026-03-15') },
      { userId: user.id, type: 'AUTO', name: 'Auto Loan', principal: 28000, outstanding: 12400, rate: 4.9, monthly: 485, termMonths: 60, nextDueDate: new Date('2026-03-20') },
      { userId: user.id, type: 'PERSONAL', name: 'Personal Loan', principal: 10000, outstanding: 3200, rate: 7.5, monthly: 320, termMonths: 36, nextDueDate: new Date('2026-03-25') },
    ],
  })

  // Create savings goals
  await prisma.savingsGoal.createMany({
    skipDuplicates: false,
    data: [
      { userId: user.id, name: 'Emergency Fund', emoji: '🛡️', target: 15000, saved: 9800, monthly: 500, deadline: new Date('2026-12-01') },
      { userId: user.id, name: 'Vacation — Japan', emoji: '✈️', target: 5000, saved: 3200, monthly: 300, deadline: new Date('2026-08-01') },
      { userId: user.id, name: 'New MacBook', emoji: '💻', target: 2500, saved: 2500, monthly: 0 },
    ],
  })

  // Create investments
  await prisma.investment.createMany({
    skipDuplicates: false,
    data: [
      { userId: user.id, symbol: 'AAPL', name: 'Apple Inc.', shares: 15, avgPrice: 155.55 },
      { userId: user.id, symbol: 'MSFT', name: 'Microsoft Corp.', shares: 10, avgPrice: 289.95 },
      { userId: user.id, symbol: 'NVDA', name: 'NVIDIA Corp.', shares: 5, avgPrice: 407.48 },
    ],
  })

  console.log('✅ Seed complete!')
  console.log(`   User: demo@novabanc.com / password`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
