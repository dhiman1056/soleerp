const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/uomController')

router.get('/', auth, ctrl.listUOMs)

router.get('/:id', auth, ctrl.getUOM)
router.post('/', auth, role('admin','manager'), ctrl.createUOM)
router.put('/:id', auth, role('admin','manager'), ctrl.updateUOM)
router.delete('/:id', auth, role('admin'), ctrl.deleteUOM)

module.exports = router
