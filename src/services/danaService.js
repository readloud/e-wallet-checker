const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const signatureService = require('./signatureService');

class DANAService {
  
  /**
   * Generate OAuth URL untuk redirect user ke DANA
   * User akan login dan memberikan consent
   */
  generateAuthUrl(userId, scopes = ['QUERY_PROFILE', 'PUBLIC_ID']) {
    const state = crypto.randomBytes(32).toString('hex');
    const requestId = uuidv4();
    
    const params = new URLSearchParams({
      clientId: process.env.DANA_CLIENT_ID,
      scopes: scopes.join(','),
      redirectUrl: process.env.DANA_REDIRECT_URL,
      state: state,
      requestId: requestId,
      lang: 'id',
      terminalType: 'WEB'
    });
    
    const baseUrl = process.env.DANA_ENVIRONMENT === 'production'
      ? `${process.env.DANA_OAUTH_BASE}/m/portal/oauth`
      : 'https://sandbox.m.dana.id/m/portal/oauth';
    
    return {
      url: `${baseUrl}?${params.toString()}`,
      state: state,
      requestId: requestId
    };
  }
  
  /**
   * Exchange auth_code menjadi access token
   * Endpoint: /dana/oauth/auth/applyToken
   */
  async exchangeAuthCode(authCode, requestId) {
    const timestamp = new Date().toISOString();
    const requestBody = {
      request: {
        head: {
          version: '2.0',
          function: 'dana.oauth.auth.applyToken',
          clientId: process.env.DANA_CLIENT_ID,
          clientSecret: process.env.DANA_CLIENT_SECRET,
          reqTime: timestamp,
          reqMsgId: requestId || uuidv4(),
          reserve: '{}'
        },
        body: {
          grantType: 'AUTHORIZATION_CODE',
          authCode: authCode
        }
      }
    };
    
    const pathUrl = '/dana/oauth/auth/applyToken';
    const signature = signatureService.generateDANARequestSignature(
      'POST', pathUrl, requestBody, timestamp
    );
    
    const apiBase = process.env.DANA_ENVIRONMENT === 'production'
      ? process.env.DANA_API_BASE
      : 'https://api-sandbox.saas.dana.id';
    
    const response = await axios.post(
      `${apiBase}${pathUrl}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-TIMESTAMP': timestamp,
          'X-SIGNATURE': signature,
          'X-CLIENT-KEY': process.env.DANA_CLIENT_ID
        },
        timeout: 30000
      }
    );
    
    const data = response.data;
    
    if (data.response?.body?.resultInfo?.resultCode !== 'SUCCESS') {
      throw new Error(`DANA OAuth Error: ${data.response?.body?.resultInfo?.resultMsg || 'Unknown error'}`);
    }
    
    return {
      accessToken: data.response.body.accessTokenInfo.accessToken,
      expiresAt: data.response.body.accessTokenInfo.expiresIn,
      refreshToken: data.response.body.accessTokenInfo.refreshToken,
      refreshExpiresAt: data.response.body.accessTokenInfo.reExpiresIn,
      publicUserId: data.response.body.userInfo?.publicUserId
    };
  }
  
  /**
   * Refresh access token menggunakan refresh token
   */
  async refreshAccessToken(refreshToken) {
    const timestamp = new Date().toISOString();
    const requestBody = {
      request: {
        head: {
          version: '2.0',
          function: 'dana.oauth.auth.applyToken',
          clientId: process.env.DANA_CLIENT_ID,
          clientSecret: process.env.DANA_CLIENT_SECRET,
          reqTime: timestamp,
          reqMsgId: uuidv4(),
          reserve: '{}'
        },
        body: {
          grantType: 'REFRESH_TOKEN',
          refreshToken: refreshToken
        }
      }
    };
    
    const pathUrl = '/dana/oauth/auth/applyToken';
    const signature = signatureService.generateDANARequestSignature(
      'POST', pathUrl, requestBody, timestamp
    );
    
    const apiBase = process.env.DANA_ENVIRONMENT === 'production'
      ? process.env.DANA_API_BASE
      : 'https://api-sandbox.saas.dana.id';
    
    const response = await axios.post(
      `${apiBase}${pathUrl}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-TIMESTAMP': timestamp,
          'X-SIGNATURE': signature,
          'X-CLIENT-KEY': process.env.DANA_CLIENT_ID
        }
      }
    );
    
    return {
      accessToken: response.data.response.body.accessTokenInfo.accessToken,
      expiresAt: response.data.response.body.accessTokenInfo.expiresIn,
      refreshToken: response.data.response.body.accessTokenInfo.refreshToken
    };
  }
  
  /**
   * Get user profile dari DANA (termasuk nickname)
   * Endpoint: /dana/member/query/queryUserProfile
   */
  async getUserProfile(accessToken) {
    const timestamp = new Date().toISOString();
    const requestBody = {
      request: {
        head: {
          function: 'dana.member.query.queryUserProfile',
          version: '1.0'
        },
        body: {
          userResources: ['NICKNAME', 'FULLNAME', 'EMAIL', 'PROFILE_PICTURE', 'PHONE_NUMBER']
        }
      }
    };
    
    const pathUrl = '/dana/member/query/queryUserProfile';
    const signature = signatureService.generateDANARequestSignature(
      'POST', pathUrl, requestBody, timestamp
    );
    
    const apiBase = process.env.DANA_ENVIRONMENT === 'production'
      ? process.env.DANA_API_BASE
      : 'https://api-sandbox.saas.dana.id';
    
    const response = await axios.post(
      `${apiBase}${pathUrl}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-TIMESTAMP': timestamp,
          'X-SIGNATURE': signature,
          'X-CLIENT-KEY': process.env.DANA_CLIENT_ID
        }
      }
    );
    
    const userInfo = response.data.response?.body?.userInfo;
    
    if (!userInfo) {
      throw new Error('Failed to get user profile from DANA');
    }
    
    return {
      nickname: userInfo.nickname,
      fullName: userInfo.fullName,
      email: userInfo.email,
      phoneNumber: userInfo.phoneNumber,
      profilePicture: userInfo.profilePicture,
      publicUserId: userInfo.publicUserId
    };
  }
}

module.exports = new DANAService();