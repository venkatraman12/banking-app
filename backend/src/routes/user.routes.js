const router = require('express').Router()
const ctrl = require('../controllers/user.controller')
const { authenticate } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { updateProfileSchema } = require('../validators/user.validator')

router.use(authenticate)
router.get  ('/dashboard', ctrl.getDashboard)
router.get  ('/profile',   ctrl.getProfile)
router.patch('/profile',   validate(updateProfileSchema), ctrl.updateProfile)

module.exports = router
