'use strict';

const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const ctrl = require('../controllers/supplierController');

router.get('/', auth, ctrl.getAllSuppliers);
router.get('/:id', auth, ctrl.getSupplierById);
router.post('/', auth, roleMiddleware('admin', 'manager'), ctrl.createSupplier);
router.put('/:id', auth, roleMiddleware('admin', 'manager'), ctrl.updateSupplier);
router.delete('/:id', auth, roleMiddleware('admin'), ctrl.deleteSupplier);

// Ledger
router.get('/:id/ledger', auth, ctrl.getSupplierLedger);
router.post('/:id/payment', auth, roleMiddleware('admin', 'manager'), ctrl.recordPayment);

module.exports = router;
