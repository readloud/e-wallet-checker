const express = require('express');
const router = express.Router();
const shopeepayController = require('../../controllers/shopeepayController');
const authMiddleware = require('../../middleware/auth');

// Initiate ShopeePay OAuth (requires authentication)
router.post('/connect', authMiddleware.verifyToken, shopeepayController.initiateConnect);

// Callback (no auth, called by ShopeePay)
router.get('/callback', shopeepayController.handleCallback);

// Get ShopeePay profile (nickname)
router.get('/profile', authMiddleware.verifyToken, shopeepayController.getProfile);

// Disconnect
router.delete('/disconnect', authMiddleware.verifyToken, shopeepayController.disconnect);

module.exports = router;