const router = require('express').Router()
const ctrl = require('../controllers/transaction.controller')
const { authenticate } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { transferLimiter } = require('../middleware/rateLimiter')
const { transferSchema } = require('../validators/transaction.validator')

router.use(authenticate)
router.get  ('/',         ctrl.getTransactions)
router.get  ('/stats',    ctrl.getStats)
router.post ('/transfer', transferLimiter, validate(transferSchema), ctrl.transfer)

module.exports = router
