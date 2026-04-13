const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const logger = require('./config/logger');
const { testConnection, syncDatabase } = require('./config/database');
const { connectRedis, testRedisConnection } = require('./config/redis');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workRoutes = require('./routes/works');
const deployRoutes = require('./routes/deploy');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const cloneRoutes = require('./routes/clone');
const uploadRoutes = require('./routes/upload');
const settingsRoutes = require('./routes/settings');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();

async function initializeApp() {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        connectSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(compression());

  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));

  const corsOptions = {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Use-Proxy', 'X-Proxy-Server'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  };
  app.use(cors(corsOptions));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(config.security.sessionSecret));

  const uploadsDir = path.resolve(config.upload.dir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  const deploymentsDir = path.resolve(config.deploy.dir);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  app.use('/deployments', express.static(deploymentsDir));

  app.use(requestLogger);

  app.get('/health', async (req, res) => {
    const dbStatus = await testConnection();
    const redisStatus = await testRedisConnection();

    const health = {
      status: dbStatus && redisStatus ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
      services: {
        database: dbStatus ? 'connected' : 'disconnected',
        redis: redisStatus ? 'connected' : 'disconnected',
      },
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  app.get('/ready', async (req, res) => {
    const dbStatus = await testConnection();
    if (dbStatus) {
      res.json({ ready: true });
    } else {
      res.status(503).json({ ready: false });
    }
  });

  app.use('/api/auth', rateLimiter, authRoutes);
  app.use('/api/users', rateLimiter, userRoutes);
  app.use('/api/works', rateLimiter, workRoutes);
  app.use('/api/deploy', rateLimiter, deployRoutes);
  app.use('/api/analytics', rateLimiter, analyticsRoutes);
  app.use('/api/ai', rateLimiter, aiRoutes);
  app.use('/api/clone', rateLimiter, cloneRoutes);
  app.use('/api/upload', rateLimiter, uploadRoutes);
  app.use('/api/settings', rateLimiter, settingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
}

async function startServer() {
  try {
    await initializeApp();

    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed, starting in degraded mode');
    }

    if (config.redis.host !== 'localhost' || config.redis.port !== 6379) {
      await connectRedis();
      await testRedisConnection();
    }

    if (config.isDevelopment) {
      await syncDatabase({ force: false });
    }

    const server = app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Health check: ${config.apiBaseUrl.replace('/api', '')}/health`);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          const { disconnectRedis } = require('../config/redis');
          await disconnectRedis();
          logger.info('Redis connection closed');
        } catch (err) {
          logger.error('Error closing Redis connection:', err);
        }

        try {
          const { sequelize } = require('../config/database');
          await sequelize.close();
          logger.info('Database connection closed');
        } catch (err) {
          logger.error('Error closing database connection:', err);
        }

        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, initializeApp, startServer };
