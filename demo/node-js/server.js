const cluster = require('cluster');
const os = require('os');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

const numCPUs = process.env.WEB_CONCURRENCY || os.cpus().length;

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: `${process.env.LOG_DIR}/error.log`, level: 'error' }),
    new winston.transports.File({ filename: `${process.env.LOG_DIR}/combined.log` }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  logger.info(`Master ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = express();
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
  
  // Compression
  app.use(compression());
  
  // CORS configuration
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  };
  app.use(cors(corsOptions));
  
  // Body parsing dengan limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for'] || req.ip;
    }
  });
  
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 50,
    delayMs: (hits) => hits * 100
  });
  
  app.use('/api/', limiter);
  app.use('/api/', speedLimiter);
  
  // API Key middleware
  const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }
    next();
  };
  
  // Input validation
  const validateCheckRequest = [
    body('identifier')
      .isString()
      .notEmpty()
      .isLength({ min: 9, max: 15 })
      .matches(/^[0-9]+$/)
      .withMessage('Identifier harus berupa nomor HP valid'),
    body('walletType')
      .isString()
      .isIn(['ShopeePay', 'GoPay', 'DANA', 'OVO', 'iSaku'])
      .withMessage('Wallet type tidak valid'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      next();
    }
  ];
  
  // Database connection pool
  const { Pool } = require('pg');
  const dbPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: parseInt(process.env.DB_POOL_MAX),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE),
    connectionTimeoutMillis: 5000,
  });
  
  // Redis cache
  const redis = require('redis');
  const redisClient = redis.createClient({
    url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/${process.env.REDIS_DB}`
  });
  
  redisClient.on('error', (err) => logger.error('Redis Client Error', err));
  redisClient.connect();
  
  // Cache middleware
  const cacheMiddleware = (duration) => {
    return async (req, res, next) => {
      const key = `cache:${req.originalUrl}`;
      try {
        const cachedData = await redisClient.get(key);
        if (cachedData) {
          return res.json(JSON.parse(cachedData));
        }
        res.sendResponse = res.json;
        res.json = (body) => {
          redisClient.setEx(key, duration, JSON.stringify(body));
          res.sendResponse(body);
        };
        next();
      } catch (err) {
        logger.error('Cache error:', err);
        next();
      }
    };
  };
  
  // Business logic service
  class WalletCheckService {
    async checkNickname(identifier, walletType) {
      // Normalize phone
      const normalizedPhone = identifier.replace(/\D/g, '');
      
      // Check cache first
      const cacheKey = `user:${normalizedPhone}:${walletType}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for ${normalizedPhone}`);
        return JSON.parse(cached);
      }
      
      // Query database
      const query = `
        SELECT nickname, phone_number, ewallet_type 
        FROM wallet_users 
        WHERE phone_number = $1 AND ewallet_type = $2
      `;
      const result = await dbPool.query(query, [normalizedPhone, walletType]);
      
      if (result.rows.length > 0) {
        const userData = {
          nickname: result.rows[0].nickname,
          phone: result.rows[0].phone_number,
          ewallet: result.rows[0].ewallet_type
        };
        
        // Cache result
        await redisClient.setEx(cacheKey, parseInt(process.env.CACHE_TTL), JSON.stringify(userData));
        
        return userData;
      }
      
      return null;
    }
  }
  
  const walletService = new WalletCheckService();
  
  // API Endpoints
  app.post('/api/check', validateApiKey, validateCheckRequest, async (req, res) => {
    const startTime = Date.now();
    const { identifier, walletType } = req.body;
    
    try {
      const result = await walletService.checkNickname(identifier, walletType);
      
      // Log metrics
      logger.info({
        type: 'api_call',
        endpoint: '/api/check',
        walletType,
        success: !!result,
        responseTime: Date.now() - startTime,
        ip: req.ip
      });
      
      if (result) {
        res.json({
          success: true,
          data: result,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Nickname tidak ditemukan untuk ${walletType}: ${identifier}`,
          meta: { requestId: req.id }
        });
      }
    } catch (error) {
      logger.error('Error processing request:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        requestId: req.id
      });
    }
  });
  
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.APP_NAME
    });
  });
  
  app.get('/api/metrics', validateApiKey, async (req, res) => {
    const metrics = {
      cache: await redisClient.info(),
      db: {
        total_connections: dbPool.totalCount,
        idle_connections: dbPool.idleCount,
        waiting_queries: dbPool.waitingCount
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    res.json(metrics);
  });
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Worker ${process.pid} started on port ${PORT}`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing server...');
    await dbPool.end();
    await redisClient.quit();
    process.exit(0);
  });
}
