const savingsService = require('../services/savings.service')
const { success, created } = require('../utils/response')

exports.getGoals    = async (req, res, next) => { try { return success(res, await savingsService.getGoals(req.user.id)) } catch (e) { next(e) } }
exports.getGoal     = async (req, res, next) => { try { return success(res, await savingsService.getGoal(req.user.id, req.params.id)) } catch (e) { next(e) } }
exports.createGoal  = async (req, res, next) => { try { return created(res, await savingsService.createGoal(req.user.id, req.body)) } catch (e) { next(e) } }
exports.contribute  = async (req, res, next) => { try { return success(res, await savingsService.contribute(req.user.id, req.params.id, req.body.amount)) } catch (e) { next(e) } }
exports.deleteGoal  = async (req, res, next) => { try { await savingsService.deleteGoal(req.user.id, req.params.id); return success(res, null, 'Goal deleted') } catch (e) { next(e) } }
