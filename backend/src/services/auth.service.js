const bcrypt = require('bcryptjs')
const prisma = require('../config/database')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../config/jwt')
const { generateAccountNumber } = require('../utils/helpers')
const env = require('../config/env')

const register = async ({ email, password, firstName, lastName, phone }) => {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const err = new Error('Email already in use'); err.statusCode = 409; throw err
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS)
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, phone },
  })

  // Auto-create a checking account for new users
  await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Checking Account',
      type: 'CHECKING',
      number: generateAccountNumber(),
    },
  })

  const tokens = _issueTokens(user)
  await _saveSession(user.id, tokens.refreshToken)
  return { user: _safeUser(user), ...tokens }
}

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    const err = new Error('Invalid credentials'); err.statusCode = 401; throw err
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const err = new Error('Invalid credentials'); err.statusCode = 401; throw err
  }

  const tokens = _issueTokens(user)
  await _saveSession(user.id, tokens.refreshToken)
  return { user: _safeUser(user), ...tokens }
}

const refresh = async (refreshToken) => {
  let decoded
  try { decoded = verifyRefreshToken(refreshToken) }
  catch { const err = new Error('Invalid refresh token'); err.statusCode = 401; throw err }

  const session = await prisma.session.findUnique({ where: { refreshToken } })
  if (!session || session.expiresAt < new Date()) {
    const err = new Error('Session expired'); err.statusCode = 401; throw err
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
  if (!user || !user.isActive) {
    const err = new Error('User not found'); err.statusCode = 401; throw err
  }

  // Rotate refresh token
  await prisma.session.delete({ where: { refreshToken } })
  const tokens = _issueTokens(user)
  await _saveSession(user.id, tokens.refreshToken)
  return tokens
}

const logout = async (refreshToken) => {
  await prisma.session.deleteMany({ where: { refreshToken } })
}

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    const err = new Error('Current password is incorrect'); err.statusCode = 400; throw err
  }
  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  await prisma.session.deleteMany({ where: { userId } }) // invalidate all sessions
}

// ── Private helpers ──
const _issueTokens = (user) => ({
  accessToken: signAccessToken({ userId: user.id, email: user.email, role: user.role }),
  refreshToken: signRefreshToken({ userId: user.id }),
})

const _saveSession = (userId, refreshToken) =>
  prisma.session.create({
    data: {
      userId,
      refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

const _safeUser = (user) => ({
  id: user.id, email: user.email,
  firstName: user.firstName, lastName: user.lastName,
  role: user.role, createdAt: user.createdAt,
})

module.exports = { register, login, refresh, logout, changePassword }
