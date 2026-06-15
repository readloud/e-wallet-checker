const express = require('express');
const router = express.Router();
const danaController = require('../../controllers/danaController');
const authMiddleware = require('../../middleware/auth');

// Initiate DANA OAuth (requires authentication)
router.get('/connect', authMiddleware.verifyToken, danaController.initiateConnect);

// Callback (no auth, called by DANA)
router.get('/callback', danaController.handleCallback);

// Get DANA profile (nickname)
router.get('/profile', authMiddleware.verifyToken, danaController.getProfile);

// Disconnect
router.delete('/disconnect', authMiddleware.verifyToken, danaController.disconnect);

module.exports = router;