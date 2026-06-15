const crypto = require('crypto');
const fs = require('fs');

class SignatureService {
  constructor() {
    this.danaPrivateKey = null;
    this.loadDANAKeys();
  }

  loadDANAKeys() {
    try {
      this.danaPrivateKey = fs.readFileSync(process.env.DANA_PRIVATE_KEY_PATH, 'utf8');
    } catch (error) {
      console.error('Failed to load DANA private key:', error.message);
    }
  }

  // ==================== DANA SIGNATURE ====================
  
  /**
   * Generate signature untuk DANA SNAP API
   * Format: X-CLIENT-KEY|X-TIMESTAMP
   */
  generateDANAAuthSignature(clientKey, timestamp) {
    if (!this.danaPrivateKey) {
      throw new Error('DANA private key not loaded');
    }
    const stringToSign = `${clientKey}|${timestamp}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(stringToSign);
    sign.end();
    return sign.sign(this.danaPrivateKey, 'base64');
  }

  /**
   * Generate signature untuk request body DANA (X-SIGNATURE)
   * Format: HTTP_METHOD:RELATIVE_PATH_URL:BODY_HASH:TIMESTAMP
   */
  generateDANARequestSignature(method, pathUrl, body, timestamp) {
    if (!this.danaPrivateKey) {
      throw new Error('DANA private key not loaded');
    }
    
    // Minify body dan hash SHA-256
    const minifiedBody = JSON.stringify(body);
    const bodyHash = crypto
      .createHash('sha256')
      .update(minifiedBody)
      .digest('hex')
      .toLowerCase();

    // Compose string to sign
    const stringToSign = `${method}:${pathUrl}:${bodyHash}:${timestamp}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(stringToSign);
    sign.end();
    return sign.sign(this.danaPrivateKey, 'base64');
  }

  // ==================== SHOPEEPAY SIGNATURE ====================
  
  /**
   * Generate HMAC signature untuk ShopeePay API
   * Langkah: JSON.stringify -> SHA256 -> Base64 -> HMAC-SHA256
   */
  generateShopeePaySignature(payload, secretKey) {
    // 1. JSON.stringify payload
    const bodyString = JSON.stringify(payload);
    
    // 2. SHA-256 hash
    const sha256Hash = crypto
      .createHash('sha256')
      .update(bodyString)
      .digest('hex');
    
    // 3. Encode ke Base64
    const base64Hash = Buffer.from(sha256Hash, 'hex').toString('base64');
    
    // 4. HMAC SHA256 dengan secret key
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(base64Hash);
    
    return hmac.digest('base64');
  }

  /**
   * Generate signature untuk ShopeePay callback validation
   */
  verifyShopeePayCallback(payload, signature, secretKey) {
    const expectedSignature = this.generateShopeePaySignature(payload, secretKey);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = new SignatureService();