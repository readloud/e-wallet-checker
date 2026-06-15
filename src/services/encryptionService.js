const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.encryptionKey = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'utf8');
    
    if (this.encryptionKey.length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes');
    }
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
    
    // Combine: iv + authTag + encryptedData
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
   * Hash API key for storage
   */
  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Generate random API key
   */
  generateApiKey(prefix = 'ew_') {
    const random = crypto.randomBytes(24).toString('base64url');
    return `${prefix}${random}`;
  }
}

module.exports = new EncryptionService();