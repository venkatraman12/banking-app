const router = require('express').Router()
const ctrl = require('../controllers/investment.controller')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)
router.get  ('/',     ctrl.getPortfolio)
router.post ('/buy',  ctrl.buy)
router.post ('/sell', ctrl.sell)

module.exports = router
