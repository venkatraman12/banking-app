const prisma = require('../config/database')

const getCards = async (userId) =>
  prisma.card.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })

const getCard = async (userId, cardId) => {
  const card = await prisma.card.findFirst({ where: { id: cardId, userId } })
  if (!card) { const err = new Error('Card not found'); err.statusCode = 404; throw err }
  return card
}

const toggleFreeze = async (userId, cardId) => {
  const card = await getCard(userId, cardId)
  const newStatus = card.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE'
  return prisma.card.update({ where: { id: cardId }, data: { status: newStatus } })
}

const blockCard = async (userId, cardId) => {
  await getCard(userId, cardId)
  return prisma.card.update({ where: { id: cardId }, data: { status: 'BLOCKED' } })
}

const setLimit = async (userId, cardId, limit) => {
  await getCard(userId, cardId)
  return prisma.card.update({ where: { id: cardId }, data: { limit } })
}

module.exports = { getCards, getCard, toggleFreeze, blockCard, setLimit }
