'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/productController');
const auth       = require('../middleware/authMiddleware');
const role       = require('../middleware/roleMiddleware');

const router = Router();

const VALID_TYPES = ['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED'];

const updateRules = [
  body('description').optional().trim().notEmpty().isLength({ max: 255 }),
  body('product_type').optional().trim().toUpperCase()
    .isIn(VALID_TYPES).withMessage(`product_type must be one of: ${VALID_TYPES.join(', ')}`),
  body('uom').optional().trim().notEmpty().isLength({ max: 20 }),
];

// ── GET /api/products/next-sku?product_type=RAW_MATERIAL ── must be before /:sku
router.get('/next-sku', auth, ctrl.getNextSku);

// ── GET    /api/products
router.get('/',      auth, ctrl.listProducts);

// ── GET    /api/products/:sku
router.get('/:sku',  auth, ctrl.getProduct);

// ── POST   /api/products   (no mandatory sku_code validation — auto-generated)
router.post('/', auth, role('admin', 'manager'), [
  body('description').trim().notEmpty().withMessage('description is required').isLength({ max: 255 }),
  body('product_type').trim().notEmpty().withMessage('product_type is required').toUpperCase()
    .isIn(VALID_TYPES).withMessage(`product_type must be one of: ${VALID_TYPES.join(', ')}`),
  body('uom').optional().trim().isLength({ max: 20 }),
  body('sku_code').optional().trim().isLength({ max: 50 }),
], ctrl.createProduct);

// ── PUT    /api/products/:sku
router.put('/:sku',  auth, role('admin', 'manager'), updateRules, ctrl.updateProduct);

// ── DELETE /api/products/:sku
router.delete('/:sku', auth, role('admin'), ctrl.deleteProduct);

module.exports = router;
