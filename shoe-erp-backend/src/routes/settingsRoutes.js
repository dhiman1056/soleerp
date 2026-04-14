'use strict';

const express          = require('express');
const router           = express.Router();
const auth             = require('../middleware/authMiddleware');
const roleMiddleware   = require('../middleware/roleMiddleware');
const ctrl             = require('../controllers/settingsController');
const authCtrl         = require('../controllers/authController');

// ── System settings endpoints ─────────────────────────────────────────────────
// GET  /api/settings          → all settings grouped by setting_group
// GET  /api/settings/:group   → settings for one group (e.g. COMPANY)
// PUT  /api/settings          → bulk update settings

router.get('/',        auth, ctrl.getAllSettings);
router.put('/',        auth, roleMiddleware('admin'), ctrl.updateSettings);

// ── User management endpoints (mounted under /api/settings/users) ─────────────
// Frontend useUsers.js calls /settings/users/* — keep all user routes here.

router.get('/users',              auth, roleMiddleware('admin'),               authCtrl.getAllUsers);
router.post('/users',             auth, roleMiddleware('admin'),               authCtrl.createUser);
router.put('/users/:id',          auth, roleMiddleware('admin'),               authCtrl.updateUser);
router.put('/users/:id/reset-password', auth, roleMiddleware('admin'),        authCtrl.resetPassword);
router.delete('/users/:id',       auth, roleMiddleware('admin'),               authCtrl.deleteUser);

// ── Group-specific settings — must come AFTER /users to avoid route conflict ──
router.get('/:group',  auth, ctrl.getSettingsByGroup);

module.exports = router;
