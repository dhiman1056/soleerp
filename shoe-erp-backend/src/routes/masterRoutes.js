'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/masterController');
const auth       = require('../middleware/authMiddleware');
const role       = require('../middleware/roleMiddleware');

const router = Router();

// ── UOM (read-only — seeded) ──────────────────────────────────────────────────
router.get('/uom', auth, ctrl.listUOMs);

// ── Brands ────────────────────────────────────────────────────────────────────
router.get('/brands',  auth, ctrl.listBrands);
router.post('/brands', auth, role('admin', 'manager'),
  body('brand_name').trim().notEmpty().withMessage('brand_name required'),
  ctrl.createBrand
);
router.put('/brands/:id', auth, role('admin', 'manager'), ctrl.updateBrand);

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories',  auth, ctrl.listCategories);
router.post('/categories', auth, role('admin', 'manager'),
  body('category_name').trim().notEmpty().withMessage('category_name required'),
  ctrl.createCategory
);
router.put('/categories/:id', auth, role('admin', 'manager'), ctrl.updateCategory);

// ── Sub-Categories ────────────────────────────────────────────────────────────
router.get('/sub-categories',  auth, ctrl.listSubCategories);
router.post('/sub-categories', auth, role('admin', 'manager'),
  body('sub_category_name').trim().notEmpty().withMessage('sub_category_name required'),
  body('category_id').notEmpty().withMessage('category_id required'),
  ctrl.createSubCategory
);
router.put('/sub-categories/:id', auth, role('admin', 'manager'), ctrl.updateSubCategory);

// ── Designs ───────────────────────────────────────────────────────────────────
router.get('/designs',  auth, ctrl.listDesigns);
router.post('/designs', auth, role('admin', 'manager'),
  body('design_no').trim().notEmpty().withMessage('design_no required'),
  ctrl.createDesign
);
router.put('/designs/:id', auth, role('admin', 'manager'), ctrl.updateDesign);

// ── Colors ────────────────────────────────────────────────────────────────────
router.get('/colors',  auth, ctrl.listColors);
router.post('/colors', auth, role('admin', 'manager'),
  body('color_code').trim().notEmpty().withMessage('color_code required'),
  body('color_name').trim().notEmpty().withMessage('color_name required'),
  ctrl.createColor
);
router.put('/colors/:id', auth, role('admin', 'manager'), ctrl.updateColor);

// ── HSN ───────────────────────────────────────────────────────────────────────
router.get('/hsn',  auth, ctrl.listHSN);
router.post('/hsn', auth, role('admin', 'manager'),
  body('hsn_code').trim().notEmpty().withMessage('hsn_code required'),
  ctrl.createHSN
);
router.put('/hsn/:id', auth, role('admin', 'manager'), ctrl.updateHSN);

// ── Size Charts ───────────────────────────────────────────────────────────────
router.get('/size-charts', auth, ctrl.listSizeCharts);

module.exports = router;
