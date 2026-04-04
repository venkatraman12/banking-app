const txService = require('../services/transaction.service')
const { success, created } = require('../utils/response')

exports.getTransactions = async (req, res, next) => {
  try { return success(res, await txService.getTransactions(req.user.id, req.query)) }
  catch (err) { next(err) }
}

exports.transfer = async (req, res, next) => {
  try { return created(res, await txService.transfer(req.user.id, req.body), 'Transfer completed') }
  catch (err) { next(err) }
}

exports.getStats = async (req, res, next) => {
  try { return success(res, await txService.getTransactionStats(req.user.id)) }
  catch (err) { next(err) }
}
