const express = require('express');
const router = express.Router();
const BannerController = require('./banners.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createBannerSchema, updateBannerSchema } = require('./banners.validation');
const { ROLES } = require('../../config/constants');

// Admin protected routes
router.get(
  '/',
  authMiddleware,
  BannerController.getBanners
);

router.post(
  '/',
  authMiddleware,
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(createBannerSchema),
  BannerController.createBanner
);

router.put(
  '/:id',
  authMiddleware,
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  validate(updateBannerSchema),
  BannerController.updateBanner
);

router.delete(
  '/:id',
  authMiddleware,
  rbacMiddleware.requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_OPERATIONS, ROLES.ADMIN_ACADOPS]),
  BannerController.deleteBanner
);

module.exports = router;
