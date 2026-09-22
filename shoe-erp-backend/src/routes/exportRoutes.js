'use strict';

const { Router } = require('express');

const {
  exportWIPExcel,
  exportWIPPdf,
  exportBOMExcel,
  exportStockExcel,
  exportProductionExcel,
  exportConsumptionExcel,
  exportCostSheetExcel,
  exportWIPAgingExcel,
  exportStockValuationExcel
} = require('../controllers/exportController');

const router = Router();
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/wip/excel', auth, exportWIPExcel);
router.get('/wip/pdf', auth, exportWIPPdf);
router.get('/bom/excel', auth, exportBOMExcel);
router.get('/stock/excel', auth, exportStockExcel);
router.get('/production/excel', auth, exportProductionExcel);
router.get('/consumption/excel', auth, exportConsumptionExcel);
router.get('/cost-sheet/excel', auth, exportCostSheetExcel);
router.get('/wip-aging/excel', auth, exportWIPAgingExcel);
router.get('/stock-valuation/excel', auth, exportStockValuationExcel);

module.exports = router;
