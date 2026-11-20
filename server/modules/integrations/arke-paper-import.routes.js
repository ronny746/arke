const express = require('express');
const controller = require('./arke-paper-import.controller');

const router = express.Router();
router.post('/', controller.importPaper);

module.exports = router;
