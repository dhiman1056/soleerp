const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const controller = require('../controllers/inventoryController');

router.use(auth);

router.get('/', controller.getPurchases);
router.post('/', roleMiddleware(['admin', 'manager']), controller.createPurchase);
router.delete('/:id', roleMiddleware(['admin']), controller.deletePurchase);

module.exports = router;
