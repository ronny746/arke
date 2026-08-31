const express = require('express');
const router = express.Router();
const DashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', DashboardController.getDashboardData);

module.exports = router;
