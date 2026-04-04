const { z } = require('zod')

const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().max(4).default('🎯'),
  target: z.number().positive().max(10_000_000),
  monthly: z.number().min(0).default(0),
  deadline: z.string().datetime().optional(),
})

const contributeSchema = z.object({
  amount: z.number().positive().max(1_000_000),
})

module.exports = { createGoalSchema, contributeSchema }
