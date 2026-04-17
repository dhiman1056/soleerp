'use strict';

const express        = require('express');
const router         = express.Router();
const auth           = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const ctrl           = require('../controllers/sizeController');

router.use(auth);

// GET  /api/sizes          — list all (pass ?is_active=true|false to filter)
router.get('/',    ctrl.getSizes);

// POST /api/sizes          — create a new size (admin only)
router.post('/',   roleMiddleware('admin'), ctrl.createSize);

// PUT  /api/sizes/:id      — update label / sort_order / is_active (admin only)
router.put('/:id', roleMiddleware('admin'), ctrl.updateSize);

// DELETE /api/sizes/:id   — soft-delete / deactivate (admin only)
router.delete('/:id', roleMiddleware('admin'), ctrl.deleteSize);

module.exports = router;
