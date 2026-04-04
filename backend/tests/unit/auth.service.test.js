const bcrypt = require('bcryptjs')
const authService = require('../../src/services/auth.service')
const prisma = require('../../src/config/database')

jest.mock('../../src/config/database', () => ({
  user: { findUnique: jest.fn(), create: jest.fn() },
  account: { create: jest.fn() },
  session: { create: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
}))

jest.mock('bcryptjs')

describe('Auth Service', () => {
  afterEach(() => jest.clearAllMocks())

  describe('register', () => {
    it('throws 409 if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' })
      await expect(authService.register({ email: 'test@test.com', password: 'pass', firstName: 'A', lastName: 'B' }))
        .rejects.toMatchObject({ statusCode: 409 })
    })

    it('creates user and returns tokens on success', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      bcrypt.hash.mockResolvedValue('hashed_password')
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'new@test.com', firstName: 'A', lastName: 'B', role: 'USER', createdAt: new Date() })
      prisma.account.create.mockResolvedValue({})
      prisma.session.create.mockResolvedValue({})

      const result = await authService.register({ email: 'new@test.com', password: 'password123', firstName: 'A', lastName: 'B' })
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('user')
      expect(result.user).not.toHaveProperty('passwordHash')
    })
  })

  describe('login', () => {
    it('throws 401 on wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash: 'hash', isActive: true, role: 'USER' })
      bcrypt.compare.mockResolvedValue(false)
      await expect(authService.login({ email: 'a@b.com', password: 'wrong' }))
        .rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 401 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(authService.login({ email: 'nope@b.com', password: 'pass' }))
        .rejects.toMatchObject({ statusCode: 401 })
    })

    it('returns tokens on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash: 'hash', isActive: true, role: 'USER', firstName: 'A', lastName: 'B', createdAt: new Date() })
      bcrypt.compare.mockResolvedValue(true)
      prisma.session.create.mockResolvedValue({})

      const result = await authService.login({ email: 'a@b.com', password: 'correct' })
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('user')
    })
  })
})
