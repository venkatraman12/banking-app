const router = require('express').Router()

router.use('/auth',        require('./auth.routes'))
router.use('/users',       require('./user.routes'))
router.use('/accounts',    require('./account.routes'))
router.use('/transactions', require('./transaction.routes'))
router.use('/loans',       require('./loan.routes'))
router.use('/cards',       require('./card.routes'))
router.use('/savings',     require('./savings.routes'))
router.use('/investments', require('./investment.routes'))

router.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' })
)

module.exports = router
