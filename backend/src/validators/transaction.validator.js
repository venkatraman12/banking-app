const { z } = require('zod')

const transferSchema = z.object({
  fromAccountId: z.string().cuid('Invalid account ID'),
  toAccountId: z.string().cuid('Invalid account ID').optional(),
  toAccountNumber: z.string().optional(),
  amount: z.number().positive('Amount must be positive').max(1_000_000),
  description: z.string().max(255).optional(),
  category: z.string().max(50).optional(),
  scheduledAt: z.string().datetime().optional(),
}).refine(data => data.toAccountId || data.toAccountNumber, {
  message: 'Either toAccountId or toAccountNumber is required',
})

const paymentSchema = z.object({
  fromAccountId: z.string().cuid(),
  amount: z.number().positive().max(1_000_000),
  description: z.string().max(255),
  category: z.string().max(50).optional(),
})

module.exports = { transferSchema, paymentSchema }
