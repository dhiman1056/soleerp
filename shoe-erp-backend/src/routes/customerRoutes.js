const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/customerController')

router.get('/',       auth,                         ctrl.listCustomers)
router.get('/:id',    auth,                         ctrl.getCustomer)
router.post('/',      auth, role('admin','manager'), ctrl.createCustomer)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateCustomer)
router.delete('/:id', auth, role('admin'),           ctrl.deleteCustomer)

module.exports = router
