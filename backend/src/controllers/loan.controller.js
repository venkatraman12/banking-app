const loanService = require('../services/loan.service')
const { success, created } = require('../utils/response')

exports.getLoans     = async (req, res, next) => { try { return success(res, await loanService.getLoans(req.user.id)) } catch (e) { next(e) } }
exports.getLoan      = async (req, res, next) => { try { return success(res, await loanService.getLoan(req.user.id, req.params.id)) } catch (e) { next(e) } }
exports.applyLoan    = async (req, res, next) => { try { return created(res, await loanService.applyLoan(req.user.id, req.body), 'Loan application submitted') } catch (e) { next(e) } }
exports.makePayment  = async (req, res, next) => { try { return success(res, await loanService.makePayment(req.user.id, req.params.id, req.body.amount, req.body.accountId), 'Payment successful') } catch (e) { next(e) } }
