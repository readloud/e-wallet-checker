const crypto = require('crypto');
const { Pool } = require('pg');

class TokenService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: parseInt(process.env.DB_POOL_MAX) || 20
    });
    
    this.encryptionKey = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'utf8');
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt sensitive data (accessToken, refreshToken)
   */
  encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    const result = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
    
    return result;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const iv = buffer.subarray(0, 16);
    const authTag = buffer.subarray(16, 32);
    const encryptedText = buffer.subarray(32);
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Save DANA token untuk user
   */
  async saveDANAToken(userId, tokenData) {
    const encryptedAccessToken = this.encrypt(tokenData.accessToken);
    const encryptedRefreshToken = this.encrypt(tokenData.refreshToken);
    
    const query = `
      INSERT INTO user_tokens (user_id, provider, access_token_encrypted, refresh_token_encrypted, 
                               expires_at, refresh_expires_at, provider_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, provider) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        expires_at = EXCLUDED.expires_at,
        refresh_expires_at = EXCLUDED.refresh_expires_at,
        provider_user_id = EXCLUDED.provider_user_id,
        updated_at = NOW(),
        is_active = true
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      userId,
      'dana',
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenData.expiresAt,
      tokenData.refreshExpiresAt,
      tokenData.publicUserId
    ]);
    
    return result.rows[0];
  }

  /**
   * Save ShopeePay token untuk user
   */
  async saveShopeePayToken(userId, tokenData) {
    const encryptedToken = this.encrypt(tokenData.accountToken);
    
    const query = `
      INSERT INTO user_tokens (user_id, provider, access_token_encrypted, 
                               provider_user_id, provider_data)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, provider) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        provider_user_id = EXCLUDED.provider_user_id,
        provider_data = EXCLUDED.provider_data,
        updated_at = NOW(),
        is_active = true
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      userId,
      'shopeepay',
      encryptedToken,
      tokenData.userIdHash,
      JSON.stringify({ referenceNo: tokenData.referenceNo })
    ]);
    
    return result.rows[0];
  }

  /**
   * Get user token untuk provider tertentu
   */
  async getUserToken(userId, provider) {
    const query = `
      SELECT * FROM user_tokens 
      WHERE user_id = $1 AND provider = $2 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [userId, provider]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const token = result.rows[0];
    token.access_token = this.decrypt(token.access_token_encrypted);
    
    if (token.refresh_token_encrypted) {
      token.refresh_token = this.decrypt(token.refresh_token_encrypted);
    }
    
    return token;
  }

  /**
   * Save OAuth state untuk CSRF protection
   */
  async saveOAuthState(state, userId, provider, redirectUrl = null) {
    const query = `
      INSERT INTO oauth_states (state, user_id, provider, redirect_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [state, userId, provider, redirectUrl]);
    return result.rows[0];
  }

  /**
   * Validate OAuth state
   */
  async validateOAuthState(state, provider) {
    const query = `
      SELECT * FROM oauth_states 
      WHERE state = $1 AND provider = $2 AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `;
    
    const result = await this.pool.query(query, [state, provider]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Delete used state
    await this.pool.query('DELETE FROM oauth_states WHERE id = $1', [result.rows[0].id]);
    
    return result.rows[0];
  }

  /**
   * Revoke token
   */
  async revokeToken(userId, provider) {
    const query = `
      UPDATE user_tokens 
      SET is_active = false, updated_at = NOW()
      WHERE user_id = $1 AND provider = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [userId, provider]);
    return result.rows[0];
  }

  /**
   * Record check history
   */
  async recordCheckHistory(userId, provider, resultData, ipAddress, userAgent, responseTimeMs) {
    const query = `
      INSERT INTO check_history (user_id, provider, result_data, ip_address, user_agent, response_time_ms)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      userId, provider, JSON.stringify(resultData), ipAddress, userAgent, responseTimeMs
    ]);
    
    return result.rows[0];
  }
}

module.exports = new TokenService();