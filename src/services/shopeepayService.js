const axios = require('axios');
const crypto = require('crypto');
const signatureService = require('./signatureService');

class ShopeePayService {
  
  /**
   * Get Auth Code - Initiate OAuth flow
   * Endpoint: GET /v1.0/get-auth-code
   */
  async getAuthCode(userId, phoneNumber = null) {
    const state = crypto.randomBytes(32).toString('hex');
    const redirectUrl = `${process.env.APP_URL}/api/v1/shopeepay/callback`;
    
    const params = {
      merchantId: process.env.SHOPEEPAY_MERCHANT_ID,
      redirectUrl: redirectUrl,
      scopes: 'ACCOUNT_BINDING',
      state: state
    };
    
    if (phoneNumber) {
      params.seamlessData = JSON.stringify({
        mobileNumber: phoneNumber.startsWith('62') ? phoneNumber : `62${phoneNumber}`
      });
    }
    
    const signature = signatureService.generateShopeePaySignature(
      params,
      process.env.SHOPEEPAY_SECRET_KEY
    );
    
    const apiBase = process.env.SHOPEEPAY_ENVIRONMENT === 'production'
      ? process.env.SHOPEEPAY_API_BASE
      : 'https://api.uat.wallet.airpay.co.id';
    
    const response = await axios.get(
      `${apiBase}/v1.0/get-auth-code`,
      {
        params: params,
        headers: {
          'X-Airpay-MerchantId': process.env.SHOPEEPAY_MERCHANT_ID,
          'X-Airpay-Req-H': signature
        },
        timeout: 30000
      }
    );
    
    const data = response.data;
    
    if (!data.authCode) {
      throw new Error(`ShopeePay Error: ${data.responseMessage || 'Failed to get auth code'}`);
    }
    
    const oauthBase = process.env.SHOPEEPAY_ENVIRONMENT === 'production'
      ? process.env.SHOPEEPAY_OAUTH_BASE
      : 'https://pay-shopeepay-uat.airpay.co.id';
    
    return {
      oauthUrl: `${oauthBase}/oauth?authCode=${data.authCode}`,
      state: state,
      authCode: data.authCode,
      partnerReferenceNo: data.partnerReferenceNo
    };
  }
  
  /**
   * Exchange authCode untuk account token
   * Endpoint: POST /v1.0/registration-account-binding
   */
  async exchangeAccountToken(authCode, partnerReferenceNo) {
    const requestBody = {
      merchantId: process.env.SHOPEEPAY_MERCHANT_ID,
      authCode: authCode,
      partnerReferenceNo: partnerReferenceNo
    };
    
    const signature = signatureService.generateShopeePaySignature(
      requestBody,
      process.env.SHOPEEPAY_SECRET_KEY
    );
    
    const apiBase = process.env.SHOPEEPAY_ENVIRONMENT === 'production'
      ? process.env.SHOPEEPAY_API_BASE
      : 'https://api.uat.wallet.airpay.co.id';
    
    const response = await axios.post(
      `${apiBase}/v1.0/registration-account-binding`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Airpay-MerchantId': process.env.SHOPEEPAY_MERCHANT_ID,
          'X-Airpay-Req-H': signature
        },
        timeout: 30000
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
   * Get user profile dari ShopeePay (termasuk nickname)
   * Endpoint: GET /v1.0/user/profile
   */
  async getUserProfile(accountToken) {
    const apiBase = process.env.SHOPEEPAY_ENVIRONMENT === 'production'
      ? process.env.SHOPEEPAY_API_BASE
      : 'https://api.uat.wallet.airpay.co.id';
    
    const response = await axios.get(
      `${apiBase}/v1.0/user/profile`,
      {
        headers: {
          'Authorization': `Bearer ${accountToken}`,
          'X-Airpay-MerchantId': process.env.SHOPEEPAY_MERCHANT_ID
        },
        timeout: 30000
      }
    );
    
    const data = response.data;
    
    return {
      nickname: data.nickname,
      phoneNumber: data.phoneNumber,
      email: data.email,
      userIdHash: data.userIdHash,
      fullName: data.fullName
    };
  }
}

module.exports = new ShopeePayService();