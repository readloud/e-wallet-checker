const danaService = require('../services/danaService');
const tokenService = require('../services/tokenService');

class DANAController {
  
  /**
   * Initiate DANA OAuth connection
   * GET /api/v1/dana/connect
   */
  async initiateConnect(req, res) {
    try {
      const userId = req.user.id;
      const scopes = req.query.scopes ? req.query.scopes.split(',') : ['QUERY_PROFILE', 'PUBLIC_ID'];
      
      const { url, state, requestId } = danaService.generateAuthUrl(userId, scopes);
      
      // Save state for CSRF validation
      await tokenService.saveOAuthState(state, userId, 'dana', req.query.redirect_url);
      
      // Store requestId in session
      req.session.danaRequestId = requestId;
      
      res.json({
        success: true,
        redirect_url: url,
        state: state,
        message: 'Redirect user to this URL to connect DANA account'
      });
      
    } catch (error) {
      console.error('DANA initiate error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate DANA connection',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Handle DANA OAuth callback
   * GET /api/v1/dana/callback
   */
  async handleCallback(req, res) {
    const { auth_code, state, error, error_description } = req.query;
    
    try {
      if (error) {
        throw new Error(`DANA Error: ${error_description || error}`);
      }
      
      if (!auth_code) {
        throw new Error('Missing auth_code parameter');
      }
      
      // Validate state
      const oauthState = await tokenService.validateOAuthState(state, 'dana');
      if (!oauthState) {
        throw new Error('Invalid or expired state parameter');
      }
      
      // Exchange auth_code for tokens
      const tokenData = await danaService.exchangeAuthCode(auth_code, req.session.danaRequestId);
      
      // Save tokens to database
      await tokenService.saveDANAToken(oauthState.user_id, tokenData);
      
      // Get user profile
      const profile = await danaService.getUserProfile(tokenData.accessToken);
      
      // Record check history
      await tokenService.recordCheckHistory(
        oauthState.user_id,
        'dana',
        profile,
        req.ip,
        req.headers['user-agent'],
        0
      );
      
      // Redirect or return JSON
      if (oauthState.redirect_url) {
        const redirectUrl = new URL(oauthState.redirect_url);
        redirectUrl.searchParams.set('success', 'true');
        redirectUrl.searchParams.set('provider', 'dana');
        redirectUrl.searchParams.set('nickname', profile.nickname);
        return res.redirect(redirectUrl.toString());
      }
      
      res.json({
        success: true,
        message: 'DANA account connected successfully',
        data: {
          nickname: profile.nickname,
          fullName: profile.fullName,
          email: profile.email,
          publicUserId: tokenData.publicUserId
        }
      });
      
    } catch (error) {
      console.error('DANA callback error:', error);
      
      // Check if we have redirect URL to send error
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
   * Get DANA user profile (nickname, etc)
   * GET /api/v1/dana/profile
   */
  async getProfile(req, res) {
    const startTime = Date.now();
    
    try {
      const userId = req.user.id;
      
      // Get user token
      const token = await tokenService.getUserToken(userId, 'dana');
      
      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'DANA account not connected. Please connect your DANA account first.'
        });
      }
      
      // Check if token expired
      if (token.expires_at && new Date(token.expires_at) < new Date()) {
        // Token expired, need to refresh
        return res.status(401).json({
          success: false,
          message: 'DANA token expired. Please reconnect your account.',
          requires_reconnect: true
        });
      }
      
      // Get user profile
      const profile = await danaService.getUserProfile(token.access_token);
      
      const responseTime = Date.now() - startTime;
      
      // Record history
      await tokenService.recordCheckHistory(
        userId,
        'dana',
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
      console.error('Get DANA profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Disconnect DANA account
   * DELETE /api/v1/dana/disconnect
   */
  async disconnect(req, res) {
    try {
      const userId = req.user.id;
      
      await tokenService.revokeToken(userId, 'dana');
      
      res.json({
        success: true,
        message: 'DANA account disconnected successfully'
      });
      
    } catch (error) {
      console.error('Disconnect DANA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect DANA account'
      });
    }
  }
}

module.exports = new DANAController();