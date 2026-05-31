const router = require('express').Router()
const auth   = require('../middleware/authMiddleware')
const role   = require('../middleware/roleMiddleware')
const ctrl   = require('../controllers/teamController')

router.get('/',       auth,                         ctrl.listTeams)
router.get('/:id',    auth,                         ctrl.getTeam)
router.post('/import', auth, role('admin','manager'), ctrl.importTeams)
router.post('/',      auth, role('admin','manager'), ctrl.createTeam)
router.put('/:id',    auth, role('admin','manager'), ctrl.updateTeam)
router.delete('/:id', auth, role('admin'),           ctrl.deleteTeam)

module.exports = router
