const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const controller = require('../controllers/reportController');

router.use(auth);

router.get('/production', controller.getProductionSummary);
router.get('/material-consumption', controller.getMaterialConsumption);
router.get('/cost-sheet/:fgSku', controller.getCostSheet);
router.get('/wip-aging', controller.getWipAging);
router.get('/stock-valuation', controller.getStockValuation);

module.exports = router;
