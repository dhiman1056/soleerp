'use strict';
const express = require('express');
const router = express.Router()
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

;

const ctrl = require('../controllers/searchController');

router.get('/', auth, ctrl.globalSearch);
module.exports = router;
