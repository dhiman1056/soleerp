const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/brandController')

router.get('/',       auth,                         ctrl.listBrands)
router.get('/:id',    auth,                         ctrl.getBrand)
router.post('/',      auth, role('admin','manager'), ctrl.createBrand)
router.post('/import', auth, role('admin', 'manager'), ctrl.importBrands)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateBrand)
router.delete('/:id', auth, role('admin'),           ctrl.deleteBrand)

module.exports = router
