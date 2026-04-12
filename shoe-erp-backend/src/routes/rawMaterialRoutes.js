'use strict';
const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')
const { body } = require('express-validator')
const ctrl = require('../controllers/rawMaterialController')

const createRules = [
  body('sku_code').trim().notEmpty().withMessage('sku_code is required'),
  body('description').trim().notEmpty().withMessage('description is required'),
  body('uom').trim().notEmpty().withMessage('uom is required'),
  body('rate').optional().isFloat({ min: 0 }).withMessage('rate must be positive'),
]

const updateRules = [
  body('description').optional().trim().notEmpty(),
  body('uom').optional().trim().notEmpty(),
  body('rate').optional().isFloat({ min: 0 }),
]

router.use(auth)
router.get('/', ctrl.listRawMaterials)
router.get('/:sku', ctrl.getRawMaterial)
router.post('/', roleMiddleware('admin','manager'), createRules, ctrl.createRawMaterial)
router.put('/:sku', roleMiddleware('admin','manager'), updateRules, ctrl.updateRawMaterial)
router.delete('/:sku', roleMiddleware('admin'), ctrl.deleteRawMaterial)

module.exports = router
