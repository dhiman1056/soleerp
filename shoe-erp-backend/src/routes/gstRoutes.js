const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/gstController')

router.get('/',       auth,                         ctrl.listGST)
router.get('/:id',    auth,                         ctrl.getGST)
router.post('/',      auth, role('admin','manager'), ctrl.createGST)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateGST)
router.delete('/:id', auth, role('admin'),           ctrl.deleteGST)

module.exports = router
