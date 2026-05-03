'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/bomController');

const router = Router();
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const VALID_BOM_TYPES = ['SF', 'FG', 'FG_DIRECT'];

// ── Shared line-item validator ────────────────────────────────────────────
const lineRules = [
  body('lines')
    .isArray({ min: 1 }).withMessage('lines must be a non-empty array'),
  body('lines.*.input_sku')
    .trim().notEmpty().withMessage('Each line must have input_sku'),
  body('lines.*.consume_qty')
    .isFloat({ gt: 0 }).withMessage('Each line consume_qty must be > 0'),
  body('lines.*.uom')
    .trim().notEmpty().withMessage('Each line must have uom'),
  body('lines.*.rate_at_bom')
    .optional()
    .isFloat({ min: 0 }).withMessage('rate_at_bom must be >= 0'),
];

// ── Validation chains ─────────────────────────────────────────────────────

const createRules = [
  body('bom_code')
    .trim().notEmpty().withMessage('bom_code is required')
    .isLength({ max: 20 }),
  body('output_sku')
    .trim().notEmpty().withMessage('output_sku is required'),
  body('output_qty')
    .optional().isFloat({ gt: 0 }).withMessage('output_qty must be > 0'),
  body('output_uom')
    .trim().notEmpty().withMessage('output_uom is required'),
  body('bom_type')
    .trim().notEmpty().withMessage('bom_type is required')
    .toUpperCase()
    .isIn(VALID_BOM_TYPES).withMessage(`bom_type must be one of: ${VALID_BOM_TYPES.join(', ')}`),
  ...lineRules,
];

const updateRules = [
  body('output_qty')
    .optional().isFloat({ gt: 0 }),
  body('output_uom')
    .optional().trim().notEmpty(),
  body('is_active')
    .optional().isBoolean(),
  body('remarks')
    .optional(),
  // lines optional on update
  body('lines').optional().isArray({ min: 1 }),
  body('lines.*.input_sku').optional().trim().notEmpty(),
  body('lines.*.consume_qty').optional().isFloat({ gt: 0 }),
  body('lines.*.uom').optional().trim().notEmpty(),
  body('lines.*.rate_at_bom').optional().isFloat({ min: 0 }),
];

// ── Routes ────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/bom
 * @query  page, limit, is_active, bom_type
 */
router.get('/',    auth, ctrl.listBoms);

/**
 * @route  GET /api/bom/products-with-bom
 */
router.get('/products-with-bom', auth, ctrl.getProductsWithBom);

/**
 * @route  GET /api/bom/:id
 */
router.get('/:id', auth, ctrl.getBom);

/**
 * @route  POST /api/bom
 * @body   { bom_code, output_sku, output_qty?, output_uom, bom_type, remarks?, lines[] }
 */
router.post('/',   auth, roleMiddleware('admin', 'manager'), createRules, ctrl.createBom);

/**
 * @route  PUT /api/bom/:id
 * @body   { output_qty?, output_uom?, is_active?, remarks?, lines[]? }
 */
router.put('/:id', auth, roleMiddleware('admin', 'manager'), updateRules, ctrl.updateBom);

/**
 * @route  DELETE /api/bom/:id
 */
router.delete('/:id', auth, roleMiddleware('admin'), ctrl.deleteBom);

module.exports = router;
