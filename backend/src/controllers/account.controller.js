const accountService = require('../services/account.service')
const { success, created } = require('../utils/response')

exports.getAccounts = async (req, res, next) => {
  try { return success(res, await accountService.getAccounts(req.user.id)) }
  catch (err) { next(err) }
}

exports.getAccount = async (req, res, next) => {
  try { return success(res, await accountService.getAccount(req.user.id, req.params.id)) }
  catch (err) { next(err) }
}

exports.createAccount = async (req, res, next) => {
  try { return created(res, await accountService.createAccount(req.user.id, req.body)) }
  catch (err) { next(err) }
}

exports.updateAccount = async (req, res, next) => {
  try { return success(res, await accountService.updateAccount(req.user.id, req.params.id, req.body)) }
  catch (err) { next(err) }
}

exports.getSummary = async (req, res, next) => {
  try { return success(res, await accountService.getAccountSummary(req.user.id)) }
  catch (err) { next(err) }
}
