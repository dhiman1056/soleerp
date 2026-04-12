'use strict';

const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const ctrl = require('../controllers/purchaseOrderController');

router.get('/', auth, ctrl.getAllPurchaseOrders);
router.post('/', auth, roleMiddleware('admin', 'manager'), ctrl.createPurchaseOrder);
router.get('/:id', auth, ctrl.getPurchaseOrderById);
router.put('/:id', auth, roleMiddleware('admin', 'manager'), ctrl.updatePurchaseOrder);

// Status workflows
router.put('/:id/send', auth, roleMiddleware('admin', 'manager'), ctrl.sendPurchaseOrder);
router.put('/:id/cancel', auth, roleMiddleware('admin'), ctrl.cancelPurchaseOrder);

// Receipts / GRNs
router.get('/:id/receipts', auth, ctrl.getPOReceipts);
router.post('/:id/receive', auth, ctrl.receivePurchaseOrder); // ALL valid roles can receive

module.exports = router;
