'use strict';

const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const ctrl = require('../controllers/settingsController');

router.get('/', auth, ctrl.getAllSettings);
router.get('/:group', auth, ctrl.getSettingsByGroup);
router.put('/', auth, roleMiddleware('admin'), ctrl.updateSettings);

module.exports = router;
