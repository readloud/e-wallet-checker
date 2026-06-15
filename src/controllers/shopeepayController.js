const shopeepayService = require('../services/shopeepayService');
const tokenService = require('../services/tokenService');

class ShopeePayController {
  
  /**
   * Initiate ShopeePay OAuth connection
   * POST /api/v1/shopeepay/connect
   */
  async initiateConnect(req, res) {
    try {
      const userId = req.user.id;
      const { phone_number } = req.body;
      
      const { oauthUrl, state, authCode, partnerReferenceNo } = await shopeepayService.getAuthCode(userId, phone_number);
      
      // Save state for CSRF validation
      await tokenService.saveOAuthState(state, userId, 'shopeepay', req.body.redirect_url);
      
      // Store temp data in session
      req.session.shopeepayTemp = {
        authCode,
        partnerReferenceNo
      };
      
      res.json({
        success: true,
        redirect_url: oauthUrl,
        state: state,
        message: 'Redirect user to this URL to connect ShopeePay account'
      });
      
    } catch (error) {
      console.error('ShopeePay initiate error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Handle ShopeePay OAuth callback
   * GET /api/v1/shopeepay/callback
   */
  async handleCallback(req, res) {
    const { authCode, partnerReferenceNo, state, error, error_description } = req.query;
    
    try {
      if (error) {
        throw new Error(`ShopeePay Error: ${error_description || error}`);
      }
      
      // Validate state
      const oauthState = await tokenService.validateOAuthState(state, 'shopeepay');
      if (!oauthState) {
        throw new Error('Invalid or expired state parameter');
      }
      
      // Get authCode from URL or session
      const finalAuthCode = authCode || req.session.shopeepayTemp?.authCode;
      const finalPartnerRef = partnerReferenceNo || req.session.shopeepayTemp?.partnerReferenceNo;
      
      if (!finalAuthCode) {
        throw new Error('Missing auth code');
      }
      
      // Exchange for account token
      const tokenData = await shopeepayService.exchangeAccountToken(finalAuthCode, finalPartnerRef);
      
      // Save token
      await tokenService.saveShopeePayToken(oauthState.user_id, tokenData);
      
      // Get user profile
      const profile = await shopeepayService.getUserProfile(tokenData.accountToken);
      
      // Record check history
      await tokenService.recordCheckHistory(
        oauthState.user_id,
        'shopeepay',
        profile,
        req.ip,
        req.headers['user-agent'],
        0
      );
      
      // Clean up session
      delete req.session.shopeepayTemp;
      
      // Redirect or return JSON
      if (oauthState.redirect_url) {
        const redirectUrl = new URL(oauthState.redirect_url);
        redirectUrl.searchParams.set('success', 'true');
        redirectUrl.searchParams.set('provider', 'shopeepay');
        redirectUrl.searchParams.set('nickname', profile.nickname);
        return res.redirect(redirectUrl.toString());
      }
      
      res.json({
        success: true,
        message: 'ShopeePay account connected successfully',
        data: {
          nickname: profile.nickname,
          phoneNumber: profile.phoneNumber,
          email: profile.email,
          userIdHash: profile.userIdHash
        }
      });
      
    } catch (error) {
      console.error('ShopeePay callback error:', error);
      
      const redirectUrl = req.query.redirect_url;
      if (redirectUrl) {
        const errorUrl = new URL(redirectUrl);
        errorUrl.searchParams.set('success', 'false');
        errorUrl.searchParams.set('error', error.message);
        return res.redirect(errorUrl.toString());
      }
      
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get ShopeePay user profile (nickname, etc)
   * GET /api/v1/shopeepay/profile
   */
  async getProfile(req, res) {
    const startTime = Date.now();
    
    try {
      const userId = req.user.id;
      
      // Get user token
      const token = await tokenService.getUserToken(userId, 'shopeepay');
      
      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'ShopeePay account not connected. Please connect your ShopeePay account first.'
        });
      }
      
      // Get user profile
      const profile = await shopeepayService.getUserProfile(token.access_token);
      
      const responseTime = Date.now() - startTime;
      
      // Record history
      await tokenService.recordCheckHistory(
        userId,
        'shopeepay',
        profile,
        req.ip,
        req.headers['user-agent'],
        responseTime
      );
      
      res.json({
        success: true,
        data: profile,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Get ShopeePay profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Disconnect ShopeePay account
   * DELETE /api/v1/shopeepay/disconnect
   */
  async disconnect(req, res) {
    try {
      const userId = req.user.id;
      
      await tokenService.revokeToken(userId, 'shopeepay');
      
      res.json({
        success: true,
        message: 'ShopeePay account disconnected successfully'
      });
      
    } catch (error) {
      console.error('Disconnect ShopeePay error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect ShopeePay account'
      });
    }
  }
}

module.exports = new ShopeePayController();