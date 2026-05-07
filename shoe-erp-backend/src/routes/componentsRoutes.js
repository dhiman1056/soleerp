const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/componentsController')

router.get('/',       auth,                         ctrl.listComponents)
router.get('/:id',    auth,                         ctrl.getComponent)
router.post('/',      auth, role('admin','manager'), ctrl.createComponent)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateComponent)
router.delete('/:id', auth, role('admin'),           ctrl.deleteComponent)

module.exports = router
