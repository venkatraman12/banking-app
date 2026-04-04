const authService = require('../services/auth.service')
const { success, created, error } = require('../utils/response')

exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body)
    return created(res, result, 'Account created successfully')
  } catch (err) { next(err) }
}

exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body)
    return success(res, result, 'Login successful')
  } catch (err) { next(err) }
}

exports.refresh = async (req, res, next) => {
  try {
    const tokens = await authService.refresh(req.body.refreshToken)
    return success(res, tokens, 'Tokens refreshed')
  } catch (err) { next(err) }
}

exports.logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken || '')
    return success(res, null, 'Logged out successfully')
  } catch (err) { next(err) }
}

exports.changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword)
    return success(res, null, 'Password changed successfully')
  } catch (err) { next(err) }
}

exports.me = async (req, res) =>
  success(res, req.user)
