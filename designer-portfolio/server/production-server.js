import express from 'express';
import cluster from 'cluster';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

import { Logger, RequestLogger, ErrorLogger } from './core/logging.js';
import { MetricsCollector, HealthChecker } from './core/metrics.js';
import { DatabasePool, Repository } from './core/database.js';
import { cacheManager } from './cache.js';
import { CircuitBreaker, RetryPolicy, Bulkhead } from './core/resilience.js';
import { APIGateway } from './core/api-gateway.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3002;
const numCPUs = os.cpus().length;
const isProduction = process.env.NODE_ENV === 'production';

class ProductionServer {
  constructor() {
    this.app = express();
    this.logger = new Logger({
      logDir: join(__dirname, '../logs'),
      serviceName: 'foliostack-backend'
    });
    this.metrics = new MetricsCollector();
    this.healthChecker = new HealthChecker();
    this.db = null;
    this.circuitBreaker = null;
    this.retryPolicy = null;
    this.bulkhead = null;
  }

  async initialize() {
    this.logger.info('Initializing production server...');

    await this.setupResilience();
    await this.setupDatabase();
    await this.setupCache();
    await this.setupMiddlewares();
    await this.setupRoutes();
    await this.setupErrorHandling();
    await this.setupHealthChecks();
    await this.setupGracefulShutdown();
  }

  async setupResilience() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000,
      onStateChange: (oldState, newState) => {
        this.logger.warn(`Circuit breaker state changed: ${oldState} → ${newState}`);
      }
    });

    this.retryPolicy = new RetryPolicy({
      maxRetries: 3,
      delay: 1000,
      backoff: 'exponential'
    });

    this.bulkhead = new Bulkhead({
      maxConcurrent: 100,
      maxQueueSize: 1000
    });

    this.logger.info('Resilience patterns initialized');
  }

  async setupDatabase() {
    this.db = new DatabasePool({
      type: process.env.DB_TYPE || 'postgres'
    });

    await this.db.connect();

    this.healthChecker.addCheck('database', async () => {
      await this.db.query('SELECT 1');
      return { type: this.db.type };
    });

    this.logger.info('Database connection pool established');
  }

  async setupCache() {
    try {
      await cacheManager.connect();
      
      this.healthChecker.addCheck('cache', async () => {
        await cacheManager.set('healthcheck', 'ok', 60);
        const value = await cacheManager.get('healthcheck');
        return { connected: value === 'ok' };
      });

      this.logger.info('Cache manager connected');
    } catch (error) {
      this.logger.warn('Cache not available, running without cache', { error: error.message });
    }
  }

  setupMiddlewares() {
    this.app.use(APIGateway.createRequestIdMiddleware());
    this.app.use(APIGateway.createCorrelationIdMiddleware());
    this.app.use(new RequestLogger(this.logger).middleware());
    this.app.use(this.metrics.middleware());
    this.app.use(APIGateway.createCorsMiddleware());
    this.app.use(APIGateway.createSecurityMiddleware());
    this.app.use(APIGateway.createCompressionMiddleware());
    this.app.use(...APIGateway.createBodyParserMiddleware());
    this.app.use(APIGateway.createTimeoutMiddleware(30000));
    this.app.use(APIGateway.createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 1000
    }));

    this.app.use((req, res, next) => {
      req.logger = req.logger || this.logger;
      req.metrics = this.metrics;
      req.db = this.db;
      req.cache = cacheManager;
      req.circuitBreaker = this.circuitBreaker;
      req.retryPolicy = this.retryPolicy;
      req.bulkhead = this.bulkhead;
      next();
    });

    this.logger.info('Middlewares configured');
  }

  setupRoutes() {
    this.app.get('/health', this.healthChecker.endpoint());
    this.app.get('/metrics', this.metrics.metricsEndpoint());

    this.app.get('/ready', (req, res) => {
      res.json({
        ready: true,
        pid: process.pid,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version
      });
    });

    const apiRouter = express.Router();
    apiRouter.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    this.app.use('/api', apiRouter);

    this.app.use(express.static(join(__dirname, '..')));

    this.logger.info('Routes configured');
  }

  setupErrorHandling() {
    this.app.use(new ErrorLogger(this.logger).middleware());

    this.app.use((err, req, res, next) => {
      const statusCode = err.statusCode || 500;
      const requestId = req.id;

      res.status(statusCode).json({
        error: {
          message: err.message || 'Internal server error',
          code: err.code,
          requestId
        }
      });
    });

    this.logger.info('Error handling configured');
  }

  setupHealthChecks() {
    this.healthChecker.addCheck('memory', async () => {
      const mem = process.memoryUsage();
      const usedMB = Math.round(mem.heapUsed / 1024 / 1024);
      return {
        usedMB,
        totalMB: Math.round(mem.heapTotal / 1024 / 1024),
        status: usedMB < 1024 ? 'ok' : 'warning'
      };
    });

    this.healthChecker.addCheck('disk', async () => {
      const diskPath = join(__dirname, '..');
      try {
        const stats = fs.statfs(diskPath);
        const freeGB = stats.bfree * stats.bsize / 1024 / 1024 / 1024;
        return {
          freeGB: Math.round(freeGB * 100) / 100,
          status: freeGB > 1 ? 'ok' : 'warning'
        };
      } catch {
        return { status: 'ok' };
      }
    });

    this.logger.info('Health checks configured');
  }

  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      this.logger.info(`Received ${signal}, shutting down gracefully...`);

      this.server.close(async () => {
        this.logger.info('HTTP server closed');
        
        await this.db?.close();
        await cacheManager?.disconnect();
        
        this.logger.info('Graceful shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        this.logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', {
        reason: reason?.toString()
      });
    });

    this.logger.info('Graceful shutdown configured');
  }

  async start() {
    await this.initialize();

    this.server = this.app.listen(PORT, () => {
      this.logger.info('Server started', {
        port: PORT,
        pid: process.pid,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });

      if (process.send) {
        process.send('ready');
      }
    });
  }
}

if (cluster.isMaster && isProduction) {
  const masterLogger = new Logger({
    logDir: join(__dirname, '../logs'),
    serviceName: 'foliostack-master'
  });

  masterLogger.info(`Master ${process.pid} is running`);
  masterLogger.info(`Starting ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    masterLogger.warn(`Worker ${worker.process.pid} died`, { code, signal });
    masterLogger.info('Starting a new worker...');
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    masterLogger.info(`Worker ${worker.process.pid} is online`);
  });
} else {
  const server = new ProductionServer();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default ProductionServer;