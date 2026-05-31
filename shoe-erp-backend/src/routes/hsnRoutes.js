const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/hsnController')

router.get('/',       auth,                         ctrl.listHSN)
router.get('/:id',    auth,                         ctrl.getHSN)
router.post('/',      auth, role('admin','manager'), ctrl.createHSN)
router.post('/import', auth, role('admin','manager'), ctrl.importHSNs)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateHSN)
router.delete('/:id', auth, role('admin'),           ctrl.deleteHSN)

module.exports = router
