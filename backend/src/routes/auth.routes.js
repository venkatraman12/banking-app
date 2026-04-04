const router = require('express').Router()
const ctrl = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { authLimiter } = require('../middleware/rateLimiter')
const { registerSchema, loginSchema, refreshSchema, changePasswordSchema } = require('../validators/auth.validator')

router.post('/register', authLimiter, validate(registerSchema), ctrl.register)
router.post('/login',    authLimiter, validate(loginSchema),    ctrl.login)
router.post('/refresh',  validate(refreshSchema),               ctrl.refresh)
router.post('/logout',   ctrl.logout)
router.get ('/me',       authenticate,                          ctrl.me)
router.patch('/password', authenticate, validate(changePasswordSchema), ctrl.changePassword)

module.exports = router
