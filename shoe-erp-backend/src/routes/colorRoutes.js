const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/colorController')

router.get('/',       auth, ctrl.listColors)
router.get('/:id',   auth, ctrl.getColor)
router.post('/import', auth, role('admin', 'manager'), ctrl.importColors)
router.post('/',      auth, role('admin', 'manager'), ctrl.createColor)
router.put('/:id',    auth, role('admin', 'manager'), ctrl.updateColor)
router.delete('/:id', auth, role('admin'), ctrl.deleteColor)

module.exports = router
