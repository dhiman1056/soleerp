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

router.get('/wip/excel', exportWIPExcel);
router.get('/wip/pdf', exportWIPPdf);
router.get('/bom/excel', exportBOMExcel);
router.get('/stock/excel', exportStockExcel);
router.get('/production/excel', exportProductionExcel);
router.get('/consumption/excel', exportConsumptionExcel);
router.get('/cost-sheet/excel', exportCostSheetExcel);
router.get('/wip-aging/excel', exportWIPAgingExcel);
router.get('/stock-valuation/excel', exportStockValuationExcel);

module.exports = router;
