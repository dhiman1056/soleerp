const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/companyController')

router.get('/',       auth,                          ctrl.listCompanies)
router.get('/:id',    auth,                          ctrl.getCompany)
router.post('/',      auth, role('admin','manager'),  ctrl.createCompany)
router.put('/:id',    auth, role('admin','manager'),  ctrl.updateCompany)
router.delete('/:id', auth, role('admin'),            ctrl.deleteCompany)

module.exports = router
