const jwt = require('jsonwebtoken')
const env = require('./env')

const signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })

const signRefreshToken = (payload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN })

const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_SECRET)

const verifyRefreshToken = (token) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET)

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken }
