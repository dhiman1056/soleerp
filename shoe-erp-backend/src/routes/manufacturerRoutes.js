const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/manufacturerController')

router.get('/',       auth,                         ctrl.listManufacturers)
router.get('/:id',    auth,                         ctrl.getManufacturer)
router.post('/',      auth, role('admin','manager'), ctrl.createManufacturer)
router.post('/import', auth, role('admin','manager'), ctrl.importManufacturers)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateManufacturer)
router.delete('/:id', auth, role('admin'),           ctrl.deleteManufacturer)

module.exports = router
