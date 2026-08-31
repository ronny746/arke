const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const validate = require('../../middlewares/validate.middleware');
const { loginSchema } = require('./auth.validation');
const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/login', validate(loginSchema), AuthController.login);
router.post('/request-otp', AuthController.requestOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/email/request-otp', AuthController.requestEmailOtp);
router.post('/email/verify-otp', AuthController.verifyEmailOtp);
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/change-password', authMiddleware, AuthController.changePassword);
router.post('/developer-mode', authMiddleware, AuthController.developerMode);

module.exports = router;
