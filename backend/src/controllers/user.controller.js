const userService = require('../services/user.service')
const { success } = require('../utils/response')

exports.getProfile   = async (req, res, next) => { try { return success(res, await userService.getProfile(req.user.id)) } catch (e) { next(e) } }
exports.updateProfile= async (req, res, next) => { try { return success(res, await userService.updateProfile(req.user.id, req.body)) } catch (e) { next(e) } }
exports.getDashboard = async (req, res, next) => { try { return success(res, await userService.getDashboard(req.user.id)) } catch (e) { next(e) } }
