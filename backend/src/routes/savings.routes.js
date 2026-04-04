const router = require('express').Router()
const ctrl = require('../controllers/savings.controller')
const { authenticate } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createGoalSchema, contributeSchema } = require('../validators/savings.validator')

router.use(authenticate)
router.get   ('/',                 ctrl.getGoals)
router.post  ('/',                 validate(createGoalSchema),  ctrl.createGoal)
router.get   ('/:id',              ctrl.getGoal)
router.post  ('/:id/contribute',   validate(contributeSchema),  ctrl.contribute)
router.delete('/:id',              ctrl.deleteGoal)

module.exports = router
