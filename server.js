require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

// Route imports
const authRoutes = require('./src/routes/v1/auth');
const danaRoutes = require('./src/routes/v1/dana');
const shopeepayRoutes = require('./src/routes/v1/shopeepay');
const qrisRoutes = require('./src/routes/qris');

const app = express();

// Redis client for session
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD || undefined
});
redisClient.connect().catch(console.error);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"]
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || true,
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax'
  }
}));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dana', danaRoutes);
app.use('/api/v1/shopeepay', shopeepayRoutes);
app.use('/api/qris', qrisRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      dana: process.env.DANA_ENVIRONMENT,
      shopeepay: process.env.SHOPEEPAY_ENVIRONMENT,
	  qris: process.env.QRIS_PROVIDER
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 E-Wallet OAuth API running on port ${PORT}`);
  console.log(`📚 DANA Environment: ${process.env.DANA_ENVIRONMENT}`);
  console.log(`📚 ShopeePay Environment: ${process.env.SHOPEEPAY_ENVIRONMENT}`);
  console.log(`💰 QRIS Payment API running on port ${PORT}`);
  console.log(`📚 Provider: ${process.env.QRIS_PROVIDER}`);
});