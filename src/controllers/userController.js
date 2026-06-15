const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const encryptionService = require('../services/encryptionService');
const checkService = require('../services/checkService');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

class UserController {
  
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  async register(req, res) {
    const { email, phone_number, password, full_name } = req.body;
    
    try {
      // Check if user exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
        [email, phone_number]
      );
      
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or phone already exists'
        });
      }
      
      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const result = await pool.query(
        `INSERT INTO users (email, phone_number, password_hash, full_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, phone_number, full_name, created_at`,
        [email, phone_number, passwordHash, full_name]
      );
      
      const user = result.rows[0];
      
      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      res.status(201).json({
        success: true,
        data: { user, token }
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }
  
  /**
   * Login user
   * POST /api/v1/auth/login
   */
  async login(req, res) {
    const { email, password } = req.body;
    
    try {
      // Find user
      const result = await pool.query(
        'SELECT id, email, phone_number, password_hash, full_name, role FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      const user = result.rows[0];
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Update last login
      await pool.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );
      
      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      // Remove password hash from response
      delete user.password_hash;
      
      res.json({
        success: true,
        data: { user, token }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }
  
  /**
   * Get user profile with connected wallets info
   * GET /api/v1/user/profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user data
      const userResult = await pool.query(
        'SELECT id, email, phone_number, full_name, is_verified, created_at FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const user = userResult.rows[0];
      
      // Get connected wallets info
      const walletsResult = await pool.query(
        `SELECT provider, is_active, created_at as connected_at
         FROM user_tokens 
         WHERE user_id = $1 AND is_active = true`,
        [userId]
      );
      
      const connectedWallets = walletsResult.rows.map(w => w.provider);
      
      // Get latest data from connected wallets (if any)
      let walletData = {};
      if (connectedWallets.includes('dana')) {
        try {
          const danaData = await checkService.getDANANickname(userId);
          walletData.dana = danaData;
        } catch (error) {
          walletData.dana = { error: error.message };
        }
      }
      
      if (connectedWallets.includes('shopeepay')) {
        try {
          const spData = await checkService.getShopeePayNickname(userId);
          walletData.shopeepay = spData;
        } catch (error) {
          walletData.shopeepay = { error: error.message };
        }
      }
      
      res.json({
        success: true,
        data: {
          user,
          connected_wallets: connectedWallets,
          wallet_data: walletData
        }
      });
      
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  }
  
  /**
   * Generate API key for merchant app
   * POST /api/v1/user/api-key
   */
  async generateApiKey(req, res) {
    try {
      const userId = req.user.id;
      const { name } = req.body;
      
      const apiKey = encryptionService.generateApiKey('ew_');
      const apiKeyHash = encryptionService.hashApiKey(apiKey);
      const apiKeyPrefix = apiKey.substring(0, 10);
      
      const result = await pool.query(
        `INSERT INTO api_keys (name, api_key_hash, api_key_prefix, user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, api_key_prefix, created_at`,
        [name, apiKeyHash, apiKeyPrefix, userId]
      );
      
      res.json({
        success: true,
        data: {
          api_key: apiKey,  // Only shown once!
          key_info: result.rows[0]
        }
      });
      
    } catch (error) {
      console.error('Generate API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate API key'
      });
    }
  }
  
  /**
   * Get check history
   * GET /api/v1/user/history
   */
  async getHistory(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0, provider } = req.query;
      
      let query = `
        SELECT id, provider, target_phone, result_data, status, created_at, response_time_ms
        FROM check_history
        WHERE user_id = $1
      `;
      const params = [userId];
      
      if (provider) {
        query += ` AND provider = $${params.length + 1}`;
        params.push(provider);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit), parseInt(offset));
      
      const result = await pool.query(query, params);
      
      res.json({
        success: true,
        data: {
          history: result.rows,
          total: result.rowCount,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
      
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get history'
      });
    }
  }
}

module.exports = new UserController();