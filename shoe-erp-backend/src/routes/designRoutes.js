const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/designController')

router.get('/',       auth,                         ctrl.listDesigns)
router.get('/:id',    auth,                         ctrl.getDesign)
router.post('/import', auth, role('admin','manager'), ctrl.importDesigns)
router.post('/',      auth, role('admin','manager'), ctrl.createDesign)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateDesign)
router.delete('/:id', auth, role('admin'),           ctrl.deleteDesign)

module.exports = router
