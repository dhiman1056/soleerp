'use strict';

const express        = require('express');
const router         = express.Router();
const auth           = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const ctrl           = require('../controllers/sizeController');

router.use(auth);

// GET  /api/sizes          — list all (pass ?is_active=true|false to filter)
router.get('/',     ctrl.getSizes);

// GET  /api/sizes/:id      — single size record
router.get('/:id',  ctrl.getSize);

// POST /api/sizes          — create a new size (admin only)
router.post('/',       roleMiddleware('admin', 'manager'), ctrl.createSize);

// POST /api/sizes/import   — CSV import (admin/manager)
router.post('/import', roleMiddleware('admin', 'manager'), ctrl.importSizes);

// PUT  /api/sizes/:id      — update label / sort_order / is_active (admin only)
router.put('/:id',     roleMiddleware('admin', 'manager'), ctrl.updateSize);

// DELETE /api/sizes/:id   — soft-delete / deactivate (admin only)
router.delete('/:id', roleMiddleware('admin'), ctrl.deleteSize);

module.exports = router;
