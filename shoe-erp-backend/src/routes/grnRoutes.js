'use strict';

const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const ctrl = require('../controllers/purchaseOrderController');

router.get('/:grn_no', auth, ctrl.getGRNDetail);

module.exports = router;
