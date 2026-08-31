const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Public callback endpoint from Easebuzz (SURL / FURL)
router.post('/easebuzz/response', (req, res) => paymentsController.handleEasebuzzResponse(req, res));
router.get('/easebuzz/response', (req, res) => paymentsController.handleEasebuzzResponse(req, res));

// Webhook endpoint (Server-to-Server)
router.post('/easebuzz/webhook', (req, res) => paymentsController.handleEasebuzzWebhook(req, res));

// Status endpoint (Public or authenticated)
router.get('/status/:txnid', (req, res) => paymentsController.getPaymentStatus(req, res));

// Authenticated endpoints
router.post('/easebuzz/initiate', authMiddleware, (req, res) => paymentsController.initiateEasebuzz(req, res));

module.exports = router;
