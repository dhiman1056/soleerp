'use strict';

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const role    = require('../middleware/roleMiddleware');
const ctrl    = require('../controllers/purchaseOrderController');

// List & Create POs
router.get('/',    auth, ctrl.getAllPurchaseOrders);
router.post('/',   auth, role('admin', 'manager'), ctrl.createPurchaseOrder);

// GRN without PO (must be before /:id)
router.post('/grn/direct', auth, role('admin', 'manager'), ctrl.directGRN);

// GRN list
router.get('/grn',  auth, ctrl.getGRNList);

// PRN
router.post('/prn', auth, role('admin', 'manager'), ctrl.createPRN);
router.get('/prn',  auth, ctrl.getPRNList);

// Single PO CRUD
router.get('/:id',    auth, ctrl.getPurchaseOrderById);
router.put('/:id',    auth, role('admin', 'manager'), ctrl.updatePurchaseOrder);

// Status workflows
router.put('/:id/send',   auth, role('admin', 'manager'), ctrl.sendPurchaseOrder);
router.put('/:id/cancel', auth, role('admin'), ctrl.cancelPurchaseOrder);

// GRN against a PO
router.get('/:id/receipts', auth, ctrl.getPOReceipts);
router.post('/:id/receive', auth, ctrl.receivePurchaseOrder);

module.exports = router;
