const invService = require('../services/investment.service')
const { success, created } = require('../utils/response')

exports.getPortfolio = async (req, res, next) => { try { return success(res, await invService.getPortfolio(req.user.id)) } catch (e) { next(e) } }
exports.buy          = async (req, res, next) => { try { return created(res, await invService.buy(req.user.id, req.body.symbol, req.body.name, req.body.shares, req.body.price)) } catch (e) { next(e) } }
exports.sell         = async (req, res, next) => { try { return success(res, await invService.sell(req.user.id, req.body.symbol, req.body.shares), 'Sell order placed') } catch (e) { next(e) } }
