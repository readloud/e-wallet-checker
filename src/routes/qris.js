const express = require('express');
const router = express.Router();
const qrisController = require('../controllers/qrisController');

// Public endpoints
router.post('/generate', qrisController.generateQRIS);
router.get('/status/:orderId', qrisController.checkStatus);
router.get('/image/:orderId', qrisController.getQRImage);
router.post('/webhook', qrisController.webhook);

module.exports = router;