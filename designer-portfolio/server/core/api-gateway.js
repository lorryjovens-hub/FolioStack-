import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

class APIGateway {
  constructor() {
    this.middlewares = [];
    this.routes = [];
  }

  static createRateLimiter(options = {}) {
    const config = {
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: {
        error: 'Too many requests',
        message: 'Please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
      },
      ...options
    };
    return rateLimit(config);
  }

  static createSlowDown(options = {}) {
    const config = {
      windowMs: 15 * 60 * 1000,
      delayAfter: 50,
      delayMs: (hits) => hits * 100,
      ...options
    };
    return slowDown(config);
  }

  static createSecurityMiddleware() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      xssFilter: true,
      noSniff: true,
      frameguard: { action: 'deny' }
    });
  }

  static createCompressionMiddleware() {
    return compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    });
  }

  static createRequestIdMiddleware() {
    return (req, res, next) => {
      req.id = req.headers['x-request-id'] || uuidv4();
      res.setHeader('X-Request-ID', req.id);
      next();
    };
  }

  static createCorrelationIdMiddleware() {
    return (req, res, next) => {
      req.correlationId = req.headers['x-correlation-id'] || uuidv4();
      res.setHeader('X-Correlation-ID', req.correlationId);
      next();
    };
  }

  static createRequestLogger(format = 'combined') {
    morgan.token('id', (req) => req.id);
    morgan.token('correlationId', (req) => req.correlationId);
    return morgan(':date[iso] [:id] :correlationId :method :url :status :response-time ms - :res[content-length]', {
      stream: { write: (message) => console.log(message.trim()) }
    });
  }

  static createTimeoutMiddleware(timeout = 30000) {
    return (req, res, next) => {
      const timer = setTimeout(() => {
        if (!res.headersSent) {
          res.status(504).json({
            error: 'Gateway Timeout',
            message: 'The request timed out.',
            requestId: req.id
          });
        }
      }, timeout);

      res.on('finish', () => clearTimeout(timer));
      res.on('close', () => clearTimeout(timer));
      next();
    };
  }

  static createCorsMiddleware(options = {}) {
    const defaultOptions = {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'X-Correlation-ID',
        'X-API-Key'
      ],
      exposedHeaders: ['X-Request-ID', 'X-Correlation-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      credentials: true,
      maxAge: 86400,
      ...options
    };
    return cors(defaultOptions);
  }

  static createBodyParserMiddleware() {
    return [
      express.json({
        limit: '50mb',
        verify: (req, res, buf) => {
          req.rawBody = buf.toString();
        }
      }),
      express.urlencoded({
        extended: true,
        limit: '50mb'
      })
    ];
  }
}

export { APIGateway };