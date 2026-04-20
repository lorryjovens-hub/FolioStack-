import express from 'express';
import cors from 'cors';
import cluster from 'cluster';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { initDB, getType } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3002;
const numCPUs = os.cpus().length;

// 创建日志目录
const logsDir = join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 日志管理
class Logger {
  constructor() {
    this.logFile = join(logsDir, `server-${new Date().toISOString().split('T')[0]}.log`);
  }

  log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      pid: process.pid,
      ...meta
    };
    
    console.log(`[${timestamp}] [${level.toUpperCase()}] [PID:${process.pid}] ${message}`);
    
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n', { flag: 'a' });
  }

  info(message, meta) { this.log('info', message, meta); }
  error(message, meta) { this.log('error', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  debug(message, meta) { this.log('debug', message, meta); }
}

const logger = new Logger();

// 健康检查管理器
class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.startTime = Date.now();
  }

  register(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  async runChecks() {
    const results = {};
    for (const [name, checkFn] of this.checks) {
      try {
        results[name] = await checkFn();
      } catch (error) {
        results[name] = { status: 'error', message: error.message };
      }
    }
    return results;
  }

  getUptime() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

const healthChecker = new HealthChecker();

// 性能监控
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }

  recordRequest(responseTime, isError = false) {
    this.metrics.requests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.requests;
    if (isError) this.metrics.errors++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }
}

const perfMonitor = new PerformanceMonitor();

// 主服务器逻辑
async function createServer() {
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 请求日志和性能监控
  app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      perfMonitor.recordRequest(responseTime, res.statusCode >= 400);
      
      logger.info(`${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip
      });
    });

    next();
  });

  // 健康检查端点
  app.get('/api/health', async (req, res) => {
    try {
      const checks = await healthChecker.runChecks();
      const allHealthy = Object.values(checks).every(c => c.status === 'ok');
      
      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        uptime: healthChecker.getUptime(),
        timestamp: new Date().toISOString(),
        pid: process.pid,
        checks
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // 性能指标端点
  app.get('/api/metrics', (req, res) => {
    res.json(perfMonitor.getMetrics());
  });

  // 就绪检查
  app.get('/api/ready', (req, res) => {
    res.json({ 
      ready: true, 
      pid: process.pid,
      timestamp: new Date().toISOString()
    });
  });

  // 静态文件服务
  app.use(express.static(join(__dirname, '..')));

  // 错误处理中间件
  app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path
    });

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  return app;
}

// 启动服务器
async function startServer() {
  try {
    logger.info('Starting FolioStack server...');

    // 初始化数据库（true = 跳过PostgreSQL，只使用SQLite）
    await initDB(true);
    const dbType = getType();
    logger.info(`Database connected (${dbType})`);

    // 注册健康检查
    healthChecker.register('database', async () => {
      return { status: 'ok', type: dbType };
    });

    healthChecker.register('memory', async () => {
      const mem = process.memoryUsage();
      const usedMB = Math.round(mem.heapUsed / 1024 / 1024);
      return {
        status: usedMB < 500 ? 'ok' : 'warning',
        usedMB,
        totalMB: Math.round(mem.heapTotal / 1024 / 1024)
      };
    });

    // 创建Express应用
    const app = await createServer();

    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, {
        port: PORT,
        pid: process.pid,
        env: process.env.NODE_ENV || 'development'
      });

      // 发送就绪信号给PM2
      if (process.send) {
        process.send('ready');
      }
    });

    // 优雅关闭
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // 强制关闭超时
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', {
        reason: reason.toString()
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// 集群模式支持
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  logger.info(`Master ${process.pid} is running`);
  logger.info(`Starting ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Worker退出重启
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died`, { code, signal });
    logger.info('Starting a new worker...');
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`);
  });
} else {
  // 单进程模式或Worker进程
  startServer();
}