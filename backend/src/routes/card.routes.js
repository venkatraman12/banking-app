const router = require('express').Router()
const ctrl = require('../controllers/card.controller')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)
router.get  ('/',                  ctrl.getCards)
router.get  ('/:id',               ctrl.getCard)
router.patch('/:id/freeze',        ctrl.toggleFreeze)
router.patch('/:id/block',         ctrl.blockCard)
router.patch('/:id/limit',         ctrl.setLimit)

module.exports = router
