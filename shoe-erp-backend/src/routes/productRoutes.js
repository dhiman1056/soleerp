'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/productController');

const router = Router();
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const VALID_TYPES = ['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED'];

// ── Validation chains ─────────────────────────────────────────────────────

const createRules = [
  body('sku_code')
    .trim().notEmpty().withMessage('sku_code is required')
    .isLength({ max: 50 }),
  body('description')
    .trim().notEmpty().withMessage('description is required')
    .isLength({ max: 255 }),
  body('product_type')
    .trim().notEmpty().withMessage('product_type is required')
    .toUpperCase()
    .isIn(VALID_TYPES).withMessage(`product_type must be one of: ${VALID_TYPES.join(', ')}`),
  body('uom')
    .trim().notEmpty().withMessage('uom is required')
    .isLength({ max: 20 }),
];

const updateRules = [
  body('description')
    .optional().trim().notEmpty().isLength({ max: 255 }),
  body('product_type')
    .optional().trim().toUpperCase()
    .isIn(VALID_TYPES).withMessage(`product_type must be one of: ${VALID_TYPES.join(', ')}`),
  body('uom')
    .optional().trim().notEmpty().isLength({ max: 20 }),
];

// ── Routes ────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/products
 * @query  page, limit, search, product_type
 */
router.get('/',      auth, ctrl.listProducts);

/**
 * @route  GET /api/products/:sku
 */
router.get('/:sku',  auth, ctrl.getProduct);

/**
 * @route  POST /api/products
 * @body   { sku_code, description, product_type, uom }
 */
router.post('/',     auth, roleMiddleware('admin', 'manager'), createRules, ctrl.createProduct);

/**
 * @route  PUT /api/products/:sku
 * @body   { description?, product_type?, uom? }
 */
router.put('/:sku',  auth, roleMiddleware('admin', 'manager'), updateRules, ctrl.updateProduct);

/**
 * @route  DELETE /api/products/:sku
 */
router.delete('/:sku', auth, roleMiddleware('admin'), ctrl.deleteProduct);

module.exports = router;
