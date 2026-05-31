'use strict';

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const role    = require('../middleware/roleMiddleware');
const ctrl    = require('../controllers/locationController');

router.get('/',       auth, ctrl.listLocations);
router.get('/:id',   auth, ctrl.getLocationById);
router.post('/',      auth, role('admin', 'manager'), ctrl.createLocation);
router.put('/:id',    auth, role('admin', 'manager'), ctrl.updateLocation);
router.post('/import', auth, role('admin', 'manager'), ctrl.importLocations);
router.delete('/:id', auth, role('admin'), ctrl.deleteLocation);

module.exports = router;
