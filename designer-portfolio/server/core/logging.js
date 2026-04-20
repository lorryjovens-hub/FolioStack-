import winston from 'winston';
import 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

class Logger {
  constructor(options = {}) {
    this.logDir = options.logDir || './logs';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.serviceName = options.serviceName || 'foliostack';
    
    this.ensureLogDir();
    this.logger = this.createLogger();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  createLogger() {
    const isProduction = this.environment === 'production';
    
    const fileTransport = new winston.transports.DailyRotateFile({
      filename: path.join(this.logDir, '%DATE%-application.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    });

    const errorTransport = new winston.transports.DailyRotateFile({
      filename: path.join(this.logDir, '%DATE%-error.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    });

    const consoleTransport = new winston.transports.Console({
      level: isProduction ? 'info' : 'debug',
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}] ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ' ' + JSON.stringify(metadata);
          }
          return msg;
        })
      )
    });

    const transports = [fileTransport, errorTransport];
    if (!isProduction || process.env.LOG_TO_CONSOLE) {
      transports.push(consoleTransport);
    }

    return winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6
      },
      defaultMeta: {
        service: this.serviceName,
        environment: this.environment,
        pid: process.pid
      },
      transports
    });
  }

  log(level, message, meta = {}) {
    this.logger.log(level, message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  http(message, meta = {}) {
    this.log('http', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  child(meta) {
    const childLogger = new Logger({ logDir: this.logDir, environment: this.environment });
    childLogger.logger = this.logger.child(meta);
    return childLogger;
  }
}

class RequestLogger {
  constructor(logger) {
    this.logger = logger;
  }

  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      const requestId = req.id || req.headers['x-request-id'];
      
      const requestLogger = this.logger.child({
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      requestLogger.http('Incoming request');

      res.on('finish', () => {
        const duration = Date.now() - start;
        requestLogger.http('Request completed', {
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentLength: res.get('content-length')
        });
      });

      req.logger = requestLogger;
      next();
    };
  }
}

class ErrorLogger {
  constructor(logger) {
    this.logger = logger;
  }

  middleware() {
    return (err, req, res, next) => {
      const requestLogger = req.logger || this.logger;
      
      requestLogger.error('Unhandled error', {
        error: {
          message: err.message,
          stack: err.stack,
          name: err.name,
          code: err.code
        },
        url: req.originalUrl,
        method: req.method,
        headers: req.headers,
        body: req.body
      });

      next(err);
    };
  }
}

export { Logger, RequestLogger, ErrorLogger };