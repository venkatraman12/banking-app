const cardService = require('../services/card.service')
const { success } = require('../utils/response')

exports.getCards     = async (req, res, next) => { try { return success(res, await cardService.getCards(req.user.id)) } catch (e) { next(e) } }
exports.getCard      = async (req, res, next) => { try { return success(res, await cardService.getCard(req.user.id, req.params.id)) } catch (e) { next(e) } }
exports.toggleFreeze = async (req, res, next) => { try { return success(res, await cardService.toggleFreeze(req.user.id, req.params.id)) } catch (e) { next(e) } }
exports.blockCard    = async (req, res, next) => { try { return success(res, await cardService.blockCard(req.user.id, req.params.id)) } catch (e) { next(e) } }
exports.setLimit     = async (req, res, next) => { try { return success(res, await cardService.setLimit(req.user.id, req.params.id, req.body.limit)) } catch (e) { next(e) } }
