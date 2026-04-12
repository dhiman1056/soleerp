'use strict';

const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const ctrl = require('../controllers/authController');

router.get('/', auth, roleMiddleware('admin'), ctrl.getAllUsers);
router.post('/', auth, roleMiddleware('admin'), ctrl.createUser);
router.put('/:id', auth, roleMiddleware('admin'), ctrl.updateUser);
router.put('/:id/reset-password', auth, roleMiddleware('admin'), ctrl.resetPassword);
router.delete('/:id', auth, roleMiddleware('admin'), ctrl.deleteUser);

module.exports = router;
