const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

class OAuthService {
  constructor() {
    this.danaPrivateKey = null;
    this.danaPublicKey = null;
    this.initKeys();
  }

  async initKeys() {
    try {
      this.danaPrivateKey = await readFileAsync(process.env.DANA_PRIVATE_KEY_PATH, 'utf8');
      this.danaPublicKey = await readFileAsync(process.env.DANA_PUBLIC_KEY_PATH, 'utf8');
    } catch (error) {
      console.error('Failed to load DANA keys:', error.message);
    }
  }

  // ==================== DANA OAuth ====================

  /**
   * Generate DANA OAuth URL for user consent
   */
  async generateDANAAuthUrl(userId, scopes = ['QUERY_PROFILE', 'PUBLIC_ID']) {
    const state = crypto.randomBytes(32).toString('hex');
    const requestId = uuidv4();
    
    const params = {
      clientId: process.env.DANA_CLIENT_ID,
      scopes: scopes.join(','),
      redirectUrl: process.env.DANA_REDIRECT_URL,
      state: state,
      requestId: requestId,
      lang: 'id',
      terminalType: 'WEB'
    };
    
    const baseUrl = process.env.DANA_ENVIRONMENT === 'production'
      ? `${process.env.DANA_OAUTH_BASE}/m/portal/oauth`
      : 'https://sandbox.m.dana.id/m/portal/oauth';
    
    const url = `${baseUrl}?${new URLSearchParams(params).toString()}`;
    
    return { url, state, requestId };
  }

  /**
   * Exchange auth_code for access_token (DANA)
   */
  async exchangeDANAAuthCode(authCode, requestId) {
    const requestBody = {
      request: {
        head: {
          version: '2.0',
          function: 'dana.oauth.auth.applyToken',
          clientId: process.env.DANA_CLIENT_ID,
          clientSecret: process.env.DANA_CLIENT_SECRET,
          reqTime: new Date().toISOString(),
          reqMsgId: requestId || uuidv4(),
          reserve: '{}'
        },
        body: {
          grantType: 'AUTHORIZATION_CODE',
          authCode: authCode
        }
      }
    };
    
    const signature = this.generateDANASignature(JSON.stringify(requestBody));
    
    const apiBase = process.env.DANA_ENVIRONMENT === 'production'
      ? process.env.DANA_API_BASE
      : 'https://api-sandbox.saas.dana.id';
    
    const response = await axios.post(
      `${apiBase}/dana/oauth/auth/applyToken.htm`,
      { ...requestBody, signature },
      { headers: { 'Content-Type': 'application/json' } }
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
      publicUserId: data.response.body.userInfo?.publicUserId,
      tokenStatus: data.response.body.accessTokenInfo.tokenStatus
    };
  }

  /**
   * Refresh DANA access token
   */
  async refreshDANAToken(refreshToken) {
    const requestBody = {
      request: {
        head: {
          version: '2.0',
          function: 'dana.oauth.auth.applyToken',
          clientId: process.env.DANA_CLIENT_ID,
          clientSecret: process.env.DANA_CLIENT_SECRET,
          reqTime: new Date().toISOString(),
          reqMsgId: uuidv4(),
          reserve: '{}'
        },
        body: {
          grantType: 'REFRESH_TOKEN',
          refreshToken: refreshToken
        }
      }
    };
    
    const signature = this.generateDANASignature(JSON.stringify(requestBody));
    
    const apiBase = process.env.DANA_ENVIRONMENT === 'production'
      ? process.env.DANA_API_BASE
      : 'https://api-sandbox.saas.dana.id';
    
    const response = await axios.post(
      `${apiBase}/dana/oauth/auth/applyToken.htm`,
      { ...requestBody, signature },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    return {
      accessToken: response.data.response.body.accessTokenInfo.accessToken,
      expiresAt: response.data.response.body.accessTokenInfo.expiresIn,
      refreshToken: response.data.response.body.accessTokenInfo.refreshToken
    };
  }

  /**
   * Get DANA user profile
   */
  async getDANAUserProfile(accessToken) {
    const response = await axios.post(
      `${process.env.DANA_API_BASE}/dana/member/query/queryUserProfile`,
      {
        request: {
          head: {
            function: 'dana.member.query.queryUserProfile',
            version: '1.0'
          },
          body: {
            userResources: ['NICKNAME', 'FULLNAME', 'EMAIL', 'PROFILE_PICTURE', 'PHONE_NUMBER']
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const userInfo = response.data.response?.body?.userInfo;
    
    return {
      nickname: userInfo?.nickname,
      fullName: userInfo?.fullName,
      email: userInfo?.email,
      profilePicture: userInfo?.profilePicture,
      phoneNumber: userInfo?.phoneNumber,
      publicUserId: userInfo?.publicUserId
    };
  }

  // ==================== ShopeePay OAuth ====================

  /**
   * Generate ShopeePay OAuth URL
   */
  async generateShopeePayAuthUrl(userId, phoneNumber = null) {
    const state = crypto.randomBytes(32).toString('hex');
    
    const requestBody = {
      merchantId: process.env.SHOPEEPAY_MERCHANT_ID,
      redirectUrl: process.env.SHOPEEPAY_REDIRECT_URL,
      scopes: 'ACCOUNT_BINDING',
      state: state
    };
    
    if (phoneNumber) {
      requestBody.seamlessData = JSON.stringify({
        mobileNumber: phoneNumber.startsWith('62') ? phoneNumber : `62${phoneNumber}`
      });
    }
    
    const signature = this.generateShopeePaySignature(requestBody);
    
    const response = await axios.get(`${process.env.SHOPEEPAY_API_BASE}/v1.0/get-auth-code`, {
      params: requestBody,
      headers: {
        'X-Airpay-MerchantId': process.env.SHOPEEPAY_MERCHANT_ID,
        'X-Airpay-Req-H': signature
      }
    });
    
    const data = response.data;
    
    if (!data.authCode) {
      throw new Error(`ShopeePay Error: ${data.responseMessage || 'Failed to get auth code'}`);
    }
    
    const oauthUrl = `${process.env.SHOPEEPAY_OAUTH_BASE}/oauth?authCode=${data.authCode}`;
    
    return {
      url: oauthUrl,
      state: state,
      authCode: data.authCode,
      partnerReferenceNo: data.partnerReferenceNo
    };
  }

  /**
   * Exchange authCode for account token (ShopeePay)
   */
  async exchangeShopeePayAuthCode(authCode, partnerReferenceNo) {
    const requestBody = {
      merchantId: process.env.SHOPEEPAY_MERCHANT_ID,
      authCode: authCode,
      partnerReferenceNo: partnerReferenceNo
    };
    
    const signature = this.generateShopeePaySignature(requestBody);
    
    const response = await axios.post(
      `${process.env.SHOPEEPAY_API_BASE}/v1.0/registration-account-binding`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Airpay-MerchantId': process.env.SHOPEEPAY_MERCHANT_ID,
          'X-Airpay-Req-H': signature
        }
      }
    );
    
    const data = response.data;
    
    if (data.responseCode !== '2000700') {
      throw new Error(`ShopeePay Error: ${data.responseMessage}`);
    }
    
    return {
      accountToken: data.accountToken,
      referenceNo: data.referenceNo,
      userIdHash: data.additionalInfo?.userIdHash
    };
  }

  /**
   * Get ShopeePay user info using account token
   */
  async getShopeePayUserInfo(accountToken) {
    const response = await axios.get(`${process.env.SHOPEEPAY_API_BASE}/v1.0/user/profile`, {
      headers: {
        'Authorization': `Bearer ${accountToken}`,
        'X-Airpay-MerchantId': process.env.SHOPEEPAY_MERCHANT_ID
      }
    });
    
    return {
      nickname: response.data.nickname,
      phoneNumber: response.data.phoneNumber,
      email: response.data.email,
      userIdHash: response.data.userIdHash
    };
  }

  // ==================== Signature Generators ====================

  /**
   * Generate RSA SHA256 signature for DANA
   */
  generateDANASignature(data) {
    if (!this.danaPrivateKey) {
      throw new Error('DANA private key not loaded');
    }
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.danaPrivateKey, 'base64');
  }

  /**
   * Generate HMAC SHA256 signature for ShopeePay
   */
  generateShopeePaySignature(payload) {
    const bodyString = JSON.stringify(payload);
    const sha256Hash = crypto.createHash('sha256').update(bodyString).digest('hex');
    const base64Hash = Buffer.from(sha256Hash, 'hex').toString('base64');
    
    const hmac = crypto.createHmac('sha256', process.env.SHOPEEPAY_SECRET_KEY);
    hmac.update(base64Hash);
    return hmac.digest('base64');
  }

  /**
   * Verify DANA signature (for webhooks)
   */
  verifyDANASignature(data, signature) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    verify.end();
    return verify.sign(this.danaPublicKey, signature, 'base64');
  }
}

module.exports = new OAuthService();