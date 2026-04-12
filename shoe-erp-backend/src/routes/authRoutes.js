'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');

const router = Router();
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/login', loginRules, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', auth, ctrl.me);

module.exports = router;