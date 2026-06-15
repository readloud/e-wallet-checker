const tokenService = require('./tokenService');
const oauthService = require('./oauthService');

class CheckService {
  
  /**
   * Get DANA user nickname (harus user yang sudah grant akses)
   * 
   * ⚠️ IMPORTANT: Ini hanya bisa mendapatkan nickname dari USER YANG LOGIN,
   * BUKAN dari nomor HP sembarang!
   */
  async getDANANickname(userId) {
    const startTime = Date.now();
    
    // Get user's DANA token
    const token = await tokenService.getUserToken(userId, 'dana');
    
    if (!token) {
      throw new Error('User has not connected DANA account. Please login to DANA first.');
    }
    
    // Call DANA API with user's access token
    const profile = await oauthService.getDANAUserProfile(token.access_token);
    
    // Record history
    await tokenService.recordCheckHistory(
      userId,
      'dana',
      profile.phoneNumber || null,
      { nickname: profile.nickname, fullName: profile.fullName, email: profile.email },
      'success',
      null, // IP akan diisi di controller
      null, // User agent diisi di controller
      Date.now() - startTime
    );
    
    return {
      nickname: profile.nickname,
      fullName: profile.fullName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      profilePicture: profile.profilePicture
    };
  }

  /**
   * Get ShopeePay user info (harus user yang sudah binding)
   */
  async getShopeePayNickname(userId) {
    const startTime = Date.now();
    
    const token = await tokenService.getUserToken(userId, 'shopeepay');
    
    if (!token) {
      throw new Error('User has not connected ShopeePay account. Please login to ShopeePay first.');
    }
    
    const userInfo = await oauthService.getShopeePayUserInfo(token.access_token);
    
    await tokenService.recordCheckHistory(
      userId,
      'shopeepay',
      userInfo.phoneNumber || null,
      { nickname: userInfo.nickname, email: userInfo.email },
      'success',
      null,
      null,
      Date.now() - startTime
    );
    
    return userInfo;
  }

  /**
   * Get ALL connected e-wallet data for user
   */
  async getAllConnectedWallets(userId) {
    const result = {
      dana: null,
      shopeepay: null
    };
    
    try {
      result.dana = await this.getDANANickname(userId);
    } catch (error) {
      result.dana = { error: error.message, connected: false };
    }
    
    try {
      result.shopeepay = await this.getShopeePayNickname(userId);
    } catch (error) {
      result.shopeepay = { error: error.message, connected: false };
    }
    
    return result;
  }
}

module.exports = new CheckService();