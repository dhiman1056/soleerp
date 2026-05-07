const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/categoryController')

router.get('/',       auth,                         ctrl.listCategories)
router.get('/:id',    auth,                         ctrl.getCategory)
router.post('/',      auth, role('admin','manager'), ctrl.createCategory)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateCategory)
router.delete('/:id', auth, role('admin'),           ctrl.deleteCategory)

module.exports = router
