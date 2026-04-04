const { verifyAccessToken } = require('../config/jwt')
const { unauthorized } = require('../utils/response')
const prisma = require('../config/database')

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided')
    }

    const token = header.split(' ')[1]
    const decoded = verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    })

    if (!user || !user.isActive) {
      return unauthorized(res, 'User not found or inactive')
    }

    req.user = user
    next()
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token')
  }
}

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    const { forbidden } = require('../utils/response')
    return forbidden(res, 'Insufficient permissions')
  }
  next()
}

module.exports = { authenticate, authorize }
