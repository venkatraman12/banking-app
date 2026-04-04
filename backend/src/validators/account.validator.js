const { z } = require('zod')

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['CHECKING', 'SAVINGS', 'INVESTMENT']),
  currency: z.string().length(3).default('USD'),
})

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'FROZEN']).optional(),
})

module.exports = { createAccountSchema, updateAccountSchema }
