const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/divisionController')

router.get('/',       auth,                         ctrl.listDivisions)
router.get('/:id',    auth,                         ctrl.getDivision)
router.post('/',      auth, role('admin','manager'), ctrl.createDivision)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateDivision)
router.delete('/:id', auth, role('admin'),           ctrl.deleteDivision)

module.exports = router
