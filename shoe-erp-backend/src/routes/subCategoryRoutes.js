const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/subCategoryController')

router.get('/',       auth,                         ctrl.listSubCategories)
router.get('/:id',    auth,                         ctrl.getSubCategory)
router.post('/',      auth, role('admin','manager'), ctrl.createSubCategory)
router.post('/import', auth, role('admin','manager'), ctrl.importSubCategories)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateSubCategory)
router.delete('/:id', auth, role('admin'),           ctrl.deleteSubCategory)

module.exports = router
