const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/employeeController')

router.get('/',       auth, ctrl.listEmployees)
router.get('/:id',   auth, ctrl.getEmployee)
router.post('/',      auth, role('admin', 'manager'), ctrl.createEmployee)
router.put('/:id',    auth, role('admin', 'manager'), ctrl.updateEmployee)
router.delete('/:id', auth, role('admin'), ctrl.deleteEmployee)

module.exports = router
