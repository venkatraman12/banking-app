const prisma = require('../config/database')

const getGoals = async (userId) =>
  prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })

const getGoal = async (userId, goalId) => {
  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } })
  if (!goal) { const err = new Error('Savings goal not found'); err.statusCode = 404; throw err }
  return goal
}

const createGoal = async (userId, data) =>
  prisma.savingsGoal.create({ data: { userId, ...data } })

const contribute = async (userId, goalId, amount) => {
  const goal = await getGoal(userId, goalId)
  const newSaved = Math.min(Number(goal.saved) + amount, Number(goal.target))
  return prisma.savingsGoal.update({
    where: { id: goalId },
    data: { saved: newSaved },
  })
}

const deleteGoal = async (userId, goalId) => {
  await getGoal(userId, goalId)
  await prisma.savingsGoal.delete({ where: { id: goalId } })
}

module.exports = { getGoals, getGoal, createGoal, contribute, deleteGoal }
