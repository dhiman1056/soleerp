const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/departmentController')

router.get('/',       auth,                         ctrl.listDepartments)
router.get('/:id',    auth,                         ctrl.getDepartment)
router.post('/',      auth, role('admin','manager'), ctrl.createDepartment)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateDepartment)
router.delete('/:id', auth, role('admin'),           ctrl.deleteDepartment)

module.exports = router
