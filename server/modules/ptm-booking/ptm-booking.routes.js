const express = require('express');
const router = express.Router();
const PtmBookingController = require('./ptm-booking.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createSlotSchema, bookSlotSchema } = require('./ptm-booking.validation');
const { ROLES } = require('../../config/constants');

router.use(authMiddleware);

router.post(
  '/slots',
  rbacMiddleware.requireRole([ROLES.TEACHER]),
  validate(createSlotSchema),
  PtmBookingController.createSlot
);

router.get(
  '/slots',
  PtmBookingController.getAvailableSlots
);

router.post(
  '/book',
  rbacMiddleware.requireRole([ROLES.PARENT]),
  validate(bookSlotSchema),
  PtmBookingController.bookSlot
);

router.get(
  '/bookings',
  PtmBookingController.getBookings
);

module.exports = router;
