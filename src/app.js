const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redisClient = require('./config/redis');
const rateLimit = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/v1/auth');
const danaRoutes = require('./routes/v1/dana');
const shopeepayRoutes = require('./routes/v1/shopeepay');
const checkRoutes = require('./routes/v1/check');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || true,
  credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session management with Redis
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'lax'
  }
}));

// Global rate limiting
app.use('/api/', rateLimit.globalLimiter);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dana', danaRoutes);
app.use('/api/v1/shopeepay', shopeepayRoutes);
app.use('/api/v1/check', checkRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;