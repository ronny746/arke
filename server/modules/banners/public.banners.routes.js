const express = require('express');
const router = express.Router();
const BannerController = require('./banners.controller');

// Public route to fetch all active banners
router.get('/', BannerController.getActiveBanners);

module.exports = router;
