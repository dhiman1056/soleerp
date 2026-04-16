const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')

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
  getLowStock,
  addOpeningStock,
} = require('../controllers/inventoryController')

router.use(auth)

// Stock summary
router.get('/stock',                   getStock)
router.get('/stock/:sku_code',         getStockBySku)
router.put('/stock/:sku_code/reorder-level', roleMiddleware('admin','manager'), updateReorderLevel)

// Opening Stock
router.post('/opening-stock', roleMiddleware('admin','manager'), addOpeningStock)

// Ledger
router.get('/ledger',                  getLedger)
router.get('/ledger/:sku_code',        getLedgerBySku)

// Legacy simple purchase
router.get('/purchases',               getPurchases)
router.post('/purchases',              roleMiddleware('admin','manager'), createPurchase)
router.delete('/purchases/:id',        roleMiddleware('admin'), deletePurchase)

// Adjustment
router.post('/adjustment',             roleMiddleware('admin','manager'), createAdjustment)

// Alerts
router.get('/alerts/low-stock',        getLowStock)

module.exports = router
