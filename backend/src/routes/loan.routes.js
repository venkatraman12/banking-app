const router = require('express').Router()
const ctrl = require('../controllers/loan.controller')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)
router.get  ('/',              ctrl.getLoans)
router.post ('/',              ctrl.applyLoan)
router.get  ('/:id',           ctrl.getLoan)
router.post ('/:id/payment',   ctrl.makePayment)

module.exports = router
