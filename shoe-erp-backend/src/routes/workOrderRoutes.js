'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/workOrderController');

const router = Router();
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const VALID_WO_TYPES = ['RM_TO_SF', 'SF_TO_FG', 'RM_TO_FG'];

// ── Validation chains ─────────────────────────────────────────────────────

const createRules = [
  // bom_id is optional when boms[] array is supplied (multi-BOM mode)
  body('bom_id')
    .optional()
    .isInt({ gt: 0 }).withMessage('bom_id must be a positive integer'),
  body('boms')
    .optional()
    .isArray().withMessage('boms must be an array'),
  body('planned_qty')
    .optional()
    .isFloat({ gt: 0 }).withMessage('planned_qty must be > 0'),
  body('wo_type')
    .trim().notEmpty().withMessage('wo_type is required')
    .toUpperCase()
    .isIn(VALID_WO_TYPES).withMessage(`wo_type must be one of: ${VALID_WO_TYPES.join(', ')}`),
  body('from_store').optional().trim().isLength({ max: 100 }),
  body('to_store').optional().trim().isLength({ max: 100 }),
  body('from_location_id').optional().isInt({ gt: 0 }),
  body('to_location_id').optional().isInt({ gt: 0 }),
  body('wo_date').optional().isDate().withMessage('wo_date must be a valid date (YYYY-MM-DD)'),
  body('notes').optional(),
];

const receiveRules = [
  body('received_qty')
    .notEmpty().withMessage('received_qty is required')
    .isFloat({ gt: 0 }).withMessage('received_qty must be > 0'),
  body('receipt_date')
    .optional().isDate().withMessage('receipt_date must be a valid date (YYYY-MM-DD)'),
  body('remarks')
    .optional(),
];

// ── Routes ────────────────────────────────────────────────────────────────

// ⚠ NOTE: /wip routes must be declared BEFORE /:id to avoid `wip` being
//   captured as an id parameter.

/**
 * @route  GET /api/work-orders/wip
 * @query  wo_type?
 */
router.get('/wip',         auth, ctrl.getWip);

/**
 * @route  GET /api/work-orders/wip/summary
 */
router.get('/wip/summary', auth, ctrl.getWipSummary);

/**
 * @route  GET /api/work-orders
 * @query  page, limit, status, wo_type
 */
router.get('/',            auth, ctrl.listWorkOrders);

/**
 * @route  GET /api/work-orders/:id
 */
router.get('/:id',         auth, ctrl.getWorkOrder);

/**
 * @route  POST /api/work-orders
 * @body   { bom_id, planned_qty, wo_type, from_store, to_store, wo_date?, notes? }
 */
router.post('/',           auth, roleMiddleware('admin', 'manager'), createRules, ctrl.createWorkOrder);

/**
 * @route  PUT /api/work-orders/:id/receive
 * @body   { received_qty, receipt_date?, remarks? }
 */
// "POST /api/work-orders/:id/receive: allow all roles" - our route is PUT but that's fine. Allow all.
router.put('/:id/receive', auth, receiveRules, ctrl.receiveWorkOrder);

/**
 * @route  DELETE /api/work-orders/:id
 * Only allowed if status is DRAFT or ISSUED
 */
router.delete('/:id',      auth, roleMiddleware('admin'), ctrl.deleteWorkOrder);

module.exports = router;
