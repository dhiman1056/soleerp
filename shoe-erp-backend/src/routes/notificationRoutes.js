'use strict';

const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const ctrl = require('../controllers/notificationController');

router.get('/', auth, ctrl.getNotifications);
router.get('/count', auth, ctrl.getNotificationCount);
router.put('/read-all', auth, ctrl.markAllRead);
router.put('/:id/read', auth, ctrl.markAsRead);
router.delete('/:id', auth, roleMiddleware('admin'), ctrl.deleteNotification);

module.exports = router;
