'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/rawMaterialController');

const router = Router();
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ── Validation chains ─────────────────────────────────────────────────────

const createRules = [
  body('sku_code')
    .trim().notEmpty().withMessage('sku_code is required')
    .isLength({ max: 50 }).withMessage('sku_code max 50 chars'),
  body('description')
    .trim().notEmpty().withMessage('description is required')
    .isLength({ max: 255 }).withMessage('description max 255 chars'),
  body('uom')
    .trim().notEmpty().withMessage('uom is required')
    .isLength({ max: 20 }).withMessage('uom max 20 chars'),
  body('rate')
    .optional()
    .isFloat({ min: 0 }).withMessage('rate must be a non-negative number'),
];

const updateRules = [
  body('description')
    .optional()
    .trim().notEmpty().withMessage('description cannot be blank')
    .isLength({ max: 255 }),
  body('uom')
    .optional()
    .trim().notEmpty().withMessage('uom cannot be blank')
    .isLength({ max: 20 }),
  body('rate')
    .optional()
    .isFloat({ min: 0 }).withMessage('rate must be a non-negative number'),
];

// ── Routes ────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/raw-materials
 * @query  page, limit, search, is_active
 */
router.get('/', auth, ctrl.listRawMaterials);

/**
 * @route  GET /api/raw-materials/:sku
 */
router.get('/:sku', auth, ctrl.getRawMaterial);

/**
 * @route  POST /api/raw-materials
 * @body   { sku_code, description, uom, rate? }
 */
router.post('/', auth, roleMiddleware('admin', 'manager'), createRules, ctrl.createRawMaterial);

/**
 * @route  PUT /api/raw-materials/:sku
 * @body   { description?, uom?, rate? }
 */
router.put('/:sku', auth, roleMiddleware('admin', 'manager'), updateRules, ctrl.updateRawMaterial);

/**
 * @route  DELETE /api/raw-materials/:sku
 */
router.delete('/:sku', auth, roleMiddleware('admin'), ctrl.deleteRawMaterial);

module.exports = router;
