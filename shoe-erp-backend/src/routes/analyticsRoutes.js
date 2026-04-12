'use strict';

const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const ctrl = require('../controllers/analyticsController');

router.use(auth);

router.get('/overview', ctrl.getOverview);
router.get('/production-trend', ctrl.getProductionTrend);
router.get('/material-consumption-trend', ctrl.getMaterialConsumptionTrend);
router.get('/product-mix', ctrl.getProductMix);
router.get('/wip-by-age', ctrl.getWipByAge);
router.get('/supplier-performance', ctrl.getSupplierPerformance);
router.get('/stock-movement', ctrl.getStockMovement);
router.get('/cost-trend', ctrl.getCostTrend);

module.exports = router;
