const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const {
  getLedger,
  getLedgerBySku,
  getStock,
  getStockBySku,
  updateReorderLevel,
  getPurchases,
  createPurchase,
  deletePurchase,
  createAdjustment,
  getLowStock
} = require('../controllers/inventoryController')

router.use(auth)

router.get('/ledger', getLedger)
router.get('/ledger/:sku_code', getLedgerBySku)
router.get('/stock', getStock)
router.get('/stock/:sku_code', getStockBySku)
router.put('/stock/:sku_code/reorder-level', updateReorderLevel)
router.get('/purchases', getPurchases)
router.post('/purchases', roleMiddleware('admin','manager'), createPurchase)
router.delete('/purchases/:id', roleMiddleware('admin'), deletePurchase)
router.post('/adjustment', roleMiddleware('admin','manager'), createAdjustment)
router.get('/alerts/low-stock', getLowStock)

module.exports = router
