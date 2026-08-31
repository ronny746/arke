const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const validate = require('../../middlewares/validate.middleware');
const { loginSchema } = require('./auth.validation');
const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/change-password', authMiddleware, AuthController.changePassword);

module.exports = router;
