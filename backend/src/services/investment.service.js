const prisma = require('../config/database')

// Mock price lookup (replace with real market data API)
const MOCK_PRICES = {
  AAPL: 182.52, MSFT: 378.85, GOOGL: 142.36,
  NVDA: 875.40, VOO: 486.20, TSLA: 175.34,
  AMZN: 185.60, META: 484.10,
}

const getPortfolio = async (userId) => {
  const holdings = await prisma.investment.findMany({ where: { userId } })

  const enriched = holdings.map(h => {
    const currentPrice = MOCK_PRICES[h.symbol] || Number(h.avgPrice)
    const currentValue = currentPrice * Number(h.shares)
    const costBasis = Number(h.avgPrice) * Number(h.shares)
    const gain = currentValue - costBasis
    const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : 0
    return { ...h, currentPrice, currentValue, gain, gainPct: gainPct.toFixed(2) }
  })

  const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0)
  const totalCost = enriched.reduce((s, h) => s + Number(h.avgPrice) * Number(h.shares), 0)
  const totalGain = totalValue - totalCost

  return { holdings: enriched, totalValue, totalGain, totalGainPct: totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(2) : '0' }
}

const buy = async (userId, symbol, name, shares, price) => {
  const existing = await prisma.investment.findUnique({ where: { userId_symbol: { userId, symbol } } })

  if (existing) {
    const totalShares = Number(existing.shares) + shares
    const newAvg = (Number(existing.avgPrice) * Number(existing.shares) + price * shares) / totalShares
    return prisma.investment.update({
      where: { userId_symbol: { userId, symbol } },
      data: { shares: totalShares, avgPrice: newAvg },
    })
  }

  return prisma.investment.create({ data: { userId, symbol, name, shares, avgPrice: price } })
}

const sell = async (userId, symbol, shares) => {
  const holding = await prisma.investment.findUnique({ where: { userId_symbol: { userId, symbol } } })
  if (!holding) { const err = new Error('You do not hold this stock'); err.statusCode = 400; throw err }
  if (Number(holding.shares) < shares) { const err = new Error('Insufficient shares'); err.statusCode = 400; throw err }

  const remaining = Number(holding.shares) - shares
  if (remaining === 0) {
    await prisma.investment.delete({ where: { userId_symbol: { userId, symbol } } })
    return null
  }
  return prisma.investment.update({ where: { userId_symbol: { userId, symbol } }, data: { shares: remaining } })
}

module.exports = { getPortfolio, buy, sell }
