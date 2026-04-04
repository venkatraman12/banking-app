const router = require('express').Router()
const ctrl = require('../controllers/account.controller')
const { authenticate } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createAccountSchema, updateAccountSchema } = require('../validators/account.validator')

router.use(authenticate)
router.get   ('/',          ctrl.getAccounts)
router.get   ('/summary',   ctrl.getSummary)
router.post  ('/',          validate(createAccountSchema), ctrl.createAccount)
router.get   ('/:id',       ctrl.getAccount)
router.patch ('/:id',       validate(updateAccountSchema), ctrl.updateAccount)

module.exports = router
